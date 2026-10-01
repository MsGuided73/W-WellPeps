import { describe, expect, test, vi } from 'vitest';
import { createHandler } from '../../../../supabase/functions/_shared/handler.ts';
import {
  DEADLINES as SERVER_DEADLINES,
  MAX_DETAILS as SERVER_MAX_DETAILS,
  MAX_EMAIL as SERVER_MAX_EMAIL,
  MAX_NAME as SERVER_MAX_NAME,
  REQUEST_TYPES as SERVER_TYPES,
  addBusinessDays as serverAddBusinessDays,
  addMonthsUtc,
  computeDeadlines,
  parsePrivacyRequest,
  parseRequestBody,
} from '../../../../supabase/functions/_shared/privacy-request.ts';
import {
  buildRequestRow,
  createWebhookNotifier,
  storePrivacyRequest,
  type InsertResult,
  type PrivacyRequestRepo,
  type PrivacyRequestRow,
  type RequestNotice,
} from '../../../../supabase/functions/_shared/privacy-request-store.ts';
import { createPrivacyRequestRepo, type PrivacyRequestsClient } from '../../../../supabase/functions/_shared/privacy-request-repo.ts';
import { createRateLimiter } from '../../../../supabase/functions/_shared/rate-limit.ts';
import {
  DEADLINES,
  MAX_DETAILS,
  MAX_EMAIL,
  MAX_NAME,
  REQUEST_TYPES,
  addBusinessDays,
  computeDueDates,
  submitRequest,
  validateRequest,
  type PrivacyRequestInput,
} from '../privacy/request';

const RECEIVED = new Date('2026-10-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const input = (over: Partial<PrivacyRequestInput> = {}): PrivacyRequestInput => ({
  fullName: 'Pat Example',
  email: 'pat@example.com',
  state: 'CA',
  types: ['opt_out'],
  details: '',
  agent: null,
  honeypot: '',
  ...over,
});

// ---------------------------------------------- the form and the function agree

