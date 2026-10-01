import { describe, expect, test, vi } from 'vitest';
import { createRateLimiter, createSourceKeyer, sourceNetwork } from '../../../../supabase/functions/_shared/rate-limit.ts';

const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);
const MIN = 60 * 1000;

describe('createRateLimiter', () => {
  test('allows up to the limit in a window, then refuses with a retry time', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 10 * MIN });
    expect(rl.hit('a', T0).allowed).toBe(true);
    expect(rl.hit('a', T0 + 1000).allowed).toBe(true);
    expect(rl.hit('a', T0 + 2000).allowed).toBe(true);
    const fourth = rl.hit('a', T0 + 3000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSec).toBeGreaterThan(0);
    expect(fourth.retryAfterSec).toBeLessThanOrEqual(600);
  });

  test('sources do not affect each other', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: MIN });
    expect(rl.hit('a', T0).allowed).toBe(true);
    expect(rl.hit('a', T0).allowed).toBe(false);
    expect(rl.hit('b', T0).allowed).toBe(true);
  });

  test('the window resets after it ends', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: MIN });
    expect(rl.hit('a', T0).allowed).toBe(true);
    expect(rl.hit('a', T0 + 30 * 1000).allowed).toBe(false);
    expect(rl.hit('a', T0 + MIN + 1).allowed).toBe(true);
  });

  test('refused requests keep counting, so a retry storm stays throttled', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: MIN });
    rl.hit('a', T0);
    for (let i = 0; i < 20; i += 1) expect(rl.hit('a', T0 + i).allowed).toBe(false);
  });

  test('memory is bounded: when the table is full the OLDEST counters are evicted, not all of them', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 10 * MIN, maxKeys: 50 });
    for (let i = 0; i < 500; i += 1) rl.hit(`k${i}`, T0);
    // The oldest key was evicted (fails open) rather than the process running out of memory...
    expect(rl.hit('k0', T0).allowed).toBe(true);
    // ...but a recent key is still being counted, so a flood does not wipe every counter at once.
    expect(rl.hit('k499', T0).allowed).toBe(false);
  });

  test('finished windows are dropped before any live counter is evicted', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: MIN, maxKeys: 10 });
    for (let i = 0; i < 10; i += 1) rl.hit(`old${i}`, T0);
    rl.hit('live', T0 + 2 * MIN);
    for (let i = 0; i < 9; i += 1) rl.hit(`new${i}`, T0 + 2 * MIN);
    expect(rl.hit('live', T0 + 2 * MIN).allowed).toBe(false);
  });
});

describe('sourceNetwork', () => {
  test('IPv4 addresses and anything unparseable pass through unchanged', () => {
    expect(sourceNetwork('203.0.113.9')).toBe('203.0.113.9');
    expect(sourceNetwork('')).toBe('');
    expect(sourceNetwork('not an address')).toBe('not an address');
    expect(sourceNetwork('1:2:3')).toBe('1:2:3');
    expect(sourceNetwork('1::2::3')).toBe('1::2::3');
    expect(sourceNetwork('gggg::1')).toBe('gggg::1');
  });

  test('an IPv6 address is reduced to its /64 so one allocation cannot mint endless buckets', () => {
    const a = sourceNetwork('2001:db8:abcd:12:1111:2222:3333:4444');
    expect(a).toBe('2001:0db8:abcd:0012::/64');
    expect(sourceNetwork('2001:db8:abcd:12:ffff:eeee:dddd:cccc')).toBe(a);
    expect(sourceNetwork('2001:db8:abcd:13:1111:2222:3333:4444')).not.toBe(a);
  });

  test('compressed, upper-case, bracketed and zone-suffixed spellings of the same network agree', () => {
    expect(sourceNetwork('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(sourceNetwork('2001:0DB8:0:0:0:0:0:1')).toBe('2001:0db8:0000:0000::/64');
    expect(sourceNetwork('[2001:db8::1]')).toBe('2001:0db8:0000:0000::/64');
    expect(sourceNetwork('fe80::1%eth0')).toBe('fe80:0000:0000:0000::/64');
    expect(sourceNetwork('::1')).toBe('0000:0000:0000:0000::/64');
  });

  test('an IPv4-mapped IPv6 address becomes the IPv4 address, so both spellings share a bucket', () => {
    expect(sourceNetwork('::ffff:203.0.113.9')).toBe('203.0.113.9');
    expect(sourceNetwork('0:0:0:0:0:ffff:203.0.113.9')).toBe('203.0.113.9');
  });
});

describe('createSourceKeyer', () => {
  const fixedRandom = (seed: number) => (n: number) => new Uint8Array(n).fill(seed);

  test('maps the same address to the same opaque key within a day, and different addresses to different keys', async () => {
    const key = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(7) });
    const a1 = await key('203.0.113.9');
    const a2 = await key('203.0.113.9');
    const b = await key('203.0.113.10');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  test('the key is opaque: fixed-length hex that contains no part of the address', async () => {
    const key = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(7) });
    const k = await key('203.0.113.9');
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(k).not.toContain('203');
    expect(k).not.toContain('113');
    expect(await key('2001:db8::1')).toMatch(/^[0-9a-f]{32}$/);
  });

  test('the salt is replaced when the UTC day changes, so a key cannot be linked across days', async () => {
    let now = T0;
    const random = vi.fn(fixedRandom(1));
    const salts = [fixedRandom(1), fixedRandom(2)];
    let i = 0;
    random.mockImplementation((n: number) => salts[i++](n));
    const key = createSourceKeyer({ now: () => now, randomBytes: random });
    const day1 = await key('203.0.113.9');
    await key('203.0.113.9');
    expect(random).toHaveBeenCalledTimes(1);
    now = T0 + 24 * 60 * MIN;
    const day2 = await key('203.0.113.9');
    expect(random).toHaveBeenCalledTimes(2);
    expect(day2).not.toBe(day1);
  });

  test('every address in one IPv6 /64 shares a bucket, and an IPv4-mapped address shares the IPv4 bucket', async () => {
    const key = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(7) });
    expect(await key('2001:db8:abcd:12:1111:2222:3333:4444')).toBe(await key('2001:db8:abcd:12:aaaa:bbbb:cccc:dddd'));
    expect(await key('2001:db8:abcd:12::1')).not.toBe(await key('2001:db8:abcd:13::1'));
    expect(await key('::ffff:203.0.113.9')).toBe(await key('203.0.113.9'));
  });

  test('different isolates (different random salts) give different keys for the same address', async () => {
    const one = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(1) });
    const two = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(2) });
    expect(await one('203.0.113.9')).not.toBe(await two('203.0.113.9'));
  });

  test('a request with no address shares one bucket instead of failing', async () => {
    const key = createSourceKeyer({ now: () => T0, randomBytes: fixedRandom(7) });
    expect(await key('')).toBe(await key(''));
  });

  test('works with the real random source', async () => {
    const key = createSourceKeyer();
    expect(await key('203.0.113.9')).toMatch(/^[0-9a-f]{32}$/);
  });
});
