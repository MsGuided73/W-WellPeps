/**
 * Small strict-validation helpers shared by the three edge functions.
 *
 * Pure TypeScript with no Deno-only imports, so the same code runs under
 * `supabase functions deploy` (Deno) and under vitest (Node, from
 * wellpeps-site/src/lib/edge). Imports use explicit `.ts` extensions because
 * Deno requires them.
 *
 * The rule everywhere: a payload is accepted only if every field has the exact
 * type, length, shape and allowed value, and there are NO unknown keys. A client
 * that starts sending an extra field (say, an identifier added by mistake) is
 * rejected loudly instead of being quietly stored or quietly dropped.
 */

export type Check<T> = { ok: true; value: T } | { ok: false; reason: string };

export const pass = <T>(value: T): Check<T> => ({ ok: true, value });
export const fail = (reason: string): Check<never> => ({ ok: false, reason });

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** True when `obj` has no key outside `allowed` (own enumerable keys only). */
export function hasOnlyKeys(obj: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

/**
 * Single-line text may not contain control characters (NUL would also make
 * Postgres reject the row), the C1 controls, the Unicode line and paragraph
 * separators, or the bidirectional override and isolate controls (which can make
 * stored text display as something else on a staff screen).
 */
const CONTROL_ANY = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
/** Multi-line text may also contain tab, line feed and carriage return. */
const CONTROL_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

export function hasControlChars(s: string, allowWhitespace = false): boolean {
  return (allowWhitespace ? CONTROL_EXCEPT_WHITESPACE : CONTROL_ANY).test(s);
}

export interface StringRules {
  min?: number;
  max: number;
  pattern?: RegExp;
  /** Allow tab and line breaks (free text). Default is single-line. */
  multiline?: boolean;
}

export function readString(obj: Record<string, unknown>, key: string, rules: StringRules): Check<string> {
  const v = obj[key];
  if (typeof v !== 'string') return fail(`${key}: not a string`);
  if (v.length < (rules.min ?? 0) || v.length > rules.max) return fail(`${key}: bad length`);
  if (hasControlChars(v, rules.multiline === true)) return fail(`${key}: control characters`);
  if (rules.pattern && !rules.pattern.test(v)) return fail(`${key}: bad shape`);
  return pass(v);
}

export function readBoolean(obj: Record<string, unknown>, key: string): Check<boolean> {
  const v = obj[key];
  return typeof v === 'boolean' ? pass(v) : fail(`${key}: not a boolean`);
}

export function readEnum<T extends string>(obj: Record<string, unknown>, key: string, list: readonly T[]): Check<T> {
  const v = obj[key];
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? pass(v as T) : fail(`${key}: not allowed`);
}

export function readNumberEnum<T extends number>(obj: Record<string, unknown>, key: string, list: readonly T[]): Check<T> {
  const v = obj[key];
  return typeof v === 'number' && (list as readonly number[]).includes(v) ? pass(v as T) : fail(`${key}: not allowed`);
}

/** UUID (any version) in canonical form, or the 32-hex fallback the browser uses when randomUUID is missing. */
export const ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i;

/** Strict ISO-8601 UTC timestamp with milliseconds, exactly what Date.prototype.toISOString writes. */
export const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isRealIsoTimestamp(s: string): boolean {
  if (!ISO_UTC_PATTERN.test(s)) return false;
  const t = Date.parse(s);
  // Date.parse accepts 2026-02-31 and rolls it over; the round trip catches that.
  return Number.isFinite(t) && new Date(t).toISOString() === s;
}
