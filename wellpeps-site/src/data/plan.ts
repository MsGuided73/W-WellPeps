/**
 * The WellPeps monthly plan — copy for the What's Included section (home page
 * and Weight Loss), the Your Plan page, and the FAQ entries about pricing.
 *
 * Pricing model (final 2026-09-25; wording confirmed 2026-10-05): each treatment has one
 * monthly all-in price that covers the online health questions, the licensed clinician's
 * review, follow-up care, the medication if prescribed, messaging with the care team,
 * education and standard shipping. There is no setup fee and no cancellation fee. Lab tests
 * are the only thing not included: they are billed separately, and tax is added where the law
 * requires it. The price itself is set per product in GEN Health.
 *
 * When the patient is charged (decided 2026-10-06; GEN confirmed): the patient answers the health
 * questions, a licensed clinician reviews them, and only if the clinician prescribes does the
 * patient check out, agree to the renewal terms and pay the first month. If the clinician does not
 * prescribe, the patient never pays. The plan then renews monthly on the same calendar day as that
 * first payment until the patient cancels.
 *
 * Wording rule: "free" may mean only the automated online health questions, and the clinician
 * review and treatment must be stated as part of the monthly price in the same sentence or the
 * next (FTC Guide 16 CFR 251.1). Prefer not to use "free" at all.
 */

export const planIntro = {
  title: 'One Monthly Price. Everything Included.',
  lead: 'Every WellPeps treatment has one monthly price that covers your care from start to finish.',
};

export const planPrice = {
  headline: 'One monthly price',
  sub: 'Covers your clinician’s review, follow-up care, your medication if prescribed, and standard shipping',
  note: 'You pay nothing unless a clinician prescribes treatment. No setup fee, no cancellation fee. Cancel anytime.',
};

export const planIncludes = [
  { icon: 'clipboard-check', title: 'Licensed Provider Care', body: 'Your licensed clinician’s review of your online health questions, plus follow-ups and treatment adjustments as your needs change.' },
  { icon: 'headset', title: 'Messaging With Your Care Team', body: 'Message your provider’s office with questions about your treatment, side effects, or next steps.' },
  { icon: 'pill', title: 'Medication & Standard Shipping', body: 'If prescribed, your medication ships to your door from a licensed U.S. pharmacy at no extra cost.' },
  { icon: 'flask-search', title: 'Lab Testing When Recommended', body: 'Lab testing when your provider recommends it. Lab fees are billed separately.' },
];

export const planFinePrint =
  'You check out and pay only after a licensed clinician prescribes treatment. ' +
  'If your clinician does not prescribe, you never pay. After that first payment, your plan renews ' +
  'monthly on the same day of the month at the price shown at checkout until you cancel. ' +
  'The monthly price also covers your online health questions and patient education. There is no ' +
  'setup fee and no cancellation fee. Lab tests are the only thing not included; they are ' +
  'billed separately. Tax is added where the law requires it. Prescription required.';

/** FAQ entries for program pages. */
export const planProgramFaqs = [
  {
    q: 'What does my monthly price include?',
    a: 'Your one monthly price covers the online health questions, your licensed clinician’s review, follow-up care, your medication if prescribed, messaging with your care team, patient education and standard shipping. There is no setup fee and no cancellation fee. Lab tests are the only thing not included; they are billed separately. Tax is added where the law requires it.',
  },
  {
    q: 'When am I charged?',
    a: 'Only after a licensed clinician prescribes treatment. You answer the health questions first and a clinician reviews them. If the clinician prescribes, you check out, agree to the renewal terms and pay for your first month. If your clinician does not prescribe, you never pay. After that first payment, your plan renews monthly on the same day of the month until you cancel.',
  },
  {
    q: 'Can I cancel my plan?',
    a: 'Yes. Your plan renews monthly until you cancel, and you can cancel anytime with no cancellation fee. Medications that have already been ordered or processed for that month’s shipment cannot be refunded. You can restart anytime. See Manage or Cancel Your Plan at the bottom of any page for the steps.',
  },
];

/** FAQ entry for the home page. */
export const planHomeFaqs = planProgramFaqs.slice(0, 1);