describe('the form and the privacy-request function agree on the contract', () => {
  test('the request types and their kinds are identical', () => {
    expect(SERVER_TYPES.map((t) => [t.id, t.kind])).toEqual(REQUEST_TYPES.map((t) => [t.id, t.kind]));
  });

  test('the length limits and the deadline periods are identical', () => {
    expect(SERVER_MAX_NAME).toBe(MAX_NAME);
    expect(SERVER_MAX_EMAIL).toBe(MAX_EMAIL);
    expect(SERVER_MAX_DETAILS).toBe(MAX_DETAILS);
    expect(SERVER_DEADLINES.acknowledgeBusinessDays).toBe(DEADLINES.acknowledgeBusinessDays);
    expect(SERVER_DEADLINES.optOutBusinessDays).toBe(DEADLINES.optOutBusinessDays);
    expect(SERVER_DEADLINES.answerCalendarDays).toBe(DEADLINES.answerCalendarDays);
  });

  const accepted: [string, PrivacyRequestInput][] = [
    ['a plain request', input()],
    ['upper-case email with spaces', input({ email: '  Pat@Example.COM ' })],
    ['a lower-case state', input({ state: 'ca' })],
    ['no state', input({ state: '' })],
    ['every request type at once', input({ types: REQUEST_TYPES.map((t) => t.id) })],
    ['details at the limit', input({ details: 'x'.repeat(MAX_DETAILS) })],
    ['details with line breaks', input({ details: 'line one\nline two\r\nline three' })],
    ['an authorized agent', input({ agent: { name: ' Agent A ', email: 'Agent@Example.com', proofConfirmed: true } })],
    ['a name at the limit', input({ fullName: 'n'.repeat(MAX_NAME) })],
  ];

  test.each(accepted)('what the form sends is accepted by the function with the same cleaned values: %s', (_n, raw) => {
    const client = validateRequest(raw);
    expect(client.ok).toBe(true);
    if (!client.ok) return;
    // Exactly what submitRequest puts on the wire.
    const wire = { ...client.value, submitted_at: new Date().toISOString() };
    const server = parsePrivacyRequest(wire);
    expect(server.ok, server.ok ? '' : server.reason).toBe(true);
    if (!server.ok || server.value.kind !== 'request') throw new Error('expected a request');
    const v = server.value.value;
    expect(v.fullName).toBe(client.value.fullName);
    expect(v.email).toBe(client.value.email);
    expect(v.state).toBe(client.value.state);
    expect(v.types).toEqual(client.value.types);
    expect(v.details).toBe(client.value.details);
    expect(v.agent?.name ?? null).toBe(client.value.agent?.name ?? null);
    expect(v.agent?.email ?? null).toBe(client.value.agent?.email ?? null);
  });

  const refused: [string, PrivacyRequestInput][] = [
    ['no name', input({ fullName: '   ' })],
    ['a name over the limit', input({ fullName: 'n'.repeat(MAX_NAME + 1) })],
    ['a bad email', input({ email: 'not-an-email' })],
    ['an email over the limit', input({ email: `${'a'.repeat(250)}@example.com` })],
    ['no request type', input({ types: [] })],
    ['an unknown request type', input({ types: ['launch_missiles'] })],
    ['a long state name', input({ state: 'California' })],
    ['details over the limit', input({ details: 'x'.repeat(MAX_DETAILS + 1) })],
    ['an agent without proof', input({ agent: { name: 'Agent A', email: 'a@example.com', proofConfirmed: false } })],
    ['an agent with no name', input({ agent: { name: '', email: 'a@example.com', proofConfirmed: true } })],
    ['an agent name over the limit', input({ agent: { name: 'x'.repeat(MAX_NAME + 1), email: 'a@example.com', proofConfirmed: true } })],
  ];

  test.each(refused)('what the form refuses is refused by the function too (a bot can skip the form): %s', (_n, raw) => {
    expect(validateRequest(raw).ok).toBe(false);
    expect(parsePrivacyRequest({ ...raw }).ok).toBe(false);
  });

  test('a filled honeypot is spam on both sides', () => {
    expect(validateRequest(input({ honeypot: 'http://spam.example' }))).toMatchObject({ ok: false, spam: true });
    expect(parsePrivacyRequest({ ...input({ honeypot: 'http://spam.example' }) })).toEqual({ ok: true, value: { kind: 'spam' } });
  });

  test('the due dates agree with computeDueDates for every type and a spread of received dates', () => {
    const dates = ['2026-10-01T12:00:00Z', '2026-10-02T23:59:59Z', '2026-10-03T08:00:00Z', '2026-12-31T23:00:00Z', '2027-02-26T09:00:00Z'];
    for (const d of dates) {
      const received = new Date(d);
      for (const combo of [...REQUEST_TYPES.map((t) => [t.id]), ['opt_out', 'delete'], ['unsubscribe_email', 'copy', 'appeal']]) {
        const client = computeDueDates(received, combo);
        const server = computeDeadlines(received, combo);
        expect(server.ackDueAt.toISOString()).toBe(client.acknowledgeBy.toISOString());
        expect(server.actByDueAt?.toISOString() ?? null).toBe(client.actBy?.toISOString() ?? null);
        expect(server.dueAt.toISOString()).toBe(new Date(received.getTime() + 45 * DAY).toISOString());
        if (client.answerBy) expect(server.dueAt.toISOString()).toBe(client.answerBy.toISOString());
      }
    }
  });

  test('business-day arithmetic is the same on both sides', () => {
    for (const d of ['2026-10-02T12:00:00Z', '2026-10-03T12:00:00Z', '2026-10-01T00:00:00Z']) {
      for (const n of [1, 5, 10, 15]) {
        expect(serverAddBusinessDays(new Date(d), n).toISOString()).toBe(addBusinessDays(new Date(d), n).toISOString());
      }
    }
  });

  test('the real submitRequest output goes through the whole request pipeline and a request number comes back', async () => {
    const rows: PrivacyRequestRow[] = [];
    const repo: PrivacyRequestRepo = {
      countSince: async () => ({ ok: true, count: 0 }),
      insert: async (row) => (rows.push(row), { ok: true, requestNo: 'PR-261001-ABCDEF' }),
    };
    const handler = createHandler({
      name: 'privacy-request',
      allowedOrigins: ['https://wellpeps.com'],
      limiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
      sourceKey: async () => 'k',
      parse: parseRequestBody,
      store: (req, now) => storePrivacyRequest({ repo, hourlyCap: 60 }, req, now),
      now: () => RECEIVED.getTime(),
    });
    const fetchImpl = async (url: string, init: RequestInit) => {
      const res = await handler(new Request(url, { ...init, headers: { ...(init.headers as Record<string, string>), Origin: 'https://wellpeps.com' } }));
      return { ok: res.ok, json: () => res.json() as Promise<unknown> };
    };
    const result = await submitRequest(input({ types: ['delete', 'opt_out'], details: 'please' }), {
      endpoint: 'https://project.supabase.co/functions/v1/privacy-request',
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, requestNo: 'PR-261001-ABCDEF' });
    expect(rows).toHaveLength(1);
    expect(rows[0].request_types).toEqual(['delete', 'opt_out']);
    expect(rows[0].due_at).toBe('2026-11-15T12:00:00.000Z');
  });
});

