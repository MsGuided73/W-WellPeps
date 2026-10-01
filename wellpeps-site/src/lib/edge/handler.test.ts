import { describe, expect, test, vi } from 'vitest';
import { createHandler, type HandlerConfig, type ParseOutcome } from '../../../../supabase/functions/_shared/handler.ts';
import { MAX_BODY_BYTES } from '../../../../supabase/functions/_shared/http.ts';
import { createRateLimiter } from '../../../../supabase/functions/_shared/rate-limit.ts';

const SITE = 'https://wellpeps.com';
const URL_ = 'https://project.supabase.co/functions/v1/test-fn';
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);

interface Item {
  n: number;
}

function setup(over: Partial<HandlerConfig<Item>> = {}) {
  const store = vi.fn(async (_v: Item, _now: number) => ({ ok: true as const }));
  const log = vi.fn();
  const parse = vi.fn((json: unknown): ParseOutcome<Item> => {
    const o = json as { n?: unknown; spam?: unknown };
    if (o && o.spam === true) return { kind: 'silent' };
    return typeof o?.n === 'number' ? { kind: 'accept', value: { n: o.n } } : { kind: 'reject' };
  });
  const handler = createHandler<Item>({
    name: 'test-fn',
    allowedOrigins: [SITE],
    limiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
    sourceKey: async () => 'bucket',
    parse,
    store,
    now: () => NOW,
    log,
    ...over,
  });
  return { handler, store, log, parse };
}

const post = (body: string, headers: Record<string, string> = { Origin: SITE, 'Content-Type': 'text/plain;charset=UTF-8' }) =>
  new Request(URL_, { method: 'POST', headers, body });

