/**
 * What every product card must say beside the product (compliance build list W10; the legal
 * placement guide, section 4): that a prescription is required, whether the product is
 * compounded or prescribed off-label, a link to the program's safety information, and next to the
 * price that the plan renews monthly and can be cancelled.
 *
 * The status of each product is a regulatory and clinical fact, so it is decided HERE, in one
 * place a medical director or counsel can read, and not guessed in a component. A product that
 * is not listed stops the build (disclosureFor throws), so a new product cannot appear on a card
 * without someone deciding what it must disclose.
 *
 * The wording is the draft Medical Disclaimer set (A8, Blocks 4 and 5), pending counsel.
 * Items marked VERIFY below wait for the pharmacy roster (X5) or the medical director.
 */
import type { ProgramSlug } from '../lib/cta';

export type Regulatory = 'compounded' | 'off-label';

export interface ProductDisclosure {
  /** Compounded and off-label products carry a tag; an FDA-approved product has none. */
  regulatory?: Regulatory;
  /** A product-specific warning shown on the card. */
  note?: string;
}

/** Block 5, "very short" form, for product cards. */
export const RX_LINE = 'Prescription required; not guaranteed.';
/** Block 4, "short form (product cards, ads, social)". */
export const COMPOUNDED_SENTENCE = 'Compounded medications are not FDA-approved and are not evaluated by FDA for safety, effectiveness or quality.';
/** What "off-label" means, in the words of Block 5 (Hair): a use FDA has not approved. */
export const OFF_LABEL_SENTENCE = 'Prescribed for a use FDA has not approved.';
/** Beside every price (Refund, Cancellation and Auto-Renewal Policy, A10). */
export const RENEWAL_LINE = 'Renews monthly, cancel anytime.';

export const TAG_LABEL: Record<Regulatory, string> = {
  compounded: 'Compounded medication',
  'off-label': 'Off-label use',
};

/** The program's safety page (A14 to A17). */
export const SAFETY_PAGE: Record<ProgramSlug, string> = {
  'weight-loss': '/safety/glp-1',
  'sexual-wellness': '/safety/sexual-health',
  'hair-restoration': '/safety/hair-loss',
  'healthy-aging': '/safety/healthy-aging',
};

/** Where "What compounded means" goes (B5, which also explains off-label use). */
export const COMPOUNDED_PAGE = '/compounded-medications';
export const REFUND_PAGE = '/refund-and-cancellation';

const NITRATE_NOTE = 'Not for use with nitrate medicines.';

export const PRODUCT_DISCLOSURES: Record<ProgramSlug, Record<string, ProductDisclosure>> = {
  'weight-loss': {
    'Compounded Semaglutide': { regulatory: 'compounded' },
    'Compounded Tirzepatide': { regulatory: 'compounded' },
    // The card must not imply FDA approval of an oral tirzepatide (none exists). The oral cards are
    // still to be renamed "Compounded Oral ..." (decision pending), so the tag does that work meanwhile.
    'Oral Semaglutide': { regulatory: 'compounded' },
    'Oral Tirzepatide': { regulatory: 'compounded' },
  },
  'sexual-wellness': {
    // VERIFY with the pharmacy roster whether a compounded form is dispensed; if so, tag it.
    'Tadalafil Daily': { note: NITRATE_NOTE },
    'Tadalafil As Needed': { note: NITRATE_NOTE },
    'Sildenafil As Needed': { note: NITRATE_NOTE },
  },
  'hair-restoration': {
    'Oral Finasteride': {},
    'Oral Minoxidil': { regulatory: 'off-label' },
    'Topical Minoxidil': {},
    'Topical Minoxidil + Finasteride': { regulatory: 'compounded' },
    'Topical Finasteride + Minoxidil + Tretinoin': { regulatory: 'compounded' },
  },
  'healthy-aging': {
    // Every product in this program is compounded. VERIFY the ingredients of MIC + B12 and Lipo-C
    // with the pharmacy before they are published; no product label may contain "Fat Burn".
    Sermorelin: { regulatory: 'compounded' },
    // Covers both forms on the NAD+ card (injection and nasal spray); both are compounded.
    'NAD+': { regulatory: 'compounded' },
    Glutathione: { regulatory: 'compounded' },
    'MIC + B12': { regulatory: 'compounded' },
    'Lipo-C': { regulatory: 'compounded' },
    'Methylene Blue': { regulatory: 'compounded' },
  },
};

/** The disclosure for a product. Throws for an unlisted product, so the build stops until someone decides. */
export function disclosureFor(program: ProgramSlug, name: string): ProductDisclosure {
  const found = PRODUCT_DISCLOSURES[program]?.[name];
  if (!found) {
    throw new Error(
      `No product disclosure for "${name}" in ${program}. Add it to PRODUCT_DISCLOSURES in src/data/product-disclosures.ts: ` +
        'say whether it is compounded, off-label or neither (the medical director confirms).',
    );
  }
  return found;
}
