/**
 * Registry of every non-essential tool the site may load.
 *
 * The consent gate loads and stops tools ONLY through this list, and the
 * on-screen tool list is generated from it, so what visitors are told is what
 * the code does. Today the production list is empty: wellpeps.com loads no
 * analytics or advertising tool, which is what the published Cookie and
 * Tracking Technologies Notice says.
 *
 * To add a tool: add an entry to productionTrackers(), list it in the Cookie
 * notice tables, bump NOTICE_VERSION in consent.ts, and run `npm test`. The
 * inventory test fails if the notice and this list disagree. Session-replay
 * and heatmap tools are banned outright.
 */
import { anonymousAnalyticsTracker } from '../analytics/tracker';
import { ANALYTICS_ENABLED, ANALYTICS_ENDPOINT, ANALYTICS_PATH_DETAIL } from './config';
import type { ConsentCategory } from './consent';

export interface Tracker {
  /** Stable lowercase id, e.g. "posthog". */
  id: string;
  name: string;
  vendor: string;
  category: ConsentCategory;
  /** Plain-language purpose, shown to visitors. */
  description: string;
  /** Hosts this tool contacts. Must be listed in the Cookie notice. */
  hosts: string[];
  /** Cookies the tool sets; removed when the visitor turns the tool off. */
  cookies: string[];
  /** localStorage keys the tool sets; removed when the visitor turns the tool off. */
  storageKeys: string[];
  /** Start the tool. Runs only after the gate has confirmed consent for this page. */
  load: () => void;
  /** Stop the tool in the same session (vendor opt-out call). Cookies are removed by the gate. */
  unload: () => void;
  /**
   * True only for a tool that sets no cookie, uses no browser storage and sends
   * no identifier (not even a random one) or IP address it keeps. Such a tool may
   * run on a health-topic page once the visitor has turned analytics on. The
   * registry rejects the flag on a tool that lists cookies or storage keys.
   */
  anonymous?: boolean;
}

export const BANNED_TRACKER_IDS = [
  'hotjar',
  'fullstory',
  'logrocket',
  'microsoft-clarity',
  'mouseflow',
  'smartlook',
  'luckyorange',
  'inspectlet',
  'crazyegg',
  'heap',
] as const;

/** Domains of the banned session-replay and heatmap tools. A tool may not contact any of them. */
export const BANNED_TRACKER_HOSTS = [
  'hotjar.com',
  'hotjar.io',
  'fullstory.com',
  'logrocket.com',
  'logrocket.io',
  'clarity.ms',
  'mouseflow.com',
  'smartlook.com',
  'luckyorange.com',
  'luckyorange.net',
  'inspectlet.com',
  'crazyegg.com',
  'heapanalytics.com',
] as const;

const CATEGORIES: readonly ConsentCategory[] = ['analytics', 'advertising'];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Does a name (id, display name or vendor) contain a banned tool as a whole word or phrase? */
function namesBannedTool(name: string): boolean {
  const s = `-${slug(name)}-`;
  return BANNED_TRACKER_IDS.some((banned) => s.includes(`-${banned}-`));
}

function isBannedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  return BANNED_TRACKER_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Throws with a message naming the problem. Run at build time (npm test) and at start-up. */
export function validateRegistry(list: readonly Tracker[]): void {
  const seen = new Set<string>();
  for (const t of list) {
    if (seen.has(t.id)) throw new Error(`Tracker registry has a duplicate id: "${t.id}".`);
    seen.add(t.id);
    if (!CATEGORIES.includes(t.category)) {
      throw new Error(`Tracker "${t.id}" has an unknown category "${String(t.category)}". Use analytics or advertising.`);
    }
    if (!Array.isArray(t.hosts) || t.hosts.length === 0) {
      throw new Error(`Tracker "${t.id}" lists no hosts. The Cookie notice must name where data goes.`);
    }
    if ([t.id, t.name, t.vendor].some(namesBannedTool) || t.hosts.some(isBannedHost)) {
      throw new Error(`Tracker "${t.id}" is a session-replay or heatmap tool, which is banned on this site.`);
    }
    if (t.anonymous && (t.category !== 'analytics' || t.cookies.length > 0 || t.storageKeys.length > 0)) {
      throw new Error(
        `Tracker "${t.id}" is marked anonymous but is not an analytics tool without cookies and browser storage.`,
      );
    }
  }
}

export function hasNonEssential(list: readonly Tracker[]): boolean {
  return list.length > 0;
}

export function inventory(list: readonly Tracker[]): Record<ConsentCategory, Tracker[]> {
  return {
    analytics: list.filter((t) => t.category === 'analytics'),
    advertising: list.filter((t) => t.category === 'advertising'),
  };
}

/** Compare the ids in the published Cookie notice with the registry. */
export function inventoryDiff(
  notice: Record<ConsentCategory, string[]>,
  list: readonly Tracker[],
): { missingFromNotice: string[]; missingFromRegistry: string[] } {
  const inCode = new Set(list.map((t) => `${t.category}:${t.id}`));
  const inNotice = new Set([
    ...notice.analytics.map((id) => `analytics:${id}`),
    ...notice.advertising.map((id) => `advertising:${id}`),
  ]);
  const idOf = (key: string) => key.slice(key.indexOf(':') + 1);
  return {
    missingFromNotice: [...inCode].filter((k) => !inNotice.has(k)).map(idOf),
    missingFromRegistry: [...inNotice].filter((k) => !inCode.has(k)).map(idOf),
  };
}

/**
 * Tools that run on the live site. EMPTY on purpose: nothing optional loads
 * today. The one planned tool, WellPeps' own anonymous analytics (W6,
 * src/lib/analytics), is built and tested but is added here only when
 * ANALYTICS_ENABLED is true in config.ts, which stays false until the
 * analytics-event function is deployed, counsel has approved it for health pages,
 * and the Cookie notice and Privacy Policy are updated (W7, see
 * docs/COMPLIANCE-BUILD-TASKS.md and src/lib/analytics/README.md).
 *
 * To add any other tool, add an entry here, list it in the Cookie notice tables
 * and in cookie-notice-inventory.ts, and bump NOTICE_VERSION. A template:
 *
 *   {
 *     id: 'posthog', name: 'PostHog', vendor: 'PostHog Inc.', category: 'analytics',
 *     description: 'Counts visits and the pages people use so we can improve the site. No cookies, no session recording.',
 *     hosts: ['us.i.posthog.com'], cookies: [], storageKeys: [],
 *     load() { posthog.opt_in_capturing(); }, unload() { posthog.opt_out_capturing(); },
 *   }
 */
export function productionTrackers(): Tracker[] {
  const tools: Tracker[] = [];
  if (ANALYTICS_ENABLED) {
    tools.push(anonymousAnalyticsTracker({ endpoint: ANALYTICS_ENDPOINT, pathDetail: ANALYTICS_PATH_DETAIL }));
  }
  return tools;
}
