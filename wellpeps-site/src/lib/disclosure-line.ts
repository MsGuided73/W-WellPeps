/**
 * Short-form disclosures for the phone layout (owner, 2026-11-21: "less wordy"). A phone card shows two
 * tags, and the price box shows one small line under its button; the full wording lives on each
 * product's page. Every word comes from PRODUCT_DISCLOSURES, so the phone and desktop can't disagree.
 */
import { disclosureFor, SAFETY_PAGE } from '../data/product-disclosures';
import type { ProgramSlug } from './cta';

/** Where "Safety info" goes when a program has no safety page yet. */
export const FALLBACK_SAFETY_PAGE = '/medical-disclaimer';

export interface ShortDisclosure {
  /** Card tags: always "Rx", then "Compounded" or "Off-label" when it applies. */
  tags: string[];
  /** The price box line, e.g. ["Rx required", "Compounded, not FDA-approved", "Not with nitrates"]. */
  line: string[];
  /** The program's safety information page. */
  safetyHref: string;
}

/** "Not for use with nitrate medicines." becomes "Not with nitrates"; any other note is kept as written. */
function shortNote(note: string): string {
  return /nitrate/i.test(note) ? 'Not with nitrates' : note.replace(/\.$/, '');
}

export function shortDisclosure(program: ProgramSlug, name: string): ShortDisclosure {
  const d = disclosureFor(program, name);
  const tags = ['Rx'];
  const line = ['Rx required'];
  if (d.regulatory === 'compounded') {
    tags.push('Compounded');
    line.push('Compounded, not FDA-approved');
  } else if (d.regulatory === 'off-label') {
    tags.push('Off-label');
    line.push('Off-label use');
  }
  if (d.note) line.push(shortNote(d.note));
  return { tags, line, safetyHref: SAFETY_PAGE[program] ?? FALLBACK_SAFETY_PAGE };
}
