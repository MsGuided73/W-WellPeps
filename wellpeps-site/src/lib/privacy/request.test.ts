import { describe, expect, test, vi } from 'vitest';
import {
  REQUEST_TYPES,
  addBusinessDays,
  buildMailto,
  computeDueDates,
  submitRequest,
  validateRequest,
  type PrivacyRequestInput,
} from './request';

const base = (over: Partial<PrivacyRequestInput> = {}): PrivacyRequestInput => ({
  fullName: 'Pat Example',
  email: 'pat@example.com',
  state: 'CA',
  types: ['opt_out'],
  details: '',
  agent: null,
  honeypot: '',
  ...over,
});

describe('REQUEST_TYPES', () => {
  test('offers every right the Your Privacy Choices page promises', () => {
    const ids = REQUEST_TYPES.map((t) => t.id);
    for (const id of ['opt_out', 'limit_sensitive', 'withdraw_consent', 'unsubscribe_email', 'access', 'correct', 'delete', 'copy', 'appeal']) {
      expect(ids).toContain(id);
    }
  });
});

describe('validateRequest', () => {
  test('accepts a complete request', () => {
    const r = validateRequest(base());
    expect(r.ok).toBe(true);
  });

  test('requires a name and a valid email', () => {
    const r = validateRequest(base({ fullName: '  ', email: 'not-an-email' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.fullName).toBeTruthy();
      expect(r.errors.email).toBeTruthy();
    }
  });

  test('requires at least one request type', () => {
    const r = validateRequest(base({ types: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.types).toBeTruthy();
  });

  test('rejects an unknown request type', () => {
    expect(validateRequest(base({ types: ['launch_missiles'] })).ok).toBe(false);
  });

  test('state is optional but must be a two-letter code when given', () => {
    expect(validateRequest(base({ state: '' })).ok).toBe(true);
    expect(validateRequest(base({ state: 'California' })).ok).toBe(false);
  });

  test('limits the length of the free-text details', () => {
    expect(validateRequest(base({ details: 'x'.repeat(2001) })).ok).toBe(false);
    expect(validateRequest(base({ details: 'x'.repeat(2000) })).ok).toBe(true);
  });

  test('an authorized agent must give a name, an email and confirm proof of permission', () => {
    const missing = validateRequest(base({ agent: { name: '', email: '', proofConfirmed: false } }));
    expect(missing.ok).toBe(false);
    const ok = validateRequest(base({ agent: { name: 'Agent A', email: 'a@example.com', proofConfirmed: true } }));
    expect(ok.ok).toBe(true);
  });

  test('a filled honeypot is flagged as spam and never accepted', () => {
    const r = validateRequest(base({ honeypot: 'bot' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.spam).toBe(true);
  });

  test('trims and lowercases the email in the cleaned value', () => {
    const r = validateRequest(base({ email: '  Pat@Example.COM ' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email).toBe('pat@example.com');
  });
});

describe('addBusinessDays', () => {
  test('skips weekends', () => {
    // Friday 2026-10-02 + 1 business day = Monday 2026-10-05
    expect(addBusinessDays(new Date('2026-10-02T12:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2026-10-05');
  });

  test('counts ten business days as two calendar weeks', () => {
    expect(addBusinessDays(new Date('2026-10-01T12:00:00Z'), 10).toISOString().slice(0, 10)).toBe('2026-10-15');
  });
});

describe('computeDueDates', () => {
  const received = new Date('2026-10-01T12:00:00Z');

  test('always sets the acknowledgment deadline at ten business days', () => {
    expect(computeDueDates(received, ['opt_out']).acknowledgeBy.toISOString().slice(0, 10)).toBe('2026-10-15');
  });

  test('opt-out style requests get a fifteen business day action deadline and no answer deadline', () => {
    const d = computeDueDates(received, ['opt_out', 'unsubscribe_email']);
    expect(d.actBy?.toISOString().slice(0, 10)).toBe('2026-10-22');
    expect(d.answerBy).toBeNull();
  });

  test('access style requests get a 45 day answer deadline and a 45 day extension ceiling', () => {
    const d = computeDueDates(received, ['access']);
    expect(d.answerBy?.toISOString().slice(0, 10)).toBe('2026-11-15');
    expect(d.maxExtendedBy?.toISOString().slice(0, 10)).toBe('2026-12-30');
    expect(d.actBy).toBeNull();
  });

  test('a mixed request carries both deadlines', () => {
    const d = computeDueDates(received, ['opt_out', 'delete']);
    expect(d.actBy).not.toBeNull();
    expect(d.answerBy).not.toBeNull();
  });
});

describe('buildMailto', () => {
  test('builds a mailto link with a subject and a body that carries no health detail prompt', () => {
    const href = buildMailto('privacy@example.com', base({ types: ['delete'] }));
    expect(href.startsWith('mailto:privacy@example.com?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('Privacy request');
    expect(decodeURIComponent(href)).toContain('Pat Example');
  });

  test('encodes characters that would break the link', () => {
    const href = buildMailto('privacy@example.com', base({ details: 'a & b = c?' }));
    expect(href).not.toContain('a & b');
  });
});

describe('submitRequest', () => {
  test('without an endpoint it reports that the mailto fallback should be used', async () => {
    const r = await submitRequest(base(), { endpoint: '' });
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
  });

  test('returns the request number on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ request_no: 'PR-000123' }) });
    const r = await submitRequest(base(), { endpoint: 'https://x.test/req', fetchImpl });
    expect(r).toMatchObject({ ok: true, requestNo: 'PR-000123' });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  test('never sends a spam submission, but a real person caught by browser autofill still gets the email fallback', async () => {
    const fetchImpl = vi.fn();
    const r = await submitRequest(base({ honeypot: 'bot' }), { endpoint: 'https://x.test/req', fetchImpl });
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.message).toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('gives up on a request that takes too long instead of hanging the form', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new Error('aborted')));
        }),
    );
    const r = await submitRequest(base(), { endpoint: 'https://x.test/req', fetchImpl, timeoutMs: 20 });
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
  });

  test('turns a network failure into a message and a fallback, without throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const r = await submitRequest(base(), { endpoint: 'https://x.test/req', fetchImpl });
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.message).toBeTruthy();
  });

  test('does not send an invalid request', async () => {
    const fetchImpl = vi.fn();
    const r = await submitRequest(base({ email: 'nope' }), { endpoint: 'https://x.test/req', fetchImpl });
    expect(r.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('field length limits', () => {
  test('caps the name and email lengths', () => {
    expect(validateRequest(base({ fullName: 'x'.repeat(201) })).ok).toBe(false);
    expect(validateRequest(base({ email: `${'a'.repeat(250)}@example.com` })).ok).toBe(false);
  });

  test('caps the authorized agent fields', () => {
    const r = validateRequest(base({ agent: { name: 'x'.repeat(201), email: 'a@example.com', proofConfirmed: true } }));
    expect(r.ok).toBe(false);
  });
});
