/** Static content for the remaining Home Page sections. */
import { planHomeFaqs } from './plan';

/* ---- Section 5: Your Wellness Journey (5 steps) ---- */
export const journeySteps = [
  { n: 1, title: 'Answer a Few Online Health Questions', body: 'Tell us about your health and wellness goals in a few quick questions.', image: '/images/journey-1.webp', alt: 'Woman completing an online health assessment on a laptop' },
  { n: 2, title: 'Licensed Medical Provider Review', body: 'A licensed medical provider reviews your information to determine the best next steps. The review is included in your monthly price.', image: '/images/journey-2.webp', alt: 'Provider reviewing patient information on a laptop' },
  { n: 3, title: 'Receive Your Custom Treatment Plan', body: 'If approved, your provider creates a personalized treatment plan tailored to your goals.', image: '/images/journey-3.webp', alt: 'Woman reading her treatment plan on a tablet' },
  { n: 4, title: 'Discreet Home Delivery', body: 'If prescribed, medication is shipped directly to your home in discreet, secure packaging.', image: '/images/journey-4.webp', alt: 'Person opening a discreet WellPeps delivery box' },
  { n: 5, title: 'Ongoing Provider Support', body: 'Continue working with your provider as your needs evolve over time.', image: '/images/journey-5.webp', alt: 'Woman on a follow-up video visit at home' },
];

/* ---- Section 2: Why Patients Choose WellPeps ---- */
export const whyPrimary = [
  { img: '/images/why-icon-physician.png', title: 'Patient-Centered Care', body: 'Built to make personalized wellness more accessible, convenient, and patient-centered.' },
  { img: '/images/why-icon-medications.png', title: 'Medications Made in America*', body: 'When applicable, medications are sourced from trusted U.S. pharmacies and manufacturers.' },
  { img: '/images/why-icon-provider.png', title: 'Personalized Provider Evaluations', body: 'Every plan is tailored to you through comprehensive evaluations and ongoing provider support.' },
];
export const whySecondary = [
  { img: '/images/icons/why2-hospital.png', title: 'Clinical Infrastructure Supporting 100+ Healthcare Brands' },
  { img: '/images/icons/why2-map.png', title: 'Providers Licensed in Your State' },
  { img: '/images/icons/why2-laurel.png', title: 'Decades of Healthcare Experience' },
];
/* ---- Section 6: Every WellPeps Program Includes ----
   Four across; icons come from the shared SVG set (the client asked for the
   same style as the "Why Patients Choose WellPeps" icons above). */
export const includes = [
  { icon: 'price-shield', title: 'Transparent Pricing', body: 'Know your full program cost before you begin. No hidden fees. No surprises.' },
  { icon: 'clipboard-check', title: 'Licensed Healthcare Provider Review', body: 'Every treatment begins with a licensed healthcare provider evaluation and a personalized treatment plan.' },
  { icon: 'headset', title: 'Ongoing Provider Support', body: 'Continue working with your provider throughout your treatment journey as your needs evolve.' },
  { icon: 'clock-x', title: 'Cancel Anytime', body: 'Cancel anytime, with no cancellation fee. You pay nothing unless a clinician prescribes treatment.' },
];

/* ---- Section 7: Safety, Wellness & Privacy ---- */
export const safety = [
  { img: '/images/icons/saf-provider.png', title: 'Expert Provider Care', body: 'Every treatment plan is created by a licensed healthcare provider who reviews your health history and makes real clinical decisions.' },
  { img: '/images/icons/saf-lock.png', title: 'Privacy Protected', body: 'We take your privacy seriously. Our Privacy Policy explains what we collect, why, and the choices you have.' },
  { img: '/images/icons/saf-rx.png', title: 'Licensed Pharmacy Partners', body: 'Your medications are prepared by licensed U.S. pharmacies that follow strict quality and safety standards.' },
  /* LegitScript badge removed until the certification application is approved.
     Restore this item (and Safety.astro's 4-column grid) once it is:
  { img: '/images/icons/saf-badge.png', title: 'LegitScript Certified', body: 'WellPeps is LegitScript certified, meeting rigorous standards for transparency, compliance, and patient protection.' },
  */
];

