/**
 * Encrypts every live GEN Health checkout link with the checkout-lock password
 * and writes src/data/checkout-lock.json (see src/lib/checkout-lock.ts).
 *
 *   npm run lock:checkout
 *
 * Reads CHECKOUT_LOCK_PASSWORD from wellpeps-site/.env (never committed). Run it
 * after changing any link in src/config.ts or the password, then commit the
 * JSON. The password itself is never printed or written anywhere else.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CTA_LINKS } from '../src/config';
import { linkedTargets } from '../src/lib/cta';
import { lockLinks } from '../src/lib/checkout-lock';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
try {
  process.loadEnvFile(envFile);
} catch {
  // No .env: the password may come from the shell environment instead.
}

const password = process.env.CHECKOUT_LOCK_PASSWORD;
if (!password) {
  console.error('Set CHECKOUT_LOCK_PASSWORD in wellpeps-site/.env first.');
  process.exit(1);
}

const links = linkedTargets(CTA_LINKS);
const file = await lockLinks(password, links);
const out = fileURLToPath(new URL('../src/data/checkout-lock.json', import.meta.url));
writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
console.log(`Locked ${Object.keys(links).length} checkout links -> src/data/checkout-lock.json`);
