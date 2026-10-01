/**
 * Logic behind the dev-only Tweak panel (src/lib/dev/tweak-panel.ts).
 *
 * Kept free of the DOM so it can be unit tested: what a field is, how a change
 * is recorded and reverted, how an element is described by a CSS selector, how
 * the saved copy is validated, and how the change list handed back to the
 * developer is written. Nothing here runs in the production build.
 */

/** The site's type floor (see --text-body-size in tokens.css). */
export const FONT_FLOOR_PX = 19;

export type FieldKind = 'color' | 'px' | 'select' | 'number';
export type FieldGroup = 'Text' | 'Box' | 'Layout';

export interface FieldDef {
  prop: string;
  label: string;
  kind: FieldKind;
  group: FieldGroup;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
}

export const FIELDS: readonly FieldDef[] = [
  { group: 'Text', prop: 'color', label: 'Text color', kind: 'color' },
  { group: 'Text', prop: 'font-size', label: 'Font size', kind: 'px', min: 8, max: 140 },
  { group: 'Text', prop: 'font-weight', label: 'Weight', kind: 'select', options: ['300', '400', '500', '600', '700', '800'] },
  { group: 'Text', prop: 'text-align', label: 'Align', kind: 'select', options: ['left', 'center', 'right'] },
  { group: 'Box', prop: 'background-color', label: 'Background', kind: 'color' },
  { group: 'Box', prop: 'border-radius', label: 'Corner radius', kind: 'px', min: 0, max: 200 },
  { group: 'Box', prop: 'opacity', label: 'Opacity', kind: 'number', min: 0, max: 1, step: 0.05 },
  { group: 'Layout', prop: 'padding-top', label: 'Padding top', kind: 'px', min: 0, max: 300 },
  { group: 'Layout', prop: 'padding-right', label: 'Padding right', kind: 'px', min: 0, max: 300 },
  { group: 'Layout', prop: 'padding-bottom', label: 'Padding bottom', kind: 'px', min: 0, max: 300 },
  { group: 'Layout', prop: 'padding-left', label: 'Padding left', kind: 'px', min: 0, max: 300 },
  { group: 'Layout', prop: 'margin-top', label: 'Margin top', kind: 'px', min: -200, max: 300 },
  { group: 'Layout', prop: 'margin-bottom', label: 'Margin bottom', kind: 'px', min: -200, max: 300 },
  { group: 'Layout', prop: 'gap', label: 'Gap (flex/grid)', kind: 'px', min: 0, max: 200 },
  { group: 'Layout', prop: 'max-width', label: 'Max width', kind: 'px', min: 0, max: 3000 },
];

/** Hiding an element is just `display: none`. */
export const HIDE_PROP = 'display';

export const TWEAKABLE_PROPS: ReadonlySet<string> = new Set([...FIELDS.map((f) => f.prop), HIDE_PROP]);

// ---- values ----------------------------------------------------------------

/** "rgb(8, 43, 89)" / "rgba(...)" / "#abc" / "#aabbcc" → "#rrggbb". '' when there is no usable colour. */
export function colorToHex(css: string): string {
  const s = css.trim().toLowerCase();
  if (!s || s === 'transparent') return '';
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (hex3) return `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`;
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (!m) return '';
  if (m[4] !== undefined) {
    const a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a === 0) return '';
  }
  const to = (v: string) => Math.max(0, Math.min(255, Math.round(parseFloat(v)))).toString(16).padStart(2, '0');
  return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
}

/** "19px" → 19. Anything else (auto, %, em, empty) → null. */
export function pxNumber(value: string): number | null {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
  return m ? parseFloat(m[1]) : null;
}

/** Same value written two ways (case, spacing, trailing zeros) counts as unchanged. */
function sameValue(a: string, b: string): boolean {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
  if (norm(a) === norm(b)) return true;
  const ca = colorToHex(a);
  return ca !== '' && ca === colorToHex(b);
}

// ---- where an element comes from -------------------------------------------

/**
 * Astro's dev server stamps elements with data-astro-source-file ("C:/dev/W/
 * wellpeps-site/src/components/NavBar.astro") and -loc ("13:46"). Returns
 * "src/components/NavBar.astro:13", or null when the element has no stamp.
 */
