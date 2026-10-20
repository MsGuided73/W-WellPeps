/**
 * Curve Compliance as a registry entry (src/lib/privacy/registry.ts).
 *
 * `curveTracker()` is a FACTORY. productionTrackers() calls it only when
 * CURVE_ENABLED is true in privacy/config.ts. It is FALSE and must stay false
 * until the blocker below is resolved — see "Read this before switching it on".
 *
 * Everything here was read out of the live script (https://t.curvecompliance.com/t.js,
 * 165 KB, read 2026-10-15), not from Curve's marketing pages, which do not document
 * any of it.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE SWITCHING IT ON — unresolved conflict with the site's rules
 * ──────────────────────────────────────────────────────────────────────────
 * The same t.js that does conversion tracking also contains a session recorder
 * and a page rasterizer, which it loads on demand:
 *
 *     RECORDER_LIB_URL        /lib/m1.<hash>.js
 *     RASTERIZER_LIB_URL      /lib/m2.<hash>.js
 *     HEATMAP_SCREENSHOT_ENDPOINT  /api/heatmaps/screenshot
 *
 * and its own consent copy describes the analytics category as covering
 * "session replay recordings and screenshots of the pages you visit".
 *
 * Two things follow, and both matter here:
 *
 *  1. Curve's heatmaps are NOT the aggregate, no-screenshot kind this site's
 *     rules permit. `_heatmapScreenshotCaptureEnabled` is set from
 *     `heatmap_screenshot_capture_enabled !== false`, i.e. screenshots are ON
 *     unless Curve's server says otherwise. A screenshot of a page a patient was
 *     reading is the exact thing the session-replay ban exists to prevent.
 *
 *  2. Whether the recorder runs is decided SERVER-SIDE, by
 *     `_checkSessionRecordingConfig()` against the Curve dashboard. Nothing in
 *     this file, and nothing in the registry, can stop it. Loading t.js at all
 *     means recording can be switched on later from the dashboard with no change
 *     to this repo and no deploy.
 *
 * validateRegistry() will NOT catch this: its ban list is by vendor name and
 * host, and Curve is on neither. So the entry below deliberately does NOT claim
 * `sessionReplay: false` — that claim would be unverifiable from our side.
 *
 * Before CURVE_ENABLED goes true, all of these need to be true and written down:
 *   - the Curve dashboard shows session recording OFF and heatmap screenshot
 *     capture OFF for this site, with a screenshot of those settings kept;
 *   - Curve confirms in writing that neither can be re-enabled without our say-so
 *     (this is one of the 19 questions already sent to them, still unanswered);
 *   - counsel has accepted the residual risk, given the BAA;
 *   - nginx.conf allows both hosts (see CURVE_HOSTS) in script-src and
 *     connect-src, and security-headers.test.ts is updated to match;
 *   - the Cookie notice names the tool, cookie-notice-inventory.ts lists it, and
 *     NOTICE_VERSION is bumped (notice-inventory.test.ts enforces this).
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
 * if Curve's server returns `enabled: true` for this site, so that switch must be
 * OFF in the dashboard — otherwise visitors get two banners and the page URL of a
 * health-topic page is posted to Curve on every decision.
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
 * Every localStorage key t.js writes, read from its own constants block. The gate
 * removes these by exact name when the visitor turns the tool off.
 */
export const CURVE_STORAGE_KEYS = [
  'complytrack_consent',
  'complytrack_consent_cfg',
  'complytrack_gpc_record',
  'complytrack_opt_out',
  'complytrack_session',
  'complytrack_storage_probe',
];

/** Curve's cross-domain cookie (CROSS_DOMAIN_COOKIE_NAME, 30-minute max age). */
const CURVE_COOKIE = '_ct_xd';

const SCRIPT_SRC = 'https://t.curvecompliance.com/t.js';
const SCRIPT_ID = 'curve-compliance-tag';

/**
 * Hosts a page contacts once the tool is on. Both must appear in the Cookie notice
 * and in the CSP before this is switched on.
 */
export const CURVE_HOSTS = ['t.curvecompliance.com', 'complytrack-be-production.up.railway.app'];

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
    // Counsel reviews this wording before the tool is switched on, as with the
    // analytics tool. It must stay true of what the script actually does.
    description:
      'Measures which adverts led to an enquiry, so we can stop paying for ones that do not work. It stores an identifier for this browser and shares conversion events with Meta and Google. It does not read what you type; form tracking sends only that a form was submitted.',
    hosts: CURVE_HOSTS,
    cookies: [CURVE_COOKIE],
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
