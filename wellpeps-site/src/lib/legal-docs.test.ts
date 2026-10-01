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
  test('on under dev; in a build the variable decides, and when it is unset the pre-launch state does', () => {
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

  test('with no variable set, the drafts follow the pre-launch state: shown while the checkout lock is on, gone at launch', () => {
    expect(draftPagesEnabled({ preLaunch: true })).toBe(true);
    expect(draftPagesEnabled({ preLaunch: true, flag: '' })).toBe(true);
    expect(draftPagesEnabled({ preLaunch: true, flag: undefined })).toBe(true);
    expect(draftPagesEnabled({ preLaunch: false })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: false, flag: '' })).toBe(false);
  });

  test('an explicit variable overrides the pre-launch state in both directions', () => {
    expect(draftPagesEnabled({ preLaunch: true, flag: 'false' })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: true, flag: false })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: true, flag: '0' })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: true, flag: ' OFF ' })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: false, flag: 'true' })).toBe(true);
    expect(draftPagesEnabled({ preLaunch: false, flag: true })).toBe(true);
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

describe('reading order of the converted documents', () => {
  const END = 'Technical and drafting notes';
  const textOf = (b: any): string =>
    [b.text, b.heading, ...(b.items ?? []), ...(b.rows ?? []).flat()].filter((x) => typeof x === 'string').join(' ');
  const plain = (s: string) => s.replace(/[*_]/g, '').trim();

  test('technical instructions are collected at the end of each document, not mixed into it', () => {
    for (const d of LEGAL_DOCS) {
      const blocks = loadDoc(d.id).blocks as any[];
      const at = blocks.findIndex((b) => b.t === 'h1' && b.text === END);
      const document = at < 0 ? blocks : blocks.slice(0, at);
      for (const b of document) {
        const text = textOf(b);
        expect(/\[ACTIVATION BLOCK|\[END ACTIVATION BLOCK/.test(text), `${d.id}: activation marker in the document`).toBe(false);
        expect(/^build notes?/i.test(plain(b.text ?? '')), `${d.id}: build note in the document`).toBe(false);
        if (b.t === 'h1' || b.t === 'h2') {
          expect(/\((?:[^)]*)(internal|engineering|remove before publishing|do not publish|keep off)/i.test(b.text), `${d.id}: "${b.text}"`).toBe(false);
        }
        if (b.t === 'h3') expect(/^(notes?|how to complete|rules?)/i.test(plain(b.text)), `${d.id}: "${b.text}" belongs at the end`).toBe(false);
      }
      // The notes are the last section: nothing after them is a document heading.
      if (at >= 0) expect(blocks.slice(at + 1).some((b) => b.t === 'h1'), `${d.id}: a document section follows the notes`).toBe(false);
    }
  });

  test('where wording is held for later, a short marker stays in place and the conditions are in the notes', () => {
    const blocks = loadDoc('A4').blocks as any[];
    const at = blocks.findIndex((b) => b.t === 'h1' && b.text === END);
    expect(at).toBeGreaterThan(0);
    expect(blocks.slice(0, at).some((b) => /Held wording\./.test(b.text ?? ''))).toBe(true);
    expect(blocks.slice(at).some((b) => /\[ACTIVATION BLOCK/.test(b.text ?? ''))).toBe(true);
  });

  test('a document with no technical material has no notes section', () => {
    expect((loadDoc('A1').blocks as any[]).some((b) => b.t === 'h1' && b.text === END)).toBe(false);
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
