/**
 * The collector: listens for page views, clicks, scrolling and leaving, and hands
 * sanitized events to a sink. It never sends anything itself and never reads or
 * writes cookies or storage; everything it needs from the page comes through the
 * small `CollectorEnv` interface, so the whole thing is tested with a fake page.
 *
 * Per page view it emits:
 *  - one page_view when it starts,
 *  - one click for each click on an allow-listed data-track target or on the site
 *    header or footer (at most MAX_CLICKS_PER_PAGE),
 *  - one page_leave each time the page is hidden or unloaded, carrying that
 *    viewing stretch's deepest scroll and visible time in coarse buckets.
 *
 * A visitor who switches tabs and comes back (or returns through the back/forward
 * cache) starts a new viewing stretch on the same page: clicks are counted again
 * and the next hide sends another page_leave. No new page_view is sent, because the
 * page was not loaded again.
 */
import type { AnalyticsEvent, ClickEvent, ClickTarget, PageLeaveEvent, PageViewEvent } from './model';
import {
  classifyReferrer,
  clickTarget,
  sanitizePage,
  scrollBucket,
  scrollPercent,
  timeBucket,
  viewportClass,
  type ElementLike,
  type PathDetail,
  type ScrollMetrics,
} from './sanitize';

export type Visibility = 'visible' | 'hidden';

export interface CollectorEnv {
  /** location.pathname (no query, no hash). */
  pathname(): string;
  hostname(): string;
  /** document.referrer. Classified and discarded. */
  referrer(): string;
  viewportWidth(): number;
  scroll(): ScrollMetrics;
  visibility(): Visibility;
  /** Milliseconds; only differences are used. */
  now(): number;
  /** Subscribe; returns the function that unsubscribes. */
  listen(target: 'window' | 'document', type: string, handler: (event: unknown) => void, capture?: boolean): () => void;
}

export interface CollectorOptions {
  env: CollectorEnv;
  /** Receives each sanitized event. */
  emit: (event: AnalyticsEvent) => void;
  /** Called when the page is being hidden, so queued events are sent before it goes. */
  flush: () => void;
  pathDetail?: PathDetail;
}

export interface Collector {
  start(): void;
  /** Stop listening and forget everything. Emits nothing. */
  stop(): void;
  running(): boolean;
}

export const MAX_CLICKS_PER_PAGE = 20;
/** Scroll handlers do cheap arithmetic, but reading the page height can force layout; do it at most this often. */
const SCROLL_SAMPLE_MS = 100;

/** One continuous period of the page being visible. */
interface Stretch {
  leaveSent: boolean;
  visibleMs: number;
  visibleSince: number | null;
  maxPercent: number;
}

const newStretch = (env: CollectorEnv): Stretch => ({
  leaveSent: false,
  visibleMs: 0,
  visibleSince: env.visibility() === 'visible' ? env.now() : null,
  maxPercent: scrollPercent(env.scroll()),
});

// ------------------------------------------------------------- event construction

function pageContext(env: CollectorEnv, detail: PathDetail) {
  const page = sanitizePage(env.pathname(), detail);
  return { page_path: page.path, page_template: page.template, viewport_class: viewportClass(env.viewportWidth()) };
}

function pageViewEvent(env: CollectorEnv, detail: PathDetail): PageViewEvent {
  const ref = classifyReferrer(env.referrer(), env.hostname());
  return {
    event_type: 'page_view',
    ...pageContext(env, detail),
    referrer_class: ref.referrerClass,
    ...(ref.referrerClass === 'internal' && ref.fromTemplate ? { from_template: ref.fromTemplate } : {}),
  };
}

function clickEvent(env: CollectorEnv, detail: PathDetail, target: ClickTarget): ClickEvent {
  return { event_type: 'click', ...pageContext(env, detail), click_target: target };
}

function leaveEvent(env: CollectorEnv, detail: PathDetail, s: Stretch): PageLeaveEvent {
  return {
    event_type: 'page_leave',
    ...pageContext(env, detail),
    max_scroll: scrollBucket(s.maxPercent),
    time_bucket: timeBucket(s.visibleMs),
  };
}

// ------------------------------------------------------------------- the collector

export function createCollector(opts: CollectorOptions): Collector {
  const { env } = opts;
  const detail = opts.pathDetail ?? 'full';
  let active = false;
  let unsubscribe: Array<() => void> = [];
  let clicks = 0;
  let lastSample = Number.NEGATIVE_INFINITY;
  // Nothing is read from the page until start(): creating a collector (which the registry does
  // before any consent exists) must not touch the page.
  let stretch: Stretch = { leaveSent: false, visibleMs: 0, visibleSince: null, maxPercent: 0 };

  function sampleScroll(force = false): void {
    const t = env.now();
    if (!force && t - lastSample < SCROLL_SAMPLE_MS) return;
    lastSample = t;
    stretch = { ...stretch, maxPercent: Math.max(stretch.maxPercent, scrollPercent(env.scroll())) };
  }

  function leave(): void {
    if (!active || stretch.leaveSent) return;
    sampleScroll(true);
    const visibleMs = stretch.visibleMs + (stretch.visibleSince === null ? 0 : Math.max(0, env.now() - stretch.visibleSince));
    stretch = { ...stretch, visibleMs, visibleSince: null, leaveSent: true };
    opts.emit(leaveEvent(env, detail, stretch));
    opts.flush();
  }

  /** The page is visible again (tab switch back, or restored from the back/forward cache). Safe to call twice. */
  function resume(): void {
    if (!active) return;
    if (stretch.leaveSent) stretch = newStretch(env);
    else if (stretch.visibleSince === null) stretch = { ...stretch, visibleSince: env.now() };
  }

  const onClick = (event: unknown) => {
    if (!active || clicks >= MAX_CLICKS_PER_PAGE) return;
    const target = clickTarget((event as { target?: ElementLike | null } | null)?.target);
    if (target === null) return;
    clicks += 1;
    opts.emit(clickEvent(env, detail, target));
  };

  const onVisibility = () => (env.visibility() === 'hidden' ? leave() : resume());

  /** Each unsubscribe is kept the moment it exists, so a failure part-way through can still undo everything. */
  function subscribe(): void {
    const add = (off: () => void) => void unsubscribe.push(off);
    add(env.listen('document', 'click', onClick, true));
    add(env.listen('window', 'scroll', () => sampleScroll()));
    add(env.listen('document', 'visibilitychange', onVisibility));
    add(env.listen('window', 'pagehide', leave));
    add(env.listen('window', 'pageshow', resume));
  }

  function stop(): void {
    for (const off of unsubscribe) off();
    unsubscribe = [];
    active = false;
  }

  return {
    start() {
      if (active) return;
      active = true;
      clicks = 0;
      lastSample = env.now();
      stretch = newStretch(env);
      try {
        subscribe();
      } catch (err) {
        stop();
        throw err;
      }
      opts.emit(pageViewEvent(env, detail));
    },
    stop,
    running: () => active,
  };
}
