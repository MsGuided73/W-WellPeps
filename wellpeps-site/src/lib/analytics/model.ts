/**
 * Anonymous analytics: the event model.
 *
 * WHAT THIS TOOL IS. A first-party, opt-in counter. It shows which pages visitors
 * view, which labelled buttons and links they click, and how far down a page they
 * get before they leave. It sets no cookie, uses no localStorage, sessionStorage
 * or IndexedDB, creates no identifier (not even a random one), and never records
 * a URL query string, a form value, or any text from the page. The analytics-event
 * function does not store the IP address or user agent of the request. (Any web
 * request reveals those to the server that receives it, and the hosting provider's
 * own logs may keep them for their retention period; that is outside this code.)
 *
 * SESSION-LESS BY DESIGN. Every event stands alone. Nothing in the data ties a
 * click to the page view before it, or one page view to the next. That is what
 * keeps the tool anonymous, and it decides what the numbers can and cannot tell
 * you. (Honest limit: a database administrator can read Postgres's internal row
 * metadata, which shows approximate arrival order, and the events of one page view
 * arrive in one request. See supabase/migrations/..._analytics_events.sql.)
 *
 * WHAT ONE VISIT LOOKS LIKE. A page_view when the tool starts on a page; a click
 * for each tagged click; and a page_leave each time the page is hidden or closed.
 * A visitor who switches tabs and comes back gets a further page_leave later, so
 * page_leave counts are "stretches of viewing that ended", slightly more than page
 * views; each carries only that stretch's deepest scroll and visible time.
 *
 * CAN be answered, from counts of single events:
 *  - Page popularity: page views per path and per page template.
 *  - Where visitors come from: page views by referrer class (internal, search,
 *    social, direct, other). The referrer URL itself is discarded in the browser.
 *  - Click-through per page template: clicks on a `data-track` label divided by
 *    page views of that template, for example "cta-assessment clicks per 100 views
 *    of a program page".
 *  - Scroll depth: of the viewing stretches that ended, what share had seen 25, 50,
 *    75 or 100 percent of the page (the largest bucket reached). It is measured by
 *    the BOTTOM edge of the window, so the first screen already counts: on most
 *    pages nearly every stretch reaches 25, and a page shorter than the window is
 *    100. Read the 75 and 100 buckets for engagement.
 *  - Time on page: the spread of visible time in coarse buckets.
 *  - Device mix: mobile, tablet or desktop viewport.
 *  - Drop-off by page template, as an ESTIMATE: a page view with an internal
 *    referrer carries the TEMPLATE of the previous page (never its URL). For a
 *    template T, page views of T minus page views whose previous page was T
 *    approximates how many visits ended on T. Entry pages are the page views whose
 *    referrer class is not internal.
 *
 * CANNOT be answered (and no workaround should be added that would):
 *  - How many different people there were. Two page views might be one person or
 *    two, so these are page views, not "visitors" or "users".
 *  - A funnel for one person (viewed A, then clicked B, then converted). A click
 *    is never joined to a view.
 *  - Returning visitors, new versus returning, retention, cohorts.
 *  - Exact drop-off. The estimate above is thrown off by the back button, reloads,
 *    new tabs, a browser that hides the referrer, and visitors who consented
 *    part-way through a visit.
 *  - Conversions that happen after the visitor leaves for GEN Health. You can
 *    count clicks on the assessment button, not what happens next.
 *  - Anything about visitors who declined analytics, or whose browser blocks the
 *    request. Counts are a sample of those who agreed, not all traffic.
 *
 * The browser and the analytics-event function each hold a copy of this contract.
 * contract.test.ts fails if they disagree. Change both together, and run the
 * migration for any new column.
 */

export const ANALYTICS_SCHEMA_VERSION = 1;
/** Most events sent in one request. The function refuses more. */
export const MAX_EVENTS_PER_BATCH = 20;

export const EVENT_TYPES = ['page_view', 'click', 'page_leave'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PAGE_TEMPLATES = [
  'home',
  'program',
  'learning_center_index',
  'learning_center_article',
  'legal',
  'privacy_choices',
  'plan',
  'about',
  'other',
] as const;
export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

export const VIEWPORT_CLASSES = ['mobile', 'tablet', 'desktop'] as const;
export type ViewportClass = (typeof VIEWPORT_CLASSES)[number];

export const REFERRER_CLASSES = ['internal', 'search', 'social', 'direct', 'other'] as const;
export type ReferrerClass = (typeof REFERRER_CLASSES)[number];

export const SCROLL_BUCKETS = [0, 25, 50, 75, 100] as const;
export type ScrollBucket = (typeof SCROLL_BUCKETS)[number];

export const TIME_BUCKETS = ['0-10s', '10-30s', '30-60s', '1-3m', '3m+'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

/** A page path with no query or hash: lower-case letters, digits, hyphen, underscore; at most four segments. */
export const PAGE_PATH_PATTERN = /^\/$|^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+){0,3}$/;
export const MAX_PAGE_PATH = 120;
/**
 * Sent instead of a path that is not a known page of this site (see KNOWN routes in
 * sanitize.ts) or is not a clean page path. Text typed into the address bar can
 * therefore never be reported, even if a catch-all route is added later.
 */
export const UNMATCHED_PATH = '/_unmatched';

/** What a `data-track` value must look like for the server to accept it. */
export const CLICK_TARGET_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * Six or more digits, even when broken up by single hyphens, underscores or slashes
 * (415-555-1234, 1990-01-15, 123/45/6789), look like a phone number, date of birth
 * or id; neither a path nor a label may hold one.
 */
export const LOOKS_LIKE_AN_ID = /(?:\d[-_/]?){6,}/;

/**
 * The ONLY `data-track` values the browser will report. Anything else on a page is
 * ignored, so a typo or an unreviewed label can never leak. To measure a new
 * button: add its label here, add `data-track="label"` to the markup, and say so in
 * the Cookie notice if the meaning of the tool changes. 'nav' and 'footer' are also
 * what an untagged link or button inside the site header (the element marked
 * `data-nav`) or the site footer (`footer.footer`) is reported as.
 */
export const CLICK_TARGETS = [
  'cta-assessment',
  'cta-ebook',
  'cta-waitlist',
  'cta-newsletter',
  'product-card',
  'program-card',
  'article-card',
  'assistant',
  'privacy-choices',
  'footer-legal',
  'nav',
  'footer',
] as const;
export type ClickTarget = (typeof CLICK_TARGETS)[number];

export interface PageViewEvent {
  event_type: 'page_view';
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  referrer_class: ReferrerClass;
  /** Template of the previous page on this site; present only when referrer_class is "internal". */
  from_template?: PageTemplate;
}

export interface ClickEvent {
  event_type: 'click';
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  click_target: ClickTarget;
}

export interface PageLeaveEvent {
  event_type: 'page_leave';
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  max_scroll: ScrollBucket;
  time_bucket: TimeBucket;
}

export type AnalyticsEvent = PageViewEvent | ClickEvent | PageLeaveEvent;

export interface AnalyticsBatch {
  v: typeof ANALYTICS_SCHEMA_VERSION;
  events: AnalyticsEvent[];
}
