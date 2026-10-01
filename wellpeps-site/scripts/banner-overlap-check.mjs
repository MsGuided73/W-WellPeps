/**
 * Does the first-visit privacy banner cover anything on the first screen?
 *
 * Opens the home page in a fresh browser at several window sizes (the dev server shows the banner
 * because it loads demo tools) and checks:
 *   1. the banner is part of the page flow (not fixed or floating),
 *   2. it spans the page width and sits at the very top (above the menu),
 *   3. no visible link, button, heading, paragraph or image on the first screen is covered by it,
 *   4. the page does not scroll sideways because of it,
 *   5. after the visitor clicks Reject all, it is gone and the hero is back where it was.
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
  console.log(`\n${w}x${h}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const banner = page.locator('[data-privacy-banner]');
  await banner.waitFor({ state: 'visible', timeout: 5000 });

  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-privacy-banner]');
    const r = el.getBoundingClientRect();
    const nav = document.querySelector('[data-nav]').getBoundingClientRect();
    const h1 = document.querySelector('h1').getBoundingClientRect();
    const covered = [];
    for (const node of document.querySelectorAll('h1, h2, p, a, button, img, [role="button"]')) {
      if (node.closest('[data-privacy-banner]') || node.closest('dialog')) continue;
      const n = node.getBoundingClientRect();
      if (n.width === 0 || n.height === 0) continue;
      // Skip anything not really visible (closed mobile menu, hidden parents, zero opacity).
      if (!node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      if (n.left < r.right && n.right > r.left && n.top < r.bottom && n.bottom > r.top) {
        covered.push((node.innerText || node.getAttribute('alt') || node.tagName).trim().replace(/\s+/g, ' ').slice(0, 40));
      }
    }
    return {
      position: getComputedStyle(el).position,
      width: Math.round(r.width),
      top: Math.round(r.top),
      height: Math.round(r.height),
      navTop: Math.round(nav.top),
      h1Top: Math.round(h1.top),
      covered,
      sideways: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  check('banner is part of the page flow', m.position === 'static' || m.position === 'relative', m.position);
  check('banner spans the page width', m.width >= w - 17, `${m.width}px of ${w}px`);
  check('banner is at the very top, above the menu', m.top === 0 && m.navTop >= m.height - 1, `banner ${m.top}-${m.top + m.height}, menu starts ${m.navTop}`);
  check('banner covers nothing on the first screen', m.covered.length === 0, m.covered.join(' | '));
  // The site header already scrolls sideways at some widths (see docs/COMPLIANCE-BUILD-TASKS.md). The
  // banner must not make it worse: compare with the banner switched off.
  const baseline = await page.evaluate(() => {
    const el = document.querySelector('[data-privacy-banner]');
    el.hidden = true;
    const sw = document.documentElement.scrollWidth;
    el.hidden = false;
    return sw;
  });
  const now = await page.evaluate(() => document.documentElement.scrollWidth);
  check('the banner adds no sideways scrolling', now <= baseline, `page width ${now}px vs ${baseline}px without it`);
  if (m.sideways) console.log('        note: the page already scrolls sideways at this width without the banner (header buttons overflow)');
  console.log(`        banner height ${m.height}px; hero headline starts at y=${m.h1Top}`);

  await page.screenshot({ path: `scripts/.banner-${w}x${h}.png` });

  await page.locator('[data-privacy-banner] [data-pc-action="rejectAll"]').click();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({
    hidden: document.querySelector('[data-privacy-banner]').hidden,
    h1Top: Math.round(document.querySelector('h1').getBoundingClientRect().top),
    focus: document.activeElement?.id || document.activeElement?.tagName,
  }));
  check('after Reject all the banner is gone', after.hidden === true);
  check('the hero moves back up to where it normally sits', after.h1Top === m.h1Top - m.height, `headline y ${m.h1Top} -> ${after.h1Top}`);
  check('keyboard focus lands on the page content, not on nothing', after.focus === 'main', String(after.focus));
  await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\nPASS: the banner covers nothing at any size.' : `\n${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
