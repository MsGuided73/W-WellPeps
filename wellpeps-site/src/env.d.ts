/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Supabase project URL. Read at build time only. */
  readonly SUPABASE_URL: string;
  /** Publishable (anon) key. Read-only access, gated by RLS. */
  readonly SUPABASE_PUBLISHABLE_KEY: string;
  /** "landing" turns on the guide-funnel flow; unset or "dialog" keeps the email dialogs. Read at build time. */
  readonly PUBLIC_GUIDE_FLOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
