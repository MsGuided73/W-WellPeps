/**
 * How the free Smart Patient Guides are offered, and where each guide lives.
 *
 * Two flows share one codebase so the current one is never thrown away while the other is tried:
 *
 *   'dialog'   (default; what is live today) every "get the guide" button opens an email dialog on
 *              the page it is on (src/components/EbookOffer.astro).
 *   'landing'  Derek's guide-funnel strategy: the home page shows a 3D ring of covers, program pages
 *              and articles link to one landing page per guide, the form on that page leads to a
 *              thank-you page, and /smart-patient-guides lists every guide.
 *
 * The flow is chosen at build time with PUBLIC_GUIDE_FLOW (see GUIDE_FLOW in src/config.ts and
 * docs/GUIDE-FLOW.md). Unset means 'dialog', so nothing changes until it is set to 'landing'.
 */
import type { ProgramSlug } from './cta';
import { EBOOKS, ebooksFor, ebooksForCategory, type Ebook } from '../data/ebooks';

export type GuideFlow = 'dialog' | 'landing';

export function parseGuideFlow(raw: unknown): GuideFlow {
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'landing' ? 'landing' : 'dialog';
}

export const GUIDES_INDEX_PATH = '/smart-patient-guides';

export function guidePath(slug: string): string {
  return `${GUIDES_INDEX_PATH}/${slug}`;
}

export function guideThanksPath(slug: string): string {
  return `${guidePath(slug)}/thank-you`;
}

/** The guide a program page promotes. Healthy Aging has two guides; its own comes first. */
export function primaryGuideFor(program: ProgramSlug): Ebook | undefined {
  return ebooksFor(program)[0];
}

interface ArticleRef {
  slug: string;
  title: string;
  category: { slug: string };
}

/** NAD+ sits inside the healthy-aging category; "nad" must be a whole word so "Canada" never matches. */
const NAD_WORD = /\bnad\b/i;

/** The guide an article should point to: its category's guide, or the NAD+ guide for an NAD+ article. */
export function guideForArticle(article: ArticleRef): Ebook | undefined {
  if (article.category.slug === 'peptides-wellness' && NAD_WORD.test(`${article.slug} ${article.title}`)) {
    return EBOOKS.find((book) => book.slug === 'nad-therapy');
  }
  return ebooksForCategory(article.category.slug)[0];
}

/**
 * Splits an article's HTML before one of its section headings, so a call to action can sit about
 * halfway through. Returns the whole article and an empty second half when it has fewer than two
 * sections (there is nowhere sensible to break). The table of contents links still work, because
 * the two halves are rendered one after the other.
 */
export function splitAtMiddleSection(html: string): [string, string] {
  const starts = [...html.matchAll(/<h2[\s>]/g)].map((m) => m.index ?? 0);
  if (starts.length < 2) return [html, ''];
  const at = starts[Math.max(1, Math.floor(starts.length / 2))];
  return [html.slice(0, at), html.slice(at)];
}

/**
 * HTML for a line of copy with "GLP-1" kept on one line (a line must not break after its hyphen).
 * The text is escaped; the characters stay the ordinary "GLP-1", so search and copy-paste still
 * match. Use with set:html. The .nb class is in src/styles/global.css.
 */
export function keepGlpTogether(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return escaped.replace(/GLP-1/g, '<span class="nb">GLP-1</span>');
}
