/**
 * The Smart Patient Guides (free eBooks) offered on the site.
 *
 * Covers are page 1 of the current builds in eBooks/ (GLP-1 v14, Sexual
 * Wellness v6, Hair Restoration v5, Healthy Aging v5, NAD+ v1), exported to
 * public/images/ebooks/. The client confirmed the cover images are final.
 *
 * `pdf` stays unset until Derek approves the final version of that book (his
 * standing rule: no eBook PDF ships before approval). Without it the email
 * form still records the request and tells the visitor the guide will be
 * emailed when it is published. To publish a book: copy the approved PDF to
 * public/ebooks/<slug>.pdf and set `pdf: '/ebooks/<slug>.pdf'` below; the
 * form then opens the guide straight after the email is submitted.
 */
import type { ProgramSlug } from '../lib/cta';
import type { SignupSource } from '../lib/notify';

export interface Ebook {
  slug: string;
  /** Title as printed on the cover, after "The Smart Patient's Guide to". */
  title: string;
  /** The cover's subtitle line. */
  subtitle: string;
  cover: string;
  program: ProgramSlug;
  /** Recorded with the signup so the team knows which guide to send. */
  source: SignupSource;
  /** Four "inside the guide" highlights, from the chapter titles in
   *  eBooks/_build/outlines/<slug>.json (sentence case; Healthy Aging item 3
   *  sums up chapters 06-09, GLP-1 item 3 sums up chapters 05-07). */
  inside: readonly string[];
  pages: number;
  pdf?: string;
}

export const EBOOKS: readonly Ebook[] = [
  {
    slug: 'glp-1-weight-loss',
    title: 'GLP-1 Weight Loss',
    subtitle: 'What you should know before choosing a GLP-1 weight loss program.',
    cover: '/images/ebooks/glp-1-weight-loss-cover.webp',
    program: 'weight-loss',
    source: 'ebook_glp1',
    pages: 18,
    inside: [
      'What are GLP-1 medications?',
      'Semaglutide, tirzepatide and your treatment options',
      'Injections, oral tablets and additives',
      'What’s actually included in the price',
    ],
  },
  {
    slug: 'sexual-wellness',
    title: 'Sexual Wellness',
    subtitle: 'Understanding today’s treatment options and finding the right care.',
    cover: '/images/ebooks/sexual-wellness-cover.webp',
    program: 'sexual-wellness',
    source: 'ebook_sexual_wellness',
    pages: 18,
    inside: [
      'How ED medications work',
      'Sildenafil, tadalafil and daily tadalafil',
      'Daily or as needed?',
      'One interaction every patient should know about',
    ],
  },
  {
    slug: 'hair-restoration',
    title: 'Hair Restoration',
    subtitle: 'Understanding hair loss, today’s treatment options, and what to realistically expect.',
    cover: '/images/ebooks/hair-restoration-cover.webp',
    program: 'hair-restoration',
    source: 'ebook_hair_restoration',
    pages: 18,
    inside: [
      'Why does hair loss happen?',
      'Finasteride and the role of DHT',
      'Oral vs. topical: what actually changes?',
      'What does a good result actually look like?',
    ],
  },
  {
    slug: 'healthy-aging-vitality',
    title: 'Healthy Aging & Vitality',
    subtitle: 'What to know about supporting energy, strength, sleep, recovery and cognitive wellness as you age.',
    cover: '/images/ebooks/healthy-aging-vitality-cover.webp',
    program: 'healthy-aging',
    source: 'ebook_healthy_aging',
    pages: 18,
    inside: [
      'What does “healthy aging” actually mean?',
      'Where do wellness therapies fit?',
      'Sermorelin, NAD+ and methylene blue explained',
      'Beware of the anti-aging promise',
    ],
  },
  {
    slug: 'nad-therapy',
    title: 'NAD+ Therapy',
    subtitle: 'What it is, what we know, and questions to ask before treatment.',
    cover: '/images/ebooks/nad-therapy-cover.webp',
    program: 'healthy-aging',
    source: 'ebook_nad',
    pages: 18,
    inside: [
      'What exactly is NAD+?',
      'NAD+ vs. NR vs. NMN',
      'Compounded and FDA-approved aren’t the same thing',
      'What should you expect from NAD+ therapy?',
    ],
  },
];

/** The guides for one program (Healthy Aging has two). */
export function ebooksFor(program: ProgramSlug): Ebook[] {
  return EBOOKS.filter((book) => book.program === program);
}

/** Learning Center category slug → program, for the article rail. */
const CATEGORY_PROGRAM: Readonly<Record<string, ProgramSlug>> = {
  'weight-management': 'weight-loss',
  'sexual-wellness': 'sexual-wellness',
  'hair-restoration': 'hair-restoration',
  'peptides-wellness': 'healthy-aging',
};

export function ebooksForCategory(categorySlug: string): Ebook[] {
  const program = CATEGORY_PROGRAM[categorySlug];
  return program ? ebooksFor(program) : [];
}
