/**
 * Hair Restoration page content.
 *
 * Product cards use the approved original hair design (see ProductCard.astro):
 * image + icon badge · title · description · "Common options include" · price ·
 * "Learn More". Copy is sourced from the approved Hair Restoration mockups +
 * "Hiar Answers.docx".
 *
 * Card CTAs render through AssessmentCta, which resolves each card's GEN
 * Health link from src/config.ts (PRODUCT_LINKS + LIVE_PRODUCTS).
 */

export const hairHero = {
  eyebrow: 'Hair Restoration',
  titleLead: 'Restore Your Hair.',
  titleAccent: 'Restore Your Confidence.',
  lead:
    'Advanced, FDA-approved treatments and expert care to help you achieve visibly thicker, healthier hair.',
  image: '/images/hair/hero-couple.webp',
  alt: 'A smiling couple walking together outside their home at golden hour',
};

export interface HairWorkStep {
  icon: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}

export const hairWorks: HairWorkStep[] = [
  {
    icon: 'sprout',
    title: 'Support Healthy Hair Growth',
    body: 'Certain treatments help stimulate hair follicles and support healthier, fuller-looking hair over time.',
    image: '/images/hair/works-growth.webp',
    alt: 'A man checking his hair growth in the mirror',
  },
  {
    icon: 'shield-check',
    title: 'Help Reduce Hair Loss',
    body: 'Some therapies are designed to help reduce ongoing hair loss by addressing common underlying causes.',
    image: '/images/hair/works-reduce.webp',
    alt: 'A woman brushing her long, healthy hair',
  },
  {
    icon: 'user',
    title: 'Personalized Treatment',
    body: 'Your licensed healthcare provider will recommend treatment options based on your hair loss pattern, medical history, treatment goals, and lifestyle.',
    image: '/images/hair/works-personalized.webp',
    alt: 'A woman on a telehealth video call with a licensed provider',
  },
];

export const hairProductsIntro = {
  title: 'Personalized Hair Restoration Plans',
  // Approved copy from "Headlines and text before Product Cards.docx"
  intro:
    'Every treatment begins with a free online health assessment. Our licensed healthcare providers will review your health history, symptoms, and wellness goals before recommending a personalized hair restoration plan—if clinically appropriate.',
  footnote: 'All treatments require a consultation with a licensed healthcare provider.',
};

export interface Product {
  name: string;
  image: string;
  alt: string;
  icon: string; // small badge icon shown on the product image
  description: string;
  optionsLabel: string;
  options: string[];
  /**
   * Delivery method, per the WellPeps Product Card Standard. That standard
   * defines a fixed label set (Injection / Oral Capsule / Oral Tablet /
   * Oral Pill / Topical Solution / Topical Foam / Topical Spray / Topical Gel);
   * the hair cards stay within it.
   */
  methodOfUse: string;
  price: string; // numeric string or "XX" placeholder
  priceUnit: string;
}

/** One card per GEN Health hair product (2026-09-30). Prices are the GEN
 *  product prices; the Open Loop-era category cards (Combination Therapy,
 *  Advanced Liposomal Formulas) were retired. Keys in config.ts PRODUCT_LINKS
 *  are these names slugged. */
