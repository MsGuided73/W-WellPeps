import { describe, expect, test, vi } from 'vitest';
import { createGate, type GateDeps } from './gate';
import { CONSENT_MAX_AGE_DAYS, NOTICE_VERSION, defaultState, parse, reduce, serialize } from './consent';
import type { ConsentLogEvent } from './log';
import type { Tracker } from './registry';

const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

interface Harness {
  deps: GateDeps;
  jar: { value: string | null };
  removed: string[];
  removedStorage: string[];
  logs: ConsentLogEvent[];
  analytics: Tracker & { loads: number; unloads: number };
  ads: Tracker & { loads: number; unloads: number };
  setPath(p: string): void;
  setGpc(on: boolean): void;
  setNow(n: number): void;
}

function makeTracker(id: string, category: 'analytics' | 'advertising') {
  const t = {
    id,
    name: id,
    vendor: 'Test',
    category,
    description: 'test tool',
    hosts: [`${id}.example.com`],
    cookies: [`_${id}`, `_${id}_s`],
    storageKeys: [`${id}-store`],
    loads: 0,
    unloads: 0,
    load() {
      t.loads += 1;
    },
    unload() {
      t.unloads += 1;
    },
  };
  return t;
}

function harness(opts: { stored?: string | null; gpc?: boolean; path?: string; blocked?: 'throw' | 'drop' | null; noTrackers?: boolean } = {}): Harness {
  const jar = { value: opts.stored ?? null };
  const removed: string[] = [];
  const removedStorage: string[] = [];
  const logs: ConsentLogEvent[] = [];
  const analytics = makeTracker('test-analytics', 'analytics');
  const ads = makeTracker('test-ads', 'advertising');
  let path = opts.path ?? '/';
  let gpc = opts.gpc ?? false;
  let now = NOW;
  let counter = 0;
  const deps: GateDeps = {
    now: () => now,
    uuid: () => `uuid-${++counter}`,
    userAgent: 'Mozilla/5.0 Chrome/120.0',
    cookies: {
      read: () => jar.value,
      write: (value) => {
        if (opts.blocked === 'throw') throw new Error('blocked');
        if (opts.blocked === 'drop') return;
        jar.value = value;
      },
      removeConsent: () => {
        jar.value = null;
      },
      remove: (name) => {
        removed.push(name);
      },
    },
    removeStorage: (key) => removedStorage.push(key),
    readGpc: () => gpc,
    path: () => path,
    trackers: opts.noTrackers ? [] : [analytics, ads],
    log: (e) => logs.push(e),
  };
  return {
    deps,
    jar,
    removed,
    removedStorage,
    logs,
    analytics,
    ads,
    setPath: (p) => (path = p),
    setGpc: (g) => (gpc = g),
    setNow: (n) => (now = n),
  };
}

describe('a first-time visitor', () => {
  test('loads no optional tool and has no stored choice', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    expect(h.analytics.loads).toBe(0);
    expect(h.ads.loads).toBe(0);
    expect(gate.loaded()).toEqual([]);
    expect(gate.promptReason()).toBe('first');
    expect(gate.getState().analytics).toBe(false);
  });

  test('is not prompted at all when the site has no optional tool to ask about', () => {
    const gate = createGate(harness({ noTrackers: true }).deps);
    gate.init();
    expect(gate.hasNonEssential()).toBe(false);
    expect(gate.promptReason()).toBeNull();
  });
});

