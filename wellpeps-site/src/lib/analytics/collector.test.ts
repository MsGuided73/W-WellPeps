import { describe, expect, test, vi } from 'vitest';
import { createCollector, MAX_CLICKS_PER_PAGE } from './collector';
import type { AnalyticsEvent } from './model';
import { fakeElement, fakePage, type FakePageState } from './test-support';

function rig(over: Partial<FakePageState> = {}, pathDetail?: 'full' | 'section') {
  const page = fakePage(over);
  const events: AnalyticsEvent[] = [];
  const flush = vi.fn();
  const collector = createCollector({ env: page.env, emit: (e) => events.push(e), flush, pathDetail });
  return { page, events, flush, collector };
}

const cta = fakeElement({ tag: 'a', attrs: { href: 'https://example.org/checkout?token=SECRET', 'data-track': 'cta-assessment' } });

describe('page view', () => {
  test('is emitted once when the collector starts, from the clean path and the coarse environment', () => {
    const { collector, events } = rig({ pathname: '/weight-loss', width: 390, referrer: 'https://www.google.com/search?q=private+question' });
    collector.start();
    expect(events).toEqual([
      {
        event_type: 'page_view',
        page_path: '/weight-loss',
        page_template: 'program',
        viewport_class: 'mobile',
        referrer_class: 'search',
      },
    ]);
  });

  test('an internal referrer carries only the previous page template', () => {
    const { collector, events } = rig({ referrer: 'https://wellpeps.com/wellness-learning-center/some-article?utm=x' });
    collector.start();
    expect(events[0]).toMatchObject({ referrer_class: 'internal', from_template: 'learning_center_article' });
    expect(JSON.stringify(events)).not.toMatch(/some-article|utm|google/);
  });

  test('starting twice does not report the view twice or stack listeners', () => {
    const { collector, events, page } = rig();
    collector.start();
    const listeners = page.listenerCount();
    collector.start();
    expect(events).toHaveLength(1);
    expect(page.listenerCount()).toBe(listeners);
  });

  test('"section" detail keeps a health-topic article out of the reported path', () => {
    const { collector, events } = rig({ pathname: '/wellness-learning-center/what-is-a-glp-1' }, 'section');
    collector.start();
    expect(events[0]).toMatchObject({ page_path: '/wellness-learning-center', page_template: 'learning_center_article' });
  });

  test('an address-bar path with personal text is reported as unmatched', () => {
    const { collector, events } = rig({ pathname: '/jane.doe@gmail.com' });
    collector.start();
    expect(events[0]).toMatchObject({ page_path: '/_unmatched' });
  });
});

describe('clicks', () => {
  test('an allow-listed data-track click is reported with the page and nothing about the link', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.click(cta);
    expect(events[1]).toEqual({
      event_type: 'click',
      page_path: '/weight-loss',
      page_template: 'program',
      viewport_class: 'desktop',
      click_target: 'cta-assessment',
    });
    expect(JSON.stringify(events)).not.toMatch(/checkout|SECRET|example\.org/);
  });

  test('a click on something untracked reports nothing', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.click(fakeElement({ tag: 'p' }));
    page.click(null);
    expect(events).toHaveLength(1);
  });

  test('listens in the capture phase so a handler that stops the event cannot hide a click', () => {
    const { page, collector } = rig();
    const seen: boolean[] = [];
    const original = page.env.listen;
    page.env.listen = (target, type, handler, capture) => {
      if (type === 'click') seen.push(capture === true);
      return original(target, type, handler, capture);
    };
    collector.start();
    expect(seen).toEqual([true]);
  });

  test('a page cannot flood the endpoint with clicks', () => {
    const { collector, events, page } = rig();
    collector.start();
    for (let i = 0; i < MAX_CLICKS_PER_PAGE + 10; i += 1) page.click(cta);
    expect(events.filter((e) => e.event_type === 'click')).toHaveLength(MAX_CLICKS_PER_PAGE);
  });
});

