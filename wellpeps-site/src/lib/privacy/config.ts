/**
 * Endpoints and switches for the privacy features.
 *
 * The three server functions are WRITTEN (supabase/functions) but NOT DEPLOYED,
 * so every switch below is off. Until then:
 *  - consent choices are saved in the visitor's browser only,
 *  - the request form offers the email fallback, and
 *  - no analytics is sent anywhere.
 * Turn a switch on only after the matching function is deployed and tested. The
 * deploy steps, the secrets each function needs and the post-deploy checklist are
 * in supabase/README.md. The project URL below is public (the signup form uses
 * the same host).
 */
const FUNCTIONS = 'https://kwgwbupqzpusydzflyvi.supabase.co/functions/v1';

/**
 * Needs the `consent-log` function (supabase/functions/consent-log) and its
 * `consent_events` table. Set to true after it is deployed and
 * `supabase secrets set ALLOWED_ORIGINS=...` includes the site's origin.
 */
export const CONSENT_LOG_ENABLED = false;
export const CONSENT_LOG_ENDPOINT = `${FUNCTIONS}/consent-log`;

/**
 * Needs the `privacy-request` function (supabase/functions/privacy-request) and
 * its `privacy_requests` table. Empty = not deployed, and the form falls back to
 * email. After deploying, set it to `${FUNCTIONS}/privacy-request`.
 */
export const PRIVACY_REQUEST_ENDPOINT = '';

/**
 * Needs the `analytics-event` function (supabase/functions/analytics-event) and
 * its `analytics_events` table. Empty = not deployed, and the analytics tool (src/lib/analytics)
 * sends nothing. After deploying, set it to `${FUNCTIONS}/analytics-event`. This
 * is only half of the switch: the tool also stays out of the tracker registry
 * until its own flag is turned on (see src/lib/analytics/README.md).
 */
export const ANALYTICS_ENDPOINT = '';

/**
 * Adds the anonymous analytics tool (src/lib/analytics) to the tracker registry. Once added it
 * runs by default on every page (no banner: it is anonymous, so notice and an opt-out suffice)
 * until the visitor turns off "Anonymous usage statistics" in Your Privacy Choices.
 * Keep false until ALL of these are done (exact steps in src/lib/analytics/README.md):
 *   1. the `analytics-event` function is deployed and ANALYTICS_ENDPOINT is set,
 *   2. counsel has approved the tool for use on health-topic pages,
 *   3. the W7 notice updates are done: the Cookie notice tool table and the Privacy
 *      Policy name the tool, cookie-notice-inventory.ts lists it, and NOTICE_VERSION is bumped.
 * While false, productionTrackers() is empty, no banner is shown and nothing is sent.
 * (notice-inventory.test.ts fails if this is turned on before step 3.)
 */
export const ANALYTICS_ENABLED: boolean = false;

/**
 * How much of a health-topic page's path the analytics tool reports. "section" (the cautious
 * default) reports the section only: /weight-loss, /wellness-learning-center. "full" also
 * reports which Learning Center article was read. Counsel decides whether "full" is
 * acceptable on health-topic pages; only matters once ANALYTICS_ENABLED is true.
 */
export const ANALYTICS_PATH_DETAIL: 'full' | 'section' = 'section';

/**
 * True once the site stops loading fonts from Google. Inter and Lora are now served from
 * this site (styles/fonts.css), so a visit sends nothing to Google. While false, the panel
 * tells visitors that Google receives their IP address. The inventory test fails if this
 * flag and any layout or page disagree.
 */
export const FONTS_SELF_HOSTED = true;

/**
 * Curve's public site id. It ships in the page source, so it is not a secret.
 * Issued for wellpeps.com on 2026-10-15.
 */
export const CURVE_SITE_ID = '5224b1abeb7ae27d6eeb532b052b944c62078c741f7fb59f66037dfddbdded04';

/**
 * Adds Curve Compliance (src/lib/privacy/trackers/curve.ts) to the tracker registry as an
 * ADVERTISING tool. While false it is not in the registry, no banner names it and nothing loads.
 *
 * DO NOT turn this on yet. t.js carries a session recorder and a page rasterizer that Curve's
 * SERVER decides to run, and its heatmaps work by screenshotting pages the visitor viewed —
 * which this site bans. validateRegistry() cannot catch it, because the ban list is by vendor
 * name and host and Curve is on neither. The full blocker and the checklist to clear it are at
 * the top of src/lib/privacy/trackers/curve.ts. In short, all of:
 *   1. Curve dashboard shows session recording OFF and heatmap screenshot capture OFF, evidenced,
 *      and Curve's own consent manager OFF so visitors do not get a second banner,
 *   2. written answers to the 19 questions already sent to Curve,
 *   3. counsel has accepted the residual risk given the BAA,
 *   4. nginx.conf allows both Curve hosts in script-src and connect-src, with
 *      security-headers.test.ts updated,
 *   5. the Cookie notice and cookie-notice-inventory.ts name the tool and NOTICE_VERSION is bumped.
 */
export const CURVE_ENABLED: boolean = false;
