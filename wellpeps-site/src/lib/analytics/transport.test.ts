import { describe, expect, test, vi } from 'vitest';
import { MAX_BODY_BYTES } from '../../../../supabase/functions/_shared/http.ts';
import { ANALYTICS_SCHEMA_VERSION, MAX_EVENTS_PER_BATCH, type AnalyticsEvent } from './model';
import { createTransport, DEFAULT_FLUSH_MS } from './transport';

const ENDPOINT = 'https://project.supabase.co/functions/v1/analytics-event';

const event = (n = 0): AnalyticsEvent => ({
  event_type: 'click',
  page_path: `/p${n}`,
  page_template: 'other',
  viewport_class: 'desktop',
  click_target: 'nav',
});

function rig(over: Partial<Parameters<typeof createTransport>[0]> = {}) {
  const timers: Array<{ fn: () => void; ms: number; cleared: boolean }> = [];
  const sendBeacon = vi.fn((_url: string, _data: Blob) => true);
  const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => ({}));
  const transport = createTransport({
    endpoint: ENDPOINT,
    sendBeacon,
    fetchImpl,
    setTimer: (fn, ms) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
    ...over,
  });
  const runTimers = () => timers.filter((t) => !t.cleared).forEach((t) => ((t.cleared = true), t.fn()));
  return { transport, timers, sendBeacon, fetchImpl, runTimers };
}

type Sent = { v: number; events: AnalyticsEvent[] };
const bodyOf = (call: unknown[]): Sent => JSON.parse(String((call[1] as RequestInit).body)) as Sent;

