/**
 * Healthy Aging & Vitality page content (route /healthy-aging).
 *
 * File and component names still say "peptide" — internal only, and renaming
 * them would churn a dozen imports for no user-visible gain.
 *
 * Product cards use the approved Peptides card design (see PeptideCard.astro):
 * lifestyle photo · icon badge · name + subtitle · description · vial image ·
 * "Starting at $X/mo" · "Learn More".
 *
 * Copy revised 2026-09-18 to the compliance rewrite in "More Compliant Peptide &
 * Wellness Therapy Page" (Derek). Product copy follows that document's PRODUCT
 * CARD RECAP table, which is authoritative where it differs from the per-card
 * pages earlier in the same document. Prices are UNCHANGED and are still the old
 * figures — they are being reset from actual formulary costs, see docs/pricing/.
 * Descriptions carry no asterisk: the single disclosure now lives in
 * peptideProductsFootnote.
 */


export const peptideHero = {
  eyebrow: 'Healthy Aging & Vitality',
  titleLead: 'Healthy Aging & Vitality.',
  titleAccent: 'Feel Like Yourself Again.',
  lead:
    'Personalized, provider-guided wellness therapies designed around your individual health, vitality, and wellness goals.',
  image: '/images/peptide/hero.webp',
  alt: 'A couple high-fiving at the summit of a mountain hike',
};

export const peptideScience = {
  title: 'Modern Wellness, Guided by Science',
  paragraphs: [
    "Healthcare is evolving beyond treating illness alone. Today, licensed healthcare providers can take a more personalized approach to wellness, considering each patient's health, goals, lifestyle, and individual needs. Advances in medical research and our understanding of human biology continue to expand the range of options that providers may consider for appropriate patients.",
    'At WellPeps, we offer a range of provider-guided wellness therapies designed around your individual health and wellness goals.',
  ],
  image: '/images/peptide/science.webp',
  alt: 'Two women smiling and flexing after a workout outdoors',
  benefitsTitle: 'Supporting Your Healthy Aging Goals',
  benefitsLead: 'Your health, needs, and goals are individual. Provider-guided wellness therapies may be considered as part of a personalized approach to healthy aging and vitality.',
  benefitsImage: '/images/peptide/benefits-woman.webp',
  benefitsAlt: 'A woman sitting on a yoga mat in a bright studio after a workout',
  footnote: 'Treatment options are determined by a licensed healthcare provider based on your health information, individual needs, and medical history. Not every treatment is appropriate for every patient.',
};

export interface ScienceBenefit {
  title: string;
  /** Optional supporting line. Omitted since the 2026-09-18 compliance rewrite,
   *  which specifies the eight labels with no subtext beneath them. */
  body?: string;
}

/**
 * Checklist copy for the two-column benefits panel. Order is COLUMN-major
 * (items 1-4 = left column, items 5-8 = right column) and the panel grid
 * uses `grid-auto-flow: column` to match. Reordering these without
 * updating that CSS will break the divider placement.
 */
export const peptideBenefits: ScienceBenefit[] = [
  { title: 'Energy & Vitality' },
  { title: 'Cognitive Wellness' },
  { title: 'Healthy Aging' },
  { title: 'Metabolic Wellness' },
  { title: 'Skin & Cellular Health' },
  { title: 'Strength & Body Composition' },
  { title: 'Recovery & Physical Wellness' },
  { title: 'Sleep & Rest' },
];

export interface PeptideProduct {
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  photo: string;
  photoAlt: string;
  vial: string;
  /** Delivery method, per the WellPeps Product Card Standard. */
  methodOfUse: string;
  /** Three key benefits, drawn from the description copy. */
  features: string[];
  price: string;
}

export const peptideProductsIntro = {
  eyebrow: 'Healthy Aging & Vitality',
  title: 'Explore Healthy Aging & Vitality Therapies',
  lead: 'Explore provider-guided wellness therapies available for a range of healthy aging and vitality goals. A licensed healthcare provider reviews your health history and individual needs to determine whether treatment is appropriate and personalize your care.',
};

