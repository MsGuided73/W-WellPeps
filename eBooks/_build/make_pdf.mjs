// Print the self-paginating HTML books to PDF with Chromium.
// Usage: node make_pdf.mjs html/nad.html out/nad.pdf [more pairs...]
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.resolve('../../wellpeps-site/package.json'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
for (let i = 0; i < args.length; i += 2) {
  const html = path.resolve(args[i]);
  const pdf = path.resolve(args[i + 1]);
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__paginated === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => window.__overflow);
  const count = await page.evaluate(() => document.querySelectorAll('.page').length);
  await page.pdf({ path: pdf, width: '8.5in', height: '11in', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  console.log(`${path.basename(pdf)}: ${count} pages${overflow.length ? '  OVERFLOW: ' + overflow.join(' | ') : ''}`);
}
await browser.close();
