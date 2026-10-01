/**
 * Checkout lock: until launch, visitors can read the whole site but only people
 * with the access password (the LegitScript reviewer, Scriptful, our team) can
 * reach a GEN Health checkout.
 *
 * The checkout links are never written into the pages. scripts/lock-checkout.ts
 * encrypts each one with a key derived from the password (PBKDF2 → AES-GCM) into
 * src/data/checkout-lock.json; the browser decrypts a link only after the
 * password is entered (src/components/CheckoutLock.astro). A wrong password fails
 * the AES-GCM tag check, so there is no plaintext or password hash to read in the
 * page source.
 *
 * Uses only Web Crypto, so the same code runs in the browser, in Node (the lock
 * script) and in vitest.
 */

export interface SealedText {
  iv: string;
  data: string;
}

export interface LockedLink extends SealedText {
  /** SHA-256 of the plaintext URL, so the build can tell when a link in
   *  src/config.ts changed and the lock file needs regenerating. */
  fingerprint: string;
}

export interface CheckoutLockFile {
  version: 1;
  salt: string;
  iterations: number;
  /** Keyed by the CTA target: a product key, a program slug, or 'any'. */
  links: Record<string, LockedLink>;
}

export const LOCK_ITERATIONS = 600_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

export async function fingerprint(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** `extractable` only so the browser can remember the key after one correct
 *  password (it stores the key, never the password). */
export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', true, ['decrypt']);
}

export async function seal(key: CryptoKey, text: string): Promise<SealedText> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** Throws (OperationError) when the key is wrong. */
export async function unseal(key: CryptoKey, sealed: SealedText): Promise<string> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(sealed.iv) }, key, fromBase64(sealed.data));
  return dec.decode(plain);
}

export async function lockLinks(
  password: string,
  links: Readonly<Record<string, string>>,
  iterations = LOCK_ITERATIONS,
): Promise<CheckoutLockFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, iterations);
  const locked: Record<string, LockedLink> = {};
  for (const [target, url] of Object.entries(links)) {
    locked[target] = { ...(await seal(key, url)), fingerprint: await fingerprint(url) };
  }
  return { version: 1, salt: toBase64(salt), iterations, links: locked };
}

/** The key for a lock file, or undefined when the password is wrong. */
export async function unlockKey(password: string, file: CheckoutLockFile): Promise<CryptoKey | undefined> {
  const key = await deriveKey(password, fromBase64(file.salt), file.iterations);
  const first = Object.values(file.links)[0];
  if (!first) return key;
  try {
    await unseal(key, first);
    return key;
  } catch {
    return undefined;
  }
}
