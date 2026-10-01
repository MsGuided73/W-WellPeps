/**
 * consent-log — records the consent event the browser sends when a visitor makes,
 * changes or withdraws a privacy choice (wellpeps-site/src/lib/privacy/log.ts).
 *
 * WRITTEN, NOT DEPLOYED. The site only calls it once CONSENT_LOG_ENABLED is true
 * in wellpeps-site/src/lib/privacy/config.ts. See supabase/README.md.
 *
 * Stores: random consent id, the choice, notice/banner version, coarse page class
 * ("health" or "other") and coarse browser family, plus the server's receive time.
 * Does NOT store: IP address, full user agent, page path, email, query string.
 * Idempotent on event_id: a retried event is ignored, not duplicated.
 */
import 'jsr:@supabase/functions-js@2/edge-runtime.d.ts';
import { parseConsentBody, toStoredConsentEvent, type ConsentEvent } from '../_shared/consent-event.ts';
import { createHandler } from '../_shared/handler.ts';
import { parseAllowedOrigins } from '../_shared/http.ts';
import { createRateLimiter, createSourceKeyer } from '../_shared/rate-limit.ts';
import { errorCode, serviceClient } from '../_shared/supabase-client.ts';

/** Per source, per isolate (best effort: see _shared/rate-limit.ts). A visitor sends a handful of events in a lifetime. */
const LIMIT_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;

const client = serviceClient();

const handler = createHandler<ConsentEvent>({
  name: 'consent-log',
  allowedOrigins: parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')),
  limiter: createRateLimiter({ limit: LIMIT_PER_WINDOW, windowMs: WINDOW_MS }),
  sourceKey: createSourceKeyer(),
  parse: parseConsentBody,
  store: async (event, nowMs) => {
    if (!client) return { ok: false, code: 'NOCLIENT' };
    const { error } = await client
      .from('consent_events')
      .upsert(toStoredConsentEvent(event, nowMs), { onConflict: 'event_id', ignoreDuplicates: true });
    return error ? { ok: false, code: errorCode(error) } : { ok: true };
  },
});

Deno.serve(handler);
