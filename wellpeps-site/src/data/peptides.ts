/**
 * Peptide Therapy page content (route /peptides/), from Derek's mockup "WellPeps Peptide Therapy Landing Page"
 * and his six product cards (email 2026-11-17; originals in images/Peptides - Derek 2026-11-17/).
 *
 * Derek's revisions of 2026-11-19 (PEPTIDE PAGE NOTES.pdf and photos in images/Peptides - Derek 2026-11-19/): new hero
 * photo, "The Power & Potential of Peptides" and "Understanding Peptide Therapy" with a photo and the title above the
 * text, the ten product tiles removed, the product section retitled with his subheadline, and a Peptides guide
 * marked coming soon. The six products show "Coming soon" until the owner gives each one's GEN Health link AND price (the hormone-page rule,
 * owner 2026-11-17). Derek: "remove Exploring" from the card subheadlines (2026-11-17), done below.
 *
 * Wording: Scriptful (2026-09-16) said these peptides are acceptable "if careful with claims and language". Every
 * description says what a peptide is "being studied" for; nothing says what it does for a patient. Two of Derek's
 * lines were softened on that basis (hero lead, product subheadline); see the notes beside them.
 */
import type { ProgramPageCore } from './hormone';

/** A photo beside a title and one or two paragraphs, the title above the text (Derek, 2026-11-19: "title goes over
 *  text", as on the Sexual Wellness and Healthy Aging pages). */
export interface PeptideBand {
  title: string;
  paragraphs: { lead?: string; text: string }[];
  image: { src: string; alt: string; width: number; height: number; side: 'left' | 'right' };
}

export interface PeptideValue {
  title: string;
  body: string;
  icon: string;
}

export interface PeptidesPage extends ProgramPageCore {
  intro: PeptideBand;
  understanding: PeptideBand;
  values: { titleLead: string; titleAccent: string; items: PeptideValue[] };
}

const PRODUCT_FEATURES = ['Individualized medical evaluation', 'Ongoing provider support'];

/**
 * Last change to the Peptide Therapy page, YYYY-MM-DD. The page writes it as dateModified (a full date-time, which
 * Google's structured-data checks prefer) and the sitemap turns that into <lastmod>. Change it whenever the page's
 * content changes (Derek's revisions included).
 */
export const PEPTIDES_PAGE_UPDATED = '2026-11-21';

