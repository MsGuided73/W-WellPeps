/**
 * One product page per product card: /<program>/<product-slug>/ (src/pages/[program]/[product].astro).
 *
 * Every page is built from the data files the program pages already render, so a product page can never say
 * something its card does not: the title is the card name, the description is the card's approved description,
 * and the price, link and disclosure are the card's own. Nothing here is marketing copy.
 *
 * Adding a program is one entry in PROGRAM_SOURCES (its slug, page path and a mapper from its data file).
 * A product sold in two forms with their own prices and links (NAD+ injection / nasal spray) gets one page
 * per form; a product sold as plans of different lengths (Testosterone Cypionate 1 month / 3 months) is
 * one page with a plan toggle.
 *
 * Phone and desktop cards link here through productPath(program, name).
 */
import { weightProducts } from '../data/weight';
import { hairProducts } from '../data/hair';
import { sexProducts } from '../data/sexual';
import { VIAL_ALT, peptideProducts } from '../data/peptide';
import { HORMONE_PAGES, type HormonePage, type ProgramPageCore } from '../data/hormone';
import { peptidesPage } from '../data/peptides';
import { SAFETY_PAGE, disclosureFor, type ProductDisclosure } from '../data/product-disclosures';
import { resolveCta, toProductKey, type ProgramSlug } from './cta';
import { programAt } from './seo/catalog';

export type ImageStyle = 'vial' | 'photo';

export interface ProductPlan {
  /** Toggle label, e.g. "1 month"; for a single-plan product, the form. */
  label: string;
  /** Whole dollars, e.g. "179"; undefined while the price is not set. */
  price?: string;
  /** "/month" or "/3 months". */
  priceUnit: string;
  /** Product name whose slug is the GEN Health link key (toProductKey). */
  product: string;
  /** Renewal wording when the plan does not renew monthly. */
  renewal?: string;
  /** Has both a price and a live GEN Health link. Otherwise the plan shows "Coming soon". */
  isLive: boolean;
}

export interface ProductPage {
  program: ProgramSlug;
  /** The program page, with its trailing slash: /weight-loss/ */
  programPath: string;
  programName: string;
  slug: string;
  /** This page: /weight-loss/compounded-semaglutide/ */
  path: string;
  /** Card name: the key in PRODUCT_DISCLOSURES ('NAD+' for both NAD+ forms). */
  name: string;
  /** The name the card's CTA is looked up by (variant product for NAD+ Nasal Spray, else the card name). */
  product: string;
  /** Page heading: the card name, plus the form for a product sold in several forms. */
  title: string;
  /** Delivery method label from the card, e.g. "Weekly Injection". */
  form: string;
  /** The card's approved description, unchanged. */
  description: string;
  image: string;
  alt: string;
  imageStyle: ImageStyle;
  /** First plan's price (convenience for single-plan products). */
  price?: string;
  priceUnit: string;
  /** Always at least one; two or more show a plan toggle. */
  plans: ProductPlan[];
  /** State limit shown on the card, e.g. "Not available to California residents." */
  availability?: string;
  disclosure: ProductDisclosure;
  /** No plan is live: the page shows "Coming soon" and a disabled button. */
  isComingSoon: boolean;
  /** An extra line for "What's included" (hormone therapy: labs are billed separately). */
  includedExtra?: string;
}

/** What a program's data file supplies for one page; the rest is filled in by buildPages. */
interface Draft {
  name: string;
  product?: string;
  title?: string;
  form: string;
  description: string;
  image: string;
  alt: string;
  imageStyle?: ImageStyle;
  price?: string;
  plans?: Omit<ProductPlan, 'isLive'>[];
  availability?: string;
}

interface ProgramSource {
  program: ProgramSlug;
  includedExtra?: string;
  drafts: () => Draft[];
}

const MONTH = '/month';

/** Hormone and Peptide Therapy pages share the program-page shape (ProgramPageCore). */
const hormoneDrafts = (page: ProgramPageCore): Draft[] =>
  page.products.items.map((p) => ({
    name: p.name,
    form: p.methodOfUse,
    description: p.description,
    image: p.image,
    alt: p.alt,
    price: p.price,
    plans: p.plans && p.plans.length > 1 ? p.plans : undefined,
  }));

