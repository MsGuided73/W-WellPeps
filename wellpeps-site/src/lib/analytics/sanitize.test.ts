import { describe, expect, test } from 'vitest';
import { CLICK_TARGETS, UNMATCHED_PATH } from './model';
import {
  classifyReferrer,
  clickTarget,
  pageTemplateOf,
  sanitizePage,
  scrollBucket,
  scrollPercent,
  timeBucket,
  viewportClass,
  type ElementLike,
} from './sanitize';
import { fakeElement as el, type FakeNode as Node_ } from './test-support';

describe('pageTemplateOf', () => {
  test.each([
    ['/', 'home'],
    ['/weight-loss', 'program'],
    ['/hair-restoration', 'program'],
    ['/sexual-wellness', 'program'],
    ['/healthy-aging', 'program'],
    ['/hormone-optimization', 'program'],
    ['/mental-wellness', 'program'],
    ['/peptides', 'program'],
    ['/weight-loss/anything', 'program'],
    ['/wellness-learning-center', 'learning_center_index'],
    ['/wellness-learning-center/what-is-a-glp-1', 'learning_center_article'],
    ['/smart-patient-guides', 'learning_center_index'],
    ['/smart-patient-guides/glp-1-weight-loss', 'learning_center_article'],
    ['/smart-patient-guides/glp-1-weight-loss/thank-you', 'learning_center_article'],
    ['/privacy-policy', 'legal'],
    ['/terms-of-use', 'legal'],
    ['/notice-of-privacy-practices', 'legal'],
    ['/accessibility', 'legal'],
    ['/your-privacy-choices', 'privacy_choices'],
    ['/your-plan', 'plan'],
    ['/why-wellpeps', 'about'],
    ['/something-new', 'other'],
    ['/weight-lossy', 'other'],
  ])('%s -> %s', (path, template) => {
    expect(pageTemplateOf(path)).toBe(template);
  });
});

describe('sanitizePage', () => {
  test('strips the query string and the hash, the way the consent code does', () => {
    expect(sanitizePage('/weight-loss?utm_source=ad&email=a@b.com#pricing')).toEqual({ path: '/weight-loss', template: 'program' });
  });

  test('uses the existing normalizePath: case, trailing slash, double slashes, index.html', () => {
    expect(sanitizePage('/Weight-Loss/').path).toBe('/weight-loss');
    expect(sanitizePage('//weight-loss//').path).toBe('/weight-loss');
    expect(sanitizePage('/why-wellpeps/index.html').path).toBe('/why-wellpeps');
    expect(sanitizePage('/privacy-policy.html').path).toBe('/privacy-policy');
  });

  test('a page that is not a known page of this site is reported as unmatched, so typed text is never sent', () => {
    for (const path of ['/something-new', '/jane-doe-diabetes', '/search', '/dev-mockups/footer', '/preview-access']) {
      expect(sanitizePage(path), path).toEqual({ path: UNMATCHED_PATH, template: 'other' });
    }
  });

  test('keeps an article slug, which is public content and not personal', () => {
    expect(sanitizePage('/wellness-learning-center/what-is-a-glp-1')).toEqual({
      path: '/wellness-learning-center/what-is-a-glp-1',
      template: 'learning_center_article',
    });
  });

  test.each([
    ['an email address in the path', '/weight-loss/jane.doe@gmail.com'],
    ['a dot in a segment', '/weight-loss/report.pdf'],
    ['a long number (a phone number or id)', '/weight-loss/4155551234'],
    ['a phone number split by hyphens', '/wellness-learning-center/call-415-555-1234'],
    ['a date of birth', '/wellness-learning-center/dob-1990-01-15'],
    ['an id split across segments', '/wellness-learning-center/123/45/6789'],
    ['more than four segments', '/weight-loss/a/b/c/d'],
    ['a space', '/weight-loss/hello world'],
    ['non-ASCII text', '/weight-loss/héllo'],
    ['an encoded path that decodes to something odd', '/weight-loss/%40admin'],
  ])('replaces %s with the unmatched marker so typed text is never sent', (_n, path) => {
    expect(sanitizePage(path).path).toBe(UNMATCHED_PATH);
  });

  test('a path that cannot be decoded is unmatched and "other"', () => {
    expect(sanitizePage('/%E0%A4%A')).toEqual({ path: UNMATCHED_PATH, template: 'other' });
  });

  test('a path over the length limit is unmatched', () => {
    expect(sanitizePage(`/${'a'.repeat(130)}`).path).toBe(UNMATCHED_PATH);
  });

  test('an unclean path under a program still reports the right template', () => {
    expect(sanitizePage('/weight-loss/jane.doe@gmail.com')).toEqual({ path: UNMATCHED_PATH, template: 'program' });
  });

  test('"section" detail reports a health-topic page by its section only; other pages are unchanged', () => {
    expect(sanitizePage('/wellness-learning-center/what-is-a-glp-1', 'section').path).toBe('/wellness-learning-center');
    expect(sanitizePage('/weight-loss/anything', 'section').path).toBe('/weight-loss');
    expect(sanitizePage('/your-plan', 'section').path).toBe('/your-plan');
    expect(sanitizePage('/wellness-learning-center/what-is-a-glp-1', 'full').path).toBe('/wellness-learning-center/what-is-a-glp-1');
  });
});

