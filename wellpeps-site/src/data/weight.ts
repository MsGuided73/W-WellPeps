/**
 * Weight Loss (GLP-1 Weight Management) page content.
 *
 * Product cards use the approved "Sermorelin" benefit-pill style
 * (see ProductCardPills.astro). Benefit tags, descriptions and pricing are
 * sourced from WellPeps_Medication_Master_Database_v1 (Weight Management rows)
 * and the approved Weight Management page mockups.
 *
 * NOTE (client): pricing shown is the "starting as low as" figure; the master
 * DB notes these are 52-week starting prices (reflected in the "*" footnote).
 */

export const weightHero = {
  titleLead: 'GLP-1 Weight Management',
  titleAccent: 'Personalized.',
  lead:
    'Physician-guided GLP-1 weight management that includes semaglutide or tirzepatide, combined with personalized support to help you achieve sustainable results.',
  image: '/images/weight/hero-woman.webp',
  alt: 'A fit, smiling woman standing with arms crossed',
};

export interface WorkStep {
  icon: string;
  title: string;
  body: string;
}

export const weightWorksIntro = {
  title: 'How GLP-1 Medications Work',
  lead: 'GLP-1 medications work with your body’s natural processes to help reduce hunger, increase fullness, and support healthy, sustainable weight loss.',
};

export const weightWorks: WorkStep[] = [
  { icon: 'plate-clock', title: 'Reduce Hunger', body: 'Helps regulate appetite signals so you feel less hungry throughout the day.' },
  { icon: 'stomach-clock', title: 'Feel Fuller Longer', body: 'Slows stomach emptying so you stay satisfied for longer periods.' },
  { icon: 'scale-check', title: 'Support Weight Loss', body: 'Helps sustain weight loss when combined with healthy lifestyle changes.' },
];

export const weightWorksNotes = [
  { icon: 'shield-check', lead: 'Personalized for you.', body: 'Every treatment plan is tailored to your health history, goals, and provider evaluation.' },
  { icon: 'heart-flow', lead: 'You’re never alone.', body: 'We’re with you at every step of your wellness journey.' },
];

export interface WhyCard {
  image: string;
  alt: string;
  icon: string;
  title: string;
  body: string;
}

export const weightWhyIntro = {
  title: 'Why Patients Choose WellPeps',
  lead: 'Personalized care backed by licensed providers, nationwide lab access, and medications compounded in FDA-registered U.S. facilities.',
};

export const weightWhy: WhyCard[] = [
  {
    image: '/images/weight/why-doctor.webp',
    alt: 'A licensed provider on a telehealth call',
    icon: 'stethoscope',
    title: 'Personalized Care & Coaching',
    body: 'Licensed healthcare providers are available free-of-charge for scheduled follow-ups to discuss your GLP-1 treatment.',
  },
  {
    image: '/images/weight/why-lab.webp',
    alt: 'A lab nurse preparing a test',
    icon: 'flask',
    title: 'Quest® & Labcorp® Access',
    body: 'Available nationwide for free-of-charge initial and follow-up tests for qualified patients.',
  },
  {
    image: '/images/weight/why-flag.webp',
    alt: 'A United States flag',
    icon: 'shield-check',
    title: 'Made in America Medications',
    body: 'Medications are compounded in FDA-registered U.S. facilities.',
  },
];

export interface PillBenefit {
  label: string;
  icon: string;
}

export interface PillProduct {
  name: string;
  image: string;
  alt: string;
  benefits: PillBenefit[];
  description: string;
  delivery: { label: string; icon: string };
  price: string;
  priceUnit: string;
  priceNote?: string;
  href: string;
}

export const weightProductsIntro = {
  title: 'Weight Management Treatments',
  lead: 'Every treatment begins with a free online health assessment. A licensed healthcare provider will review your health history, symptoms, and wellness goals before recommending a personalized weight management plan—if clinically appropriate.',
  footnote: 'Prescription required. Treatment recommendations depend on your assessment and provider evaluation.',
  priceFootnote: '* Starting price reflects a 52-week plan. Actual pricing depends on your provider’s recommended plan.',
};

