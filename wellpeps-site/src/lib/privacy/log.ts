/**
 * Consent event log — what the browser sends when a visitor makes, changes or
 * withdraws a choice, so WellPeps can later show what notice a visitor saw and
 * what they chose (Consumer Rights Request Procedure and Consent Log
 * Specification, Part B).
 *
 * The browser sends only: a random consent id, the choice, the notice version
 * and a coarse page CLASS ("health" or "other"). Never the page path, so a
 * visitor id is never tied to a health-topic page. No email address, no query
 * string, no IP address (the server decides what, if anything, to keep from
 * the request).
 */
import { BANNER_VERSION, isSensitivePath, type ConsentState } from './consent';

/**
 * Every action the browser can log. The consent-log function validates against its
 * own copy of this list (supabase/functions/_shared/consent-event.ts);
 * src/lib/edge/consent-event.test.ts fails if the two ever differ.
 */
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

export type PageClass = 'health' | 'other';

export interface ConsentLogEvent {
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
  /** Coarse browser family only (see browserFamily). */
  user_agent: BrowserFamily;
}

export interface LogContext {
  now: number;
  uuid: () => string;
  path: string;
  userAgent: string;
}

export const BROWSER_FAMILIES = ['Chrome', 'Edge', 'Firefox', 'Safari', 'Other'] as const;
export type BrowserFamily = (typeof BROWSER_FAMILIES)[number];

/** A coarse browser family. The full user-agent string is not kept (counsel decision pending). */
export function browserFamily(ua: string): BrowserFamily {
  if (!ua) return 'Other';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
  return 'Other';
}

export function buildLogEvent(state: ConsentState, action: ConsentLogAction, ctx: LogContext): ConsentLogEvent {
  return {
    event_id: ctx.uuid(),
    consent_id: state.cid,
    occurred_at: new Date(ctx.now).toISOString(),
    action,
    analytics: state.analytics,
    analytics_sensitive: state.analyticsSensitive,
    advertising: state.advertising,
    gpc_detected: state.gpc,
    notice_version: state.v,
    banner_version: BANNER_VERSION,
    page_class: isSensitivePath(ctx.path) ? 'health' : 'other',
    user_agent: browserFamily(ctx.userAgent),
  };
}

export interface SinkOptions {
  /** Master switch. Off until the consent-log endpoint is deployed. */
  enabled: boolean;
  endpoint: string;
  sendBeacon?: (url: string, data: Blob) => boolean;
  fetchImpl?: (url: string, init: RequestInit) => Promise<unknown>;
  /** Local listener (the dev inspector). Called whether or not the network is on. */
  onEvent?: (event: ConsentLogEvent) => void;
}

/**
 * Returns a function that sends one event. Never throws: a logging failure must
 * not break the page or change what the visitor chose. The body is sent as
 * text/plain so the browser does not need a CORS pre-flight; the endpoint
 * parses it as JSON.
 */
export function createSink(opts: SinkOptions): (event: ConsentLogEvent) => void {
  return (event) => {
    try {
      opts.onEvent?.(event);
    } catch {
      /* a listener must never break logging */
    }
    if (!opts.enabled || !opts.endpoint) return;
    const body = JSON.stringify(event);
    let sent = false;
    try {
      if (opts.sendBeacon) {
        sent = opts.sendBeacon(opts.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      }
    } catch {
      sent = false;
    }
    if (sent) return;
    const f = opts.fetchImpl ?? (typeof fetch === 'function' ? (fetch as SinkOptions['fetchImpl']) : undefined);
    if (!f) return;
    try {
      void Promise.resolve(
        f(opts.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body,
          keepalive: true,
        }),
      ).catch(() => {});
    } catch {
      /* ignore */
    }
  };
}
