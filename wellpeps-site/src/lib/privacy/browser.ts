/**
 * Browser wiring for the consent gate: the real cookie jar, the real GPC
 * signal, the real log sink. Runs once per page load from PrivacyRoot.astro.
 *
 * Development-only helpers (never in a production build, because Vite replaces
 * import.meta.env.DEV with false and removes the code):
 *   ?gpc=1       pretend the browser sends a Global Privacy Control signal
 *   demo tools   see demo-trackers.ts
 *   window.__wpConsentLog  the log events the browser produced
 */
import { CONSENT_COOKIE } from './consent';
import { CONSENT_LOG_ENABLED, CONSENT_LOG_ENDPOINT } from './config';
import { demoTrackers } from './demo-trackers';
import { createGate, type GateDeps, type PrivacyGate } from './gate';
import { createSink, type ConsentLogEvent } from './log';
import { productionTrackers, validateRegistry, type Tracker } from './registry';

declare global {
  interface Window {
    __wpConsentLog?: ConsentLogEvent[];
  }
}

export function activeTrackers(): Tracker[] {
  const list = productionTrackers();
  return import.meta.env.DEV ? [...list, ...demoTrackers()] : list;
}

function readCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.slice(name.length + 1));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, days: number): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  // Host-only (no Domain attribute) so the choice is never sent to portal.wellpeps.com.
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
}

function expireCookie(name: string): void {
  const base = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = base;
  document.cookie = `${base}; Domain=${location.hostname}`;
  document.cookie = `${base}; Domain=.${location.hostname}`;
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function readGpc(): boolean {
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return true;
  return import.meta.env.DEV && /[?&]gpc=1\b/.test(location.search);
}

export interface PrivacyRuntime {
  gate: PrivacyGate;
  trackers: Tracker[];
}

export function startPrivacy(): PrivacyRuntime {
  let trackers = activeTrackers();
  try {
    validateRegistry(trackers);
  } catch (err) {
    // A broken registry must never switch tools on: run with none.
    console.error('[privacy] tracker registry invalid; no optional tool will load.', err);
    trackers = [];
  }

  const sink = createSink({
    enabled: CONSENT_LOG_ENABLED,
    endpoint: CONSENT_LOG_ENDPOINT,
    sendBeacon: typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : undefined,
    onEvent: import.meta.env.DEV
      ? (e) => {
          (window.__wpConsentLog ??= []).push(e);
        }
      : undefined,
  });

  const deps: GateDeps = {
    now: () => Date.now(),
    uuid: makeUuid,
    userAgent: navigator.userAgent,
    cookies: {
      read: () => readCookie(CONSENT_COOKIE),
      write: (value, days) => writeCookie(CONSENT_COOKIE, value, days),
      removeConsent: () => expireCookie(CONSENT_COOKIE),
      remove: (name) => expireCookie(name),
      available: () => navigator.cookieEnabled,
    },
    removeStorage: (key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        /* storage may be blocked */
      }
    },
    readGpc,
    path: () => location.pathname,
    trackers,
    log: sink,
  };

  // A choice withdrawn in another tab must stop a tool in THIS tab before it sends anything more.
  // These two listeners are registered before the gate starts any tool and run in the capture phase,
  // so when the page is hidden or closed the saved choice is re-read BEFORE a tool's own hide or
  // pagehide handler can send a last event (an unfocused window would otherwise not have noticed).
  let started: PrivacyGate | null = null;
  const resyncFirst = () => started?.resync();
  window.addEventListener('pagehide', resyncFirst, true);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') resyncFirst();
    },
    true,
  );

  const gate = createGate(deps);
  started = gate;
  gate.init();

  // Another tab may have changed or withdrawn the choice (the cookie is shared). Cookies raise no
  // event, so look again whenever this tab is shown or focused, and before every change (in the gate).
  const resync = () => gate.resync();
  window.addEventListener('focus', resync);
  window.addEventListener('pageshow', resync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resync();
  });

  return { gate, trackers };
}