describe('classifyReferrer', () => {
  const OWN = 'wellpeps.com';

  test('no referrer is direct', () => {
    expect(classifyReferrer('', OWN)).toEqual({ referrerClass: 'direct' });
  });

  test.each([
    ['https://www.google.com/search?q=semaglutide+side+effects', 'search'],
    ['https://www.google.co.uk/', 'search'],
    ['https://duckduckgo.com/?q=glp-1', 'search'],
    ['https://www.bing.com/search?q=x', 'search'],
    ['https://search.brave.com/search?q=x', 'search'],
    ['https://l.facebook.com/l.php?u=x', 'social'],
    ['https://www.instagram.com/', 'social'],
    ['https://t.co/abc', 'social'],
    ['https://www.youtube.com/watch?v=x', 'social'],
    ['https://www.reddit.com/r/x', 'social'],
    ['https://news.example.org/story', 'other'],
    ['https://google.evil.com/', 'other'],
    ['https://mail.google.com/mail/u/0/', 'other'],
    ['https://docs.google.com/document/d/x', 'other'],
    ['https://news.google.com/', 'other'],
    ['https://uk.search.yahoo.com/search?p=x', 'search'],
    ['https://www.google.co.uk/', 'search'],
    ['android-app://com.google.android.googlequicksearchbox/https/www.google.com', 'search'],
    ['android-app://com.example.app/', 'other'],
    ['ftp://wellpeps.com/x', 'other'],
    ['javascript:alert(1)', 'other'],
    ['not a url', 'other'],
  ])('%s -> %s', (url, cls) => {
    expect(classifyReferrer(url, OWN).referrerClass).toBe(cls);
  });

  test('the search query and every part of an outside URL are discarded', () => {
    const info = classifyReferrer('https://www.google.com/search?q=semaglutide+side+effects', OWN);
    expect(JSON.stringify(info)).not.toMatch(/semaglutide|google|search\?q/);
    expect(info.fromTemplate).toBeUndefined();
  });

  test('a page on this site is internal and reports only the TEMPLATE of the previous page', () => {
    expect(classifyReferrer('https://wellpeps.com/weight-loss?x=1', OWN)).toEqual({ referrerClass: 'internal', fromTemplate: 'program' });
    expect(classifyReferrer('https://www.wellpeps.com/wellness-learning-center/some-article', OWN)).toEqual({
      referrerClass: 'internal',
      fromTemplate: 'learning_center_article',
    });
    expect(classifyReferrer('https://wellpeps.com/', OWN)).toEqual({ referrerClass: 'internal', fromTemplate: 'home' });
  });

  test('the own host is compared without www and without case', () => {
    expect(classifyReferrer('https://WWW.WellPeps.com/your-plan', 'WellPeps.com').referrerClass).toBe('internal');
  });
});

