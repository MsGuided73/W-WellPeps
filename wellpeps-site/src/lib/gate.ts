/**
 * Private-preview site gate — shared hashing rule.
 *
 * nginx (nginx.conf.template) compares the visitor's `wp_gate` cookie and the
 * `X-WP-Gate` unlock header against SITE_GATE_HASH, which is the lowercase hex
 * SHA-256 of GATE_PREFIX + password. The gate page computes the same hash in
 * the browser; scripts/gate-hash.mjs computes it in Node for Coolify.
 * Change the prefix here and in scripts/gate-hash.mjs together (a test pins
 * the two to each other).
 */
export const GATE_PREFIX = 'wellpeps-gate:';

/** Header the gate page sends its hash in (kept out of URLs and access logs). */
export const GATE_HEADER = 'X-WP-Gate';

/** Unlock endpoint served by nginx only; `npm run dev` has no gate. */
export const GATE_UNLOCK_PATH = '/__unlock';

export async function gateHash(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(GATE_PREFIX + password);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
