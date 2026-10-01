import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * A guard on the SOURCE of the analytics tool. The behaviour tests prove what it
 * does today; this fails the build if someone later adds a way to store something
 * in the browser, make an identifier, fingerprint the device or read page text.
 * Comments are removed first, so explaining what the tool does not do is allowed.
 */
const dir = resolve(__dirname);
const production = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'test-support.ts')
  .map((f) => ({ name: f, src: readFileSync(resolve(dir, f), 'utf8') }));

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const FORBIDDEN: Array<[string, RegExp]> = [
  ['cookies', /\bdocument\s*\.\s*cookie\b|\bcookieStore\b/],
  ['web storage', /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bIDBFactory\b|\bopenDatabase\b|navigator\s*\.\s*storage\b|\bcaches\s*\./],
  ['random identifiers', /Math\s*\.\s*random|\brandomUUID\b|\bgetRandomValues\b|crypto\s*\.\s*subtle|\bnanoid\b|\buuid\b/i],
  ['device fingerprinting', /\buserAgent\b|navigator\s*\.\s*(language|languages|platform|plugins|hardwareConcurrency|deviceMemory|userAgentData)\b|\bscreen\s*\.|devicePixelRatio|\bcanvas\b|toDataURL|AudioContext|\bWebGL|fingerprint/i],
  ['page text, titles and form values', /\binnerText\b|\btextContent\b|\binnerHTML\b|\bdocument\s*\.\s*title\b|\.value\b|\bFormData\b|\bgetSelection\b/],
  ['query strings, hashes and full URLs', /location\s*\.\s*(search|hash|href)\b|\bURLSearchParams\b|\.search\b|\.hash\b/],
  ['network identity', /\bRTCPeerConnection\b|\bgetBattery\b|\bNetworkInformation\b|navigator\s*\.\s*connection\b/],
];

describe('the analytics source never reaches for storage, identifiers or page content', () => {
  test('there are production source files to check', () => {
    expect(production.map((p) => p.name)).toEqual(expect.arrayContaining(['collector.ts', 'sanitize.ts', 'transport.ts', 'tracker.ts', 'browser-env.ts', 'model.ts']));
  });

  test.each(FORBIDDEN)('no use of %s', (_label, pattern) => {
    for (const { name, src } of production) {
      expect(stripComments(src), `${name} matches ${pattern}`).not.toMatch(pattern);
    }
  });

  test('only transport.ts sends anything, and its fetch omits credentials', () => {
    // Calling a network primitive directly. (transport.ts reaches them through injected functions,
    // and tracker.ts only passes navigator.sendBeacon along; neither is a direct call.)
    const DIRECT_NETWORK_CALL = /\bfetch\s*\(|\.sendBeacon\s*\(|XMLHttpRequest|WebSocket|EventSource|new Image\s*\(|createElement\s*\(|importScripts/;
    for (const { name, src } of production) {
      const code = stripComments(src);
      expect(code, name).not.toMatch(DIRECT_NETWORK_CALL);
      if (name === 'transport.ts') {
        expect(code).toMatch(/opts\.sendBeacon\?\.\(/);
        expect(code).toMatch(/credentials:\s*'omit'/);
        expect(code).toMatch(/referrerPolicy:\s*'no-referrer'/);
        expect(code).toMatch(/keepalive:\s*true/);
        // fetch is tried first; the beacon (which always carries credentials) is only the fallback.
        expect(code.indexOf('postWithFetch(body)')).toBeGreaterThan(-1);
        expect(code.indexOf('postWithFetch(body)')).toBeLessThan(code.indexOf('opts.sendBeacon?.('));
      }
    }
    // Nothing but the transport and the tracker's wiring mentions the send functions at all.
    const mentionsSending = production.filter((p) => /sendBeacon|fetchImpl/.test(stripComments(p.src))).map((p) => p.name);
    expect(mentionsSending.sort()).toEqual(['tracker.ts', 'transport.ts']);
  });

  test('the comment stripper really strips comments (a sanity check on the test itself)', () => {
    expect(stripComments('a // localStorage\n/* sessionStorage */ b')).not.toMatch(/Storage/);
    expect(stripComments("fetch('https://x.test/a')")).toContain('https://x.test/a');
  });

  test('nothing in the tool imports another browser-state module (the consent cookie code stays out)', () => {
    for (const { name, src } of production) {
      const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      for (const spec of imports) {
        expect(['./model', './sanitize', './collector', './transport', './browser-env', '../privacy/consent', '../privacy/registry'], `${name} imports ${spec}`).toContain(spec);
      }
    }
  });
});