export function sourceLabel(file: string | null, loc: string | null): string | null {
  if (!file) return null;
  const path = file.replace(/\\/g, '/');
  const root = path.lastIndexOf('/wellpeps-site/');
  const rel = root >= 0 ? path.slice(root + '/wellpeps-site/'.length) : path.slice(path.lastIndexOf('/src/') + 1);
  if (!rel) return null;
  const line = loc ? /^(\d+)/.exec(loc)?.[1] : undefined;
  return line ? `${rel}:${line}` : rel;
}

// ---- selectors -------------------------------------------------------------

export interface PathNode {
  tag: string;
  id: string;
  classes: readonly string[];
  /** 1-based position among siblings with the same tag. */
  nth: number;
  /** How many siblings (itself included) share the tag. */
  ofType: number;
  parent: PathNode | null;
}

/** Escapes one identifier for use inside a selector. */
export function cssEscape(ident: string): string {
  return ident
    .replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
    .replace(/^(\d)/, (_m, d: string) => `\\3${d} `);
}

// Classes that describe state rather than identity, and so make poor selectors.
const STATE_CLASS = /^(is|has|js)-|^(reveal|visible|in-view|active|open)$/;

function segment(node: PathNode): { text: string; terminal: boolean } {
  const tag = node.tag.toLowerCase();
  if (node.id && !/\s/.test(node.id)) return { text: `${tag}#${cssEscape(node.id)}`, terminal: true };
  const cls = node.classes.filter((c) => c && !STATE_CLASS.test(c)).slice(0, 2).map((c) => `.${cssEscape(c)}`).join('');
  const nth = node.ofType > 1 ? `:nth-of-type(${node.nth})` : '';
  return { text: `${tag}${cls}${nth}`, terminal: false };
}

/**
 * Selectors for an element from shortest (just itself) to longest (the full
 * path up to <body> or the nearest id). The caller takes the first one that
 * matches exactly one element on the page.
 */
export function selectorCandidates(node: PathNode): string[] {
  const parts: string[] = [];
  const out: string[] = [];
  for (let n: PathNode | null = node; n && n.tag.toLowerCase() !== 'body' && n.tag.toLowerCase() !== 'html'; n = n.parent) {
    const seg = segment(n);
    parts.unshift(seg.text);
    out.push(parts.join(' > '));
    if (seg.terminal) break;
  }
  return out;
}

// ---- recording changes -----------------------------------------------------

export interface PropChange { before: string; after: string }
export interface TextChange { before: string; after: string; hadMarkup: boolean }

export interface ElementChange {
  selector: string;
  source: string | null;
  label: string;
  props: Readonly<Record<string, PropChange>>;
  text: TextChange | null;
}

export function newChange(selector: string, source: string | null, label: string): ElementChange {
  return { selector, source, label, props: {}, text: null };
}

export function isEmptyChange(c: ElementChange): boolean {
  return Object.keys(c.props).length === 0 && c.text === null;
}

/**
 * Records `after` for a property. The original value is whatever the property
 * was the first time it was touched, so setting it back to that value, or
 * clearing the field, removes the change instead of leaving a no-op behind.
 */
export function withProp(change: ElementChange, prop: string, before: string, after: string): ElementChange {
  const original = change.props[prop]?.before ?? before;
  const { [prop]: _dropped, ...rest } = change.props;
  if (after.trim() === '' || sameValue(after, original)) return { ...change, props: rest };
  return { ...change, props: { ...rest, [prop]: { before: original, after } } };
}

export function withText(change: ElementChange, before: string, after: string, hadMarkup: boolean): ElementChange {
  const original = change.text?.before ?? before;
  const markup = change.text?.hadMarkup ?? hadMarkup;
  if (after === original) return { ...change, text: null };
  return { ...change, text: { before: original, after, hadMarkup: markup } };
}

// ---- the saved copy (so a reload keeps the preview) ------------------------

const STORE_VERSION = 1;
const MAX_CHANGES = 200;
const MAX_VALUE = 300;
const MAX_TEXT = 5000;

