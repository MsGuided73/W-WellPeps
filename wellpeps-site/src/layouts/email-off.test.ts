import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Cloudflare's Email Address Obfuscation turns each address into a /cdn-cgi/l/email-protection#... link that
// answers 404 to crawlers (Bing site scan, 2026-11-19). The layout wraps the page in email_off markers so
// Cloudflare leaves addresses as written. They must stay plain HTML comments: set:html="..." escaped them.
describe('BaseLayout keeps Cloudflare email obfuscation off', () => {
  const layout = readFileSync(new URL('./BaseLayout.astro', import.meta.url), 'utf8');

  test('the page body opens and closes an email_off block, in that order', () => {
    const on = layout.indexOf('<!--email_off-->');
    const off = layout.indexOf('<!--/email_off-->');
    expect(on, 'opening marker').toBeGreaterThan(layout.indexOf('<body'));
    expect(off, 'closing marker').toBeGreaterThan(layout.indexOf('<Footer'));
    expect(off).toBeLessThan(layout.indexOf('</body>'));
  });
});
