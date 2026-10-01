import { describe, expect, test, vi } from 'vitest';
import {
  ANALYTICS_SCHEMA_VERSION,
  MAX_EVENTS_PER_BATCH,
  PAGE_TEMPLATES,
  parseAnalyticsBody,
  toAnalyticsRows,
  validateAnalyticsBatch,
  validateAnalyticsEvent,
  type AnalyticsRow,
} from '../../../../supabase/functions/_shared/analytics-event.ts';
import { createHandler } from '../../../../supabase/functions/_shared/handler.ts';
import { MAX_BODY_BYTES } from '../../../../supabase/functions/_shared/http.ts';
import { createRateLimiter } from '../../../../supabase/functions/_shared/rate-limit.ts';

const view = (over: Record<string, unknown> = {}) => ({
  event_type: 'page_view',
  page_path: '/weight-loss',
  page_template: 'program',
  viewport_class: 'mobile',
  referrer_class: 'search',
  ...over,
});
const click = (over: Record<string, unknown> = {}) => ({
  event_type: 'click',
  page_path: '/',
  page_template: 'home',
  viewport_class: 'desktop',
  click_target: 'cta-assessment',
  ...over,
});
const leave = (over: Record<string, unknown> = {}) => ({
  event_type: 'page_leave',
  page_path: '/wellness-learning-center/what-is-a-glp-1',
  page_template: 'learning_center_article',
  viewport_class: 'tablet',
  max_scroll: 75,
  time_bucket: '30-60s',
  ...over,
});
const batch = (...events: unknown[]) => ({ v: ANALYTICS_SCHEMA_VERSION, events });

describe('validateAnalyticsEvent', () => {
  test('accepts one well-formed event of each type', () => {
    expect(validateAnalyticsEvent(view()).ok).toBe(true);
    expect(validateAnalyticsEvent(click()).ok).toBe(true);
    expect(validateAnalyticsEvent(leave()).ok).toBe(true);
  });

  test('a page view may carry the previous page template, but only after an internal referrer', () => {
    expect(validateAnalyticsEvent(view({ referrer_class: 'internal', from_template: 'home' })).ok).toBe(true);
    expect(validateAnalyticsEvent(view({ referrer_class: 'search', from_template: 'home' })).ok).toBe(false);
    expect(validateAnalyticsEvent(view({ referrer_class: 'internal', from_template: 'nowhere' })).ok).toBe(false);
  });

  test.each([
    ['session_id', 'abc'],
    ['visitor_id', 'abc'],
    ['ip_address', '203.0.113.9'],
    ['user_agent', 'Mozilla/5.0'],
    ['referrer', 'https://www.google.com/search?q=semaglutide'],
    ['timestamp', '2026-10-01T12:00:00.000Z'],
    ['element_text', 'Start my free assessment'],
    ['screen_size', '1920x1080'],
  ])('rejects an event with an extra %s field: no identifier or fine detail can slip in', (key, value) => {
    for (const e of [view(), click(), leave()]) {
      expect(validateAnalyticsEvent({ ...e, [key]: value }).ok).toBe(false);
    }
  });

  test('rejects fields that belong to a different event type', () => {
    expect(validateAnalyticsEvent(view({ click_target: 'cta-assessment' })).ok).toBe(false);
    expect(validateAnalyticsEvent(click({ max_scroll: 25 })).ok).toBe(false);
    expect(validateAnalyticsEvent(leave({ referrer_class: 'search' })).ok).toBe(false);
  });

  test.each([
    ['an unknown event type', view({ event_type: 'keypress' })],
    ['a path with a query string', view({ page_path: '/weight-loss?email=a@b.com' })],
    ['a path with a hash', view({ page_path: '/weight-loss#pricing' })],
    ['a path with a dot (an email, a file)', view({ page_path: '/jane.doe@gmail.com' })],
    ['an upper-case path', view({ page_path: '/Weight-Loss' })],
    ['a path with no leading slash', view({ page_path: 'weight-loss' })],
    ['a path with a trailing slash', view({ page_path: '/weight-loss/' })],
    ['a path with five segments', view({ page_path: '/a/b/c/d/e' })],
    ['a path over the length limit', view({ page_path: `/${'a'.repeat(120)}` })],
    ['an unknown template', view({ page_template: 'checkout' })],
    ['an unknown viewport', view({ viewport_class: 'watch' })],
    ['an unknown referrer class', view({ referrer_class: 'https://www.google.com/' })],
    ['a click target with a space (text, not a label)', click({ click_target: 'Start Now' })],
    ['a click target with upper case', click({ click_target: 'CTA' })],
    ['a click target that looks like an email', click({ click_target: 'a@b.com' })],
    ['a click target over 40 characters', click({ click_target: 'a'.repeat(41) })],
    ['a path holding a long number (a phone number or id)', view({ page_path: '/ref/4155551234' })],
    ['a path holding a phone number split by hyphens', view({ page_path: '/call-415-555-1234' })],
    ['a path holding a date of birth', view({ page_path: '/dob-1990-01-15' })],
    ['a path holding an id split across segments', view({ page_path: '/ssn/123/45/6789' })],
    ['a path holding a number split by underscores', view({ page_path: '/id_123_456_789' })],
    ['a click target holding a long number', click({ click_target: 'user-123456789' })],
    ['an empty click target', click({ click_target: '' })],
    ['a scroll value that is not a bucket', leave({ max_scroll: 33 })],
    ['a scroll value as a string', leave({ max_scroll: '50' })],
    ['an unknown time bucket', leave({ time_bucket: '47s' })],
    ['a non-object', 'view'],
    ['null', null],
  ])('rejects %s', (_name, raw) => {
    expect(validateAnalyticsEvent(raw).ok).toBe(false);
  });

  test('short numbers in a slug are fine (a year, a list size, a dosage)', () => {
    for (const p of ['/wellness-learning-center/glp-1-in-2026', '/wellness-learning-center/top-10-questions', '/healthy-aging/nad-500mg']) {
      expect(validateAnalyticsEvent(view({ page_path: p })).ok, p).toBe(true);
    }
  });

  test('accepts the home page and the unmatched-path fallback', () => {
    expect(validateAnalyticsEvent(view({ page_path: '/' })).ok).toBe(true);
    expect(validateAnalyticsEvent(view({ page_path: '/_unmatched' })).ok).toBe(true);
  });

  test('every page template is accepted', () => {
    for (const t of PAGE_TEMPLATES) expect(validateAnalyticsEvent(view({ page_template: t })).ok).toBe(true);
  });

  test('control characters in a text field are refused', () => {
    expect(validateAnalyticsEvent(click({ click_target: 'cta\u0000x' })).ok).toBe(false);
  });
});

