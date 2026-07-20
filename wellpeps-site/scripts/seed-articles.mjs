/**
 * Seed / refresh Wellness Learning Center articles in Supabase.
 *
 * Source of truth is scripts/data/articles.json, generated from the client's
 * .docx originals. Re-running is safe: rows are upserted on `slug`, so editing
 * a .docx, re-extracting and re-seeding updates in place without churning ids
 * or breaking published URLs.
 *
 * Usage:  npm run seed:articles
 * Needs:  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in wellpeps-site/.env
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Minimal .env reader — avoids a dependency for one file. */
function loadEnv() {
  try {
    const raw = readFileSync(resolve(here, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // No .env file — fall back to real environment variables.
  }
}
loadEnv();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env and add the service_role key from\n' +
      'Supabase → Project Settings → API.'
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const articles = JSON.parse(
  readFileSync(resolve(here, 'data/articles.json'), 'utf8')
);

const READING_WPM = 225;

const { data: categories, error: catErr } = await db
  .from('blog_categories')
  .select('id, slug');

if (catErr) {
  console.error('Could not read categories:', catErr.message);
  process.exit(1);
}

const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

const rows = articles.map((a) => {
  const id = categoryId.get(a.category_slug);
  if (!id) throw new Error(`Unknown category "${a.category_slug}" (${a.slug})`);
  return {
    category_id: id,
    slug: a.slug,
    title: a.title,
    seo_title: a.seo_title,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
    url_path: a.url_path,
    lede_html: a.lede_html,
    body_html: a.body_html,
    key_takeaways: a.key_takeaways,
    cta_title: a.cta_title,
    cta_html: a.cta_html,
    disclaimer_html: a.disclaimer_html,
    word_count: a.word_count,
    reading_minutes: Math.max(1, Math.ceil(a.word_count / READING_WPM)),
    status: 'published',
    published_at: new Date().toISOString(),
    position: a.position,
    source_file: a.source_file,
  };
});

const { error } = await db
  .from('blog_articles')
  .upsert(rows, { onConflict: 'slug' });

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

const { count } = await db
  .from('blog_articles')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'published');

console.log(`Seeded ${rows.length} articles. ${count} published in total.`);