describe('methods and origins', () => {
  test('answers a pre-flight from an allowed origin with CORS headers and no body', async () => {
    const { handler } = setup();
    const res = await handler(new Request(URL_, { method: 'OPTIONS', headers: { Origin: SITE } }));
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(res.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
  });

  test('refuses a pre-flight from any other origin', async () => {
    const { handler } = setup();
    const res = await handler(new Request(URL_, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }));
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  test.each(['GET', 'PUT', 'DELETE', 'PATCH'])('refuses %s with 405 and an Allow header', async (method) => {
    const { handler } = setup();
    const res = await handler(new Request(URL_, { method, headers: { Origin: SITE } }));
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST, OPTIONS');
  });

  test('refuses a POST from a disallowed origin and never stores it', async () => {
    const { handler, store } = setup();
    const res = await handler(post('{"n":1}', { Origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(store).not.toHaveBeenCalled();
  });

  test('refuses a POST with no Origin header at all', async () => {
    const { handler, store } = setup();
    expect((await handler(post('{"n":1}', {}))).status).toBe(403);
    expect(store).not.toHaveBeenCalled();
  });

  test('with no configured origins (the default) every browser request is refused', async () => {
    const { handler, store } = setup({ allowedOrigins: [] });
    expect((await handler(post('{"n":1}'))).status).toBe(403);
    expect(store).not.toHaveBeenCalled();
  });
});

describe('the happy path and its refusals', () => {
  test('stores a valid event and answers 200 with CORS for the site origin', async () => {
    const { handler, store } = setup();
    const res = await handler(post('{"n":7}'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(store).toHaveBeenCalledWith({ n: 7 }, NOW);
  });

  test('merges the store response into the body (the request number)', async () => {
    const { handler } = setup({ store: async () => ({ ok: true, response: { request_no: 'PR-261001-ABCDEF' } }) });
    expect(await (await handler(post('{"n":1}'))).json()).toEqual({ ok: true, request_no: 'PR-261001-ABCDEF' });
  });

  test('accepts the body as text/plain (sendBeacon) or application/json alike', async () => {
    const { handler } = setup();
    expect((await handler(post('{"n":1}', { Origin: SITE, 'Content-Type': 'application/json' }))).status).toBe(200);
    expect((await handler(post('{"n":1}', { Origin: SITE, 'Content-Type': 'text/plain' }))).status).toBe(200);
  });

  test('a body that fails validation gets a generic 400 and is not stored', async () => {
    const { handler, store } = setup();
    const res = await handler(post('{"n":"nope"}'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_request' });
    expect(store).not.toHaveBeenCalled();
  });

  test('a body that is not JSON gets 400', async () => {
    const { handler, store } = setup();
    expect((await handler(post('not json'))).status).toBe(400);
    expect(store).not.toHaveBeenCalled();
  });

  test('an oversized body gets 413 and is never parsed or stored', async () => {
    const { handler, store, parse } = setup();
    const res = await handler(post(JSON.stringify({ n: 1, pad: 'x'.repeat(MAX_BODY_BYTES) })));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'payload_too_large' });
    expect(parse).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });

  test('a spam hit is accepted silently: 200, same shape, nothing stored', async () => {
    const { handler, store } = setup();
    const res = await handler(post('{"spam":true}'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(store).not.toHaveBeenCalled();
  });

  test('a parser that throws is a 400, never a crash', async () => {
    const { handler } = setup({
      parse: () => {
        throw new Error('boom');
      },
    });
    expect((await handler(post('{"n":1}'))).status).toBe(400);
  });
});

describe('rate limiting', () => {
  test('answers 429 with Retry-After once a source is over its limit, and stores nothing more', async () => {
    const { handler, store } = setup({ limiter: createRateLimiter({ limit: 2, windowMs: 60_000 }) });
    expect((await handler(post('{"n":1}'))).status).toBe(200);
    expect((await handler(post('{"n":2}'))).status).toBe(200);
    const res = await handler(post('{"n":3}'));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(store).toHaveBeenCalledTimes(2);
  });

  test('the bucket key comes from sourceKey and the raw address never reaches the limiter', async () => {
    const seen: string[] = [];
    const limiter = { hit: (key: string) => (seen.push(key), { allowed: true, retryAfterSec: 0 }) };
    const sourceKey = vi.fn(async (address: string) => `opaque(${address.length})`);
    const { handler } = setup({ limiter, sourceKey });
    await handler(post('{"n":1}', { Origin: SITE, 'cf-connecting-ip': '203.0.113.9' }));
    expect(sourceKey).toHaveBeenCalledWith('203.0.113.9');
    expect(seen).toEqual(['opaque(11)']);
    expect(seen.join()).not.toContain('203.0.113.9');
  });
});

describe('failures and logging', () => {
  test('a failed store answers a generic 500 and logs only a fixed line plus a safe code', async () => {
    const { handler, log } = setup({ store: async () => ({ ok: false, code: '23505' }) });
    const res = await handler(post('{"n":424242}'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server_error' });
    expect(log).toHaveBeenCalledWith('[test-fn] store failed (23505)');
  });

  test('an error code that is not a plain code is not logged', async () => {
    const { handler, log } = setup({ store: async () => ({ ok: false, code: 'Key (email)=(a@b.com) already exists' }) });
    await handler(post('{"n":1}'));
    expect(log).toHaveBeenCalledWith('[test-fn] store failed');
  });

  test('a store that throws is a generic 500 and its message (which may quote the row) is not logged', async () => {
    const { handler, log } = setup({
      store: async () => {
        throw new Error('duplicate key value (n)=(424242)');
      },
    });
    const res = await handler(post('{"n":424242}'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain('424242');
    expect(await res.text()).not.toContain('424242');
  });

  test('a store that refuses on purpose (circuit breaker) answers 503 with Retry-After', async () => {
    const { handler } = setup({ store: async () => ({ ok: false, busy: true }) });
    const res = await handler(post('{"n":1}'));
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBeTruthy();
    expect(await res.json()).toEqual({ error: 'unavailable' });
  });

  test('the request body never appears in any log line, even on a validation failure', async () => {
    const { handler, log } = setup();
    await handler(post('{"n":"secret@example.com"}'));
    await handler(post('secret@example.com'));
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret@example.com');
  });

  test('error responses are one of a few generic words, never a reason', async () => {
    const { handler } = setup();
    const bodies = await Promise.all(
      [
        handler(post('{"n":"x"}')),
        handler(post('nope')),
        handler(post('{"n":1}', { Origin: 'https://evil.example' })),
        handler(new Request(URL_, { method: 'GET', headers: { Origin: SITE } })),
      ].map(async (p) => JSON.stringify(await (await p).json())),
    );
    for (const b of bodies) expect(b).toMatch(/^\{"error":"[a-z_]+"\}$/);
  });
});
