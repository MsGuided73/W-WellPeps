/**
 * Consent state — the pure rules behind the "Your Privacy Choices" control.
 *
 * Nothing here touches the DOM, cookies or the network, so every rule can be
 * tested on its own. The runtime (gate.ts) stores the result and loads or stops
 * tools; the interface (ui.ts) shows it.
 *
 * Rules, from docs/Legal Docs "Your Privacy Choices" (Part 2) and the Cookie
 * and Tracking Technologies Notice:
 *  - Every optional category starts OFF.
 *  - Global Privacy Control (GPC) turns advertising off and cannot be undone by
 *    "Accept all"; only an explicit "Allow anyway" can re-enable it.
 *  - Advertising never runs on a health-topic page. Analytics runs there only
 *    after a separate consent.
 *  - A choice expires after twelve months or when the notice version changes.
 */

/** Bump when the notice text, the tool list or a category changes in meaning. */
export const NOTICE_VERSION = '2026-10-01.1';
export const BANNER_VERSION = '1';
export const CONSENT_COOKIE = 'wp_consent';
export const CONSENT_MAX_AGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export const CONSENT_SOURCES = ['default', 'banner', 'center', 'gpc', 'withdraw'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export type ConsentCategory = 'analytics' | 'advertising';
export type PromptReason = 'first' | 'version' | 'expiry';

export interface ConsentState {
  /** Notice version the visitor saw. */
  v: string;
  /** When the choice was last changed (epoch ms). */
  ts: number;
  /** Random consent id (not an email address or device fingerprint). */
  cid: string;
  analytics: boolean;
  /** Separate consent for analytics on health-topic pages. */
  analyticsSensitive: boolean;
  advertising: boolean;
  /** A Global Privacy Control signal was present on the last visit. */
  gpc: boolean;
  /** GPC arrived after an earlier advertising opt-in; the visitor has not answered yet. */
  gpcConflict: boolean;
  /** The visitor chose "Allow anyway" despite the signal. */
  gpcOverride: boolean;
  source: ConsentSource;
}

export type ConsentVia = 'banner' | 'center';

export type ConsentAction =
  | { type: 'acceptAll'; via?: ConsentVia }
  | { type: 'rejectAll'; via?: ConsentVia }
  | { type: 'withdrawAll' }
  | {
      type: 'set';
      changes: Partial<Pick<ConsentState, 'analytics' | 'analyticsSensitive' | 'advertising'>>;
      via?: ConsentVia;
    }
  | { type: 'gpcDetected' }
  | { type: 'gpcAbsent' }
  | { type: 'gpcAllowAnyway' }
  | { type: 'gpcKeepOff' };

export function defaultState(now: number, cid: string): ConsentState {
  return {
    v: NOTICE_VERSION,
    ts: now,
    cid,
    analytics: false,
    analyticsSensitive: false,
    advertising: false,
    gpc: false,
    gpcConflict: false,
    gpcOverride: false,
    source: 'default',
  };
}

/** Enforce the invariants no stored or computed state may break. */
function normalize(s: ConsentState): ConsentState {
  return {
    ...s,
    analyticsSensitive: s.analytics ? s.analyticsSensitive : false,
    advertising: s.gpc && !s.gpcOverride ? false : s.advertising,
  };
}

/** True when advertising is blocked by a GPC signal the visitor has not overridden. */
export function advertisingLockedByGpc(s: ConsentState): boolean {
  return s.gpc && !s.gpcOverride;
}

export function reduce(state: ConsentState, action: ConsentAction, now: number): ConsentState {
  const base: ConsentState = { ...state, ts: now };
  switch (action.type) {
    case 'acceptAll':
      return normalize({
        ...base,
        analytics: true,
        advertising: true,
        source: action.via ?? 'center',
      });
    case 'rejectAll':
      return normalize({
        ...base,
        analytics: false,
        analyticsSensitive: false,
        advertising: false,
        gpcOverride: false,
        gpcConflict: false,
        source: action.via ?? 'center',
      });
    case 'withdrawAll':
      return normalize({
        ...base,
        analytics: false,
        analyticsSensitive: false,
        advertising: false,
        gpcOverride: false,
        gpcConflict: false,
        source: 'withdraw',
      });
    case 'set': {
      const next: ConsentState = { ...base, source: action.via ?? 'center' };
      const c = action.changes;
      if (typeof c.analytics === 'boolean') next.analytics = c.analytics;
      if (typeof c.advertising === 'boolean') next.advertising = c.advertising;
      if (typeof c.analyticsSensitive === 'boolean') next.analyticsSensitive = c.analyticsSensitive;
      return normalize(next);
    }
    case 'gpcDetected': {
      const optedInBefore = state.advertising && !state.gpcOverride;
      return normalize({
        ...base,
        gpc: true,
        gpcConflict: state.gpcConflict || optedInBefore,
        advertising: state.gpcOverride ? state.advertising : false,
        // Only a visitor who has not chosen yet becomes "GPC only"; an explicit choice stays explicit.
        source: state.source === 'default' ? 'gpc' : state.source,
      });
    }
    case 'gpcAbsent':
      return normalize({
        ...base,
        gpc: false,
        gpcConflict: false,
        gpcOverride: false,
        source: state.source,
      });
    case 'gpcAllowAnyway':
      return normalize({
        ...base,
        advertising: true,
        gpcOverride: true,
        gpcConflict: false,
        source: 'center',
      });
    case 'gpcKeepOff':
      return normalize({
        ...base,
        advertising: false,
        gpcOverride: false,
        gpcConflict: false,
        source: 'center',
      });
  }
}

// --------------------------------------------------------------- cookie format

const flag = (b: boolean) => (b ? '1' : '0');

/** Compact, human-readable value for the first-party cookie. No email, no fingerprint. */
export function serialize(s: ConsentState): string {
  return new URLSearchParams({
    v: s.v,
    ts: String(s.ts),
    cid: s.cid,
    a: flag(s.analytics),
    as: flag(s.analyticsSensitive),
    ad: flag(s.advertising),
    g: flag(s.gpc),
    gc: flag(s.gpcConflict),
    go: flag(s.gpcOverride),
    src: s.source,
  }).toString();
}

const FLAG = /^[01]$/;

/** A saved choice may be at most this far ahead of the clock (clock drift) before it is rejected. */
const MAX_CLOCK_SKEW_MS = DAY_MS;

/**
 * Returns null for anything that is not a well-formed value (tampered, truncated, old format).
 * Pass `now` to also reject a choice dated in the future, which would never expire.
 */
export function parse(raw: string | null | undefined, now?: number): ConsentState | null {
  if (!raw) return null;
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(raw);
  } catch {
    return null;
  }
  const v = p.get('v');
  const ts = p.get('ts');
  const cid = p.get('cid');
  const src = p.get('src');
  const flags = ['a', 'as', 'ad', 'g', 'gc', 'go'].map((k) => p.get(k));
  if (!v || v.length > 40) return null;
  if (!ts || !/^\d{1,15}$/.test(ts)) return null;
  if (!cid || cid.length > 64 || !/^[A-Za-z0-9-]+$/.test(cid)) return null;
  if (!src || !(CONSENT_SOURCES as readonly string[]).includes(src)) return null;
  if (flags.some((f) => f === null || !FLAG.test(f))) return null;
  if (now !== undefined && Number(ts) > now + MAX_CLOCK_SKEW_MS) return null;
  const [a, as, ad, g, gc, go] = flags.map((f) => f === '1');
  return normalize({
    v,
    ts: Number(ts),
    cid,
    analytics: a,
    analyticsSensitive: as,
    advertising: ad,
    gpc: g,
    gpcConflict: gc,
    gpcOverride: go,
    source: src as ConsentSource,
  });
}

