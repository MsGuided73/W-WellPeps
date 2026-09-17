// Report which pages the paginator had to tighten, compact or split. Usage: node page_fit.mjs html/book.html
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.resolve('../../wellpeps-site/package.json'));
const { chromium } = require('playwright');

const html = path.resolve(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__paginated === true, null, { timeout: 60000 });
const rows = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.page.section, .page.why')).map((pg) => {
    const flags = ['tight', 'compact', 'tighter', 'spacious'].filter((c) => pg.classList.contains(c));
    const cont = pg.querySelector('.head.cont') ? 'CONTINUED' : '';
    return `${pg.dataset.num}${cont ? ' ' + cont : ''}: ${flags.join('+') || 'default'}`;
  })
);
console.log(rows.join('\n'));
await browser.close();
