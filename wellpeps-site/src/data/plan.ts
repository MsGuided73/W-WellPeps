/**
 * The WellPeps monthly plan — copy for the What's Included section (home page
 * and Weight Loss), the Your Plan page, and the FAQ entries about pricing.
 *
 * Pricing model (final 2026-09-25): each treatment has one
 * monthly price that covers the medication, provider care, messaging with the
 * care team and standard shipping. Labs are never "included": when a provider
 * recommends them, patients get low-cost access and lab fees are billed
 * separately. The price itself is set per product in GEN Health.
 *
 * Deposit (2026-09-30): patients pay a $29 deposit when they start, and
 * authorize the remaining balance. If the provider prescribes, the deposit is
 * credited to the first month and the balance is charged; if not, the $29 is
 * refunded in full. That refund is what keeps "Free Assessment" true.
 */
import { DEPOSIT } from '../config';

export const planIntro = {
  title: 'One Monthly Price. Everything Included.',
  lead: 'Every WellPeps treatment has one monthly price that covers your care from start to finish.',
};

export const planPrice = {
  headline: 'One monthly price',
  sub: 'Covers your medication, provider care, and shipping',
  note: 'No hidden fees. Cancel anytime.',
};

export const planIncludes = [
  { icon: 'clipboard-check', title: 'Licensed Provider Care', body: 'Your evaluation, follow-ups, and treatment adjustments with your licensed provider as your needs change.' },
  { icon: 'headset', title: 'Messaging With Your Care Team', body: 'Message your provider’s office with questions about your treatment, side effects, or next steps.' },
  { icon: 'pill', title: 'Medication & Standard Shipping', body: 'If prescribed, your medication ships to your door from a licensed U.S. pharmacy at no extra cost.' },
  { icon: 'flask-search', title: 'Access to Low-Cost Labs', body: 'Low-cost lab testing through national lab partners when your provider recommends it. Lab fees are billed separately.' },
];

export const planFinePrint =
  `A $${DEPOSIT} deposit is collected when you start and applied to your first month if your provider prescribes treatment; if not, it is refunded in full. ` +
  'Your plan renews monthly at the price shown at checkout until you cancel. ' +
  'Lab fees, when your provider recommends labs, are billed separately. Prescription required.';

/** FAQ entries for program pages. */
export const planProgramFaqs = [
  {
    q: 'What does my monthly price include?',
    a: 'Your monthly price covers your medication, if prescribed, your licensed provider care, messaging with your care team, and standard shipping. Lab fees, when your provider recommends labs, are billed separately.',
  },
  {
    q: 'Do I pay anything up front?',
    a: `Yes, a $${DEPOSIT} deposit when you start your assessment, and you authorize us to charge the remaining balance of your first month. If your provider prescribes treatment, the $${DEPOSIT} is applied to your first month and the balance is charged then. If your provider does not prescribe treatment, your $${DEPOSIT} is refunded in full, so the assessment itself is free.`,
  },
  {
    q: 'Can I cancel my plan?',
    a: 'Yes. Your plan renews monthly until you cancel, and you can cancel anytime with no cancellation fee. Medications that have already been ordered or processed for that month’s shipment cannot be refunded. You can restart anytime. See Manage or Cancel Your Plan at the bottom of any page for the steps.',
  },
];

/** FAQ entry for the home page. */
export const planHomeFaqs = planProgramFaqs.slice(0, 2);
