import { describe, expect, test } from 'vitest';
import { CTA_LINKS } from '../config';
import lockFile from '../data/checkout-lock.json';
import { linkedTargets } from './cta';
import { exportKey, fingerprint, importKey, lockLinks, unlockKey, unseal, type CheckoutLockFile } from './checkout-lock';

// Few iterations keep the round-trip tests fast; the real file uses LOCK_ITERATIONS.
const FAST = 1_000;

describe('checkout lock', () => {
  test('the right password reveals each link', async () => {
    const file = await lockLinks('open sesame', { a: 'https://portal.wellpeps.com/x', b: 'https://portal.wellpeps.com/y' }, FAST);
    const key = await unlockKey('open sesame', file);
    expect(key).toBeDefined();
    expect(await unseal(key!, file.links.b)).toBe('https://portal.wellpeps.com/y');
  });

  test('a wrong password reveals nothing', async () => {
    const file = await lockLinks('open sesame', { a: 'https://portal.wellpeps.com/x' }, FAST);
    expect(await unlockKey('open sesame!', file)).toBeUndefined();
  });

  test('a remembered key still opens the links', async () => {
    const file = await lockLinks('open sesame', { a: 'https://portal.wellpeps.com/x' }, FAST);
    const remembered = await importKey(await exportKey((await unlockKey('open sesame', file))!));
    expect(await unseal(remembered, file.links.a)).toBe('https://portal.wellpeps.com/x');
  });

  test('the lock file contains no plaintext link', async () => {
    const file = await lockLinks('open sesame', { a: 'https://portal.wellpeps.com/x' }, FAST);
    expect(JSON.stringify(file)).not.toContain('portal.wellpeps.com');
  });

  test('src/data/checkout-lock.json matches every live link in src/config.ts', async () => {
    const live = linkedTargets(CTA_LINKS);
    const locked = (lockFile as CheckoutLockFile).links;
    expect(Object.keys(locked).sort()).toEqual(Object.keys(live).sort());
    for (const [target, url] of Object.entries(live)) {
      expect(locked[target].fingerprint, `run npm run lock:checkout (${target})`).toBe(await fingerprint(url));
    }
    expect(JSON.stringify(lockFile)).not.toContain('portal.wellpeps.com');
  });
});
