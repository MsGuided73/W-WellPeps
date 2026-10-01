import { afterEach, describe, expect, test, vi } from 'vitest';
import { browserEnv } from './browser-env';
import { createCollector } from './collector';
import type { AnalyticsEvent } from './model';
import { fakeElement } from './test-support';

afterEach(() => vi.unstubAllGlobals());

/**
 * Runs the REAL browser adapter (browser-env.ts) against stand-ins for window,
 * document and location that record every property the code reads, so it is
 * proven that the adapter looks at nothing but coarse page facts.
 */
function stubBrowser() {
  const reads = { window: new Set<string>(), document: new Set<string>(), location: new Set<string>() };
  const handlers = new Map<string, EventListener>();
  const track = <T extends object>(name: keyof typeof reads, target: T): T =>
    new Proxy(target, {
      get(t, prop, receiver) {
        reads[name].add(String(prop));
        return Reflect.get(t, prop, receiver);
      },
    });

  const options = new Map<string, AddEventListenerOptions>();
  const removedWith = new Map<string, EventListenerOptions | boolean | undefined>();
  const add = (key: string) => (type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    handlers.set(`${key}:${type}`, fn);
    options.set(`${key}:${type}`, opts ?? {});
  };
  const remove = (key: string) => (type: string, _fn: EventListener, opts?: EventListenerOptions) => {
    handlers.delete(`${key}:${type}`);
    removedWith.set(`${key}:${type}`, opts);
  };
  const win = track('window', {
    innerWidth: 390,
    innerHeight: 800,
    scrollY: 1200,
    addEventListener: add('window'),
    removeEventListener: remove('window'),
  });
  const doc = track('document', {
    referrer: 'https://www.google.com/search?q=secret',
    visibilityState: 'visible' as 'visible' | 'hidden',
    documentElement: { scrollHeight: 4000 },
    addEventListener: add('document'),
    removeEventListener: remove('document'),
    cookie: 'SHOULD-NEVER-BE-READ',
    title: 'SHOULD-NEVER-BE-READ',
    body: { innerText: 'SHOULD-NEVER-BE-READ' },
  });
  const loc = track('location', { pathname: '/weight-loss', hostname: 'wellpeps.com', search: '?email=a@b.com', hash: '#x', href: 'https://wellpeps.com/weight-loss?email=a@b.com' });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('location', loc);
  vi.stubGlobal('navigator', { userAgent: 'SHOULD-NEVER-BE-READ', language: 'SHOULD-NEVER-BE-READ' });
  return { reads, handlers, options, removedWith, doc };
}

describe('browserEnv (the real page adapter)', () => {
  test('importing and creating it reads nothing from the page', () => {
    const { reads } = stubBrowser();
    browserEnv();
    expect([...reads.window, ...reads.document, ...reads.location]).toEqual([]);
  });

  test('a whole page view reads only the coarse page facts and never the query, hash, cookie, title, text or device', () => {
    const { reads, handlers, doc } = stubBrowser();
    const events: AnalyticsEvent[] = [];
    const collector = createCollector({ env: browserEnv(), emit: (e) => events.push(e), flush: () => {} });
    collector.start();
    handlers.get('document:click')?.({ target: fakeElement({ tag: 'a', attrs: { href: '/x', 'data-track': 'cta-assessment' } }) } as unknown as Event);
    handlers.get('window:scroll')?.({} as Event);
    doc.visibilityState = 'hidden';
    handlers.get('document:visibilitychange')?.({} as Event);
    collector.stop();

    expect([...reads.location].sort()).toEqual(['hostname', 'pathname']);
    expect([...reads.window].sort()).toEqual(['addEventListener', 'innerHeight', 'innerWidth', 'removeEventListener', 'scrollY']);
    expect([...reads.document].sort()).toEqual(['addEventListener', 'documentElement', 'referrer', 'removeEventListener', 'visibilityState']);
    expect(events.map((e) => e.event_type)).toEqual(['page_view', 'click', 'page_leave']);
    expect(JSON.stringify(events)).not.toMatch(/SHOULD-NEVER|secret|google|email|a@b\.com/);
  });

  test('registers only passive listeners (click in the capture phase), and stop() removes every one with the same capture flag', () => {
    const { handlers, options, removedWith } = stubBrowser();
    const collector = createCollector({ env: browserEnv(), emit: () => {}, flush: () => {} });
    collector.start();
    expect([...handlers.keys()].sort()).toEqual([
      'document:click',
      'document:visibilitychange',
      'window:pagehide',
      'window:pageshow',
      'window:scroll',
    ]);
    for (const [key, opts] of options) {
      expect(opts.passive, key).toBe(true);
      expect(opts.capture === true, key).toBe(key === 'document:click');
    }
    collector.stop();
    expect(handlers.size).toBe(0);
    // removeEventListener only removes a listener when the capture flag matches the one it was added with.
    for (const [key, opts] of removedWith) expect((opts as { capture?: boolean } | undefined)?.capture === true, key).toBe(key === 'document:click');
  });
});
