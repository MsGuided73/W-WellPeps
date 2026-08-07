/**
 * Marketing signup submission — runs in the browser.
 *
 * The site is a static build with no server of its own, so signups go to the
 * `notify-signup` Supabase Edge Function, which holds the service-role key and
 * is the only thing that can write `notify_signups`. No Supabase key is shipped
 * to the browser; the endpoint below is a public URL, not a credential.
 *
 * Shared by the three forms that previously collected an address and discarded
 * it: the Hair Restoration notify band, the waitlist section, and the footer
 * newsletter.
 */

/** Which form a signup came from. Must match the table's source CHECK. */
export type SignupSource = 'hair_notify' | 'waitlist' | 'footer_newsletter';

export const NOTIFY_ENDPOINT =
  'https://kwgwbupqzpusydzflyvi.supabase.co/functions/v1/notify-signup';

export interface SignupPayload {
  email: string;
  source: SignupSource;
  firstName?: string;
  /** Honeypot value. Non-empty means a bot filled a field humans cannot see. */
  company?: string;
}

export interface SignupResult {
  ok: boolean;
  /** Present when ok is false. Suitable for showing to a visitor. */
  message?: string;
}

const GENERIC_FAILURE =
  'Something went wrong on our end. Please try again in a moment.';

/**
 * POST a signup. Never throws — callers get a result object either way, so a
 * network blip surfaces as a visible message rather than an unhandled rejection
 * that leaves the form looking hung.
 */
export async function submitSignup(payload: SignupPayload): Promise<SignupResult> {
  try {
    const res = await fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        source: payload.source,
        first_name: payload.firstName ?? null,
        company: payload.company ?? '',
      }),
    });

    if (res.ok) return { ok: true };

    // The endpoint only rejects a submission for a reason the visitor can act
    // on (a malformed address); everything else is ours to own, not theirs.
    const body = await res.json().catch(() => null);
    if (body?.error === 'invalid_email') {
      return { ok: false, message: 'Please enter a valid email address.' };
    }
    return { ok: false, message: GENERIC_FAILURE };
  } catch {
    return {
      ok: false,
      message: 'We couldn’t reach our servers. Please check your connection and try again.',
    };
  }
}
