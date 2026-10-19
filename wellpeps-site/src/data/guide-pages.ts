/**
 * Words for the Smart Patient Guide funnel (see src/lib/guide-flow.ts): one landing
 * page and one thank-you page per Smart Patient Guide, the band on each program page, the call to
 * action inside articles, and the series pages.
 *
 * Derek's strategy document (2026-10-01) is the source of the copy: the headline, the "inside the
 * guide" points and the opening paragraph for each guide come from it and from the sample first
 * emails. The six topic cards are real chapter titles from eBooks/_build/outlines/<slug>.json,
 * so each card names something the guide actually covers. The words stay plain on purpose: nothing
 * here promises a result, and each page is education first (see wellpeps-compliance-review before
 * changing any of it).
 *
 * Only the five guides on the site have pages. Modern Healthcare has an outline and a first
 * build but no cover on the site and no sign-up source yet.
 */
import type { ProgramSlug } from '../lib/cta';

/** One of the six cards under "What you'll learn". `icon` is a name from src/components/Icon.astro. */
export interface GuideTopic {
  title: string;
  icon: string;
}

export interface GuidePage {
  /** The two hero lines; the second is shown in the accent colour. */
  headline: [string, string];
  /** What the guide is about and why to get it. */
  intro: string;
  /** "Inside the guide": eight short points. */
  inside: readonly string[];
  /** "What you'll learn": six cards. */
  topics: readonly GuideTopic[];
  /** The page's meta description: one sentence, short enough for a search result. */
  metaDescription: string;
  /** The program whose assessment the page and the thank-you page lead to. */
  assessmentProgram: ProgramSlug;
  /** The call to action placed inside and at the end of an article about this guide's subject. */
  articleCta: { title: string; body: string; button: string };
  /** The prompt on the thank-you page, where someone has just raised their hand. */
  thanks: { assessmentHeading: string; assessmentBody: string };
  /** The landing layout's own pieces (client mock 2026-10-12, revised to Derek's notes 2026-10-16): eBook-cover
   *  hero with the form, trust strip, inside the guide, more free guides and a closing call to action. Every
   *  guide uses it since 2026-10-18. */
  feature: GuideFeature;
}

/** A guide's own pieces of the full landing layout; the shared words are in GUIDE_FEATURE_COPY. */
export interface GuideFeature {
  /** Lifestyle photograph beside "Inside the guide", shown whole in its own shape (no person cut off). */
  photo: string;
  photoAlt: string;
  /** The photo's pixel size, so the frame keeps its shape. */
  photoSize: [number, number];
  /** "What's Inside Your Free … Guide?" and the sentence under it. */
  insideTitle: string;
  insideLead: string;
  /** The closing section's paragraph, above the download button. */
  closeBody: string;
}

const SMART_PATIENT_LINE = 'What Every Smart Patient Needs to Know';
// Owner, 2026-10-19: say who decides eligibility; no price line here.
const ASSESSMENT_BODY = 'Answer a few online health questions to see if you qualify. One of our licensed healthcare providers will review your answers and determine whether you are eligible for treatment.';
const LAST_POINT = 'The questions every Smart Patient should know to ask';