export function storageKey(path: string): string {
  return `wp-tweaks:v${STORE_VERSION}:${path}`;
}

export function serializeChanges(changes: readonly ElementChange[]): string {
  return JSON.stringify(changes.filter((c) => !isEmptyChange(c)));
}

const isString = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** Reads the saved copy back, dropping anything malformed instead of trusting it. */
export function parseStored(raw: string | null): ElementChange[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: ElementChange[] = [];
  for (const item of data.slice(0, MAX_CHANGES)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (!isString(o.selector, 500) || o.selector === '') continue;
    const props: Record<string, PropChange> = {};
    if (o.props && typeof o.props === 'object') {
      for (const [prop, v] of Object.entries(o.props as Record<string, unknown>)) {
        if (!TWEAKABLE_PROPS.has(prop) || !v || typeof v !== 'object') continue;
        const pc = v as Record<string, unknown>;
        if (isString(pc.before, MAX_VALUE) && isString(pc.after, MAX_VALUE) && pc.after !== '') props[prop] = { before: pc.before, after: pc.after };
      }
    }
    let text: TextChange | null = null;
    const t = o.text as Record<string, unknown> | null | undefined;
    if (t && typeof t === 'object' && isString(t.before, MAX_TEXT) && isString(t.after, MAX_TEXT)) {
      text = { before: t.before, after: t.after, hadMarkup: t.hadMarkup === true };
    }
    const change: ElementChange = {
      selector: o.selector,
      source: isString(o.source, 300) ? o.source : null,
      label: isString(o.label, 200) ? o.label : o.selector,
      props,
      text,
    };
    if (!isEmptyChange(change)) out.push(change);
  }
  return out;
}

// ---- the change list handed back -------------------------------------------

export interface ExportInput {
  page: string;
  viewport: number;
  changes: readonly ElementChange[];
}

/** Short human label, e.g. `h1 "Weight loss that fits"`. */
export function labelFor(tag: string, text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const clipped = t.length > 40 ? `${t.slice(0, 37)}...` : t;
  return clipped ? `${tag.toLowerCase()} "${clipped}"` : tag.toLowerCase();
}

/** Markdown written to be pasted back to the developer who applies it. */
export function formatChangeList({ page, viewport, changes }: ExportInput): string {
  const live = changes.filter((c) => !isEmptyChange(c));
  const lines: string[] = [];
  lines.push(`# Site tweaks for ${page}`, '');
  if (live.length === 0) {
    lines.push('No changes yet.');
    return lines.join('\n');
  }
  lines.push(
    `Made in the dev Tweak panel in a ${viewport}px wide window; ${live.length} element${live.length === 1 ? '' : 's'} changed.`,
    'Each value below was previewed as an inline style. Apply it in the source file named under its heading, using a site token where one exists.',
    `A change that should only apply at this width needs a media query (the window was ${viewport}px wide).`,
    '',
  );
  let wording = false;
  live.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.label}`);
    lines.push(`- Source: ${c.source ?? 'not known (no source stamp on this element)'}`);
    lines.push(`- Selector: \`${c.selector}\``);
    for (const [prop, { before, after }] of Object.entries(c.props)) {
      if (prop === HIDE_PROP && after === 'none') {
        lines.push(`- Hidden: yes (display: none; it was ${before || 'shown'})`);
        continue;
      }
      let line = `- ${prop}: ${before || '(not set)'} → ${after}`;
      if (prop === 'font-size') {
        const px = pxNumber(after);
        if (px !== null && px < FONT_FLOOR_PX) line += `  (WARNING: below the site's ${FONT_FLOOR_PX}px type floor; confirm this is intended)`;
      }
      lines.push(line);
    }
    if (c.text) {
      wording = true;
      lines.push(`- Text: "${c.text.before}" → "${c.text.after}"`);
      if (c.text.hadMarkup) lines.push('  (the original had formatting inside it, such as bold or a link; keep it)');
    }
    lines.push('');
  });
  if (wording) {
    lines.push('Wording changes to health, price or results claims should go through the LegitScript claims scan before they ship.', '');
  }
  return lines.join('\n').trimEnd() + '\n';
}
