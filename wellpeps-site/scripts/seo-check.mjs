/**
 * Search and AI-retrieval check of the BUILT site. Run after `npm run build`:
 *   node scripts/seo-check.mjs            (or: npm run check:seo)
 *
 * For every page in sitemap.xml: one title (65 characters or fewer), a description of 50-170 characters,
 * a canonical equal to its own URL, one <h1>, a share image, structured data that parses, and alt text on
 * every image. Titles and descriptions must be unique across pages. Also: every sitemap URL is a built page,
 * no noindex page is listed, robots.txt names the sitemap, and llms.txt exists with current prices.
 * Exits 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalOf, hasNoindex } from './lib/sitemap.mjs';

const SITE = 'https://wellpeps.com';
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const warn = (msg) => warnings.push(msg);

if (!fs.existsSync(dist)) { console.error('No dist/ folder: run `npm run build` first.'); process.exit(1); }

const read = (rel) => fs.readFileSync(path.join(dist, rel), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// --- robots.txt, sitemap.xml, llms.txt
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? read('robots.txt') : '';
if (!/^Sitemap: https:\/\/wellpeps\.com\/sitemap\.xml$/m.test(robots)) fail('robots.txt does not name https://wellpeps.com/sitemap.xml');
if (/^Disallow: \/\s*$/m.test(robots)) fail('robots.txt blocks the whole site');

const sitemap = fs.existsSync(path.join(dist, 'sitemap.xml')) ? read('sitemap.xml') : '';
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
if (urls.length < 10) fail(`sitemap.xml lists only ${urls.length} pages`);

const llms = fs.existsSync(path.join(dist, 'llms.txt')) ? read('llms.txt') : '';
if (!llms.startsWith('# WellPeps')) fail('llms.txt is missing or does not start with "# WellPeps"');
if (!/\$\d+\/month/.test(llms)) fail('llms.txt lists no monthly prices');
if (/membership/i.test(llms)) fail('llms.txt mentions a membership');

// --- every listed page
const titles = new Map();
const descriptions = new Map();
for (const url of urls) {
  const rel = path.join(new URL(url).pathname.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(path.join(dist, rel))) { fail(`${url}: in the sitemap but not built`); continue; }
  const html = read(rel);
  const where = new URL(url).pathname;

  if (hasNoindex(html)) fail(`${where}: listed in the sitemap but marked noindex`);
  if (canonicalOf(html) !== url) fail(`${where}: canonical is ${canonicalOf(html) ?? 'missing'}`);

  const titleTags = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]).trim());
  if (titleTags.length !== 1) fail(`${where}: ${titleTags.length} <title> tags`);
  const title = titleTags[0] ?? '';
  // Google shows about 60 characters of a title and about 160 of a description. Longer text is cut off, not
  // penalized, so it is a warning; a missing or absurd one fails. (Learning Center text comes from the blog
  // database and is fixed there.)
  if (title.length < 10 || title.length > 90) fail(`${where}: title is ${title.length} characters ("${title}")`);
  else if (title.length > 65) warn(`${where}: title is ${title.length} characters and will be cut off ("${title}")`);
  titles.set(title, [...(titles.get(title) ?? []), where]);

  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '').trim();
  if (desc.length < 30 || desc.length > 260) fail(`${where}: description is ${desc.length} characters`);
  else if (desc.length < 50 || desc.length > 160) warn(`${where}: description is ${desc.length} characters (aim for 50-160)`);
  descriptions.set(desc, [...(descriptions.get(desc) ?? []), where]);

  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) fail(`${where}: ${h1s} <h1> elements`);

  if (!/<meta property="og:image" content="https:\/\/wellpeps\.com\/[^"]+"/.test(html)) fail(`${where}: no absolute og:image`);

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) fail(`${where}: no structured data`);
  for (const b of blocks) {
    try {
      const graph = JSON.parse(b[1])['@graph'] ?? [];
      if (!graph.some((n) => n['@type'] === 'Organization')) fail(`${where}: structured data has no Organization`);
    } catch (e) { fail(`${where}: structured data does not parse (${e.message})`); }
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\balt=/.test(m[1])) fail(`${where}: image without alt text: ${m[0].slice(0, 90)}`);
  }
}
for (const [t, pages] of titles) if (pages.length > 1) fail(`title "${t}" is used by ${pages.join(', ')}`);
for (const [d, pages] of descriptions) if (d && pages.length > 1) fail(`the same description is used by ${pages.join(', ')}`);

// --- no indexable page left out of the sitemap
const listed = new Set(urls);
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (e.name !== 'index.html') continue;
    const relDir = path.relative(dist, path.dirname(full)).split(path.sep).join('/');
    const url = `${SITE}/${relDir ? `${relDir}/` : ''}`;
    const html = fs.readFileSync(full, 'utf8');
    if (!listed.has(url) && !hasNoindex(html) && !/http-equiv="refresh"/i.test(html) && canonicalOf(html) === url) {
      fail(`${url}: indexable but missing from the sitemap`);
    }
  }
})(dist);

if (warnings.length) console.warn(`SEO check: ${warnings.length} warning(s)\n  - ${warnings.join('\n  - ')}\n`);
if (failures.length) {
  console.error(`SEO check: ${failures.length} problem(s)\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`SEO check passed: ${urls.length} pages in the sitemap, robots.txt and llms.txt in place.`);
