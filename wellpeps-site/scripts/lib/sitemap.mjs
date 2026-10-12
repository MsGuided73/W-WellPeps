/**
 * sitemap.xml, written after every build from the pages actually built (dist/). A page is listed only when
 * a search engine should index it: no `noindex`, not a redirect stub, and its canonical (if any) is its own
 * address. So a draft page, a gated page or a redirect can never leak into the sitemap, and a new page is
 * listed the moment it exists. Wired into astro.config.mjs; checked by scripts/seo-check.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** dist-relative "weight-loss/index.html" -> "https://wellpeps.com/weight-loss/" */
export function pageUrlFor(relFile, site) {
  const rel = relFile.split(path.sep).join('/');
  const dir = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '');
  return new URL(`/${dir}`, site).href;
}

export const hasNoindex = (html) => /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
export const isRedirectStub = (html) => /<meta\s+http-equiv=["']refresh["']/i.test(html);
export function canonicalOf(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : undefined;
}

/** Whether a built page belongs in the sitemap, given its own URL. */
export function belongsInSitemap(html, url) {
  if (hasNoindex(html) || isRedirectStub(html)) return false;
  const canonical = canonicalOf(html);
  return canonical === undefined || canonical === url;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

/** Every URL the sitemap should list, sorted (home first). */
export function collectSitemapUrls(distDir, site) {
  const urls = [];
  for (const file of walk(distDir)) {
    const url = pageUrlFor(path.relative(distDir, file), site);
    if (belongsInSitemap(fs.readFileSync(file, 'utf8'), url)) urls.push(url);
  }
  return urls.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
}

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSitemap(urls) {
  const rows = urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

/** Astro integration: writes dist/sitemap.xml once the pages are built. */
export function sitemapIntegration() {
  let site;
  return {
    name: 'wellpeps-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => { site = config.site; },
      'astro:build:done': ({ dir, logger }) => {
        if (!site) throw new Error('sitemap: astro.config.mjs must set `site`');
        const distDir = fileURLToPath(dir);
        const urls = collectSitemapUrls(distDir, site);
        fs.writeFileSync(path.join(distDir, 'sitemap.xml'), renderSitemap(urls));
        logger.info(`sitemap.xml: ${urls.length} pages`);
      },
    },
  };
}