describe('scroll depth and leaving', () => {
  test('reports the deepest point reached, in a coarse bucket, when the page is hidden', () => {
    const { collector, events, page } = rig({ pageHeight: 4000, viewportHeight: 1000 });
    collector.start(); // sees 25%
    page.scrollTo(1500); // bottom at 2500 of 4000: 62.5%
    page.scrollTo(200); // scrolling back up does not lower the maximum
    page.hide();
    const leave = events.find((e) => e.event_type === 'page_leave');
    expect(leave).toMatchObject({ event_type: 'page_leave', max_scroll: 50 });
  });

  test('reaching the bottom is 100', () => {
    const { collector, events, page } = rig({ pageHeight: 3000, viewportHeight: 1000 });
    collector.start();
    page.scrollTo(2000);
    page.hide();
    expect(events.at(-1)).toMatchObject({ max_scroll: 100 });
  });

  test('time is the visible time in a coarse bucket; hidden time does not count', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.advance(20_000);
    page.hide();
    expect(events.at(-1)).toMatchObject({ event_type: 'page_leave', time_bucket: '10-30s' });
  });

  test('time spent in a hidden tab before the leave is not added', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.advance(5_000);
    page.hide();
    page.advance(600_000);
    expect(events.filter((e) => e.event_type === 'page_leave')).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ time_bucket: '0-10s' });
  });

  test('pagehide also produces the leave, and the queue is flushed before the page goes', () => {
    const { collector, events, page, flush } = rig();
    collector.start();
    page.advance(70_000);
    page.fire('window', 'pagehide');
    expect(events.at(-1)).toMatchObject({ event_type: 'page_leave', time_bucket: '1-3m' });
    expect(flush).toHaveBeenCalledTimes(1);
  });

  test('one leave per time the page is hidden, even when both the visibility change and pagehide fire for it', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.hide();
    page.fire('window', 'pagehide');
    expect(events.filter((e) => e.event_type === 'page_leave')).toHaveLength(1);
  });

  test('a visitor who switches tabs and comes back is counted again: clicks work and the next hide sends a new leave, with no new page view', () => {
    const { collector, events, page } = rig({ pageHeight: 4000, viewportHeight: 1000 });
    collector.start();
    page.hide();
    page.advance(300_000); // away for five minutes
    page.show();
    page.advance(15_000);
    page.click(cta);
    page.hide();
    expect(events.map((e) => e.event_type)).toEqual(['page_view', 'page_leave', 'click', 'page_leave']);
    // The second stretch measures only itself: 15 s visible, not the five minutes away.
    expect(events.at(-1)).toMatchObject({ event_type: 'page_leave', time_bucket: '10-30s' });
  });

  test('a new stretch starts from where the page is scrolled to, not from zero and not from the old maximum', () => {
    const { collector, events, page } = rig({ pageHeight: 4000, viewportHeight: 1000 });
    collector.start();
    page.scrollTo(3000); // bottom edge at 4000 of 4000: 100
    page.hide();
    expect(events.at(-1)).toMatchObject({ max_scroll: 100 });
    page.state.scrollTop = 0; // restored at the top
    page.show();
    page.hide();
    expect(events.at(-1)).toMatchObject({ event_type: 'page_leave', max_scroll: 25 });
  });

  test('a page restored from the back/forward cache (pageshow) starts a new stretch too', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.fire('window', 'pagehide');
    page.advance(60_000);
    page.fire('window', 'pageshow', { persisted: true });
    page.advance(12_000);
    page.click(cta);
    page.fire('window', 'pagehide');
    expect(events.map((e) => e.event_type)).toEqual(['page_view', 'page_leave', 'click', 'page_leave']);
    expect(events.at(-1)).toMatchObject({ time_bucket: '10-30s' });
  });

  test('resuming twice (visibilitychange and pageshow both fire) does not restart the clock or double count', () => {
    const { collector, events, page } = rig();
    collector.start();
    page.hide();
    page.advance(5_000);
    page.show();
    page.advance(8_000);
    page.fire('window', 'pageshow', { persisted: true });
    page.advance(8_000);
    page.hide();
    expect(events.at(-1)).toMatchObject({ time_bucket: '10-30s' }); // 16 s visible in one stretch
    expect(events.filter((e) => e.event_type === 'page_leave')).toHaveLength(2);
  });

  test('a page that starts hidden (a background tab) does not start the clock until it is shown', () => {
    const { collector, events, page } = rig({ visibility: 'hidden' });
    collector.start();
    page.advance(100_000);
    page.show();
    page.advance(5_000);
    page.hide();
    expect(events.at(-1)).toMatchObject({ time_bucket: '0-10s' });
  });

  test('a page shorter than the window counts as fully seen', () => {
    const { collector, events, page } = rig({ pageHeight: 600, viewportHeight: 800 });
    collector.start();
    page.hide();
    expect(events.at(-1)).toMatchObject({ max_scroll: 100 });
  });

  test('scroll events are sampled, so rapid scrolling does not hammer the page height', () => {
    const { collector, page } = rig();
    const scroll = vi.spyOn(page.env, 'scroll');
    collector.start();
    const afterStart = scroll.mock.calls.length;
    for (let i = 0; i < 50; i += 1) page.fire('window', 'scroll'); // same millisecond
    expect(scroll.mock.calls.length - afterStart).toBeLessThanOrEqual(1);
  });
});