const hormonePage = (program: ProgramSlug): HormonePage => {
  const page = HORMONE_PAGES.find((h) => h.program === program);
  if (!page) throw new Error(`No hormone page for ${program}`);
  return page;
};

/** Every program with product pages. Order is the site's program order. */
export const PROGRAM_SOURCES: readonly ProgramSource[] = [
  {
    program: 'weight-loss',
    drafts: () => weightProducts.map((p) => ({
      name: p.name, form: p.delivery.label, description: p.description, image: p.image, alt: p.alt,
      price: p.price, availability: p.availability,
    })),
  },
  {
    program: 'hair-restoration',
    drafts: () => hairProducts.map((p) => ({
      name: p.name, form: p.methodOfUse, description: p.description, image: p.image, alt: p.alt, price: p.price,
    })),
  },
  {
    program: 'sexual-wellness',
    drafts: () => sexProducts.map((p) => ({
      name: p.name, form: p.methodOfUse, description: p.description, image: p.image, alt: p.alt, price: p.price,
    })),
  },
  {
    program: 'healthy-aging',
    // The vial cutouts (not the lifestyle photos) are the product images here, as on the cards.
    drafts: () => peptideProducts.flatMap((p): Draft[] =>
      p.variants && p.variants.length > 1
        ? p.variants.map((v) => ({
            name: p.name, product: v.product, title: `${p.name} ${v.label}`, form: v.methodOfUse,
            description: p.description, image: v.vial, alt: VIAL_ALT[v.vial] ?? '', imageStyle: 'vial', price: v.price,
          }))
        : [{
            name: p.name, form: p.methodOfUse, description: p.description, image: p.vial, alt: VIAL_ALT[p.vial] ?? '',
            imageStyle: 'vial', price: p.price,
          }]),
  },
  {
    program: 'mens-hormone-therapy',
    includedExtra: 'Lab tests for hormone therapy are billed separately.',
    drafts: () => hormoneDrafts(hormonePage('mens-hormone-therapy')),
  },
  {
    program: 'womens-hormone-therapy',
    includedExtra: 'Lab tests for hormone therapy are billed separately.',
    drafts: () => hormoneDrafts(hormonePage('womens-hormone-therapy')),
  },
  {
    program: 'peptides',
    drafts: () => hormoneDrafts(peptidesPage),
  },
];

/** The URL segment for a product: "Topical Minoxidil + Finasteride" -> "topical-minoxidil-finasteride". */
export function productSlug(title: string): string {
  return toProductKey(title);
}

/** A plan is live when it has a price and its GEN Health link is switched on (src/config.ts LIVE_PRODUCTS). */
export function isPlanLive(program: ProgramSlug, product: string, price: string | undefined): boolean {
  return Boolean(price) && !resolveCta(program, toProductKey(product)).isComingSoon;
}

function buildPage(source: ProgramSource, d: Draft): ProductPage {
  const { program } = source;
  const programPath = `/${program}/`;
  const title = d.title ?? d.name;
  const slug = productSlug(title);
  const product = d.product ?? d.name;
  if (!d.alt.trim()) throw new Error(`No alt text for the image of ${title} (${program})`);
  const plans: ProductPlan[] = (d.plans ?? [{ label: d.form, price: d.price, priceUnit: MONTH, product }])
    .map((p) => ({ ...p, isLive: isPlanLive(program, p.product, p.price) }));
  return {
    program,
    programPath,
    programName: programAt(programPath).name,
    slug,
    path: `${programPath}${slug}/`,
    name: d.name,
    product,
    title,
    form: d.form,
    description: d.description,
    image: d.image,
    alt: d.alt,
    imageStyle: d.imageStyle ?? 'photo',
    price: plans[0].price,
    priceUnit: plans[0].priceUnit,
    plans,
    availability: d.availability,
    disclosure: disclosureFor(program, d.name),
    isComingSoon: plans.every((p) => !p.isLive),
    includedExtra: source.includedExtra,
  };
}

/** Every product page, in program order. */
export const PRODUCT_PAGES: readonly ProductPage[] = PROGRAM_SOURCES.flatMap((s) => s.drafts().map((d) => buildPage(s, d)));

/**
 * The page for a product card. `name` is the card's product name (the name its CTA uses): e.g.
 * productPath('healthy-aging', 'NAD+ Nasal Spray'), productPath('mens-hormone-therapy', 'Testosterone Cypionate').
 * A plan's product name ('Testosterone Cypionate 3 Month') or the page title also resolves. Throws for an unknown
 * product, so a card can never link to a page that is not built.
 */
