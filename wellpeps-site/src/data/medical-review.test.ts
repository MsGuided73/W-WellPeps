import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MEDICAL_REVIEWERS,
  REVIEWS,
  formatReviewDate,
  npiRegistryUrl,
  reviewForArticle,
  reviewerName,
  reviewerPath,
  reviewsBy,
} from './medical-review';

const articles: { slug: string; category_slug: string }[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../scripts/data/articles.json'), 'utf8'),
);
const slugs = new Set(articles.map((a) => a.slug));

describe('medical review records', () => {
  it('names only articles that exist, so a typo cannot silently drop a review', () => {
    const unknown = Object.keys(REVIEWS).filter((s) => !slugs.has(s));
    expect(unknown).toEqual([]);
  });

  it('covers every Weight Management (GLP-1) article: Dr. Yirga approved all of them on 2026-11-06', () => {
    const weight = articles.filter((a) => a.category_slug === 'weight-management').map((a) => a.slug);
    expect(weight.length).toBe(14);
    for (const slug of weight) {
      expect(reviewForArticle(slug), slug).toMatchObject({ reviewedOn: '2026-11-06', reviewer: { id: 'rahel-yirga-md' } });
    }
  });

  it.each([
    ['hair-restoration', 6],
    ['sexual-wellness', 8],
    ['peptides-wellness', 6],
  ])('covers every %s article: Dr. Yirga approved all of them on 2026-11-07', (category, count) => {
    const inCategory = articles.filter((a) => a.category_slug === category).map((a) => a.slug);
    expect(inCategory.length).toBe(count);
    for (const slug of inCategory) {
      expect(reviewForArticle(slug), slug).toMatchObject({ reviewedOn: '2026-11-07', reviewer: { id: 'rahel-yirga-md' } });
    }
  });

  it('covers Healthy Aging (Wellness Foundations), the seventh Healthy Aging article approved on 2026-11-07', () => {
    expect(reviewForArticle('healthy-aging')).toMatchObject({ reviewedOn: '2026-11-07', reviewer: { id: 'rahel-yirga-md' } });
  });

  it('uses real calendar dates that are not in the future', () => {
    for (const [slug, r] of Object.entries(REVIEWS)) {
      expect(r.reviewedOn, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(formatReviewDate(r.reviewedOn), slug).not.toBe('Invalid Date');
      expect(new Date(`${r.reviewedOn}T00:00:00Z`).getTime(), slug).toBeLessThanOrEqual(Date.now());
    }
  });

  it('leaves unreviewed articles without a review', () => {
    expect(reviewForArticle('how-telehealth-works')).toBeUndefined();
  });
});

describe('reviewer details', () => {
  const dr = MEDICAL_REVIEWERS['rahel-yirga-md'];

  it('formats the name, profile path and NPI registry link', () => {
    expect(reviewerName(dr)).toBe('Rahel Yirga, MD');
    expect(reviewerPath(dr)).toBe('/medical-reviewers/rahel-yirga-md/');
    expect(npiRegistryUrl(dr)).toBe('https://npiregistry.cms.hhs.gov/provider-view/1437121910');
  });

  it('carries a 10-digit NPI', () => {
    for (const r of Object.values(MEDICAL_REVIEWERS)) expect(r.npi).toMatch(/^\d{10}$/);
  });

  it('dates the profile page with a real YYYY-MM-DD that is not in the future', () => {
    for (const r of Object.values(MEDICAL_REVIEWERS)) {
      expect(r.profileUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.profileUpdated)), r.profileUpdated).toBe(false);
      expect(r.profileUpdated <= new Date().toISOString().slice(0, 10)).toBe(true);
    }
  });

  it('lists the reviewer\'s articles for the profile page', () => {
    expect(reviewsBy('rahel-yirga-md')).toHaveLength(35);
  });

  it('formats a date-only review date without shifting the day', () => {
    expect(formatReviewDate('2026-11-06')).toBe('November 6, 2026');
  });
});
