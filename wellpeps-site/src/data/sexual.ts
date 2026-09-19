/**
 * Sexual Wellness page content.
 * Copy sourced from the approved Sexual Wellness mockups + the
 * "WellPeps Sexual Wellness Secondary Page" and FAQ docs.
 */


export const sexHero = {
  titleLead: 'Sexual Wellness For Every Need.',
  titleAccent: 'Regain & Reconnect.',
  lead:
    'Personalized treatment options designed to help improve erectile function, restore confidence, and strengthen intimacy—all from the privacy of home.',
  image: '/images/sexual/hero-couple.webp',
  alt: 'A couple embracing tenderly at home in the evening',
};

export const sexEducation = {
  image: '/images/sexual/understanding.webp',
  alt: 'A couple sharing a relaxed, affectionate moment together at home',
  title: 'Understanding Sexual Wellness',
  paragraphs: [
    'Sexual wellness is an important part of overall health—and you’re not alone.',
    'Changes in sexual wellness are incredibly common and can affect both men and women at any stage of life. Factors such as aging, hormone changes, stress, medical conditions, medications, and lifestyle can all impact sexual function, desire, and confidence.',
    'The good news is that many sexual wellness concerns are treatable. With a personalized evaluation, licensed healthcare providers can identify potential contributing factors and recommend evidence-based treatment options that are appropriate for your individual needs.',
    'At WellPeps, we believe these conversations should be private, judgment-free, and focused on helping you feel your best.',
  ],
};

export interface WorkStep {
  icon: string;
  title: string;
  body: string;
}

export const sexWorks: WorkStep[] = [
  {
    icon: 'heart-flow',
    title: 'Improve Blood Flow',
    body: 'Many treatment options are designed to help improve healthy blood flow, supporting physical function and sexual performance when medically appropriate.',
  },
  {
    icon: 'gender-bolt',
    title: 'Support Healthy Sexual Function',
    body: 'Personalized therapies may help support your body’s natural sexual function, enhancing confidence and helping you enjoy a more satisfying intimate experience.',
  },
  {
    icon: 'chart-check',
    title: 'Personalized Treatment',
    body: 'Every treatment plan is tailored to your individual health history, symptoms, and wellness goals, with ongoing provider guidance and support throughout your journey.',
  },
];

export interface SexProduct {
  name: string;
  subtitle: string;
  image: string;
  alt: string;
  description: string;
  features: string[];
  /** Delivery method, per the WellPeps Product Card Standard. */
  methodOfUse: string;
  /** Omitted while the member price is still being set; the card then says so. */
  price?: string;
  priceUnit: string;
}

export const sexProductsIntro = {
  title: 'Sexual Wellness Treatments',
  lead: 'Sexual wellness treatments begin with a personalized evaluation by a licensed healthcare provider who reviews your health history, symptoms, and goals. Based on your assessment, your provider may recommend evidence-based treatment options designed to improve sexual wellness, confidence, and overall quality of life.',
  footnote: 'All treatments require a consultation with a licensed provider. Treatment plans are personalized to your needs.',
};

export const sexProducts: SexProduct[] = [
  {
    name: 'Tadalafil Daily',
    subtitle: 'Low-Dose Daily Tablet',
    image: '/images/sexual/product-tadalafil.webp',
    alt: 'A white prescription bottle labeled Oral Tadalafil on a bedside table',
    description: 'Low-dose daily support to help you feel ready, confident, and in control every day.',
    features: ['Supports daily confidence', 'Designed for ongoing spontaneity', 'Easy daily routine'],
    methodOfUse: 'Oral Tablet',
    price: '69',
    priceUnit: '/month',
  },
  {
    name: 'Tadalafil As Needed',
    subtitle: 'High-Dose Tablet',
    image: '/images/sexual/product-tadalafil.webp',
    alt: 'A white prescription bottle labeled Oral Tadalafil on a bedside table',
    description: 'A higher-dose tablet taken before activity rather than every day. Your provider determines whether it is appropriate for you.',
    features: ['Taken only when needed', 'No daily routine required', 'Provider-guided dosing'],
    methodOfUse: 'Oral Tablet',
    priceUnit: '/month',
  },
  {
    name: 'Sildenafil As Needed',
    subtitle: 'As-Needed Tablet',
    image: '/images/sexual/product-sildenafil.webp',
    alt: 'A white prescription bottle labeled Oral Sildenafil on a bedside table',
    description: 'A well-established tablet taken before activity. Your provider determines whether it is appropriate for you.',
    features: ['Taken only when needed', 'Well-established treatment', 'Provider-guided dosing'],
    methodOfUse: 'Oral Tablet',
    priceUnit: '/month',
  },
];

export const sexRecommendation = {
  title: 'You Don’t Have to Figure It Out Alone.',
  body: 'Choosing the right treatment doesn’t have to be complicated. Every WellPeps journey begins with a free Personalized Assessment reviewed by a licensed healthcare provider, who will recommend treatment options based on your symptoms, health history, and individual wellness goals.',
  image: '/images/sexual/not-alone.webp',
  alt: 'A woman smiling confidently at home',
};

export interface SexFaq {
  q: string;
  a: string;
}

export const sexFaqs: SexFaq[] = [
  {
    q: 'How do I know if I’m a candidate for treatment?',
    a: 'Most adults experiencing concerns with sexual performance or function may be candidates for treatment. After you complete your confidential online health assessment, a licensed healthcare provider will review your medical history, symptoms, and current medications to determine whether treatment is appropriate for you.',
  },
  {
    q: 'Which medication is right for me?',
    a: 'Your provider will recommend the medication and dosage best suited to your individual needs. Factors such as your symptoms, health history, current medications, treatment goals, and lifestyle all help determine the most appropriate treatment plan.',
  },
  {
    q: 'Are there any potential side effects?',
    a: 'Like all prescription medications, sexual wellness treatments may cause side effects in some patients. Your provider will discuss potential risks, review your medical history, and recommend the safest treatment option for you. If you experience side effects, your treatment can often be adjusted.',
  },
  {
    q: 'How quickly do treatments begin working?',
    a: 'This depends on the medication prescribed. Some treatments are taken as needed and begin working within a relatively short period of time, while others are taken daily to provide ongoing support. Your provider will explain what to expect from your personalized treatment plan.',
  },
  {
    q: 'Will my treatment and delivery remain private?',
    a: 'Yes. Your consultation, medical information, and treatment are handled securely and confidentially. Medications are shipped in discreet packaging directly to your door to help protect your privacy.',
  },
  {
    q: 'Can my medication or dosage be adjusted if needed?',
    a: 'Absolutely. If your needs change or you’re not achieving the desired results, your licensed healthcare provider can adjust your medication, dosage, or treatment plan when clinically appropriate to help optimize your outcomes.',
  },
];

export const sexCta = {
  title: 'Ready to Regain Your',
  titleAccent: 'Confidence?',
  lead: 'Begin your personalized, provider-guided sexual wellness journey today—privately and on your terms.',
  note: 'It only takes a few minutes.',
  image: '/images/sexual/cta-couple-bed.webp',
  alt: 'A relaxed, smiling couple resting together in bed at home',
};
