// Checks that the page never scrolls sideways and that the header's items stay
// inside it, at every window width from phone to wide desktop.
//
//   npm run dev            (in another terminal)
//   node scripts/header-overflow-check.mjs [baseUrl]
//
// Exit code 1 if any width fails. Pass --probe to print what overflows.
import { chromium } from 'playwright';

const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4321';
const probe = process.argv.includes('--probe');
const SCROLLBAR = 15;
const PATHS = ['/', '/weight-loss'];
const WIDTHS = [];
for (let w = 320; w <= 1000; w += 20) WIDTHS.push(w);
for (let w = 1000; w <= 1700; w += 10) WIDTHS.push(w);
WIDTHS.push(1920, 2560);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Everything visible inside the header whose right edge passes the window.
const measure = () => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement;
  const visible = (el) => el.checkVisibility && el.checkVisibility({ checkVisibilityCSS: true });
  const header = document.querySelector('[data-nav]');
  const out = [];
  if (header) {
    for (const el of header.querySelectorAll('*')) {
      if (!visible(el)) continue;
      // The mobile drawer is parked off-screen on purpose.
      if (el.closest('[data-nav-menu]') && getComputedStyle(el.closest('[data-nav-menu]')).position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 24)}" left=${Math.round(r.left)} right=${Math.round(r.right)}`);
      }
    }
  }
  // A nav link or button that wraps onto a second line is also a failure: the
  // bar should switch to the menu before that happens.
  const wrapped = [];
  for (const el of document.querySelectorAll('.nav__links > a, .nav__cta-btn')) {
    if (!visible(el)) continue;
    const menu = el.closest('[data-nav-menu]');
    if (menu && getComputedStyle(menu).position === 'fixed') continue;
    if (el.getBoundingClientRect().height > 56) wrapped.push(`${(el.textContent || '').trim()} h=${Math.round(el.getBoundingClientRect().height)}`);
  }
  // Room left in the row when it is laid out as a bar. A real window loses a
  // scrollbar's width (about 15px) that this headless browser does not, so a
  // bar with less than that spare would overflow for a real visitor.
  let spare = null;
  const brandEl = document.querySelector('.brand');
  const linksEl = document.querySelector('.nav__links');
  const ctaEl = document.querySelector('.nav__cta');
  // Only while the links sit in the bar; in menu mode they live in the fixed drawer (the portal
  // icon stays in the bar, so .nav__cta is visible at every width).
  if (brandEl && linksEl && ctaEl && visible(ctaEl) && getComputedStyle(linksEl).position !== 'fixed') {
    const gap = parseFloat(getComputedStyle(document.querySelector('.nav__inner')).columnGap) || 0;
    const b = brandEl.getBoundingClientRect();
    const l = linksEl.getBoundingClientRect();
    const c = ctaEl.getBoundingClientRect();
    spare = Math.round(l.left - b.right - gap + (c.left - l.right - gap));
  }
  const inner = document.querySelector('.nav__inner');
  // Once the row hits its own maximum width the window can no longer squeeze
  // it, so a scrollbar is not a risk; it still needs some air.
  const capped = inner ? inner.getBoundingClientRect().width >= parseFloat(getComputedStyle(inner).maxWidth) - 1 : false;
  return {
    spare,
    capped,
    wrapped,
    vw,
    scrollWidth: doc.scrollWidth,
    sideways: doc.scrollWidth > vw,
    navInnerOverflow: inner ? inner.scrollWidth - inner.clientWidth : 0,
    spill: out,
  };
};

let failures = 0;
for (const path of PATHS) {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(40);
    const m = await page.evaluate(measure);
    const tight = m.spare !== null && m.spare < (m.capped ? 10 : SCROLLBAR);
    const bad = m.sideways || m.spill.length > 0 || m.navInnerOverflow > 1 || m.wrapped.length > 0 || tight;
    if (bad) {
      failures++;
      console.log(`FAIL ${path} @${width}px  scrollWidth=${m.scrollWidth} viewport=${m.vw} navInnerOverflow=${m.navInnerOverflow} spare=${m.spare}${m.wrapped.length ? ' wrapped=' + m.wrapped.join('|') : ''}`);
      if (probe) for (const s of m.spill) console.log('      ' + s);
    }
  }
}

await browser.close();
if (failures) {
  console.log(`\n${failures} failing width(s)`);
  process.exit(1);
}
console.log(`OK: no sideways scroll and no header spill at ${WIDTHS.length} widths on ${PATHS.length} pages`);
