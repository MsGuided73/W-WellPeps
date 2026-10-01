/**
 * A fake page for tests: it implements CollectorEnv with plain objects, records
 * every listener, and lets a test scroll, click, hide and move the clock. Not
 * imported by any production code.
 */
import type { CollectorEnv, Visibility } from './collector';
import type { ElementLike } from './sanitize';

export interface FakePageState {
  pathname: string;
  hostname: string;
  referrer: string;
  width: number;
  scrollTop: number;
  viewportHeight: number;
  pageHeight: number;
  visibility: Visibility;
  now: number;
}

export interface FakePage {
  env: CollectorEnv;
  state: FakePageState;
  listenerCount(): number;
  fire(target: 'window' | 'document', type: string, event?: unknown): void;
  click(target: ElementLike | null): void;
  scrollTo(top: number): void;
  hide(): void;
  show(): void;
  advance(ms: number): void;
}

type Handler = (event: unknown) => void;

export function fakePage(over: Partial<FakePageState> = {}): FakePage {
  const state: FakePageState = {
    pathname: '/weight-loss',
    hostname: 'wellpeps.com',
    referrer: '',
    width: 1280,
    scrollTop: 0,
    viewportHeight: 800,
    pageHeight: 3200,
    visibility: 'visible',
    now: 1_000_000,
    ...over,
  };
  const listeners: Array<{ key: string; handler: Handler; capture: boolean }> = [];

  const env: CollectorEnv = {
    pathname: () => state.pathname,
    hostname: () => state.hostname,
    referrer: () => state.referrer,
    viewportWidth: () => state.width,
    scroll: () => ({ top: state.scrollTop, viewport: state.viewportHeight, total: state.pageHeight }),
    visibility: () => state.visibility,
    now: () => state.now,
    listen(target, type, handler, capture = false) {
      const entry = { key: `${target}:${type}`, handler, capture };
      listeners.push(entry);
      return () => {
        const i = listeners.indexOf(entry);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };

  const fire: FakePage['fire'] = (target, type, event = {}) => {
    for (const l of [...listeners]) if (l.key === `${target}:${type}`) l.handler(event);
  };

  return {
    env,
    state,
    listenerCount: () => listeners.length,
    fire,
    click: (target) => fire('document', 'click', { target }),
    scrollTo(top) {
      state.scrollTop = top;
      state.now += 200; // past the scroll sampling interval
      fire('window', 'scroll');
    },
    hide() {
      state.visibility = 'hidden';
      fire('document', 'visibilitychange');
    },
    show() {
      state.visibility = 'visible';
      fire('document', 'visibilitychange');
    },
    advance(ms) {
      state.now += ms;
    },
  };
}

/** A DOM-less element for click tests: a tag, optional attributes, optional parent. */
export interface FakeNode {
  tag: string;
  attrs?: Record<string, string>;
  parent?: FakeNode;
}

export function fakeElement(node: FakeNode): ElementLike {
  const matches = (n: FakeNode, selector: string): boolean =>
    selector.split(',').some((raw) => {
      const sel = raw.trim();
      if (sel === '[data-track]') return n.attrs?.['data-track'] !== undefined;
      if (sel === 'a[href]') return n.tag === 'a' && n.attrs?.href !== undefined;
      if (sel === '[role="button"]') return n.attrs?.role === 'button';
      if (sel === '[data-nav]') return n.attrs?.['data-nav'] !== undefined;
      if (sel === 'footer.footer') return n.tag === 'footer' && (n.attrs?.class ?? '').split(' ').includes('footer');
      return n.tag === sel;
    });
  const wrap = (n: FakeNode): ElementLike => ({
    closest(selector) {
      for (let cur: FakeNode | undefined = n; cur; cur = cur.parent) if (matches(cur, selector)) return wrap(cur);
      return null;
    },
    getAttribute: (name) => n.attrs?.[name] ?? null,
  });
  return wrap(node);
}
