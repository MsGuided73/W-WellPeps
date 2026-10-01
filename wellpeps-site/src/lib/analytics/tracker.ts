/**
 * The analytics tool as a registry entry (src/lib/privacy/registry.ts).
 *
 * `anonymousAnalyticsTracker()` is a FACTORY. productionTrackers() calls it only
 * when ANALYTICS_ENABLED is true in privacy/config.ts, which stays false until the
 * analytics-event function is deployed, counsel has approved use on health pages
 * and the Cookie notice and Privacy Policy are updated (src/lib/analytics/README.md).
 *
 * The entry is marked `anonymous`: no cookies, no storage keys, no identifier. The
 * registry rejects that flag on a tool that lists any, and the consent rules
 * (consent.ts `allowed`) then let it run on a health-topic page with the ordinary
 * analytics choice. It is an analytics tool, so Global Privacy Control does not
 * switch it off (GPC turns off sale, sharing and advertising), but a visitor who has
 * not turned analytics on, or who withdraws it, gets nothing: load() is only ever
 * called by the gate after consent, unload() stops it in the same visit and throws
 * away anything not yet sent.
 */
import type { Tracker } from '../privacy/registry';
import { browserEnv } from './browser-env';
import { createCollector, type CollectorEnv } from './collector';
import type { PathDetail } from './sanitize';
import { createTransport, type TransportOptions } from './transport';

export const ANALYTICS_TRACKER_ID = 'wellpeps-anonymous-stats';

export interface AnalyticsTrackerOptions {
  /** The analytics-event function URL. Empty = not deployed: the tool does nothing and the registry refuses it (no host). */
  endpoint: string;
  pathDetail?: PathDetail;
  /** Test seams. In the browser the defaults are used. */
  env?: CollectorEnv;
  sendBeacon?: TransportOptions['sendBeacon'];
  fetchImpl?: TransportOptions['fetchImpl'];
  setTimer?: TransportOptions['setTimer'];
  clearTimer?: TransportOptions['clearTimer'];
}

function hostOf(endpoint: string): string | null {
  try {
    return endpoint ? new URL(endpoint).host : null;
  } catch {
    return null;
  }
}

export function anonymousAnalyticsTracker(opts: AnalyticsTrackerOptions): Tracker {
  const host = hostOf(opts.endpoint);
  const transport = createTransport({
    endpoint: host ? opts.endpoint : '',
    sendBeacon: opts.sendBeacon ?? (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : undefined),
    fetchImpl: opts.fetchImpl,
    setTimer: opts.setTimer,
    clearTimer: opts.clearTimer,
  });
  const collector = createCollector({
    env: opts.env ?? browserEnv(),
    emit: transport.enqueue,
    flush: transport.flush,
    pathDetail: opts.pathDetail,
  });

  return {
    id: ANALYTICS_TRACKER_ID,
    name: 'Anonymous page statistics',
    vendor: 'WellPeps (first party)',
    category: 'analytics',
    // Counsel reviews this wording (W7). It is accurate about the tool and the WellPeps tables; it
    // deliberately does not promise anything about the hosting provider's own request logs.
    description:
      'Counts which pages are viewed, which buttons are clicked and how far visitors scroll. It sets no cookie, uses no browser storage and creates no identifier, and our server does not store your IP address or browser details with these counts. It never records what you type or the text on the page.',
    // The registry refuses a tool with no host, so an unconfigured endpoint can never be switched on by mistake.
    hosts: host ? [host] : [],
    cookies: [],
    storageKeys: [],
    anonymous: true,
    load() {
      if (!host) return;
      collector.start();
    },
    unload() {
      collector.stop();
      transport.discard();
    },
  };
}