describe('making a choice', () => {
  test('Accept all loads both tools, stores the choice and logs it', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll', via: 'banner' });
    expect(h.analytics.loads).toBe(1);
    expect(h.ads.loads).toBe(1);
    expect(gate.loaded().sort()).toEqual(['test-ads', 'test-analytics']);
    expect(parse(h.jar.value)?.analytics).toBe(true);
    expect(h.logs.at(-1)?.action).toBe('accept_all');
  });

  test('turning one switch on loads only that category', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(h.analytics.loads).toBe(1);
    expect(h.ads.loads).toBe(0);
    expect(h.logs.at(-1)?.action).toBe('custom');
  });

  test('does not load a tool twice when the same choice is applied again', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    gate.dispatch({ type: 'acceptAll' });
    expect(h.analytics.loads).toBe(1);
  });

  test('Reject all after Accept all stops the tools in the same session and clears what they stored', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    gate.dispatch({ type: 'rejectAll' });
    expect(h.analytics.unloads).toBe(1);
    expect(h.ads.unloads).toBe(1);
    expect(gate.loaded()).toEqual([]);
    expect(h.removed).toEqual(expect.arrayContaining(['_test-analytics', '_test-analytics_s', '_test-ads', '_test-ads_s']));
    expect(h.removedStorage).toEqual(expect.arrayContaining(['test-analytics-store', 'test-ads-store']));
    expect(h.logs.at(-1)?.action).toBe('reject_all');
  });

  test('Withdraw all stops everything, deletes the saved choice and logs a withdrawal', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    gate.dispatch({ type: 'withdrawAll' });
    expect(gate.loaded()).toEqual([]);
    expect(h.jar.value).toBeNull();
    expect(h.logs.at(-1)?.action).toBe('withdraw');
  });

  test('a returning visitor with a saved choice gets it applied on load, without a new log row', () => {
    const stored = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.analytics.loads).toBe(1);
    expect(gate.promptReason()).toBeNull();
    expect(h.logs).toEqual([]);
  });

  test('tells subscribers about every change, and stops when they unsubscribe', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    const seen = vi.fn();
    const off = gate.subscribe(seen);
    gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0].state.analytics).toBe(true);
    expect(seen.mock.calls[0][0].loaded).toEqual(['test-analytics']);
    off();
    gate.dispatch({ type: 'rejectAll' });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe('Global Privacy Control', () => {
  test('on a fresh visit it keeps advertising off, loads nothing, and logs an automatic opt-out', () => {
    const h = harness({ gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    expect(gate.getState().gpc).toBe(true);
    expect(gate.getState().advertising).toBe(false);
    expect(h.ads.loads).toBe(0);
    expect(h.logs.map((l) => l.action)).toEqual(['gpc_auto_optout']);
    expect(h.logs[0].gpc_detected).toBe(true);
  });

  test('is applied BEFORE any tool loads, even when an earlier advertising opt-in is stored', () => {
    const optedIn = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored: optedIn, gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.ads.loads).toBe(0);
    expect(h.analytics.loads).toBe(1);
    expect(gate.getState().gpcConflict).toBe(true);
  });

  test('does not write a new log row on every page load once the signal is already recorded', () => {
    const h = harness({ gpc: true });
    const first = createGate(h.deps);
    first.init();
    const second = createGate(h.deps);
    second.init();
    expect(h.logs.filter((l) => l.action === 'gpc_auto_optout')).toHaveLength(1);
  });

  test('"Allow anyway" loads advertising and logs the override', () => {
    const optedIn = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored: optedIn, gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'gpcAllowAnyway' });
    expect(h.ads.loads).toBe(1);
    expect(h.logs.at(-1)?.action).toBe('gpc_conflict_allow');
  });

  test('"Keep it off" logs the choice and leaves advertising off', () => {
    const optedIn = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored: optedIn, gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'gpcKeepOff' });
    expect(h.ads.loads).toBe(0);
    expect(h.logs.at(-1)?.action).toBe('gpc_conflict_keep_off');
  });

  test('Accept all cannot load advertising while the signal is present', () => {
    const h = harness({ gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(h.analytics.loads).toBe(1);
    expect(h.ads.loads).toBe(0);
  });
});

describe('health-topic pages', () => {
  test('advertising never loads there, even with consent', () => {
    const h = harness({ path: '/weight-loss' });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(h.ads.loads).toBe(0);
  });

  test('analytics loads there only after the separate consent', () => {
    const h = harness({ path: '/weight-loss' });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(h.analytics.loads).toBe(0);
    gate.dispatch({ type: 'set', changes: { analyticsSensitive: true } });
    expect(h.analytics.loads).toBe(1);
  });

  test('moving from an ordinary page to a health-topic page stops advertising', () => {
    const h = harness({ path: '/' });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(h.ads.loads).toBe(1);
    h.setPath('/hair-restoration');
    gate.navigate('/hair-restoration');
    expect(h.ads.unloads).toBe(1);
    expect(gate.loaded()).toEqual([]);
  });
});

