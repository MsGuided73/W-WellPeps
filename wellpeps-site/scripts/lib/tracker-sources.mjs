/**
 * The only third-party SCRIPT and FETCH targets the Content-Security-Policy admits, and why each is
 * as narrow as it is. Shared by the nginx policy checks (csp-audit.mjs), the unit tests
 * (src/lib/security-headers.test.ts) and the browser check (security-headers-check.mjs).
 *
 * Curve Compliance (src/lib/privacy/trackers/curve.ts), added 2026-11-13.
 *
 * These are FULL PATHS, not hosts, and that is the whole point. Curve's one file, t.js, also
 * contains a session recorder, a page screenshotter, a cross-site identity bridge and its own
 * consent manager, and Curve's SERVER decides which of them run. We cannot switch them off from our
 * side, so the browser refuses them instead. A CSP source that ends without "/" matches that exact
 * path only, so with the two lists below:
 *
 *   allowed   https://t.curvecompliance.com/t.js                       the tag itself
 *   allowed   https://t.curvecompliance.com/tracking/custom-bootstrap  its start-up settings (GET)
 *   allowed   https://t.curvecompliance.com/events/track               conversion events (POST)
 *
 *   refused   /lib/m1.<hash>.js, /lib/m2.<hash>.js      recorder and rasterizer libraries (script-src)
 *   refused   /session-recordings/config and /events    recording set-up and upload, incl. its JSONP
 *                                                       fallback, which is a <script> (both lists)
 *   refused   /api/heatmaps/screenshot                  page screenshots
 *   refused   /api/bridge-tokens, /api/cross-domain-links   identity carried to another site
 *   refused   /api/consent/*                            Curve's own consent manager and its record
 *                                                       of the visitor (ours is the only one)
 *   refused   /events/track/amazon-ads/*, c.amazon-adsystem.com   Amazon Ads destination
 *   refused   complytrack-be-production.up.railway.app  Curve's fallback backend host, unused when
 *                                                       t.js is loaded from t.curvecompliance.com
 *
 * Verified 2026-11-13 by running the live t.js in Chromium under exactly this policy: the pageview
 * event was still sent, and every refused request above was blocked by the browser and logged by
 * t.js as a failed fetch, after which it carried on. `npm run check:headers` repeats the
 * allowed/refused test on every run (section 7).
 *
 * If Curve moves an endpoint, tracking stops and nothing else breaks. Fix it here and in
 * nginx.conf.template; never widen a path to the whole host.
 */
export const TRACKER_SCRIPT_SOURCES = ['https://t.curvecompliance.com/t.js'];

export const TRACKER_CONNECT_SOURCES = [
  'https://t.curvecompliance.com/tracking/custom-bootstrap',
  'https://t.curvecompliance.com/events/track',
];

/** Requests Curve's tag is able to make that the policy must keep refusing. Used by the browser check. */
export const TRACKER_REFUSED = {
  script: [
    'https://t.curvecompliance.com/lib/m1.00000000.js',
    'https://t.curvecompliance.com/lib/m2.00000000.js',
    'https://t.curvecompliance.com/session-recordings/config?callback=x',
    'https://complytrack-be-production.up.railway.app/lib/m1.00000000.js',
    'https://c.amazon-adsystem.com/aat/amzn.js',
  ],
  connect: [
    'https://t.curvecompliance.com/session-recordings/config',
    'https://t.curvecompliance.com/session-recordings/events',
    'https://t.curvecompliance.com/api/heatmaps/screenshot',
    'https://t.curvecompliance.com/api/bridge-tokens',
    'https://t.curvecompliance.com/api/cross-domain-links',
    'https://t.curvecompliance.com/api/consent/config',
    'https://t.curvecompliance.com/api/consent/record',
    'https://t.curvecompliance.com/events/track/amazon-ads/sandbox-dispatch',
    'https://complytrack-be-production.up.railway.app/events/track',
  ],
};

/** Hosts named by the two allow-lists, without the scheme (what the Cookie notice and the registry list). */
export const TRACKER_HOSTS = [...new Set([...TRACKER_SCRIPT_SOURCES, ...TRACKER_CONNECT_SOURCES].map((u) => new URL(u).host))];
