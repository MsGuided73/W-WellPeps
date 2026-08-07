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
 * Per-program intake deep links.
 *
 * DISABLED PRE-LAUNCH. Testing against the live intake.wellpeps.com backend is
 * complete, so every program CTA falls back to the ONBOARDING_URL stub — no one
 * can start an order or purchase until we launch.
 *
 * To re-enable at launch, restore the real URLs kept alongside each constant:
 *   SEXUAL  → https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNjg%3D
 *   WEIGHT  → https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNDQ%3D
 *   PEPTIDE → https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNzg%3D
 */
export const SEXUAL_ONBOARDING_URL = ONBOARDING_URL;

export const WEIGHT_ONBOARDING_URL = ONBOARDING_URL;

export const PEPTIDE_ONBOARDING_URL = ONBOARDING_URL;

/**
 * Hair Restoration has not launched yet. While true, the program page shows a
 * "Coming Soon" announcement band, its product cards carry a Coming Soon ribbon
 * with the CTA disabled, and the hero / bottom CTAs are replaced.
 *
 * Flip to false at launch — that is the whole switch. See docs/PRE-LAUNCH.md.
 */
export const HAIR_COMING_SOON = true;

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
