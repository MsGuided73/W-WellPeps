/**
 * Peptides & Wellness page content.
 *
 * Product cards use the approved Peptides card design (see PeptideCard.astro):
 * lifestyle photo · icon badge · name + subtitle · description · vial image ·
 * "Starting at $X/mo" · "Learn More". Copy/pricing from the approved Peptide &
 * Wellness mockups; benefits from WellPeps_Medication_Master_Database_v1.
 */

export const peptideHero = {
  eyebrow: 'Peptide Therapies',
  titleLead: 'Next-Gen Peptide & Wellness Therapies',
  titleAccent: 'Feel Like Yourself Again.',
  lead:
    'Advanced peptide therapies and personalized protocols designed to optimize performance, support recovery, and help you feel your best.',
  image: '/images/peptide/hero.png',
  alt: 'A couple high-fiving at the summit of a mountain hike',
};

export const peptideScience = {
  title: 'Modern Wellness, Backed by Science',
  paragraphs: [
    'Healthcare is evolving beyond treating illness alone. Today, licensed healthcare providers increasingly use personalized treatment strategies to help support healthy aging, metabolic health, energy, recovery, and overall wellness. Advances in medical research and a growing understanding of preventive care have expanded the range of therapies available for appropriate patients.',
    'At WellPeps, we offer a range of peptide and wellness therapies designed around your unique health goals.',
  ],
  image: '/images/peptide/science.png',
  alt: 'Two women smiling and flexing after a workout outdoors',
  benefitsTitle: 'Potential Benefits of Peptide & Wellness Therapies',
  benefitsLead: 'Advanced therapies designed to help you look, feel, and perform your best—inside and out.',
  benefitsImage: '/images/peptide/benefits-woman.webp',
  benefitsAlt: 'A woman sitting on a yoga mat in a bright studio after a workout',
  footnote: '*Potential benefits vary by therapy and individual. Treatment recommendations are based on your provider evaluation and medical history.',
};

export interface ScienceBenefit {
  title: string;
  body: string;
}

/**
 * Checklist copy for the two-column benefits panel. Order is COLUMN-major
 * (items 1-4 = left column, items 5-8 = right column) and the panel grid
 * uses `grid-auto-flow: column` to match. Reordering these without
 * updating that CSS will break the divider placement.
 */
export const peptideBenefits: ScienceBenefit[] = [
  // NBSP binds "and" to "overall" so the line breaks after "stamina,"
  // instead of stranding "and" at the end of line one.
  { title: 'Improved Energy', body: 'Supports daily vitality, stamina, and overall energy levels.*' },
  { title: 'Healthy Aging', body: 'Promotes cellular health and supports graceful aging.*' },
  { title: 'Collagen & Skin Health', body: 'Supports skin elasticity, hydration, and a more youthful appearance.*' },
  { title: 'Recovery & Healing', body: 'Aids muscle recovery and helps support tissue repair.*' },
  { title: 'Mental Focus & Clarity', body: 'Supports cognitive function, focus, and mental performance.*' },
  { title: 'Metabolic Health', body: 'Supports healthy metabolism and overall wellness goals.*' },
  { title: 'Lean Muscle Support', body: 'Helps support lean muscle maintenance and strength.*' },
  { title: 'Better Sleep', body: 'Promotes deeper, more restorative sleep cycles.*' },
];

export interface PeptideProduct {
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  photo: string;
  photoAlt: string;
  vial: string;
  price: string;
  href: string;
}

export const peptideProductsIntro = {
  eyebrow: 'Advanced Wellness Solutions',
  title: 'Advanced Peptide & Wellness Therapies',
  lead: 'Explore physician-guided peptide therapies designed to support healthy aging, recovery, energy, metabolism, and overall wellness. Every treatment plan is personalized by a licensed healthcare provider based on your health history, goals, and ongoing progress.',
};

