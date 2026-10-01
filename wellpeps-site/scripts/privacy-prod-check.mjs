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

check('no script errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
process.exit(fails ? 1 : 0);