export const GUIDE_PAGES: Readonly<Record<string, GuidePage>> = {
  'glp-1-weight-loss': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a GLP-1 Program'],
    intro:
      'GLP-1 medications have changed weight management. Learn about treatment options, potential risks, what to look for ' +
      'in a provider, and the questions to ask before choosing care.',
    inside: [
      'How GLP-1 medications work',
      'Differences between common treatment options',
      'What realistic weight-loss expectations look like',
      'Why medical review matters',
      'Side effects and safety considerations',
      'Questions to ask before choosing a provider',
      'What to look for in a good GLP-1 program',
      'The Smart Patient’s GLP-1 checklist',
    ],
    topics: [
      { title: 'What Are GLP-1 Medications?', icon: 'pill' },
      { title: 'Is GLP-1 Treatment Right for You?', icon: 'stethoscope' },
      { title: 'Semaglutide, Tirzepatide and Your Treatment Options', icon: 'syringe' },
      { title: 'Why Lab Tests and Monitoring Matter', icon: 'flask' },
      { title: 'Side Effects Are Part of the Conversation', icon: 'shield' },
      { title: 'What’s Actually Included in the Price?', icon: 'receipt' },
    ],
    metaDescription: 'Free Smart Patient’s Guide to GLP-1 weight loss: how the medications work, your options, what to realistically expect and what to look for in a program.',
    assessmentProgram: 'weight-loss',
    articleCta: {
      title: 'Want to Learn More About GLP-1 Treatment?',
      body: 'Before choosing a program, learn what every Smart Patient should know about GLP-1 medications, treatment, safety and provider care.',
      button: 'Get the Free GLP-1 Guide',
    },
    thanks: { assessmentHeading: 'Ready to Explore GLP-1 Treatment?', assessmentBody: ASSESSMENT_BODY },
    feature: {
      photo: '/images/guides/glp-1-reading.webp',
      photoAlt: 'A smiling woman reading on a tablet on her living-room sofa',
      photoSize: [1200, 800],
      insideTitle: 'What’s Inside Your Free GLP-1 Guide?',
      insideLead:
        'Everything you should know before choosing a GLP-1 weight loss program—from understanding medications and treatment options ' +
        'to evaluating providers, costs, and safety considerations.',
      closeBody:
        'Before choosing a GLP-1 weight loss program, download your free Smart Patient’s Guide ' +
        'and learn what you need to know.',
    },
  },

  'sexual-wellness': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Sexual Wellness Program'],
    intro:
      'Sexual health is an important part of overall health. But treatment options can be confusing, and difficult to talk about. ' +
      'Our free guide helps you understand today’s treatments, know what to realistically expect, and ask the right questions before choosing care.',
    inside: [
      'Common sexual wellness concerns',
      'How erectile dysfunction medications work',
      'The differences between sildenafil and tadalafil',
      'Daily vs. as-needed treatment',
      'What to consider if an initial treatment doesn’t work as expected',
      'Important medication interactions and side effects',
      'Why medical review matters',
      LAST_POINT,
    ],
    topics: [
      { title: 'Erectile Dysfunction Is Common—and Often Treatable', icon: 'heart' },
      { title: 'How ED Medications Work', icon: 'pill' },
      { title: 'Sildenafil, Tadalafil and Daily Tadalafil', icon: 'flask' },
      { title: 'Daily or As Needed?', icon: 'calendar' },
      { title: 'One Interaction Every Patient Should Know About', icon: 'shield' },
      { title: 'What If the Medication Doesn’t Work as Expected?', icon: 'info' },
    ],
    metaDescription: 'Free Smart Patient’s Guide to sexual wellness: how common treatments work, what to realistically expect and the questions worth asking before choosing care.',
    assessmentProgram: 'sexual-wellness',
    articleCta: {
      title: 'Want to Learn More About Sexual Wellness?',
      body: 'Before choosing a program, learn what every Smart Patient should know about Sexual Wellness, medications, treatment, safety and provider care.',
      button: 'Get the Free Sexual Wellness Guide',
    },
    thanks: { assessmentHeading: 'Ready to Explore Sexual Wellness Treatment?', assessmentBody: ASSESSMENT_BODY },
    feature: {
      photo: '/images/program-sexual.webp',
      photoAlt: 'A smiling couple sharing a relaxed evening together',
      photoSize: [780, 520],
      insideTitle: 'What’s Inside Your Free Sexual Wellness Guide?',
      insideLead:
        'Everything you should know before choosing a sexual wellness program—from how today’s treatments work and what to ' +
        'realistically expect to medication interactions, safety, and provider care.',
      closeBody:
        'Before choosing a sexual wellness program, download your free Smart Patient’s Guide ' +
        'and learn what you need to know.',
    },
  },

  'hair-restoration': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Hair Restoration Program'],
    intro:
      'Hair loss is common. But not all hair loss is the same, and neither are the treatments for it. ' +
      'Our free guide helps you understand what may be causing it, know your options, and ask the right questions before choosing a treatment program.',
    inside: [
      'Why hair loss happens',
      'Common patterns and types of hair loss',
      'How treatments such as finasteride and minoxidil work',
      'Oral vs. topical treatment options',
      'Combination approaches',
      'What to realistically expect from treatment',
      'Why consistency and time matter',
      LAST_POINT,
    ],
    topics: [
      { title: 'Why Does Hair Loss Happen?', icon: 'dna' },
      { title: 'What Type of Hair Loss Do You Have?', icon: 'target' },
      { title: 'Finasteride and the Role of DHT', icon: 'molecule' },
      { title: 'Oral vs. Topical: What Actually Changes?', icon: 'layers' },
      { title: 'Hair Restoration Takes Time', icon: 'clock' },
      { title: 'What Does a Good Result Actually Look Like?', icon: 'sparkles' },
    ],
    metaDescription: 'Free Smart Patient’s Guide to hair restoration: why hair loss happens, how common treatments work and what to realistically expect.',
    assessmentProgram: 'hair-restoration',
    articleCta: {
      title: 'Want to Learn More About Hair Loss and Restoration?',
      body: 'Before choosing a program, learn what every Smart Patient should know about Hair Loss, medications, treatment, safety and provider care.',
      button: 'Get the Free Hair Restoration Guide',
    },
    thanks: { assessmentHeading: 'Ready to Explore Hair Restoration Treatment?', assessmentBody: ASSESSMENT_BODY },
    feature: {
      photo: '/images/program-hair.webp',
      photoAlt: 'A smiling man in a white T-shirt outdoors on a sunny day',
      photoSize: [780, 520],
      insideTitle: 'What’s Inside Your Free Hair Restoration Guide?',
      insideLead:
        'Everything you should know before choosing a hair restoration program—from why hair loss happens and how treatments work ' +
        'to what to realistically expect and why results take time.',
      closeBody:
        'Before choosing a hair restoration program, download your free Smart Patient’s Guide ' +
        'and learn what you need to know.',
    },
  },

  'healthy-aging-vitality': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Healthy Aging & Vitality Program'],
    intro:
      'Interest in longevity and wellness therapies has grown quickly. So has the marketing and hype around them. ' +
      'Our free guide helps you understand today’s wellness therapies, what we know about them, and the questions to ask before choosing a program.',
    inside: [
      'The changing approach to healthy aging and vitality',
      'Different types of wellness therapies and why they are used',
      'NAD+ therapy and Sermorelin',
      'Glutathione, MIC + B12 and other metabolic wellness therapies',
      'Methylene blue',
      'The difference between biological mechanisms and proven outcomes',
      'Why individualized, provider-guided care matters',
      LAST_POINT,
    ],
    topics: [
      { title: 'What Does “Healthy Aging” Actually Mean?', icon: 'leaf' },
      { title: 'Where Do Wellness Therapies Fit?', icon: 'venn' },
      { title: 'NAD+ and Cellular Energy', icon: 'molecule' },
      { title: 'Antioxidants, Nutrients & Metabolic Wellness', icon: 'droplet' },
      { title: 'Beware of the Anti-Aging Promise', icon: 'shield' },
      { title: 'Personalized Means Looking at the Whole Person', icon: 'user' },
    ],
    metaDescription: 'Free Smart Patient’s Guide to healthy aging and vitality: today’s wellness therapies, what we know about them and how to evaluate your options.',
    assessmentProgram: 'healthy-aging',
    articleCta: {
      title: 'Want to Learn More About Healthy Aging and Vitality?',
      body: 'Before choosing a program, learn what every Smart Patient should know about Healthy Aging, medications, treatment, safety and provider care.',
      button: 'Get the Free Healthy Aging Guide',
    },
    thanks: { assessmentHeading: 'Ready to Explore Healthy Aging & Vitality Programs?', assessmentBody: ASSESSMENT_BODY },
    feature: {
      photo: '/images/program-longevity.webp',
      photoAlt: 'A woman in a hiking vest smiling beside a mountain lake',
      photoSize: [780, 520],
      insideTitle: 'What’s Inside Your Free Healthy Aging Guide?',
      insideLead:
        'Everything you should know before choosing a healthy aging and vitality program—from the different wellness therapies and ' +
        'why they are used to what the research shows and why provider-guided care matters.',
      closeBody:
        'Before choosing a healthy aging and vitality program, download your free Smart Patient’s Guide ' +
        'and learn what you need to know.',
    },
  },

  'nad-therapy': {
    headline: [SMART_PATIENT_LINE, 'Before Considering NAD+ Therapy'],
    intro:
      'NAD+ has drawn a lot of attention for healthy aging, energy and cellular health. But the science behind NAD+ is not the same as the claims made about it. ' +
      'Our free guide gives you a balanced look at what NAD+ is, what we know, and what to ask before considering treatment.',
    inside: [
      'What NAD+ is and the role it plays in the body',
      'Why NAD+ levels and aging are being studied',
      'The relationship between NAD+ and cellular energy',
      'What current research can—and cannot—tell us',
      'Different approaches to supporting NAD+ levels',
      'Direct NAD+ therapy and how it differs from precursor approaches',
      'Why provider-guided treatment matters',
      LAST_POINT,
    ],
    topics: [
      { title: 'What Exactly Is NAD+?', icon: 'molecule' },
      { title: 'What NAD+ Biology Can—and Can’t—Tell Us', icon: 'flask' },
      { title: 'NAD+ vs. NR vs. NMN', icon: 'venn' },
      { title: 'How Is NAD+ Therapy Used?', icon: 'syringe' },
      { title: 'What About Side Effects?', icon: 'info' },
      { title: 'What Does the Research Tell Us?', icon: 'target' },
    ],
    metaDescription: 'Free Smart Patient’s Guide to NAD+ therapy: what NAD+ is, what the research can and cannot tell us, and what to ask before considering treatment.',
    assessmentProgram: 'healthy-aging',
    articleCta: {
      title: 'Want to Learn More About NAD+?',
      body: 'Understand what NAD+ is, what the research actually tells us, and the questions worth asking before treatment.',
      button: 'Get the Free NAD+ Guide',
    },
    thanks: { assessmentHeading: 'Ready to Explore NAD+ Therapy?', assessmentBody: ASSESSMENT_BODY },
    feature: {
      photo: '/images/program-hormone.webp',
      photoAlt: 'A smiling man in a green T-shirt in a bright kitchen',
      photoSize: [780, 520],
      insideTitle: 'What’s Inside Your Free NAD+ Guide?',
      insideLead:
        'Everything you should know before considering NAD+ therapy—from what NAD+ does in the body and what the research can ' +
        'and cannot tell us to treatment approaches, side effects, and provider-guided care.',
      closeBody:
        'Before considering NAD+ therapy, download your free Smart Patient’s Guide ' +
        'and learn what you need to know.',
    },
  },
};