/* ---- Section 8: Wellness Insights & Resources (blog) ---- */
export const insights = [
  { title: 'Understanding GLP-1 Weight Management', body: 'Learn how GLP-1 medications work, who they’re for, and what results you can expect with a personalized plan.', image: '/images/insight-glp1.webp', alt: 'Woman running outdoors', href: '/wellness-learning-center/understanding-glp1-medications' },
  { title: 'What Are Peptides? Understanding Peptide Therapy', body: 'What peptides are, how they function in the body, and how a provider evaluates whether peptide therapy may be appropriate.', image: '/images/insight-peptide.webp', alt: 'Peptide medication vial on a counter', href: '/wellness-learning-center/what-are-peptides' },
  { title: 'Understanding Hair Loss Treatment Options', body: 'Explore proven solutions for thinning hair and hair loss, and how personalized treatment can help you see real results.', image: '/images/insight-hair.webp', alt: 'Man examining his hairline in a mirror', href: '/wellness-learning-center/understanding-hair-loss' },
];

/* ---- Section 9: Common Questions (FAQ) ---- */
export const faqs = [
  {
    q: 'Who is WellPeps?',
    // One paragraph per partner, so each one's role reads on its own (rendered as separate paragraphs).
    a: [
      'WellPeps is a U.S. wellness company that makes it simple to get provider-guided care for weight management, hair restoration, sexual wellness and healthy aging. '
        + 'WellPeps does not practice medicine or pharmacy. Your care comes from three independent partners, each responsible for its own part:',
      { lead: 'Telehealth platform.', text: 'Your health assessment, patient portal, secure messaging and checkout run on GEN Health, a telehealth technology platform operated by Scriptful, Inc.' },
      { lead: 'Medical providers.', text: 'Your assessment is reviewed by a state-licensed clinician of OSI Medical Services, P.A., an independent medical practice contracted with WellPeps. '
        + 'Your clinician alone decides whether treatment is right for you, and which medication and dose.' },
      { lead: 'Pharmacies.', text: 'If you are prescribed treatment, your medication is prepared and shipped by a state-licensed U.S. pharmacy in the OSI / Scriptful Rx pharmacy network.' },
      'WellPeps handles education, enrollment and customer support, and brings it all together in one place, with one monthly price.',
    ],
  },
  {
    q: 'How does the WellPeps platform work?',
    a: 'You start by answering health questions online. A licensed clinician licensed in your state reviews your health history and goals, may ask follow-up questions or request a video visit, and decides whether treatment is appropriate for you. '
      + 'That review, your follow-up care and your medication, if prescribed, are all part of your one monthly price. '
      + 'If you are prescribed treatment, a state-licensed pharmacy prepares your medication and ships it to your home. Your care team is available through secure messaging in your patient portal, and you can cancel your plan at any time. '
      + 'You check out and pay only after your clinician prescribes treatment. If your clinician does not prescribe, you never pay.',
  },
  ...planHomeFaqs,
  { q: 'How do I know if I’m a candidate for treatment?', a: 'Start by answering a few online health questions. A licensed healthcare provider reviews your health history, symptoms, and goals to determine whether a treatment is clinically appropriate for you. That review is included in your monthly price.' },
  { q: 'How do online consultations work?', a: 'After you complete your online health questions, a licensed provider reviews your information online. If needed, they’ll follow up with questions before recommending a personalized treatment plan—no in-person visit required. The consultation is included in your one monthly price.' },
  { q: 'Are your healthcare providers licensed?', a: 'Yes. All treatment decisions are made by independent healthcare providers licensed in your state. Availability varies by state.' },
  { q: 'What states do you serve?', a: 'WellPeps serves patients located in all 50 states. Some medications are not available in every state; if one cannot be shipped to yours, we will tell you before you check out.' },
  { q: 'How are medications delivered?', a: 'If prescribed, medications are prepared by licensed U.S. pharmacies and shipped directly to your home in discreet, secure packaging.' },
  { q: 'Is my personal information secure?', a: 'We take your privacy seriously and use secure technology to protect your information. Our Privacy Policy explains what we collect, why, and the choices you have.' },
  { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, American Express, Discover, FSA/HSA cards, Apple Pay and Google Pay. You’ll see clear pricing before you begin, and you are charged only if a clinician prescribes treatment.' },
  { q: 'What programs does WellPeps offer?', a: 'Weight Management, Hair Restoration, Sexual Wellness, and Healthy Aging & Vitality are available today, with Hormone Optimization coming soon.' },
];
