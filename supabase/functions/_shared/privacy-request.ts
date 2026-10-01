/**
 * Schema and deadlines for the privacy request form (wellpeps-site/src/lib/privacy/request.ts).
 *
 * This is the SERVER's copy of the rules in request.ts (the site cannot import
 * this folder; its Docker build context is wellpeps-site/ only).
 * wellpeps-site/src/lib/edge/privacy-request.test.ts runs a corpus of inputs
 * through both validators and both deadline calculators and fails if they
 * disagree, and checks the request types and limits match.
 *
 * Wire format: exactly what `submitRequest` in request.ts sends (camelCase
 * fields from PrivacyRequestInput, plus `submitted_at`). The honeypot may arrive
 * as `honeypot` (what the client sends) or `homepage_url` (the form field name,
 * which a bot posting the form directly would fill).
 */
import type { ParseOutcome } from './handler.ts';
import {
  type Check,
  fail,
  hasOnlyKeys,
  isRecord,
  pass,
  readString,
} from './validate.ts';

export const REQUEST_TYPES = [
  { id: 'opt_out', kind: 'optout' },
  { id: 'limit_sensitive', kind: 'optout' },
  { id: 'withdraw_consent', kind: 'optout' },
  { id: 'unsubscribe_email', kind: 'optout' },
  { id: 'access', kind: 'answer' },
  { id: 'correct', kind: 'answer' },
  { id: 'delete', kind: 'answer' },
  { id: 'copy', kind: 'answer' },
  { id: 'appeal', kind: 'appeal' },
] as const;
export type RequestTypeId = (typeof REQUEST_TYPES)[number]['id'];
const KNOWN_TYPES: readonly string[] = REQUEST_TYPES.map((t) => t.id);

/** Working defaults, same as DEADLINES in request.ts. Counsel confirms each period by state. */
export const DEADLINES = {
  acknowledgeBusinessDays: 10,
  optOutBusinessDays: 15,
  answerCalendarDays: 45,
} as const;

/** California requires request records to be kept for 24 months. */
export const REQUEST_RETENTION_MONTHS = 24;

export const MAX_NAME = 200;
export const MAX_EMAIL = 254;
export const MAX_DETAILS = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface PrivacyRequestAgent {
  name: string;
  email: string;
}

export interface PrivacyRequest {
  fullName: string;
  email: string;
  /** Two-letter code, upper case, or empty. */
  state: string;
  types: RequestTypeId[];
  details: string;
  agent: PrivacyRequestAgent | null;
}

export type ParsedRequest = { kind: 'spam' } | { kind: 'request'; value: PrivacyRequest };

const KEYS = ['fullName', 'email', 'state', 'types', 'details', 'agent', 'honeypot', 'homepage_url', 'submitted_at'] as const;
const AGENT_KEYS = ['name', 'email', 'proofConfirmed'] as const;
const MAX_TYPE_ENTRIES = 20;

/**
 * A name or email that starts with = + - or @ is run as a formula when staff open
 * an export in a spreadsheet. No real name or address starts that way, so the
 * function refuses it (the visitor is offered the email fallback). The browser
 * form does not check this; the function is the stricter of the two on purpose.
 */
const STARTS_LIKE_FORMULA = /^[=+\-@]/;

function isFilled(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

function readEmail(obj: Record<string, unknown>, key: string): Check<string> {
  const raw = readString(obj, key, { min: 1, max: MAX_EMAIL + 64 });
  if (!raw.ok) return raw;
  const email = raw.value.trim().toLowerCase();
  if (email.length > MAX_EMAIL || !EMAIL.test(email) || STARTS_LIKE_FORMULA.test(email)) {
    return fail(`${key}: not an email address`);
  }
  return pass(email);
}

function readTrimmedName(obj: Record<string, unknown>, key: string): Check<string> {
  const raw = readString(obj, key, { min: 1, max: MAX_NAME * 2 });
  if (!raw.ok) return raw;
  const name = raw.value.trim();
  if (name === '' || name.length > MAX_NAME) return fail(`${key}: bad length`);
  if (STARTS_LIKE_FORMULA.test(name)) return fail(`${key}: starts like a spreadsheet formula`);
  return pass(name);
}

function readState(raw: Record<string, unknown>): Check<string> {
  if (raw.state === undefined) return pass('');
  const s = readString(raw, 'state', { max: 8 });
  if (!s.ok) return s;
  const trimmed = s.value.trim();
  if (trimmed && !/^[A-Za-z]{2}$/.test(trimmed)) return fail('state: not a two-letter code');
  return pass(trimmed.toUpperCase());
}

function readTypes(raw: Record<string, unknown>): Check<RequestTypeId[]> {
  const list = raw.types;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_TYPE_ENTRIES) return fail('types: bad list');
  const types: RequestTypeId[] = [];
  for (const t of list) {
    if (typeof t !== 'string' || !KNOWN_TYPES.includes(t)) return fail('types: unknown type');
    if (!types.includes(t as RequestTypeId)) types.push(t as RequestTypeId);
  }
  return pass(types);
}