export function guidePageFor(slug: string): GuidePage {
  const page = GUIDE_PAGES[slug];
  if (!page) throw new Error(`No guide page for "${slug}": add it to src/data/guide-pages.ts`);
  return page;
}

/** The band on a program page: a question about that program, then the same invitation everywhere. */
export interface ProgramBandCopy {
  question: string;
  body: string;
}

export const PROGRAM_BAND_COPY: Readonly<Record<ProgramSlug, ProgramBandCopy>> = {
  'weight-loss': {
    question: 'Want to learn more before choosing a GLP-1 program?',
    body: 'Understand how GLP-1 medications work, what to realistically expect, and the questions worth asking before choosing a treatment program.',
  },
  'hair-restoration': {
    question: 'Want to learn more before choosing a hair restoration program?',
    body: 'Understand how hair medications work, what to realistically expect, and the questions worth asking before choosing a treatment program.',
  },
  'sexual-wellness': {
    question: 'Want to learn more before choosing a sexual wellness program?',
    body: 'Understand what can cause E.D., how sexual wellness medications work, what to realistically expect, and the questions worth asking before choosing a treatment program.',
  },
  'healthy-aging': {
    question: 'Want to learn more before choosing a healthy aging and vitality program?',
    body: 'Understand how different therapies work, what to realistically expect, and the questions worth asking before choosing a treatment program.',
  },
};

