/**
 * Where a "Start Free Assessment" button goes, and whether it may be shown.
 *
 * One rule: a program is open when its GEN Health link is real, and coming
 * soon while it is still a stub. Pasting a link into src/config.ts is the whole
 * launch switch for that program — there is no separate flag to forget.
 */
// config.ts imports only a *type* from this module, so this is a one-way
// runtime dependency. Keep that import type-only or this becomes a real cycle.
import { CTA_LINKS } from '../config';
import { isLinked } from './links';

export const PROGRAM_SLUGS = ['weight-loss', 'hair-restoration', 'sexual-wellness', 'healthy-aging'] as const;
export type ProgramSlug = (typeof PROGRAM_SLUGS)[number];

/** The only wording used on an assessment button, site-wide. */
export const ASSESSMENT_CTA_LABEL = 'Start Free Assessment';

/** Generic CTAs land on the home page's program cards until the GEN Health
 *  storefront link exists, so they are never a dead button. */
export const GENERIC_FALLBACK_HREF = '/#programs';

/** Where each program's treatment cards live, for program-level buttons that
 *  have no single GEN Health link to go to (see createCtaResolver). */
const PROGRAM_TREATMENTS_HREF: Readonly<Record<ProgramSlug, string>> = {
  'weight-loss': '/weight-loss#weight-products',
  'hair-restoration': '/hair-restoration#hair-products',
  'sexual-wellness': '/sexual-wellness#sex-products',
  'healthy-aging': '/healthy-aging#peptide-products',
};

export interface ProductLink {
  program: ProgramSlug;
  url: string;
}

export interface CtaLinks {
  storefront: string;
  programs: Readonly<Record<ProgramSlug, string>>;
  /** GEN Health sells individual treatments, so most links are per product
   *  card. Keyed by toProductKey(card name). */
  products: Readonly<Record<string, ProductLink>>;
}

export interface ResolvedCta {
  href: string;
  isComingSoon: boolean;
  /** What the button starts: a product key, a program, or 'any' when the
   *  visitor has not chosen yet. */
  target: string;
}

export type CtaResolver = (program?: ProgramSlug, product?: string) => ResolvedCta;

export function createCtaResolver(links: CtaLinks): CtaResolver {
  return (program, product) => {
    if (!program) {
      const href = isLinked(links.storefront) ? links.storefront : GENERIC_FALLBACK_HREF;
      return { href, isComingSoon: false, target: 'any' };
    }
    const programHref = links.programs[program];
    if (product) {
      // A card uses its own link, else the program's; with neither it is not open.
      const productHref = links.products[product]?.url ?? '';
      const href = isLinked(productHref) ? productHref : programHref;
      return { href, isComingSoon: !isLinked(href), target: product };
    }
    if (isLinked(programHref)) return { href: programHref, isComingSoon: false, target: program };
    // No program-wide link: once any of the program's treatments is open, send
    // the visitor to the treatment cards to pick one.
    const hasOpenProduct = Object.values(links.products).some((p) => p.program === program && isLinked(p.url));
    return hasOpenProduct
      ? { href: PROGRAM_TREATMENTS_HREF[program], isComingSoon: false, target: program }
      : { href: programHref, isComingSoon: true, target: program };
  };
}

/** Product-card name → key used in CTA_LINKS.products ("Oral Semaglutide" →
 *  "oral-semaglutide"). */
export function toProductKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Narrow untrusted input (e.g. a Learning Center article's category from
 *  Supabase) to a program slug; unknown values fall back to the generic CTA. */
export function toProgramSlug(value: string | undefined): ProgramSlug | undefined {
  return PROGRAM_SLUGS.find((slug) => slug === value);
}

/** The site's resolver, bound to the links in src/config.ts. */
export const resolveCta: CtaResolver = createCtaResolver(CTA_LINKS);
