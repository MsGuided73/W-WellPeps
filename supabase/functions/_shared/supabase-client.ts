/**
 * The service-role Supabase client, for the edge functions only (Deno).
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected into every edge
 * function by Supabase; nothing needs to be set by hand. The service-role key
 * bypasses Row Level Security, which is exactly how the functions write to tables
 * that no browser can touch. It is read from the environment and never logged,
 * returned or placed in any file.
 *
 * The library version is pinned to the one the site already uses (wellpeps-site/package.json),
 * because this code runs with the service-role key and a floating version would
 * change what runs on every deploy. Commit the `deno.lock` that `supabase functions deploy`
 * or `deno cache` produces so the exact packages stay fixed too (see supabase/README.md).
 *
 * Not imported by any test: it needs the Deno runtime.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.7';

export type { SupabaseClient };

export function serviceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Postgres error code (for example 23505) when it is safe to log, never the message. */
export function errorCode(error: { code?: unknown } | null): string | undefined {
  return error && typeof error.code === 'string' ? error.code : undefined;
}
