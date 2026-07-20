/**
 * Table-of-contents support for Learning Center articles.
 *
 * Article bodies are stored as plain HTML (converted from the client's .docx
 * originals), so headings arrive without ids. We add them at build time and
 * pull out the list the "In this article" panel renders from — deriving both
 * from one pass guarantees every link has a matching target.
 *
 * Only <h2> is indexed: <h3> exists in a handful of articles but is a
 * sub-point, and listing it would make the panel longer than the lede.
 */

export interface TocEntry {
  id: string;
  text: string;
}

/** "What Is GLP-1?" -> "what-is-glp-1" */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function decode(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x27;|&apos;/g, "'")
    .trim();
}

/**
 * Returns the body with `id` attributes on every <h2>, plus the TOC entries.
 * Duplicate headings get a numeric suffix so ids stay unique within a page.
 */
export function withToc(bodyHtml: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();

  const html = bodyHtml.replace(/<h2>([\s\S]*?)<\/h2>/g, (_match, inner: string) => {
    const text = decode(inner);
    const base = slugify(text) || 'section';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });

  return { html, toc };
}
