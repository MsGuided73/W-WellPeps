/**
 * notify-signup — public endpoint for the marketing site's signup forms.
 *
 * NOT DEPLOYED. This is the next version of the function that is live (version 2): the same
 * guards, plus recording the consent a person gave on a health-topic form. Deploying it is the
 * owner's step (see supabase/README.md and the migration 20261001000000_notify_signups_consent.sql,
 * which must be applied first).
 *
 * The site is a static build served by nginx with no Node runtime, so it has no server of its own
 * to post to. This function is that server. It holds the service-role key, which is why
 * notify_signups keeps RLS on with zero policies: nothing but this function can touch the table.
 *
 * JWT verification is off: this is a public marketing form and visitors have no session. The
 * guards below stand in: origin allowlist, honeypot, strict validation, idempotent upsert.
 *
 * Environment:
 *   ALLOWED_ORIGINS   extra allowed origins, comma separated (for example the client-preview
 *                     domain), added to the built-in list below
 *   REQUIRE_CONSENT   "true" (default) rejects a health-topic signup that carries no consent.
 *                     Set "false" only if this function is deployed before the site version that
 *                     sends consent, then set it back.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { parseSignup } from './validate.ts';

const BUILT_IN_ORIGINS = [
  'https://wellpeps.com',
  'https://www.wellpeps.com',
  'http://localhost:4321',
  'http://localhost:4399',
];
const EXTRA = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = [...BUILT_IN_ORIGINS, ...EXTRA];
const REQUIRE_CONSENT = (Deno.env.get('REQUIRE_CONSENT') ?? 'true').toLowerCase() !== 'false';

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden_origin' }, 403, origin);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400, origin);
  }

  // Honeypot: hidden from humans. Anything filling it is a bot, so return the success shape
  // without writing, and the bot learns nothing.
  const hp = (payload as { company?: unknown } | null)?.company;
  if (typeof hp === 'string' && hp.trim() !== '') return json({ ok: true }, 200, origin);

  const parsed = parseSignup(payload, { requireConsent: REQUIRE_CONSENT, now: new Date() });
  if (!parsed.ok) return json({ error: parsed.error }, 400, origin);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // A repeat signup for the same email and source updates the consent to what they last chose
  // (they may have added or removed the optional follow-up consent); it never erases a first name
  // they gave earlier, because first_name is only in the row when this submission had one.
  const { error } = await db.from('notify_signups').upsert(parsed.row, { onConflict: 'email,source' });

  if (error) {
    if (error.code === '23505') return json({ ok: true }, 200, origin);
    console.error('notify_signups write failed', parsed.row.source, error.code, error.message);
    return json({ error: 'server_error' }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
});
