/**
 * Men's and Women's Hormone Therapy page content.
 *
 * Source: Derek's decks and mockups in website-additions/Hormone Therapy (2026-11), and the formulary note
 * "WellPeps_Hormone_Therapy_Formulary_Pricing_Recommendations". Both pages share one set of section
 * components (src/components/sections/hormone/), so each page is one HormonePage object.
 *
 * Changes from the decks, made on purpose:
 * - Products: the launch set, plus hCG (added at the owner's request, 2026-11-10; the formulary note calls it a
 *   provider-directed specialty option, which its card copy reflects).
 * - No prices yet: each card shows "Coming soon" and a "Coming Soon" button until it has its link AND price; the footnote replaces the one-monthly-price note,
 *   because supply length differs by product (formulary: "do not advertise a single monthly price until actual
 *   days supply is established").
 * - "Free Health Assessment" became "online health assessment": the first month is paid at checkout and refunded
 *   in full if a clinician does not prescribe (src/config.ts).
 * - Labs are billed separately, so no copy says testing is "included".
 * - The men's FAQ intro said "weight management programs" (copied from the Weight page); fixed.
 * - Quest Diagnostics and Labcorp are not named: the site may not name a lab partner without a written
 *   arrangement (src/lib/claims.test.ts). Restore the names only once that arrangement exists.
 */
import type { CardPlan } from '../components/StandardProductCard.astro';
import type { ProgramSlug } from '../lib/cta';

export interface HormoneProduct {
  /** Card title; also the key in PRODUCT_DISCLOSURES and, slugged, in PRODUCT_LINKS. */
  name: string;
  /** Blue line under the title. */
  subtitle: string;
  image: string;
  alt: string;
  description: string;
  /** Delivery method, the bold label above the checklist. */
  methodOfUse: string;
  /** Checklist under the method label: three on the hormone cards, four on the Peptides cards (Derek). */
  features: string[];
  /**
   * Monthly price in dollars, e.g. '149'. Leave it out until the owner gives the GEN Health link WITH its price.
   * A card goes live (See If You Qualify) only when it has both this price and its link in PRODUCT_LINKS +
   * LIVE_PRODUCTS (src/config.ts); otherwise it shows "Coming soon" and a non-clickable "Coming Soon" button.
   */
  price?: string;
  /**
   * Plan choices (e.g. 1 month / 3 months), each with its own price, renewal wording and GEN Health link.
   * Each plan's `product` slug is its PRODUCT_LINKS key. Leave a plan's price out to keep it on Coming Soon.
   */
  plans?: CardPlan[];
}

export interface HormoneStep {
  title: string;
  body: string;
  image: string;
  alt: string;
}

export interface HormoneWhy {
  title: string;
  body: string;
  /** Brand line icon (decorative; the title says what it means). */
  icon: string;
  w: number;
  h: number;
}

export interface HormoneFaq {
  q: string;
  a: string;
}

export interface HormonePage {
  program: ProgramSlug;
  path: string;
  /** Short name for menus, breadcrumbs and the catalog. */
  name: string;
  /** "men's" / "women's", for running copy. */
  audience: string;
  seo: { title: string; description: string };
  hero: {
    /** Small blue label above the title; leave empty when the title already names the program. */
    eyebrow: string;
    titleLead: string;
    /** Optional second navy line of the title. */
    titleMiddle?: string;
    /** Keep each title line on one line on desktop, letting it run over the photo's faded edge. */
    titleNoWrap?: boolean;
    titleAccent: string;
    /** Put each sentence of the blue line on its own line on desktop, so a long blue line never runs across the
     *  photo's faces ("Small Molecules." / "Big Possibilities.", owner 2026-11-25). */
    titleAccentBreak?: boolean;
    lead: string;
    /** The second hero button's label; defaults to "Explore Treatment Options". */
    exploreLabel?: string;
    image: string;
    width: number;
    height: number;
    alt: string;
  };
  education: {
    title: string;
    intro: string;
    symptomsLabel: string;
    symptoms: string[];
    noteLead: string;
    note: string;
    image: string;
    alt: string;
  };
  products: {
    title: string;
    subtitle: string;
    intro: string;
    footnote: string;
    items: HormoneProduct[];
    /** The section's id, which the hero and closing buttons jump to; defaults to "hormone-products". */
    anchor?: string;
    /** The line under each price; defaults to the lab-testing line. null shows none. */
    priceExtra?: string | null;
  };
  journey: { title: string; subtitle: string; lead: string; steps: HormoneStep[] };
  why: { title: string; lead: string; items: HormoneWhy[] };
  faqIntro: string;
  faqs: HormoneFaq[];
  cta: {
    title: string;
    lead: string;
    note: string;
    image: string;
    width: number;
    height: number;
    alt: string;
    /** 'left' puts the photo on the left and the copy on the right (Peptides: the couple sits on the left). */
    imageSide?: 'left' | 'right';
  };
}