// ------------------------------------------------------------------- prompting

export function promptReason(
  state: ConsentState | null,
  now: number,
  version: string = NOTICE_VERSION,
): PromptReason | null {
  if (!state) return 'first';
  if (state.v !== version) return 'version';
  if (now - state.ts > CONSENT_MAX_AGE_DAYS * DAY_MS) return 'expiry';
  return null;
}

// ------------------------------------------------------------ health-topic pages

/**
 * Pages that could reveal a health condition or treatment (Cookie notice,
 * section 5). Keep in step with that notice; the build does not know the page
 * list, so a new program or article area must be added here.
 */
const SENSITIVE_PREFIXES = [
  '/weight-loss',
  '/hair-restoration',
  '/sexual-wellness',
  '/healthy-aging',
  '/hormone-optimization',
  '/mental-wellness',
  '/peptides',
  '/wellness-learning-center',
] as const;

/**
 * One canonical spelling of a path: no query or hash, decoded, lower-case, single
 * slashes, no trailing slash, no index.html. Returns null if it cannot be decoded.
 */
export function normalizePath(path: string): string | null {
  let p = path.split('#')[0].split('?')[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  p = p.toLowerCase().replace(/\/{2,}/g, '/');
  p = p.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

/** A path that cannot be read is treated as a health-topic page (fail safe). */
export function isSensitivePath(path: string): boolean {
  const p = normalizePath(path);
  if (p === null) return true;
  return SENSITIVE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * May a tool in this category run on this page, given the visitor's choice?
 * `anonymous` marks a tool that sets no cookie, stores nothing and sends no
 * identifier (see registry.ts). It may run on a health-topic page with the
 * ordinary analytics choice; it never changes the rule for advertising.
 */
export function allowed(state: ConsentState, category: ConsentCategory, path: string, anonymous = false): boolean {
  const sensitive = isSensitivePath(path);
  if (category === 'advertising') {
    return state.advertising && !advertisingLockedByGpc(state) && !sensitive;
  }
  return state.analytics && (anonymous || !sensitive || state.analyticsSensitive);
}
