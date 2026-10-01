/**
 * Privacy request form — the rights a visitor can use besides the switches:
 * opt out, limit sensitive information, withdraw consent, unsubscribe, access,
 * correct, delete, copy, appeal.
 *
 * Pure validation, deadlines and submission. The form UI is request-ui.ts; the
 * server side is supabase/functions/privacy-request (written, not yet deployed).
 * Do not ask for or accept health details in this form (Your Privacy Choices,
 * section 2).
 */

export type RequestKind = 'optout' | 'answer' | 'appeal';

export const REQUEST_TYPES = [
  { id: 'opt_out', kind: 'optout', label: 'Opt out of sale, sharing and targeted advertising' },
  { id: 'limit_sensitive', kind: 'optout', label: 'Limit the use of my sensitive information' },
  { id: 'withdraw_consent', kind: 'optout', label: 'Withdraw a consent I gave' },
  { id: 'unsubscribe_email', kind: 'optout', label: 'Unsubscribe from marketing email' },
  { id: 'access', kind: 'answer', label: 'See the information you hold about me' },
  { id: 'correct', kind: 'answer', label: 'Correct my information' },
  { id: 'delete', kind: 'answer', label: 'Delete my information' },
  { id: 'copy', kind: 'answer', label: 'Get a portable copy of my information' },
  { id: 'appeal', kind: 'appeal', label: 'Appeal a decision you made' },
] as const satisfies readonly { id: string; kind: RequestKind; label: string }[];

export type RequestTypeId = (typeof REQUEST_TYPES)[number]['id'];

/** Working defaults. Counsel confirms each period by state (docs: Your Privacy Choices, section 2). */
export const DEADLINES = {
  acknowledgeBusinessDays: 10,
  optOutBusinessDays: 15,
  answerCalendarDays: 45,
  extensionCalendarDays: 45,
} as const;

export const MAX_DETAILS = 2000;
export const MAX_NAME = 200;
/** The longest valid email address (RFC 5321). */
export const MAX_EMAIL = 254;
export const DEFAULT_TIMEOUT_MS = 15000;

export interface AuthorizedAgent {
  name: string;
  email: string;
  proofConfirmed: boolean;
}

export interface PrivacyRequestInput {
  fullName: string;
  email: string;
  /** Two-letter state code, optional. */
  state?: string;
  types: string[];
  details?: string;
  agent?: AuthorizedAgent | null;
  /** Hidden field. A person leaves it empty; a bot fills it. */
  honeypot?: string;
}

