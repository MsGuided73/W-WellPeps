import { describe, expect, test, vi } from 'vitest';
import {
  BROWSER_FAMILIES as SERVER_BROWSER_FAMILIES,
  CONSENT_LOG_ACTIONS as SERVER_ACTIONS,
  PAGE_CLASSES as SERVER_PAGE_CLASSES,
  parseConsentBody,
  toStoredConsentEvent,
  validateConsentEvent,
} from '../../../../supabase/functions/_shared/consent-event.ts';
import { createHandler } from '../../../../supabase/functions/_shared/handler.ts';
import { createRateLimiter } from '../../../../supabase/functions/_shared/rate-limit.ts';
import { CONSENT_MAX_AGE_DAYS, NOTICE_VERSION, defaultState, parse, serialize } from '../privacy/consent';
import { createGate, type GateDeps } from '../privacy/gate';
import { BROWSER_FAMILIES, browserFamily, buildLogEvent, CONSENT_LOG_ACTIONS, createSink, type ConsentLogEvent } from '../privacy/log';
import type { Tracker } from '../privacy/registry';

const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

const goodEvent = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  event_id: crypto.randomUUID(),
  consent_id: crypto.randomUUID(),
  occurred_at: new Date(NOW).toISOString(),
  action: 'accept_all',
  analytics: true,
  analytics_sensitive: false,
  advertising: true,
  advertising_sensitive: false,
  anonymous_opt_out: false,
  gpc_detected: false,
  notice_version: NOTICE_VERSION,
  banner_version: '1',
  page_class: 'other',
  user_agent: 'Chrome',
  ...over,
});

// ------------------------------------------------- the site and the server agree