// ------------------------------------------------------------ server validation

describe('parsePrivacyRequest', () => {
  const wire = (over: Record<string, unknown> = {}) => ({ ...input(), submitted_at: '2026-10-01T12:00:00.000Z', ...over });

  test('a honeypot in either field name is spam, whatever else the payload holds', () => {
    expect(parsePrivacyRequest(wire({ honeypot: 'x' }))).toEqual({ ok: true, value: { kind: 'spam' } });
    expect(parsePrivacyRequest({ homepage_url: 'http://spam.example' })).toEqual({ ok: true, value: { kind: 'spam' } });
    expect(parsePrivacyRequest(wire({ homepage_url: ' http://spam.example ', email: 'garbage' }))).toEqual({ ok: true, value: { kind: 'spam' } });
  });

  test('an empty honeypot is not spam', () => {
    expect(parsePrivacyRequest(wire({ homepage_url: '', honeypot: '   ' })).ok).toBe(true);
  });

  test.each([
    ['not an object', 'text'],
    ['an array', [1]],
    ['an unknown field', wire({ ip_address: '203.0.113.9' })],
    ['a missing name', wire({ fullName: undefined })],
    ['a numeric name', wire({ fullName: 5 })],
    ['a numeric email', wire({ email: 5 })],
    ['types as a string', wire({ types: 'opt_out' })],
    ['types with a non-string', wire({ types: ['opt_out', 3] })],
    ['an empty types list', wire({ types: [] })],
    ['far too many types', wire({ types: Array(21).fill('opt_out') })],
    ['a state as a number', wire({ state: 5 })],
    ['details as an object', wire({ details: {} })],
    ['an agent as a string', wire({ agent: 'me' })],
    ['an agent with an unknown field', wire({ agent: { name: 'A', email: 'a@example.com', proofConfirmed: true, phone: '1' } })],
    ['an agent proof of "true"', wire({ agent: { name: 'A', email: 'a@example.com', proofConfirmed: 'true' } })],
    ['a NUL byte in the name', wire({ fullName: 'Pat\u0000Example' })],
    ['a control character in the email', wire({ email: 'pat@exam\u0007ple.com' })],
    ['a control character in the details', wire({ details: 'bad \u0001 text' })],
    ['a C1 control character in the details', wire({ details: 'bad \u0085 text' })],
    ['a line separator in the details', wire({ details: 'a b' })],
    ['a bidirectional override in the name', wire({ fullName: 'Pat ‮evil' })],
    ['a name that starts like a spreadsheet formula (=)', wire({ fullName: '=HYPERLINK("http://x","click")' })],
    ['a name that starts like a spreadsheet formula (+)', wire({ fullName: '+1 555 0100' })],
    ['a name that starts like a spreadsheet formula (-)', wire({ fullName: '-2+3' })],
    ['a name that starts like a spreadsheet formula (@)', wire({ fullName: '@SUM(A1)' })],
    ['an email that starts like a spreadsheet formula', wire({ email: '=cmd@example.com' })],
    ['an agent name that starts like a spreadsheet formula', wire({ agent: { name: '=evil', email: 'a@example.com', proofConfirmed: true } })],
    ['a non-string submitted_at', wire({ submitted_at: 12345 })],
    ['an overlong submitted_at', wire({ submitted_at: 'x'.repeat(41) })],
  ])('rejects %s', (_n, raw) => {
    expect(parsePrivacyRequest(raw).ok).toBe(false);
  });

  test('removes duplicate request types and keeps the order', () => {
    const r = parsePrivacyRequest(wire({ types: ['delete', 'opt_out', 'delete'] }));
    expect(r.ok && r.value.kind === 'request' && r.value.value.types).toEqual(['delete', 'opt_out']);
  });

  test('allows tabs and line breaks in the details but nothing else', () => {
    expect(parsePrivacyRequest(wire({ details: 'a\tb\nc\r\nd' })).ok).toBe(true);
  });

  test('a plus sign inside an email (a common mailbox tag) is fine; only a leading one is refused', () => {
    expect(parsePrivacyRequest(wire({ email: 'pat+wellpeps@example.com' })).ok).toBe(true);
    expect(parsePrivacyRequest(wire({ email: '+pat@example.com' })).ok).toBe(false);
  });

  test('names with accents, apostrophes, hyphens and non-Latin scripts are accepted', () => {
    for (const name of ["Zoë O'Brien-Smith", '李小龍', 'José María', 'Müller']) {
      expect(parsePrivacyRequest(wire({ fullName: name })).ok, name).toBe(true);
    }
  });

  test('parseRequestBody: spam is silent, valid is accepted, invalid is rejected', () => {
    expect(parseRequestBody(wire({ honeypot: 'x' })).kind).toBe('silent');
    expect(parseRequestBody(wire()).kind).toBe('accept');
    expect(parseRequestBody({}).kind).toBe('reject');
  });
});

