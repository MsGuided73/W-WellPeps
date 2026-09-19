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
 *  Paste each link GEN Health provides over its SCRIPTFUL_* placeholder.
 *
 *  There are no launch flags to flip. A program is OPEN once its link is a real
 *  https URL and COMING SOON while it is still a stub (see src/lib/cta.ts), so
 *  programs can go live one at a time and a half-configured program can never
 *  show a dead button. Links must be https on a host listed in
 *  src/lib/links.ts (portal.wellpeps.com, or GEN Health's shared host); anything
 *  else fails the build with a message naming the bad link.
 *
 *  Verify with:  npm test && npm run build
 * ============================================================================
 */
import type { CtaLinks } from './lib/cta';
import { assertTrustedLinks, isLinked } from './lib/links';

/** GEN Health storefront — the generic entry point for CTAs that are not tied
 *  to a program (nav, home hero, final CTA). While this is a stub those CTAs
 *  go to the home page's program cards instead. */
const SCRIPTFUL_STOREFRONT_URL = '#scriptful-stub-storefront';

/** GEN Health patient portal login, on our own branded subdomain.
 *
 *  DNS verified 16 Sep 2026; the three records GEN Health issued are recorded
 *  in telehealth/portal.wellpeps.com-dns-records.json.
 *
 *  Bare host, not /login: the GEN Health portal is a client-routed SPA (every
 *  path returns the same shell), and GEN Health's own dashboard tells patients
 *  they sign in at https://portal.wellpeps.com. The root sends a signed-out
 *  patient to the login view and a signed-in one straight to their dashboard.
 *
 *  Fallback, if the branded certificate stalls: GEN Health's shared host with
 *  our URL slug — https://app.genhealthehr.com/login?brand=wellpeps. Same login,
 *  unbranded domain. Swapping this one line is the whole change. */
const SCRIPTFUL_PORTAL_URL = 'https://portal.wellpeps.com';

/** GEN Health checkout links, one per program. In GEN Health: /products →
 *  link icon on the product row ("Checkout links for …") → copy the
 *  **Intake-first** link. Intake-first is the flow that keeps "Free Assessment"
 *  true (decided 2026-09-19, see DECISION-LOG.md); use it for every program.
 *  Links only work once the product is Active. UTM params may be appended and
 *  travel with the order. */
const SCRIPTFUL_WEIGHT_PRODUCT_URL = '#scriptful-stub-weight-loss';
const SCRIPTFUL_HAIR_PRODUCT_URL = '#scriptful-stub-hair-restoration';
const SCRIPTFUL_SEXUAL_PRODUCT_URL = '#scriptful-stub-sexual-wellness';
const SCRIPTFUL_HEALTHY_AGING_PRODUCT_URL = '#scriptful-stub-healthy-aging';

/** Intake-first links for individual treatments. GEN Health sells treatments,
 *  not programs, so this is where most links go. The key is the product card's
 *  name, slugged (toProductKey): "Oral Semaglutide" → 'oral-semaglutide'.
 *  A card with no entry here uses its program's link above, or shows
 *  "Opening Soon" if that is still a stub. */
const PRODUCT_LINKS: CtaLinks['products'] = {
  // GEN Health product "Oral Semaglutide (Low-Dose/Tablets)" — four tablet
  // strengths; the provider chooses the strength.
  'oral-semaglutide': {
    program: 'weight-loss',
    url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/CdWCXaI7dpUXkzqGfGAJ_2?checkoutFlow=intake_first',
  },
  // GEN Health product "Injectable Sermorelin (Any Dose)" — the provider
  // chooses the dose.
  sermorelin: {
    program: 'healthy-aging',
    url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/utsDGMi7ITPVBmLMJifw?checkoutFlow=intake_first',
  },
};

/** Every assessment link, keyed by program. Buttons never read these directly —
 *  they go through AssessmentCta / resolveCta in src/lib/cta.ts. */
export const CTA_LINKS: CtaLinks = {
  storefront: SCRIPTFUL_STOREFRONT_URL,
  programs: {
    'weight-loss': SCRIPTFUL_WEIGHT_PRODUCT_URL,
    'hair-restoration': SCRIPTFUL_HAIR_PRODUCT_URL,
    'sexual-wellness': SCRIPTFUL_SEXUAL_PRODUCT_URL,
    'healthy-aging': SCRIPTFUL_HEALTHY_AGING_PRODUCT_URL,
  },
  products: PRODUCT_LINKS,
};

/* A pasted link on plain http or an untrusted host stops the build here, rather
   than shipping as a trusted button or silently showing "Opening Soon". */
assertTrustedLinks([
  CTA_LINKS.storefront,
  ...Object.values(CTA_LINKS.programs),
  ...Object.values(CTA_LINKS.products).map((p) => p.url),
]);

/**
 * Hair Restoration's pre-launch state: the "Coming Soon" announcement band, the
 * ribbon on its product cards, and the pre-launch copy in its hero and bottom
 * CTA. Derived from the link, like every other program — pasting the Hair
 * Restoration link above is what opens the page. See docs/PRE-LAUNCH.md.
 */
export const HAIR_COMING_SOON = !isLinked(SCRIPTFUL_HAIR_PRODUCT_URL);

/** Existing-patient login on GEN Health. Opens in the same tab: the portal is on
 *  our own domain and branding, so it is the next screen of one product, not an
 *  external site (decided 2026-09-19). Linked from the nav and the footer. */
export const PATIENT_PORTAL_URL = SCRIPTFUL_PORTAL_URL;

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
  { label: 'Healthy Aging', href: '/healthy-aging' },
  { label: 'Why WellPeps', href: '/why-wellpeps' },
];
