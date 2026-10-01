import { afterEach, describe, expect, test, vi } from 'vitest';
import { bannerCopy, showsHealthSwitch } from '../privacy/ui';
import { allowed, defaultState, reduce } from '../privacy/consent';
import { createGate, type GateDeps, type PrivacyGate } from '../privacy/gate';
import { inventoryDiff, validateRegistry, type Tracker } from '../privacy/registry';
import { ANALYTICS_TRACKER_ID, anonymousAnalyticsTracker } from './tracker';
import { fakeElement, fakePage, type FakePage, type FakePageState } from './test-support';

const ENDPOINT = 'https://project.supabase.co/functions/v1/analytics-event';
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const cta = fakeElement({ tag: 'a', attrs: { href: '/x', 'data-track': 'cta-assessment' } });

/** A TEST registry: the analytics tool plus an ordinary advertising tool and an ordinary analytics tool. */
function rig(opts: { endpoint?: string; path?: string; gpc?: boolean; page?: Partial<FakePageState> } = {}) {
  const page: FakePage = fakePage({ pathname: opts.path ?? '/', ...opts.page });
  const sent: string[] = [];
  const beaconCalls: unknown[] = [];
  const timers: Array<{ fn: () => void; cleared: boolean }> = [];
  const analytics = anonymousAnalyticsTracker({
    endpoint: opts.endpoint ?? ENDPOINT,
    env: page.env,
    // Requests go out by fetch; the beacon is only a fallback and must stay unused while fetch works.
    fetchImpl: async (_url, init) => void sent.push(String(init.body)),
    sendBeacon: (...args) => (beaconCalls.push(args), true),
    setTimer: (fn) => {
      const t = { fn, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  });
  const counts = { ordinaryLoads: 0, adsLoads: 0 };
  const ordinary: Tracker = {
    id: 'ordinary-analytics',
    name: 'Ordinary analytics',
    vendor: 'Test',
    category: 'analytics',
    description: 'test',
    hosts: ['ordinary.example.com'],
    cookies: ['_o'],
    storageKeys: ['o-store'],
    load: () => void (counts.ordinaryLoads += 1),
    unload: () => {},
  };
  const ads: Tracker = {
    id: 'test-advertising',
    name: 'Test advertising',
    vendor: 'Test',
    category: 'advertising',
    description: 'test',
    hosts: ['ads.example.com'],
    cookies: ['_a'],
    storageKeys: [],
    load: () => void (counts.adsLoads += 1),
    unload: () => {},
  };

  const jar = { value: null as string | null };
  const removedCookies: string[] = [];
  const removedStorage: string[] = [];
  let counter = 0;
  const deps: GateDeps = {
    now: () => NOW,
    uuid: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
    userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
    cookies: {
      read: () => jar.value,
      write: (v) => {
        jar.value = v;
      },
      removeConsent: () => {
        jar.value = null;
      },
      remove: (name) => void removedCookies.push(name),
    },
    removeStorage: (k) => void removedStorage.push(k),
    readGpc: () => opts.gpc ?? false,
    path: () => page.state.pathname,
    trackers: [analytics, ordinary, ads],
    log: () => {},
  };
  const gate: PrivacyGate = createGate(deps);
  gate.init();
  const runTimers = () => timers.filter((t) => !t.cleared).forEach((t) => ((t.cleared = true), t.fn()));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return { gate, page, analytics, sent, beaconCalls, timers, counts, jar, removedCookies, removedStorage, runTimers, settle };
}

afterEach(() => vi.unstubAllGlobals());

describe('the tracker as a registry entry', () => {
  const t = anonymousAnalyticsTracker({ endpoint: ENDPOINT });

  test('is an analytics tool, first party, anonymous, with no cookies and no storage keys', () => {
    expect(t).toMatchObject({
      id: ANALYTICS_TRACKER_ID,
      vendor: 'WellPeps (first party)',
      category: 'analytics',
      anonymous: true,
      cookies: [],
      storageKeys: [],
    });
  });

  test('names the host it sends to, so the Cookie notice can list it', () => {
    expect(t.hosts).toEqual(['project.supabase.co']);
  });

  test('passes the registry validation, including the anonymous rules', () => {
    expect(() => validateRegistry([t])).not.toThrow();
  });

  test('the registry refuses to accept it as anonymous if it ever lists a cookie or a storage key', () => {
    expect(() => validateRegistry([{ ...t, cookies: ['_x'] }])).toThrow(/anonymous/i);
    expect(() => validateRegistry([{ ...t, storageKeys: ['k'] }])).toThrow(/anonymous/i);
  });

  test('with no endpoint it lists no host, so the registry rejects it: an unconfigured tool can never be switched on', () => {
    const unconfigured = anonymousAnalyticsTracker({ endpoint: '' });
    expect(unconfigured.hosts).toEqual([]);
    expect(() => validateRegistry([unconfigured])).toThrow(/hosts/i);
  });

  test('a malformed endpoint is treated as no endpoint', () => {
    expect(anonymousAnalyticsTracker({ endpoint: 'not a url' }).hosts).toEqual([]);
  });

  test('creating it touches nothing in the page (no window or document needed)', () => {
    expect(() => anonymousAnalyticsTracker({ endpoint: ENDPOINT })).not.toThrow();
  });

  test('the visitor-facing text says what it does and does not do', () => {
    expect(t.description).toMatch(/no cookie/i);
    expect(t.description).toMatch(/no browser storage/i);
    expect(t.description).toMatch(/no identifier/i);
  });

  test('without it, the notice inventory check flags it as missing from the Cookie notice (the W7 guard)', () => {
    expect(inventoryDiff({ analytics: [], advertising: [] }, [t]).missingFromNotice).toEqual([ANALYTICS_TRACKER_ID]);
    expect(inventoryDiff({ analytics: [ANALYTICS_TRACKER_ID], advertising: [] }, [t])).toEqual({ missingFromNotice: [], missingFromRegistry: [] });
  });

  test('the visitor-facing banner and panel text describe it as anonymous counting, and need no separate health-page switch', () => {
    expect(bannerCopy([t])).toMatch(/anonymous counting that sets no cookie and keeps no identifier/);
    expect(showsHealthSwitch([t])).toBe(false);
  });
});

describe('consent: nothing runs until the visitor turns analytics on', () => {
  test('a first-time visitor loads nothing: no listener, no timer, no request', () => {
    const r = rig();
    expect(r.gate.loaded()).toEqual([]);
    expect(r.page.listenerCount()).toBe(0);
    expect(r.timers).toHaveLength(0);
    expect(r.sent).toHaveLength(0);
  });

  test('turning analytics on starts it and a page view is sent', async () => {
    const r = rig({ path: '/why-wellpeps' });
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(r.gate.loaded()).toContain(ANALYTICS_TRACKER_ID);
    r.runTimers();
    await r.settle();
    expect(r.sent).toHaveLength(1);
    expect(JSON.parse(r.sent[0])).toMatchObject({ v: 1, events: [{ event_type: 'page_view', page_path: '/why-wellpeps', page_template: 'about' }] });
  });

  test('advertising alone does not start it', () => {
    const r = rig();
    r.gate.dispatch({ type: 'set', changes: { advertising: true } });
    expect(r.gate.loaded()).not.toContain(ANALYTICS_TRACKER_ID);
    expect(r.page.listenerCount()).toBe(0);
  });

  test('withdrawing consent stops it in the same visit and sends NOTHING more, not even what was queued', async () => {
    const r = rig();
    r.gate.dispatch({ type: 'acceptAll', via: 'banner' });
    r.page.click(cta); // queued, not yet sent
    r.gate.dispatch({ type: 'withdrawAll' });
    expect(r.gate.loaded()).not.toContain(ANALYTICS_TRACKER_ID);
    expect(r.page.listenerCount()).toBe(0);
    r.runTimers();
    r.page.click(cta);
    r.page.scrollTo(2000);
    r.page.hide();
    r.page.fire('window', 'pagehide');
    await r.settle();
    expect(r.sent).toHaveLength(0);
    expect(r.beaconCalls).toHaveLength(0);
  });

  test('turning analytics off with a switch does the same', async () => {
    const r = rig();
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    r.gate.dispatch({ type: 'set', changes: { analytics: false } });
    r.page.hide();
    r.runTimers();
    await r.settle();
    expect(r.sent).toHaveLength(0);
    expect(r.page.listenerCount()).toBe(0);
  });

  test('"Reject all" after "Accept all" stops it', () => {
    const r = rig();
    r.gate.dispatch({ type: 'acceptAll' });
    r.gate.dispatch({ type: 'rejectAll' });
    expect(r.gate.loaded()).toEqual([]);
  });

  test('a visitor who withdrew and then agrees again gets it back', () => {
    const r = rig();
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    r.gate.dispatch({ type: 'withdrawAll' });
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(r.gate.loaded()).toContain(ANALYTICS_TRACKER_ID);
    expect(r.page.listenerCount()).toBeGreaterThan(0);
  });

  test('a withdrawal made in ANOTHER tab stops it as soon as this tab resyncs, and nothing more is sent', async () => {
    const r = rig();
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(r.gate.loaded()).toContain(ANALYTICS_TRACKER_ID);
    r.page.click(cta); // queued, not yet sent
    // Another tab withdrew: it deleted the shared consent cookie. This tab's gate is not told.
    r.jar.value = null;
    expect(r.gate.loaded()).toContain(ANALYTICS_TRACKER_ID);
    // This is what browser.ts does first when the page is hidden or closed.
    r.gate.resync();
    expect(r.gate.loaded()).toEqual([]);
    expect(r.page.listenerCount()).toBe(0);
    r.page.hide();
    r.page.fire('window', 'pagehide');
    r.runTimers();
    await r.settle();
    expect(r.sent).toHaveLength(0);
    expect(r.beaconCalls).toHaveLength(0);
  });

  test('storage that cannot be saved means everything is off, so analytics never starts', () => {
    const page = fakePage();
    const analytics = anonymousAnalyticsTracker({ endpoint: ENDPOINT, env: page.env, fetchImpl: async () => ({}) });
    const gate = createGate({
      now: () => NOW,
      uuid: () => 'id',
      cookies: { read: () => null, write: () => {}, removeConsent: () => {}, remove: () => {}, available: () => false },
      readGpc: () => false,
      path: () => '/',
      trackers: [analytics],
      log: () => {},
    });
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(gate.loaded()).toEqual([]);
    expect(page.listenerCount()).toBe(0);
  });
});

describe('Global Privacy Control and health-topic pages', () => {
  test('GPC does not block anonymous analytics the visitor turned on, and advertising stays off even after "Accept all"', () => {
    const r = rig({ gpc: true });
    r.gate.dispatch({ type: 'acceptAll', via: 'center' });
    expect(r.gate.loaded()).toContain(ANALYTICS_TRACKER_ID);
    expect(r.counts.adsLoads).toBe(0);
    expect(r.gate.getState().advertising).toBe(false);
  });

  test('GPC alone does not turn analytics on: the visitor still has to say yes', () => {
    const r = rig({ gpc: true });
    expect(r.gate.loaded()).toEqual([]);
  });

  test('on a health-topic page it runs with the ordinary analytics choice, while an ordinary analytics tool and advertising do not', () => {
    const r = rig({ path: '/weight-loss' });
    r.gate.dispatch({ type: 'set', changes: { analytics: true, advertising: true } });
    expect(r.gate.loaded()).toEqual([ANALYTICS_TRACKER_ID]);
    expect(r.counts.ordinaryLoads).toBe(0);
    expect(r.counts.adsLoads).toBe(0);
  });

  test('the same holds on every health-topic section, and on an article under the learning center', () => {
    for (const path of ['/hair-restoration', '/sexual-wellness', '/healthy-aging', '/wellness-learning-center/what-is-a-glp-1']) {
      const r = rig({ path });
      r.gate.dispatch({ type: 'set', changes: { analytics: true } });
      expect(r.gate.loaded(), path).toContain(ANALYTICS_TRACKER_ID);
    }
  });

  test('it reports the health-topic page by path and template, and nothing else about the page', async () => {
    const r = rig({ path: '/weight-loss', page: { referrer: 'https://www.google.com/search?q=semaglutide+cost' } });
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    r.runTimers();
    await r.settle();
    expect(JSON.parse(r.sent[0]).events[0]).toEqual({
      event_type: 'page_view',
      page_path: '/weight-loss',
      page_template: 'program',
      viewport_class: 'desktop',
      referrer_class: 'search',
    });
    expect(r.sent.join()).not.toMatch(/semaglutide|google/);
  });

  test('the consent rule itself: anonymous analytics needs only the ordinary choice on a health page; advertising never runs there', () => {
    const on = reduce(defaultState(NOW, 'c'), { type: 'set', changes: { analytics: true, advertising: true } }, NOW);
    expect(allowed(on, 'analytics', '/weight-loss', true)).toBe(true);
    expect(allowed(on, 'analytics', '/weight-loss', false)).toBe(false);
    expect(allowed(on, 'advertising', '/weight-loss', true)).toBe(false);
  });

  test('moving between a health page and an ordinary page does not start it twice', () => {
    const r = rig({ path: '/' });
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    const listeners = r.page.listenerCount();
    r.gate.navigate('/weight-loss');
    r.gate.navigate('/your-plan');
    expect(r.page.listenerCount()).toBe(listeners);
  });
});

describe('no cookies, no storage, no identifier', () => {
  /** Stand-ins for every browser store; any touch is recorded. */
  function spyOnStores() {
    const touched: string[] = [];
    const store = (name: string) =>
      new Proxy({}, { get: (_t, prop) => (touched.push(`${name}.${String(prop)}`), () => null), set: (_t, prop) => (touched.push(`${name}.${String(prop)}=`), true) });
    vi.stubGlobal('localStorage', store('localStorage'));
    vi.stubGlobal('sessionStorage', store('sessionStorage'));
    vi.stubGlobal('indexedDB', store('indexedDB'));
    vi.stubGlobal('caches', store('caches'));
    vi.stubGlobal('cookieStore', store('cookieStore'));
    const doc = {
      set cookie(v: string) {
        touched.push(`document.cookie=${v}`);
      },
      get cookie() {
        touched.push('document.cookie');
        return '';
      },
    };
    vi.stubGlobal('document', doc);
    return touched;
  }

  test('a whole visit (agree, view, click, scroll, leave, withdraw) never touches cookies or any browser store', async () => {
    const touched = spyOnStores();
    const r = rig({ path: '/weight-loss', page: { pageHeight: 4000 } });
    r.gate.dispatch({ type: 'acceptAll', via: 'banner' });
    r.page.click(cta);
    r.page.scrollTo(1500);
    r.page.advance(20_000);
    r.page.hide();
    r.runTimers();
    await r.settle();
    r.gate.dispatch({ type: 'withdrawAll' });
    expect(r.sent.length).toBeGreaterThan(0);
    expect(touched).toEqual([]);
  });

  test('the gate removes no cookie and no storage key on its behalf, because it declares none', () => {
    const r = rig();
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    r.gate.dispatch({ type: 'set', changes: { analytics: false } });
    // Only the ordinary test tools declare cookies or keys; the analytics tool declares none.
    expect(r.removedCookies.filter((c) => !['_o', '_a'].includes(c))).toEqual([]);
    expect(r.removedStorage.filter((k) => k !== 'o-store')).toEqual([]);
  });

  test('what is sent carries no identifier, address, user agent, time or text, only coarse fields', async () => {
    const r = rig({ path: '/hair-restoration', page: { width: 390, referrer: 'https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fprivate' } });
    r.gate.dispatch({ type: 'set', changes: { analytics: true } });
    r.page.click(cta);
    r.page.scrollTo(900);
    r.page.hide();
    await r.settle();
    const body = r.sent.join('\n');
    expect(body).not.toMatch(/Mozilla|Chrome|facebook|example\.com|private|\d{4}-\d{2}-\d{2}T|token|SECRET|@|id"|uuid|session|visitor/i);
    for (const e of JSON.parse(r.sent[0]).events as Array<Record<string, unknown>>) {
      expect(Object.keys(e).every((k) => ['event_type', 'page_path', 'page_template', 'viewport_class', 'referrer_class', 'from_template', 'click_target', 'max_scroll', 'time_bucket'].includes(k))).toBe(true);
    }
  });
});

describe('with no endpoint configured the tool does nothing at all', () => {
  test('load() starts no listener, no timer and sends no request, even with full consent', async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    const r = rig({ endpoint: '' });
    r.gate.dispatch({ type: 'acceptAll' });
    r.page.click(cta);
    r.page.scrollTo(1000);
    r.page.hide();
    r.runTimers();
    await r.settle();
    expect(r.page.listenerCount()).toBe(0);
    expect(r.timers).toHaveLength(0);
    expect(r.sent).toHaveLength(0);
    expect(r.beaconCalls).toHaveLength(0);
    expect(globalFetch).not.toHaveBeenCalled();
  });
});
