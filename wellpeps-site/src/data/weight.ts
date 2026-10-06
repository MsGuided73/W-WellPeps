/**
 * Weight Loss (GLP-1 Weight Management) page content.
 *
 * Product cards use the approved "Sermorelin" benefit-pill style
 * (see StandardProductCard.astro). Benefit tags, descriptions and pricing are
 * sourced from WellPeps_Medication_Master_Database_v1 (Weight Management rows)
 * and the approved Weight Management page mockups.
 *
 * NOTE (client): each price is the one monthly all-in price (PRICE_NOTE under
 * the grid). Prices are the GEN Health product prices read from the API on
 * 2026-09-30 and must stay in step with GEN until the build pulls them.
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
  lead: 'Personalized care from independent licensed providers, with prescriptions filled by state-licensed U.S. pharmacies.',
};

export const weightWhy: WhyCard[] = [
  {
    image: '/images/weight/why-doctor.webp',
    alt: 'A licensed provider on a telehealth call',
    icon: 'stethoscope',
    title: 'Personalized Care & Coaching',
    body: 'Scheduled follow-ups with a licensed healthcare provider to discuss your GLP-1 treatment are included in your monthly price.',
  },
  {
    image: '/images/weight/why-lab.webp',
    alt: 'A lab nurse preparing a test',
    icon: 'flask',
    title: 'Lab Testing When Needed',
    body: 'Initial and follow-up testing when your provider recommends it. Lab fees are billed separately.',
  },
  {
    image: '/images/weight/why-flag.webp',
    alt: 'A United States flag',
    icon: 'shield-check',
    title: 'U.S. Licensed Pharmacies',
    body: 'Prescriptions are filled by state-licensed U.S. pharmacies. Compounded medications are not FDA-approved.',
  },
];

import { planProgramFaqs } from './plan';

export interface PillBenefit {
  label: string;
  icon: string;
}

export interface PillProduct {
  name: string;
  /** Which row of the treatments grid the card sits in (weightProductGroups). */
  medication: 'semaglutide' | 'tirzepatide';
  /** Which row of the grid the card sits in (see weightProductGroups). */
  form: 'injection' | 'oral';
  image: string;
  alt: string;
  benefits: PillBenefit[];
  description: string;
  delivery: { label: string; icon: string };
  /** Omitted while the price is still being set; the card then says so. */
  price?: string;
  priceUnit: string;
  priceNote?: string;
  /** State restriction shown on the card (see StandardProductCard). */
  availability?: string;
}

export const weightProductsIntro = {
  title: 'Weight Management Treatments',
  lead: 'Every treatment begins with a few online health questions. A licensed healthcare provider will review your health history, symptoms, and wellness goals before recommending a personalized weight management plan—if clinically appropriate. That review is included in your monthly price.',
  footnote: 'Prescription required. Treatment recommendations depend on your assessment and provider evaluation.',
};

/** Oral semaglutide and oral tirzepatide are not offered in California
 *  (client, 2026-09-30). Shown on both oral cards, the Oral Tablets row note,
 *  the Learning Center treatment insert, the FAQ and the chat assistant. */
export const ORAL_GLP1_AVAILABILITY = 'Not available to California residents.';

export const weightProducts: PillProduct[] = [
  {
    name: 'Compounded Semaglutide',
    form: 'injection',
    medication: 'semaglutide',
    image: '/images/weight/product-semaglutide.webp',
    alt: 'An amber compounded semaglutide injection vial on a bathroom counter',
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
  },
  {
    name: 'Compounded Tirzepatide',
    form: 'injection',
    medication: 'tirzepatide',
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
    price: '249',
    priceUnit: '/month',
  },
  {
    name: 'Oral Semaglutide',
    availability: ORAL_GLP1_AVAILABILITY,
    form: 'oral',
    medication: 'semaglutide',
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
    price: '229',
    priceUnit: '/month',
  },
  {
    name: 'Oral Tirzepatide',
    availability: ORAL_GLP1_AVAILABILITY,
    form: 'oral',
    medication: 'tirzepatide',
    image: '/images/weight/product-oral-tirzepatide.webp',
    alt: 'Oral tirzepatide tablets',
    benefits: [
      { label: 'Weight Loss', icon: 'trending-down' },
      { label: 'Appetite Control', icon: 'utensils' },
      { label: 'Metabolic Health', icon: 'activity' },
      { label: 'Convenience', icon: 'clock' },
    ],
    description: 'Oral dual GIP/GLP-1 option—a needle-free alternative.',
    delivery: { label: 'Oral Tablet', icon: 'pill' },
    price: '229',
    priceUnit: '/month',
  },
];

/** The treatments grid has two rows: weekly injections on top, tablets below
 *  (client revision, 2026-09-30). */
export const weightProductGroups: { form: PillProduct['form']; title: string; note: string }[] = [
  { form: 'injection', title: 'Weekly Injections', note: 'Semaglutide or tirzepatide, taken as one injection a week.' },
  { form: 'oral', title: 'Oral Tablets', note: 'A needle-free option: semaglutide or tirzepatide as a tablet. Oral options are not available to California residents.' },
];

export interface WeightFaq {
  q: string;
  a: string;
}

export const weightFaqs: WeightFaq[] = [
  ...planProgramFaqs,
  {
    q: 'Are oral GLP-1 options available in every state?',
    a: 'No. Oral semaglutide and oral tirzepatide are not available to California residents. Injectable options may be available; your provider will review which treatments are appropriate and available where you live.',
  },
  {
    q: 'Can I qualify for a GLP-1 weight loss program?',
    a: 'Eligibility depends on your health history, BMI, and other factors. A licensed healthcare provider will review your information and determine whether treatment is appropriate.',
  },
  {
    q: 'How do I know which program is right for me?',
    a: 'Your provider will recommend a personalized treatment plan based on your health goals, medical history, and clinical evaluation.',
  },
  {
    q: 'Are lab tests available if I need them?',
    a: 'Lab testing is available when appropriate for your care. If your provider determines that testing is needed before or during treatment, they’ll discuss the recommended tests with you and help guide you through the process. Lab fees are billed separately.',
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
    a: 'Availability varies by state and by program. Care is available only where an independent licensed provider can treat you and a state-licensed pharmacy can ship to you.',
  },
  {
    q: 'Is my information secure?',
    a: 'We take your privacy seriously and use secure technology to protect your information. Our Privacy Policy explains what we collect, why, and the choices you have.',
  },
];

export const weightCta = {
  title: 'Ready to Start Your Weight Loss Journey?',
  lead: 'Begin your personalized, provider-guided weight loss journey today.',
  note: 'It only takes a few minutes.',
  image: '/images/weight/cta-woman.webp',
  alt: 'A smiling woman walking on a coastal trail at sunrise',
};
