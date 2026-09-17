// For a split section, report how much space the first page has left and how much the continuation needs. Usage: node measure_split.mjs html/book.html 05
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.resolve('../../wellpeps-site/package.json'));
const { chromium } = require('playwright');

const [html, num] = [path.resolve(process.argv[2]), process.argv[3]];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__paginated === true, null, { timeout: 60000 });
const out = await page.evaluate((num) => {
  const IN = 96;
  const pages = Array.from(document.querySelectorAll(`.page[data-num="${num}"]`));
  const first = pages[0], cont = pages[1];
  const wrap = first.querySelector('.bodywrap').getBoundingClientRect();
  const kids = Array.from(first.querySelectorAll('.content > *'));
  const lastBottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
  const free = (wrap.bottom - lastBottom) / IN;
  if (cont) { cont.classList.remove('spacious'); cont.classList.add('tight','compact','tighter'); }
  let need = 0;
  if (cont) {
    const els = [...cont.querySelectorAll('.content > *'), ...cont.querySelectorAll('.bottom > *')];
    need = els.reduce((a, e) => a + e.getBoundingClientRect().height, 0) / IN + (els.length) * 0.12;
  }
  const parts = cont ? [...cont.querySelectorAll('.content > *'), ...cont.querySelectorAll('.bottom > *')].map(e=>e.className+' '+(e.getBoundingClientRect().height/IN).toFixed(2)) : [];
  return { free: free.toFixed(2), need: need.toFixed(2), classes: first.className, parts };
}, num);
console.log(out);
await browser.close();
