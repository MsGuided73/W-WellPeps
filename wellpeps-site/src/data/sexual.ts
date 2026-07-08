/**
 * Sexual Wellness page content.
 * Copy sourced from the approved Sexual Wellness mockups + the
 * "WellPeps Sexual Wellness Secondary Page" and FAQ docs.
 */

export const sexHero = {
  eyebrow: 'Sexual Wellness',
  titleLead: 'Sexual Wellness For Every Need.',
  titleAccent: 'Regain & Reconnect.',
  lead:
    'Personalized treatment options designed to help improve erectile function, restore confidence, and strengthen intimacy—all from the privacy of home.',
  image: '/images/sexual/hero-couple.png',
  alt: 'A couple embracing tenderly at home in the evening',
};

export const sexEducation = {
  title: 'What Is Erectile Dysfunction?',
  paragraphs: [
    'Erectile dysfunction (ED) is one of the most common health concerns affecting men. While occasional difficulty achieving or maintaining an erection is normal, persistent symptoms may be a sign of an underlying medical condition or other factors that deserve attention.',
    'ED affects millions of men of all ages and, for many, is highly treatable with the right medical evaluation and personalized treatment plan.',
  ],
};

export interface WorkStep {
  icon: string;
  title: string;
  body: string;
}

export const sexWorksIntro = {
  title: 'How Treatment Works',
  lead: 'Erectile dysfunction medications help increase blood flow to the penis, making it easier to achieve and maintain an erection during sexual stimulation. Your licensed healthcare provider will recommend the treatment option that best fits your health history, symptoms, and lifestyle.',
};

export const sexWorks: WorkStep[] = [
  {
    icon: 'activity',
    title: 'Improve Blood Flow',
    body: 'ED medications help relax blood vessels and increase blood flow where it’s needed, supporting a stronger erectile response when you’re sexually aroused.',
  },
  {
    icon: 'heart',
    title: 'Support Natural Sexual Response',
    body: 'These medications don’t create sexual desire or cause automatic erections. They help your body respond more naturally to sexual stimulation.',
  },
  {
    icon: 'stethoscope',
    title: 'Personalized Treatment Options',
    body: 'Different medications and formulations vary in how quickly they begin working, how long they last, and how they may fit your lifestyle. Your provider will recommend the option that best supports your individual needs.',
  },
];

export interface SexProduct {
  name: string;
  subtitle: string;
  image: string;
  alt: string;
  description: string;
  features: string[];
  price: string;
  priceUnit: string;
  href: string;
}

export const sexProductsIntro = {
  title: 'Sexual Wellness Treatments',
  lead: 'Every treatment begins with a free online health assessment. Our licensed healthcare providers will review your health history, symptoms, and wellness goals before recommending a personalized sexual wellness plan—if clinically appropriate.',
  footnote: 'All treatments require a consultation with a licensed provider. Treatment plans are personalized to your needs.',
};

export const sexProducts: SexProduct[] = [
  {
    name: 'Daily Boost',
    subtitle: 'Tadalafil Daily',
    image: '/images/sexual/product-daily.png',
    alt: 'Daily Boost — tadalafil daily oral medication',
    description: 'Low-dose daily support to help you feel ready, confident, and in control every day.',
    features: ['Supports daily confidence', 'Designed for ongoing spontaneity', 'Easy daily routine'],
    price: '69',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Go Long',
    subtitle: 'Silodosin + Tadalafil',
    image: '/images/sexual/product-golong.png',
    alt: 'Go Long — silodosin + tadalafil oral medication',
    description: 'Designed to help support longer-lasting performance and confidence when it matters most.',
    features: ['Supports longer-lasting results', 'Works when you need it', 'Provider-guided treatment'],
    price: '89',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Double Powered',
    subtitle: 'Sildenafil + Tadalafil',
    image: '/images/sexual/product-double.png',
    alt: 'Double Powered — sildenafil + tadalafil oral medication',
    description: 'A powerful combination designed to enhance performance and increase confidence.',
    features: ['Dual-action formula', 'Enhanced effectiveness', 'Clinically guided'],
    price: '99',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
  {
    name: 'Quadruple Powered',
    subtitle: 'Advanced Combination',
    image: '/images/sexual/product-quadruple.png',
    alt: 'Quadruple Powered — advanced combination oral medication',
    description: 'Advanced single-dose combinations for those who need maximum support.',
    features: ['Maximum support', 'Advanced formulation', 'Provider-supervised'],
    price: '129',
    priceUnit: '/month',
    href: '/#assessment-stub',
  },
];

export const sexRecommendation = {
  title: 'You Don’t Have to Figure It Out Alone.',
  body: 'Choosing the right treatment doesn’t have to be complicated. Every WellPeps journey begins with a free Personalized Assessment reviewed by a licensed healthcare provider, who will recommend treatment options based on your symptoms, health history, and individual wellness goals.',
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
  image: '/images/sexual/cta-couple.png',
  alt: 'A relaxed, happy couple together at home',
};
