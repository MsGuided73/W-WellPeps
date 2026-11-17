/**
 * The third-party sources the Content-Security-Policy admits for the consent-gated advertising tool,
 * Curve Compliance (src/lib/privacy/trackers/curve.ts). Shared by the nginx policy checks
 * (csp-audit.mjs), the unit tests (src/lib/security-headers.test.ts) and the browser check
 * (security-headers-check.mjs).
 *
 * OWNER DECISION, 2026-11-17: Curve's tag runs IN FULL. Curve is engaged under a signed BAA to
 * de-identify and aggregate what it collects, so the site no longer narrows the tag to three exact
 * URLs (the 2026-11-13 policy). Whatever Curve's dashboard switches on now works in the browser:
 * conversion events, session recording, heatmap screenshots, the cross-site bridge, Curve's own
 * consent manager, the Amazon Ads destination (a sandboxed iframe Curve serves) and Curve's
 * fallback backend host.
 *
 * What did NOT change: the tag still loads only after the visitor says yes to advertising, and on
 * health-topic pages only after the separate second consent (the gate in src/lib/privacy/).
 *
 * One thing stays closed on purpose. Curve's start-up settings can also name an extra script on ANY
 * host (`scriptUrl`) or inline code (`inlineCode`). Admitting those would mean `script-src *` or
 * `'unsafe-inline'`, which switches off the policy's protection against injected script on every
 * page, not just for Curve. Neither was configured for this site on 2026-11-13. If Curve needs one,
 * add that exact host here and in nginx.conf.template.
 */
export const CURVE_ORIGIN = 'https://t.curvecompliance.com';
/** Curve's fallback backend (used if t.js is served from there). */
export const CURVE_FALLBACK_ORIGIN = 'https://complytrack-be-production.up.railway.app';
/** Amazon Ads loader, which Curve's Amazon Ads destination can load. */
export const AMAZON_ADS_ORIGIN = 'https://c.amazon-adsystem.com';

export const TRACKER_SCRIPT_SOURCES = [CURVE_ORIGIN, CURVE_FALLBACK_ORIGIN, AMAZON_ADS_ORIGIN];

export const TRACKER_CONNECT_SOURCES = [CURVE_ORIGIN, CURVE_FALLBACK_ORIGIN];

/** Curve's Amazon Ads destination runs in a sandboxed iframe that Curve serves. */
export const TRACKER_FRAME_SOURCES = [CURVE_ORIGIN];

/** Curve's page screenshots draw video frames as data: images while capturing. */
export const TRACKER_IMG_SOURCES = ['data:'];

/**
 * Requests Curve's tag is able to make. Every one must be ADMITTED by the policy (the browser check
 * and the unit tests prove it). Until 2026-11-17 most of these were refused.
 */
export const TRACKER_ADMITTED = {
  script: [
    `${CURVE_ORIGIN}/t.js`,
    `${CURVE_ORIGIN}/lib/m1.00000000.js`,
    `${CURVE_ORIGIN}/lib/m2.00000000.js`,
    `${CURVE_ORIGIN}/session-recordings/config?callback=x`,
    `${CURVE_FALLBACK_ORIGIN}/lib/m1.00000000.js`,
    `${AMAZON_ADS_ORIGIN}/aat/amzn.js`,
  ],
  connect: [
    `${CURVE_ORIGIN}/tracking/custom-bootstrap`,
    `${CURVE_ORIGIN}/events/track`,
    `${CURVE_ORIGIN}/session-recordings/config`,
    `${CURVE_ORIGIN}/session-recordings/events`,
    `${CURVE_ORIGIN}/api/heatmaps/screenshot`,
    `${CURVE_ORIGIN}/api/bridge-tokens`,
    `${CURVE_ORIGIN}/api/cross-domain-links`,
    `${CURVE_ORIGIN}/api/consent/config`,
    `${CURVE_ORIGIN}/api/consent/record`,
    `${CURVE_ORIGIN}/events/track/amazon-ads/sandbox-dispatch`,
    `${CURVE_FALLBACK_ORIGIN}/events/track`,
  ],
};

/** Hosts the policy admits for the tool, without the scheme (what the Cookie notice and the registry list). */
export const TRACKER_HOSTS = [...new Set([...TRACKER_SCRIPT_SOURCES, ...TRACKER_CONNECT_SOURCES, ...TRACKER_FRAME_SOURCES].map((u) => new URL(u).host))];
