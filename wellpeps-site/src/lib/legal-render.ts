/**
 * Turns a converted draft document (an array of blocks, see
 * docs/Legal Docs/_build/export_site_content.py) into HTML for the site.
 *
 * Everything is escaped before any markup is added, so document text can never
 * inject HTML. Inline markup in the drafts is **bold**, *italic* and [BRACKETED
 * TOKENS]; the tokens are the open items counsel and the team must fill or decide,
 * so they are highlighted and colour-coded by who acts (see LegalLayout.astro).
 */

export type Block =
  | { t: 'h1' | 'h2' | 'h3'; text: string }
  | { t: 'p'; text: string; italic?: boolean; align?: string | null }
  | { t: 'li'; text: string; level?: number }
  | { t: 'ol'; items: string[] }
  | { t: 'clause'; number: string; heading: string | null; text: string; level?: number }
  | { t: 'callout'; text: string; kind?: 'note' | 'warning' | 'info' }
  | { t: 'check'; text: string }
  | { t: 'sign'; labels: string[] }
  | { t: 'table'; rows: string[][]; widths?: number[] | null; header?: boolean; shade?: boolean }
  | { t: 'pagebreak' };

export interface LegalDocData {
  id: string;
  title: string;
  docTitle: string;
  version: string;
  date: string;
  blocks: Block[];
}

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Straight quotes to typographic ones, as the Word drafts have. */
export function smartQuotes(s: string): string {
  return s
    .replace(/(^|[\s(\[{*—])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[{*—])'(?=\w)/g, '$1‘')
    .replace(/'/g, '’');
}

/** Who has to act on a [BRACKETED TOKEN]: the lawyer, the web team, or the company. */
export function tokenKind(inner: string): 'legal' | 'web' | 'you' {
  if (/^(VERIFY|PENDING|COUNSEL|DECISION|MEDICAL DIRECTOR|FDA POSITION|HIPAA|LEGAL|ATTORNEY|ACTIVATION|END ACTIVATION)/i.test(inner)) return 'legal';
  if (/^(BUILD|WEB|DEVELOPER|typed|system)/.test(inner)) return 'web';
  return 'you';
}

const TOKEN = /(\*\*.+?\*\*|(?<![\w*])\*[^*\s][^*]*?\*(?![\w*])|\[[^\]]+\])/;

/** Inline markup to HTML. The input is raw draft text; the output is safe HTML. */
export function renderInline(raw: string): string {
  const text = smartQuotes(raw);
  return text
    .split(TOKEN)
    .map((part) => {
      if (!part) return '';
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return `<strong>${renderInline(part.slice(2, -2))}</strong>`;
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return `<em>${renderInline(part.slice(1, -1))}</em>`;
      if (part.startsWith('[') && part.endsWith(']')) return `<mark class="ph ph--${tokenKind(part.slice(1, -1))}">${escapeHtml(part)}</mark>`;
      // A run of underscores is a fill-in blank in the draft; as text it cannot wrap, so draw it as a line.
      return escapeHtml(part).replace(/_{4,}/g, '<span class="ld-blank"></span>');
    })
    .join('');
}

/** A heading's id: lowercase words joined with hyphens, unique within one document. */
export function slugify(text: string, used: Set<string>): string {
  const base = text.replace(/\*\*|\*/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export interface OutlineItem { id: string; text: string }

/** The top-level headings, for the "On this page" list. Ids match the ones renderBlocks writes. */
export function outline(blocks: readonly Block[]): OutlineItem[] {
  const used = new Set<string>();
  const out: OutlineItem[] = [];
  for (const b of blocks) {
    if (b.t === 'h1' || b.t === 'h2' || b.t === 'h3') {
      const id = slugify(b.text, used);
      if (b.t === 'h1') out.push({ id, text: b.text.replace(/\*\*|\*/g, '') });
    }
  }
  return out;
}

function tableHtml(b: Extract<Block, { t: 'table' }>): string {
  const rows = b.rows;
  if (rows.length === 0) return '';
  const total = (b.widths ?? []).reduce((a, n) => a + n, 0);
  const cols = b.widths && total > 0 ? `<colgroup>${b.widths.map((w) => `<col style="width:${((w / total) * 100).toFixed(1)}%">`).join('')}</colgroup>` : '';
  const cell = (c: string, tag: 'th' | 'td', first: boolean) =>
    `<${tag}${first && b.shade && tag === 'td' ? ' class="shade"' : ''}>${String(c).split('\n').map((l) => `<p>${renderInline(l)}</p>`).join('')}</${tag}>`;
  const head = b.header !== false ? `<thead><tr>${rows[0].map((c) => cell(c, 'th', false)).join('')}</tr></thead>` : '';
  const body = (b.header !== false ? rows.slice(1) : rows).map((r) => `<tr>${r.map((c, i) => cell(c, 'td', i === 0)).join('')}</tr>`).join('');
  return `<div class="ld-table"><table>${cols}${head}<tbody>${body}</tbody></table></div>`;
}

/** The whole document body as HTML. Headings are demoted one level (the page title is the h1). */
export function renderBlocks(blocks: readonly Block[]): string {
  const used = new Set<string>();
  const out: string[] = [];
  let list: { level: number; text: string }[] = [];
  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul class="ld-list">${list.map((i) => `<li${i.level ? ` class="lv${i.level}"` : ''}>${renderInline(i.text)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const b of blocks) {
    if (b.t !== 'li') flushList();
    switch (b.t) {
      case 'h1': out.push(`<h2 id="${slugify(b.text, used)}">${renderInline(b.text)}</h2>`); break;
      case 'h2': out.push(`<h3 id="${slugify(b.text, used)}">${renderInline(b.text)}</h3>`); break;
      case 'h3': out.push(`<h4 id="${slugify(b.text, used)}">${renderInline(b.text)}</h4>`); break;
      case 'p':
        out.push(/^[_\s]{5,}$/.test(b.text) ? '<div class="ld-rule" role="presentation"></div>' : `<p${b.italic ? ' class="ld-italic"' : ''}>${renderInline(b.text)}</p>`);
        break;
      case 'li': list.push({ level: b.level ?? 0, text: b.text }); break;
      case 'ol': out.push(`<ol class="ld-list">${b.items.map((i) => `<li>${renderInline(String(i))}</li>`).join('')}</ol>`); break;
      case 'clause':
        out.push(
          `<div class="ld-clause lv${b.level ?? 0}"><span class="ld-clause__no">${escapeHtml(b.number)}</span><div>${b.heading ? `<strong>${renderInline(b.heading)}</strong> ` : ''}${renderInline(b.text)}</div></div>`,
        );
        break;
      case 'callout':
        out.push(`<aside class="ld-callout ld-callout--${b.kind ?? 'note'}">${String(b.text).split('\n').map((l) => `<p>${renderInline(l)}</p>`).join('')}</aside>`);
        break;
      case 'check': out.push(`<p class="ld-check"><span aria-hidden="true">☐</span> ${renderInline(b.text)}</p>`); break;
      case 'sign': out.push(`<div class="ld-sign">${b.labels.map((l) => `<div><span>${renderInline(l)}:</span><i></i></div>`).join('')}</div>`); break;
      case 'table': out.push(tableHtml(b)); break;
      case 'pagebreak': break;
    }
  }
  flushList();
  return out.join('\n');
}

/**
 * The public copy of one block inside a copy-block library such as the Medical
 * Disclaimer set: the blocks under the h1 whose text matches `h1`, without the
 * "Copy" labels and without the internal "Notes" and "How to complete" lists that
 * sit beside the copy in the draft.
 */
export function sectionCopy(blocks: readonly Block[], h1: RegExp): Block[] {
  const start = blocks.findIndex((b) => b.t === 'h1' && h1.test(b.text));
  if (start < 0) return [];
  const out: Block[] = [];
  let skipping = false;
  for (const b of blocks.slice(start + 1)) {
    if (b.t === 'h1') break;
    if (b.t === 'h3') {
      skipping = /^(notes|how to complete)/i.test(b.text);
      if (skipping || /^copy/i.test(b.text)) continue;
    }
    if (!skipping) out.push(b);
  }
  return out;
}
