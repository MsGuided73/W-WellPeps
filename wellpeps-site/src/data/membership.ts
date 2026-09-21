/**
 * The WellPeps membership — copy for the membership section (home page and
 * membership program pages) and the FAQ entries that mention it.
 *
 * The amounts and which programs carry the fee live in src/config.ts
 * (MEMBERSHIP) so the price note, this copy and the FAQs cannot drift apart.
 */
import { MEMBERSHIP } from '../config';

export const membershipIntro = {
  title: 'The WellPeps Membership',
  lead: 'Weight Loss and Hormone Optimization are ongoing programs, so they include a membership that covers your care between prescriptions.',
};

export const membershipPrice = {
  first: `$${MEMBERSHIP.firstMonth}`,
  firstLabel: 'first month',
  then: `then $${MEMBERSHIP.monthly} per month`,
  note: 'Medication is priced separately. Cancel anytime.',
};

export const membershipIncludes = [
  { icon: 'clipboard-check', title: 'Ongoing Provider Care', body: 'Follow-ups and treatment adjustments with your licensed provider as your needs change, at no extra charge.' },
  { icon: 'headset', title: 'Support Between Visits', body: 'Message your care team with questions about your treatment, side effects, or next steps.' },
  { icon: 'flask-search', title: 'Access to Low-Cost Labs', body: 'Member access to lab testing through national lab partners when your provider recommends it. Lab fees are billed separately.' },
  { icon: 'book-open', title: 'Patient Education', body: 'Guides and resources from the Wellness Learning Center to support you throughout your program.' },
];

export const membershipFinePrint =
  `Membership applies to the ${MEMBERSHIP.programs.join(' and ')} programs and renews monthly until you cancel. ` +
  'Medication, lab fees, and shipping are billed separately. ' +
  'Hair Restoration, Sexual Wellness, and Healthy Aging & Vitality have no membership fee.';

/** FAQ entry for a membership program page. */
export const membershipProgramFaqs = [
  {
    q: 'Is there a membership fee?',
    a: `Yes. This program includes the WellPeps membership: $${MEMBERSHIP.firstMonth} for the first month, then $${MEMBERSHIP.monthly} per month. It covers ongoing provider care, support between visits, access to low-cost labs, and patient education. Medication, lab fees, and shipping are billed separately.`,
  },
  {
    q: 'Can I cancel my membership?',
    a: 'Yes. Your membership renews monthly until you cancel, and you can cancel anytime. Medications that have already been ordered or processed for that month’s shipment cannot be refunded.',
  },
];

/** FAQ entry for the home page, where the visitor has not chosen a program. */
export const membershipHomeFaq = {
  q: 'Is there a membership fee?',
  a: `${MEMBERSHIP.programs.join(' and ')} include the WellPeps membership: $${MEMBERSHIP.firstMonth} for the first month, then $${MEMBERSHIP.monthly} per month, covering ongoing provider care, support between visits, access to low-cost labs, and patient education. Hair Restoration, Sexual Wellness, and Healthy Aging & Vitality have no membership fee.`,
};
