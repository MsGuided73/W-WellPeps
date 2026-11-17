import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ARTICLE_COVERS, ARTICLE_DIAGRAMS, coverForArticle, diagramForArticle } from './article-heroes';

const articles: { slug: string; body_html: string }[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../scripts/data/articles.json'), 'utf8'),
);
const slugs = new Set(articles.map((a) => a.slug));
const publicDir = path.resolve(__dirname, '../../public');

describe('article cover photos', () => {
  it('name only articles that exist, so a typo cannot silently drop a cover', () => {
    const unknown = [...Object.keys(ARTICLE_COVERS), ...Object.keys(ARTICLE_DIAGRAMS)].filter((s) => !slugs.has(s));
    expect(unknown).toEqual([]);
  });

  it.each(Object.entries(ARTICLE_COVERS))('%s points at a real file whose size matches the record', async (_slug, cover) => {
    const file = path.join(publicDir, cover.src);
    expect(fs.existsSync(file), cover.src).toBe(true);
    const meta = await sharp(file).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual({ width: cover.width, height: cover.height });
  });

  it.each(Object.entries(ARTICLE_COVERS))('%s is wide enough for the full-width cover', (_slug, cover) => {
    expect(cover.width).toBeGreaterThanOrEqual(1320);
  });

  it.each(Object.entries(ARTICLE_COVERS))('%s has a describing sentence for alt text', (_slug, cover) => {
    expect(cover.alt).toMatch(/^[A-Z].{20,}\.$/);
    expect(cover.alt).not.toMatch(/[—–]/);
  });
});

describe('article diagrams', () => {
  const copy = Object.values(ARTICLE_DIAGRAMS).flatMap((d) => [
    d.caption,
    ...d.steps.flatMap((s) => [s.name, s.text, ...(s.via ?? []).flatMap((v) => [v.term ?? '', v.text])]),
  ]);

  it('use no em or en dashes in their copy', () => {
    expect(copy.filter((t) => /[—–]/.test(t))).toEqual([]);
  });

  it('have between two and four steps, and the last step has no arrow after it', () => {
    for (const d of Object.values(ARTICLE_DIAGRAMS)) {
      expect(d.steps.length).toBeGreaterThanOrEqual(2);
      expect(d.steps.length).toBeLessThanOrEqual(4);
      expect(d.steps.at(-1)?.via).toBeUndefined();
    }
  });
});

describe('diagram placement', () => {
  it.each(Object.entries(ARTICLE_DIAGRAMS))('%s names a section heading its article really has', (slug, diagram) => {
    const body = articles.find((a) => a.slug === slug)?.body_html ?? '';
    const headings = [...body.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    expect(headings).toContain(diagram.section);
  });
});

describe('coverForArticle and diagramForArticle', () => {
  it('keep a draft diagram off production builds', () => {
    expect(ARTICLE_DIAGRAMS['sermorelin-explained'].status).toBe('draft');
    expect(diagramForArticle('sermorelin-explained')).toBeUndefined();
  });

  it('show a draft diagram when drafts are included (astro dev)', () => {
    expect(diagramForArticle('sermorelin-explained', { includeDrafts: true })).toBe(ARTICLE_DIAGRAMS['sermorelin-explained']);
  });

  it('give an article its cover whether or not it also has a diagram', () => {
    expect(coverForArticle('sermorelin-explained')).toBe(ARTICLE_COVERS['sermorelin-explained']);
  });

  it('return undefined for an article without a cover, so the page keeps a title-only header', () => {
    expect(coverForArticle('why-sleep-matters')).toBeUndefined();
  });
});