export type Validation =
  | { ok: true; value: PrivacyRequestInput }
  | { ok: false; errors: Record<string, string>; spam?: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KNOWN = new Set<string>(REQUEST_TYPES.map((t) => t.id));

export function validateRequest(input: PrivacyRequestInput): Validation {
  if ((input.honeypot ?? '').trim() !== '') return { ok: false, errors: {}, spam: true };

  const errors: Record<string, string> = {};
  const fullName = (input.fullName ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const state = (input.state ?? '').trim();
  const details = input.details ?? '';

  if (!fullName) errors.fullName = 'Please enter your full name.';
  else if (fullName.length > MAX_NAME) errors.fullName = `Please keep your name under ${MAX_NAME} characters.`;
  if (!EMAIL.test(email) || email.length > MAX_EMAIL) errors.email = 'Please enter the email address you use with WellPeps.';
  if (!input.types || input.types.length === 0) errors.types = 'Please choose at least one request.';
  else if (input.types.some((t) => !KNOWN.has(t))) errors.types = 'One of the choices is not recognized.';
  if (state && !/^[A-Za-z]{2}$/.test(state)) errors.state = 'Use the two-letter state code, for example CA.';
  if (details.length > MAX_DETAILS) errors.details = `Please keep this under ${MAX_DETAILS} characters.`;

  let agent: AuthorizedAgent | null = null;
  if (input.agent) {
    const a = input.agent;
    const agentName = a.name.trim();
    const agentEmail = a.email.trim().toLowerCase();
    if (
      !agentName ||
      agentName.length > MAX_NAME ||
      !EMAIL.test(agentEmail) ||
      agentEmail.length > MAX_EMAIL ||
      !a.proofConfirmed
    ) {
      errors.agent = 'An authorized agent must give a name, an email address and confirm they have your signed permission.';
    } else {
      agent = { name: agentName, email: agentEmail, proofConfirmed: true };
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      fullName,
      email,
      state: state ? state.toUpperCase() : '',
      types: [...input.types],
      details,
      agent,
      honeypot: '',
    },
  };
}

/** Add business days (Monday to Friday) in UTC. Public holidays are not skipped: counsel decides. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return d;
}

const addDays = (from: Date, n: number) => new Date(from.getTime() + n * 24 * 60 * 60 * 1000);

export interface DueDates {
  acknowledgeBy: Date;
  /** Opt-out, limit, withdraw and unsubscribe requests: act by this date. */
  actBy: Date | null;
  /** Access, correct, delete, copy and appeal: answer by this date. */
  answerBy: Date | null;
  /** The latest date if the one-time extension is used (and the person is told why). */
  maxExtendedBy: Date | null;
}

export function computeDueDates(received: Date, types: readonly string[]): DueDates {
  const kinds = new Set(REQUEST_TYPES.filter((t) => types.includes(t.id)).map((t) => t.kind));
  const hasAnswer = kinds.has('answer') || kinds.has('appeal');
  const answerBy = hasAnswer ? addDays(received, DEADLINES.answerCalendarDays) : null;
  return {
    acknowledgeBy: addBusinessDays(received, DEADLINES.acknowledgeBusinessDays),
    actBy: kinds.has('optout') ? addBusinessDays(received, DEADLINES.optOutBusinessDays) : null,
    answerBy,
    maxExtendedBy: answerBy ? addDays(answerBy, DEADLINES.extensionCalendarDays) : null,
  };
}

export function buildMailto(to: string, input: PrivacyRequestInput): string {
  const labels = REQUEST_TYPES.filter((t) => input.types.includes(t.id)).map((t) => t.label);
  const subject = `Privacy request: ${labels.join('; ') || 'general'}`;
  const lines = [
    'Privacy request',
    '',
    `Name: ${input.fullName}`,
    `Email I use with WellPeps: ${input.email}`,
    input.state ? `State: ${input.state}` : '',
    `What I am asking for: ${labels.join('; ')}`,
    input.details ? `Details: ${input.details}` : '',
    input.agent ? `I am an authorized agent: ${input.agent.name} (${input.agent.email})` : '',
    '',
    'Please do not put health details in this message.',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export interface SubmitResult {
  ok: boolean;
  requestNo?: string;
  message?: string;
  /** True when the visitor should be offered the email fallback instead. */
  fallback?: boolean;
  errors?: Record<string, string>;
}

export interface SubmitOptions {
  /** Empty until the privacy-request function is deployed. */
  endpoint: string;
  fetchImpl?: (url: string, init: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
  /** Give up on the request after this long and offer the email fallback. */
  timeoutMs?: number;
}

const FALLBACK_BROWSER = 'We could not send this from your browser. You can send it by email.';

export async function submitRequest(input: PrivacyRequestInput, opts: SubmitOptions): Promise<SubmitResult> {
  const v = validateRequest(input);
  if (!v.ok) {
    // A filled hidden field is nearly always a bot. A person whose browser autofilled it is
    // not told they are spam: nothing is sent and they are offered the email route.
    return v.spam
      ? { ok: false, fallback: true, message: FALLBACK_BROWSER }
      : { ok: false, errors: v.errors, message: 'Please fix the highlighted items and try again.' };
  }
  if (!opts.endpoint) {
    return { ok: false, fallback: true, message: 'Our online form is not connected yet. You can send the same request by email.' };
  }
  const f = opts.fetchImpl ?? (typeof fetch === 'function' ? (fetch as unknown as SubmitOptions['fetchImpl']) : undefined);
  if (!f) return { ok: false, fallback: true, message: FALLBACK_BROWSER };

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS) : null;
  try {
    const res = await f(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v.value, submitted_at: new Date().toISOString() }),
      signal: controller?.signal,
    });
    if (!res.ok) return { ok: false, fallback: true, message: 'We could not record your request just now. You can send it by email.' };
    const data = (await res.json().catch(() => null)) as { request_no?: string } | null;
    return { ok: true, requestNo: data?.request_no };
  } catch {
    return { ok: false, fallback: true, message: 'We could not reach our servers. You can send your request by email.' };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