// ---------------------------------------------------------------- the deadlines

describe('computeDeadlines', () => {
  test('due_at is 45 calendar days after receipt for every request type', () => {
    for (const t of REQUEST_TYPES) {
      expect(computeDeadlines(RECEIVED, [t.id]).dueAt.toISOString()).toBe('2026-11-15T12:00:00.000Z');
    }
  });

  test('ack_due_at is ten business days after receipt (Thursday 1 Oct 2026 -> Thursday 15 Oct)', () => {
    expect(computeDeadlines(RECEIVED, ['access']).ackDueAt.toISOString()).toBe('2026-10-15T12:00:00.000Z');
  });

  test('an opt-out style request also gets the earlier fifteen business day action date', () => {
    expect(computeDeadlines(RECEIVED, ['opt_out']).actByDueAt?.toISOString()).toBe('2026-10-22T12:00:00.000Z');
    expect(computeDeadlines(RECEIVED, ['access']).actByDueAt).toBeNull();
    expect(computeDeadlines(RECEIVED, ['access', 'unsubscribe_email']).actByDueAt).not.toBeNull();
  });

  test('a request received on a Friday evening counts business days from the next Monday', () => {
    const friday = new Date('2026-10-02T23:30:00.000Z');
    expect(computeDeadlines(friday, ['access']).ackDueAt.toISOString()).toBe('2026-10-16T23:30:00.000Z');
  });

  test('retain_until is 24 months after receipt, clamped at the end of a shorter month', () => {
    expect(computeDeadlines(RECEIVED, ['access']).retainUntil.toISOString()).toBe('2028-10-01T12:00:00.000Z');
    expect(addMonthsUtc(new Date('2026-02-28T00:00:00Z'), 24).toISOString()).toBe('2028-02-28T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2027-01-31T00:00:00Z'), 1).toISOString()).toBe('2027-02-28T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2028-02-29T00:00:00Z'), 12).toISOString()).toBe('2029-02-28T00:00:00.000Z');
  });
});

