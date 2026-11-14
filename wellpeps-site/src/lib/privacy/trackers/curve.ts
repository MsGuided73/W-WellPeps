/**
 * Curve Compliance as a registry entry (src/lib/privacy/registry.ts).
 *
 * `curveTracker()` is a FACTORY. productionTrackers() calls it when CURVE_ENABLED is true in
 * privacy/config.ts. It was switched ON on 2026-11-13 at the owner's direction, after the BAA
 * with Curve was signed.
 *
 * What this tool is for: WellPeps advertises on Google and Meta. No adverts are shown on
 * wellpeps.com. Curve reports which of those adverts led to a visit and a sign-up, strips
 * health details on its own servers, and passes the result to Meta and Google. It sits in the
 * site's "advertising" consent category because that is the category for advert measurement.
 *
 * Everything here was read out of the live script (https://t.curvecompliance.com/t.js, 165 KB
 * on 2026-10-15, 199 KB on 2026-11-13), not from Curve's marketing pages, which do not
 * document any of it.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THE RISK IN THIS FILE, AND WHAT CONTAINS IT
 * ──────────────────────────────────────────────────────────────────────────
 * The same t.js that does conversion tracking also contains a session recorder and a page
 * rasterizer, which it loads on demand:
 *
 *     RECORDER_LIB_URL        /lib/m1.<hash>.js
 *     RASTERIZER_LIB_URL      /lib/m2.<hash>.js
 *     HEATMAP_SCREENSHOT_ENDPOINT  /api/heatmaps/screenshot
 *
 * plus a cross-site identity bridge (/api/bridge-tokens, /api/cross-domain-links) and its own
 * consent manager (/api/consent/*). Whether each runs is decided by CURVE'S SERVER, from the
 * Curve dashboard, with no change to this repo and no deploy. Nothing in this file, and nothing
 * in the registry, can stop that: validateRegistry() bans session replay by vendor name and
 * host, and Curve is on neither list. So the entry below still does NOT claim
 * `sessionReplay: false`.
 *
 * The control is the Content-Security-Policy instead. nginx.conf.template admits three exact
 * URLs and nothing else from Curve: /t.js as a script, and /tracking/custom-bootstrap and
 * /events/track as fetches. The recorder and rasterizer libraries, the recording set-up call
 * (and its JSONP fallback, which is a script), screenshots, the bridge and the consent manager
 * are therefore refused by the visitor's browser whatever the dashboard says. The table, and
 * the record of the test that proved conversion events still send under it, are in
 * scripts/lib/tracker-sources.mjs. security-headers.test.ts fails if a path is widened to the
 * host, and `npm run check:headers` proves the refusals in a real browser on every run.
 *
 * What the policy cannot see or stop, and Curve's BAA and written answers must cover:
 *   - what the /events/track payload contains (page URL and title, referrer, ad click ids, a
 *     browser identifier derived from browser characteristics, session counters);
 *   - what Curve forwards to Meta and Google and how long it keeps it;
 *   - anything Curve adds to t.js itself in a later release. Re-read t.js when its size changes.
 *
 * Observed on 2026-11-13 from Curve's own start-up responses for this site id: Curve's consent
 * manager is not enabled, cross-domain linking is off with no linked domains, the call-tracking
 * bridge is off, and no extra script or inline code is configured. The session-recording
 * setting could not be read (the endpoint refuses automated browsers), so confirm in the Curve
 * dashboard that session recording and heatmap screenshots are OFF, and keep a screenshot.
 * The policy blocks them either way; the dashboard setting is the second lock.
 *
 * Still to do outside this repo:
 *   - counsel reviews the wording of the Cookie notice, Privacy Policy and Your Privacy Choices
 *     changes that went out with this switch, and whether sending conversion events to Meta and
 *     Google is "sharing" or "targeted advertising" under state law;
 *   - Curve's written answers to the questions sent in October;
 *   - deploy the consent-log function and turn CONSENT_LOG_ENABLED on, so there is a server
 *     record of each visitor's choice (today the choice is kept in the visitor's browser only).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT A <script> TAG IN BaseLayout
 * ──────────────────────────────────────────────────────────────────────────
 * Curve's install snippet is written for the <head>. Pasted there, on this site it
 * would (1) be blocked outright, because nginx.conf pins `script-src 'self'`;
 * (2) run before the visitor has chosen anything; (3) run on health-topic pages,
 * where advertising needs the separate `advertisingSensitive` consent; and
 * (4) decide about Global Privacy Control itself rather than honouring the gate.
 * Going through the registry gets all four right.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CURVE'S OWN CONSENT LAYER — must be kept out of the way
 * ──────────────────────────────────────────────────────────────────────────
 * t.js ships a full consent manager: its own banner, its own jurisdiction rules,
 * its own GPC handling, and a POST of every decision to a consent-record endpoint
 * carrying `user_identifier`, `page_url` and `gpc_signal`. It turns itself on only
 * if Curve's server returns `enabled: true` for this site. It is off for this site
 * (2026-11-13), and the policy refuses /api/consent/* in any case, so there is never a
 * second banner and Curve's consent-record call (which carries a browser identifier and
 * the page URL) never leaves the browser.
 *
 * This site stays the single source of truth: the gate decides, and load() tells
 * Curve the answer immediately via its documented-by-behaviour API:
 *
 *     Curve('updateConsent', { analytics: boolean, advertising: boolean })
 *     Curve('withdrawConsent')
 *     Curve('optOut' | 'optIn')
 *     Curve('getConsentState')
 *
 * Note the asymmetry in updateConsent: analytics is `!== false` (so it is ON when
 * the key is omitted) while advertising is `=== true`. Both keys are therefore
 * always passed explicitly below.
 */
