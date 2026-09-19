import { describe, expect, test } from 'vitest';
import { parseArticleRow } from './blog-rows';

const VALID_ROW = {
  id: 'a1',
  category_id: 'c1',
  slug: 'glp-1-basics',
  title: 'GLP-1 Basics',
  seo_title: null,
  meta_title: 'GLP-1 Basics | WellPeps',
  meta_description: null,
  url_path: '/wellness-learning-center/weight-management/glp-1-basics',
  lede_html: '<p>Lede</p>',
  body_html: '<p>Body</p>',
  key_takeaways: ['One', 'Two'],
  cta_title: null,
  cta_html: null,
  disclaimer_html: null,
  reading_minutes: 6,
  published_at: '2026-09-01T00:00:00Z',
  position: 1,
  featured_position: null,
};

describe('parseArticleRow', () => {
  test('returns a valid row unchanged', () => {
    expect(parseArticleRow(VALID_ROW)).toEqual(VALID_ROW);
  });

  test('throws when the row is not an object', () => {
    expect(() => parseArticleRow('Error: bad select')).toThrow(/not an object/);
  });

  test('throws naming the slug and field when a required string is missing', () => {
    const { body_html: _omitted, ...row } = VALID_ROW;
    expect(() => parseArticleRow(row)).toThrow(/"glp-1-basics".*body_html/);
  });

  test('throws when a nullable string holds another type', () => {
    expect(() => parseArticleRow({ ...VALID_ROW, cta_title: 3 })).toThrow(/cta_title/);
  });

  test('throws when a number field is not a finite number', () => {
    expect(() => parseArticleRow({ ...VALID_ROW, position: '1' })).toThrow(/position/);
  });

  test('throws when key_takeaways is not an array of strings', () => {
    expect(() => parseArticleRow({ ...VALID_ROW, key_takeaways: ['ok', 2] })).toThrow(
      /key_takeaways/
    );
  });

  test('accepts a numeric featured_position', () => {
    expect(parseArticleRow({ ...VALID_ROW, featured_position: 2 }).featured_position).toBe(2);
  });
});
