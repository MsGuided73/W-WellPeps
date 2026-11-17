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
 * WHAT THE TAG CAN DO, AND THE OWNER'S DECISION (2026-11-17)
 * ──────────────────────────────────────────────────────────────────────────
 * The same t.js that does conversion tracking also contains a session recorder and a page
 * rasterizer, which it loads on demand:
 *
 *     RECORDER_LIB_URL        /lib/m1.<hash>.js
 *     RASTERIZER_LIB_URL      /lib/m2.<hash>.js
 *     HEATMAP_SCREENSHOT_ENDPOINT  /api/heatmaps/screenshot
 *
 * plus a cross-site identity bridge (/api/bridge-tokens, /api/cross-domain-links), its own
 * consent manager (/api/consent/*) and an Amazon Ads destination (a sandboxed iframe). Whether
 * each runs is decided by CURVE'S SERVER, from the Curve dashboard, with no change to this repo.
 *
 * From 2026-11-13 to 2026-11-17 the Content-Security-Policy admitted only three exact Curve URLs,
 * so the browser refused all of the above. On 2026-11-17 the owner directed that Curve run IN
 * FULL: Curve is engaged under a signed BAA to de-identify and aggregate what it collects. The
 * policy now admits Curve's whole host, its fallback host and the Amazon Ads loader
 * (scripts/lib/tracker-sources.mjs), and `npm run check:headers` proves every request the tag can
 * make is admitted. What it still refuses: extra scripts on other hosts or inline code that
 * Curve's start-up settings could name, because admitting those would switch off the policy's
 * protection against injected script on every page.
 *
 * The consent gate is unchanged: the tag loads only after a yes to advertising, and on
 * health-topic pages only after the separate second consent.
 *
 * `sessionReplay` is still not declared. The registry refuses `sessionReplay: true` and bans
 * replay vendors by name and host; Curve is on neither list, and the owner's decision is recorded
 * here rather than by loosening that rule for every future tool.
 *
 * Covered only by Curve's BAA and written answers: what each call carries, what Curve forwards to
 * Meta, Google and Amazon, and how long it keeps it. Re-read t.js when its size changes.
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
 * The hosts a page may contact once the tool is on: Curve's host, its fallback backend and the
 * Amazon Ads loader its Amazon destination uses. Must match the Cookie notice and
 * scripts/lib/tracker-sources.mjs (security-headers.test.ts checks).
 */
export const CURVE_HOSTS = ['t.curvecompliance.com', 'complytrack-be-production.up.railway.app', 'c.amazon-adsystem.com'];

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
      'Measures which of our adverts on Google and Meta led to a visit or a sign-up, so we can stop paying for ones that do not work. We do not show adverts on this site. It stores an identifier for this browser, records the pages you view and what you click, and shares conversion events with Meta and Google after removing health details. Depending on the settings in Curve’s account, it may also record how you move through our pages and take pictures of them. What it records is never tied to your name, email address or account, and our forms and the AI assistant are never recorded.',
    // The first-visit pop-up (owner, 2026-11-17): visitors do not know who Curve is, so say it plainly.
    // Describe, do not label: no "compliant" claim in our own words (the Privacy Policy avoids such labels).
    bannerText:
      'We’d like to use Curve Compliance, an ad-measurement service built for healthcare websites, to see which of our own ads on Google and Meta bring people to WellPeps. It removes health details before anything is shared, and it records what happens on our pages, never who you are. We don’t show ads on this site.',
    hosts: CURVE_HOSTS,
    cookies: CURVE_COOKIES,
    storageKeys: CURVE_STORAGE_KEYS,
    // `sessionReplay: false` is deliberately NOT claimed: t.js carries a recorder that Curve's
    // server can enable, and since 2026-11-17 the policy lets it run (see the header).

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