describe('clickTarget', () => {
  test('reports an allow-listed data-track value, found on the element or its nearest tagged ancestor', () => {
    const button = el({ tag: 'button', attrs: { 'data-track': 'cta-assessment' } });
    expect(clickTarget(button)).toBe('cta-assessment');
    const wrapper: Node_ = { tag: 'a', attrs: { href: '/x', 'data-track': 'product-card' } };
    const inner = el({ tag: 'span', parent: wrapper });
    expect(clickTarget(inner)).toBe('product-card');
  });

  test.each(CLICK_TARGETS)('every allow-listed target (%s) is reported', (target) => {
    expect(clickTarget(el({ tag: 'button', attrs: { 'data-track': target } }))).toBe(target);
  });

  test('a data-track value that is not on the allow-list is ignored, not reported and not downgraded to a coarse role', () => {
    const footer: Node_ = { tag: 'footer', attrs: { class: 'footer' } };
    const link = el({ tag: 'a', attrs: { href: '/x', 'data-track': 'my-new-button' }, parent: footer });
    expect(clickTarget(link)).toBeNull();
    expect(clickTarget(el({ tag: 'button', attrs: { 'data-track': 'Start My Free Assessment' } }))).toBeNull();
    expect(clickTarget(el({ tag: 'button', attrs: { 'data-track': 'a@b.com' } }))).toBeNull();
  });

  test('an untagged link or button in the site footer or the site header is a coarse role', () => {
    const footer: Node_ = { tag: 'footer', attrs: { class: 'footer' } };
    expect(clickTarget(el({ tag: 'a', attrs: { href: '/privacy-policy' }, parent: footer }))).toBe('footer');
    const header: Node_ = { tag: 'header', attrs: { class: 'nav', 'data-nav': '' } };
    expect(clickTarget(el({ tag: 'a', attrs: { href: '/weight-loss' }, parent: header }))).toBe('nav');
    expect(clickTarget(el({ tag: 'button', parent: { tag: 'nav', parent: header } }))).toBe('nav');
    expect(clickTarget(el({ tag: 'div', attrs: { role: 'button' }, parent: header }))).toBe('nav');
  });

  test('other headers, footers and navs (an article contents list, the chat widget header) are not site chrome', () => {
    for (const parent of [
      { tag: 'nav', attrs: { class: 'toc' } },
      { tag: 'header', attrs: { class: 'wa__head' } },
      { tag: 'header', attrs: { class: 'legal__head' } },
      { tag: 'footer', attrs: { class: 'card__foot' } },
      { tag: 'div', attrs: { role: 'navigation' } },
    ] as Node_[]) {
      expect(clickTarget(el({ tag: 'a', attrs: { href: '/x' }, parent })), JSON.stringify(parent)).toBeNull();
    }
  });

  test('a click on plain text in the footer, or an untagged link elsewhere, reports nothing', () => {
    expect(clickTarget(el({ tag: 'p', parent: { tag: 'footer', attrs: { class: 'footer' } } }))).toBeNull();
    expect(clickTarget(el({ tag: 'a', attrs: { href: '/x' }, parent: { tag: 'main' } }))).toBeNull();
    expect(clickTarget(el({ tag: 'input' }))).toBeNull();
  });

  test('only closest() and getAttribute("data-track") are ever used: text, id, class and href are never read', () => {
    const accessed = new Set<string>();
    const attrs: string[] = [];
    const base = {
      closest: (sel: string) => (sel === '[data-track]' ? spy : null),
      getAttribute: (name: string) => (attrs.push(name), name === 'data-track' ? 'cta-assessment' : 'SECRET TEXT'),
    };
    const spy: ElementLike = new Proxy(base, {
      get(target, prop) {
        accessed.add(String(prop));
        return (target as Record<string, unknown>)[prop as string];
      },
    });
    expect(clickTarget(spy)).toBe('cta-assessment');
    expect([...accessed].sort()).toEqual(['closest', 'getAttribute']);
    expect(attrs).toEqual(['data-track']);
  });

  test('a missing target or a non-element is ignored', () => {
    expect(clickTarget(null)).toBeNull();
    expect(clickTarget(undefined)).toBeNull();
    expect(clickTarget({} as ElementLike)).toBeNull();
  });
});

describe('scroll, time and viewport buckets', () => {
  test.each([
    [0, 0],
    [24.9, 0],
    [25, 25],
    [49.9, 25],
    [50, 50],
    [74.9, 50],
    [75, 75],
    [97.9, 75],
    [98, 100],
    [100, 100],
    [NaN, 0],
    [Infinity, 0],
  ])('scrollBucket(%s) = %s', (pct, bucket) => {
    expect(scrollBucket(pct)).toBe(bucket);
  });

  test('scrollPercent is the share of the page whose bottom the window has reached', () => {
    expect(scrollPercent({ top: 0, viewport: 500, total: 2000 })).toBe(25);
    expect(scrollPercent({ top: 1500, viewport: 500, total: 2000 })).toBe(100);
    expect(scrollPercent({ top: 5000, viewport: 500, total: 2000 })).toBe(100);
    expect(scrollPercent({ top: 0, viewport: 500, total: 0 })).toBe(0);
    expect(scrollPercent({ top: NaN, viewport: 500, total: 2000 })).toBe(0);
  });

  test.each([
    [0, '0-10s'],
    [9_999, '0-10s'],
    [10_000, '10-30s'],
    [29_999, '10-30s'],
    [30_000, '30-60s'],
    [59_999, '30-60s'],
    [60_000, '1-3m'],
    [179_999, '1-3m'],
    [180_000, '3m+'],
    [86_400_000, '3m+'],
    [NaN, '0-10s'],
    [-5, '0-10s'],
  ])('timeBucket(%s) = %s', (ms, bucket) => {
    expect(timeBucket(ms)).toBe(bucket);
  });

  test.each([
    [320, 'mobile'],
    [767, 'mobile'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [2560, 'desktop'],
    [NaN, 'desktop'],
  ])('viewportClass(%s) = %s', (w, cls) => {
    expect(viewportClass(w)).toBe(cls);
  });
});