export const weightProducts: PillProduct[] = [
  {
    name: 'Compounded Semaglutide',
    image: '/images/weight/product-semaglutide.webp',
    alt: 'Compounded semaglutide injection vial',
    benefits: [
      { label: 'Weight Loss', icon: 'trending-down' },
      { label: 'Appetite Control', icon: 'utensils' },
      { label: 'Reduced Cravings', icon: 'target' },
      { label: 'Blood Sugar Support', icon: 'droplet' },
    ],
    description: 'Weekly GLP-1 treatment to help support appetite regulation and healthy weight loss.',
    delivery: { label: 'Weekly Injection', icon: 'syringe' },
    price: '179',
    priceUnit: '/month',
    priceNote: '52-week starting price',
    href: '/#assessment-stub',
  },
  {
    name: 'Compounded Tirzepatide',
    image: '/images/weight/product-tirzepatide.webp',
    alt: 'Compounded tirzepatide injection vial',
    benefits: [
      { label: 'Weight Loss', icon: 'trending-down' },
      { label: 'Appetite Control', icon: 'utensils' },
      { label: 'Metabolic Health', icon: 'activity' },
      { label: 'Blood Sugar Support', icon: 'droplet' },
    ],
    description: 'Dual GIP/GLP-1 treatment designed to support appetite regulation and metabolic health.',
    delivery: { label: 'Weekly Injection', icon: 'syringe' },
    price: '269',
    priceUnit: '/month',
    priceNote: '52-week starting price',
    href: '/#assessment-stub',
  },
  {
    name: 'Oral Semaglutide',
    image: '/images/weight/product-oral.webp',
    alt: 'Oral semaglutide tablets',
    benefits: [
      { label: 'Weight Loss', icon: 'trending-down' },
      { label: 'Appetite Control', icon: 'utensils' },
      { label: 'Reduced Cravings', icon: 'target' },
      { label: 'Convenience', icon: 'clock' },
    ],
    description: 'Daily oral GLP-1 option—a convenient, needle-free alternative.',
    delivery: { label: 'Daily Tablet', icon: 'pill' },
    price: '209',
    priceUnit: '/month',
    priceNote: '52-week starting price',
    href: '/#assessment-stub',
  },
];

export interface WeightFaq {
  q: string;
  a: string;
}

export const weightFaqs: WeightFaq[] = [
  {
    q: 'Can I qualify for a GLP-1 weight loss program?',
    a: 'Eligibility depends on your health history, BMI, and other factors. A licensed healthcare provider will review your information and determine whether treatment is appropriate.',
  },
  {
    q: 'How do I know which program is right for me?',
    a: 'Your provider will recommend a personalized treatment plan based on your health goals, medical history, and clinical evaluation.',
  },
  {
    q: 'Are lab tests required?',
    a: 'Some treatment programs may require laboratory testing before or during treatment. If needed, your provider will discuss the appropriate testing with you.',
  },
  {
    q: 'How long does it take to receive my medication?',
    a: 'Once approved by your provider, prescriptions are processed through licensed pharmacy partners. Delivery times vary, but most patients receive their medications within several business days.',
  },
  {
    q: 'Do I receive ongoing support after I start treatment?',
    a: 'Yes. Your provider can monitor your progress, answer questions, and make treatment adjustments when medically appropriate.',
  },
  {
    q: 'Can my treatment plan change over time?',
    a: 'Absolutely. Your treatment plan may be adjusted based on your progress, goals, provider recommendations, and any changes in your health.',
  },
  {
    q: 'Is WellPeps available in my state?',
    a: 'WellPeps works with licensed providers across all 50 states, although specific treatment availability may vary based on state regulations.',
  },
  {
    q: 'Is my information secure?',
    a: 'Yes. We use HIPAA-compliant technology and industry-standard security measures to help protect your personal health information.',
  },
];

export const weightCta = {
  title: 'Ready to Start Your Weight Loss Journey?',
  lead: 'Begin your personalized, provider-guided weight loss journey today.',
  note: 'It only takes a few minutes.',
  image: '/images/weight/cta-woman.webp',
  alt: 'A smiling woman walking on a coastal trail at sunrise',
};