import type { Tracker } from '../registry';

export const CURVE_TRACKER_ID = 'curve-compliance';

/**
 * Every localStorage key t.js can write, read from its own constants (re-read 2026-11-13:
 * the list had grown since October). The gate removes these by exact name when the visitor
 * turns the tool off.
 */
export const CURVE_STORAGE_KEYS = [
  'phi_tracker_state',
  'complytrack_session',
  'complytrack_idmt',
  'complytrack_consent',
  'complytrack_consent_cfg',
  'complytrack_gpc_record',
  'complytrack_opt_out',
  'complytrack_rst',
  'complytrack_rst_rep',
  'complytrack_storage_probe',
  'complytrack_xpgone',
  'curve_exclude',
  'ct_exp',
];

/** Cookies t.js can set: the cross-domain cookie (30-minute max age), its successor, and the reset, visitor and bridge-token cookies. */
export const CURVE_COOKIES = ['_ct_xd', '_ct_xd2', '_ct_rst', '_ct_vid', '_ct_bt'];

const SCRIPT_SRC = 'https://t.curvecompliance.com/t.js';
const SCRIPT_ID = 'curve-compliance-tag';

/**
 * The one host a page contacts once the tool is on. t.js takes its backend address from its own
 * script URL, so every call goes to this host; Curve's fallback backend
 * (complytrack-be-production.up.railway.app) is not used and the policy refuses it. Must match
 * the Cookie notice and scripts/lib/tracker-sources.mjs (security-headers.test.ts checks).
 */
export const CURVE_HOSTS = ['t.curvecompliance.com'];

interface CurveWindow extends Window {
  Curve?: { (...args: unknown[]): void; q?: unknown[]; l?: number };
}

export interface CurveTrackerOptions {
  /** Curve's public site id. It ships in the page, so it is not a secret. Empty = never loads. */
  siteId: string;
  /** Test seam. Defaults to the real window. */
  win?: CurveWindow;
  /** Test seam. Defaults to the real document. */
  doc?: Document;
}

export function curveTracker(opts: CurveTrackerOptions): Tracker {
  const siteId = opts.siteId;
  const target = () => {
    const win = opts.win ?? (globalThis as unknown as CurveWindow);
    return { win, doc: opts.doc ?? win.document };
  };

  return {
    id: CURVE_TRACKER_ID,
    name: 'Curve Compliance conversion tracking',
    vendor: 'Curve Compliance, Inc.',
    category: 'advertising',
    // Shown to visitors in Your Privacy Choices. Counsel still has to review this wording. It
    // must stay true of what the script actually does.
    description:
      'Measures which of our adverts on Google and Meta led to a visit or a sign-up, so we can stop paying for ones that do not work. We do not show adverts on this site. It stores an identifier for this browser, records the pages you view and what you click, and shares conversion events with Meta and Google after removing health details. It does not read what you type; form tracking sends only that a form was submitted. Session recording and screenshots are blocked.',
    hosts: CURVE_HOSTS,
    cookies: CURVE_COOKIES,
    storageKeys: CURVE_STORAGE_KEYS,
    // `sessionReplay: false` is deliberately NOT claimed. t.js carries a recorder
    // that Curve's server can enable; we cannot assert from here that it is off.

    /** Called by the gate ONLY after it has confirmed advertising consent for this page. */
    load() {
      const { win, doc } = target();
      if (!siteId || !doc) return;
      if (doc.getElementById(SCRIPT_ID)) return; // already running

      // Curve's queue stub, so calls made before the file lands are replayed.
      win.Curve =
        win.Curve ||
        function (...args: unknown[]) {
          (win.Curve!.q = win.Curve!.q || []).push(args);
        };
      win.Curve.l = Date.now();

      const tag = doc.createElement('script');
      tag.id = SCRIPT_ID;
      tag.async = true;
      tag.src = SCRIPT_SRC;
      tag.onload = () => {
        win.Curve?.('init', siteId);
        // The gate only calls load() when advertising is allowed here, so state
        // the answer at once. Both keys are explicit: omitting analytics would
        // turn it on, because updateConsent reads it as `!== false`.
        win.Curve?.('updateConsent', { analytics: false, advertising: true });
      };
      doc.head.appendChild(tag);
    },

    /** Stop it in the same visit. The gate removes the cookie and the storage keys. */
    unload() {
      const { win, doc } = target();
      try {
        win.Curve?.('updateConsent', { analytics: false, advertising: false });
        win.Curve?.('withdrawConsent');
        win.Curve?.('optOut');
      } catch {
        // The vendor file may not have loaded. Removing the tag is still worthwhile.
      }
      doc?.getElementById(SCRIPT_ID)?.remove();
    },
  };
}
