/**
 * The "MD Reviewed" seal: one SVG (src/assets/badges/md-reviewed-seal.svg) drawn inline wherever an article
 * has a physician review (src/data/medical-review.ts). Shared by the Astro badge component and the Learning
 * Center search script, so every placement draws the same artwork.
 *
 * The seal always sits next to visible text ("MD Reviewed" or the reviewer's name), so inline it is
 * decorative: the title is removed and it is hidden from screen readers. The standalone file keeps its
 * title for use outside the site.
 */
import raw from '../assets/badges/md-reviewed-seal.svg?raw';

/** Inline, decorative markup for the seal at `size` CSS pixels. */
export function sealMarkup(size: number, className = 'md-seal'): string {
  return raw
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/, '')
    .replace(/\srole="img"/, '')
    .replace(/\saria-labelledby="[^"]*"/, ' aria-hidden="true" focusable="false"')
    .replace(/width="48" height="48"/, `width="${size}" height="${size}" class="${className}"`)
    .trim();
}

/** The short label that always accompanies the seal on cards and lists. */
export const MD_REVIEWED_LABEL = 'MD Reviewed';
