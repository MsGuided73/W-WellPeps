/**
 * Hair Restoration page content.
 *
 * Product cards use the approved original hair design (see ProductCard.astro):
 * image + icon badge · title · description · "Common options include" · price ·
 * "Learn More". Copy is sourced from the approved Hair Restoration mockups +
 * "Hiar Answers.docx".
 *
 * NOTE (client): "Advanced Liposomal Formulas" pricing is still a placeholder
 * ("$XX") in the source product information — leave as-is until a real number
 * is provided.
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
   * the hair mockup uses two values outside it — see the note on Combination
   * Therapy below.
   */
  methodOfUse: string;
  price: string; // numeric string or "XX" placeholder
  priceUnit: string;
  href: string;
}

export const hairProducts: Product[] = [
  {
    name: 'Topical Treatments',
    image: '/images/hair/product-topical.webp',
    alt: 'Compounded topical hair restoration medications — dropper solution, foam pump and bottle',
    icon: 'droplet',
    description:
      'Supports healthier, fuller-looking hair with medications applied directly to the scalp.',
    optionsLabel: 'Common Formulations Include',
    options: ['Minoxidil + Finasteride', 'Minoxidil + Fluocinolone + Tretinoin'],
    methodOfUse: 'Topical Solution / Topical Foam',
    price: '79',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Oral Treatments',
    image: '/images/hair/product-oral.webp',
    alt: 'A compounded oral hair restoration medication bottle with capsules and a glass of water',
    icon: 'pill',
    description: 'Supports healthier hair growth through convenient oral medications.',
    optionsLabel: 'Common Formulations Include',
    options: ['Oral Minoxidil', 'Minoxidil + Biotin', 'Dutasteride'],
    methodOfUse: 'Oral Capsule',
    price: '59',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Combination Therapy',
    image: '/images/hair/product-combo.webp',
    alt: 'A combination of topical and oral hair restoration medications',
    icon: 'venn',
    description: 'Combines topical and oral medications for a comprehensive approach.',
    optionsLabel: 'Common Formulations Include',
    options: [
      'Topical Minoxidil + Finasteride + Oral Minoxidil',
      'Minoxidil + Finasteride + Biotin',
    ],
    // Outside the standard label set by design: this pathway is two delivery
    // methods at once, which the fixed list has no single term for.
    methodOfUse: 'Topical + Oral',
    price: '99',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Advanced Liposomal Formulas',
    image: '/images/hair/product-advanced.webp',
    alt: 'Advanced liposomal hair restoration formulas — dropper solution and foam pump',
    icon: 'molecule',
    description:
      'Next-generation delivery systems designed for enhanced absorption and results.',
    optionsLabel: 'Common Formulations Include',
    options: [
      'Minoxidil + Fluocinolone + Tretinoin',
      'Minoxidil + Finasteride + Fluocinolone + Tretinoin',
    ],
    methodOfUse: 'Topical Solution',
    price: '109',
    priceUnit: '/month',
    href: '/#assessment-stub',
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
  image: '/images/hair/cta-man.webp',
  alt: 'A smiling man running his hand through his healthy hair',
};