/** Series-level copy: the home section, the program bands, and the central page. */
export const GUIDE_SERIES = {
  name: 'The Smart Patient’s Guide Series',
  // Home section (client mock 2026-10-05): two-line headline, then the strip, one button and one link.
  homeTitle: ['Download Free Ebooks.', 'Become a More Informed Patient.'] as [string, string],
  homeBody:
    'Cut through the confusion around today’s treatments and wellness options—so you can understand the facts and make more informed healthcare decisions.',
  homeCta: 'Download Free Ebook',
  homeExploreAll: 'Explore All Free Ebooks',
  viewGuide: 'View Free Guide',
  exploreAll: 'Explore All Smart Patient Guides',
  bandHeadline: 'Become a Smart Patient. Download Our Free eBook.',
  bandButton: 'Get the Free Guide',
  indexMeta: 'Free Smart Patient’s Guides on weight loss, sexual wellness, hair restoration, healthy aging and NAD+: understand your options and know what to ask.',
  indexEyebrow: 'The WellPeps Smart Patient’s Guide Series',
  indexTitle: ['Better Information.', 'Better Healthcare Decisions.'] as [string, string],
  indexBody:
    'Healthcare can be complicated. Our free Smart Patient Guides break down today’s treatments and wellness options so you can understand the science, know what questions to ask and make more informed decisions about your care.',
  becomeTitle: 'Become a Smart Patient',
  becomeBody:
    'The Smart Patient’s Guide Series was created to help people better understand their options before making healthcare decisions. If you decide to explore treatment, a licensed healthcare provider reviews your health information and determines whether it may be appropriate.',
  educationLabel: 'Education Before Treatment',
} as const;

