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
import { parseGuideFlow, type GuideFlow } from './lib/guide-flow';
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
 *  **Assessment-first** link (see PRODUCT_LINKS below for why). Links carry the flow as
 *  `checkoutFlow=visit_first`.
 *  Links only work once the product is Active. UTM params may be appended and
 *  travel with the order. */
const SCRIPTFUL_WEIGHT_PRODUCT_URL = '#scriptful-stub-weight-loss';
const SCRIPTFUL_HAIR_PRODUCT_URL = '#scriptful-stub-hair-restoration';
const SCRIPTFUL_SEXUAL_PRODUCT_URL = '#scriptful-stub-sexual-wellness';
const SCRIPTFUL_HEALTHY_AGING_PRODUCT_URL = '#scriptful-stub-healthy-aging';

/** Assessment-first links for individual treatments, one per product card
 *  (`checkoutFlow=visit_first`, owner 2026-10-09).
 *  GEN Health sells treatments, not programs, so this is where the links go.
 *  The key is the card's name, slugged (toProductKey): "Oral Semaglutide" →
 *  'oral-semaglutide'. In GEN Health's Assessment-first flow the patient completes
 *  the health questions and pays only the assessment, which WellPeps prices at
 *  $0.00, so nothing is charged. A clinician reviews (async, or a live video visit
 *  when needed). Only if the clinician approves does the patient get "Pay for
 *  product" and pay for the treatment; then the prescription goes to the pharmacy.
 *  (GEN Health guide pp. 345, 494-495.) Intake-first, used from 2026-09-30, took
 *  the product payment before the clinician's review, which the site's
 *  "pay only after a prescription" wording did not match. Links and prices
 *  were read from the GEN Health API on 2026-09-30. Every card is linked. */
