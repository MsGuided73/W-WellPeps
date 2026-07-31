/**
 * Central site configuration.
 *
 * wellpeps.com is the brand-facing marketing site. The telehealth platform
 * (intake / assessment / onboarding / patient portal) runs on the
 * store.wellpeps.com subdomain and is a separate deployment. Every
 * "Start Your Free Assessment" CTA points at ONBOARDING_URL.
 *
 * TODO (client): replace the stub below with the real store.wellpeps.com
 * onboarding URL. If it supports per-program deep links, use assessmentUrl().
 */
export const ONBOARDING_URL = '#assessment-stub'; // ← swap for store.wellpeps.com onboarding URL

/**
 * Sexual Wellness intake. This program is live on the telehealth platform and
 * deep-links straight to its intake product, so its CTAs use this instead of
 * the generic ONBOARDING_URL stub. Other programs follow as they go live.
 */
export const SEXUAL_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNjg%3D';

/** Weight Loss intake — same arrangement as SEXUAL_ONBOARDING_URL above. */
export const WEIGHT_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNDQ%3D';

/** Peptide Wellness intake — same arrangement as SEXUAL_ONBOARDING_URL above. */
export const PEPTIDE_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNzg%3D';

/**
 * Existing-patient login on the telehealth platform (a store.wellpeps.com
 * sub-page). Opens in a new tab (external property).
 *
 * TODO (client): replace the stub below with the real portal URL.
 */
export const PATIENT_PORTAL_URL = '#patient-portal-stub'; // ← swap for store.wellpeps.com portal URL

/** Build an onboarding link, optionally pre-selecting a program. */
export function assessmentUrl(programSlug?: string): string {
  if (ONBOARDING_URL.startsWith('#')) return ONBOARDING_URL;
  return programSlug ? `${ONBOARDING_URL}?program=${programSlug}` : ONBOARDING_URL;
}

export const CONTACT = {
  phone: '(833) 935-7377',
  phoneHref: 'tel:+18339357377',
  hours: 'Mon–Fri, 9am–6pm ET',
  email: 'hello@wellpeps.com',
  coverage: '50 States · Nationwide Care',
};

/** Primary navigation. Program pages are stubbed for this Home Page build. */
export const NAV_LINKS = [
  { label: 'Weight Loss', href: '/weight-loss' },
  { label: 'Hair Restoration', href: '/hair-restoration' },
  { label: 'Sexual Wellness', href: '/sexual-wellness' },
  { label: 'Peptides & More', href: '/peptides' },
  { label: 'Why WellPeps', href: '/why-wellpeps' },
];
