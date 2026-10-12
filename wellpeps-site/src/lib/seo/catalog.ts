/**
 * One normalized view of every program, its treatments, prices and FAQs, read from the same data files the
 * pages render. The structured data (schema.ts) and /llms.txt are built from it, so search engines and AI
 * tools see exactly the prices and wording on the page, and a price change in a data file reaches them on
 * the next build. Nothing here is typed by hand.
 */
import { weightFaqs, weightHero, weightProducts } from '../../data/weight';
import { hairFaqs, hairHero, hairProducts } from '../../data/hair';
import { sexFaqs, sexHero, sexProducts } from '../../data/sexual';
import { peptideFaqs, peptideHero, peptideProducts } from '../../data/peptide';
import { programs } from '../../data/programs';

export interface Treatment {
  name: string;
  /** How it is taken: "Weekly Injection", "Oral Tablet", "Topical Foam"... */
  form: string;
  /** Whole US dollars a month, or undefined while the price is still being set. */
  monthlyPrice?: number;
  /** A state limit shown on the card, e.g. "Not available to California residents." */
  availability?: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface ProgramEntry {
  /** Page path with the trailing slash, e.g. /weight-loss/ */
  path: string;
  name: string;
  summary: string;
  /** False while the program shows "coming soon" (no treatments are offered yet). */
  live: boolean;
  treatments: Treatment[];
  faqs: Faq[];
}

/** "179" -> 179; "XX", "" or undefined -> undefined (the card says the price is being set). */
export function toPrice(value: string | undefined): number | undefined {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value.trim())) return undefined;
  return Number(value.trim());
}

/** A paragraph of an FAQ answer: plain text, or a bold lead-in followed by text. */
type FaqParagraph = string | { lead: string; text: string };

/** FAQ answers are a string or a list of paragraphs; structured data wants one plain-text answer. */
export function toFaqs(list: readonly { q: string; a: string | readonly FaqParagraph[] }[]): Faq[] {
  const para = (p: FaqParagraph) => (typeof p === 'string' ? p : `${p.lead} ${p.text}`);
  return list.map(({ q, a }) => ({ q, a: (typeof a === 'string' ? a : a.map(para).join(' ')).replace(/\s+/g, ' ').trim() }));
}

const isLive = (href: string): boolean => programs.find((p) => p.href.split('#')[0] === href)?.status === 'live';

/** Strip markup a hero subtitle may carry, so summaries are plain text. */
const plain = (s: unknown): string => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export const PROGRAMS: readonly ProgramEntry[] = [
  {
    path: '/weight-loss/',
    name: 'Weight Management',
    summary: plain(weightHero.lead),
    live: isLive('/weight-loss'),
    treatments: weightProducts.map((p) => ({ name: p.name, form: p.delivery.label, monthlyPrice: toPrice(p.price), availability: p.availability })),
    faqs: toFaqs(weightFaqs),
  },
  {
    path: '/hair-restoration/',
    name: 'Hair Restoration',
    summary: plain(hairHero.lead),
    live: isLive('/hair-restoration'),
    treatments: hairProducts.map((p) => ({ name: p.name, form: p.methodOfUse, monthlyPrice: toPrice(p.price) })),
    faqs: toFaqs(hairFaqs),
  },
  {
    path: '/sexual-wellness/',
    name: 'Sexual Wellness',
    summary: plain(sexHero.lead),
    live: isLive('/sexual-wellness'),
    treatments: sexProducts.map((p) => ({ name: p.name, form: p.methodOfUse, monthlyPrice: toPrice(p.price) })),
    faqs: toFaqs(sexFaqs),
  },
  {
    path: '/healthy-aging/',
    name: 'Healthy Aging & Vitality',
    summary: plain(peptideHero.lead),
    live: isLive('/healthy-aging'),
    // A product sold in two forms (NAD+ injection or nasal spray) is two treatments with their own prices.
    treatments: peptideProducts.flatMap((p) =>
      p.variants && p.variants.length > 1
        ? p.variants.map((v) => ({ name: v.product, form: v.methodOfUse, monthlyPrice: toPrice(v.price) }))
        : [{ name: p.name, form: p.methodOfUse, monthlyPrice: toPrice(p.price) }]),
    faqs: toFaqs(peptideFaqs),
  },
];

export function programAt(path: string): ProgramEntry {
  const found = PROGRAMS.find((p) => p.path === path);
  if (!found) throw new Error(`No program at ${path}`);
  return found;
}

/** The lowest monthly price in a program, for "from $X/month" summaries. */
export function startingPrice(program: ProgramEntry): number | undefined {
  const prices = program.treatments.map((t) => t.monthlyPrice).filter((n): n is number => n !== undefined);
  return prices.length ? Math.min(...prices) : undefined;
}