export const peptidesPage: PeptidesPage = {
  program: 'peptides',
  path: '/peptides/',
  name: 'Peptide Therapy',
  seo: {
    title: 'Peptide Therapy Online: Provider-Guided Care | WellPeps',
    description:
      'Learn what peptides are, where the research stands, and which peptide therapies a licensed provider may consider for your health goals. Prescription required.',
  },
  hero: {
    eyebrow: '',
    titleLead: 'Peptide Therapy',
    titleAccent: 'Small Molecules. Big Possibilities.',
    // Derek: "Harness the science of peptides and their growing role in weight management, metabolic health,
    // recovery, cognitive function, healthy aging, and more." Softened: "growing role in" reads as a benefit
    // claim for products that are not FDA-approved.
    lead:
      'Learn about the science of peptides and the areas researchers are studying, from weight management and metabolic health to recovery, cognitive function, and healthy aging.',
    exploreLabel: 'Explore Peptide Products',
    // Derek 2026-11-19: "see pic with younger couple" (New Hero A3).
    image: '/images/peptides/hero.webp',
    width: 1753,
    height: 897,
    alt: 'A smiling couple wearing backpacks on a coastal hiking trail',
  },
  intro: {
    // Derek 2026-11-19: retitled from "What Are Peptides?", with a photo.
    title: 'The Power & Potential of Peptides',
    paragraphs: [
      {
        lead: 'Peptides are short chains of amino acids,',
        text: 'the building blocks of proteins. Many occur naturally in the body and play important roles in processes such as metabolism, hormonal signaling, tissue repair, and cellular communication.',
      },
      {
        text: 'Advances in peptide science have led to established medications as well as emerging areas of research involving overall health, performance, recovery, and healthy aging.',
      },
    ],
    // PLACEHOLDER: Derek asked for a photo here but sent none for this section; this is his close crop of the hero
    // couple (New Hero A2) until he chooses one.
    image: { src: '/images/peptides/power.webp', alt: 'A smiling couple wearing backpacks on a trail above the ocean', width: 1200, height: 800, side: 'left' },
  },
  products: {
    // Derek 2026-11-19: title and subheadline. His "therapies designed to support a variety of health and wellness
    // goals" reads as a benefit claim for compounded products, so "designed to support" became "for".
    title: 'Explore Peptide Therapies',
    subtitle: '',
    intro:
      'Explore provider-guided peptide therapies for a variety of health and wellness goals. A licensed healthcare provider reviews your health profile and individual needs to determine whether treatment is appropriate and, if so, which medication and dosage may be right for you.',
    // Derek 2026-11-19: the first sentence ("Treatment is prescribed only when...") repeated the sections above.
    footnote: 'Pricing and supply length are shown before you pay at checkout.',
    anchor: 'peptides-products',
    priceExtra: null,
    // 3-month prepaid plans on BPC-157, TB-500, MOTS-c, Semax and Epitalon (owner, 2026-11-18). KPV is capsules only
    // since 2026-11-21; it gets a plan toggle once the owner confirms a 3-month plan for it.
    // Collapsing "View details" cards were tried 2026-11-18 and dropped 2026-11-19 (Derek): full standard cards.
    // Derek's cards, in his order. Titles are the PRODUCT_DISCLOSURES keys; slugged, the PRODUCT_LINKS keys.
    items: [
      {
        name: 'BPC-157',
        subtitle: 'Tissue Health & Recovery',
        image: '/images/peptides/product-bpc-157.webp',
        alt: 'A compounded BPC-157 vial on a marble spa counter',
        description: 'BPC-157 is a synthetic peptide attracting interest for its potential role in tissue repair, recovery, and gastrointestinal health.',
        methodOfUse: 'Injectable Peptide',
        features: ['Studied for tissue repair and recovery', 'Research involving gastrointestinal health', ...PRODUCT_FEATURES],
        // 1 month or 3 months prepaid (owner, 2026-11-18). Each plan opens with its own price and GEN Health link:
        // PRODUCT_LINKS keys 'bpc-157' and 'bpc-157-3-month'.
        plans: [
          // Owner, 2026-11-21: $168.50/month, GEN Health link saved as 'bpc-157' in src/config.ts. Add price: '168.50' here
          // and 'bpc-157' to LIVE_PRODUCTS together, once Peptide Therapy has an approved safety page.
          { label: '1 month', priceUnit: '/month', product: 'BPC-157' },
          { label: '3 months', priceUnit: '/3 months', product: 'BPC-157 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
      {
        name: 'TB-500',
        subtitle: 'Soft-Tissue Repair & Recovery',
        image: '/images/peptides/product-tb-500.webp',
        alt: 'A compounded TB-500 vial on a marble counter',
        description: 'TB-500 is a synthetic peptide fragment being investigated for its potential role in soft-tissue repair, wound healing, and recovery.',
        methodOfUse: 'Injectable Peptide',
        features: ['Studied for soft-tissue repair and recovery', 'Research involving wound healing and tissue regeneration', ...PRODUCT_FEATURES],
        // 1 month or 3 months prepaid (owner, 2026-11-18). Each plan opens with its own price and GEN Health link:
        // PRODUCT_LINKS keys 'tb-500' and 'tb-500-3-month'.
        plans: [
          // Owner, 2026-11-21: $231/month, GEN Health link saved as 'tb-500' in src/config.ts. Add price: '231' here and
          // 'tb-500' to LIVE_PRODUCTS together, once Peptide Therapy has an approved safety page (a price on a plan
          // shows on the card even while it is Coming Soon).
          { label: '1 month', priceUnit: '/month', product: 'TB-500' },
          { label: '3 months', priceUnit: '/3 months', product: 'TB-500 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
      {
        name: 'KPV',
        subtitle: 'Inflammation & Skin Health',
        image: '/images/peptides/product-kpv.webp',
        alt: 'A bottle of compounded KPV capsules on a marble counter',
        description: 'KPV is a naturally occurring peptide fragment being studied for its potential role in inflammatory processes, skin health, and gastrointestinal wellness.',
        // Capsules only (owner, 2026-11-21); the topical cream is not offered.
        methodOfUse: 'Oral Capsules',
        features: ['Studied for its potential anti-inflammatory properties', 'Research involving skin and gastrointestinal health', ...PRODUCT_FEATURES],
      },
      {
        name: 'MOTS-c',
        subtitle: 'Metabolic Health & Cellular Energy',
        image: '/images/peptides/product-mots-c.webp',
        alt: 'A compounded MOTS-c vial on a marble counter',
        description: 'MOTS-c is a mitochondrial-derived peptide being studied for its potential role in cellular energy regulation and metabolic processes.',
        methodOfUse: 'Injectable Peptide',
        features: ['Studied for cellular energy regulation', 'Research involving metabolic health', ...PRODUCT_FEATURES],
        // 1 month or 3 months prepaid (owner, 2026-11-18). Each plan opens with its own price and GEN Health link:
        // PRODUCT_LINKS keys 'mots-c' and 'mots-c-3-month'.
        plans: [
          // Owner, 2026-11-21: $157.50/month, GEN Health link saved as 'mots-c' in src/config.ts. Add price: '157.50' here
          // and 'mots-c' to LIVE_PRODUCTS together, once Peptide Therapy has an approved safety page.
          { label: '1 month', priceUnit: '/month', product: 'MOTS-c' },
          { label: '3 months', priceUnit: '/3 months', product: 'MOTS-c 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
      {
        name: 'Semax',
        subtitle: 'Cognitive Health & Mental Clarity',
        image: '/images/peptides/product-semax.webp',
        alt: 'A compounded Semax nasal spray bottle on a marble counter',
        description: 'Semax is a synthetic peptide being studied for its potential role in cognitive function, neurological health, and processes associated with memory and attention.',
        methodOfUse: 'Nasal Spray',
        features: ['Studied for its potential role in cognitive function and memory', 'Research involving attention and neurological health', ...PRODUCT_FEATURES],
        // 1 month or 3 months prepaid (owner, 2026-11-18). Each plan opens with its own price and GEN Health link:
        // PRODUCT_LINKS keys 'semax' and 'semax-3-month'.
        plans: [
          { label: '1 month', priceUnit: '/month', product: 'Semax' },
          { label: '3 months', priceUnit: '/3 months', product: 'Semax 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
      {
        name: 'Epitalon',
        subtitle: 'Healthy Aging & Sleep Wellness',
        image: '/images/peptides/product-epitalon.webp',
        alt: 'A compounded Epitalon vial on a marble counter beside white flowers',
        description: 'Epitalon is a synthetic peptide being studied for its potential role in cellular aging, longevity, and sleep-related biological processes.',
        methodOfUse: 'Injectable Peptide',
        features: ['Studied for its potential role in cellular aging and longevity', 'Research involving sleep and circadian rhythm regulation', ...PRODUCT_FEATURES],
        // 1 month or 3 months prepaid (owner, 2026-11-18). Each plan opens with its own price and GEN Health link:
        // PRODUCT_LINKS keys 'epitalon' and 'epitalon-3-month'.
        plans: [
          // Owner, 2026-11-21: $157.50/month, GEN Health link saved as 'epitalon' in src/config.ts. Add price: '157.50' here
          // and 'epitalon' to LIVE_PRODUCTS together, once Peptide Therapy has an approved safety page.
          { label: '1 month', priceUnit: '/month', product: 'Epitalon' },
          { label: '3 months', priceUnit: '/3 months', product: 'Epitalon 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
    ],
  },
  understanding: {
    title: 'Understanding Peptide Therapy',
    paragraphs: [
      {
        lead: 'Not all peptides are alike.',
        text: 'Some are ingredients in FDA-approved medications, while others are being investigated for possible medical applications. Their evidence, safety profiles, and regulatory status vary.',
      },
      {
        text: 'A qualified healthcare provider can help you understand which options may be appropriate for your goals, medical history, and overall health.',
      },
    ],
    // Derek 2026-11-19: new photo (Understanding Peptide Therapy 2, square, shown whole).
    image: { src: '/images/peptides/understanding.webp', alt: 'A woman at home smiling during a video visit with a doctor on her laptop', width: 1000, height: 1000, side: 'right' },
  },
  values: {
    titleLead: 'Personalized Wellness.',
    titleAccent: 'Simplified.',
    items: [
      { title: 'Licensed U.S. Providers', body: 'Care from experienced, U.S.-licensed clinicians.', icon: '/images/icons/included/provider.png' },
      { title: 'Personalized Treatment', body: 'Options tailored to your goals and health history.', icon: '/images/icons/included/meds.png' },
      { title: 'Ongoing Care & Support', body: 'Stay connected with your provider throughout your journey.', icon: '/images/icons/included/support.png' },
      { title: 'Convenient & Private', body: 'Medications delivered securely to your door.', icon: '/images/icons/included/truck.png' },
    ],
  },
  faqIntro: 'Get answers to common questions about peptides, how they work, safety, and what to discuss with your healthcare provider.',
  faqs: [
    {
      q: 'What are peptides?',
      a: 'Peptides are short chains of amino acids, the building blocks of proteins. Many occur naturally in the body. Some are active ingredients in FDA-approved medications; others are still being studied for possible medical uses.',
    },
    {
      q: 'Are the peptide therapies on this page FDA-approved?',
      a: 'No. The peptide therapies WellPeps offers are compounded medications, prepared by a licensed pharmacy for an individual patient. Compounded medications are not FDA-approved and have not been evaluated by FDA for safety, effectiveness, or quality.',
    },
    {
      q: 'How do I know whether a peptide therapy is right for me?',
      a: 'Start with the online health questions. A licensed healthcare provider reviews your answers, medical history, and current medications and decides whether any treatment is appropriate for you. Not every treatment is right for every patient, and a prescription is never guaranteed.',
    },
    {
      q: 'How are peptide therapies taken?',
      a: 'It depends on the product: most are injected, one is a nasal spray, and one is taken as capsules by mouth. If a treatment is prescribed, your provider explains how and when to use it.',
    },
    {
      q: 'Are there side effects or risks?',
      a: 'Like any prescription treatment, peptide therapies can cause side effects, and the evidence for some peptides is still limited. Your provider reviews your health history before prescribing and explains the possible risks. Contact your provider about any symptoms, and seek emergency care for severe symptoms.',
    },
    {
      q: 'When will the newest peptide therapies be available?',
      a: 'Cards marked Coming Soon are not available yet. Each card will show its price and a See If You Qualify button as soon as that therapy opens.',
    },
  ],
  cta: {
    title: 'Ready to Explore Peptide Therapy?',
    lead: 'See if you qualify for a personalized treatment plan with a U.S.-licensed provider: private, convenient, and on your terms.',
    note: 'It only takes a few minutes.',
    image: '/images/peptides/cta.webp',
    width: 1820,
    height: 607,
    alt: 'A smiling couple relaxing together outdoors in warm sunlight',
    imageSide: 'left',
  },
};