describe('the browser and the consent-log function agree on the contract', () => {
  test('the list of actions is identical', () => {
    expect([...SERVER_ACTIONS]).toEqual([...CONSENT_LOG_ACTIONS]);
  });

  test('the browser families are identical, and every user agent maps into them', () => {
    expect([...SERVER_BROWSER_FAMILIES]).toEqual([...BROWSER_FAMILIES]);
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0',
      'Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/121.0',
      'curl/8.0',
      '',
    ];
    for (const ua of agents) expect(SERVER_BROWSER_FAMILIES).toContain(browserFamily(ua));
  });

  test('the page classes are identical to what buildLogEvent can produce', () => {
    const state = defaultState(NOW, crypto.randomUUID());
    const ctx = { now: NOW, uuid: () => crypto.randomUUID(), userAgent: '' };
    const classes = new Set([
      buildLogEvent(state, 'custom', { ...ctx, path: '/weight-loss' }).page_class,
      buildLogEvent(state, 'custom', { ...ctx, path: '/why-wellpeps' }).page_class,
    ]);
    expect([...classes].sort()).toEqual([...SERVER_PAGE_CLASSES].sort());
  });

  /** Drive the REAL gate through every kind of event and collect what it would send. */
  function eventsFromTheRealGate(): ConsentLogEvent[] {
    const events: ConsentLogEvent[] = [];
    const tool: Tracker = {
      id: 'test-tool',
      name: 'Test tool',
      vendor: 'Test',
      category: 'analytics',
      description: 'test',
      hosts: ['test.example.com'],
      cookies: [],
      storageKeys: [],
      load() {},
      unload() {},
    };
    const anonymousTool: Tracker = { ...tool, id: 'anon-tool', anonymous: true };
    const adsTool: Tracker = { ...tool, id: 'ads-tool', category: 'advertising' };
    function makeGate(opts: { stored?: string | null; gpc: boolean; path: string }) {
      const jar = { value: opts.stored ?? null };
      const deps: GateDeps = {
        now: () => NOW,
        uuid: () => crypto.randomUUID(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36',
        cookies: {
          read: () => jar.value,
          write: (v) => {
            jar.value = v;
          },
          removeConsent: () => {
            jar.value = null;
          },
          remove: () => {},
        },
        readGpc: () => opts.gpc,
        path: () => opts.path,
        trackers: [tool, anonymousTool, adsTool],
        log: (e) => events.push(e),
      };
      return createGate(deps);
    }

    // A visitor with a Global Privacy Control signal on a health-topic page makes every kind of choice.
    const gate = makeGate({ gpc: true, path: '/weight-loss?utm_source=x' });
    gate.init();
    gate.dispatch({ type: 'acceptAll', via: 'banner' });
    gate.dispatch({ type: 'gpcAllowAnyway' });
    gate.dispatch({ type: 'gpcKeepOff' });
    gate.dispatch({ type: 'set', changes: { analytics: true, analyticsSensitive: true } });
    gate.dispatch({ type: 'gpcAllowAnyway' });
    gate.dispatch({ type: 'set', changes: { advertisingSensitive: true, anonymous: false } });
    gate.dispatch({ type: 'rejectAll' });
    gate.dispatch({ type: 'acceptAll', via: 'center' });
    gate.dispatch({ type: 'withdrawAll' });

    // A returning visitor whose choice was made under an older notice, and one whose choice expired.
    const old = { ...defaultState(NOW, crypto.randomUUID()), v: '2026-01-01.1', source: 'banner' as const };
    const versionGate = makeGate({ stored: serialize(old), gpc: false, path: '/' });
    versionGate.init();
    versionGate.recordPrompt();
    const stale = { ...defaultState(NOW - (CONSENT_MAX_AGE_DAYS + 5) * DAY, crypto.randomUUID()), source: 'banner' as const };
    const expiryGate = makeGate({ stored: serialize(stale), gpc: false, path: '/' });
    expiryGate.init();
    expiryGate.recordPrompt();
    return events;
  }

  test('every action the browser can log is produced by the real gate', () => {
    const seen = new Set(eventsFromTheRealGate().map((e) => e.action));
    expect([...seen].sort()).toEqual([...CONSENT_LOG_ACTIONS].sort());
  });

  test('every event the real gate produces is accepted by the server, unchanged in meaning', () => {
    for (const e of eventsFromTheRealGate()) {
      const checked = validateConsentEvent(e);
      expect(checked.ok, `${e.action}: ${checked.ok ? '' : checked.reason}`).toBe(true);
      if (checked.ok) expect(checked.value).toEqual({ ...e, event_id: e.event_id.toLowerCase() });
    }
  });

  test('the events carry no path, query string, email or address, even from a page with a query string', () => {
    for (const e of eventsFromTheRealGate()) {
      expect(JSON.stringify(e)).not.toMatch(/weight-loss|utm_source|@|\bip\b/i);
    }
  });

  test('the real sink output (a text/plain JSON body) is accepted by the whole request pipeline', async () => {
    const sent: string[] = [];
    const sink = createSink({
      enabled: true,
      endpoint: 'https://project.supabase.co/functions/v1/consent-log',
      sendBeacon: (_url, blob) => {
        void blob.text().then((t) => sent.push(t));
        return true;
      },
    });
    const ev = buildLogEvent(defaultState(NOW, crypto.randomUUID()), 'accept_all', {
      now: NOW,
      uuid: () => crypto.randomUUID(),
      path: '/why-wellpeps',
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
    });
    sink(ev);
    await vi.waitFor(() => expect(sent).toHaveLength(1));

    const store = vi.fn(async () => ({ ok: true as const }));
    const handler = createHandler({
      name: 'consent-log',
      allowedOrigins: ['https://wellpeps.com'],
      limiter: createRateLimiter({ limit: 10, windowMs: 60_000 }),
      sourceKey: async () => 'k',
      parse: parseConsentBody,
      store,
      now: () => NOW,
    });
    const res = await handler(
      new Request('https://project.supabase.co/functions/v1/consent-log', {
        method: 'POST',
        headers: { Origin: 'https://wellpeps.com', 'Content-Type': 'text/plain;charset=UTF-8' },
        body: sent[0],
      }),
    );
    expect(res.status).toBe(200);
    expect(store).toHaveBeenCalledTimes(1);
  });
});

// ------------------------------------------------------------ server validation