describe('a visitor whose browser blocks storage', () => {
  test.each(['throw', 'drop'] as const)('treats every choice as off (%s)', (mode) => {
    const h = harness({ blocked: mode });
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(gate.storageBlocked()).toBe(true);
    expect(h.analytics.loads).toBe(0);
    expect(h.ads.loads).toBe(0);
    expect(gate.getState().analytics).toBe(false);
  });
});

describe('failing safe', () => {
  test('if reading the saved choice throws, no optional tool loads and the page keeps working', () => {
    const h = harness();
    h.deps.cookies.read = () => {
      throw new Error('boom');
    };
    const gate = createGate(h.deps);
    expect(() => gate.init()).not.toThrow();
    expect(h.analytics.loads).toBe(0);
    expect(h.ads.loads).toBe(0);
  });

  test('a tool that throws while loading does not stop the others or corrupt the saved choice', () => {
    const h = harness();
    h.analytics.load = () => {
      throw new Error('vendor script failed');
    };
    const gate = createGate(h.deps);
    gate.init();
    expect(() => gate.dispatch({ type: 'acceptAll' })).not.toThrow();
    expect(h.ads.loads).toBe(1);
    expect(parse(h.jar.value)?.analytics).toBe(true);
    expect(gate.loaded()).toEqual(['test-ads']);
  });

  test('a tool that throws while unloading still has its cookies removed', () => {
    const h = harness();
    h.ads.unload = () => {
      throw new Error('cannot stop');
    };
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    expect(() => gate.dispatch({ type: 'rejectAll' })).not.toThrow();
    expect(h.removed).toContain('_test-ads');
  });
});

describe('asking again', () => {
  test('a choice made under an older notice version is not honored and the visitor is asked again', () => {
    const old = serialize({ ...reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW), v: '1999-01-01.0' });
    const h = harness({ stored: old });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.analytics.loads).toBe(0);
    expect(gate.promptReason()).toBe('version');
    expect(NOTICE_VERSION).not.toBe('1999-01-01.0');
  });

  test('a choice older than twelve months is not honored and the visitor is asked again', () => {
    const stored = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored });
    h.setNow(NOW + (CONSENT_MAX_AGE_DAYS + 2) * DAY);
    const gate = createGate(h.deps);
    gate.init();
    expect(h.analytics.loads).toBe(0);
    expect(gate.promptReason()).toBe('expiry');
  });
});

describe('sweeping leftovers', () => {
  test('removes cookies and storage of a tool whose category is off when a page loads (for example after withdrawing in another tab)', () => {
    const stored = serialize(defaultState(NOW, 'cid-x'));
    const h = harness({ stored });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.removed).toEqual(expect.arrayContaining(['_test-analytics', '_test-ads']));
    expect(h.removedStorage).toEqual(expect.arrayContaining(['test-analytics-store', 'test-ads-store']));
  });

  test('removes advertising leftovers while a GPC signal locks advertising off', () => {
    const optedIn = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'acceptAll' }, NOW));
    const h = harness({ stored: optedIn, gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.removed).toContain('_test-ads');
    expect(h.removed).not.toContain('_test-analytics');
  });

  test('keeps analytics cookies on a health-topic page when analytics is on, even though the tool does not run there', () => {
    const analyticsOn = serialize(reduce(defaultState(NOW, 'cid-x'), { type: 'set', changes: { analytics: true } }, NOW));
    const h = harness({ stored: analyticsOn, path: '/weight-loss' });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.analytics.loads).toBe(0);
    expect(h.removed).not.toContain('_test-analytics');
    expect(h.removed).toContain('_test-ads');
  });
});

