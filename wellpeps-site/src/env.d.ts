/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Supabase project URL. Read at build time only. */
  readonly SUPABASE_URL: string;
  /** Publishable (anon) key. Read-only access, gated by RLS. */
  readonly SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