/** The parts of a program page the shared hero, product grid, questions and closing band read. The Peptides page
 *  (data/peptides.ts) uses these sections too, without the hormone-only education, journey and why sections. */
export type ProgramPageCore = Pick<HormonePage, 'program' | 'path' | 'name' | 'seo' | 'hero' | 'products' | 'faqIntro' | 'faqs' | 'cta'>;

/** Where the hero and closing buttons go until the program's assessment links exist. */
export const productsAnchor = (page: ProgramPageCore): string => `#${page.products.anchor ?? 'hormone-products'}`;

const PRODUCT_FOOTNOTE =
  'Treatment is prescribed only when a licensed provider decides it is appropriate for you. Pricing, supply length, and any lab costs are shown before you pay at checkout.';

/**
 * Why Choose cards: the site's brand line icons in boxes, no photos (Derek, round 2 notes, 2026-11-13).
 * The copy is Derek's, per program.
 */
const WHY_ICONS = {
  providers: { icon: '/images/why-icon-provider.png', w: 142, h: 154 },
  personalized: { icon: '/images/icons/included/support.png', w: 160, h: 160 },
  pricing: { icon: '/images/icons/included/tag.png', w: 160, h: 160 },
  pharmacies: { icon: '/images/why-icon-medications.png', w: 226, h: 160 },
  convenient: { icon: '/images/icons/included/calendar-check.png', w: 160, h: 160 },
  ongoing: { icon: '/images/why-icon-physician.png', w: 124, h: 140 },
} as const;

const WHY_SHARED = {
  pricing: { title: 'Transparent Pricing. Exceptional Value.', body: 'Quality hormone therapy should come with clear, competitive pricing. Know what your treatment costs before you commit.', ...WHY_ICONS.pricing },
  pharmacies: { title: 'Quality Medications From Licensed U.S. Pharmacies', body: 'When prescribed, your medications are fulfilled by licensed U.S. pharmacies, providing confidence in where your treatment comes from.', ...WHY_ICONS.pharmacies },
  convenient: { title: 'Convenient Care That Fits Your Life', body: 'Access medical evaluations, treatment recommendations, and ongoing care through a convenient telehealth experience designed around your schedule.', ...WHY_ICONS.convenient },
};

const LAB_STEP_IMAGE = { image: '/images/hormone/journey-lab.webp', alt: 'A smiling lab technician preparing a sample' };

