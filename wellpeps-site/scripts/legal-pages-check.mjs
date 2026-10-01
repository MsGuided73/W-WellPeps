/**
 * Loads every draft legal page and checks it renders properly: status 200, one h1, the draft
 * box, noindex, a real amount of text, no script errors and no sideways scroll at phone and
 * desktop widths. Needs `npm run dev` (draft pages always exist there) or BASE_URL for a build
 * made with SHOW_DRAFT_PAGES=true.
 *   node scripts/legal-pages-check.mjs [baseUrl] [--shots=<dir>]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.argv.find((a) => a.startsWith('http')) || process.env.BASE_URL || 'http://localhost:4321';
const shots = (process.argv.find((a) => a.startsWith('--shots=')) || '').slice(8);

// The registry's paths, read from the source so this list can never drift from it.
const reg = readFileSync(resolve(import.meta.dirname, '../src/lib/legal-docs.ts'), 'utf8');
const paths = [...reg.matchAll(/path: '([^']+)'/g)].map((m) => '/' + m[1]);

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

const browser = await chromium.launch();
const errors = [];
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|Error while running audit/.test(m.text()) && errors.push(m.text()));
  for (const p of paths) {
    const res = await page.goto(BASE + p, { waitUntil: 'load' });
    const tag = `${p} @${width}`;
    check(`${tag}: loads`, res && res.status() === 200, String(res && res.status()));
    const m = await page.evaluate(() => ({
      h1s: document.querySelectorAll('h1').length,
      noindex: document.querySelector('meta[name=robots]')?.content,
      banner: !!document.querySelector('.ld-banner'),
      words: (document.querySelector('.ld__body')?.innerText || '').split(/\s+/).length,
      sw: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth,
      empty: [...document.querySelectorAll('.ld-doc h2, .ld-doc h3')].filter((h) => !h.textContent.trim()).length,
    }));
    check(`${tag}: one h1`, m.h1s === 1, String(m.h1s));
    check(`${tag}: hidden from search engines`, /noindex/.test(m.noindex || ''), m.noindex);
    // The patient-information index is a plain hub; every other page carries the draft box.
    check(`${tag}: draft box present`, m.banner || p === '/patient-information');
    check(`${tag}: has real content`, m.words > 80, String(m.words));
    check(`${tag}: no sideways scroll`, m.sw <= m.vw, `${m.sw} > ${m.vw}`);
    check(`${tag}: no empty headings`, m.empty === 0);
  }
  if (shots && width === 1440) {
    for (const p of ['/legal-review', '/safety/glp-1', '/states-we-serve']) {
      await page.goto(BASE + p, { waitUntil: 'load' });
      await page.screenshot({ path: `${shots}/legal${p.replace(/\//g, '_')}.png`, clip: { x: 0, y: 0, width: 1440, height: 1100 } });
    }
  }
  await page.close();
}
check('no script errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(fails ? `\n${fails} failed` : `\nAll passed (${paths.length} pages, 2 widths)`);
process.exit(fails ? 1 : 0);
