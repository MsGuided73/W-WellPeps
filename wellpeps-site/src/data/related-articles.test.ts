import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PROGRAM_SLUGS } from '../lib/cta';
import { PRODUCT_PAGES } from '../lib/products';
import { PROGRAM_ARTICLES, PROGRAM_RELATED_PAGES, PRODUCT_ARTICLES, articlePath, articlesForProduct, pickArticles } from './related-articles';

const SITE = resolve(__dirname, '../..');
const seeded = new Set(
  (JSON.parse(readFileSync(resolve(SITE, 'scripts/data/articles.json'), 'utf8')) as { slug: string }[]).map((a) => a.slug),
);

describe('Learn more links', () => {
  test('every program links to three to five real, different articles', () => {
    for (const program of PROGRAM_SLUGS) {
      const slugs = PROGRAM_ARTICLES[program];
      expect(slugs.length, program).toBeGreaterThanOrEqual(3);
      expect(slugs.length, program).toBeLessThanOrEqual(5);
      expect(new Set(slugs).size, program).toBe(slugs.length);
      for (const slug of slugs) expect(seeded.has(slug), `${program}: ${slug}`).toBe(true);
    }
  });

  test('every product page links to at least one real article, and its own picks belong to a real product page', () => {
    const paths = new Set(PRODUCT_PAGES.map((p) => p.path));
    for (const path of Object.keys(PRODUCT_ARTICLES)) expect(paths.has(path), path).toBe(true);
    for (const page of PRODUCT_PAGES) {
      const slugs = articlesForProduct(page.path, page.program);
      expect(slugs.length, page.path).toBeGreaterThan(0);
      for (const slug of slugs) expect(seeded.has(slug), `${page.path}: ${slug}`).toBe(true);
    }
  });

  test('related pages are product or program pages that exist', () => {
    const known = new Set([...PRODUCT_PAGES.map((p) => p.path), ...PRODUCT_PAGES.map((p) => p.programPath)]);
    for (const links of Object.values(PROGRAM_RELATED_PAGES)) {
      for (const link of links ?? []) expect(known.has(link.href), link.href).toBe(true);
    }
  });

  test('an unpublished article is left out, and the order is the list order', () => {
    const published = [{ slug: 'b' }, { slug: 'a' }];
    expect(pickArticles(['a', 'missing', 'b'], published)).toEqual([{ slug: 'a' }, { slug: 'b' }]);
    expect(articlePath('what-are-peptides')).toBe('/wellness-learning-center/what-are-peptides/');
  });
});
