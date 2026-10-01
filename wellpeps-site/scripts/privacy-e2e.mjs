/**
 * Privacy control, end to end, in a real browser (Playwright).
 *
 * Needs the dev server running (npm run dev) because the demo tools that make
 * the control observable exist only in development builds.
 *
 *   node scripts/privacy-e2e.mjs                 run the checks
 *   node scripts/privacy-e2e.mjs --shots <dir>   also save screenshots
 *   BASE_URL=http://localhost:4321 ...           use another address
 *
 * Exit code 1 if any check fails.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let failures = 0;
let passes = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passes += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `  -> ${detail}` : ''}`);
  }
}

const read = (page) =>
  page.evaluate(() => ({
    cookies: document.cookie,
    demo: window.__wpDemo ?? {},
    log: (window.__wpConsentLog ?? []).map((e) => e.action),
    bannerHidden: document.querySelector('[data-privacy-banner]')?.hidden ?? null,
  }));

const hasCookie = (s, name) => s.cookies.split('; ').some((c) => c.startsWith(`${name}=`));

async function shot(page, name, opts = {}) {
  if (!SHOTS) return;
  await page.screenshot({ path: join(SHOTS, name), ...opts });
}

async function openPanel(page) {
  await page.locator('footer a[data-privacy-open]').first().scrollIntoViewIfNeeded();
  await page.locator('footer a[data-privacy-open]').first().click();
  await page.locator('dialog[data-privacy-dialog][open]').waitFor({ timeout: 5000 });
}

const dlg = (page) => page.locator('dialog[data-privacy-dialog]');

async function main() {
  const browser = await chromium.launch();
  const errorsByPage = [];
  const watch = (page, label) => {
    page.on('pageerror', (e) => errorsByPage.push(`${label}: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|vite|net::ERR|Failed to load resource/.test(m.text())) {
        errorsByPage.push(`${label}: ${m.text()}`);
      }
    });
  };

  // ------------------------------------------------------------------ S1-S7
  console.log('\nScenario 1: first visit, then Accept all, reload, change options, withdraw');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'S1');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    let s = await read(page);
    check('first visit: no optional tool is running', !s.demo['demo-analytics'] && !s.demo['demo-advertising']);
    check('first visit: no demo cookies are set', !hasCookie(s, '_demo_analytics') && !hasCookie(s, '_demo_ads'));
    check('first visit: nothing saved yet', !hasCookie(s, 'wp_consent'));
    check('first visit: banner is shown (the dev build has optional tools to ask about)', s.bannerHidden === false);
    await shot(page, '01-banner-first-visit.png');

    await page.locator('[data-privacy-banner] [data-pc-action="acceptAll"]').click();
    s = await read(page);
    check('Accept all: analytics tool starts', s.demo['demo-analytics'] === true && hasCookie(s, '_demo_analytics'));
    check('Accept all: advertising tool starts', s.demo['demo-advertising'] === true && hasCookie(s, '_demo_ads'));
    check('Accept all: the choice is saved in a cookie', hasCookie(s, 'wp_consent'));
    check('Accept all: banner goes away', s.bannerHidden === true);
    check('Accept all: the choice is logged', s.log.includes('accept_all'));

    await page.reload({ waitUntil: 'networkidle' });
    s = await read(page);
    check('reload: the saved choice is applied before anything else', s.demo['demo-analytics'] === true && s.demo['demo-advertising'] === true);
    check('reload: banner does not come back', s.bannerHidden === true);

    await openPanel(page);
    await shot(page, '03-panel-everything-on.png');
    const d = dlg(page);
    check('panel: opens from the footer link on any page', await d.evaluate((el) => el.open));
    check('panel: summary names what is running', /essential tools(,| and) .*(analytics|advertising)/i.test(await d.locator('[data-pc-summary]').innerText()));

    await d.locator('[data-pc-toggle="advertising"]').uncheck();
    s = await read(page);
    check('advertising switch off: the tool stops in the same session', s.demo['demo-advertising'] === false);
    check('advertising switch off: its cookie is deleted', !hasCookie(s, '_demo_ads'));
    check('advertising switch off: analytics is untouched', s.demo['demo-analytics'] === true && hasCookie(s, '_demo_analytics'));
    check('advertising switch off: the page confirms it', /Advertising is off/.test(await d.locator('[data-pc-status]').innerText()));

    await d.locator('[data-pc-toggle="analytics"]').uncheck();
    s = await read(page);
    check('analytics switch off: the tool stops and its cookie is deleted', s.demo['demo-analytics'] === false && !hasCookie(s, '_demo_analytics'));
    check('analytics switch off: the health-page option turns off and locks', await d.locator('[data-pc-toggle="analyticsSensitive"]').isDisabled());

    await d.locator('[data-pc-toggle="analytics"]').check();
    await d.locator('[data-pc-toggle="analyticsSensitive"]').check();
    check('health-page option can be turned on once analytics is on', await d.locator('[data-pc-toggle="analyticsSensitive"]').isChecked());
    await d.locator('[data-pc-toggle="advertising"]').check();
    await page.keyboard.press('Escape');
    check('panel: closes with the Escape key', !(await d.evaluate((el) => el.open)));

    // ------------------------------------------------ health-topic page rules
    await page.goto(`${BASE}/weight-loss`, { waitUntil: 'networkidle' });
    s = await read(page);
    check('health-topic page: advertising never runs, even with consent', s.demo['demo-advertising'] !== true);
    check('health-topic page: analytics runs because the separate consent was given', s.demo['demo-analytics'] === true);
    await openPanel(page);
    check('health-topic page: the panel explains the rule', /health topic/i.test(await dlg(page).locator('[data-pc-sensitive-note]').innerText()));
    await dlg(page).locator('[data-pc-toggle="analyticsSensitive"]').uncheck();
    s = await read(page);
    check('turning the health-page option off stops analytics there at once', s.demo['demo-analytics'] === false);
    await shot(page, '06-panel-on-health-topic-page.png');
    await page.keyboard.press('Escape');

    // ------------------------------------------------------------- withdraw
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await openPanel(page);
    await dlg(page).locator('[data-pc-action="withdrawAll"]').click();
    s = await read(page);
    check('withdraw all: everything stops and the saved choice is deleted', !hasCookie(s, 'wp_consent') && !hasCookie(s, '_demo_analytics') && !hasCookie(s, '_demo_ads'));
    check('withdraw all: the withdrawal is logged', s.log.includes('withdraw'));
    await page.reload({ waitUntil: 'networkidle' });
    s = await read(page);
    check('after withdrawing, the next visit asks again', s.bannerHidden === false);
    await ctx.close();
  }

  // ------------------------------------------------------------------- S8
  console.log('\nScenario 2: Global Privacy Control signal');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'S2');
    await page.goto(`${BASE}/?gpc=1`, { waitUntil: 'networkidle' });
    let s = await read(page);
    check('GPC: advertising does not start', !s.demo['demo-advertising'] && !hasCookie(s, '_demo_ads'));
    check('GPC: the automatic opt-out is logged', s.log.includes('gpc_auto_optout'));
    await page.locator('[data-privacy-banner] [data-pc-action="acceptAll"]').click();
    s = await read(page);
    check('GPC: Accept all still cannot start advertising', s.demo['demo-advertising'] !== true && !hasCookie(s, '_demo_ads'));
    check('GPC: Accept all does start analytics', s.demo['demo-analytics'] === true);
    await openPanel(page);
    const d = dlg(page);
    check('GPC: advertising switch is locked off', (await d.locator('[data-pc-toggle="advertising"]').isDisabled()) && !(await d.locator('[data-pc-toggle="advertising"]').isChecked()));
    check('GPC: the panel says it detected the signal', /Global Privacy Control/.test(await d.locator('[data-pc-gpc]').innerText()));
    check('GPC: the lock reason is shown next to the switch', /Locked off/.test(await d.locator('[data-pc-lock="advertising"]').innerText()));
    await shot(page, '04-panel-gpc-detected.png');
    await ctx.close();
  }

  // ------------------------------------------------------------------- S9
  console.log('\nScenario 3: GPC arrives after an earlier "Accept all"');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'S3');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-privacy-banner] [data-pc-action="acceptAll"]').click();
    let s = await read(page);
    check('earlier choice: advertising is running', s.demo['demo-advertising'] === true);
    await page.goto(`${BASE}/?gpc=1`, { waitUntil: 'networkidle' });
    s = await read(page);
    check('conflict: the browser signal wins and advertising does not start', s.demo['demo-advertising'] !== true && !hasCookie(s, '_demo_ads'));
    await openPanel(page);
    const d = dlg(page);
    check('conflict: the panel asks whether to allow advertising anyway', /allow advertising anyway/i.test(await d.locator('[data-pc-gpc]').innerText()));
    await shot(page, '05-panel-gpc-conflict.png');
    await d.locator('[data-pc-action="gpcAllowAnyway"]').click();
    s = await read(page);
    check('"Allow anyway": advertising starts and the answer is logged', s.demo['demo-advertising'] === true && s.log.includes('gpc_conflict_allow'));
    await d.locator('[data-pc-action="gpcKeepOff"]').click();
    s = await read(page);
    check('"Keep it off": advertising stops again', s.demo['demo-advertising'] === false && !hasCookie(s, '_demo_ads'));
    await ctx.close();
  }

  // ------------------------------------------------------------------ S10
  console.log('\nScenario 4: a browser that blocks cookies');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      Object.defineProperty(document, 'cookie', { get: () => '', set: () => {}, configurable: true });
    });
    const page = await ctx.newPage();
    watch(page, 'S4');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-privacy-banner] [data-pc-action="acceptAll"]').click();
    const s = await read(page);
    check('blocked storage: no optional tool starts even after Accept all', !s.demo['demo-analytics'] && !s.demo['demo-advertising']);
    await openPanel(page);
    check('blocked storage: the visitor is told', /could not save your choice/i.test(await dlg(page).locator('[data-pc-storage-blocked]').innerText()));
    await shot(page, '07-panel-storage-blocked.png');
    await ctx.close();
  }

  // ------------------------------------------------------------------ S11
  console.log('\nScenario 5: the Your Privacy Choices page and the request form');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'S5');
    await page.goto(`${BASE}/your-privacy-choices`, { waitUntil: 'networkidle' });
    check('page: the preference center is on the page', (await page.locator('[data-privacy-center][data-variant="page"]').count()) === 1);
    await page.locator('footer a[data-privacy-open]').first().click();
    check('page: the footer link does not stack a panel on top of the page', !(await dlg(page).evaluate((el) => el.open)));
    await page.locator('[data-variant="page"] [data-pc-toggle="analytics"]').check();
    const s = await read(page);
    check('page: a switch on the page works the same way', s.demo['demo-analytics'] === true);
    await shot(page, '02-privacy-choices-page.png', { fullPage: true });

    await page.locator('[data-pc-form] button[type="submit"]').click();
    check('form: empty submit shows what is missing', (await page.locator('[data-pc-form] [data-err="email"]:not([hidden])').count()) === 1);
    await page.locator('input[name="types"][value="delete"]').check();
    await page.locator('#pr-name').fill('Pat Example');
    await page.locator('#pr-email').fill('pat@example.com');
    await page.locator('[data-pc-form] button[type="submit"]').click();
    const result = page.locator('[data-pc-form-result]');
    await result.waitFor({ state: 'visible', timeout: 5000 });
    check('form: while the server function is not deployed it offers a ready email instead', (await result.locator('a[href^="mailto:"]').count()) === 1);
    await shot(page, '08-request-form-fallback.png', { fullPage: false });

    // Honeypot: a filled hidden field is rejected without any message to the bot.
    await page.evaluate(() => {
      document.querySelector('input[name="homepage_url"]').value = 'bot';
    });
    await page.locator('[data-pc-form] button[type="submit"]').click();
    check('form: a filled spam-trap field sends nothing but still offers the email route', (await result.locator('a[href^="mailto:"]').count()) === 1);
    await ctx.close();
  }

  // ------------------------------------------------------------------ S12
  console.log('\nScenario 6: the real footer and mobile layout');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'S6');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-privacy-banner] [data-pc-action="rejectAll"]').click();
    const legalLinks = await page.locator('footer .footer__legal a').allInnerTexts();
    check('footer: legal row has the seven required links', legalLinks.length === 7 && legalLinks.some((t) => /Consumer Health Data/.test(t)) && legalLinks.some((t) => /Your Privacy Choices/.test(t)), legalLinks.join(' | '));
    const footerText = await page.locator('footer').innerText();
    check('footer: no "HIPAA Compliant" badge and no "50 States" claim', !/HIPAA\s*Compliant/i.test(footerText) && !/all 50 states/i.test(footerText));
    check('footer: has the compounded-medication statement', /not FDA-approved/.test(footerText));
    await shot(page, '09-footer-desktop.png', { fullPage: false, clip: undefined });
    if (SHOTS) await page.locator('footer').screenshot({ path: join(SHOTS, '09-footer-desktop.png') });
    await page.locator('footer a[data-privacy-open]').first().click();
    check('footer: Your Privacy Choices opens the panel', await dlg(page).evaluate((el) => el.open));
    await ctx.close();

    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const mpage = await mctx.newPage();
    watch(mpage, 'S6m');
    await mpage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await mpage.locator('[data-privacy-banner] [data-pc-action="rejectAll"]').click();
    const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check('mobile: no sideways scrolling in the footer', !overflow);
    if (SHOTS) await mpage.locator('footer').screenshot({ path: join(SHOTS, '10-footer-mobile.png') });
    await mctx.close();

    const ictx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const ipage = await ictx.newPage();
    watch(ipage, 'S6i');
    await ipage.goto(`${BASE}/dev-mockups/privacy`, { waitUntil: 'networkidle' });
    await ipage.locator('[data-variant="page"] [data-pc-toggle="analytics"]').check();
    await ipage.locator('[data-variant="page"] [data-pc-toggle="advertising"]').check();
    await shot(ipage, '11-live-inspector.png', { fullPage: true });
    await ictx.close();
  }

  console.log('\nScenario 7: no script errors anywhere');
  check('no script or console errors on any page visited', errorsByPage.length === 0, errorsByPage.slice(0, 3).join(' || '));

  await browser.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
