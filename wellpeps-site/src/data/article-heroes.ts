/**
 * Graphics for Learning Center articles (src/pages/wellness-learning-center/[slug].astro), keyed by slug:
 *  - a cover photo, shown full width under the title;
 *  - a "how it works" diagram, shown inside the article at the end of the section it explains.
 *
 * Presentation only, so it lives in code next to the other per-article data (medical-review.ts) rather than in
 * Supabase. An article without a cover keeps a title-only header until a photo is added here.
 *
 * Diagrams are new medical content, even when every line comes from the article, so each one starts as a
 * draft. Drafts show only in `astro dev`; a production build leaves them out until the diagram is marked
 * approved after Dr. Yirga's review and a compliance pass.
 */

export interface ArticleCover {
  /** Path under public/. */
  src: string;
  width: number;
  height: number;
  /** Describes the photo; never a claim about treatment. */
  alt: string;
  /**
   * 'wide' crops to 16:9 from tablet width up (3:2 on phones); 'full' always shows the photo's own shape,
   * for photos where a wide crop would cut through a person.
   */
  fit: 'wide' | 'full';
  /** CSS object-position for the wide crop, so a face is never cut off. */
  focus?: string;
}

export interface DiagramLabel {
  text: string;
  /** A term set in bold before the text, such as the treatment's name. */
  term?: string;
  /** 'mimic' draws a dashed outline: the treatment standing in for the body's own signal. */
  kind?: 'natural' | 'mimic';
}

export interface DiagramStep {
  name: string;
  text: string;
  /** Labels on the arrow to the next step. */
  via?: DiagramLabel[];
}

export interface ArticleDiagram {
  status: 'draft' | 'approved';
  caption: string;
  steps: DiagramStep[];
  /** Heading text of the article section the diagram explains; it is shown at the end of that section. */
  section: string;
}

export const ARTICLE_COVERS: Readonly<Record<string, ArticleCover>> = {
  'sermorelin-explained': {
    src: '/images/peptide/photo-sermorelin.webp', width: 1536, height: 1024, fit: 'wide', focus: '50% 12%',
    alt: 'A man pauses on a mountain ridge at sunrise, looking out over a forested valley.',
  },
  'nad-explained': {
    src: '/images/peptide/photo-nad.webp', width: 1536, height: 1024, fit: 'wide', focus: '50% 20%',
    alt: 'A smiling woman stretches in a sunlit outdoor pool.',
  },
  'mic-b12-explained': {
    src: '/images/peptide/photo-mic.webp', width: 1536, height: 1024, fit: 'wide', focus: '50% 15%',
    alt: 'A woman runs along a seaside boardwalk at sunset.',
  },
  'glutathione-explained': {
    src: '/images/peptide/photo-glutathione.webp', width: 1536, height: 1024, fit: 'wide', focus: '50% 0%',
    alt: 'A woman closes her eyes in warm morning light beside a houseplant.',
  },
  'what-are-peptides': {
    src: '/images/peptide/hero.webp', width: 1536, height: 1024, fit: 'full',
    alt: 'Two hikers share a high five on a rocky summit above a wide green valley.',
  },
  'recovery-and-performance': {
    src: '/images/peptide/photo-lipoc.webp', width: 1536, height: 1024, fit: 'full',
    alt: 'A woman meditates cross-legged on a lakeside deck at golden hour.',
  },
  'healthy-aging': {
    src: '/images/learning-center/couple.webp', width: 1400, height: 933, fit: 'wide', focus: '50% 10%',
    alt: 'A smiling middle-aged couple stands together on a rocky beach.',
  },
  'importance-of-hydration': {
    src: '/images/About/built-around-you.webp', width: 1536, height: 1024, fit: 'full',
    alt: 'A woman holding a water bottle smiles on a beach in the morning sun.',
  },
  'prescription-delivery': {
    src: '/images/About/our-promise.webp', width: 1536, height: 1024, fit: 'wide', focus: '50% 30%',
    alt: 'A couple at home smile as they open a delivery box together.',
  },
  'male-pattern-baldness': {
    src: '/images/hair/cta-man.webp', width: 1376, height: 864, fit: 'full',
    alt: 'A smiling man runs a hand through his hair at home.',
  },
};

export const ARTICLE_DIAGRAMS: Readonly<Record<string, ArticleDiagram>> = {
  // Every line restates the article's "How Does Sermorelin Work?" section. Draft until reviewed.
  'sermorelin-explained': {
    status: 'draft',
    caption: 'How Sermorelin works',
    section: 'How Does Sermorelin Work?',
    steps: [
      {
        name: 'Hypothalamus',
        text: 'The body naturally produces growth hormone-releasing hormone (GHRH).',
        via: [
          { text: 'GHRH signals the pituitary' },
          { term: 'Sermorelin', text: 'is designed to mimic this signal', kind: 'mimic' },
        ],
      },
      {
        name: 'Pituitary gland',
        text: 'Receives the signal and releases growth hormone.',
        via: [{ text: 'Releases' }],
      },
      {
        name: 'Growth hormone',
        text: 'Released by the body itself, rather than replaced directly.',
      },
    ],
  },
};

/** The article's cover photo, or undefined for a title-only header. */
export function coverForArticle(slug: string): ArticleCover | undefined {
  return ARTICLE_COVERS[slug];
}

/** The article's diagram when approved (or a draft when `includeDrafts`, as in `astro dev`). */
export function diagramForArticle(slug: string, { includeDrafts = false } = {}): ArticleDiagram | undefined {
  const diagram = ARTICLE_DIAGRAMS[slug];
  return diagram && (diagram.status === 'approved' || includeDrafts) ? diagram : undefined;
}
