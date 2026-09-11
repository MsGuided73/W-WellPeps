/**
 * Central site configuration.
 *
 * wellpeps.com is the brand-facing marketing site only. The telehealth
 * backend (storefront, intake, provider review, prescriptions, patient portal)
 * runs on Scriptful's GEN Health platform, a separate deployment on its own
 * subdomain. This site never handles PHI; every CTA links out to Scriptful.
 *
 * ============================================================================
 *  SCRIPTFUL CUTOVER — the only edit needed at launch is this block.
 *  Replace each SCRIPTFUL_* placeholder with the link Scriptful provides, then
 *  flip the *_COMING_SOON flags for the programs that are opening.
 *  Verify with:  npm run build && grep -rc "scriptful-stub" dist/   (expect 0)
 * ============================================================================
 */

/** GEN Health storefront / generic "Start Your Free Assessment" entry point. */
const SCRIPTFUL_STOREFRONT_URL = '#scriptful-stub-storefront';

/** GEN Health patient portal login. Custom domain: https://<subdomain>/login
 *  Without a custom domain: GEN Health shared host + /login?brand=<slug> */
const SCRIPTFUL_PORTAL_URL = '#scriptful-stub-portal';

/** GEN Health checkout links, one per program. In GEN Health: /products →
 *  link icon on the product row ("Checkout links for …") → pick ONE flow
 *  (Product-first / Assessment-first / Intake-first) and use the same flow for
 *  all three. Links only work once the product is Active. UTM params may be
 *  appended and travel with the order. */
const SCRIPTFUL_WEIGHT_PRODUCT_URL = '#scriptful-stub-weight-loss';
const SCRIPTFUL_SEXUAL_PRODUCT_URL = '#scriptful-stub-sexual-wellness';
const SCRIPTFUL_PEPTIDE_PRODUCT_URL = '#scriptful-stub-peptides';

/**
 * Site-wide CTA target: nav button, home hero, Help-Find, final CTA,
 * Why WellPeps, Learning Center index, assistant disclaimer, Hair CTAs.
 */
export const ONBOARDING_URL = SCRIPTFUL_STOREFRONT_URL;

/** Per-program intake deep links (product cards, program heroes, bottom CTAs,
 *  Sexual Wellness recommendation block, Learning Center treatment inserts). */
export const SEXUAL_ONBOARDING_URL = SCRIPTFUL_SEXUAL_PRODUCT_URL;
export const WEIGHT_ONBOARDING_URL = SCRIPTFUL_WEIGHT_PRODUCT_URL;
export const PEPTIDE_ONBOARDING_URL = SCRIPTFUL_PEPTIDE_PRODUCT_URL;

/**
 * Hair Restoration has not launched yet. While true, the program page shows a
 * "Coming Soon" announcement band, its product cards carry a Coming Soon ribbon
 * with the CTA disabled, and the hero / bottom CTAs are replaced.
 *
 * Flip to false at launch — that is the whole switch. See docs/PRE-LAUNCH.md.
 */
export const HAIR_COMING_SOON = true;

/**
 * Hero-CTA gates for the two programs whose intake is built but not open.
 *
 * Their hero "Start Free Online Assessment" buttons render as a non-interactive
 * Coming Soon state while these are true. Narrower than HAIR_COMING_SOON: these
 * cover the hero CTA only, not the product cards or an announcement band.
 *
 * Flip to false at launch, alongside the Scriptful links above.
 */
export const SEXUAL_HERO_COMING_SOON = true;
export const PEPTIDE_HERO_COMING_SOON = true;

/** Existing-patient login on GEN Health. Opens in a new tab (external property). */
export const PATIENT_PORTAL_URL = SCRIPTFUL_PORTAL_URL;

/**
 * Build an onboarding link, optionally pre-selecting a program.
 * Confirm with Scriptful whether GEN Health accepts a program query parameter;
 * if not, use the per-program product URLs above instead.
 */
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
