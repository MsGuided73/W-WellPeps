/**
 * analytics-event — receives batches of anonymous page-view, click and page-leave
 * events from wellpeps-site/src/lib/analytics and stores them in
 * public.analytics_events.
 *
 * WRITTEN, NOT DEPLOYED. The site sends nothing until ANALYTICS_ENDPOINT is set
 * and ANALYTICS_ENABLED is true in wellpeps-site/src/lib/privacy/config.ts. See
 * supabase/README.md and wellpeps-site/src/lib/analytics/README.md.
 *
 * Every event stands alone. Stores only coarse, sanitized fields (page path with no
 * query, page template, viewport class, referrer class, click label, scroll and
 * time buckets) and the hour it arrived. Does NOT store: IP address, user agent,
 * any visitor/session identifier, referrer URL, element text, form values.
 */
import 'jsr:@supabase/functions-js@2/edge-runtime.d.ts';
import { parseAnalyticsBody, type AnalyticsRow } from '../_shared/analytics-event.ts';
import { createHandler } from '../_shared/handler.ts';
import { parseAllowedOrigins } from '../_shared/http.ts';
import { createRateLimiter, createSourceKeyer } from '../_shared/rate-limit.ts';
import { errorCode, serviceClient } from '../_shared/supabase-client.ts';

/**
 * Per source, per isolate (best effort). Generous because offices and mobile
 * carriers put many visitors behind one address; dropping some analytics is harmless.
 */
const LIMIT_PER_WINDOW = 300;
const WINDOW_MS = 10 * 60 * 1000;

const client = serviceClient();

const handler = createHandler<AnalyticsRow[]>({
  name: 'analytics-event',
  allowedOrigins: parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')),
  limiter: createRateLimiter({ limit: LIMIT_PER_WINDOW, windowMs: WINDOW_MS }),
  sourceKey: createSourceKeyer(),
  parse: parseAnalyticsBody,
  store: async (rows) => {
    if (!client) return { ok: false, code: 'NOCLIENT' };
    const { error } = await client.from('analytics_events').insert(rows);
    return error ? { ok: false, code: errorCode(error) } : { ok: true };
  },
});

Deno.serve(handler);