describe('validateConsentEvent', () => {
  test('accepts a well-formed event, including a 32-hex id from browsers without randomUUID', () => {
    expect(validateConsentEvent(goodEvent()).ok).toBe(true);
    expect(validateConsentEvent(goodEvent({ event_id: 'a'.repeat(32), consent_id: 'B'.repeat(32) })).ok).toBe(true);
  });

  test('accepts any consent id the browser cookie parser accepts, so a tampered or older cookie still gets its choice logged', () => {
    const accepted = [crypto.randomUUID(), 'a'.repeat(32), 'Legacy-Id-123', 'x', 'g'.repeat(64)];
    for (const cid of accepted) {
      const parsed = parse(serialize({ ...defaultState(NOW, cid) }), NOW);
      expect(parsed?.cid, cid).toBe(cid);
      const checked = validateConsentEvent(goodEvent({ consent_id: cid }));
      expect(checked.ok, cid).toBe(true);
      // The id is stored exactly as the cookie holds it, so the log can be matched to a visitor's cookie.
      if (checked.ok) expect(checked.value.consent_id).toBe(cid);
    }
  });

  test.each([
    ['not an object', 'text'],
    ['an array', []],
    ['null', null],
  ])('rejects %s', (_n, raw) => {
    expect(validateConsentEvent(raw).ok).toBe(false);
  });

  test.each([
    ['ip_address', '203.0.113.9'],
    ['page_path', '/weight-loss'],
    ['email', 'a@b.com'],
    ['visitor_id', 'abc'],
    ['full_user_agent', 'Mozilla/5.0 ...'],
  ])('rejects an event carrying an extra %s field instead of storing or silently dropping it', (key, value) => {
    expect(validateConsentEvent(goodEvent({ [key]: value })).ok).toBe(false);
  });

  test('rejects a missing field', () => {
    const e = goodEvent();
    delete e.action;
    expect(validateConsentEvent(e).ok).toBe(false);
  });

  test.each([
    ['event_id', 'not-a-uuid'],
    ['event_id', crypto.randomUUID() + 'x'],
    ['consent_id', ''],
    ['consent_id', 'has spaces!'],
    ['consent_id', 'a'.repeat(65)],
    ['occurred_at', '2026-10-01'],
    ['occurred_at', '2026-02-31T10:00:00.000Z'],
    ['occurred_at', '2026-10-01T12:00:00Z'],
    ['occurred_at', 1760000000000],
    ['action', 'delete_everything'],
    ['analytics', 'true'],
    ['advertising', 1],
    ['advertising_sensitive', 'yes'],
    ['anonymous_opt_out', 0],
    ['anonymous_opt_out', undefined],
    ['gpc_detected', null],
    ['notice_version', ''],
    ['notice_version', 'x'.repeat(41)],
    ['notice_version', '2026 10 01'],
    ['banner_version', '<script>'],
    ['page_class', '/weight-loss'],
    ['user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'],
  ])('rejects a bad %s (%j)', (key, value) => {
    expect(validateConsentEvent(goodEvent({ [key]: value })).ok).toBe(false);
  });

  test('rejects combinations the consent rules can never produce', () => {
    expect(validateConsentEvent(goodEvent({ analytics: false, analytics_sensitive: true })).ok).toBe(false);
    expect(validateConsentEvent(goodEvent({ action: 'reject_all' })).ok).toBe(false);
    expect(validateConsentEvent(goodEvent({ action: 'withdraw', analytics: false, advertising: true })).ok).toBe(false);
    expect(validateConsentEvent(goodEvent({ advertising: false, advertising_sensitive: true })).ok).toBe(false);
    expect(validateConsentEvent(goodEvent({ action: 'withdraw', analytics: false, advertising: false })).ok).toBe(false);
    expect(validateConsentEvent(goodEvent({ action: 'reject_all', analytics: false, advertising: false, anonymous_opt_out: false })).ok).toBe(false);
    expect(
      validateConsentEvent(goodEvent({ action: 'withdraw', analytics: false, analytics_sensitive: false, advertising: false, anonymous_opt_out: true })).ok,
    ).toBe(true);
    expect(validateConsentEvent(goodEvent({ advertising_sensitive: true })).ok).toBe(true);
  });

  test('parseConsentBody rejects what fails and accepts what passes, never marks anything silent', () => {
    expect(parseConsentBody(goodEvent()).kind).toBe('accept');
    expect(parseConsentBody({}).kind).toBe('reject');
  });
});

describe('toStoredConsentEvent', () => {
  const event = (over: Record<string, unknown> = {}) => {
    const c = validateConsentEvent(goodEvent(over));
    if (!c.ok) throw new Error(c.reason);
    return c.value;
  };

  test('maps the browser family to its own column and keeps no user_agent field', () => {
    const row = toStoredConsentEvent(event(), NOW);
    expect(row.browser_family).toBe('Chrome');
    expect(row).not.toHaveProperty('user_agent');
    expect(row.clock_suspect).toBe(false);
  });

  test('has no field for an IP address, a path or an email', () => {
    const keys = Object.keys(toStoredConsentEvent(event(), NOW));
    expect(keys.filter((k) => /ip|path|email|address/i.test(k))).toEqual([]);
  });

  test('keeps a plausible client time', () => {
    const e = event({ occurred_at: new Date(NOW - 5 * 60 * 1000).toISOString() });
    expect(toStoredConsentEvent(e, NOW).occurred_at).toBe(e.occurred_at);
  });

  test('a wrong clock does not lose the event: the server time is used and the row is flagged', () => {
    const far = event({ occurred_at: '2019-01-01T00:00:00.000Z' });
    const future = event({ occurred_at: new Date(NOW + 10 * DAY).toISOString() });
    for (const e of [far, future]) {
      const row = toStoredConsentEvent(e, NOW);
      expect(row.clock_suspect).toBe(true);
      expect(row.occurred_at).toBe(new Date(NOW).toISOString());
    }
  });
});