export const mensHormone: HormonePage = {
  program: 'mens-hormone-therapy',
  path: '/mens-hormone-therapy/',
  name: 'Men’s Hormone Therapy',
  audience: 'men’s',
  seo: {
    title: 'Men’s Hormone Therapy Online: Testosterone (TRT) | WellPeps',
    description:
      'Provider-guided testosterone therapy online. A licensed provider reviews your symptoms and lab results and decides whether treatment is appropriate.',
  },
  hero: {
    // Derek, round 2 (2026-11-13): the extra "Men’s Hormone Therapy" label above the title is dropped.
    eyebrow: '',
    titleLead: 'Personalized Testosterone Therapy.',
    titleAccent: 'Real Medical Care.',
    lead:
      'Low testosterone can affect your sexual health, physical well-being, and quality of life. U.S.-licensed medical providers evaluate your symptoms, review your lab results, and decide whether hormone therapy is appropriate for you.',
    image: '/images/hormone/men-hero.webp',
    width: 1820,
    height: 864,
    alt: 'A man lifting dumbbells in his home gym while his partner smiles beside him',
  },
  education: {
    title: 'Could Low Testosterone Be Affecting You?',
    intro:
      'Testosterone plays an important role in men’s sexual health, muscle and bone health, and other essential functions. When testosterone levels are abnormally low, men may experience symptoms that affect everyday life.',
    symptomsLabel: 'Common symptoms can include:',
    symptoms: [
      'Reduced sexual desire',
      'Erectile difficulties',
      'Decreased muscle mass or strength',
      'Low energy or fatigue',
      'Changes in mood',
      'Difficulty concentrating',
      'Reduced bone density',
    ],
    noteLead: 'The important thing to know:',
    note:
      'These symptoms can have many causes. A diagnosis of testosterone deficiency requires appropriate medical evaluation and laboratory testing, not symptoms alone. At WellPeps, your provider reviews the complete picture before recommending treatment.',
    image: '/images/hormone/men-education.webp',
    alt: 'A man on a telehealth video call with a licensed provider at home',
  },
  products: {
    title: 'Explore Men’s Hormone Therapy Options',
    subtitle: 'Treatment Options Tailored to Your Needs',
    intro:
      'There is no single approach that’s right for every man. If treatment is appropriate, your provider may recommend one of the following options based on your laboratory results, medical history, and treatment goals.',
    footnote: PRODUCT_FOOTNOTE,
    items: [
      {
        name: 'Testosterone Cypionate',
        subtitle: 'Injectable Testosterone',
        image: '/images/hormone/men-product-testosterone-cypionate.webp',
        alt: 'An amber vial labeled Testosterone Cypionate, Compounded, Rx Only, on a marble counter',
        description:
          'Prescription testosterone given by injection on a schedule set by your provider.',
        methodOfUse: 'Injectable',
        features: ['Injected on a prescribed schedule', 'Dose set by your provider', 'Ongoing provider monitoring'],
        // Owner, 2026-11-17. GEN Health: 1 month $169 (LFYNjw8vldxMO6N52OCs); 3 months $299, a subscription
        // charged every 3 months (WLP-PRD-4FG3HT). Labs are extra (priceExtra on the hormone cards).
        price: '169',
        plans: [
          { label: '1 month', price: '169', priceUnit: '/month', product: 'Testosterone Cypionate' },
          { label: '3 months', price: '299', priceUnit: '/3 months', product: 'Testosterone Cypionate 3 Month', renewal: 'Renews every 3 months, cancel anytime.' },
        ],
      },
      {
        name: 'Testosterone Cream',
        subtitle: 'Topical Testosterone',
        image: '/images/hormone/men-product-testosterone-cream-v2.webp',
        alt: 'A pump bottle labeled Testosterone Cream, Topical, Compounded, Rx Only, on a marble counter',
        description:
          'A prescription cream that delivers testosterone through the skin, applied daily as prescribed.',
        methodOfUse: 'Topical Cream',
        features: ['Daily application to the skin, as prescribed', 'Dose set by your provider', 'Ongoing provider monitoring'],
        // Live 2026-11-21 (owner): $145/month with its GEN Health link.
        price: '145',
      },
      // Derek's "Minimal hCG Therapy Information Card" (owner asked for it, 2026-11-10). His "clinically proven"
      // and "may support fertility" were softened to provider-decides wording, as on the other cards.
      {
        name: 'hCG',
        subtitle: 'Human Chorionic Gonadotropin',
        image: '/images/hormone/men-product-hcg.webp',
        alt: 'An amber vial labeled HCG, Human Chorionic Gonadotropin, Rx Only, on a marble counter',
        description:
          'A prescription injection that signals the body to make its own testosterone, considered for selected patients, including men with fertility goals.',
        methodOfUse: 'Injectable',
        features: ['Signals the body to make its own testosterone', 'May help maintain testicular function', 'Often part of a personalized treatment plan'],
        // Live 2026-11-21 (owner): 1 month, $499, with its GEN Health link.
        price: '499',
      },
    ],
  },
  journey: {
    title: 'Hormone Therapy Starts With Understanding Your Health',
    subtitle: 'Real Care. Not Just Medication.',
    lead: 'At WellPeps, testosterone treatment begins with a medical evaluation, not simply choosing a medication online.',
    steps: [
      {
        title: 'Start Your Online Health Assessment',
        body: 'Tell us about your symptoms, medical history, and treatment goals, then check out for your first month.',
        image: '/images/hormone/men-journey-1.webp',
        alt: 'A man completing an online health assessment on his laptop',
      },
      {
        title: 'Complete Appropriate Lab Testing',
        body: 'Complete the lab tests your provider orders at a nearby lab. Lab fees are billed separately.',
        ...LAB_STEP_IMAGE,
      },
      {
        title: 'Medical Review of Your Results',
        body: 'A U.S.-licensed provider reviews your symptoms, history, and lab results and decides whether treatment is appropriate. If not, we refund your payment in full, except the cost of any lab tests.',
        // Derek, 2026-11-12: show a doctor here, not the patient again.
        image: '/images/doctor-assessment.webp',
        alt: 'A licensed provider reviewing a patient’s results on a laptop',
      },
      {
        title: 'Receive Your Personalized Plan',
        body: 'If prescribed, your medication is filled by a licensed pharmacy and delivered discreetly to your home.',
        image: '/images/hormone/men-journey-4.webp',
        alt: 'A man opening a discreet delivery box at home',
      },
      {
        title: 'Continue With Ongoing Care',
        body: 'Your provider may recommend follow-up visits and monitoring labs to track your response and adjust treatment when needed.',
        // Derek, 2026-11-12: not the patient back in the lab; a follow-up visit with the provider instead.
        image: '/images/weight/why-doctor.webp',
        alt: 'A licensed provider on a follow-up telehealth visit',
      },
    ],
  },
  why: {
    title: 'Why Choose WellPeps for Men’s Hormone Therapy?',
    lead: 'Personalized medical care. Trusted providers. Convenient treatment. Exceptional value.',
    items: [
      { title: 'U.S.-Licensed Medical Providers', body: 'Your care is guided by licensed medical professionals who evaluate your health, review your needs, and determine whether treatment is appropriate.', ...WHY_ICONS.providers },
      { title: 'Personalized Treatment, Not One-Size-Fits-All', body: 'Your health, symptoms, and treatment goals are unique. Our medical providers develop individualized treatment plans based on your clinical needs.', ...WHY_ICONS.personalized },
      WHY_SHARED.pricing,
      WHY_SHARED.pharmacies,
      WHY_SHARED.convenient,
      { title: 'Care That Goes Beyond the Prescription', body: 'Hormone therapy isn’t one-size-fits-all or set-it-and-forget-it. Ongoing medical oversight helps ensure your treatment remains appropriate as your needs evolve.', ...WHY_ICONS.ongoing },
    ],
  },
  faqIntro: 'Get answers to the most frequently asked questions about men’s hormone therapy.',
  faqs: [
    {
      q: 'How do I know if I have low testosterone?',
      a: 'Low testosterone is diagnosed through a combination of symptoms, medical evaluation, and laboratory testing. Generally, diagnosis requires consistently low testosterone levels confirmed with appropriate blood tests.',
    },
    {
      q: 'Is testosterone therapy right for every man experiencing fatigue or low libido?',
      a: 'No. Fatigue, reduced sexual desire, and other symptoms can have many causes. Testosterone therapy is generally appropriate only when a provider confirms a qualifying medical condition.',
    },
    {
      q: 'What’s the difference between testosterone injections and topical cream?',
      a: 'Both deliver testosterone, but through different methods. Injections are given on a prescribed schedule, while topical cream is applied to the skin. Your provider can explain the advantages, limitations, and safety considerations of each.',
    },
    {
      q: 'Will testosterone therapy help with sexual health?',
      a: 'Men with confirmed testosterone deficiency may experience improvements in sexual desire and certain sexual symptoms. Results vary, and testosterone is not a treatment for every cause of erectile dysfunction.',
    },
    {
      q: 'Can testosterone therapy affect fertility?',
      a: 'Yes. Testosterone replacement can suppress sperm production. Men who wish to preserve fertility should discuss their goals with a provider before starting therapy. Other treatment approaches may be considered.',
    },
    {
      q: 'What is hCG, and how is it different from testosterone?',
      a: 'hCG stimulates the testes to produce testosterone, whereas testosterone replacement supplies testosterone directly. hCG may be appropriate for certain conditions or fertility-related goals, but it is not routinely recommended for every testosterone therapy patient.',
    },
    {
      q: 'Are laboratory tests required?',
      a: 'Yes. Laboratory testing and medical review of the results are required as part of the WellPeps hormone therapy evaluation. Your provider decides which tests are appropriate. Lab fees are billed separately.',
    },
    {
      q: 'Will I need ongoing monitoring?',
      a: 'Yes. Testosterone therapy requires follow-up to assess hormone levels, treatment response, and potential side effects. Monitoring may include blood counts, blood pressure, and other tests depending on your medical history and treatment plan.',
    },
    {
      q: 'Is testosterone therapy safe?',
      a: 'Testosterone therapy has potential benefits and risks. It may not be appropriate for men with certain medical conditions or those planning fertility. Your provider evaluates your individual health profile before prescribing treatment.',
    },
  ],
  cta: {
    title: 'Ready to Start Your Hormone Therapy Journey?',
    lead: 'Begin your personalized, provider-guided men’s hormone therapy journey today.',
    note: 'It only takes a few minutes.',
    image: '/images/hormone/men-cta.webp',
    width: 1080,
    height: 860,
    alt: 'A smiling couple walking along the beach at golden hour',
  },
};

