/**
 * The first-visit privacy choice: a centered pop-up on most pages, a slim bar on the privacy and legal
 * pages (owner, 2026-11-17; it was a bar above the menu everywhere before).
 *
 * Opens pages in a fresh browser at several window sizes (the dev server shows the choice because it
 * loads demo tools) and checks:
 *   1. on the home page it is a modal dialog, centered, with all three buttons fully on screen,
 *   2. the three buttons are the same size (no button is made easier to press than another),
 *   3. the page behind cannot scroll, keyboard focus starts inside it and Tab stays inside it,
 *   4. it adds no sideways scrolling,
 *   5. after Reject all it is gone, the page scrolls again and focus lands on the page content,
 *   6. on the Cookie Notice it is a bar in the page flow above the menu that covers nothing.
 *
 * Run: node scripts/banner-overlap-check.mjs [baseUrl]   (default http://localhost:4321)
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const SIZES = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 720 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fails += 1;
};

const browser = await chromium.launch();

for (const { w, h } of SIZES) {
  console.log(`\n${w}x${h}  home page (pop-up)`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const banner = page.locator('[data-privacy-banner]');
  await banner.waitFor({ state: 'visible', timeout: 5000 });

  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-privacy-banner]');
    const card = el.querySelector('[data-privacy-banner-card]').getBoundingClientRect();
    const buttons = [...el.querySelectorAll('.pc-btn')].map((b) => b.getBoundingClientRect());
    return {
      mode: el.dataset.privacyBannerMode,
      role: el.getAttribute('role'),
      modal: el.getAttribute('aria-modal'),
      position: getComputedStyle(el).position,
      centerOff: Math.round(Math.abs((card.left + card.right) / 2 - innerWidth / 2)),
      buttonsOnScreen: buttons.every((r) => r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth),
      buttonSizes: [...new Set(buttons.map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`))],
      locked: getComputedStyle(document.documentElement).overflow === 'hidden',
      focusInside: el.contains(document.activeElement),
      sideways: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  check('it is a modal dialog over the page', m.mode === 'modal' && m.role === 'dialog' && m.modal === 'true' && m.position === 'fixed', `${m.mode} ${m.role} ${m.position}`);
  check('it is centered', m.centerOff <= 2, `${m.centerOff}px off center`);
  check('all three buttons are fully on screen', m.buttonsOnScreen);
  check('the three buttons are the same size', m.buttonSizes.length === 1, m.buttonSizes.join(' / '));
  check('the page behind cannot scroll', m.locked);
  check('keyboard focus starts inside it', m.focusInside);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
  check('Tab stays inside it', await page.evaluate(() => document.querySelector('[data-privacy-banner]').contains(document.activeElement)));
  check('it adds no sideways scrolling', !m.sideways);

  await page.screenshot({ path: `scripts/.banner-${w}x${h}.png` });

  await page.locator('[data-privacy-banner] [data-pc-action="rejectAll"]').click();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({
    hidden: document.querySelector('[data-privacy-banner]').hidden,
    locked: getComputedStyle(document.documentElement).overflow === 'hidden',
    focus: document.activeElement?.id || document.activeElement?.tagName,
  }));
  check('after Reject all it is gone and the page scrolls again', after.hidden === true && !after.locked);
  check('keyboard focus lands on the page content, not on nothing', after.focus === 'main', String(after.focus));
  await ctx.close();

  // The Cookie Notice (where "Learn more" goes): a readable page with a slim bar, not a pop-up.
  console.log(`${w}x${h}  Cookie Notice (bar)`);
  const ctx2 = await browser.newContext({ viewport: { width: w, height: h } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/cookie-notice/`, { waitUntil: 'networkidle' });
  await p2.locator('[data-privacy-banner]').waitFor({ state: 'visible', timeout: 5000 });
  const bar = await p2.evaluate(() => {
    const el = document.querySelector('[data-privacy-banner]');
    const r = el.getBoundingClientRect();
    const nav = document.querySelector('[data-nav]').getBoundingClientRect();
    const covered = [];
    for (const node of document.querySelectorAll('h1, h2, p, a, button, img, [role="button"]')) {
      if (node.closest('[data-privacy-banner]') || node.closest('dialog')) continue;
      const n = node.getBoundingClientRect();
      if (n.width === 0 || n.height === 0) continue;
      if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      if (n.left < r.right && n.right > r.left && n.top < r.bottom && n.bottom > r.top) covered.push((node.innerText || node.tagName).trim().slice(0, 40));
    }
    return { mode: el.dataset.privacyBannerMode, position: getComputedStyle(el).position, top: Math.round(r.top), height: Math.round(r.height), navTop: Math.round(nav.top), covered, locked: getComputedStyle(document.documentElement).overflow === 'hidden' };
  });
  check('on the Cookie Notice it is a bar in the page flow', bar.mode === 'bar' && (bar.position === 'static' || bar.position === 'relative'), `${bar.mode} ${bar.position}`);
  check('the bar sits above the menu and covers nothing', bar.top === 0 && bar.navTop >= bar.height - 1 && bar.covered.length === 0, bar.covered.join(' | '));
  check('the Cookie Notice still scrolls', !bar.locked);
  await ctx2.close();
}

await browser.close();
console.log(fails === 0 ? '\nPASS: the privacy choice behaves at every size.' : `\n${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
