/**
 * Privacy control against a PRODUCTION build (npm run build, then npx astro preview --port 4322).
 * Confirms the live site asks about nothing it does not use, remembers a choice, and honors a real
 * Global Privacy Control signal. Run: node scripts/privacy-prod-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4322';
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!ok) fails++; };

const browser = await chromium.launch();
const errors = [];

// 1. Ordinary visitor on the production build
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const bannerHidden = await page.locator('[data-privacy-banner]').evaluate((el) => el.hidden);
  check('production: no banner (the site loads no optional tool, so there is nothing to ask)', bannerHidden === true);
  const cookies = await page.evaluate(() => document.cookie);
  check('production: no cookies are set on a first visit', cookies === '', cookies);
  check('production: no demo tool code shipped', !(await page.evaluate(() => 'wpPrivacy' in window)));

  await page.locator('footer a[data-privacy-open]').first().click();
  await page.locator('dialog[data-privacy-dialog][open]').waitFor({ timeout: 5000 });
  const text = await page.locator('dialog[data-privacy-dialog]').innerText();
  check('production: panel says no analytics tool runs today', /No analytics tool runs on this site today/.test(text));
  check('production: panel says no advertising tool runs today', /No advertising tool runs on this site today/.test(text));
  await page.locator('dialog [data-pc-toggle="analytics"]').check();
  const after = await page.evaluate(() => document.cookie);
  check('production: a choice is remembered in the host-only consent cookie', /wp_consent=/.test(after));
  check('production: the cookie holds no email or identifier beyond a random id', !/@/.test(decodeURIComponent(after)));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('footer a[data-privacy-open]').first().click();
  await page.locator('dialog[data-privacy-dialog][open]').waitFor();
  check('production: the choice survives a reload', await page.locator('dialog [data-pc-toggle="analytics"]').isChecked());
  await ctx.close();
}

// 2. A real GPC signal on the production build
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/your-privacy-choices/`, { waitUntil: 'networkidle' });
  const adv = page.locator('[data-variant="page"] [data-pc-toggle="advertising"]');
  check('production GPC: advertising switch is locked off', (await adv.isDisabled()) && !(await adv.isChecked()));
  check('production GPC: the page says it detected the signal', /Global Privacy Control signal/.test(await page.locator('[data-variant="page"] [data-pc-gpc]').innerText()));
  await ctx.close();
}

// Checks 3 and 4 read the built files in dist/.
const { readdirSync, readFileSync, statSync } = await import('node:fs');
const { join, dirname } = await import('node:path');
const { fileURLToPath } = await import('node:url');
const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const built = walk(join(siteRoot, 'dist')).filter((f) => /\.(html|js|css|mjs)$/.test(f));
const filesMatching = (re) => built.filter((f) => re.test(readFileSync(f, 'utf8')));

// 3. Development tools must not ship. The Tweak panel is for `astro dev` only.
{
  const leaks = filesMatching(/wp-tweak-panel|tweak-panel|wp-tweaks:v/);
  check('production: the dev-only Tweak panel is not in the build', leaks.length === 0, leaks.slice(0, 2).join(', '));
}

// 4. The anonymous analytics tool is built but registered OFF (ANALYTICS_ENABLED in config.ts). While it is off,
//    none of its code or its endpoint may be in the build: the registry is empty, so no banner and nothing sent.
{
  const config = readFileSync(join(siteRoot, 'src', 'lib', 'privacy', 'config.ts'), 'utf8');
  const analyticsOn = /export const ANALYTICS_ENABLED(?::\s*boolean)?\s*=\s*true\b/.test(config);
  if (analyticsOn) {
    console.log('SKIP  analytics build-leak check (ANALYTICS_ENABLED is true)');
  } else {
    const leaks = filesMatching(/wellpeps-anonymous-stats|analytics-event|"page_leave"|'page_leave'/);
    check('production: the analytics tool is switched off, so none of its code or endpoint is in the build', leaks.length === 0, leaks.slice(0, 2).join(', '));
  }
}

check('no script errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
process.exit(fails ? 1 : 0);
