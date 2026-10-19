/**
 * The read-online pages of a published Smart Patient Guide: one image and the text of each PDF page,
 * written by scripts/publish-ebook.py into src/data/ebook-pages/<slug>.json (images in public/ebooks/<slug>/).
 * A guide has a read-online page only when it is published (`pdf` set in src/data/ebooks.ts) and its pages exist.
 */
export interface EbookPage {
  /** The page image, e.g. /ebooks/glp-1-weight-loss/page-01.webp */
  src: string;
  /** The page's words, for screen readers. */
  text: string;
}

export interface EbookPages {
  /** The PDF the pages were made from, e.g. glp-1-weight-loss_ebook-v19.pdf */
  source: string;
  /** First published on the site (YYYY-MM-DD); kept when a new version is published. */
  publishedOn: string;
  /** The day the current version was published (YYYY-MM-DD). */
  updatedOn: string;
  width: number;
  height: number;
  pages: EbookPage[];
}

const files = import.meta.glob<{ default: EbookPages }>('./ebook-pages/*.json', { eager: true });

export function ebookPagesFor(slug: string): EbookPages | undefined {
  return files[`./ebook-pages/${slug}.json`]?.default;
}
