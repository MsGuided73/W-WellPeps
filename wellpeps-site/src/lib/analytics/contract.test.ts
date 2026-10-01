import { describe, expect, test } from 'vitest';
import * as server from '../../../../supabase/functions/_shared/analytics-event.ts';
import { createCollector } from './collector';
import * as model from './model';
import { classifyReferrer, sanitizePage } from './sanitize';
import { fakeElement, fakePage } from './test-support';
import { createTransport } from './transport';

/**
 * The browser model (model.ts) and the analytics-event function
 * (supabase/functions/_shared/analytics-event.ts) each hold a copy of the event
 * contract. If they drift, the function refuses whole batches with a generic 400
 * and analytics silently stops, so everything that could drift is compared here.
 */
describe('the browser model and the analytics-event function agree', () => {
  test('every enumerated list is identical, in order', () => {
    expect([...server.EVENT_TYPES]).toEqual([...model.EVENT_TYPES]);
    expect([...server.PAGE_TEMPLATES]).toEqual([...model.PAGE_TEMPLATES]);
    expect([...server.VIEWPORT_CLASSES]).toEqual([...model.VIEWPORT_CLASSES]);
    expect([...server.REFERRER_CLASSES]).toEqual([...model.REFERRER_CLASSES]);
    expect([...server.SCROLL_BUCKETS]).toEqual([...model.SCROLL_BUCKETS]);
    expect([...server.TIME_BUCKETS]).toEqual([...model.TIME_BUCKETS]);
  });

  test('the schema version, batch size, path limit and unmatched marker are identical', () => {
    expect(server.ANALYTICS_SCHEMA_VERSION).toBe(model.ANALYTICS_SCHEMA_VERSION);
    expect(server.MAX_EVENTS_PER_BATCH).toBe(model.MAX_EVENTS_PER_BATCH);
    expect(server.MAX_PAGE_PATH).toBe(model.MAX_PAGE_PATH);
    expect(server.UNMATCHED_PATH).toBe(model.UNMATCHED_PATH);
  });

  test('the path, click-target and identifier-like patterns are identical', () => {
    expect(server.PAGE_PATH_PATTERN.source).toBe(model.PAGE_PATH_PATTERN.source);
    expect(server.CLICK_TARGET_PATTERN.source).toBe(model.CLICK_TARGET_PATTERN.source);
    expect(server.LOOKS_LIKE_AN_ID.source).toBe(model.LOOKS_LIKE_AN_ID.source);
  });

  test('every click target the browser can report passes the function\'s pattern and identifier rule', () => {
    for (const target of model.CLICK_TARGETS) {
      expect(server.CLICK_TARGET_PATTERN.test(target), target).toBe(true);
      expect(server.LOOKS_LIKE_AN_ID.test(target), target).toBe(false);
      expect(
        server.validateAnalyticsEvent({ event_type: 'click', page_path: '/', page_template: 'home', viewport_class: 'mobile', click_target: target }).ok,
        target,
      ).toBe(true);
    }
  });

  test('the unmatched marker is itself a valid path', () => {
    expect(server.PAGE_PATH_PATTERN.test(model.UNMATCHED_PATH)).toBe(true);
  });
});