/**
 * Shared words for the full landing layout (client mock 2026-10-12, revised to Derek's landing-page
 * notes 2026-10-16). Every guide page follows the same five sections: hero + sign-up, trust strip,
 * inside the guide, more free guides, final call to action. The form's button says "Send Me My Free
 * Guide" (the guide is delivered by email); the closing button says "Download Your Free Guide" and
 * scrolls back to that form (Derek, 2026-10-19).
 *
 * Left out of the original mock on purpose: the "As seen in WebMD, Healthline, Forbes, Verywell Health,
 * Medscape" bar and the "100K+ patients educated", "4.8/5 patient satisfaction" and "100% unbiased"
 * figures, none of which is true or substantiated (FTC endorsement and substantiation rules;
 * LegitScript). "Created by healthcare experts" and "unbiased" are left out for the same reason, and the
 * closing lines promise no outcome.
 */
export const GUIDE_FEATURE_COPY = {
  eyebrow: 'The Smart Patient’s Guide Series',
  titleLead: 'Your Free Guide to',
  formTagline: 'Get the facts before you decide.',
  // True statements only, in place of the mock's media logos and figures.
  trust: [
    { icon: 'tag', title: 'Free to Download', body: 'No cost. No strings attached.' },
    { icon: 'book-open', title: 'Education First', body: 'No treatment signup required.' },
    { icon: 'lock', title: 'Your Email. Your Choice.', body: 'You choose whether to receive more.' },
  ],
  insideEyebrow: 'Inside the guide',
  // Derek 2026-10-19: the series name is the headline, the question line sits under it.
  libraryTitle: 'Explore the Smart Patient’s Guide Series',
  librarySub: 'More Questions? More Free Guides.',
  libraryLead:
    'Explore our collection of free guides covering today’s treatments, medications, and wellness options. ' +
    'Get the information you need to make more informed healthcare decisions.',
  /** How many other guides the library shows; the rest are one click away on the series page. */
  librarySize: 4,
  libraryLink: 'Download Free Guide',
  libraryAll: 'View All Free Guides',
  closeTitle: 'Be Informed. Choose Well.',
  closeSub: 'Your Health. Your Choices. Get the Facts First.',
  closeButton: 'Download Your Free Guide',
  closeNote: 'Free to download. No obligation.',
} as const;
