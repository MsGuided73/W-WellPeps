/**
 * Validation for the notify-signup endpoint, kept free of Deno APIs so the site's test suite can
 * run it (wellpeps-site/src/lib/notify-signup.test.ts).
 *
 * A health-topic form (waitlist, hair notify) must carry the person's consent to collect their email
 * and topic: Washington and Nevada require it, separate and unchecked, for an email address tied to a
 * health topic. The function stores what they ticked, which wording version they saw, and when, so
 * WellPeps can show the consent later.
 *
 * A free-guide request (ebook_*) needs no collection consent (counsel agreed 2026-10-16, ATT-038):
 * sending the guide the person asked for is collection necessary to provide a requested product
 * (RCW 19.373.030). Its form sends only the optional follow-up choice and the wording version, which
 * the function stores; consent_collect stays empty on those rows.
 */

// Must match the notify_signups source CHECK constraint and SignupSource in src/lib/notify.ts.
export const SOURCES = [
  'hair_notify',
  'waitlist',
  'footer_newsletter',
  'ebook_glp1',
  'ebook_sexual_wellness',
  'ebook_hair_restoration',
  'ebook_healthy_aging',
  'ebook_nad',
] as const;

/** The footer newsletter names no health topic, so it needs no consent box. */
export const NO_TOPIC_SOURCES: readonly string[] = ['footer_newsletter'];

/** Free-guide requests: delivering the requested guide needs no consent, only the optional follow-up choice is recorded. */
export const REQUESTED_SOURCES: readonly string[] = SOURCES.filter((s) => s.startsWith('ebook_'));

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface SignupRow {
  email: string;
  source: string;
  first_name?: string;
  consent_collect?: boolean;
  consent_marketing?: boolean;
  consent_text_version?: string;
  consented_at?: string;
}

export type ParseResult = { ok: true; row: SignupRow } | { ok: false; error: 'invalid_email' | 'invalid_source' | 'consent_required' };

export interface ParseOptions {
  /** Reject a health-topic signup that carries no consent. Turn off only while the site and function roll out in the wrong order. */
  requireConsent: boolean;
  now: Date;
}

export function parseSignup(payload: unknown, opts: ParseOptions): ParseResult {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
  const source = typeof p.source === 'string' ? p.source : '';
  const rawName = typeof p.first_name === 'string' ? p.first_name.trim() : '';

  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: 'invalid_email' };
  if (!(SOURCES as readonly string[]).includes(source)) return { ok: false, error: 'invalid_source' };

  const row: SignupRow = { email, source };
  if (rawName !== '') row.first_name = rawName.slice(0, 100);

  const collect = p.consent_collect === true;
  const requested = REQUESTED_SOURCES.includes(source);
  if (!collect && !requested && opts.requireConsent && !NO_TOPIC_SOURCES.includes(source)) return { ok: false, error: 'consent_required' };
  const version = typeof p.consent_text_version === 'string' ? p.consent_text_version.slice(0, 60) : 'unknown';

  if (collect) {
    row.consent_collect = true;
    // The optional box counts only together with the required one.
    row.consent_marketing = p.consent_marketing === true;
    row.consent_text_version = version;
    row.consented_at = opts.now.toISOString();
  } else if (requested && typeof p.consent_text_version === 'string') {
    // A free-guide form: no required box, so the optional choice stands on its own.
    row.consent_marketing = p.consent_marketing === true;
    row.consent_text_version = version;
    row.consented_at = opts.now.toISOString();
  }
  return { ok: true, row };
}