// -------------------------------------------------------------------- the store

describe('storePrivacyRequest', () => {
  const parsed = (over: Partial<PrivacyRequestInput> = {}) => {
    const r = parsePrivacyRequest({ ...input(over) });
    if (!r.ok || r.value.kind !== 'request') throw new Error('bad fixture');
    return r.value.value;
  };

  function repo(over: Partial<PrivacyRequestRepo> = {}) {
    const inserted: PrivacyRequestRow[] = [];
    const r: PrivacyRequestRepo = {
      countSince: vi.fn(async () => ({ ok: true as const, count: 0 })),
      insert: vi.fn(async (row: PrivacyRequestRow): Promise<InsertResult> => (inserted.push(row), { ok: true, requestNo: 'PR-261001-ABCDEF' })),
      ...over,
    };
    return { repo: r, inserted };
  }

  test('inserts a row with the received time, all three deadlines and the retention date', async () => {
    const { repo: r, inserted } = repo();
    const out = await storePrivacyRequest({ repo: r, hourlyCap: 60 }, parsed({ types: ['opt_out', 'access'] }), RECEIVED.getTime());
    expect(out).toEqual({ ok: true, response: { request_no: 'PR-261001-ABCDEF' } });
    expect(inserted[0]).toMatchObject({
      received_at: '2026-10-01T12:00:00.000Z',
      ack_due_at: '2026-10-15T12:00:00.000Z',
      act_by_due_at: '2026-10-22T12:00:00.000Z',
      due_at: '2026-11-15T12:00:00.000Z',
      retain_until: '2028-10-01T12:00:00.000Z',
      request_types: ['opt_out', 'access'],
      full_name: 'Pat Example',
      email: 'pat@example.com',
      state: 'CA',
    });
  });

  test('stores no IP address, user agent or client timestamp (the row has no field for them)', () => {
    const row = buildRequestRow(parsed(), RECEIVED);
    expect(Object.keys(row).filter((k) => /ip|agent_ua|user_agent|submitted|address/i.test(k))).toEqual([]);
  });

  test('empty optional fields are stored as null, and an agent is stored with proof', () => {
    expect(buildRequestRow(parsed(), RECEIVED)).toMatchObject({ details: null, agent_name: null, agent_email: null, agent_proof_confirmed: false });
    const withAgent = buildRequestRow(parsed({ state: '', agent: { name: 'Agent A', email: 'a@example.com', proofConfirmed: true } }), RECEIVED);
    expect(withAgent).toMatchObject({ state: null, agent_name: 'Agent A', agent_email: 'a@example.com', agent_proof_confirmed: true });
  });

  test('the circuit breaker refuses new requests once the hourly cap is reached, and stores nothing', async () => {
    const { repo: r, inserted } = repo({ countSince: async () => ({ ok: true, count: 60 }) });
    const out = await storePrivacyRequest({ repo: r, hourlyCap: 60 }, parsed(), RECEIVED.getTime());
    expect(out).toEqual({ ok: false, busy: true });
    expect(inserted).toHaveLength(0);
  });

  test('it counts the last hour only', async () => {
    const { repo: r } = repo();
    await storePrivacyRequest({ repo: r, hourlyCap: 60 }, parsed(), RECEIVED.getTime());
    expect(r.countSince).toHaveBeenCalledWith('2026-10-01T11:00:00.000Z');
  });

  test('a failed count or insert fails the request with a code only', async () => {
    const a = repo({ countSince: async () => ({ ok: false, code: '57014' }) });
    expect(await storePrivacyRequest({ repo: a.repo, hourlyCap: 60 }, parsed(), RECEIVED.getTime())).toEqual({ ok: false, code: '57014' });
    const b = repo({ insert: async () => ({ ok: false, code: '23514' }) });
    expect(await storePrivacyRequest({ repo: b.repo, hourlyCap: 60 }, parsed(), RECEIVED.getTime())).toEqual({ ok: false, code: '23514' });
  });

  test('a request-number collision is retried and then succeeds', async () => {
    const insert = vi
      .fn<(row: PrivacyRequestRow) => Promise<InsertResult>>()
      .mockResolvedValueOnce({ ok: false, conflict: true })
      .mockResolvedValueOnce({ ok: true, requestNo: 'PR-261001-000001' });
    const out = await storePrivacyRequest({ repo: { countSince: async () => ({ ok: true, count: 0 }), insert }, hourlyCap: 60 }, parsed(), RECEIVED.getTime());
    expect(out).toEqual({ ok: true, response: { request_no: 'PR-261001-000001' } });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  test('repeated collisions give up after three tries', async () => {
    const insert = vi.fn(async (): Promise<InsertResult> => ({ ok: false, conflict: true }));
    const out = await storePrivacyRequest({ repo: { countSince: async () => ({ ok: true, count: 0 }), insert }, hourlyCap: 60 }, parsed(), RECEIVED.getTime());
    expect(out.ok).toBe(false);
    expect(insert).toHaveBeenCalledTimes(3);
  });

  test('with no notifier configured nothing is sent anywhere', async () => {
    const { repo: r } = repo();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    try {
      await storePrivacyRequest({ repo: r, hourlyCap: 60 }, parsed(), RECEIVED.getTime());
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('a notifier receives facts only: no name, no email, no details', async () => {
    const { repo: r } = repo();
    const seen: RequestNotice[] = [];
    await storePrivacyRequest(
      { repo: r, hourlyCap: 60, notify: async (n) => void seen.push(n) },
      parsed({ details: 'private details here' }),
      RECEIVED.getTime(),
    );
    expect(seen).toHaveLength(1);
    const text = JSON.stringify(seen[0]);
    expect(text).not.toContain('Pat Example');
    expect(text).not.toContain('pat@example.com');
    expect(text).not.toContain('private details');
    expect(seen[0]).toMatchObject({ request_no: 'PR-261001-ABCDEF', due_at: '2026-11-15T12:00:00.000Z' });
  });

  test('a notifier that fails never fails the request, but the failure is logged with a fixed line', async () => {
    const { repo: r } = repo();
    const log = vi.fn();
    const out = await storePrivacyRequest(
      {
        repo: r,
        hourlyCap: 60,
        log,
        notify: async () => {
          throw new Error('webhook down for pat@example.com');
        },
      },
      parsed(),
      RECEIVED.getTime(),
    );
    expect(out.ok).toBe(true);
    expect(log).toHaveBeenCalledWith('[privacy-request] notify failed');
    expect(JSON.stringify(log.mock.calls)).not.toContain('pat@example.com');
  });

  test('with a defer hook the notification is handed to the runtime and the response does not wait for it', async () => {
    const { repo: r } = repo();
    let finish: () => void = () => {};
    const slow = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const deferred: Promise<unknown>[] = [];
    const out = await storePrivacyRequest(
      { repo: r, hourlyCap: 60, notify: () => slow, defer: (job) => void deferred.push(job) },
      parsed(),
      RECEIVED.getTime(),
    );
    expect(out.ok).toBe(true);
    expect(deferred).toHaveLength(1);
    finish();
    await deferred[0];
  });
});

describe('createPrivacyRequestRepo (the supabase-js mapping)', () => {
  const sampleRow = (): PrivacyRequestRow => {
    const r = parsePrivacyRequest({ ...input() });
    if (!r.ok || r.value.kind !== 'request') throw new Error('bad fixture');
    return buildRequestRow(r.value.value, RECEIVED);
  };

  /** A fake of the slice of the supabase-js client the repo uses. */
  function fakeClient(over: {
    count?: { count: number | null; error: { code?: unknown } | null };
    insert?: { data: { request_no?: unknown } | null; error: { code?: unknown } | null };
  }) {
    const calls: string[] = [];
    const client: PrivacyRequestsClient = {
      from: (table) => {
        calls.push(`from:${table}`);
        return {
          select: (columns, options) => {
            calls.push(`select:${columns}:${options.count}:${options.head}`);
            return {
              gte: async (column, value) => {
                calls.push(`gte:${column}:${value}`);
                return over.count ?? { count: 0, error: null };
              },
            };
          },
          insert: (row) => {
            calls.push(`insert:${row.email}`);
            return { select: () => ({ single: async () => over.insert ?? { data: { request_no: 'PR-261001-ABCDEF' }, error: null } }) };
          },
        };
      },
    };
    return { client, calls };
  }

  test('counts the recent requests with a head count query on received_at', async () => {
    const { client, calls } = fakeClient({ count: { count: 7, error: null } });
    expect(await createPrivacyRequestRepo(client).countSince('2026-10-01T11:00:00.000Z')).toEqual({ ok: true, count: 7 });
    expect(calls).toEqual(['from:privacy_requests', 'select:id:exact:true', 'gte:received_at:2026-10-01T11:00:00.000Z']);
  });

  test('a null count or an error is a failure, with the error code only', async () => {
    const nullCount = fakeClient({ count: { count: null, error: null } });
    expect(await createPrivacyRequestRepo(nullCount.client).countSince('x')).toEqual({ ok: false, code: undefined });
    const failed = fakeClient({ count: { count: null, error: { code: '57014' } } });
    expect(await createPrivacyRequestRepo(failed.client).countSince('x')).toEqual({ ok: false, code: '57014' });
  });

  test('inserts the row and returns the generated request number', async () => {
    const { client } = fakeClient({});
    expect(await createPrivacyRequestRepo(client).insert(sampleRow())).toEqual({ ok: true, requestNo: 'PR-261001-ABCDEF' });
  });

  test('a unique violation becomes a retryable conflict; another error keeps only its code', async () => {
    const dup = fakeClient({ insert: { data: null, error: { code: '23505' } } });
    expect(await createPrivacyRequestRepo(dup.client).insert(sampleRow())).toEqual({ ok: false, conflict: true });
    const bad = fakeClient({ insert: { data: null, error: { code: '23514' } } });
    expect(await createPrivacyRequestRepo(bad.client).insert(sampleRow())).toEqual({ ok: false, code: '23514' });
  });

  test('a response with no request number is a failure, not a success with an undefined number', async () => {
    const empty = fakeClient({ insert: { data: {}, error: null } });
    expect(await createPrivacyRequestRepo(empty.client).insert(sampleRow())).toEqual({ ok: false, code: 'NOROW' });
    const none = fakeClient({ insert: { data: null, error: null } });
    expect(await createPrivacyRequestRepo(none.client).insert(sampleRow())).toEqual({ ok: false, code: 'NOROW' });
  });

  test('without a client (missing service-role key) every call fails safely', async () => {
    const repo = createPrivacyRequestRepo(null);
    expect(await repo.countSince('x')).toEqual({ ok: false, code: 'NOCLIENT' });
    expect(await repo.insert(sampleRow())).toEqual({ ok: false, code: 'NOCLIENT' });
  });
});

describe('createWebhookNotifier (off unless configured)', () => {
  test.each([undefined, null, '', 'http://insecure.example/hook', 'not a url', 'ftp://x.example'])('is disabled for %j', (url) => {
    expect(createWebhookNotifier(url)).toBeUndefined();
  });

  test('posts a JSON notice with no personal data to an https url', async () => {
    const fetchImpl = vi.fn(async () => ({}));
    const notify = createWebhookNotifier('https://hooks.example.com/abc', fetchImpl);
    expect(notify).toBeDefined();
    await notify!({ request_no: 'PR-261001-ABCDEF', received_at: 'a', due_at: 'b', ack_due_at: 'c', types: ['opt_out'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://hooks.example.com/abc');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ event: 'privacy_request_received', request_no: 'PR-261001-ABCDEF' });
  });
});
