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

/** Assessment-first links for individual treatments, one per product card.
 *  GEN Health sells treatments, not programs, so this is where the links go.
 *  The key is the card's name, slugged (toProductKey): "Oral Semaglutide" →
 *  'oral-semaglutide'. Assessment-first is the $29 flow (decided 2026-09-30):
 *  the patient pays the assessment up front and the balance on approval.
 *  Links and prices were read from the GEN Health API on 2026-09-30; see
 *  docs/genhealth for the product list. Not linked yet: Oral Tirzepatide (its
 *  GEN product is still $0), MIC + B12 and Lipo-C (not in GEN yet). */
export const PRODUCT_LINKS = {
  // weight-loss
  // GEN: "GLP-1 Weight Loss – Semaglutide (High Dose / Injectable)" ($179/mo)
  'compounded-semaglutide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_uM0cXePP8e9c5hiMKcRt?checkoutFlow=visit_first' },
  // GEN: "GLP-1 Weight Loss – Tirzepatide (Subcutaneous Injection / 1 x wk)" ($249/mo)
  'compounded-tirzepatide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_SvFDJ7W4nmWL2bkLUMMS?checkoutFlow=visit_first' },
  // GEN: "GLP-1 Weight Loss – Semaglutide (Sublingual or Tablets)" ($229/mo)
  'oral-semaglutide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/vOtVNLOfawMBeTY5l110_1?checkoutFlow=visit_first' },
  // hair-restoration
  // GEN: "Hair Loss – Finasteride (Oral)" ($49/mo)
  'oral-finasteride': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_jn0oZRngtKkKh64DRjTz?checkoutFlow=visit_first' },
  // GEN: "Hair Loss – Minoxidil (Oral)" ($49/mo)
  'oral-minoxidil': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_M5oNllXUu1ikySSuXIR0?checkoutFlow=visit_first' },
  // GEN: "Hair Loss – Minoxidil (Topical)" ($99/mo)
  'topical-minoxidil': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_Raw7mUkuzzhVdAo88jpL?checkoutFlow=visit_first' },
  // GEN: "Hair Loss - Minoxidil + Finasteride (6% / 0.3% Topical Solution)" ($139/mo)
  'topical-minoxidil-finasteride': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Raw7mUkuzzhVdAo88jpL_1?checkoutFlow=visit_first' },
  // sexual-wellness
  // GEN: "ED – Tadalafil (Daily / Low Dose) Protocol" ($79/mo)
  'tadalafil-daily': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_CASkNPVnxOWgS6xIB5pY?checkoutFlow=visit_first' },
  // GEN: "ED – Tadalafil (As Needed) 5 pills" ($45/mo)
  'tadalafil-as-needed': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/pXP69VkpzR8Me3cKQFiY_1?checkoutFlow=visit_first' },
  // GEN: "ED – Sildenafil 25 mg (On-Demand) - 5 Tablets" ($39/mo)
  'sildenafil-as-needed': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_ctufh9oNPjNGsOY3wGMU?checkoutFlow=visit_first' },
  // healthy-aging
  // GEN: "Peptides – Sermorelin (Injectable)" ($149/mo)
  sermorelin: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_utsDGMi7ITPVBmLMJifw?checkoutFlow=visit_first' },
  // GEN: "Peptides-NAD+ (Injectable)" ($169/mo)
  nad: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_SHJpGAACUFEeMONdpEbn?checkoutFlow=visit_first' },
  // GEN: "Wellness – Glutathione (Injectable)" ($99/mo)
  glutathione: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_17H4pVR8uYnwvcBIz8iY?checkoutFlow=visit_first' },
  // GEN: "Peptides - Methylene Blue Capsules" ($99/mo)
  'methylene-blue': { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Zst5Qu9lkZz7vKNusesA_MoDyAcICE5RDa4DfaeBX_dLH4UrgqWuotQRWbot6J?checkoutFlow=visit_first' },
} satisfies CtaLinks['products'];

/**
 * LIVE TREATMENTS. Only the cards listed here send a visitor to a GEN Health
 * intake; every other card, even one with a link above, shows "Opening Soon".
 * Reactivate a treatment by adding its key here and deploying; take it down by
 * removing it. A key with no link above fails typecheck.
 *
 * All intakes were paused 2026-09-21 while pricing and billing were settled;
 * every card with a ready GEN product was switched back on 2026-09-30.
 */
export const LIVE_PRODUCTS: readonly (keyof typeof PRODUCT_LINKS)[] = [
  'compounded-semaglutide',
  'compounded-tirzepatide',
  'oral-semaglutide',
  'oral-finasteride',
  'oral-minoxidil',
  'topical-minoxidil',
  'topical-minoxidil-finasteride',
  'tadalafil-daily',
  'tadalafil-as-needed',
  'sildenafil-as-needed',
  'sermorelin',
  'nad',
  'glutathione',
  'methylene-blue',
];

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
  products: Object.fromEntries(LIVE_PRODUCTS.map((key) => [key, PRODUCT_LINKS[key]])),
};

/* A pasted link on plain http or an untrusted host stops the build here, rather
   than shipping as a trusted button or silently showing "Opening Soon". */
assertTrustedLinks([
  CTA_LINKS.storefront,
  ...Object.values(CTA_LINKS.programs),
  // Every link, not just the live ones, so a bad paste fails before it goes live.
  ...Object.values(PRODUCT_LINKS).map((p) => p.url),
]);

/**
 * Hair Restoration's pre-launch state: the "Coming Soon" announcement band, the
 * ribbon on its product cards, and the pre-launch copy in its hero and bottom
 * CTA. Derived from the links, like every other program — pasting the Hair
 * Restoration link above, or the first hair treatment link, is what opens the
 * page. See docs/PRE-LAUNCH.md.
 */
export const HAIR_COMING_SOON =
  !isLinked(SCRIPTFUL_HAIR_PRODUCT_URL) &&
  !Object.values(PRODUCT_LINKS).some((p) => p.program === 'hair-restoration' && isLinked(p.url));

/** Shown under every program's product grid. One monthly price, no
 *  separate fees (decided 2026-09-25); standard shipping is included and labs
 *  are billed separately. See src/data/plan.ts. */
/** Deposit taken when a patient starts an assessment (2026-09-30). Credited to
 *  the first month if the provider prescribes, refunded in full if not, which
 *  is what keeps "Free Assessment" true. The one source for the amount. */
export const DEPOSIT = 29;

export const PRICE_NOTE =
  'One monthly price covers your medication, if prescribed, provider care, messaging with your care team, and standard shipping. ' +
  `A $${DEPOSIT} deposit is collected when you start: applied to your first month if you are prescribed treatment, refunded in full if not.`;

/** Existing-patient login on GEN Health. Opens in the same tab: the portal is on
 *  our own domain and branding, so it is the next screen of one product, not an
 *  external site (decided 2026-09-19). Linked from the nav and the footer. */
export const PATIENT_PORTAL_URL = SCRIPTFUL_PORTAL_URL;

export const CONTACT = {
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