describe('GPC with an explicit choice', () => {
  test('a visitor who chose Reject all and sends GPC is not asked again on the next page', () => {
    const rejected = serialize(reduce(reduce(defaultState(NOW, 'cid-x'), { type: 'rejectAll', via: 'banner' }, NOW), { type: 'gpcDetected' }, NOW));
    const h = harness({ stored: rejected, gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    expect(gate.promptReason()).toBeNull();
    expect(gate.snapshot().state.source).toBe('banner');
  });

  test('a visitor who has only sent GPC (no choice) is still asked', () => {
    const h = harness({ gpc: true });
    const gate = createGate(h.deps);
    gate.init();
    expect(gate.promptReason()).toBe('first');
  });

  test('with storage blocked, GPC does not write a log row on every page load', () => {
    const h = harness({ gpc: true, blocked: 'drop' });
    const gate = createGate(h.deps);
    gate.init();
    expect(h.logs).toEqual([]);
  });
});

describe('two tabs sharing one saved choice', () => {
  function twoTabs() {
    const a = harness();
    const b = harness();
    // Share one cookie jar between both tabs.
    b.deps.cookies.read = a.deps.cookies.read;
    b.deps.cookies.write = a.deps.cookies.write;
    b.deps.cookies.removeConsent = a.deps.cookies.removeConsent;
    const gateA = createGate(a.deps);
    const gateB = createGate(b.deps);
    return { a, b, gateA, gateB };
  }

  test('a withdrawal in one tab stops the tools in the other as soon as it resyncs', () => {
    const { a, gateA, gateB } = twoTabs();
    gateA.init();
    gateB.init();
    gateA.dispatch({ type: 'acceptAll' });
    gateB.resync();
    expect(gateB.loaded().length).toBe(2);
    gateB.dispatch({ type: 'withdrawAll' });
    gateA.resync();
    expect(gateA.loaded()).toEqual([]);
    expect(a.analytics.unloads).toBe(1);
  });

  test('a stale tab cannot undo a withdrawal made elsewhere by changing another switch', () => {
    const { gateA, gateB } = twoTabs();
    gateA.init();
    gateB.init();
    gateA.dispatch({ type: 'acceptAll' });
    gateB.resync();
    gateB.dispatch({ type: 'withdrawAll' });
    // Tab A has not resynced yet and flips one switch.
    gateA.dispatch({ type: 'set', changes: { advertising: true } });
    expect(gateA.getState().analytics).toBe(false);
  });
});

describe('persistence checks', () => {
  test('a write that is silently dropped over an existing cookie is detected', () => {
    const stored = serialize(defaultState(NOW, 'cid-x'));
    const h = harness({ stored });
    const real = h.deps.cookies.write;
    const gate = createGate(h.deps);
    gate.init();
    h.deps.cookies.write = () => {};
    gate.dispatch({ type: 'acceptAll' });
    expect(gate.storageBlocked()).toBe(true);
    expect(h.analytics.loads).toBe(0);
    h.deps.cookies.write = real;
  });

  test('withdrawing gives the visitor a fresh random consent id', () => {
    const h = harness();
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'acceptAll' });
    const before = gate.getState().cid;
    gate.dispatch({ type: 'withdrawAll' });
    gate.dispatch({ type: 'acceptAll' });
    expect(gate.getState().cid).not.toBe(before);
  });
});

describe('a tool that fails to load', () => {
  test('is tried once, cleaned up, and not retried on every later change', () => {
    const h = harness();
    h.analytics.load = () => {
      h.analytics.loads += 1;
      throw new Error('vendor script failed');
    };
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'set', changes: { analytics: true } });
    gate.dispatch({ type: 'set', changes: { advertising: true } });
    gate.dispatch({ type: 'set', changes: { advertising: false } });
    expect(h.analytics.loads).toBe(1);
    expect(h.analytics.unloads).toBe(1);
    expect(gate.loaded()).not.toContain('test-analytics');
  });
});

describe('an anonymous tool', () => {
  test('runs on a health-topic page with the ordinary analytics choice and no extra consent', () => {
    const h = harness({ path: '/weight-loss' });
    (h.analytics as Tracker & { anonymous?: boolean }).anonymous = true;
    const gate = createGate(h.deps);
    gate.init();
    gate.dispatch({ type: 'set', changes: { analytics: true } });
    expect(h.analytics.loads).toBe(1);
    expect(h.ads.loads).toBe(0);
  });
});
