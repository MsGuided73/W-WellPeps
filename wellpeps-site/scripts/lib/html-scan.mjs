/**
 * Static scan of the BUILT site (dist/) for anything the Content-Security-Policy
 * would block: inline scripts, <style> elements, inline event handlers,
 * javascript: URLs, frames/plugins, subresources from other hosts, and data:
 * URLs in CSS. Shared by src/lib/security-headers.test.ts (on small samples)
 * and scripts/security-headers-check.mjs (on the real build).
 *
 * Data blocks (<script type="application/json"> and "application/ld+json")
 * are not executable and are allowed. style="..." attributes are allowed:
 * the policy permits them through style-src-attr.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_SCRIPT_TYPES = new Set(['application/json', 'application/ld+json']);
const RESOURCE_LINK_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'prefetch', 'icon', 'shortcut', 'manifest', 'apple-touch-icon', 'preconnect', 'dns-prefetch']);
const FRAME_TAGS = new Set(['iframe', 'frame', 'frameset', 'object', 'embed', 'applet']);

const TAG_RE = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const isExternal = (url) => /^(?:https?:)?\/\//i.test(url.trim());

/** @param {string} attrText */
function parseAttrs(attrText) {
  const attrs = {};
  for (const m of attrText.matchAll(ATTR_RE)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/**
 * @param {string} html
 * @returns {string[]} problems (empty when the page is compatible with the CSP)
 */
export function scanHtml(html) {
  const problems = [];

  // Script elements: only data blocks and external files are allowed.
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = parseAttrs(m[1]);
    if (attrs.src !== undefined) {
      if (isExternal(attrs.src)) problems.push(`script loaded from another host: ${attrs.src}`);
      continue;
    }
    const type = (attrs.type ?? '').toLowerCase();
    if (DATA_SCRIPT_TYPES.has(type)) continue;
    problems.push(`inline script${type ? ` (type=${type})` : ''}: ${m[2].trim().slice(0, 60).replace(/\s+/g, ' ')}`);
  }
  for (const m of html.matchAll(/<style\b[^>]*>/gi)) problems.push(`inline <style> element: ${m[0]}`);

  // Look at tags only, not at script/style bodies.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '<script></script>').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  for (const m of markup.matchAll(TAG_RE)) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);

    for (const name of Object.keys(attrs)) {
      if (/^on[a-z]+$/.test(name)) problems.push(`inline event handler on <${tag}>: ${name}="${attrs[name].slice(0, 40)}"`);
    }
    for (const name of ['href', 'src', 'action', 'formaction', 'poster']) {
      if (attrs[name] !== undefined && /^\s*javascript:/i.test(attrs[name])) problems.push(`javascript: URL in <${tag} ${name}>`);
    }
    if (FRAME_TAGS.has(tag)) problems.push(`<${tag}> element (frames and plugins are blocked)`);

    if (tag === 'link' && attrs.href !== undefined) {
      const rels = (attrs.rel ?? '').toLowerCase().split(/\s+/);
      if (rels.some((r) => RESOURCE_LINK_RELS.has(r)) && isExternal(attrs.href)) {
        problems.push(`<link rel="${attrs.rel}"> loads from another host: ${attrs.href}`);
      }
    }
    if (['img', 'source', 'video', 'audio', 'track', 'input'].includes(tag)) {
      for (const name of ['src', 'poster']) {
        if (attrs[name] !== undefined && isExternal(attrs[name])) problems.push(`<${tag} ${name}> loads from another host: ${attrs[name]}`);
      }
      if (attrs.srcset !== undefined && attrs.srcset.split(',').some((c) => isExternal(c.trim().split(/\s+/)[0]))) {
        problems.push(`<${tag} srcset> loads from another host`);
      }
    }
    if (tag === 'form' && attrs.action !== undefined && isExternal(attrs.action)) {
      problems.push(`<form action> posts to another host: ${attrs.action}`);
    }
  }
  return problems;
}

/** CSS that would need img-src/font-src to allow data: or another host. */
export function scanCss(css) {
  const problems = [];
  for (const m of css.matchAll(/url\(\s*["']?(data:[^)"']{0,30}|https?:\/\/[^)"']+|\/\/[^)"']+)/gi)) {
    problems.push(`CSS url() the policy would block: ${m[1]}`);
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*["']?(https?:\/\/[^)"';]+)/gi)) {
    problems.push(`CSS @import from another host: ${m[1]}`);
  }
  return problems;
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

/**
 * @param {string} distDir
 * @returns {{ pages: number, problems: string[] }}
 */
export function scanDist(distDir) {
  const files = walk(distDir);
  const problems = [];
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const rel = path.relative(distDir, file).replace(/\\/g, '/');
    for (const p of scanHtml(fs.readFileSync(file, 'utf8'))) problems.push(`${rel}: ${p}`);
  }
  for (const file of files.filter((f) => f.endsWith('.css'))) {
    const rel = path.relative(distDir, file).replace(/\\/g, '/');
    for (const p of scanCss(fs.readFileSync(file, 'utf8'))) problems.push(`${rel}: ${p}`);
  }
  return { pages: htmlFiles.length, problems };
}

export { walk as walkFiles };
