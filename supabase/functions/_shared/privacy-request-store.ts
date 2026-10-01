/**
 * What the privacy-request function does with a validated request: work out the
 * legal deadlines, apply an hourly circuit breaker, insert the row and (only if
 * the owner has turned it on) tell a webhook that a request arrived.
 *
 * The database is reached through the small `PrivacyRequestRepo` interface so the
 * logic here is testable without Supabase; index.ts supplies the real one.
 *
 * Nothing is e-mailed from here. The `privacy_requests` table is the log of
 * record: someone has to watch it (or the optional webhook) and acknowledge each
 * request by `ack_due_at`.
 */
import type { StoreOutcome } from './handler.ts';
import { computeDeadlines, type PrivacyRequest } from './privacy-request.ts';

export interface PrivacyRequestRow {
  received_at: string;
  full_name: string;
  email: string;
  state: string | null;
  request_types: string[];
  details: string | null;
  agent_name: string | null;
  agent_email: string | null;
  agent_proof_confirmed: boolean;
  ack_due_at: string;
  act_by_due_at: string | null;
  due_at: string;
  retain_until: string;
}

export type InsertResult =
  | { ok: true; requestNo: string }
  /** The generated request number collided with an existing one (astronomically rare); safe to retry. */
  | { ok: false; conflict: true }
  | { ok: false; conflict?: false; code?: string };

export interface PrivacyRequestRepo {
  /** Number of requests received at or after `sinceIso`. */
  countSince(sinceIso: string): Promise<{ ok: true; count: number } | { ok: false; code?: string }>;
  insert(row: PrivacyRequestRow): Promise<InsertResult>;
}

/** Called with non-personal facts only: no name, no email, no details. */
export interface RequestNotice {
  request_no: string;
  received_at: string;
  due_at: string;
  ack_due_at: string;
  types: string[];
}

export interface StoreDeps {
  repo: PrivacyRequestRepo;
  /** Requests accepted per rolling hour, across all visitors. Above this the function answers "try later". */
  hourlyCap: number;
  /** Optional. Absent unless PRIVACY_REQUEST_NOTIFY_WEBHOOK_URL is set. Must never throw into the request. */
  notify?: (notice: RequestNotice) => Promise<void>;
  /**
   * Optional. Hands the notification to the runtime to finish after the response
   * has been sent (EdgeRuntime.waitUntil), so a slow webhook never delays the
   * visitor. Without it the notification is awaited, bounded by its own timeout.
   */
  defer?: (job: Promise<unknown>) => void;
  /** Receives fixed strings only. Lets a dead webhook show up in the function logs. */
  log?: (line: string) => void;
}

export const DEFAULT_HOURLY_CAP = 60;
const MAX_INSERT_ATTEMPTS = 3;
const HOUR_MS = 60 * 60 * 1000;

export function buildRequestRow(req: PrivacyRequest, received: Date): PrivacyRequestRow {
  const d = computeDeadlines(received, req.types);
  return {
    received_at: received.toISOString(),
    full_name: req.fullName,
    email: req.email,
    state: req.state || null,
    request_types: req.types,
    details: req.details || null,
    agent_name: req.agent?.name ?? null,
    agent_email: req.agent?.email ?? null,
    agent_proof_confirmed: req.agent !== null,
    ack_due_at: d.ackDueAt.toISOString(),
    act_by_due_at: d.actByDueAt ? d.actByDueAt.toISOString() : null,
    due_at: d.dueAt.toISOString(),
    retain_until: d.retainUntil.toISOString(),
  };
}

export async function storePrivacyRequest(deps: StoreDeps, req: PrivacyRequest, nowMs: number): Promise<StoreOutcome> {
  const since = new Date(nowMs - HOUR_MS).toISOString();
  const recent = await deps.repo.countSince(since);
  if (!recent.ok) return { ok: false, code: recent.code };
  // The breaker protects the record from a flood of fake requests (each one starts a legal clock).
  // A visitor turned away is offered the email route by the form.
  if (recent.count >= deps.hourlyCap) return { ok: false, busy: true };

  const row = buildRequestRow(req, new Date(nowMs));
  let inserted: InsertResult = { ok: false };
  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
    inserted = await deps.repo.insert(row);
    if (inserted.ok || !inserted.conflict) break;
  }
  if (!inserted.ok) return { ok: false, code: inserted.conflict ? undefined : inserted.code };

  if (deps.notify) {
    // A failed notification never fails the request (the row is the record), but it is logged
    // with a fixed line so a mistyped or dead webhook does not go unnoticed.
    const job = deps
      .notify({
        request_no: inserted.requestNo,
        received_at: row.received_at,
        due_at: row.due_at,
        ack_due_at: row.ack_due_at,
        types: row.request_types,
      })
      .catch(() => deps.log?.('[privacy-request] notify failed'));
    if (deps.defer) deps.defer(job);
    else await job;
  }
  return { ok: true, response: { request_no: inserted.requestNo } };
}

/**
 * Optional webhook notifier. Returns undefined (disabled) unless `url` is a
 * well-formed https URL, so an unset or mistyped secret sends nothing. The body
 * carries no personal data. Redirects are refused (the URL is the one the owner
 * set, nothing else), the call is bounded by a timeout, and the response body is
 * cancelled so the connection is released.
 */
export function createWebhookNotifier(
  url: string | null | undefined,
  fetchImpl: (input: string, init: RequestInit) => Promise<unknown> = (u, i) => fetch(u, i),
  timeoutMs = 3000,
): ((notice: RequestNotice) => Promise<void>) | undefined {
  if (!url || !/^https:\/\/[^\s]+$/.test(url)) return undefined;
  return async (notice) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'privacy_request_received', ...notice }),
        redirect: 'error',
        signal: controller.signal,
      });
      await (res as { body?: { cancel?: () => Promise<void> } } | null)?.body?.cancel?.();
    } finally {
      clearTimeout(timer);
    }
  };
}
