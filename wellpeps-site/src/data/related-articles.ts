/**
 * Which Learning Center articles each program page and product page links to ("Learn more" block,
 * src/components/LearnMore.astro). Search engines find and weigh the articles through these links, and the
 * program pages gain a path to them (SEO audit 2026-11-22: every program page linked to one article).
 *
 * Slugs only: the titles come from the Learning Center itself, so a link always shows the article's own
 * title, and an article that is not published is left out rather than linked. related-articles.test.ts checks
 * every slug against the article list, so a typo fails the tests.
 */
import type { ProgramSlug } from '../lib/cta';

export interface PageLink {
  href: string;
  label: string;
}

/** Up to five per program page, most useful first. */
export const PROGRAM_ARTICLES: Readonly<Record<ProgramSlug, readonly string[]>> = {
  'weight-loss': [
    'semaglutide-vs-tirzepatide',
    'oral-vs-injectable-glp1-medications',
    'common-glp1-side-effects',
    'could-you-be-a-candidate-for-glp1-weight-management',
  ],
  'hair-restoration': ['oral-vs-topical-minoxidil', 'finasteride-explained', 'understanding-hair-loss', 'why-hair-growth-takes-time'],
  'sexual-wellness': [
    'sildenafil-vs-tadalafil',
    'daily-vs-on-demand-ed-medication',
    'understanding-erectile-dysfunction',
    'when-to-talk-to-a-healthcare-provider-about-ed',
  ],
  'healthy-aging': ['sermorelin-explained', 'nad-explained', 'glutathione-explained', 'mic-b12-explained'],
  // No hormone articles yet (audit task 21): these cover the labs and review steps both programs use.
  'mens-hormone-therapy': ['understanding-laboratory-testing', 'personalized-treatment-plans', 'common-causes-of-low-libido-in-men'],
  'womens-hormone-therapy': ['understanding-laboratory-testing', 'personalized-treatment-plans', 'how-telehealth-works'],
  peptides: ['what-are-peptides', 'sermorelin-explained', 'nad-explained'],
};

/** Other WellPeps pages a program's block also links to. */
export const PROGRAM_RELATED_PAGES: Readonly<Partial<Record<ProgramSlug, readonly PageLink[]>>> = {
  peptides: [
    { href: '/healthy-aging/sermorelin/', label: 'Sermorelin' },
    { href: '/healthy-aging/', label: 'Healthy Aging & Vitality therapies' },
  ],
};

/** Product pages with their own picks, keyed by page path. Any other product uses its program's first two. */
export const PRODUCT_ARTICLES: Readonly<Record<string, readonly string[]>> = {
  '/weight-loss/compounded-semaglutide/': ['semaglutide-vs-tirzepatide', 'understanding-glp1-medications', 'common-glp1-side-effects'],
  '/weight-loss/compounded-tirzepatide/': ['semaglutide-vs-tirzepatide', 'understanding-glp1-medications', 'common-glp1-side-effects'],
  '/weight-loss/oral-semaglutide/': ['oral-vs-injectable-glp1-medications', 'semaglutide-vs-tirzepatide'],
  '/weight-loss/oral-tirzepatide/': ['oral-vs-injectable-glp1-medications', 'semaglutide-vs-tirzepatide'],
  '/hair-restoration/oral-finasteride/': ['finasteride-explained', 'male-pattern-baldness'],
  '/hair-restoration/oral-minoxidil/': ['oral-vs-topical-minoxidil', 'understanding-hair-loss'],
  '/hair-restoration/topical-minoxidil/': ['oral-vs-topical-minoxidil', 'understanding-hair-loss'],
  '/hair-restoration/topical-minoxidil-finasteride/': ['oral-vs-topical-minoxidil', 'finasteride-explained'],
  '/hair-restoration/topical-finasteride-minoxidil-tretinoin/': ['oral-vs-topical-minoxidil', 'finasteride-explained'],
  '/sexual-wellness/tadalafil-daily/': ['daily-vs-on-demand-ed-medication', 'sildenafil-vs-tadalafil'],
  '/sexual-wellness/tadalafil-as-needed/': ['sildenafil-vs-tadalafil', 'daily-vs-on-demand-ed-medication'],
  '/sexual-wellness/sildenafil-as-needed/': ['sildenafil-vs-tadalafil', 'daily-vs-on-demand-ed-medication'],
  '/healthy-aging/sermorelin/': ['sermorelin-explained', 'what-are-peptides'],
  '/healthy-aging/nad-injection/': ['nad-explained'],
  '/healthy-aging/nad-nasal-spray/': ['nad-explained'],
  '/healthy-aging/glutathione/': ['glutathione-explained'],
  '/healthy-aging/mic-b12/': ['mic-b12-explained'],
  '/healthy-aging/lipo-c/': ['mic-b12-explained'],
  '/healthy-aging/methylene-blue/': ['healthy-aging'],
};

const PRODUCT_DEFAULT_COUNT = 2;
/** Programs whose product pages share one pick: the six peptide pages link to the peptide explainer only. */
const PROGRAM_PRODUCT_DEFAULT: Readonly<Partial<Record<ProgramSlug, readonly string[]>>> = {
  peptides: ['what-are-peptides'],
};

/** The article slugs a product page links to. */
export function articlesForProduct(path: string, program: ProgramSlug): readonly string[] {
  return PRODUCT_ARTICLES[path] ?? PROGRAM_PRODUCT_DEFAULT[program] ?? PROGRAM_ARTICLES[program].slice(0, PRODUCT_DEFAULT_COUNT);
}

export const articlePath = (slug: string): string => `/wellness-learning-center/${slug}/`;

/**
 * The published articles for a list of slugs, in the list's order. A slug with no published article is
 * dropped, so a block never links to a page that is not there.
 */
export function pickArticles<T extends { slug: string }>(slugs: readonly string[], published: readonly T[]): T[] {
  return slugs.map((slug) => published.find((a) => a.slug === slug)).filter((a): a is T => a !== undefined);
}
