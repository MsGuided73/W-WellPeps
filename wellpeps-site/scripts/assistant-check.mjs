/**
 * The assistant discloses that it is automated. Needs `npm run dev` (draft pages on, so the
 * disclosure link is shown) or a build via BASE_URL.   node scripts/assistant-check.mjs [baseUrl] [--nolink]
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4321';
const expectLink = !process.argv.includes('--nolink');
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!ok) fails++; };

const browser = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: '.pbanner{display:none!important} astro-dev-toolbar{display:none!important}' });
  await page.locator('[data-wa-toggle]').click();
  const msgs = await page.locator('[data-wa-log] .wa__msg').allInnerTexts();
  check(`${label}: first message is the disclosure`, /automated assistant, not a person or a clinician/i.test(msgs[0] || ''), (msgs[0] || '').slice(0, 60));
  check(`${label}: it says medical questions go to the clinician and to call 911`, /patient portal/i.test(msgs[0]) && /911/.test(msgs[0]));
  check(`${label}: it says messages stay in the browser`, /stay in your browser/i.test(msgs[0]));
  const status = await page.locator('.wa__status').innerText();
  check(`${label}: the header says it is an automated assistant`, /automated assistant/i.test(status), status);
  const note = await page.locator('.wa__disclaimer').innerText();
  check(`${label}: a notice stays visible under the input`, /automated assistant/i.test(note) && /911/.test(note), note.replace(/\n/g, ' '));
  const hasLink = (await page.locator('.wa__panel a[href="/ai-use-disclosure"]').count()) > 0;
  check(`${label}: AI Use Disclosure link ${expectLink ? 'present' : 'absent (page not built)'}`, hasLink === expectLink);
  if (expectLink) {
    const res = await page.request.get(BASE + '/ai-use-disclosure');
    check(`${label}: the link loads`, res.status() === 200);
  }
  await page.locator('[data-wa-input]').fill('How much does it cost?');
  await page.locator('[data-wa-form] button[type=submit]').click();
  await page.waitForSelector('.wa__msg--bot:nth-of-type(4)', { timeout: 8000 }).catch(() => {});
  const after = await page.locator('[data-wa-log] .wa__msg').count();
  check(`${label}: it still answers a question`, after >= 4, String(after));
  check(`${label}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  check(`${label}: no script errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}
await browser.close();
console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
