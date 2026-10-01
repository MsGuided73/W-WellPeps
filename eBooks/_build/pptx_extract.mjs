// Read the paginated eBook HTML in Chromium (print media, exactly as make_pdf.mjs prints it) and dump every drawable
// element per page as JSON for pptx_build.py: boxes (fills, gradients, borders, radii, shadows), images (with crop),
// inline SVG icons (rasterised to PNG) and text blocks (runs with font/size/weight/colour/tracking and the browser's
// own line breaks, so PowerPoint wraps exactly as the PDF does).
// Usage: node pptx_extract.mjs html/<book>.html out.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.resolve('../../wellpeps-site/package.json'));
const { chromium } = require('playwright');

const [html, out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ media: 'print' });
await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__paginated === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);

const data = await page.evaluate(async () => {
  const images = {}; let imgSeq = 0;
  const imgId = (src) => { for (const [k, v] of Object.entries(images)) if (v === src) return k; const k = 'i' + (imgSeq++); images[k] = src; return k; };
  const INLINE = new Set(['inline']);
  const visible = (cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
  const px = (v) => parseFloat(v) || 0;

  async function rasterSvg(svg, w, h) {
    const color = getComputedStyle(svg).color;
    const clone = svg.cloneNode(true);
    const S = 6;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w * S); clone.setAttribute('height', h * S);
    let src = new XMLSerializer().serializeToString(clone).replaceAll('currentColor', color);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    await img.decode();
    const c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  function boxOf(el, cs, r, P) {
    const fill = cs.backgroundColor;
    const grad = cs.backgroundImage && cs.backgroundImage.includes('gradient') ? cs.backgroundImage : null;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: px(cs['border' + s + 'Width']), c: cs['border' + s + 'Color'], s: cs['border' + s + 'Style'] }));
    const hasFill = fill && !/rgba\(0, 0, 0, 0\)|transparent/.test(fill);
    const hasBorder = sides.some((s) => s.w > 0 && s.s !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(s.c));
    const shadow = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
    if (!hasFill && !grad && !hasBorder && !shadow) return null;
    return { t: 'box', x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height, fill: hasFill ? fill : null, grad, sides,
      radius: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((k) => px(cs[k])), shadow, cls: el.className && el.className.baseVal === undefined ? String(el.className) : '' };
  }

  // absolutely positioned children (the two-column ✓/✕/• marks) sit outside the text flow: they compute as display:block,
  // which used to disqualify the whole list item as a text block and drop its text (Hair 07, Modern Healthcare 11)
  const outOfFlow = (n) => /absolute|fixed/.test(getComputedStyle(n).position);

  function isTextBlock(el) {
    let hasText = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) hasText = true; continue; }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'BR') continue;
      const cs = getComputedStyle(n);
      if (!visible(cs)) continue;
      if (outOfFlow(n)) continue;  // extracted on its own by walk()
      if (!INLINE.has(cs.display)) return false;  // inline <img>/<svg> (e.g. the checklist headline's checkbox) stay in the text block
      if (n.textContent.trim()) hasText = true;
    }
    return hasText;
  }

  function textOf(el, cs, r, P) {
    const tokens = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node; let pendingSpace = false; let forcedBreak = false;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 1) { if (node.tagName === 'BR') forcedBreak = true; continue; }
      const pe = node.parentElement; const ps = getComputedStyle(pe);
      if (!visible(ps)) continue;
      let inMark = false;
      for (let a = pe; a && a !== el; a = a.parentElement) if (outOfFlow(a)) { inMark = true; break; }
      if (inMark) continue;  // an out-of-flow child's text (a • mark) becomes its own text box
      const v = node.nodeValue;
      const re = /\S+?(?:-(?=\S)|—(?=\S)|(?=\s|$))/g; let m; let last = 0;
      while ((m = re.exec(v))) {
        if (/\s/.test(v.slice(last, m.index))) pendingSpace = true;
        last = m.index + m[0].length;
        const rg = document.createRange(); rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
        const rects = rg.getClientRects(); if (!rects.length) continue;
        let text = m[0]; if (ps.textTransform === 'uppercase') text = text.toUpperCase();
        tokens.push({ text, top: rects[0].top, bottom: rects[0].bottom, left: rects[0].left, right: rects[rects.length - 1].right, space: pendingSpace, br: forcedBreak,
          style: { family: ps.fontFamily, weight: ps.fontWeight, size: px(ps.fontSize), italic: ps.fontStyle === 'italic', color: ps.color, ls: ps.letterSpacing === 'normal' ? 0 : px(ps.letterSpacing), underline: ps.textDecorationLine.includes('underline') } });
        pendingSpace = false; forcedBreak = false;
      }
      if (/\s$/.test(v)) pendingSpace = true;
    }
    if (!tokens.length) return null;
    const lh = cs.lineHeight === 'normal' ? px(cs.fontSize) * 1.2 : px(cs.lineHeight);
    // runs with explicit line breaks where the browser broke the line
    const runs = []; let prevTop = tokens[0].top;
    tokens.forEach((tk, i) => {
      let lead = '';
      if (i > 0) {
        const newLine = tk.br || tk.top > prevTop + Math.max(4, tk.bottom - tk.top) * 0.6;
        if (newLine) { runs.push({ br: true }); prevTop = tk.top; }
        else if (tk.space) lead = ' ';
      }
      const key = JSON.stringify(tk.style); const last = runs[runs.length - 1];
      if (last && !last.br && last.key === key) last.text += lead + tk.text;
      else runs.push({ key, style: tk.style, text: lead + tk.text });
    });
    const bl = px(cs.borderLeftWidth) + px(cs.paddingLeft), br = px(cs.borderRightWidth) + px(cs.paddingRight);
    const bt = px(cs.borderTopWidth) + px(cs.paddingTop), bb = px(cs.borderBottomWidth) + px(cs.paddingBottom);
    const firstTop = tokens[0].top;
    let box = { x: r.left - P.left + bl, y: r.top - P.top + bt, w: r.width - bl - br, h: r.height - bt - bb, align: cs.textAlign };
    if (/flex|grid/.test(cs.display)) {
      // text centred by a flex/grid container (checklist numbers, buttons): place the box on the text itself
      const L = Math.min(...tokens.map((t) => t.left)), R = Math.max(...tokens.map((t) => t.right));
      const T = Math.min(...tokens.map((t) => t.top)), B = Math.max(...tokens.map((t) => t.bottom));
      const nLines = 1 + runs.filter((x) => x.br).length;
      const half = (lh - (tokens[0].bottom - tokens[0].top)) / 2;
      box = { x: L - P.left, y: T - P.top - half, w: R - L, h: nLines * lh, align: /center/.test(cs.justifyContent) || cs.textAlign === 'center' ? 'center' : cs.textAlign };
    }
    // a one-line label that starts with an inline icon (the red-flag triangle): the text box starts where the text does
    if (!/flex|grid/.test(cs.display) && !runs.some((x) => x.br) && el.querySelector('img, svg') && !/center|right|end/.test(cs.textAlign)) {
      const L = Math.min(...tokens.map((t) => t.left)) - P.left;
      if (L > box.x + 1) { box.w -= L - box.x; box.x = L; }
    }
    return { t: 'text', ...box,
      firstTop: firstTop - P.top, lh, runs: runs.map((x) => (x.br ? { br: true } : { text: x.text, style: x.style })) };
  }

  function pseudo(el, which, r, P) {
    const ps = getComputedStyle(el, which);
    if (!ps || ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') return null;
    const w = px(ps.width), h = px(ps.height); if (!w || !h) return null;
    const x = r.left - P.left + (ps.position === 'absolute' ? px(ps.left) : 0);
    const y = r.top - P.top + (ps.position === 'absolute' ? px(ps.top) : 0);
    const fake = { left: x + P.left, top: y + P.top, width: w, height: h };
    return boxOf(el, ps, fake, P);
  }

  const pages = [];
  for (const pg of document.querySelectorAll('.page')) {
    const P = pg.getBoundingClientRect();
    const items = [];
    async function walk(el) {
      const cs = getComputedStyle(el);
      if (!visible(cs)) return;
      const r = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      if (tag === 'svg') {
        if (r.width && r.height) items.push({ t: 'img', img: imgId(await rasterSvg(el, r.width, r.height)), x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height, natW: r.width, natH: r.height, fit: 'fill', pos: '50% 50%', radius: 0, icon: true });
        return;
      }
      if (tag === 'img') {
        if (!r.width || !r.height) return;
        // rounded corners come from the img itself or a clipping ancestor (hero photos sit in span.hph)
        let radius = px(cs.borderTopLeftRadius);
        const clip = el.parentElement && getComputedStyle(el.parentElement).overflow === 'hidden' ? getComputedStyle(el.parentElement) : null;
        if (!radius && clip) radius = px(clip.borderTopLeftRadius);
        const radii = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((k) => px(cs[k]));
        items.push({ t: 'img', img: imgId(el.currentSrc || el.src), x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height, natW: el.naturalWidth, natH: el.naturalHeight, fit: cs.objectFit, pos: cs.objectPosition, radius, radii });
        return;
      }
      const b = boxOf(el, cs, r, P); if (b) items.push(b);
      const before = pseudo(el, '::before', r, P); if (before) items.push(before);
      if (isTextBlock(el)) {
        const t = textOf(el, cs, r, P); if (t) items.push(t);
        const marks = [...el.children].filter((c) => visible(getComputedStyle(c)) && outOfFlow(c));
        for (const c of el.querySelectorAll('img, svg')) if (!marks.some((m) => m.contains(c))) await walk(c);  // inline icons inside the text block
        for (const m of marks) await walk(m);
      }
      else for (const c of el.children) await walk(c);
      const after = pseudo(el, '::after', r, P); if (after) items.push(after);
    }
    await walk(pg);
    pages.push({ w: P.width, h: P.height, items });
  }
  return { pages, images };
});
fs.writeFileSync(out, JSON.stringify(data));
console.log(`${data.pages.length} pages, ${data.pages.reduce((a, p) => a + p.items.length, 0)} items, ${Object.keys(data.images).length} images -> ${out}`);
await browser.close();