describe('batching', () => {
  test('waits a few seconds after the first event, then sends everything queued in one request', () => {
    const { transport, timers, fetchImpl, runTimers } = rig();
    transport.enqueue(event(1));
    transport.enqueue(event(2));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(DEFAULT_FLUSH_MS);
    runTimers();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = bodyOf(fetchImpl.mock.calls[0]);
    expect(body.v).toBe(ANALYTICS_SCHEMA_VERSION);
    expect(body.events.map((e) => (e as { page_path: string }).page_path)).toEqual(['/p1', '/p2']);
    expect(transport.pending()).toBe(0);
  });

  test('sends at once when the batch is full', () => {
    const { transport, fetchImpl } = rig();
    for (let i = 0; i < MAX_EVENTS_PER_BATCH; i += 1) transport.enqueue(event(i));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(transport.pending()).toBe(0);
  });

  test('flush() sends what is queued and cancels the timer (page being hidden)', () => {
    const { transport, timers, fetchImpl, runTimers } = rig();
    transport.enqueue(event());
    transport.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(timers[0].cleared).toBe(true);
    runTimers();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('flush() with nothing queued sends nothing', () => {
    const { transport, sendBeacon, fetchImpl } = rig();
    transport.flush();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('a request never holds more events than the function accepts, and none are lost', () => {
    const { transport, fetchImpl } = rig();
    for (let i = 0; i < MAX_EVENTS_PER_BATCH * 2 + 5; i += 1) transport.enqueue(event(i));
    transport.flush();
    const sizes = fetchImpl.mock.calls.map((c) => bodyOf(c).events.length);
    for (const n of sizes) expect(n).toBeLessThanOrEqual(MAX_EVENTS_PER_BATCH);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(MAX_EVENTS_PER_BATCH * 2 + 5);
  });

  test('a full batch of the LONGEST possible events stays under the function body cap', () => {
    const { transport, fetchImpl } = rig();
    const longPath = `/wellness-learning-center/${'a'.repeat(94)}`;
    const longest: AnalyticsEvent[] = [
      {
        event_type: 'page_view',
        page_path: longPath,
        page_template: 'learning_center_article',
        viewport_class: 'desktop',
        referrer_class: 'internal',
        from_template: 'learning_center_article',
      },
      {
        event_type: 'page_leave',
        page_path: longPath,
        page_template: 'learning_center_article',
        viewport_class: 'desktop',
        max_scroll: 100,
        time_bucket: '3m+',
      },
      // The longest label the SERVER accepts (40 characters); the browser's own labels are shorter.
      { event_type: 'click', page_path: longPath, page_template: 'learning_center_article', viewport_class: 'desktop', click_target: 'a'.repeat(40) as never },
    ];
    for (const e of longest) {
      for (let i = 0; i < MAX_EVENTS_PER_BATCH; i += 1) transport.enqueue(e);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const call of fetchImpl.mock.calls) expect(String((call[1] as RequestInit).body).length).toBeLessThan(MAX_BODY_BYTES);
  });
});

describe('sending', () => {
  test('uses fetch with keepalive, a text/plain body (no CORS pre-flight), credentials omitted and no referrer', () => {
    const { transport, fetchImpl } = rig();
    transport.enqueue(event());
    transport.flush();
    expect(fetchImpl.mock.calls[0][0]).toBe(ENDPOINT);
    const init = fetchImpl.mock.calls[0][1];
    expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain;charset=UTF-8');
  });

  test('does NOT use sendBeacon when fetch works, because a beacon always carries credentials', () => {
    const { transport, sendBeacon } = rig();
    transport.enqueue(event());
    transport.flush();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  test('falls back to sendBeacon only when fetch is unavailable or refuses', async () => {
    const refusing = rig({
      fetchImpl: () => {
        throw new TypeError('keepalive not supported');
      },
    });
    refusing.transport.enqueue(event());
    refusing.transport.flush();
    expect(refusing.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = refusing.sendBeacon.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    // Blob lower-cases its type, so compare that way.
    expect(blob.type.toLowerCase()).toBe('text/plain;charset=utf-8');
    expect((JSON.parse(await blob.text()) as Sent).v).toBe(ANALYTICS_SCHEMA_VERSION);
  });

  test('a network failure after fetch was handed the request is not retried and not beaconed', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const { transport, sendBeacon } = rig({ fetchImpl });
    transport.enqueue(event());
    expect(() => transport.flush()).not.toThrow();
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(transport.pending()).toBe(0);
  });

  test('never throws even when fetch and the beacon both blow up', () => {
    const { transport } = rig({
      fetchImpl: () => {
        throw new Error('boom');
      },
      sendBeacon: () => {
        throw new Error('boom too');
      },
    });
    transport.enqueue(event());
    expect(() => transport.flush()).not.toThrow();
  });

  test('the body is exactly the batch: schema version and events, nothing else', () => {
    const { transport, fetchImpl } = rig();
    transport.enqueue(event(7));
    transport.flush();
    expect(Object.keys(bodyOf(fetchImpl.mock.calls[0])).sort()).toEqual(['events', 'v']);
  });
});

describe('discard', () => {
  test('throws away what is queued without sending it, and cancels the timer', () => {
    const { transport, timers, sendBeacon, fetchImpl, runTimers } = rig();
    transport.enqueue(event());
    transport.enqueue(event());
    transport.discard();
    expect(transport.pending()).toBe(0);
    expect(timers[0].cleared).toBe(true);
    runTimers();
    transport.flush();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('with no endpoint configured', () => {
  test('does nothing at all: no timer, no fetch, no beacon, nothing queued', () => {
    const { transport, timers, sendBeacon, fetchImpl } = rig({ endpoint: '' });
    transport.enqueue(event());
    transport.flush();
    expect(timers).toHaveLength(0);
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(transport.pending()).toBe(0);
  });

  test('does not touch the global fetch either', () => {
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    try {
      const transport = createTransport({ endpoint: '' });
      transport.enqueue(event());
      transport.flush();
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('with an endpoint and no injected function, it uses the global fetch', () => {
    const globalFetch = vi.fn(async () => ({}));
    vi.stubGlobal('fetch', globalFetch);
    try {
      const transport = createTransport({ endpoint: ENDPOINT, setTimer: () => null, clearTimer: () => {} });
      transport.enqueue(event());
      transport.flush();
      expect(globalFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
