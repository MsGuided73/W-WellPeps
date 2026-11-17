/**
 * Cuts a Learning Center article body into pieces at section boundaries, so the page can place things
 * between sections: the guide offer partway through, and a "how it works" diagram at the end of the section
 * it explains. Every cut falls just before an <h2>, so no section is ever split in two.
 */

export type BodyInsert = 'diagram' | 'guide';

export interface BodySegment {
  html: string;
  /** What the page shows after this piece of the body, if anything. */
  after?: BodyInsert;
}

/** Offsets of every section heading (<h2>) in the body. */
function sectionStarts(html: string): number[] {
  return [...html.matchAll(/<h2[\s>]/g)].map((m) => m.index ?? 0);
}

/** Where the section after the middle one starts: the guide offer's place (same rule as splitAtMiddleSection). */
export function middleSectionStart(html: string): number | undefined {
  const starts = sectionStarts(html);
  if (starts.length < 2) return undefined;
  return starts[Math.max(1, Math.floor(starts.length / 2))];
}

/**
 * The end of the section whose heading has `headingId`: where the next <h2> starts, or the end of the body
 * for the last section. Undefined when no heading has that id.
 */
export function sectionEnd(html: string, headingId: string): number | undefined {
  const escaped = headingId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`<h2[^>]*\\bid="${escaped}"`).exec(html);
  if (!heading) return undefined;
  return sectionStarts(html).find((start) => start > heading.index) ?? html.length;
}

/**
 * Cuts `html` at each insert's offset. Two inserts at the same place keep the diagram first, since it
 * belongs to the section that just ended.
 */
export function splitBody(html: string, inserts: readonly { at: number; insert: BodyInsert }[]): BodySegment[] {
  const order: Record<BodyInsert, number> = { diagram: 0, guide: 1 };
  const sorted = [...inserts].sort((a, b) => a.at - b.at || order[a.insert] - order[b.insert]);
  const segments: BodySegment[] = [];
  let from = 0;
  for (const { at, insert } of sorted) {
    segments.push({ html: html.slice(from, at), after: insert });
    from = at;
  }
  segments.push({ html: html.slice(from) });
  return segments;
}