describe('what the browser produces is always accepted by the function', () => {
  const rawPaths = [
    '/', '/weight-loss', '/weight-loss?utm_source=ad&email=a@b.com#pricing', '/Hair-Restoration/', '//sexual-wellness//', '/healthy-aging/index.html',
    '/wellness-learning-center', '/wellness-learning-center/what-is-a-glp-1', '/wellness-learning-center/' + 'a'.repeat(200),
    '/privacy-policy', '/your-privacy-choices', '/your-plan', '/why-wellpeps', '/something-new', '/jane.doe@gmail.com', '/ref/4155551234',
    '/%E0%A4%A', '/a/b/c/d/e/f', '/héllo', '/hello world', '/%00', '/<script>', '', '?', '#', '/..//..',
  ];

  test('whatever path the address bar holds, the sanitized path and template pass the function', () => {
    for (const raw of rawPaths) {
      for (const detail of ['full', 'section'] as const) {
        const { path, template } = sanitizePage(raw, detail);
        const checked = server.validateAnalyticsEvent({
          event_type: 'page_view',
          page_path: path,
          page_template: template,
          viewport_class: 'desktop',
          referrer_class: 'direct',
        });
        expect(checked.ok, `${JSON.stringify(raw)} -> ${path} (${detail}): ${checked.ok ? '' : checked.reason}`).toBe(true);
      }
    }
  });

  test('whatever the referrer holds, the class and the previous template pass the function', () => {
    const referrers = [
      '', 'not a url', 'https://www.google.com/search?q=secret', 'https://wellpeps.com/', 'https://wellpeps.com/weight-loss?x=1',
      'https://wellpeps.com/%E0%A4%A', 'https://facebook.com/', 'https://example.org/a?b=c', 'ftp://wellpeps.com/x', 'javascript:alert(1)',
    ];
    for (const ref of referrers) {
      const info = classifyReferrer(ref, 'wellpeps.com');
      const checked = server.validateAnalyticsEvent({
        event_type: 'page_view',
        page_path: '/',
        page_template: 'home',
        viewport_class: 'tablet',
        referrer_class: info.referrerClass,
        ...(info.fromTemplate ? { from_template: info.fromTemplate } : {}),
      });
      expect(checked.ok, `${ref}: ${checked.ok ? '' : checked.reason}`).toBe(true);
    }
  });

  test('a full visit through the real collector and transport is a batch the function accepts, row for row', () => {
    const sent: string[] = [];
    const transport = createTransport({
      endpoint: 'https://project.supabase.co/functions/v1/analytics-event',
      fetchImpl: async (_url, init) => void sent.push(String(init.body)),
    });
    const page = fakePage({ pathname: '/weight-loss', referrer: 'https://wellpeps.com/wellness-learning-center/some-article?x=1', pageHeight: 4000 });
    const collector = createCollector({ env: page.env, emit: transport.enqueue, flush: transport.flush });
    collector.start();
    page.click(fakeElement({ tag: 'a', attrs: { href: '/x', 'data-track': 'cta-assessment' } }));
    page.click(fakeElement({ tag: 'a', attrs: { href: '/y' }, parent: { tag: 'footer', attrs: { class: 'footer' } } }));
    page.scrollTo(1500);
    page.advance(45_000);
    page.hide();

    expect(sent).toHaveLength(1);
    const batch = server.validateAnalyticsBatch(JSON.parse(sent[0]));
    expect(batch.ok, batch.ok ? '' : batch.reason).toBe(true);
    if (!batch.ok) return;
    const rows = server.toAnalyticsRows(batch.value);
    expect(rows.map((r) => r.event_type)).toEqual(['page_view', 'click', 'click', 'page_leave']);
    expect(rows[0]).toMatchObject({ referrer_class: 'internal', from_template: 'learning_center_article', page_template: 'program' });
    expect(rows.slice(1, 3).map((r) => r.click_target)).toEqual(['cta-assessment', 'footer']);
    expect(rows[3]).toMatchObject({ max_scroll: 50, time_bucket: '30-60s' });
  });
});

describe('the function rejects what the browser must never send', () => {
  function oneOfEach(): Array<Record<string, unknown>> {
    const page = fakePage({ referrer: 'https://wellpeps.com/your-plan' });
    const events: Array<Record<string, unknown>> = [];
    const collector = createCollector({ env: page.env, emit: (e) => events.push({ ...e }), flush: () => {} });
    collector.start();
    page.click(fakeElement({ tag: 'button', attrs: { 'data-track': 'nav' } }));
    page.hide();
    return events;
  }

  test('the browser sends exactly the fields the function stores, and no other', () => {
    const keys = new Set(oneOfEach().flatMap((e) => Object.keys(e)));
    expect([...keys].sort()).toEqual(
      ['click_target', 'event_type', 'from_template', 'max_scroll', 'page_path', 'page_template', 'referrer_class', 'time_bucket', 'viewport_class'].sort(),
    );
  });

  test('every event the browser builds is accepted as it is, and refused the moment an identifier-like field is added to it', () => {
    for (const e of oneOfEach()) {
      expect(server.validateAnalyticsEvent(e).ok, String(e.event_type)).toBe(true);
      for (const extra of ['visitor_id', 'session_id', 'user_agent', 'ip_address', 'timestamp', 'referrer', 'element_text']) {
        expect(server.validateAnalyticsEvent({ ...e, [extra]: 'x' }).ok, `${String(e.event_type)} + ${extra}`).toBe(false);
      }
    }
  });
});