export const PRODUCT_LINKS = {
  // weight-loss
  // GEN: "GLP-1 Weight Loss – Semaglutide (High Dose / Injectable)" ($179/mo)
  'compounded-semaglutide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/uM0cXePP8e9c5hiMKcRt?checkoutFlow=visit_first' },
  // GEN: "GLP-1 Weight Loss – Tirzepatide (Subcutaneous Injection / 1 x wk)" ($249/mo)
  'compounded-tirzepatide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/SvFDJ7W4nmWL2bkLUMMS?checkoutFlow=visit_first' },
  // GEN: "GLP-1 Weight Loss – Semaglutide (Sublingual or Tablets)" ($229/mo)
  'oral-semaglutide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/vOtVNLOfawMBeTY5l110_1?checkoutFlow=visit_first' },
  // GEN: "GLP-1 Weight Loss Plan – Tirzepatide (Oral/Tablets)" ($229/mo)
  'oral-tirzepatide': { program: 'weight-loss', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/9iUIrANb8j2XW3rNregB?checkoutFlow=visit_first' },
  // hair-restoration
  // GEN: "Hair Loss – Finasteride (Oral)" ($49/mo)
  'oral-finasteride': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/jn0oZRngtKkKh64DRjTz?checkoutFlow=visit_first' },
  // GEN: "Hair Loss – Minoxidil (Oral)" ($49/mo)
  'oral-minoxidil': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/M5oNllXUu1ikySSuXIR0?checkoutFlow=visit_first' },
  // GEN: "Hair Loss – Minoxidil (Topical)" ($99/mo)
  'topical-minoxidil': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Raw7mUkuzzhVdAo88jpL?checkoutFlow=visit_first' },
  // GEN: "Hair Loss - Minoxidil + Finasteride (6% / 0.3% Topical Solution)" ($139/mo)
  'topical-minoxidil-finasteride': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Raw7mUkuzzhVdAo88jpL_1?checkoutFlow=visit_first' },
  // GEN: "Hair Loss – Finasteride + Minoxidil + Tretinoin (Topical)" ($149/mo, Vios;
  // three strengths, provider chooses)
  'topical-finasteride-minoxidil-tretinoin': { program: 'hair-restoration', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/YoKTsMK3BMElUT3PPohU?checkoutFlow=visit_first' },
  // sexual-wellness
  // GEN: "ED – Tadalafil (Daily / Low Dose) Protocol" ($79/mo)
  'tadalafil-daily': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/CASkNPVnxOWgS6xIB5pY?checkoutFlow=visit_first' },
  // GEN: "ED – Tadalafil (On-Demand / High Dose) 15 Pills" ($85/mo). The 5- and
  // 10-pill packs were dropped 2026-09-30: they lose money after fill and shipping.
  'tadalafil-as-needed': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/pXP69VkpzR8Me3cKQFiY_3?checkoutFlow=visit_first' },
  // GEN: "ED – Sildenafil 25 mg (On-Demand) - 15 Tablets" ($79/mo); smaller packs
  // dropped for the same reason.
  'sildenafil-as-needed': { program: 'sexual-wellness', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/ctufh9oNPjNGsOY3wGMU_2?checkoutFlow=visit_first' },
  // healthy-aging
  // GEN: "Peptides – Sermorelin (Injectable)" ($149/mo)
  sermorelin: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/utsDGMi7ITPVBmLMJifw?checkoutFlow=visit_first' },
  // GEN: "Peptides-NAD+ (Injectable)" ($169/mo)
  nad: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/SHJpGAACUFEeMONdpEbn?checkoutFlow=visit_first' },
  // GEN: "NAD+ Nasal Spray" ($139/mo) — the Nasal Spray choice on the NAD+ card (owner, 2026-10-09)
  'nad-nasal-spray': { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/FVwkzvQqWIZRNAwbslGw?checkoutFlow=visit_first' },
  // GEN: "Wellness – Glutathione (Injectable)" ($99/mo)
  glutathione: { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/17H4pVR8uYnwvcBIz8iY?checkoutFlow=visit_first' },
  // GEN: "Peptides - Methylene Blue Capsules" ($99/mo)
  'methylene-blue': { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/dLH4UrgqWuotQRWbot6J?checkoutFlow=visit_first' },
  // GEN: "Wellness – MIC-B12 (Lipotropic / Fat Burn)" ($119/mo)
  'mic-b12': { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Ia4ee35szTk7xk02eBQp?checkoutFlow=visit_first' },
  // GEN: "Wellness – Lipo-C" ($119/mo; created as a duplicate of MIC-B12 in GEN,
  // so confirm its formulary pairing is the L-carnitine formula)
  'lipo-c': { program: 'healthy-aging', url: 'https://portal.wellpeps.com/Zst5Qu9lkZz7vKNusesA/product/Ia4ee35szTk7xk02eBQp_1?checkoutFlow=visit_first' },
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
  'oral-tirzepatide',
  'oral-finasteride',
  'oral-minoxidil',
  'topical-minoxidil',
  'topical-minoxidil-finasteride',
  'topical-finasteride-minoxidil-tretinoin',
  'tadalafil-daily',
  'tadalafil-as-needed',
  'sildenafil-as-needed',
  'sermorelin',
  'nad',
  'nad-nasal-spray',
  'glutathione',
  'methylene-blue',
  'mic-b12',
  'lipo-c',
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

/**
 * CHECKOUT LOCK (pre-launch, 2026-10-01). While true, every page stays public
 * but each assessment button asks for the access password before it reveals a
 * GEN Health checkout link; the links ship only in encrypted form
 * (src/lib/checkout-lock.ts). Share the password with the LegitScript reviewer,
 * Scriptful and the team only.
 *
 * After changing any link or the password: put the password in
 * wellpeps-site/.env as CHECKOUT_LOCK_PASSWORD and run `npm run lock:checkout`
 * (the build fails while src/data/checkout-lock.json is out of date).
 * At launch: set this to false and deploy.
 *
 * Turned off 2026-10-09 (owner): every assessment button links straight to its GEN Health
 * checkout. Set back to true to re-lock (the encrypted links in checkout-lock.json are kept).
 */
export const CHECKOUT_LOCKED = false;

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

/**
 * How the free Smart Patient Guides are offered (see src/lib/guide-flow.ts and docs/GUIDE-FLOW.md).
 * Chosen at build time with the PUBLIC_GUIDE_FLOW environment variable: unset or "dialog" keeps the
 * live flow (an email dialog on each page); "landing" turns on the guide-funnel flow (3D ring on the
 * home page, one landing page per guide, a thank-you page and a Smart Patient Guides index).
 */
export const GUIDE_FLOW: GuideFlow = parseGuideFlow(
  (import.meta.env?.PUBLIC_GUIDE_FLOW as string | undefined) ?? (typeof process !== 'undefined' ? process.env.PUBLIC_GUIDE_FLOW : undefined),
);
export const GUIDE_LANDING_FLOW = GUIDE_FLOW === 'landing';

/** Shown under every program's product grid. One monthly price, no
 *  separate fees (decided 2026-09-25); standard shipping is included and labs
 *  are billed separately. See src/data/plan.ts. */
export const PRICE_NOTE =
  'One monthly price covers your licensed clinician’s review, follow-up care, your medication if prescribed, messaging with your care team, and standard shipping. Lab tests are billed separately. You pay nothing unless a clinician prescribes treatment.';

/** Existing-patient login on GEN Health. Opens in the same tab: the portal is on
 *  our own domain and branding, so it is the next screen of one product, not an
 *  external site (decided 2026-09-19). Linked from the nav and the footer. */
export const PATIENT_PORTAL_URL = SCRIPTFUL_PORTAL_URL;

export const CONTACT = {
  hours: 'Mon–Fri, 9am–6pm ET',
  /** Patient help: account, billing, cancellations (client, 2026-10-02). */
  email: 'support@wellpeps.com',
  /** Support line, staffed during normal business hours (client, 2026-10-02). */
  phone: '(307) 881-8700',
  phoneHref: 'tel:+13078818700',
};

/**
 * The company's published business address (a real street address, not the registered
 * agent's; LegitScript compares it with the contracts). Empty until confirmed: the footer
 * and Contact page then show no address on the live site.
 */
export const CONTACT_ADDRESS: string = '30 N Gould St., Suite R, Sheridan, WY 82801';

/**
 * WellPeps email addresses, in one place. PROPOSED: the owner has not yet confirmed
 * them (hello@ is what the site shows today; the drafted documents assume support@).
 * Each must land in a monitored shared inbox before it is published. The Contact
 * page and the privacy request form read these.
 */
export const EMAILS = {
  support: 'support@wellpeps.com',
  privacy: 'privacy@wellpeps.com',
  /** General enquiries. */
  info: 'info@wellpeps.com',
  accessibility: 'accessibility@wellpeps.com',
} as const;

/** Primary navigation. Program pages are stubbed for this Home Page build. */
export const NAV_LINKS = [
  { label: 'Weight Loss', href: '/weight-loss' },
  { label: 'Hair Restoration', href: '/hair-restoration' },
  { label: 'Sexual Wellness', href: '/sexual-wellness' },
  { label: 'Healthy Aging', href: '/healthy-aging' },
  { label: 'Why WellPeps', href: '/why-wellpeps' },
];