function readDetails(raw: Record<string, unknown>): Check<string> {
  if (raw.details === undefined) return pass('');
  return readString(raw, 'details', { max: MAX_DETAILS, multiline: true });
}

function readAgent(raw: Record<string, unknown>): Check<PrivacyRequestAgent | null> {
  const a = raw.agent;
  if (a === undefined || a === null) return pass(null);
  if (!isRecord(a) || !hasOnlyKeys(a, AGENT_KEYS)) return fail('agent: bad shape');
  const name = readTrimmedName(a, 'name');
  if (!name.ok) return fail('agent: bad name');
  const email = readEmail(a, 'email');
  if (!email.ok) return fail('agent: bad email');
  if (a.proofConfirmed !== true) return fail('agent: proof of permission not confirmed');
  return pass({ name: name.value, email: email.value });
}

/** The bookkeeping fields: only known keys, and the three string fields really are strings. */
function checkEnvelope(raw: Record<string, unknown>): Check<true> {
  if (!hasOnlyKeys(raw, KEYS)) return fail('unknown field');
  for (const k of ['honeypot', 'homepage_url', 'submitted_at'] as const) {
    if (k in raw && typeof raw[k] !== 'string') return fail(`${k}: not a string`);
  }
  if (typeof raw.submitted_at === 'string' && raw.submitted_at.length > 40) return fail('submitted_at: too long');
  return pass(true);
}

export function parsePrivacyRequest(raw: unknown): Check<ParsedRequest> {
  if (!isRecord(raw)) return fail('not an object');

  // A filled hidden field is a bot. It is accepted silently and nothing is stored,
  // whatever else the payload looks like.
  if (isFilled(raw.honeypot) || isFilled(raw.homepage_url)) return pass({ kind: 'spam' });

  const envelope = checkEnvelope(raw);
  if (!envelope.ok) return envelope;
  const fullName = readTrimmedName(raw, 'fullName');
  if (!fullName.ok) return fullName;
  const email = readEmail(raw, 'email');
  if (!email.ok) return email;
  const state = readState(raw);
  if (!state.ok) return state;
  const types = readTypes(raw);
  if (!types.ok) return types;
  const details = readDetails(raw);
  if (!details.ok) return details;
  const agent = readAgent(raw);
  if (!agent.ok) return agent;

  return pass({
    kind: 'request',
    value: { fullName: fullName.value, email: email.value, state: state.value, types: types.value, details: details.value, agent: agent.value },
  });
}

// ------------------------------------------------------------------ deadlines

const DAY_MS = 24 * 60 * 60 * 1000;

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

export function addCalendarDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** Add whole months in UTC, clamping to the last day of a shorter month (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export interface RequestDeadlines {
  /** Confirm receipt by this date: received + 10 business days. */
  ackDueAt: Date;
  /** Act on an opt-out style request by this date: received + 15 business days. Null if none of the types is an opt-out. */
  actByDueAt: Date | null;
  /** The legal response deadline: received + 45 calendar days (every request type). */
  dueAt: Date;
  /** Keep the record until this date: received + 24 months. */
  retainUntil: Date;
}

export function computeDeadlines(received: Date, types: readonly string[]): RequestDeadlines {
  const kinds = new Set(REQUEST_TYPES.filter((t) => types.includes(t.id)).map((t) => t.kind));
  return {
    ackDueAt: addBusinessDays(received, DEADLINES.acknowledgeBusinessDays),
    actByDueAt: kinds.has('optout') ? addBusinessDays(received, DEADLINES.optOutBusinessDays) : null,
    dueAt: addCalendarDays(received, DEADLINES.answerCalendarDays),
    retainUntil: addMonthsUtc(received, REQUEST_RETENTION_MONTHS),
  };
}

/** Adapter for the request pipeline (handler.ts): a honeypot hit is accepted silently and never stored. */
export function parseRequestBody(json: unknown): ParseOutcome<PrivacyRequest> {
  const checked = parsePrivacyRequest(json);
  if (!checked.ok) return { kind: 'reject' };
  return checked.value.kind === 'spam' ? { kind: 'silent' } : { kind: 'accept', value: checked.value.value };
}
