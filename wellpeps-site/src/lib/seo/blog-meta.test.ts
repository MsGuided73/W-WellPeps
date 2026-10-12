import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Search titles and descriptions for the Learning Center articles (scripts/data/articles.json, seeded into
 * Supabase by scripts/seed-articles.mjs). Rewritten 2026-10-11 so none is cut off in search results; this
 * keeps a new or edited article from slipping back.
 */
const articles: { slug: string; meta_title: string; meta_description: string }[] = JSON.parse(
  readFileSync(resolve(__dirname, '../../../scripts/data/articles.json'), 'utf8'),
);

// Words the site's claims rules forbid (src/lib/claims.test.ts), plus brand drug names.
const BANNED = /\bfree\b|encrypted|HIPAA[- ]compliant|lipotropic|low-cost|guarantee|\bcure|Viagra|Cialis/i;

describe('Learning Center search titles and descriptions', () => {
  test('the file has every article', () => {
    expect(articles.length).toBeGreaterThan(40);
  });

  test.each(articles.map((a) => [a.slug, a] as const))('%s fits a search result and makes no banned claim', (_slug, a) => {
    expect(a.meta_title.length, a.meta_title).toBeGreaterThanOrEqual(30);
    expect(a.meta_title.length, a.meta_title).toBeLessThanOrEqual(60);
    expect(a.meta_title.endsWith('| WellPeps'), a.meta_title).toBe(true);
    expect(a.meta_description.length, a.meta_description).toBeGreaterThanOrEqual(120);
    expect(a.meta_description.length, a.meta_description).toBeLessThanOrEqual(160);
    expect(`${a.meta_title} ${a.meta_description}`).not.toMatch(BANNED);
  });

  test('no two articles share a title or a description', () => {
    expect(new Set(articles.map((a) => a.meta_title)).size).toBe(articles.length);
    expect(new Set(articles.map((a) => a.meta_description)).size).toBe(articles.length);
  });
});
