/**
 * One <h1> per page (Bing Webmaster Tools flagged "More than one h1 tag", 2026-11-23).
 *
 * Pages with a phone layout render both layouts in the HTML and hide one with CSS, so a search engine
 * reading the source sees both. The desktop layout owns the page's <h1>; the phone title is a
 * <p class="ph-h1" role="heading" aria-level="1">, which still reads as the page title to screen readers.
 * The built-site check (npm run check:seo) counts <h1> per page too; this test catches it without a build.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');

function astroFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return astroFiles(p);
    return e.name.endsWith('.astro') ? [p] : [];
  });
}

const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, '/');
const h1Count = (text: string) => (text.match(/<h1[\s>]/g) ?? []).length;
const files = astroFiles(SRC);

describe('one <h1> per page', () => {
  it('phone layouts never use an <h1> tag', () => {
    const phone = files.filter((f) => /Phone\.astro$/.test(f) || rel(f).startsWith('components/phone/'));
    expect(phone.length).toBeGreaterThan(5);
    const offenders = phone.filter((f) => h1Count(fs.readFileSync(f, 'utf8')) > 0).map(rel);
    expect(offenders, 'use <p class="ph-h1" role="heading" aria-level="1"> for the phone title').toEqual([]);
  });

  it('a page that renders its phone layout inline has at most one <h1>', () => {
    const inline = files.filter((f) => rel(f).startsWith('pages/') && fs.readFileSync(f, 'utf8').includes('ph-only'));
    const offenders = inline.filter((f) => h1Count(fs.readFileSync(f, 'utf8')) > 1).map(rel);
    expect(offenders).toEqual([]);
  });

  it('every phone title is marked as the level-1 heading', () => {
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      for (const tag of text.match(/<[a-z]+ class="ph-h1"[^>]*>/g) ?? []) {
        expect(tag, rel(f)).toContain('role="heading"');
        expect(tag, rel(f)).toContain('aria-level="1"');
      }
    }
  });
});
