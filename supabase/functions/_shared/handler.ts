/**
 * One request pipeline for all three functions, so every function gets the same
 * guarantees and each one only supplies its own `parse` and `store`:
 *
 *   OPTIONS            -> CORS pre-flight, answered only for an allowed origin
 *   not POST           -> 405
 *   origin not allowed -> 403 (a missing Origin header is refused too)
 *   rate limited       -> 429
 *   body too large     -> 413
 *   not JSON           -> 400
 *   fails validation   -> 400
 *   spam               -> 200, nothing stored
 *   store fails        -> 500
 *   stored             -> 200
 *
 * Error bodies are always the same short generic words, never the reason, and
 * the request body is never logged. Only fixed strings and a database error
 * code (never its message, which can quote row values) reach the log.
 */
import { corsHeaders, isAllowedOrigin, jsonResponse, readJsonBody, sourceAddress, MAX_BODY_BYTES } from './http.ts';
import type { RateLimiter } from './rate-limit.ts';

export type ParseOutcome<T> = { kind: 'accept'; value: T } | { kind: 'silent' } | { kind: 'reject' };

export type StoreOutcome =
  | { ok: true; response?: Record<string, unknown> }
  /** `busy` = refused on purpose (a circuit breaker); the client is told to try later. */
  | { ok: false; busy?: boolean; code?: string };

export interface HandlerConfig<T> {
  /** Used only in log lines. */
  name: string;
  allowedOrigins: readonly string[];
  limiter: RateLimiter;
  /** Maps a source address to an opaque rate-limit key (see rate-limit.ts). */
  sourceKey: (address: string) => Promise<string>;
  parse: (json: unknown) => ParseOutcome<T>;
  store: (value: T, nowMs: number) => Promise<StoreOutcome>;
  maxBodyBytes?: number;
  now?: () => number;
  /** Receives fixed strings only. Defaults to console.error. */
  log?: (line: string) => void;
}

const GENERIC = {
  forbidden: { error: 'forbidden' },
  method: { error: 'method_not_allowed' },
  tooMany: { error: 'too_many_requests' },
  tooLarge: { error: 'payload_too_large' },
  invalid: { error: 'invalid_request' },
  server: { error: 'server_error' },
  busy: { error: 'unavailable' },
} as const;

const SAFE_CODE = /^[A-Za-z0-9_]{1,12}$/;

/** The only place the functions write a log line. Callers pass fixed strings, never request data. */
export const defaultLog = (line: string): void => console.error(line);

export function createHandler<T>(cfg: HandlerConfig<T>): (req: Request) => Promise<Response> {
  const now = cfg.now ?? (() => Date.now());
  const log = cfg.log ?? defaultLog;
  const maxBody = cfg.maxBodyBytes ?? MAX_BODY_BYTES;

  return async (req) => {
    const origin = req.headers.get('origin');
    const cors = corsHeaders(origin, cfg.allowedOrigins);
    const allowedOrigin = isAllowedOrigin(origin, cfg.allowedOrigins);

    if (req.method === 'OPTIONS') {
      return allowedOrigin ? new Response(null, { status: 204, headers: cors }) : jsonResponse(403, GENERIC.forbidden, cors);
    }
    if (req.method !== 'POST') {
      return jsonResponse(405, GENERIC.method, { ...cors, Allow: 'POST, OPTIONS' });
    }
    if (!allowedOrigin) return jsonResponse(403, GENERIC.forbidden, cors);

    const key = await cfg.sourceKey(sourceAddress(req.headers));
    const verdict = cfg.limiter.hit(key, now());
    if (!verdict.allowed) {
      return jsonResponse(429, GENERIC.tooMany, { ...cors, 'Retry-After': String(verdict.retryAfterSec) });
    }

    const body = await readJsonBody(req, maxBody);
    if (!body.ok) return jsonResponse(body.status, body.status === 413 ? GENERIC.tooLarge : GENERIC.invalid, cors);

    let parsed: ParseOutcome<T>;
    try {
      parsed = cfg.parse(body.json);
    } catch {
      return jsonResponse(400, GENERIC.invalid, cors);
    }
    if (parsed.kind === 'reject') return jsonResponse(400, GENERIC.invalid, cors);
    if (parsed.kind === 'silent') return jsonResponse(200, { ok: true }, cors);

    try {
      const stored = await cfg.store(parsed.value, now());
      if (stored.ok) return jsonResponse(200, { ok: true, ...(stored.response ?? {}) }, cors);
      if (stored.busy) return jsonResponse(503, GENERIC.busy, { ...cors, 'Retry-After': '3600' });
      log(`[${cfg.name}] store failed${stored.code && SAFE_CODE.test(stored.code) ? ` (${stored.code})` : ''}`);
      return jsonResponse(500, GENERIC.server, cors);
    } catch {
      log(`[${cfg.name}] store threw`);
      return jsonResponse(500, GENERIC.server, cors);
    }
  };
}