export const hairProducts: Product[] = [
  {
    name: 'Oral Finasteride',
    image: '/images/hair/product-oral-finasteride.webp',
    alt: 'A white prescription bottle labeled Finasteride beside tablets and a glass of water',
    icon: 'pill',
    description:
      'A prescription oral medication that lowers DHT, a hormone involved in male-pattern hair loss. Your provider decides whether it is appropriate for you.',
    optionsLabel: 'Formulation',
    options: ['Finasteride'],
    methodOfUse: 'Oral Tablet',
    price: '49',
    priceUnit: '/month',
  },
  {
    name: 'Oral Minoxidil',
    image: '/images/hair/product-oral-minoxidil.webp',
    alt: 'A white prescription bottle labeled Minoxidil beside two capsules',
    icon: 'pill',
    description:
      'A prescription oral medication that supports blood flow to hair follicles. Your provider decides whether it is appropriate and at what dose.',
    optionsLabel: 'Formulation',
    options: ['Minoxidil'],
    methodOfUse: 'Oral Capsule',
    price: '49',
    priceUnit: '/month',
  },
  {
    name: 'Topical Minoxidil',
    image: '/images/hair/product-topical-minoxidil.webp',
    alt: 'An amber dropper bottle labeled Minoxidil on a bathroom counter',
    icon: 'droplet',
    description:
      'A prescription medication applied directly to the scalp that supports blood flow to hair follicles. Your provider decides whether it is appropriate for you.',
    optionsLabel: 'Formulation',
    options: ['Minoxidil'],
    methodOfUse: 'Topical Solution',
    price: '99',
    priceUnit: '/month',
  },
  {
    name: 'Topical Minoxidil + Finasteride',
    image: '/images/hair/product-minoxidil-finasteride-foam.webp',
    alt: 'A white foam pump bottle labeled Minoxidil plus Finasteride',
    icon: 'venn',
    description:
      'Two prescription medications in one topical foam applied to the scalp: minoxidil supports blood flow to hair follicles, and finasteride lowers DHT. Your provider decides whether it is appropriate for you.',
    optionsLabel: 'Formulation',
    options: ['Minoxidil 6% + Finasteride 0.3%'],
    methodOfUse: 'Topical Foam',
    price: '139',
    priceUnit: '/month',
  },
];

export interface HairFaq {
  q: string;
  a: string;
}

export const hairFaqs: HairFaq[] = [
  {
    q: 'Am I a good candidate for hair restoration treatment?',
    a: 'Most adults experiencing hair thinning or hair loss may be candidates for treatment. During your free online health assessment, a licensed healthcare provider will review your medical history, symptoms, and goals to determine whether treatment is appropriate and recommend the best options for your situation.',
  },
  {
    q: 'What’s the difference between topical and oral treatments?',
    a: 'Topical treatments are applied directly to the scalp, while oral treatments are taken by mouth. Depending on your hair loss pattern, medical history, and treatment goals, your provider may recommend topical therapy, oral medication, or a combination of both for the best results.',
  },
  {
    q: 'How long does it take to see results?',
    a: 'Hair restoration takes time, and results vary from person to person. Many patients begin noticing improvements within 3 to 6 months, with continued progress over time when treatment is used consistently. Your provider will monitor your progress and adjust your treatment plan if needed.',
  },
  {
    q: 'Can men and women both receive treatment?',
    a: 'Yes. Hair loss affects both men and women, and treatment plans can be tailored to each individual’s needs. Your provider will recommend medications and therapies that are appropriate based on your medical history, hair loss pattern, and overall health.',
  },
  {
    q: 'Are the medications FDA-approved or compounded?',
    a: 'Depending on your treatment plan, your provider may prescribe FDA-approved medications, compounded medications, or a combination of both when clinically appropriate. If compounded medications are recommended, they are prepared by FDA-registered U.S. compounding pharmacies in accordance with applicable regulations.',
  },
  {
    q: 'How does WellPeps determine which treatment is right for me?',
    a: 'Every treatment begins with a free online health assessment. A licensed healthcare provider will review your health history, symptoms, hair loss pattern, and wellness goals before recommending a personalized treatment plan—if clinically appropriate.',
  },
];

export const hairCta = {
  title: 'Ready to Start Your Hair Restoration Journey?',
  lead: 'Begin your personalized, provider-guided hair restoration journey today.',
  note: 'It only takes a few minutes.',
  // Pre-launch copy, used while HAIR_COMING_SOON is true. The live copy above
  // promises something the program cannot yet deliver, so it is swapped rather
  // than left to invite an assessment that does not exist.
  soonTitle: 'Be First to Start Your Hair Restoration Journey',
  soonLead:
    'Our provider-guided hair restoration program opens soon. Join the list and we’ll let you know the moment assessments are available.',
  soonNote: 'No spam — just one email when we go live.',
  image: '/images/hair/cta-man.webp',
  alt: 'A smiling man running his hand through his healthy hair',
};
