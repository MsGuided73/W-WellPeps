/**
 * privacy-request — receives the privacy request form (wellpeps-site/src/lib/privacy/request.ts)
 * and records it in public.privacy_requests, the log of record.
 *
 * WRITTEN, NOT DEPLOYED. The form uses its email fallback until
 * PRIVACY_REQUEST_ENDPOINT in wellpeps-site/src/lib/privacy/config.ts points here.
 * See supabase/README.md.
 *
 * Sends NOTHING by email. Staff must watch the table (or turn on the optional
 * webhook, off unless PRIVACY_REQUEST_NOTIFY_WEBHOOK_URL is set) and acknowledge
 * each request by ack_due_at. A filled honeypot is accepted silently and not stored.
 */
import 'jsr:@supabase/functions-js@2/edge-runtime.d.ts';
import { createHandler, defaultLog } from '../_shared/handler.ts';
import { parseAllowedOrigins } from '../_shared/http.ts';
import { parseRequestBody, type PrivacyRequest } from '../_shared/privacy-request.ts';
import { createPrivacyRequestRepo, type PrivacyRequestsClient } from '../_shared/privacy-request-repo.ts';
import { createWebhookNotifier, DEFAULT_HOURLY_CAP, storePrivacyRequest } from '../_shared/privacy-request-store.ts';
import { createRateLimiter, createSourceKeyer } from '../_shared/rate-limit.ts';
import { serviceClient } from '../_shared/supabase-client.ts';

/** Per source, per isolate (best effort). Real people send one request, maybe two. */
const LIMIT_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000;

declare const EdgeRuntime: { waitUntil(job: Promise<unknown>): void } | undefined;

// The real client has far richer types than the slice the repo uses; the repo's own tests cover that slice.
const repo = createPrivacyRequestRepo(serviceClient() as unknown as PrivacyRequestsClient | null);
const hourlyCap = Number(Deno.env.get('PRIVACY_REQUEST_HOURLY_CAP')) || DEFAULT_HOURLY_CAP;
const notify = createWebhookNotifier(Deno.env.get('PRIVACY_REQUEST_NOTIFY_WEBHOOK_URL'));
const defer = typeof EdgeRuntime !== 'undefined' ? (job: Promise<unknown>) => EdgeRuntime.waitUntil(job) : undefined;

const handler = createHandler<PrivacyRequest>({
  name: 'privacy-request',
  allowedOrigins: parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')),
  limiter: createRateLimiter({ limit: LIMIT_PER_WINDOW, windowMs: WINDOW_MS }),
  sourceKey: createSourceKeyer(),
  parse: parseRequestBody,
  store: (request, nowMs) => storePrivacyRequest({ repo, hourlyCap, notify, defer, log: defaultLog }, request, nowMs),
});

Deno.serve(handler);
