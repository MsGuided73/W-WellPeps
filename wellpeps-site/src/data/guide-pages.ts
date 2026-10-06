/**
 * Words for the guide-funnel flow (GUIDE_FLOW = 'landing', see src/lib/guide-flow.ts): one landing
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
}

const SMART_PATIENT_LINE = 'What Every Smart Patient Needs to Know';
const ASSESSMENT_BODY = 'Answer a few online health questions to see if you qualify. A licensed clinician reviews your answers, and that review is included in your monthly price.';
const LAST_POINT = 'The questions every Smart Patient should know to ask';

export const GUIDE_PAGES: Readonly<Record<string, GuidePage>> = {
  'glp-1-weight-loss': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a GLP-1 Program'],
    intro:
      'GLP-1 medications have changed weight management—but not every medication, program or provider is the same. ' +
      'Download our free Smart Patient’s Guide to understand the treatment, your options, what to realistically expect, ' +
      'and what to look for when choosing care.',
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
  },

  'sexual-wellness': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Sexual Wellness Program'],
    intro:
      'Sexual health is an important part of overall health, but treatment options can sometimes be confusing—or difficult to talk about. ' +
      'Download our free Smart Patient’s Guide for straightforward information about today’s treatments, what to realistically expect, ' +
      'and the questions worth asking before choosing care.',
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
  },

  'hair-restoration': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Hair Restoration Program'],
    intro:
      'Hair loss is common—but not all hair loss is the same, and choosing a treatment starts with understanding what may be causing it ' +
      'and which options may be appropriate. Download our free Smart Patient’s Guide to understand your options, what to realistically expect, ' +
      'and the questions worth asking before choosing a treatment program.',
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
  },

  'healthy-aging-vitality': {
    headline: [SMART_PATIENT_LINE, 'Before Choosing a Healthy Aging & Vitality Program'],
    intro:
      'Interest in longevity and wellness therapies has grown rapidly—and so has the amount of information, marketing and hype surrounding them. ' +
      'Download our free Smart Patient’s Guide to understand today’s wellness therapies, what we know about them, ' +
      'and how to evaluate your options more thoughtfully.',
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
  },

  'nad-therapy': {
    headline: [SMART_PATIENT_LINE, 'Before Considering NAD+ Therapy'],
    intro:
      'NAD+ has attracted significant attention in the worlds of healthy aging, energy and cellular health—but understanding the science behind NAD+ ' +
      'is different from understanding the claims sometimes made about it. Download our free Smart Patient’s Guide for a balanced look at what NAD+ is, ' +
      'what we know, and what to ask before considering treatment.',
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
      { title: 'Compounded and FDA-Approved Aren’t the Same Thing', icon: 'shield' },
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
  homeTitle: 'What Every Smart Patient Should Know.',
  homeBody:
    'Free eBooks that cut through the confusion around today’s treatments and wellness options—so you can understand the facts, know what questions to ask and make more informed healthcare decisions.',
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
