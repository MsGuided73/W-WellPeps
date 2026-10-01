/**
 * Schema for the consent event the browser sends (wellpeps-site/src/lib/privacy/log.ts,
 * `ConsentLogEvent`) and what the consent-log function stores.
 *
 * This file is the SERVER's copy of that contract. The site cannot import it
 * (the site's Docker build context is wellpeps-site/ only), so the two are kept
 * in step by wellpeps-site/src/lib/edge/consent-event.test.ts, which drives the
 * real consent gate and fails if any event it produces is refused here, or if
 * the allowed values drift apart.
 *
 * What is deliberately NOT here: no page path, no email, no IP address, no full
 * user-agent string, no query string. The browser never sends them, and a
 * payload that carries any extra field is rejected.
 */
import type { ParseOutcome } from './handler.ts';
import {
  type Check,
  fail,
  hasOnlyKeys,
  ID_PATTERN,
  isRealIsoTimestamp,
  isRecord,
  pass,
  readBoolean,
  readEnum,
  readString,
} from './validate.ts';

export const CONSENT_LOG_ACTIONS = [
  'accept_all',
  'reject_all',
  'custom',
  'withdraw',
  'gpc_auto_optout',
  'gpc_conflict_allow',
  'gpc_conflict_keep_off',
  'reprompt_after_expiry',
  'reprompt_after_version_change',
] as const;
export type ConsentLogAction = (typeof CONSENT_LOG_ACTIONS)[number];

export const PAGE_CLASSES = ['health', 'other'] as const;
export type PageClass = (typeof PAGE_CLASSES)[number];

/** The only values `browserFamily()` in log.ts can produce. */
export const BROWSER_FAMILIES = ['Chrome', 'Edge', 'Firefox', 'Safari', 'Other'] as const;
export type BrowserFamily = (typeof BROWSER_FAMILIES)[number];

/**
 * The consent id the browser's cookie parser accepts (consent.ts `parse`): letters,
 * digits and hyphens, up to 64. Real ids are UUIDs, but a tampered or older cookie
 * must still get its choice logged, so the function accepts exactly what the
 * browser can send. (event_id is made fresh for every event and is always a UUID.)
 */
export const CONSENT_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

/** Notice and banner versions are short labels such as "2026-10-01.1" and "1". */
export const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;

export interface ConsentEvent {
  event_id: string;
  consent_id: string;
  occurred_at: string;
  action: ConsentLogAction;
  analytics: boolean;
  analytics_sensitive: boolean;
  advertising: boolean;
  gpc_detected: boolean;
  notice_version: string;
  banner_version: string;
  page_class: PageClass;
  /** Coarse browser family only. */
  user_agent: BrowserFamily;
}

const KEYS = [
  'event_id',
  'consent_id',
  'occurred_at',
  'action',
  'analytics',
  'analytics_sensitive',
  'advertising',
  'gpc_detected',
  'notice_version',
  'banner_version',
  'page_class',
  'user_agent',
] as const;

/** Combinations the consent rules can never produce are refused as corrupt. Returns the reason, or null. */
function impossibleCombination(action: ConsentLogAction, analytics: boolean, sensitive: boolean, advertising: boolean): string | null {
  if (sensitive && !analytics) return 'health-page analytics without analytics';
  const allOff = !analytics && !sensitive && !advertising;
  if ((action === 'reject_all' || action === 'withdraw') && !allOff) return 'reject/withdraw with a switch on';
  return null;
}

export function validateConsentEvent(raw: unknown): Check<ConsentEvent> {
  if (!isRecord(raw)) return fail('not an object');
  if (!hasOnlyKeys(raw, KEYS)) return fail('unknown field');

  const eventId = readString(raw, 'event_id', { min: 32, max: 36, pattern: ID_PATTERN });
  if (!eventId.ok) return eventId;
  const consentId = readString(raw, 'consent_id', { min: 1, max: 64, pattern: CONSENT_ID_PATTERN });
  if (!consentId.ok) return consentId;
  const occurredAt = readString(raw, 'occurred_at', { min: 24, max: 24 });
  if (!occurredAt.ok) return occurredAt;
  if (!isRealIsoTimestamp(occurredAt.value)) return fail('occurred_at: not a real timestamp');

  const action = readEnum(raw, 'action', CONSENT_LOG_ACTIONS);
  if (!action.ok) return action;
  const analytics = readBoolean(raw, 'analytics');
  if (!analytics.ok) return analytics;
  const analyticsSensitive = readBoolean(raw, 'analytics_sensitive');
  if (!analyticsSensitive.ok) return analyticsSensitive;
  const advertising = readBoolean(raw, 'advertising');
  if (!advertising.ok) return advertising;
  const gpc = readBoolean(raw, 'gpc_detected');
  if (!gpc.ok) return gpc;
  const noticeVersion = readString(raw, 'notice_version', { min: 1, max: 40, pattern: VERSION_PATTERN });
  if (!noticeVersion.ok) return noticeVersion;
  const bannerVersion = readString(raw, 'banner_version', { min: 1, max: 40, pattern: VERSION_PATTERN });
  if (!bannerVersion.ok) return bannerVersion;
  const pageClass = readEnum(raw, 'page_class', PAGE_CLASSES);
  if (!pageClass.ok) return pageClass;
  const browser = readEnum(raw, 'user_agent', BROWSER_FAMILIES);
  if (!browser.ok) return browser;

  const impossible = impossibleCombination(action.value, analytics.value, analyticsSensitive.value, advertising.value);
  if (impossible) return fail(impossible);

  return pass({
    event_id: eventId.value.toLowerCase(),
    consent_id: consentId.value,
    occurred_at: occurredAt.value,
    action: action.value,
    analytics: analytics.value,
    analytics_sensitive: analyticsSensitive.value,
    advertising: advertising.value,
    gpc_detected: gpc.value,
    notice_version: noticeVersion.value,
    banner_version: bannerVersion.value,
    page_class: pageClass.value,
    user_agent: browser.value,
  });
}

/** A client clock this far behind or ahead of the server is not trusted for `occurred_at`. */
const PAST_TOLERANCE_MS = 31 * 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export interface StoredConsentEvent extends Omit<ConsentEvent, 'user_agent'> {
  browser_family: BrowserFamily;
  /** True when the browser's clock was implausible and `occurred_at` is the server time instead. */
  clock_suspect: boolean;
}

/**
 * The row to insert. Evidence of a choice is never discarded because a visitor's
 * clock is wrong: an implausible `occurred_at` is replaced by the server time and
 * flagged, so the event is still recorded.
 */
export function toStoredConsentEvent(event: ConsentEvent, serverNowMs: number): StoredConsentEvent {
  const claimed = Date.parse(event.occurred_at);
  const plausible = claimed >= serverNowMs - PAST_TOLERANCE_MS && claimed <= serverNowMs + FUTURE_TOLERANCE_MS;
  const { user_agent, ...rest } = event;
  return {
    ...rest,
    occurred_at: plausible ? event.occurred_at : new Date(serverNowMs).toISOString(),
    browser_family: user_agent,
    clock_suspect: !plausible,
  };
}

/** Adapter for the request pipeline (handler.ts): a valid event is accepted, anything else is rejected. */
export function parseConsentBody(json: unknown): ParseOutcome<ConsentEvent> {
  const checked = validateConsentEvent(json);
  return checked.ok ? { kind: 'accept', value: checked.value } : { kind: 'reject' };
}
