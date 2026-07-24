/**
 * Central site configuration.
 *
 * WellPeps is the brand-facing marketing site. The actual telehealth
 * intake / assessment / onboarding is operated by OpenLoops. Every
 * "Start Your Free Assessment" CTA points at ONBOARDING_URL.
 *
 * TODO (client): replace the stub below with the real OpenLoops onboarding
 * URL. If OpenLoops supports per-program deep links, use assessmentUrl().
 */
export const ONBOARDING_URL = '#assessment-stub'; // ← swap for OpenLoops URL

/**
 * Existing-patient login. Points at the telehealth company's patient-portal
 * sub-pages. Opens in a new tab (external property).
 *
 * TODO (client): replace the stub below with the real patient-portal URL.
 */
export const PATIENT_PORTAL_URL = '#patient-portal-stub'; // ← swap for portal URL

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
