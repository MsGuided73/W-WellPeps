/**
 * Internal links end in "/" after every build. Pages are built as directories (dist/weight-loss/index.html),
 * so the canonical address is /weight-loss/ and nginx answers /weight-loss with a 301 to it. Links written
 * without the slash (nav, footer, data files, article HTML from Supabase) would send every click and every
 * crawler through that redirect. This rewrites href="/weight-loss" to href="/weight-loss/" in the built HTML,
 * only when dist/weight-loss/index.html exists, so files (/sitemap.xml, /images/...) and unknown paths are left
 * alone. Wired into astro.config.mjs before the sitemap; scripts/seo-check.mjs fails if one slips through.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// href="/path" or href="/path?query" or href="/path#hash", root-relative only (not "//host").
const INTERNAL_HREF = /\bhref="(\/(?!\/)[^"?#]*?)([?#][^"]*)?"/g;

/** Root-relative paths that lack a trailing slash but name a built page directory. */
export function slashlessPageLinks(html, isPageDir) {
  const found = [];
  for (const m of html.matchAll(INTERNAL_HREF)) {
    const p = m[1];
    if (p !== '/' && !p.endsWith('/') && isPageDir(p)) found.push(p);
  }
  return found;
}

/** The same HTML with each such link given its trailing slash; query strings and fragments are kept. */
export function addTrailingSlashes(html, isPageDir) {
  return html.replace(INTERNAL_HREF, (whole, p, rest = '') =>
    p === '/' || p.endsWith('/') || !isPageDir(p) ? whole : `href="${p}/${rest}"`);
}

/** "/weight-loss" -> true when dist/weight-loss/index.html exists. */
export function pageDirChecker(distDir) {
  const cache = new Map();
  return (p) => {
    if (!cache.has(p)) {
      let rel;
      try { rel = decodeURIComponent(p); } catch { rel = p; }
      cache.set(p, fs.existsSync(path.join(distDir, rel, 'index.html')));
    }
    return cache.get(p);
  };
}

export function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Astro integration: rewrites the built HTML in place once the pages are built. */
export function trailingSlashIntegration() {
  return {
    name: 'wellpeps-trailing-slash',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const isPageDir = pageDirChecker(distDir);
        let changed = 0;
        for (const file of htmlFiles(distDir)) {
          const html = fs.readFileSync(file, 'utf8');
          const next = addTrailingSlashes(html, isPageDir);
          if (next !== html) { fs.writeFileSync(file, next); changed += 1; }
        }
        logger.info(`internal links: trailing slash added in ${changed} pages`);
      },
    },
  };
}
