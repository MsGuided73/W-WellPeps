/**
 * Row validation for the Learning Center content layer.
 *
 * The article select list is assembled from a string constant, so Supabase
 * cannot infer a row type for it. Rather than cast, each row is checked here:
 * a malformed row fails the build with the slug and field named, instead of
 * surfacing later as a half-rendered page.
 *
 * Kept apart from blog.ts because that module needs Supabase credentials just
 * to be imported.
 */
import type { Article } from './blog';

type Row = Record<string, unknown>;

function fail(row: Row, field: string, expected: string): never {
  const label = typeof row.slug === 'string' ? row.slug : String(row.id ?? 'unknown');
  throw new Error(`[blog] article "${label}" has an invalid ${field}: expected ${expected}`);
}

function str(row: Row, field: string): string {
  const value = row[field];
  return typeof value === 'string' ? value : fail(row, field, 'a string');
}

function nullableStr(row: Row, field: string): string | null {
  const value = row[field];
  return value === null || typeof value === 'string' ? value : fail(row, field, 'a string or null');
}

function num(row: Row, field: string): number {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(row, field, 'a number');
}

function nullableNum(row: Row, field: string): number | null {
  return row[field] === null ? null : num(row, field);
}

function strArray(row: Row, field: string): string[] {
  const value = row[field];
  return Array.isArray(value) && value.every((v): v is string => typeof v === 'string')
    ? value
    : fail(row, field, 'an array of strings');
}

export function parseArticleRow(raw: unknown): Article {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`[blog] article row is not an object: ${JSON.stringify(raw)}`);
  }
  const row = raw as Row;
  return {
    id: str(row, 'id'),
    category_id: str(row, 'category_id'),
    slug: str(row, 'slug'),
    title: str(row, 'title'),
    seo_title: nullableStr(row, 'seo_title'),
    meta_title: nullableStr(row, 'meta_title'),
    meta_description: nullableStr(row, 'meta_description'),
    url_path: str(row, 'url_path'),
    lede_html: str(row, 'lede_html'),
    body_html: str(row, 'body_html'),
    key_takeaways: strArray(row, 'key_takeaways'),
    cta_title: nullableStr(row, 'cta_title'),
    cta_html: nullableStr(row, 'cta_html'),
    disclaimer_html: nullableStr(row, 'disclaimer_html'),
    reading_minutes: num(row, 'reading_minutes'),
    published_at: nullableStr(row, 'published_at'),
    position: num(row, 'position'),
    featured_position: nullableNum(row, 'featured_position'),
  };
}
