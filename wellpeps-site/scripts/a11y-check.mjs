/**
 * Accessibility audit, WCAG 2.2 AA (compliance build list W13).
 *
 *   node scripts/a11y-check.mjs [baseUrl] [--json]
 *
 * Needs `npm run dev` (or BASE_URL). Runs axe-core on every page at desktop and phone width, and
 * again with each interactive piece open (privacy panel, assistant, guide dialog, checkout lock,
 * phone menu), then a few checks axe cannot make: the skip link, keyboard focus being visible, a
 * dialog holding focus and returning it, and reduced motion being respected. Exit code 1 if any
 * violation is found. Dev-only elements (Astro's toolbar, the Tweak panel) are left out.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv.find((a) => a.startsWith('http')) || process.env.BASE_URL || 'http://localhost:4321';
const asJson = process.argv.includes('--json');
const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every built page (run `npm run build` first for the full list); a short fallback otherwise.
function pagePaths() {
  const dist = join(SITE, 'dist');
  if (!existsSync(dist)) return ['/', '/weight-loss', '/hair-restoration', '/sexual-wellness', '/healthy-aging', '/why-wellpeps', '/your-plan', '/your-privacy-choices', '/wellness-learning-center'];
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n === 'index.html') out.push('/' + relative(dist, dirname(p)).split('\\').join('/'));
    }
  };
  walk(dist);
  return out
    .map((p) => (p === '/.' || p === '/' ? '/' : p))
    .filter((p) => !/^\/(preview-access|membership|peptides|mental-wellness)/.test(p)) // redirect stubs and the gate page
    .sort();
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const results = []; // { where, id, impact, help, nodes: [{target, summary}] }
const notes = [];
let customFails = 0;
const custom = (name, ok, detail = '') => {
  if (!asJson || !ok) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) customFails++;
};

async function axe(page, where) {
  const r = await new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude('astro-dev-toolbar')
    .exclude('wp-tweak-panel')
    .analyze();
  for (const v of r.violations) {
    results.push({ where, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 160) })) });
  }
}

const browser = await chromium.launch();
// axe's Playwright adapter needs pages made from a browser context.
const newPage = async (opts) => (await browser.newContext(opts)).newPage();
const paths = pagePaths();

// ---------------------------------------------------------------- 1. every page, two widths
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await newPage({ viewport: vp });
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Let the scroll-reveal animations finish so contrast is judged on the settled page.
    await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
    await axe(page, `${p} (${label})`);
  }
  await page.close();
}

// ---------------------------------------------------------------- 2. interactive pieces, opened
{
  const page = await newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });

  // privacy panel
  await page.locator('footer a[data-privacy-open]').first().click();
  await page.locator('dialog[data-privacy-dialog][open]').waitFor();
  await axe(page, 'privacy panel (open)');
  await page.keyboard.press('Escape');

  // assistant
  await page.locator('[data-wa-toggle]').click();
  await axe(page, 'assistant (open)');
  await page.locator('[data-wa-close]').click();

  // guide dialog
  await page.locator('[data-ebook-open]').first().click();
  await page.locator('dialog[data-ebook-dialog][open]').waitFor();
  await axe(page, 'guide dialog (open)');
  await page.keyboard.press('Escape');

  // checkout lock dialog (the assessment button opens the password box while the lock is on)
  const lock = page.locator('a[data-checkout-lock]').first();
  if (await lock.count()) {
    await lock.click();
    await page.locator('dialog[data-checkout-dialog][open]').waitFor().catch(() => {});
    await axe(page, 'checkout lock dialog (open)');
    await page.keyboard.press('Escape');
  }
  await page.close();

  const mobile = await newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE + '/', { waitUntil: 'load' });
  await mobile.locator('[data-nav-toggle]').click();
  await axe(mobile, 'phone menu (open)');
  await mobile.close();
}

// ---------------------------------------------------------------- 3. what axe cannot check
{
  const page = await newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {});
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });

  // skip link: the first Tab stop, visible when focused, and it moves focus into the page content
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => {
    const a = document.activeElement;
    const r = a?.getBoundingClientRect();
    return { text: a?.textContent?.trim(), href: a?.getAttribute('href'), visible: !!r && r.width > 1 && r.height > 1 && r.top >= 0 && r.top < 200 };
  });
  custom('the first Tab stop is a visible "Skip to content" link', /skip/i.test(skip.text || '') && skip.visible, JSON.stringify(skip));
  await page.keyboard.press('Enter');
  const landed = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  custom('the skip link moves focus to the main content', landed === 'main' || landed === 'MAIN' || (await page.evaluate(() => !!document.activeElement?.closest('main'))), String(landed));

  // every control reached by keyboard shows a focus indicator
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  const unfocusable = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1;
      const shadow = cs.boxShadow && cs.boxShadow !== 'none';
      const border = false;
      const before = getComputedStyle(el, '::after');
      return { tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), indicator: outline || !!shadow || border, text: (el.textContent || '').trim().slice(0, 30) };
    });
    if (f && !f.indicator) unfocusable.push(`${f.tag} "${f.text}"`);
  }
  custom('the first 40 keyboard stops each show a focus indicator', unfocusable.length === 0, [...new Set(unfocusable)].slice(0, 6).join(' | '));

  // a dialog traps focus, closes on Escape and hands focus back
  const opener = page.locator('footer a[data-privacy-open]').first();
  await opener.focus();
  await page.keyboard.press('Enter');
  await page.locator('dialog[data-privacy-dialog][open]').waitFor();
  let inside = true;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    inside = inside && (await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')));
  }
  custom('the privacy panel keeps keyboard focus inside while it is open', inside);
  await page.keyboard.press('Escape');
  const closed = await page.locator('dialog[data-privacy-dialog][open]').count();
  const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-privacy-open'));
  custom('Escape closes the privacy panel and returns focus to the link that opened it', closed === 0 && back === true, `open=${closed} focusBack=${back}`);

  // reduced motion
  const rm = await newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await rm.goto(BASE + '/', { waitUntil: 'load' });
  const motion = await rm.evaluate(() => {
    const anims = document.getAnimations().filter((a) => a.playState === 'running' && !(a.effect?.target?.closest?.('astro-dev-toolbar')));
    const reveal = document.querySelector('.reveal');
    const t = reveal ? getComputedStyle(reveal).transitionDuration : '0s';
    return { running: anims.length, revealTransition: t, smooth: getComputedStyle(document.documentElement).scrollBehavior };
  });
  custom('with "reduce motion" on, nothing keeps animating and scrolling is not smooth', motion.running === 0 && motion.smooth !== 'smooth', JSON.stringify(motion));
  await rm.close();

  // page language and zoom
  const lang = await page.evaluate(() => document.documentElement.lang);
  custom('the page declares its language', lang === 'en', lang);
  await page.close();
}

await browser.close();

// ---------------------------------------------------------------- report
const byRule = new Map();
for (const r of results) {
  const k = r.id;
  if (!byRule.has(k)) byRule.set(k, { id: k, impact: r.impact, help: r.help, where: new Map() });
  const e = byRule.get(k);
  e.where.set(r.where, r.nodes);
}
if (asJson) {
  console.log(JSON.stringify([...byRule.values()].map((e) => ({ id: e.id, impact: e.impact, help: e.help, pages: e.where.size, sample: [...e.where.entries()].slice(0, 3).map(([w, n]) => ({ w, n: n.slice(0, 3) })) })), null, 1));
} else {
  console.log(`\nChecked ${paths.length} pages at two widths, plus ${5} open states.`);
  if (byRule.size === 0) console.log('axe: no violations');
  for (const e of [...byRule.values()].sort((a, b) => ['critical', 'serious', 'moderate', 'minor'].indexOf(a.impact) - ['critical', 'serious', 'moderate', 'minor'].indexOf(b.impact))) {
    console.log(`\nFAIL  [${e.impact}] ${e.id}: ${e.help}  (${e.where.size} page/state${e.where.size === 1 ? '' : 's'})`);
    for (const [w, nodes] of [...e.where.entries()].slice(0, 3)) {
      console.log(`      ${w}`);
      for (const n of nodes.slice(0, 2)) console.log(`         ${n.target}  ${n.summary}`);
    }
  }
}
const violations = byRule.size;
console.log(violations || customFails ? `\n${violations} axe rule(s) failing, ${customFails} custom check(s) failing` : '\nAll passed');
process.exit(violations || customFails ? 1 : 0);
