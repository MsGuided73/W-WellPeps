/**
 * HTTP helpers shared by the three edge functions: the origin allow-list, CORS
 * headers, JSON responses, a size-limited body reader and the request source.
 *
 * Standard Web APIs only (Request, Response, Headers, streams), so the same code
 * runs in Deno and in the vitest suite.
 */

/** Largest request body any of the functions reads. Real payloads are well under 4 KB. */
export const MAX_BODY_BYTES = 8 * 1024;

/**
 * Parse the ALLOWED_ORIGINS secret (comma separated). Only well-formed
 * `scheme://host[:port]` origins are kept; a wildcard is never honored. An empty
 * or missing value means NO origin is allowed, which is the safe default.
 */
export function parseAllowedOrigins(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const entry = part.trim().replace(/\/+$/, '').toLowerCase();
    if (!/^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/.test(entry)) continue;
    if (!out.includes(entry)) out.push(entry);
  }
  return out;
}

export function isAllowedOrigin(origin: string | null, allowed: readonly string[]): origin is string {
  return origin !== null && allowed.includes(origin.toLowerCase());
}

/** CORS headers for an allowed origin; an empty object for anything else. */
export function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  if (!isAllowedOrigin(origin, allowed)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin.toLowerCase(),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function jsonResponse(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

export type BodyResult = { ok: true; json: unknown } | { ok: false; status: 400 | 413 };

/**
 * Read and parse the body as JSON, refusing anything over `maxBytes`. A declared
 * Content-Length is checked first, and the stream is also counted while it is
 * read, so a missing or false Content-Length cannot get a large body through.
 * The body is parsed whatever its Content-Type is (the browser sends text/plain
 * so that no CORS pre-flight is needed).
 */
export async function readJsonBody(req: Request, maxBytes: number = MAX_BODY_BYTES): Promise<BodyResult> {
  const declared = req.headers.get('content-length');
  if (declared !== null) {
    const n = Number(declared);
    if (!Number.isFinite(n) || n < 0) return { ok: false, status: 400 };
    if (n > maxBytes) return { ok: false, status: 413 };
  }
  if (!req.body) return { ok: false, status: 400 };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
}

/**
 * The address the request came from, used ONLY to pick a rate-limit bucket (see
 * rate-limit.ts). It is never stored, logged or returned. Cloudflare's header is
 * preferred because the client cannot set it. The fallback is the RIGHT-most
 * X-Forwarded-For entry, the one added by the proxy nearest to us; the left-most
 * entries are written by the client and could be changed on every request to
 * dodge the limit. Verify at deploy that cf-connecting-ip is present (see the
 * checklist in supabase/README.md); with no header every visitor shares one bucket.
 */
export function sourceAddress(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const hops = fwd.split(',');
    return hops[hops.length - 1].trim();
  }
  return '';
}
