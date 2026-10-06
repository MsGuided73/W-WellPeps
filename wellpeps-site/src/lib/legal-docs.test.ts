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

  test('with no variable set, no deployment shows drafts, even while the checkout lock is on (launch audit 2026-10-06)', () => {
    expect(draftPagesEnabled({ preLaunch: true })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: true, flag: '' })).toBe(false);
    expect(draftPagesEnabled({ preLaunch: true, flag: undefined })).toBe(false);
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
    expect(none.docs.map((d) => d.id)).toEqual(LEGAL_DOCS.filter((d) => d.approved).map((d) => d.id));
    expect(none.custom.map((c) => c.kind)).toEqual(CUSTOM_PAGES.filter((c) => c.released).map((c) => c.kind));
    expect(none.custom.some((c) => c.kind === 'review')).toBe(false);
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
    const docs: LegalDoc[] = [{ ...first, approved: true }, { ...second, approved: false }];
    expect(pagesToBuild(false, docs).docs.map((d) => d.id)).toEqual([first.id]);
    expect(linkVisible(`/${first.path}`, false, docs)).toBe(true);
    expect(linkVisible(`/${second.path}`, false, docs)).toBe(false);
  });

  test('only documents the owner has released are approved', () => {
    // Released by the owner for the 2026-10-06 launch audit. A1, A2, A6 and A7 replace the old template pages at
    // the same addresses. Held back: A5 (the live interactive page stays), A11 (texts go through the patient portal)
    // and the portal-only forms B1, B3, B6, B7, B8.
    expect(LEGAL_DOCS.filter((d) => d.approved).map((d) => d.id)).toEqual(
      ['A1', 'A2', 'A3', 'A4', 'A6', 'A7', 'A8', 'A9', 'A10', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'B2', 'B4', 'B5']);
    for (const d of LEGAL_DOCS.filter((x) => x.approved)) expect(d.effective).toMatch(/^October [56], 2026$/);
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

  test('a released document carries no held wording: anything not in effect was removed for the 2026-10-06 launch', () => {
    for (const d of LEGAL_DOCS.filter((x) => x.approved && x.id !== 'A14')) {
      const blocks = loadDoc(d.id).blocks as any[];
      const at = blocks.findIndex((b) => b.t === 'h1' && b.text === END);
      const shown = at >= 0 ? blocks.slice(0, at) : blocks;
      expect(shown.some((b) => /Held wording\.|\[ACTIVATION BLOCK/.test(JSON.stringify(b))), d.id).toBe(false);
    }
  });

  test('a document with no technical material has no notes section', () => {
    expect((loadDoc('A1').blocks as any[]).some((b) => b.t === 'h1' && b.text === END)).toBe(false);
  });
});

describe('what the converted documents may contain', () => {
  // Restricted partner identities, contract titles and internal paths must never reach the site or the public repo.
  // Scriptful, Inc., Scriptful Rx and OSI Medical Services, P.A. may be named (client, 2026-10-02: the CEO holds
  // OSI's written authorization to identify it on the website). PepRite, Inc. may be named as the management
  // partner (owner, 2026-10-06).
  const DENY = [/\bNAA\b/, /Network Access Agreement/, /docs\//, /Side Letter/, /Service Agreement/];

  test('no restricted partner name, contract title or internal path', () => {
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