export const peptideProducts: PeptideProduct[] = [
  {
    name: 'Sermorelin',
    subtitle: 'Natural Growth Hormone Support',
    description: "Sermorelin is a peptide that acts on the pituitary gland to stimulate the body's natural release of growth hormone, which plays a role in normal physiological processes involving growth, metabolism, and body composition.",
    icon: 'dna',
    photo: '/images/peptide/photo-sermorelin.webp',
    photoAlt: 'A man pausing during a mountain hike at sunrise',
    vial: '/images/peptide/vial-sermorelin.webp',
    methodOfUse: 'Subcutaneous Injection',
    features: ['Natural growth hormone release', 'Growth hormone signaling', 'Provider-guided treatment'],
    price: '149',
  },
  {
    name: 'NAD+',
    subtitle: 'Cellular Energy & Vitality',
    description: 'NAD+ is a naturally occurring coenzyme that plays an essential role in cellular energy metabolism and other fundamental cellular processes.',
    icon: 'zap',
    photo: '/images/peptide/photo-nad.webp',
    photoAlt: 'A woman relaxing with a coffee by a bright window',
    vial: '/images/peptide/vial-nad.webp',
    methodOfUse: 'Injection',
    features: ['Cellular energy metabolism', 'Essential cellular processes', 'Naturally present in the body'],
    price: '169',
  },
  {
    name: 'Glutathione',
    subtitle: 'Antioxidant & Cellular Support',
    description: 'Glutathione is a naturally occurring antioxidant that plays an important role in cellular antioxidant defenses and normal metabolic processes.',
    icon: 'shield-check',
    photo: '/images/peptide/photo-glutathione.webp',
    photoAlt: 'A woman with glowing skin in soft natural light',
    vial: '/images/peptide/vial-glutathione.webp',
    methodOfUse: 'Injection',
    features: ['Antioxidant defense', 'Oxidative balance', 'Naturally present in the body'],
    price: '129',
  },
  {
    name: 'MIC + B12',
    subtitle: 'Metabolic Support',
    description: 'MIC + B12 combines lipotropic nutrients with vitamin B12, an essential nutrient involved in cellular metabolism, red blood cell formation, and normal nervous system function.',
    icon: 'flame',
    photo: '/images/peptide/photo-mic.webp',
    photoAlt: 'A woman running along a palm-lined coastal path',
    vial: '/images/peptide/vial-mic.webp',
    methodOfUse: 'Injection',
    features: ['B12 nutrient support', 'Cellular metabolism', 'Lipotropic nutrients'],
    price: '119',
  },
  {
    name: 'Lipo-C',
    subtitle: 'Metabolic & Nutrient Support',
    description: 'Lipo-C combines L-carnitine with lipotropic nutrients. L-carnitine plays an important role in transporting fatty acids into cells, where they participate in normal energy metabolism.',
    icon: 'droplet',
    photo: '/images/peptide/photo-lipoc.webp',
    photoAlt: 'A woman meditating outdoors by a lake at golden hour',
    vial: '/images/peptide/vial-lipoc.webp',
    methodOfUse: 'Injection',
    features: ['Fatty acid metabolism', 'L-carnitine', 'Lipotropic nutrients'],
    price: '109',
  },
  {
    name: 'Methylene Blue',
    subtitle: 'Cellular & Mitochondrial Science',
    description: 'Methylene blue has a long history of medical use and pharmacologic activity involving cellular redox processes and mitochondrial biology. Research into potential applications beyond its established medical uses continues to evolve.',
    icon: 'brain',
    photo: '/images/peptide/photo-methylene.webp',
    photoAlt: 'A man reading a book in warm evening light',
    vial: '/images/peptide/vial-methylene.webp',
    methodOfUse: 'Oral',
    features: ['Mitochondrial biology', 'Cellular redox processes', 'Emerging areas of research'],
    price: '79',
  },
];

export const peptideProductsFootnote = 'Treatment options are subject to provider evaluation and may not be appropriate for everyone. Some treatments shown may be compounded medications. Compounded medications are not FDA-approved finished drug products.';

export interface PeptideFaq {
  q: string;
  a: string;
}

export const peptideFaqsIntro = {
  title: 'Common Questions About Wellness Therapies',
  lead: 'We know you may have questions about our wellness therapies. Here are answers to some of the most common ones.',
  trust: 'All therapies are provider-guided, prescribed only when appropriate, and shipped discreetly from a licensed pharmacy.',
};

export const peptideFaqs: PeptideFaq[] = [
  { q: 'What are wellness therapies?', a: 'Our wellness therapies include prescription medications, peptide therapies, vitamin-based treatments, and other provider-guided protocols designed to support your health and wellness goals.' },
  { q: 'How do I know which therapy is right for me?', a: 'Your licensed healthcare provider reviews your health history, current medications, symptoms, and wellness goals before recommending treatments that are appropriate for you.' },
  { q: 'Are these therapies safe?', a: 'When prescribed and monitored by a licensed healthcare provider, wellness therapies may be an appropriate option for some patients. Your provider will review the risks and benefits of your recommended treatment and monitor how you respond.' },
  { q: 'Are the medications high quality?', a: 'Yes. We partner with licensed pharmacies that meet rigorous quality and safety standards. Every prescription is dispensed only after review by a licensed provider.' },
  { q: 'How long does it take to see results?', a: 'The timeline depends on the therapy and your individual goals. Some patients notice improvements within a few weeks, while others see gradual benefits over time.' },
  { q: 'What side effects should I expect?', a: 'Every therapy has its own potential side effects. Your provider will review the risks and benefits of your recommended treatment and monitor your progress.' },
  { q: 'How are wellness therapies administered?', a: 'Administration depends on the treatment. Some therapies are injections, while others are taken orally. Your provider will explain exactly how to use your medication.' },
  { q: 'How is my treatment delivered?', a: 'If prescribed, your medication is shipped discreetly from a licensed pharmacy directly to your home, with ongoing provider support throughout your care.' },
  { q: 'Do I need a prescription?', a: 'Most therapies offered through WellPeps require evaluation by a licensed healthcare provider and are prescribed only when medically appropriate.' },
  { q: 'Are these treatments available in my state?', a: 'WellPeps provides care through a nationwide network of licensed providers. Availability may vary based on state regulations and the specific therapy requested.' },
];

export const peptideCta = {
  title: 'Ready to Start Your',
  titleAccent: 'Wellness Journey?',
  lead: 'Discover personalized, provider-guided wellness therapies designed around your unique health goals. Complete a quick assessment to learn which treatments may be right for you.',
  note: 'It only takes a few minutes.',
  image: '/images/peptide/cta-couple.webp',
  alt: 'A couple walking together on a coastal trail at sunset',
};
