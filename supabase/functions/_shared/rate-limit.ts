/**
 * Per-source rate limiting that never stores an IP address.
 *
 * DESIGN (and its honest limits):
 *  - The source address is turned into an opaque bucket key with SHA-256 over a
 *    random salt that exists only in this isolate's memory and is replaced every
 *    UTC day. The address itself is never stored, logged or sent anywhere, and
 *    once the isolate or the day ends the key cannot be recomputed by anyone,
 *    including us.
 *  - The counters live in memory, in a fixed window, and are bounded in size (the
 *    oldest are evicted when the table is full). Nothing is written to the database.
 *  - An IPv6 address is reduced to its /64 network before hashing, because one
 *    customer is normally given a whole /64 and could otherwise use endless buckets.
 *  - Edge function isolates are many and short-lived and do not share memory, so
 *    this is a BEST-EFFORT throttle per isolate, not a global quota. It slows a
 *    single noisy source and stops accidental loops; it will not stop a
 *    distributed flood. Platform limits (Supabase project limits, a CDN or WAF
 *    rule in front of the project) remain the real backstop. Request bodies are
 *    size-capped and strictly validated regardless, and privacy-request also has
 *    a database-level hourly circuit breaker (privacy-request-store.ts).
 *  - Rejected requests count against the bucket, so retry storms stay throttled.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (only meaningful when not allowed). */
  retryAfterSec: number;
}

export interface RateLimiter {
  hit(key: string, nowMs: number): RateLimitResult;
}

export interface RateLimiterOptions {
  /** Requests allowed per source per window. */
  limit: number;
  windowMs: number;
  /** Upper bound on tracked sources; the oldest are evicted if it overflows. */
  maxKeys?: number;
}

const DEFAULT_MAX_KEYS = 5000;

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS;
  const windows = new Map<string, { count: number; resetAt: number }>();

  /** Make room for a new source: drop finished windows, then, if still full, the oldest tenth. */
  function makeRoom(nowMs: number): void {
    for (const [key, w] of windows) {
      if (w.resetAt <= nowMs) windows.delete(key);
    }
    if (windows.size < maxKeys) return;
    // Still full of live sources. A Map keeps insertion order, so these are the oldest.
    // Evicting a few at a time (instead of clearing everything) means a flood of new
    // sources pushes out only the oldest counters, not every counter at once.
    let drop = Math.max(1, Math.floor(maxKeys / 10));
    for (const key of windows.keys()) {
      if (drop <= 0) break;
      windows.delete(key);
      drop -= 1;
    }
  }

  return {
    hit(key, nowMs) {
      const existing = windows.get(key);
      if (!existing || existing.resetAt <= nowMs) {
        if (!existing && windows.size >= maxKeys) makeRoom(nowMs);
        windows.set(key, { count: 1, resetAt: nowMs + opts.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      existing.count += 1;
      if (existing.count > opts.limit) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

export interface SourceKeyerOptions {
  now?: () => number;
  /** Random bytes; injectable for tests. Defaults to crypto.getRandomValues. */
  randomBytes?: (length: number) => Uint8Array;
}

/**
 * Reduce an IPv6 address to its /64 network so one client cannot mint endless
 * buckets from one allocation. An IPv4-mapped IPv6 address becomes the IPv4
 * address. IPv4 and anything that does not parse pass through unchanged.
 */
export function sourceNetwork(address: string): string {
  const a = address.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (!a.includes(':')) return a;
  const mapped = /^(?:0{0,4}:){0,5}(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (mapped) return mapped[1];
  const halves = a.split('::');
  if (halves.length > 2) return a;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (halves.length === 2 ? fill < 1 : head.length !== 8) return a;
  const groups = [...head, ...Array<string>(fill).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return a;
  return `${groups
    .slice(0, 4)
    .map((g) => g.padStart(4, '0'))
    .join(':')}::/64`;
}

const SALT_BYTES = 16;
const KEY_HEX_CHARS = 32;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Returns a function that maps a source address to an opaque bucket key. The
 * salt is generated lazily, kept only in memory, and replaced when the UTC day
 * changes. An empty address maps to one shared bucket.
 */
export function createSourceKeyer(opts: SourceKeyerOptions = {}): (address: string) => Promise<string> {
  const now = opts.now ?? (() => Date.now());
  const random = opts.randomBytes ?? ((n: number) => crypto.getRandomValues(new Uint8Array(n)));
  let day = '';
  let salt: Uint8Array = new Uint8Array(0);

  return async (address) => {
    const today = utcDay(now());
    if (today !== day || salt.length === 0) {
      day = today;
      salt = random(SALT_BYTES);
    }
    const data = new TextEncoder().encode(sourceNetwork(address) || 'no-address');
    const input = new Uint8Array(salt.length + data.length);
    input.set(salt, 0);
    input.set(data, salt.length);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    return Array.from(digest, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, KEY_HEX_CHARS);
  };
}