export const peptideProducts: PeptideProduct[] = [
  {
    name: 'Sermorelin',
    subtitle: 'Support Healthy Aging & Recovery',
    description: 'Supports natural growth hormone production to help promote lean muscle, recovery, sleep quality, and healthy aging.*',
    icon: 'dna',
    photo: '/images/peptide/photo-sermorelin.png',
    photoAlt: 'A man pausing during a mountain hike at sunrise',
    vial: '/images/peptide/vial-sermorelin.webp',
    price: '149',
    href: '/#assessment-stub',
  },
  {
    name: 'NAD+',
    subtitle: 'Cellular Energy & Vitality',
    description: 'Supports healthy cellular energy production, helping promote energy, mental clarity, and healthy aging.*',
    icon: 'zap',
    photo: '/images/peptide/photo-nad.png',
    photoAlt: 'A woman relaxing with a coffee by a bright window',
    vial: '/images/peptide/vial-nad.webp',
    price: '169',
    href: '/#assessment-stub',
  },
  {
    name: 'Glutathione',
    subtitle: 'Powerful Antioxidant Support',
    description: 'Supports detoxification, immune health, and protection against oxidative stress.*',
    icon: 'shield-check',
    photo: '/images/peptide/photo-glutathione.png',
    photoAlt: 'A woman with glowing skin in soft natural light',
    vial: '/images/peptide/vial-glutathione.webp',
    price: '129',
    href: '/#assessment-stub',
  },
  {
    name: 'MIC + B12',
    subtitle: 'Metabolic Support',
    description: 'Supports healthy metabolism, fat utilization, and natural energy production.*',
    icon: 'flame',
    photo: '/images/peptide/photo-mic.png',
    photoAlt: 'A woman running along a palm-lined coastal path',
    vial: '/images/peptide/vial-mic.webp',
    price: '119',
    href: '/#assessment-stub',
  },
  {
    name: 'Lipo-C',
    subtitle: 'Energy & Wellness Support',
    description: 'Designed to complement healthy nutrition and activity while supporting metabolic wellness and energy.*',
    icon: 'droplet',
    photo: '/images/peptide/photo-lipoc.png',
    photoAlt: 'A woman meditating outdoors by a lake at golden hour',
    vial: '/images/peptide/vial-lipoc.webp',
    price: '109',
    href: '/#assessment-stub',
  },
  {
    name: 'Methylene Blue',
    subtitle: 'Cognitive & Cellular Support',
    description: 'Supports mitochondrial function, mental clarity, mood, and overall cellular health.*',
    icon: 'brain',
    photo: '/images/peptide/photo-methylene.png',
    photoAlt: 'A man reading a book in warm evening light',
    vial: '/images/peptide/vial-methylene.webp',
    price: '79',
    href: '/#assessment-stub',
  },
];

export const peptideProductsFootnote = '*These statements have not been evaluated by the FDA. Treatment recommendations depend on your assessment and provider evaluation.';

export interface PeptideFaq {
  q: string;
  a: string;
}

export const peptideFaqsIntro = {
  title: 'Common Questions About Wellness Therapies',
  lead: 'We know you may have questions about our wellness therapies. Here are answers to some of the most common ones.',
  trust: 'All therapies are physician-guided, prescribed only when appropriate, and delivered discreetly to your door.',
};

export const peptideFaqs: PeptideFaq[] = [
  { q: 'What are wellness therapies?', a: 'Our wellness therapies include prescription medications, peptide therapies, vitamin-based treatments, and other physician-guided protocols designed to support your health and wellness goals.' },
  { q: 'How do I know which therapy is right for me?', a: 'Your licensed healthcare provider reviews your health history, current medications, symptoms, and wellness goals before recommending treatments that are appropriate for you.' },
  { q: 'Are these therapies safe?', a: 'When prescribed appropriately and monitored by a licensed healthcare provider, wellness therapies may be a safe and effective option for many patients.' },
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
  image: '/images/peptide/cta-couple.png',
  alt: 'A couple walking together on a coastal trail at sunset',
};