describe('validateAnalyticsBatch', () => {
  test('accepts a batch of up to the maximum number of events', () => {
    expect(validateAnalyticsBatch(batch(view())).ok).toBe(true);
    expect(validateAnalyticsBatch(batch(...Array(MAX_EVENTS_PER_BATCH).fill(click()))).ok).toBe(true);
  });

  test.each([
    ['no events', batch()],
    ['too many events', batch(...Array(MAX_EVENTS_PER_BATCH + 1).fill(click()))],
    ['events not an array', { v: 1, events: view() }],
    ['a wrong schema version', { v: 2, events: [view()] }],
    ['a missing schema version', { events: [view()] }],
    ['an extra top-level field (a session id)', { v: 1, events: [view()], sid: 'abc' }],
    ['one bad event hiding among good ones', batch(view(), click({ click_target: 'Bad Label' }), leave())],
    ['an array instead of an object', [view()]],
  ])('rejects %s', (_name, raw) => {
    expect(validateAnalyticsBatch(raw).ok).toBe(false);
  });
});

describe('toAnalyticsRows', () => {
  const rows = (...events: unknown[]) => {
    const b = validateAnalyticsBatch(batch(...events));
    if (!b.ok) throw new Error(b.reason);
    return toAnalyticsRows(b.value);
  };

  test('one row per event with every field that does not apply set to null', () => {
    const [v, c, l] = rows(view({ referrer_class: 'internal', from_template: 'home' }), click(), leave());
    expect(v).toEqual<AnalyticsRow>({
      event_type: 'page_view',
      page_path: '/weight-loss',
      page_template: 'program',
      viewport_class: 'mobile',
      referrer_class: 'internal',
      from_template: 'home',
      click_target: null,
      max_scroll: null,
      time_bucket: null,
    });
    expect(c).toMatchObject({ event_type: 'click', click_target: 'cta-assessment', referrer_class: null, max_scroll: null, time_bucket: null });
    expect(l).toMatchObject({ event_type: 'page_leave', max_scroll: 75, time_bucket: '30-60s', click_target: null, referrer_class: null });
  });

  test('the row has no field for an identifier, an address or a precise time', () => {
    const keys = Object.keys(rows(view())[0]);
    expect(keys.filter((k) => /id$|^ip|address|agent|session|visitor|time(?!_bucket)|stamp|at$/i.test(k))).toEqual([]);
  });
});

describe('the analytics-event request pipeline', () => {
  function pipeline() {
    const store = vi.fn(async (_rows: AnalyticsRow[]) => ({ ok: true as const }));
    const handler = createHandler({
      name: 'analytics-event',
      allowedOrigins: ['https://wellpeps.com'],
      limiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
      sourceKey: async () => 'k',
      parse: parseAnalyticsBody,
      store,
    });
    const send = (body: string, origin = 'https://wellpeps.com') =>
      handler(
        new Request('https://project.supabase.co/functions/v1/analytics-event', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'text/plain;charset=UTF-8' },
          body,
        }),
      );
    return { store, send };
  }

  test('stores the rows of a valid batch sent as text/plain (what sendBeacon sends)', async () => {
    const { store, send } = pipeline();
    const res = await send(JSON.stringify(batch(view(), leave())));
    expect(res.status).toBe(200);
    expect(store).toHaveBeenCalledTimes(1);
    expect(store.mock.calls[0][0]).toHaveLength(2);
  });

  test('a batch with an extra identifier field is refused and nothing is stored', async () => {
    const { store, send } = pipeline();
    expect((await send(JSON.stringify(batch(view({ visitor_id: 'abc' }))))).status).toBe(400);
    expect(store).not.toHaveBeenCalled();
  });

  test('a body over the size cap is refused with 413', async () => {
    const { store, send } = pipeline();
    expect((await send(JSON.stringify({ v: 1, events: [view()], pad: 'x'.repeat(MAX_BODY_BYTES) }))).status).toBe(413);
    expect(store).not.toHaveBeenCalled();
  });

  test('a request from another origin is refused', async () => {
    const { store, send } = pipeline();
    expect((await send(JSON.stringify(batch(view())), 'https://evil.example')).status).toBe(403);
    expect(store).not.toHaveBeenCalled();
  });

  test('a maximum-size batch of realistic events fits comfortably inside the body cap', () => {
    const body = JSON.stringify(batch(...Array(MAX_EVENTS_PER_BATCH).fill(leave({ page_path: `/wellness-learning-center/${'a'.repeat(90)}` }))));
    expect(body.length).toBeLessThan(MAX_BODY_BYTES);
  });
});