export function productPath(program: ProgramSlug, name: string): string {
  const inProgram = PRODUCT_PAGES.filter((p) => p.program === program);
  const found =
    inProgram.find((p) => p.product === name) ??
    inProgram.find((p) => p.title === name || p.plans.some((pl) => pl.product === name)) ??
    inProgram.find((p) => p.name === name);
  if (!found) throw new Error(`No product page for "${name}" in ${program} (src/lib/products.ts)`);
  return found.path;
}

/** getStaticPaths for src/pages/[program]/[product].astro. */
export function productRoutes(): { params: { program: ProgramSlug; product: string }; props: { page: ProductPage } }[] {
  return PRODUCT_PAGES.map((page) => ({ params: { program: page.program, product: page.slug }, props: { page } }));
}

/** "Weekly Injection" -> "Weekly injection" (tag text). */
export function sentenceCase(label: string): string {
  return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : label;
}

/** "/month" -> "/mo" for the compact phone price bar; other units unchanged. */
export function shortUnit(unit: string): string {
  return unit === MONTH ? '/mo' : unit;
}

const TITLE_MAX = 65;

/** <title>: "Sermorelin: Provider-Guided Treatment | WellPeps", shortened for long names. */
export function pageTitle(page: Pick<ProductPage, 'title'>): string {
  const options = [`${page.title}: Provider-Guided Treatment | WellPeps`, `${page.title} Treatment | WellPeps`];
  return options.find((t) => t.length <= TITLE_MAX) ?? `${page.title} | WellPeps`;
}

const DESCRIPTION_TARGET = 160;
/** scripts/seo-check.mjs fails a description over 260 characters; stay clear of it. */
const DESCRIPTION_MAX = 240;
const RX_SUFFIX = 'Prescription required.';

/**
 * Meta description: the card's approved description (its first sentence when the whole one is too long for a
 * search result) + "Prescription required." The title leads when the description does not already start with it,
 * so two forms of one product (which share a description) still get different descriptions.
 */
export function metaDescription(page: Pick<ProductPage, 'title' | 'description'>): string {
  const desc = page.description.replace(/\s+/g, ' ').trim();
  const lead = desc.toLowerCase().startsWith(page.title.toLowerCase()) ? '' : `${page.title}: `;
  const first = desc.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? desc;
  const whole = `${lead}${desc} ${RX_SUFFIX}`;
  if (whole.length <= DESCRIPTION_TARGET) return whole;
  // Over the target: the first sentence, keeping the title lead (two forms of one product share a description)
  // unless that would pass the hard limit search tools cut at.
  const short = `${lead}${first} ${RX_SUFFIX}`;
  return short.length <= DESCRIPTION_MAX ? short : `${first} ${RX_SUFFIX}`;
}

/**
 * The price terms sentence (DEFAULT_TERMS in PhonePriceBox.astro) as check-list items:
 * "Includes a, b, and c. Full refund if not prescribed." -> ["A", "B", "C", "Full refund if not prescribed."]
 */
export function termsItems(terms: string): string[] {
  const [first, ...rest] = terms.split(/(?<=\.)\s+/);
  const body = first.replace(/^Includes\s+/i, '').replace(/\.$/, '');
  const parts = body.split(/,\s*(?:and\s+)?|\s+and\s+(?=[^,]*$)/).map((s) => s.trim()).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [...parts.map(cap), ...rest.map((s) => s.trim()).filter(Boolean)];
}

/** Where a program without its own safety page sends "safety information" (A8, approved). */
export const SAFETY_FALLBACK = '/medical-disclaimer';

export interface PageLink {
  href: string;
  label: string;
}

/**
 * The program's safety page, or the Medical Disclaimer while the program has none (Women's Hormone Therapy).
 * `isVisible` is linkVisible bound to the build's draft setting, so a link never points at a page that is not built.
 */
export function safetyLink(program: ProgramSlug, isVisible: (href: string) => boolean): PageLink | undefined {
  const page = SAFETY_PAGE[program];
  if (page && isVisible(page)) return { href: page, label: 'Full safety information' };
  return isVisible(SAFETY_FALLBACK) ? { href: SAFETY_FALLBACK, label: 'Medical disclaimer' } : undefined;
}
