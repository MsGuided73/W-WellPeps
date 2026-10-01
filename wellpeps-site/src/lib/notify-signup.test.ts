import { describe, expect, test } from 'vitest';
import { NO_TOPIC_SOURCES, SOURCES, parseSignup } from '../../../supabase/functions/notify-signup/validate';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const now = new Date('2026-10-01T12:00:00Z');
const strict = { requireConsent: true, now };

describe('parseSignup (the updated notify-signup function)', () => {
  test('a health-topic signup with consent is accepted and records what was ticked', () => {
    const r = parseSignup({ email: ' Person@Example.com ', source: 'ebook_glp1', consent_collect: true, consent_marketing: true, consent_text_version: 'chd-form-v0.1-draft' }, strict);
    expect(r).toEqual({
      ok: true,
      row: { email: 'person@example.com', source: 'ebook_glp1', consent_collect: true, consent_marketing: true, consent_text_version: 'chd-form-v0.1-draft', consented_at: now.toISOString() },
    });
  });

  test('the optional consent is false unless it was given, and meaningless without the required one', () => {
    const only = parseSignup({ email: 'a@b.co', source: 'waitlist', consent_collect: true }, strict);
    expect(only.ok && only.row.consent_marketing).toBe(false);
    const wrong = parseSignup({ email: 'a@b.co', source: 'waitlist', consent_marketing: true }, { requireConsent: false, now });
    expect(wrong.ok && wrong.row.consent_marketing).toBeUndefined();
  });

  test('a health-topic signup without the required consent is refused', () => {
    for (const source of SOURCES.filter((s) => !NO_TOPIC_SOURCES.includes(s))) {
      expect(parseSignup({ email: 'a@b.co', source }, strict)).toEqual({ ok: false, error: 'consent_required' });
      expect(parseSignup({ email: 'a@b.co', source, consent_collect: false }, strict)).toEqual({ ok: false, error: 'consent_required' });
      expect(parseSignup({ email: 'a@b.co', source, consent_collect: 'yes' }, strict)).toEqual({ ok: false, error: 'consent_required' });
    }
  });

  test('the footer newsletter names no topic, so it needs no consent box', () => {
    expect(parseSignup({ email: 'a@b.co', source: 'footer_newsletter' }, strict)).toEqual({ ok: true, row: { email: 'a@b.co', source: 'footer_newsletter' } });
  });

  test('during a rollout the requirement can be switched off', () => {
    expect(parseSignup({ email: 'a@b.co', source: 'waitlist' }, { requireConsent: false, now }).ok).toBe(true);
  });

  test('bad input is rejected with the same errors the live function gives', () => {
    expect(parseSignup({ email: 'nope', source: 'waitlist', consent_collect: true }, strict)).toEqual({ ok: false, error: 'invalid_email' });
    expect(parseSignup({ email: 'a@b.co', source: 'made_up', consent_collect: true }, strict)).toEqual({ ok: false, error: 'invalid_source' });
    expect(parseSignup(null, strict)).toEqual({ ok: false, error: 'invalid_email' });
    expect(parseSignup({ email: `${'x'.repeat(250)}@b.co`, source: 'waitlist', consent_collect: true }, strict)).toEqual({ ok: false, error: 'invalid_email' });
  });

  test('a first name is kept (trimmed, capped) only when given', () => {
    const named = parseSignup({ email: 'a@b.co', source: 'waitlist', first_name: `  ${'N'.repeat(300)} `, consent_collect: true }, strict);
    expect(named.ok && named.row.first_name).toHaveLength(100);
    const none = parseSignup({ email: 'a@b.co', source: 'waitlist', first_name: '  ', consent_collect: true }, strict);
    expect(none.ok && 'first_name' in none.row).toBe(false);
  });

  test('an over-long wording version is capped, and a missing one is recorded as unknown', () => {
    const long = parseSignup({ email: 'a@b.co', source: 'waitlist', consent_collect: true, consent_text_version: 'v'.repeat(200) }, strict);
    expect(long.ok && long.row.consent_text_version).toHaveLength(60);
    const missing = parseSignup({ email: 'a@b.co', source: 'waitlist', consent_collect: true }, strict);
    expect(missing.ok && missing.row.consent_text_version).toBe('unknown');
  });
});

describe('the function and the site agree', () => {
  const root = resolve(__dirname, '../../..');

  test('the function accepts exactly the sources the site can send', () => {
    const site = readFileSync(resolve(root, 'wellpeps-site/src/lib/notify.ts'), 'utf8');
    const union = [...site.slice(site.indexOf('export type SignupSource'), site.indexOf('export const NOTIFY_ENDPOINT')).matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
    expect([...union].sort()).toEqual([...SOURCES].sort());
  });

  test('the migration adds the four columns the function writes', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/20261001000000_notify_signups_consent.sql'), 'utf8');
    const added = [...sql.matchAll(/add column if not exists\s+(\w+)/gi)].map((m) => m[1]);
    // Exactly these four: consent evidence only, nothing that identifies a browser (no IP, no user agent).
    expect(added.sort()).toEqual(['consent_collect', 'consent_marketing', 'consent_text_version', 'consented_at']);
  });
});