export const womensHormone: HormonePage = {
  program: 'womens-hormone-therapy',
  path: '/womens-hormone-therapy/',
  name: 'Women’s Hormone Therapy',
  audience: 'women’s',
  seo: {
    title: 'Menopause HRT Online: Estradiol & Progesterone | WellPeps',
    description:
      'Provider-guided menopause hormone therapy online. A licensed provider reviews your symptoms and health history and decides whether treatment is appropriate.',
  },
  hero: {
    // Derek, 2026-11-12: new title. The eyebrow is dropped because the title now names the program.
    eyebrow: '',
    titleLead: 'Women’s Hormone Therapy',
    titleMiddle: 'For Menopause & More',
    // Owner, 2026-11-12: "Women's Hormone Therapy" and "For Menopause & More" each stay on one line, crossing into the image.
    titleNoWrap: true,
    titleAccent: 'Real Medical Care.',
    lead:
      'Perimenopause and menopause can affect your sleep, comfort, sexual health, and everyday well-being. U.S.-licensed medical providers evaluate your symptoms, health history, and any appropriate lab results, and decide whether hormone therapy is appropriate for you.',
    image: '/images/hormone/women-hero.webp',
    width: 1804,
    height: 872,
    alt: 'A smiling woman sitting by the sea on a sunny morning',
  },
  education: {
    title: 'Understanding Perimenopause and Menopause',
    intro:
      'Menopause is a natural stage of life, but the hormonal changes leading up to it can begin years earlier, during perimenopause. As estrogen and progesterone levels fluctuate and decline, women may experience a variety of physical, emotional, and sexual health changes.',
    symptomsLabel: 'Common symptoms can include:',
    symptoms: [
      'Hot flashes and night sweats',
      'Difficulty sleeping',
      'Mood changes or irritability',
      'Difficulty concentrating or brain fog',
      'Vaginal dryness or discomfort',
      'Painful intercourse',
      'Changes in menstrual cycles',
      'Changes in sexual desire',
    ],
    noteLead: 'The important thing to know:',
    note:
      'Every woman’s experience is different, and not every symptom is caused by menopause. At WellPeps, your provider considers your symptoms, health history, and treatment options before recommending treatment.',
    image: '/images/hormone/women-education.webp',
    alt: 'A woman sitting thoughtfully on a sofa in a bright living room',
  },
  products: {
    title: 'Explore Women’s Hormone Therapy Options',
    subtitle: 'Personalized Treatment for Every Stage of Menopause',
    intro:
      'There is no one-size-fits-all approach to hormone therapy. Depending on your symptoms, medical history, and individual needs, your provider may recommend one or more of the following treatments when a licensed provider decides treatment is appropriate.',
    footnote: PRODUCT_FOOTNOTE,
    items: [
      {
        name: 'Estradiol Transdermal Patches',
        subtitle: 'Estrogen Therapy Through a Skin Patch',
        image: '/images/hormone/women-product-estradiol-patch.webp',
        alt: 'A box labeled Estradiol Transdermal Patches, Rx Only, beside a skin patch on a marble counter',
        description:
          'Estradiol patches deliver estrogen through the skin and may be prescribed for moderate to severe hot flashes and night sweats associated with menopause.',
        methodOfUse: 'Transdermal Patch',
        features: ['Worn on the skin, changed on a prescribed schedule', 'Available in different strengths, as prescribed', 'Ongoing provider follow-up'],
        // Live 2026-11-21 (owner): 8 patches (1 month), $199, with its GEN Health link.
        price: '199',
      },
      {
        name: 'Oral Micronized Progesterone',
        subtitle: 'An Important Part of Many Plans',
        image: '/images/hormone/women-product-progesterone.webp',
        alt: 'A white bottle labeled Progesterone Micronized Oral Capsules, Compounded, Rx Only, beside a glass of water',
        description:
          'Progesterone is commonly prescribed alongside systemic estrogen for women who have a uterus, to help protect the uterine lining.',
        methodOfUse: 'Oral Capsule',
        features: ['Oral capsule, taken as prescribed', 'Often prescribed with estrogen therapy', 'Dose set by your provider'],
        // Live 2026-11-21 (owner): 30 capsules (1 month), $199, with its GEN Health link.
        price: '199',
      },
      {
        name: 'Vaginal Estradiol Cream',
        subtitle: 'Local Therapy for Vaginal Discomfort',
        image: '/images/hormone/women-product-estradiol-cream.webp',
        alt: 'A tube and box labeled Estradiol Vaginal Cream, Compounded, Rx Only, on a marble counter',
        description:
          'Vaginal estradiol cream delivers estrogen locally and may be prescribed for menopause-related vaginal dryness, irritation, or painful intercourse, on its own or alongside systemic hormone therapy.',
        methodOfUse: 'Vaginal Cream',
        features: ['Applied locally, as prescribed', 'May be prescribed alone or with other therapy', 'Dose set by your provider'],
      },
    ],
  },
  journey: {
    title: 'Hormone Therapy Starts With Understanding Your Health',
    subtitle: 'Real Care. Not Just Medication.',
    lead: 'At WellPeps, women’s hormone therapy begins with an individualized medical evaluation, not simply choosing a medication online.',
    steps: [
      {
        title: 'Start Your Online Health Assessment',
        body: 'Tell us about your symptoms, menstrual history, medical background, and treatment goals, then check out for your first month.',
        image: '/images/hormone/women-journey-1.webp',
        alt: 'A woman completing an online health assessment on her laptop',
      },
      {
        title: 'Complete Appropriate Lab Testing',
        body: 'If your provider orders lab tests, complete them at a nearby lab. Lab fees are billed separately.',
        ...LAB_STEP_IMAGE,
      },
      {
        title: 'Medical Review of Your Results',
        body: 'A U.S.-licensed provider reviews your symptoms, history, and any relevant lab results and decides whether treatment is appropriate. If not, we refund your payment in full, except the cost of any lab tests.',
        // Derek, 2026-11-12: show a doctor here, not the patient again.
        image: '/images/hair/works-personalized.webp',
        alt: 'A licensed provider reviewing a patient’s results on a laptop',
      },
      {
        title: 'Receive Your Personalized Plan',
        body: 'If prescribed, your medication is filled by a licensed pharmacy and delivered discreetly to your home.',
        image: '/images/hormone/women-journey-4.webp',
        alt: 'A woman opening a discreet delivery box at home',
      },
      {
        title: 'Continue With Ongoing Care',
        body: 'Your provider may recommend follow-up care to evaluate symptom relief and treatment response, and adjust treatment when needed.',
        // Derek, 2026-11-12: not the patient back in the lab; a follow-up video visit instead.
        image: '/images/journey-5.webp',
        alt: 'A woman on a follow-up video visit at home',
      },
    ],
  },
  why: {
    title: 'Why Choose WellPeps for Women’s Hormone Therapy?',
    lead: 'Personalized menopause care. Trusted medical providers. Convenient treatment. Exceptional value.',
    items: [
      { title: 'U.S.-Licensed Medical Providers', body: 'Your care is guided by licensed medical professionals who evaluate your symptoms, health history, and individual needs to determine whether hormone therapy is appropriate.', ...WHY_ICONS.providers },
      { title: 'Personalized Care for Your Stage of Life', body: 'Every woman’s menopause journey is different. Your treatment plan is tailored to your symptoms, health history, and personal treatment goals.', ...WHY_ICONS.personalized },
      WHY_SHARED.pricing,
      WHY_SHARED.pharmacies,
      WHY_SHARED.convenient,
      { title: 'Care That Goes Beyond the Prescription', body: 'Hormone therapy needs may change over time. Ongoing medical oversight helps ensure your treatment remains appropriate as your symptoms and needs evolve.', ...WHY_ICONS.ongoing },
    ],
  },
  faqIntro: 'Get answers to the most frequently asked questions about women’s hormone therapy.',
  faqs: [
    {
      q: 'What is the difference between perimenopause and menopause?',
      a: 'Perimenopause is the transition leading up to menopause, when hormone levels fluctuate and menstrual cycles may become irregular. Menopause is generally confirmed after 12 consecutive months without a menstrual period, when there is no other medical explanation.',
    },
    {
      q: 'How do I know if hormone therapy is right for me?',
      a: 'Your provider considers your symptoms, medical history, age, personal preferences, and potential benefits and risks. Hormone therapy can be effective for certain menopause symptoms but is not appropriate for everyone.',
    },
    {
      q: 'Do I need estrogen and progesterone together?',
      a: 'Women who have a uterus and use systemic estrogen generally also need a progestogen to help protect the uterine lining. Women who have had a hysterectomy often do not need progesterone. Your provider determines the appropriate treatment.',
    },
    {
      q: 'What is the difference between estradiol patches and vaginal estradiol cream?',
      a: 'Estradiol patches deliver estrogen throughout the body and can treat symptoms such as hot flashes and night sweats. Low-dose vaginal estradiol primarily treats local vaginal symptoms, including dryness and painful intercourse.',
    },
    {
      q: 'Can hormone therapy help with sleep problems?',
      a: 'Hormone therapy may improve sleep when sleep disruption is related to menopause symptoms such as night sweats. However, sleep problems can have many causes, and treatment results vary.',
    },
    {
      q: 'Are laboratory tests required?',
      a: 'Your provider decides which lab tests, if any, are appropriate for your situation, and reviews the results as part of your evaluation. Routine hormone testing is not generally required to diagnose typical menopause. Lab fees are billed separately.',
    },
    {
      q: 'Is hormone therapy safe?',
      a: 'Hormone therapy has potential benefits and risks that depend on your medical history, the medication, and how it is given. It may not be appropriate for women with certain medical conditions, including some cancers, blood-clotting disorders, or unexplained vaginal bleeding. Your provider evaluates these factors before recommending treatment.',
    },
    {
      q: 'Will I need ongoing monitoring?',
      a: 'Yes. Follow-up care helps your provider assess symptom improvement, side effects, and whether treatment adjustments are needed. Additional lab testing may be recommended when clinically appropriate.',
    },
    {
      q: 'How long can I stay on hormone therapy?',
      a: 'There is no single treatment duration appropriate for every woman. Your provider periodically reassesses the benefits, risks, and continued need for treatment.',
    },
  ],
  cta: {
    title: 'Ready to Feel More Like Yourself?',
    lead: 'Begin your personalized, provider-guided women’s hormone therapy journey today.',
    note: 'It only takes a few minutes.',
    image: '/images/hormone/women-cta.webp',
    width: 1204,
    height: 872,
    alt: 'Three smiling women walking to a yoga class with their mats',
  },
};

export const HORMONE_PAGES = [mensHormone, womensHormone] as const;
