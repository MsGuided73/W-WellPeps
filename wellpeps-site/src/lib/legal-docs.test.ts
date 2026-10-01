import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  CUSTOM_PAGES,
  LEGAL_DOCS,
  draftPagesEnabled,
  gatedPaths,
  linkVisible,
  pagesToBuild,
  type LegalDoc,
} from './legal-docs';
import { renderBlocks, type LegalDocData } from './legal-render';

const root = resolve(__dirname, '../..');
const dataDir = resolve(root, 'src/data/legal');
const loadDoc = (id: string): LegalDocData => JSON.parse(readFileSync(resolve(dataDir, `${id}.json`), 'utf8'));

describe('draft page switch', () => {
  test('on under dev, off in a build unless SHOW_DRAFT_PAGES is true', () => {
    expect(draftPagesEnabled({ dev: true })).toBe(true);
    expect(draftPagesEnabled({ dev: false })).toBe(false);
    expect(draftPagesEnabled({})).toBe(false);
    expect(draftPagesEnabled({ flag: 'true' })).toBe(true);
    expect(draftPagesEnabled({ flag: ' TRUE ' })).toBe(true);
    expect(draftPagesEnabled({ flag: '1' })).toBe(true);
    expect(draftPagesEnabled({ flag: 'false' })).toBe(false);
    expect(draftPagesEnabled({ flag: '' })).toBe(false);
    expect(draftPagesEnabled({ flag: undefined })).toBe(false);
    // Astro hands a build variable of "true" to the code as a boolean.
    expect(draftPagesEnabled({ flag: true })).toBe(true);
    expect(draftPagesEnabled({ flag: false })).toBe(false);
  });

  test('a build without the switch makes no draft page and hides every link to one', () => {
    const none = pagesToBuild(false);
    expect(none.docs).toEqual([]);
    expect(none.custom).toEqual([]);
    for (const p of gatedPaths()) expect(linkVisible(p, false)).toBe(false);
  });

  test('a build with the switch makes every page and shows every link', () => {
    const all = pagesToBuild(true);
    expect(all.docs).toHaveLength(LEGAL_DOCS.length);
    expect(all.custom).toHaveLength(CUSTOM_PAGES.length);
    for (const p of gatedPaths()) expect(linkVisible(p, true)).toBe(true);
  });

  test('links to ordinary pages are never hidden', () => {
    for (const p of ['/', '/weight-loss', '/privacy-policy', '/your-privacy-choices', '/wellness-learning-center']) {
      expect(linkVisible(p, false)).toBe(true);
    }
  });

  test('an approved document is built and linked in every deployment; the others stay held back', () => {
    const [first, second] = LEGAL_DOCS;
    const docs: LegalDoc[] = [{ ...first, approved: true }, second];
    expect(pagesToBuild(false, docs).docs.map((d) => d.id)).toEqual([first.id]);
    expect(linkVisible(`/${first.path}`, false, docs)).toBe(true);
    expect(linkVisible(`/${second.path}`, false, docs)).toBe(false);
  });

  test('nothing in the registry is approved until counsel says so', () => {
    expect(LEGAL_DOCS.filter((d) => d.approved)).toEqual([]);
  });
});

describe('registry', () => {
  test('ids and paths are unique, and no path collides with an existing page', () => {
    const ids = LEGAL_DOCS.map((d) => d.id);
    const paths = [...LEGAL_DOCS.map((d) => d.path), ...CUSTOM_PAGES.map((p) => p.path)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
    // A static page file at the same URL would win over the catch-all route and hide the draft.
    for (const p of paths) {
      expect(existsSync(resolve(root, `src/pages/${p}.astro`)), `${p}.astro already exists`).toBe(false);
      expect(existsSync(resolve(root, `src/pages/${p}/index.astro`)), `${p}/index.astro already exists`).toBe(false);
      expect(p.startsWith('/')).toBe(false);
    }
  });

  test('every document has its converted text, and the text matches the id', () => {
    for (const d of LEGAL_DOCS) {
      const file = resolve(dataDir, `${d.id}.json`);
      expect(existsSync(file), d.id).toBe(true);
      const data = loadDoc(d.id);
      expect(data.id).toBe(d.id);
      expect(data.blocks.length).toBeGreaterThan(20);
    }
  });

  test('every JSON file belongs to a registered document', () => {
    const registered = new Set(LEGAL_DOCS.map((d) => d.id));
    for (const f of readdirSync(dataDir).filter((n) => n.endsWith('.json'))) expect(registered.has(f.replace('.json', '')), f).toBe(true);
  });

  test('documents that already have a live page say which one', () => {
    for (const d of LEGAL_DOCS.filter((x) => x.existing)) {
      const page = d.existing!.replace(/^\//, '');
      expect(existsSync(resolve(root, `src/pages/${page}.astro`)), page).toBe(true);
    }
  });
});

describe('what the converted documents may contain', () => {
  // Partner identities, contract titles and internal paths must never reach the site or the public repo.
  const DENY = [/\bOSI\b/, /Scriptful/, /\bNAA\b/, /Network Access Agreement/, /PepRite/, /docs\//, /Side Letter/, /Service Agreement/];

  test('no partner name, contract title or internal path', () => {
    for (const d of LEGAL_DOCS) {
      const raw = readFileSync(resolve(dataDir, `${d.id}.json`), 'utf8');
      for (const re of DENY) expect(re.test(raw), `${d.id} matches ${re}`).toBe(false);
    }
  });

  test('every document renders, and nothing in it can inject HTML', () => {
    for (const d of LEGAL_DOCS) {
      const html = renderBlocks(loadDoc(d.id).blocks);
      expect(html.length).toBeGreaterThan(500);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/<(?!\/?(h[2-4]|p|ul|ol|li|strong|em|mark|div|span|aside|table|thead|tbody|tr|th|td|colgroup|col|i)\b)[a-z]/i);
    }
  });
});