describe('stop', () => {
  test('removes every listener, emits nothing, and later events are ignored', () => {
    const { collector, events, page } = rig();
    collector.start();
    expect(page.listenerCount()).toBeGreaterThan(0);
    const before = events.length;
    collector.stop();
    expect(page.listenerCount()).toBe(0);
    expect(collector.running()).toBe(false);
    page.click(cta);
    page.scrollTo(2000);
    page.hide();
    page.fire('window', 'pagehide');
    expect(events).toHaveLength(before);
  });

  test('can be started again (consent given again) and then reports a fresh view', () => {
    const { collector, events } = rig();
    collector.start();
    collector.stop();
    collector.start();
    expect(events.filter((e) => e.event_type === 'page_view')).toHaveLength(2);
  });

  test('starting again resets the click allowance, the scroll depth and the clock', () => {
    const { collector, events, page } = rig({ pageHeight: 4000, viewportHeight: 1000 });
    collector.start();
    for (let i = 0; i < MAX_CLICKS_PER_PAGE + 5; i += 1) page.click(cta);
    page.scrollTo(3000);
    page.advance(200_000);
    page.hide(); // leave: 100, 3m+
    collector.stop();

    page.state.scrollTop = 0;
    page.show();
    collector.start();
    const before = events.length;
    page.click(cta); // the click allowance is fresh
    page.advance(5_000);
    page.hide();
    expect(events.slice(before).map((e) => e.event_type)).toEqual(['click', 'page_leave']);
    expect(events.at(-1)).toMatchObject({ max_scroll: 25, time_bucket: '0-10s' });
  });

  test('if subscribing fails part-way, every listener already added is removed and the error is raised', () => {
    const page = fakePage();
    let calls = 0;
    const original = page.env.listen;
    page.env.listen = (target, type, handler, capture) => {
      calls += 1;
      if (calls === 3) throw new Error('listener refused');
      return original(target, type, handler, capture);
    };
    const events: AnalyticsEvent[] = [];
    const collector = createCollector({ env: page.env, emit: (e) => events.push(e), flush: () => {} });
    expect(() => collector.start()).toThrow('listener refused');
    expect(page.listenerCount()).toBe(0);
    expect(collector.running()).toBe(false);
    expect(events).toEqual([]);
    page.click(cta);
    page.hide();
    expect(events).toEqual([]);
  });

  test('creating a collector reads nothing from the page; only start() does', () => {
    const page = fakePage();
    const reads = vi.fn();
    const spy = new Proxy(page.env, { get: (t, p) => (reads(String(p)), (t as unknown as Record<string, unknown>)[p as string]) });
    const collector = createCollector({ env: spy, emit: () => {}, flush: () => {} });
    expect(reads).not.toHaveBeenCalled();
    collector.start();
    expect(reads).toHaveBeenCalled();
  });
});
