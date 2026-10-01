/**
 * Confirms the site serves its own fonts: every page requests no third-party host, and the
 * Inter and Lora faces actually load. Needs `npm run dev` (or BASE_URL for a built preview).
 *   node scripts/fonts-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('http')) || process.env.BASE_URL || 'http://localhost:4321';
const PAGES = ['/', '/weight-loss', '/hair-restoration', '/wellness-learning-center', '/your-privacy-choices', '/preview-access/'];
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fails++;
};

const browser = await chromium.launch();
const ownHost = new URL(BASE).host;
for (const path of PAGES) {
  const page = await browser.newPage();
  const hosts = new Set();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http')) hosts.add(u.host);
  });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.style}`),
  );
  const outside = [...hosts].filter((h) => h !== ownHost && !/supabase\.co$/.test(h));
  check(`${path}: no request to a font host`, ![...hosts].some((h) => /fonts\.(googleapis|gstatic)\.com/.test(h)), [...hosts].join(', '));
  check(`${path}: Inter loaded from this site`, loaded.some((l) => l.startsWith('Inter')), loaded.join(' | '));
  if (path !== '/preview-access/') check(`${path}: Lora loaded from this site`, loaded.some((l) => l.startsWith('Lora')));
  if (outside.length) console.log(`      (other hosts contacted: ${outside.join(', ')})`);
  await page.close();
}
await browser.close();
console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
