/**
 * Checks the real footer in either mode.
 *   node scripts/footer-check.mjs drafts   [baseUrl]   dev, or a build made with SHOW_DRAFT_PAGES=true
 *   node scripts/footer-check.mjs nodrafts [baseUrl]   an ordinary build (draft pages not built)
 * In both modes: every internal footer link must load (a footer never shows a dead link),
 * and the removed claims stay removed. Default base URL is the dev server.
 */
import { chromium } from 'playwright';

const mode = process.argv[2] === 'nodrafts' ? 'nodrafts' : 'drafts';
const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4321';
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fails++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/', { waitUntil: 'load' });

const footerText = await page.locator('footer').innerText();
const links = await page.locator('footer a').evaluateAll((as) => as.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') || '' })));
const legal = await page.locator('footer .footer__legal a').allInnerTexts();
const headings = (await page.locator('footer h4').allInnerTexts()).map((h) => h.trim().toLowerCase());

check('no "HIPAA Compliant" badge', !/HIPAA\s*Compliant/i.test(footerText));
check('no "All 50 States" claim', !/all 50 states/i.test(footerText));
check('no 2025 copyright year', !/©\s*2025/.test(footerText));
check('compounded medications are stated as not FDA-approved', /not FDA-approved/.test(footerText));
check('newsletter has its error and success areas wired', (await page.locator('footer [data-newsletter-error]').count()) === 1 && (await page.locator('footer [data-newsletter-success]').count()) === 1);

if (mode === 'drafts') {
  check('legal row has the seven required links', legal.length === 7, legal.join(' | '));
  check('"Patient Information" column is present', headings.includes('patient information'), headings.join(' | '));
  check('the business address placeholder is shown (preview only)', /\[Business address\]/.test(footerText));
} else {
  check('legal row lists only pages that exist (five)', legal.length === 5 && legal.every((t) => !/Consumer Health|Cookie/.test(t)), legal.join(' | '));
  check('no "Patient Information" column when its pages are not built', !headings.includes('patient information'), headings.join(' | '));
  check('no placeholder address on the live site', !/\[Business address\]/.test(footerText));
  check('no link to a draft page', !links.some((l) => /^\/(legal-review|safety|cookie-notice|consumer-health|medical-disclaimer|patient-|telehealth|compounded|how-wellpeps|states-we|contact|refund|shipping|text-messaging|ai-use)/.test(l.href)), '');
}

// Every internal footer link must load.
const internal = [...new Set(links.map((l) => l.href).filter((h) => h.startsWith('/')).map((h) => h.split('#')[0] || '/'))];
for (const href of internal) {
  const res = await page.request.get(BASE + href);
  check(`link ${href} loads`, res.status() === 200, String(res.status()));
}

// Mobile: no sideways scroll caused by the footer.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/', { waitUntil: 'load' });
check('phone: footer adds no sideways scroll', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

await browser.close();
console.log(fails ? `\n${fails} failed` : `\nAll passed (${mode}, ${internal.length} internal links)`);
process.exit(fails ? 1 : 0);
