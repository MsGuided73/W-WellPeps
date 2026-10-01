/**
 * Strictness rules for the site's Content-Security-Policy (W4). Shared by
 * src/lib/security-headers.test.ts and scripts/security-headers-check.mjs.
 * These encode WHY the policy is safe, so loosening it later fails loudly.
 */
import { parseCsp } from './nginx-conf.mjs';

const KEYWORDS = new Set(["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "'strict-dynamic'", "'wasm-unsafe-eval'"]);

/** Directives that must be exactly this list of sources. */
const EXACT = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'"],
  'font-src': ["'self'"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  // style="..." attributes only. Attributes cannot run script, so this is the
  // accepted exception; <style> elements stay blocked by style-src above.
  'style-src-attr': ["'unsafe-inline'"],
};

/**
 * @param {string} csp
 * @param {string[]} allowedConnectOrigins origins connect-src may name besides 'self', e.g. https://x.supabase.co
 * @returns {string[]} problems
 */
export function auditCsp(csp, allowedConnectOrigins) {
  const problems = [];
  const policy = parseCsp(csp);

  for (const [directive, expected] of Object.entries(EXACT)) {
    const actual = policy[directive];
    if (!actual) { problems.push(`CSP is missing ${directive}`); continue; }
    if (actual.join(' ') !== expected.join(' ')) {
      problems.push(`CSP ${directive} must be ${expected.join(' ')}, found ${actual.join(' ')}`);
    }
  }
  if (!('upgrade-insecure-requests' in policy)) problems.push('CSP is missing upgrade-insecure-requests');

  const connect = policy['connect-src'];
  if (!connect) {
    problems.push('CSP is missing connect-src');
  } else {
    if (!connect.includes("'self'")) problems.push("CSP connect-src must include 'self'");
    for (const src of connect.filter((s) => s !== "'self'")) {
      if (!allowedConnectOrigins.includes(src)) {
        problems.push(`CSP connect-src names ${src}, which no endpoint in the source uses`);
      }
    }
    for (const origin of allowedConnectOrigins) {
      if (!connect.includes(origin)) problems.push(`CSP connect-src is missing ${origin}, which the site calls`);
    }
  }

  // Nothing, anywhere, may be a wildcard, a bare scheme, or an unsafe keyword
  // (other than the one documented style-src-attr exception).
  for (const [directive, sources] of Object.entries(policy)) {
    for (const src of sources) {
      const lower = src.toLowerCase();
      if (lower === '*' || lower.includes('*')) problems.push(`CSP ${directive} contains a wildcard: ${src}`);
      if (/^[a-z][a-z0-9+.-]*:$/.test(lower)) problems.push(`CSP ${directive} allows a whole scheme: ${src}`);
      if (lower.startsWith('http://')) problems.push(`CSP ${directive} allows plain http: ${src}`);
      if (/^'unsafe-(eval|hashes)'$/.test(lower)) problems.push(`CSP ${directive} contains ${src}`);
      if (lower === "'unsafe-inline'" && directive !== 'style-src-attr') {
        problems.push(`CSP ${directive} contains 'unsafe-inline' (only style-src-attr may)`);
      }
      const isKeyword = KEYWORDS.has(lower);
      const isHttpsOrigin = /^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(lower);
      if (!isKeyword && !isHttpsOrigin && directive !== 'upgrade-insecure-requests') {
        problems.push(`CSP ${directive} contains an unexpected source: ${src}`);
      }
    }
  }
  return problems;
}
