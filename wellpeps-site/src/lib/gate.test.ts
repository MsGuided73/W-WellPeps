import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { GATE_HEADER, GATE_PREFIX, gateHash } from './gate';
import { GATE_PREFIX as CLI_PREFIX, gateHash as cliGateHash } from '../../scripts/gate-hash.mjs';

const TEMPLATE = readFileSync(
  fileURLToPath(new URL('../../nginx.conf.template', import.meta.url)),
  'utf8',
);
const SAMPLE_HASH = 'a'.repeat(64);

/** Mimics the nginx image's envsubst step with the SITE_GATE_ filter. */
const render = (hash: string) => TEMPLATE.replaceAll('${SITE_GATE_HASH}', hash);

describe('gate hash', () => {
  test('matches a known SHA-256 vector for "wellpeps-gate:" + password', async () => {
    // sha256("wellpeps-gate:test"), independently computed
    expect(await gateHash('test')).toBe(
      'ef987cce30ea30ead0fb273df582d4a2715667d925ef8a576458058a33d7ebec',
    );
  });

  test('browser and CLI implementations agree', async () => {
    expect(CLI_PREFIX).toBe(GATE_PREFIX);
    for (const pw of ['test', 'correct horse battery staple', 'pässwörd ✓']) {
      const hex = await gateHash(pw);
      expect(hex).toMatch(/^[0-9a-f]{64}$/);
      expect(hex).toBe(cliGateHash(pw));
    }
  });
});

describe('nginx.conf.template', () => {
  test('SITE_GATE_HASH is the only envsubst placeholder', () => {
    const placeholders = new Set(TEMPLATE.match(/\$\{[^}]*\}/g));
    expect([...placeholders]).toEqual(['${SITE_GATE_HASH}']);
    expect(TEMPLATE).not.toMatch(/\$SITE_GATE/);
  });

  test('unlock header name matches what the gate page sends', () => {
    const nginxVar = '$http_' + GATE_HEADER.toLowerCase().replaceAll('-', '_');
    expect(TEMPLATE).toContain(nginxVar);
  });

  test('keeps relative redirects so https is never downgraded', () => {
    expect(TEMPLATE).toMatch(/^\s*absolute_redirect off;/m);
  });

  test('rate-limited unlock location never returns in the rewrite phase', () => {
    const block = TEMPLATE.match(/location = \/__unlock \{([^}]*)\}/)?.[1] ?? '';
    expect(block).toContain('limit_req zone=gate_unlock');
    expect(block).toContain('try_files');
    expect(block).not.toMatch(/\breturn\b/);
  });

  test('every HTML location is gated', () => {
    for (const loc of ['location = /peptides {', 'location = /peptides/ {', 'location / {']) {
      const start = TEMPLATE.indexOf(loc);
      expect(start, loc).toBeGreaterThan(-1);
      expect(TEMPLATE.slice(start, start + 200), loc).toContain('if ($gate_ok = 0) { return 401; }');
    }
  });

  test('rendered with a hash: cookie and unlock compare against it exactly', () => {
    const conf = render(SAMPLE_HASH);
    expect(conf).toContain(`"~^${SAMPLE_HASH}:${SAMPLE_HASH}$"    1;`);
    expect(conf).toContain(`Set-Cookie "wp_gate=${SAMPLE_HASH}; Path=/;`);
  });

  test('gate-ok map: off when hash empty, exact cookie match when on', () => {
    const rules = (hash: string) => {
      const conf = render(hash);
      const body = conf.match(/\$gate_ok \{([^}]*)\}/)?.[1] ?? '';
      const regexes = [...body.matchAll(/"~([^"]+)"\s+(\d);/g)].map(
        ([, re, v]) => [new RegExp(re), v] as const,
      );
      return (cookie: string) => {
        const key = `${hash}:${cookie}`;
        const hit = regexes.find(([re]) => re.test(key));
        return hit ? hit[1] : '0';
      };
    };
    const off = rules('');
    expect(off('')).toBe('1');
    expect(off('stale-cookie-from-an-old-password')).toBe('1');

    const on = rules(SAMPLE_HASH);
    expect(on('')).toBe('0');
    expect(on(SAMPLE_HASH)).toBe('1');
    expect(on(SAMPLE_HASH + 'x')).toBe('0');
    expect(on('b'.repeat(64))).toBe('0');
  });

  test('unlock map never succeeds while the gate is off', () => {
    const conf = render('');
    const body = conf.match(/\$gate_unlock_ok \{([^}]*)\}/)?.[1] ?? '';
    const regexes = [...body.matchAll(/"~([^"]+)"\s+(\d);/g)].map(
      ([, re, v]) => [new RegExp(re), v] as const,
    );
    const hit = regexes.find(([re]) => re.test(':'));
    expect(hit?.[1]).toBe('0');
  });
});
