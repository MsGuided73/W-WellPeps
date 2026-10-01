import { describe, expect, test } from 'vitest';
import {
  corsHeaders,
  isAllowedOrigin,
  MAX_BODY_BYTES,
  parseAllowedOrigins,
  readJsonBody,
  sourceAddress,
} from '../../../../supabase/functions/_shared/http.ts';

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });

/** A minimal Request stand-in so Content-Length can be set to anything. */
const fakeRequest = (body: ReadableStream<Uint8Array> | null, headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), body }) as unknown as Request;

describe('parseAllowedOrigins', () => {
  test('an unset or empty secret allows no origin at all (the safe default)', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins(null)).toEqual([]);
    expect(parseAllowedOrigins('')).toEqual([]);
  });

  test('keeps well-formed origins, trims, lower-cases and drops trailing slashes and duplicates', () => {
    expect(parseAllowedOrigins(' https://WellPeps.com/ , https://www.wellpeps.com,https://wellpeps.com ')).toEqual([
      'https://wellpeps.com',
      'https://www.wellpeps.com',
    ]);
  });

  test('never honors a wildcard, a bare host, a path or a non-http scheme', () => {
    expect(parseAllowedOrigins('*, wellpeps.com, https://wellpeps.com/path, ftp://wellpeps.com, javascript:alert(1)')).toEqual([]);
  });

  test('accepts a local development origin with a port', () => {
    expect(parseAllowedOrigins('http://localhost:4321')).toEqual(['http://localhost:4321']);
  });
});

describe('isAllowedOrigin and corsHeaders', () => {
  const allowed = ['https://wellpeps.com'];

  test('matches exactly, case-insensitively, and refuses a missing Origin', () => {
    expect(isAllowedOrigin('https://wellpeps.com', allowed)).toBe(true);
    expect(isAllowedOrigin('https://WELLPEPS.com', allowed)).toBe(true);
    expect(isAllowedOrigin('https://evil.example', allowed)).toBe(false);
    expect(isAllowedOrigin('https://wellpeps.com.evil.example', allowed)).toBe(false);
    expect(isAllowedOrigin(null, allowed)).toBe(false);
  });

  test('returns CORS headers only for an allowed origin and echoes that origin, never a wildcard', () => {
    const ok = corsHeaders('https://wellpeps.com', allowed);
    expect(ok['Access-Control-Allow-Origin']).toBe('https://wellpeps.com');
    expect(ok['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(Object.values(ok)).not.toContain('*');
    const no = corsHeaders('https://evil.example', allowed);
    expect(no['Access-Control-Allow-Origin']).toBeUndefined();
    expect(no.Vary).toBe('Origin');
  });
});

describe('readJsonBody', () => {
  test('parses a JSON body whatever the content type', async () => {
    const r = await readJsonBody(fakeRequest(streamOf('{"a":', '1}')));
    expect(r).toEqual({ ok: true, json: { a: 1 } });
  });

  test('refuses a declared Content-Length over the limit without reading the body', async () => {
    const r = await readJsonBody(fakeRequest(streamOf('{}'), { 'content-length': String(MAX_BODY_BYTES + 1) }));
    expect(r).toEqual({ ok: false, status: 413 });
  });

  test('refuses a body that grows past the limit even when Content-Length is missing or false', async () => {
    const big = 'x'.repeat(MAX_BODY_BYTES);
    const r = await readJsonBody(fakeRequest(streamOf('{"k":"', big, '"}'), { 'content-length': '10' }));
    expect(r).toEqual({ ok: false, status: 413 });
  });

  test('a body of exactly the limit is accepted', async () => {
    const filler = 'a'.repeat(MAX_BODY_BYTES - '{"k":""}'.length);
    const r = await readJsonBody(fakeRequest(streamOf(`{"k":"${filler}"}`)));
    expect(r.ok).toBe(true);
  });

  test.each([
    ['not JSON', 'hello'],
    ['empty', ''],
    ['truncated JSON', '{"a":'],
  ])('rejects %s with 400', async (_name, text) => {
    expect(await readJsonBody(fakeRequest(streamOf(text)))).toEqual({ ok: false, status: 400 });
  });

  test('rejects invalid UTF-8 with 400', async () => {
    const bad = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]));
        c.close();
      },
    });
    expect(await readJsonBody(fakeRequest(bad))).toEqual({ ok: false, status: 400 });
  });

  test('rejects a request with no body and a nonsense Content-Length', async () => {
    expect(await readJsonBody(fakeRequest(null))).toEqual({ ok: false, status: 400 });
    expect(await readJsonBody(fakeRequest(streamOf('{}'), { 'content-length': 'abc' }))).toEqual({ ok: false, status: 400 });
  });
});

describe('sourceAddress', () => {
  test('prefers the header the client cannot set', () => {
    expect(sourceAddress(new Headers({ 'cf-connecting-ip': ' 1.2.3.4 ', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
  });

  test('falls back to the RIGHT-most forwarded address, the one added by the nearest proxy, never the left-most the client wrote', () => {
    expect(sourceAddress(new Headers({ 'x-forwarded-for': '6.6.6.6, 10.0.0.9, 203.0.113.7' }))).toBe('203.0.113.7');
    expect(sourceAddress(new Headers({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  test('a client-settable x-real-ip header is ignored, and no header at all gives an empty address', () => {
    expect(sourceAddress(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('');
    expect(sourceAddress(new Headers())).toBe('');
  });
});
