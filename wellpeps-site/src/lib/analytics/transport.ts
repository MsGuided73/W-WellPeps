/**
 * Batching and sending. Events wait in memory (never in storage), are sent in one
 * request when the batch is full, a few seconds have passed, or the page is being
 * hidden, and are dropped, not retried, if the request fails: nothing is kept
 * anywhere to retry from.
 *
 * With no endpoint configured this does NOTHING at all: no timer, no request.
 *
 * The body is text/plain so the browser needs no CORS pre-flight. The request is
 * a fetch with `keepalive` (so it survives the page closing), credentials OMITTED
 * (no cookie is sent to, or accepted from, the function's host) and no referrer.
 * navigator.sendBeacon is only the fallback for a browser where that fetch is
 * unavailable, because a beacon always carries credentials and cannot be told not to.
 */
import { ANALYTICS_SCHEMA_VERSION, MAX_EVENTS_PER_BATCH, type AnalyticsBatch, type AnalyticsEvent } from './model';

export interface TransportOptions {
  /** Empty = analytics not deployed; the transport never sets a timer or makes a request. */
  endpoint: string;
  sendBeacon?: (url: string, data: Blob) => boolean;
  fetchImpl?: (url: string, init: RequestInit) => Promise<unknown>;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Wait this long after the first queued event before sending. */
  flushMs?: number;
}

export interface Transport {
  enqueue(event: AnalyticsEvent): void;
  /** Send what is queued now (page hidden, or batch full). */
  flush(): void;
  /** Throw away what is queued without sending it (consent withdrawn). */
  discard(): void;
  pending(): number;
}

export const DEFAULT_FLUSH_MS = 5000;

export function createTransport(opts: TransportOptions): Transport {
  const flushMs = opts.flushMs ?? DEFAULT_FLUSH_MS;
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let queue: AnalyticsEvent[] = [];
  let timer: unknown = null;

  const stopTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  /** True when the request was handed to fetch (whatever then happens to it). */
  function postWithFetch(body: string): boolean {
    const f = opts.fetchImpl ?? (typeof fetch === 'function' ? (fetch as TransportOptions['fetchImpl']) : undefined);
    if (!f) return false;
    try {
      void Promise.resolve(
        f(opts.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body,
          keepalive: true,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        }),
      ).catch(() => {});
      return true;
    } catch {
      return false; // fetch refused the options (an old browser): try the beacon
    }
  }

  function post(batch: AnalyticsBatch): void {
    const body = JSON.stringify(batch);
    if (postWithFetch(body)) return;
    try {
      opts.sendBeacon?.(opts.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    } catch {
      /* analytics must never break the page */
    }
  }

  function flush(): void {
    stopTimer();
    while (queue.length > 0) {
      const events = queue.slice(0, MAX_EVENTS_PER_BATCH);
      queue = queue.slice(MAX_EVENTS_PER_BATCH);
      post({ v: ANALYTICS_SCHEMA_VERSION, events });
    }
  }

  return {
    enqueue(event) {
      if (!opts.endpoint) return;
      queue = [...queue, event];
      if (queue.length >= MAX_EVENTS_PER_BATCH) {
        flush();
      } else if (timer === null) {
        timer = setTimer(flush, flushMs);
      }
    },
    flush() {
      if (!opts.endpoint) return;
      flush();
    },
    discard() {
      stopTimer();
      queue = [];
    },
    pending: () => queue.length,
  };
}
