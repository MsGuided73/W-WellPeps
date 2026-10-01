/**
 * Endpoints and switches for the privacy features.
 *
 * Both server functions are WRITTEN (supabase/functions) but NOT DEPLOYED, so
 * both switches are off. Until then:
 *  - consent choices are saved in the visitor's browser only, and
 *  - the request form offers the email fallback.
 * Turn a switch on only after the matching function is deployed and tested.
 * The project URL below is public (the signup form uses the same host).
 */
const FUNCTIONS = 'https://kwgwbupqzpusydzflyvi.supabase.co/functions/v1';

export const CONSENT_LOG_ENABLED = false;
export const CONSENT_LOG_ENDPOINT = `${FUNCTIONS}/consent-log`;

/** Empty = not deployed. The form falls back to email. */
export const PRIVACY_REQUEST_ENDPOINT = '';

/**
 * True once the site stops loading fonts from Google (BaseLayout.astro). While false,
 * the panel tells visitors that Google receives their IP address. The inventory test
 * fails if this flag and BaseLayout disagree.
 */
export const FONTS_SELF_HOSTED = false;
