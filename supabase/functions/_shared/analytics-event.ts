/**
 * Schema for the anonymous analytics events (wellpeps-site/src/lib/analytics) and
 * what the analytics-event function stores.
 *
 * Every event stands alone. There is deliberately NO session id, visitor id,
 * device id, timestamp finer than the hour (the database truncates it), IP
 * address, user agent, URL query string, referrer URL, element text or form
 * value, and a payload that carries any extra field is rejected. See
 * wellpeps-site/src/lib/analytics/README.md for what this can and cannot answer.
 *
 * One honest limit: no column orders or links events, but a database administrator
 * can read Postgres's internal row metadata (heap order, ctid, xmin), which shows
 * approximate arrival order, and the events of one page view arrive in one request
 * and one transaction. At very low traffic, adjacent rows may be one visit. Keep
 * track_commit_timestamp off and do not add an ordering column.
 *
 * This is the SERVER's copy of the contract. The site cannot import it (its
 * Docker build context is wellpeps-site/ only), so
 * wellpeps-site/src/lib/analytics/contract.test.ts fails if the browser model
 * and this file ever disagree.
 */
import type { ParseOutcome } from './handler.ts';
import { type Check, fail, hasOnlyKeys, isRecord, pass, readEnum, readNumberEnum, readString } from './validate.ts';

export const ANALYTICS_SCHEMA_VERSION = 1;
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

/**
 * A page path with no query or hash: lower-case letters, digits, hyphen and
 * underscore, up to four segments. Anything else is collapsed to UNMATCHED_PATH
 * by the browser before it is sent.
 */
export const PAGE_PATH_PATTERN = /^\/$|^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+){0,3}$/;
export const MAX_PAGE_PATH = 120;
export const UNMATCHED_PATH = '/_unmatched';

/** A `data-track` value: short, lower-case, no spaces, so it can only be a label and never text. */
export const CLICK_TARGET_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * Six or more digits, even when broken up by single hyphens, underscores or slashes
 * (415-555-1234, 1990-01-15, 123/45/6789), look like a phone number, date of birth
 * or id; neither a path nor a label may hold one.
 */
export const LOOKS_LIKE_AN_ID = /(?:\d[-_/]?){6,}/;

export interface PageViewEvent {
  event_type: 'page_view';
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  referrer_class: ReferrerClass;
  /** Template of the previous page on this site; only when referrer_class is "internal". */
  from_template?: PageTemplate;
}
export interface ClickEvent {
  event_type: 'click';
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  click_target: string;
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

const COMMON = ['event_type', 'page_path', 'page_template', 'viewport_class'] as const;
const KEYS_BY_TYPE: Record<EventType, readonly string[]> = {
  page_view: [...COMMON, 'referrer_class', 'from_template'],
  click: [...COMMON, 'click_target'],
  page_leave: [...COMMON, 'max_scroll', 'time_bucket'],
};

export function validateAnalyticsEvent(raw: unknown): Check<AnalyticsEvent> {
  if (!isRecord(raw)) return fail('event: not an object');
  const type = readEnum(raw, 'event_type', EVENT_TYPES);
  if (!type.ok) return type;
  if (!hasOnlyKeys(raw, KEYS_BY_TYPE[type.value])) return fail('event: unknown field');

  const path = readString(raw, 'page_path', { min: 1, max: MAX_PAGE_PATH, pattern: PAGE_PATH_PATTERN });
  if (!path.ok) return path;
  if (LOOKS_LIKE_AN_ID.test(path.value)) return fail('page_path: looks like an identifier');
  const template = readEnum(raw, 'page_template', PAGE_TEMPLATES);
  if (!template.ok) return template;
  const viewport = readEnum(raw, 'viewport_class', VIEWPORT_CLASSES);
  if (!viewport.ok) return viewport;
  const base = { page_path: path.value, page_template: template.value, viewport_class: viewport.value };

  switch (type.value) {
    case 'page_view': {
      const referrer = readEnum(raw, 'referrer_class', REFERRER_CLASSES);
      if (!referrer.ok) return referrer;
      if (raw.from_template === undefined) return pass({ event_type: 'page_view', ...base, referrer_class: referrer.value });
      if (referrer.value !== 'internal') return fail('from_template without an internal referrer');
      const from = readEnum(raw, 'from_template', PAGE_TEMPLATES);
      if (!from.ok) return from;
      return pass({ event_type: 'page_view', ...base, referrer_class: referrer.value, from_template: from.value });
    }
    case 'click': {
      const target = readString(raw, 'click_target', { min: 1, max: 40, pattern: CLICK_TARGET_PATTERN });
      if (!target.ok) return target;
      if (LOOKS_LIKE_AN_ID.test(target.value)) return fail('click_target: looks like an identifier');
      return pass({ event_type: 'click', ...base, click_target: target.value });
    }
    case 'page_leave': {
      const scroll = readNumberEnum(raw, 'max_scroll', SCROLL_BUCKETS);
      if (!scroll.ok) return scroll;
      const time = readEnum(raw, 'time_bucket', TIME_BUCKETS);
      if (!time.ok) return time;
      return pass({ event_type: 'page_leave', ...base, max_scroll: scroll.value, time_bucket: time.value });
    }
  }
}

export function validateAnalyticsBatch(raw: unknown): Check<AnalyticsBatch> {
  if (!isRecord(raw)) return fail('batch: not an object');
  if (!hasOnlyKeys(raw, ['v', 'events'])) return fail('batch: unknown field');
  if (raw.v !== ANALYTICS_SCHEMA_VERSION) return fail('batch: unsupported version');
  if (!Array.isArray(raw.events) || raw.events.length === 0 || raw.events.length > MAX_EVENTS_PER_BATCH) {
    return fail('batch: bad event list');
  }
  const events: AnalyticsEvent[] = [];
  for (const e of raw.events) {
    const checked = validateAnalyticsEvent(e);
    if (!checked.ok) return checked;
    events.push(checked.value);
  }
  return pass({ v: ANALYTICS_SCHEMA_VERSION, events });
}

/** One database row per event; fields that do not apply to an event type are null. */
export interface AnalyticsRow {
  event_type: EventType;
  page_path: string;
  page_template: PageTemplate;
  viewport_class: ViewportClass;
  referrer_class: ReferrerClass | null;
  from_template: PageTemplate | null;
  click_target: string | null;
  max_scroll: ScrollBucket | null;
  time_bucket: TimeBucket | null;
}

export function toAnalyticsRows(batch: AnalyticsBatch): AnalyticsRow[] {
  return batch.events.map((e) => ({
    event_type: e.event_type,
    page_path: e.page_path,
    page_template: e.page_template,
    viewport_class: e.viewport_class,
    referrer_class: e.event_type === 'page_view' ? e.referrer_class : null,
    from_template: e.event_type === 'page_view' ? (e.from_template ?? null) : null,
    click_target: e.event_type === 'click' ? e.click_target : null,
    max_scroll: e.event_type === 'page_leave' ? e.max_scroll : null,
    time_bucket: e.event_type === 'page_leave' ? e.time_bucket : null,
  }));
}

/** Adapter for the request pipeline (handler.ts): a valid batch becomes the rows to insert. */
export function parseAnalyticsBody(json: unknown): ParseOutcome<AnalyticsRow[]> {
  const checked = validateAnalyticsBatch(json);
  return checked.ok ? { kind: 'accept', value: toAnalyticsRows(checked.value) } : { kind: 'reject' };
}
