// Open the self-paginating HTML in Chromium and report layout facts as JSON for build_book.py:
//   fit      per section/why page: default | spacious | tight+compact+tighter, CONTINUED splits, and emptyIn
//            (largest visible vertical gap on the page, inches; build_book.py warns above EMPTY_PAGE_IN)
//   overflow the paginator's own overflow report (window.__overflow)
//   orphans  headlines, leads, subtitles, emphasis lines, card titles and Why tags whose last line is a single word
//   cta      inches of CTA hero-panel content clipped past the panel edge after its tight/tighter steps (headline cut at the top)
//   disclaimer overlap (inches) between the legal text and the series list, and how many type steps it took
//   fonts    whether Lora and Inter actually loaded (document.fonts) and which families the text resolved to
// Usage: node layout_check.mjs html/book.html   (prints JSON; page_fit.mjs remains the quick human-readable view)
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.resolve('../../wellpeps-site/package.json'));
const { chromium } = require('playwright');

const html = path.resolve(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ media: 'print' });
await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__paginated === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);

const report = await page.evaluate(() => {
  // Empty-page measure: the largest vertical gap the reader would see on the page, in inches. With a bottom stack
  // (callout/approach/decide figure) it is the gap between the lowest content block and the top of that stack;
  // without one it is the gap between the lowest content block and the bottom of the body area.
  const IN = 96;
  const lowest = (root, sel) => {
    let b = 0;
    root.querySelectorAll(sel).forEach((el) => { const r = el.getBoundingClientRect(); if (r.height > 0) b = Math.max(b, r.bottom); });
    return b;
  };
  const emptyGap = (pg) => {
    const wrap = pg.querySelector('.bodywrap'); if (!wrap) return 0;
    const content = pg.querySelector('.content'); const bottom = pg.querySelector('.bottom');
    const contentBottom = Math.max(lowest(pg, '.head, .whytop'), content ? lowest(content, ':scope > *') : 0);
    const stackTop = bottom && bottom.children.length ? bottom.getBoundingClientRect().top : wrap.getBoundingClientRect().bottom;
    return Math.max(0, (stackTop - contentBottom) / IN);
  };
  const fit = Array.from(document.querySelectorAll('.page.section, .page.why, .page.decide')).map((pg) => ({
    page: pg.dataset.num,
    flags: ['tight', 'compact', 'tighter', 'spacious', 'dense'].filter((c) => pg.classList.contains(c)),
    continued: !!pg.querySelector('.head.cont'),
    figureDropped: pg.dataset.figDropped === '1',
    emptyIn: Math.round(emptyGap(pg) * 100) / 100,
  }));

  // Orphan check: measure each word's line via Range rects; flag blocks whose last line holds one word.
  const SEL = '.head h2, p.lead, .head .sub, p.emph, .whyintro .tag, .cta .ctapanel h2, .cover h1, .cover .csub, .closing, .card h5, .fcard h5, .ck h4, .callout p, .approach p';
  const orphans = [];
  for (const el of document.querySelectorAll(SEL)) {
    const text = (el.textContent || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 4) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = new Map(); // top -> word count
    let node;
    while ((node = walker.nextNode())) {
      const re = /\S+/g; let m;
      while ((m = re.exec(node.nodeValue))) {
        const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const rect = r.getBoundingClientRect(); if (!rect.height) continue;
        const key = Math.round(rect.top);
        lines.set(key, (lines.get(key) || 0) + 1);
      }
    }
    const tops = Array.from(lines.keys()).sort((a, b) => a - b);
    if (tops.length >= 2 && lines.get(tops[tops.length - 1]) === 1) {
      const pg = el.closest('.page');
      orphans.push({ page: pg ? pg.dataset.num || pg.className.replace('page', '').trim() : '?', block: el.className || el.tagName.toLowerCase(), text: text.slice(0, 90), lastWord: words[words.length - 1] });
    }
  }

  const fonts = {
    loraLoaded: document.fonts.check('600 16px Lora'),
    interLoaded: document.fonts.check('500 16px Inter'),
    loadedFaces: Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`),
    headlineFamily: getComputedStyle(document.querySelector('.head h2') || document.body).fontFamily,
    bodyFamily: getComputedStyle(document.querySelector('p.body') || document.body).fontFamily,
  };

  // disclaimer page: the legal text must clear the series list (the page steps its type down; if even that fails, report it)
  const disc = Array.from(document.querySelectorAll('.page.disclaimer')).map((pg) => {
    const t = pg.querySelector('.dtext'), s = pg.querySelector('.series');
    const overlap = t && s ? Math.max(0, (t.getBoundingClientRect().bottom - s.getBoundingClientRect().top) / IN) : 0;
    return { overlapIn: Math.round(overlap * 100) / 100, steps: t ? ['d1', 'd2', 'd3', 'd4'].filter((c) => t.classList.contains(c)).length : 0 };
  });

  // CTA hero panel: overflow:hidden with centred content, so too much copy clips the headline at the top without any
  // other symptom. Report how much does not fit after the paginator's tight/tighter steps.
  // Measured as geometry, not scrollHeight: copy that merely runs into the panel padding is invisible, so only the
  // part that extends past the panel's own edges (top or bottom) counts.
  const cta = Array.from(document.querySelectorAll('.cta .ctapanel')).map((p) => {
    const pr = p.getBoundingClientRect();
    let top = Infinity, bottom = -Infinity;
    for (const el of p.children) { const r = el.getBoundingClientRect(); if (!r.height) continue; top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); }
    const clipped = top === Infinity ? 0 : Math.max(0, pr.top - top, bottom - pr.bottom);
    return { overflowIn: Math.round(clipped / IN * 100) / 100, steps: ['tight', 'tighter'].filter((c) => p.classList.contains(c)).length };
  });

  return { pages: document.querySelectorAll('.page').length, overflow: window.__overflow || [], fit, orphans, fonts, disclaimer: disc, cta };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
