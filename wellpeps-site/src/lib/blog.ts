/**
 * Wellness Learning Center — build-time content layer.
 *
 * The site is a static Astro build, so every function here runs during
 * `astro build`, never in the browser. Articles are baked into HTML, which is
 * what keeps the Learning Center fast and fully indexable — the whole point of
 * the SEO metadata the articles ship with.
 *
 * Publishing a new article therefore means: seed it, then rebuild.
 *
 * Results are memoised because Astro calls `getStaticPaths` and the page body
 * separately; without this the same query would run once per page.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.\n' +
      'Copy wellpeps-site/.env.example to .env before building.'
  );
}

const db = createClient(url, key, { auth: { persistSession: false } });

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
}

export interface Article {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  url_path: string;
  lede_html: string;
  body_html: string;
  key_takeaways: string[];
  cta_title: string | null;
  cta_html: string | null;
  disclaimer_html: string | null;
  reading_minutes: number;
  published_at: string | null;
  position: number;
  /** 1-based slot in the hub's Featured Articles row; null when not featured. */
  featured_position: number | null;
}

/** An article joined to its category, which is how every page consumes it. */
export interface ArticleWithCategory extends Article {
  category: Category;
}

const ARTICLE_FIELDS =
  'id, category_id, slug, title, seo_title, meta_title, meta_description, ' +
  'url_path, lede_html, body_html, key_takeaways, cta_title, cta_html, ' +
  'disclaimer_html, reading_minutes, published_at, position, featured_position';

/**
 * Icon per category, for the hub's category list and featured cards.
 * Presentation only, so it lives in code rather than the database — but it is
 * keyed by slug, so a new category degrades to a sensible default instead of
 * breaking the build.
 */
const CATEGORY_ICONS: Record<string, string> = {
  'weight-management': 'scale-check',
  'sexual-wellness': 'gender-bolt',
  'hair-restoration': 'sprout',
  'peptides-wellness': 'molecule',
  'wellness-foundations': 'leaf',
  'telehealth-resources': 'lock',
};

export function categoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? 'heart';
}

let cache: Promise<{ categories: Category[]; articles: ArticleWithCategory[] }> | null = null;

function load() {
  cache ??= (async () => {
    const [cats, arts] = await Promise.all([
      db.from('blog_categories').select('id, slug, name, description, position').order('position'),
      // RLS already restricts anon to published rows; the filter is explicit so
      // the intent survives any future policy change.
      db.from('blog_articles').select(ARTICLE_FIELDS).eq('status', 'published').order('position'),
    ]);

    if (cats.error) throw new Error(`Loading categories failed: ${cats.error.message}`);
    if (arts.error) throw new Error(`Loading articles failed: ${arts.error.message}`);

    const categories = (cats.data ?? []) as Category[];
    const byId = new Map(categories.map((c) => [c.id, c]));

    const articles: ArticleWithCategory[] = [];
    for (const row of (arts.data ?? []) as Article[]) {
      const category = byId.get(row.category_id);
      // A published article whose category vanished would render a broken
      // breadcrumb; skipping it loudly beats shipping that.
      if (!category) {
        console.warn(`[blog] skipping "${row.slug}" — unknown category ${row.category_id}`);
        continue;
      }
      articles.push({ ...row, category });
    }
    return { categories, articles };
  })();
  return cache;
}

export async function getCategories(): Promise<Category[]> {
  return (await load()).categories;
}

export async function getArticles(): Promise<ArticleWithCategory[]> {
  return (await load()).articles;
}

/** Categories in display order, each with its articles. Powers the hub page. */
export async function getCategoriesWithArticles(): Promise<
  Array<Category & { articles: ArticleWithCategory[] }>
> {
  const { categories, articles } = await load();
  return categories
    .map((c) => ({ ...c, articles: articles.filter((a) => a.category_id === c.id) }))
    .filter((c) => c.articles.length > 0);
}

/** Hand-picked articles for the hub's Featured row, in slot order. */
export async function getFeaturedArticles(): Promise<ArticleWithCategory[]> {
  return (await load()).articles
    .filter((a) => a.featured_position !== null)
    .sort((a, b) => (a.featured_position ?? 0) - (b.featured_position ?? 0));
}

/**
 * Up to `limit` other articles from the same category, wrapping around so the
 * last article in a category still gets a full set of suggestions.
 */
export async function getRelatedArticles(
  article: ArticleWithCategory,
  limit = 3
): Promise<ArticleWithCategory[]> {
  const siblings = (await load()).articles.filter(
    (a) => a.category_id === article.category_id && a.id !== article.id
  );
  const start = siblings.findIndex((a) => a.position > article.position);
  const from = start === -1 ? 0 : start;
  return [...siblings.slice(from), ...siblings.slice(0, from)].slice(0, limit);
}
