/**
 * Print the SITE_GATE_HASH value for a private-preview password.
 *
 *   node scripts/gate-hash.mjs "the password"
 *
 * Paste the output into Coolify as the runtime env var SITE_GATE_HASH and
 * restart the app. The rule (lowercase hex SHA-256 of "wellpeps-gate:" +
 * password) must match src/lib/gate.ts, which the gate page uses in the
 * browser. The hash is what nginx checks, so treat it like the password.
 */
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const GATE_PREFIX = 'wellpeps-gate:';

export function gateHash(password) {
  return createHash('sha256').update(GATE_PREFIX + password, 'utf8').digest('hex');
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const password = process.argv[2];
  if (typeof password !== 'string' || password.length === 0) {
    console.error('Usage: node scripts/gate-hash.mjs "the password"');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Warning: use at least 12 characters; the unlock endpoint is only rate-limited, not locked.');
  }
  console.log(gateHash(password));
}
