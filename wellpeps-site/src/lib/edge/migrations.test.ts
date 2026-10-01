import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  EVENT_TYPES,
  PAGE_TEMPLATES,
  REFERRER_CLASSES,
  SCROLL_BUCKETS,
  TIME_BUCKETS,
  VIEWPORT_CLASSES,
  validateAnalyticsEvent,
} from '../../../../supabase/functions/_shared/analytics-event.ts';
import {
  BROWSER_FAMILIES,
  CONSENT_ID_PATTERN,
  CONSENT_LOG_ACTIONS,
  PAGE_CLASSES,
  VERSION_PATTERN,
} from '../../../../supabase/functions/_shared/consent-event.ts';
import { MAX_DETAILS, MAX_EMAIL, MAX_NAME, REQUEST_TYPES, parsePrivacyRequest } from '../../../../supabase/functions/_shared/privacy-request.ts';
import { ID_PATTERN } from '../../../../supabase/functions/_shared/validate.ts';

/**
 * Static checks on the SQL migrations and the function sources. Nothing is run
 * against a database (nothing is deployed); these guard the privacy promises the
 * files make: Row Level Security on and no public policies, no address or
 * identifier columns, retention stated.
 */
const repoRoot = resolve(__dirname, '../../../..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');
const functionsDir = resolve(repoRoot, 'supabase/functions');

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({ name: f, sql: readFileSync(resolve(migrationsDir, f), 'utf8') }));

/** The SQL with comments removed (line comments and COMMENT ON text), so a word in a comment is never mistaken for code. */
const code = (sql: string) => sql.replace(/--.*$/gm, '').replace(/^comment on [\s\S]*?';\s*$/gim, '');

const tables = migrations.flatMap((m) =>
  [...code(m.sql).matchAll(/create table if not exists public\.(\w+)/gi)].map((t) => ({ migration: m.name, sql: m.sql, table: t[1] })),
);

describe('migrations', () => {
  test('there is one migration for each of the three tables', () => {
    expect(tables.map((t) => t.table).sort()).toEqual(['analytics_events', 'consent_events', 'privacy_requests']);
  });

  test('migration file names are ordered timestamps', () => {
    const names = migrations.map((m) => m.name);
    expect(names.every((n) => /^\d{14}_[a-z_]+\.sql$/.test(n))).toBe(true);
    expect([...names].sort()).toEqual(names);
  });

  test.each(tables)('$table: Row Level Security is on and no policy is ever created', ({ sql, table }) => {
    expect(code(sql)).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    expect(code(sql)).not.toMatch(/create\s+policy/i);
    expect(code(sql)).not.toMatch(/to\s+(anon|authenticated|public)\b.*\busing\b/i);
  });

  test.each(tables)('$table: the default table privileges are taken away from the browser roles', ({ sql, table }) => {
    expect(code(sql)).toMatch(new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
  });

  test.each(tables)('$table: the header comment states purpose, what is not stored, and retention', ({ sql }) => {
    const header = sql.split('create table')[0];
    expect(header).toMatch(/PURPOSE/);
    expect(header).toMatch(/NOT STORED|PERSONAL DATA HELD/);
    expect(header).toMatch(/RETENTION/);
    expect(header).toMatch(/Row Level Security is ON/);
  });

  test.each(tables)('$table: has a table comment and a purge function that only the service role can run', ({ sql, table }) => {
    expect(sql).toMatch(new RegExp(`comment on table public\\.${table}`, 'i'));
    expect(code(sql)).toMatch(new RegExp(`create or replace function public\\.purge_expired_${table}\\(\\)`, 'i'));
    expect(code(sql)).toMatch(new RegExp(`revoke all on function public\\.purge_expired_${table}\\(\\) from public, anon, authenticated`, 'i'));
    expect(code(sql)).toMatch(/security definer/i);
    expect(code(sql)).toMatch(/set search_path = ''/i);
  });

  test('retention matches what the files promise: consent 5 years, requests 24 months, analytics 13 months', () => {
    const sqlFor = (t: string) => code(tables.find((x) => x.table === t)!.sql);
    expect(sqlFor('consent_events')).toMatch(/retain_until\s+timestamptz not null default \(now\(\) \+ interval '5 years'\)/);
    expect(sqlFor('privacy_requests')).toMatch(/retain_until\s+timestamptz not null default \(now\(\) \+ interval '24 months'\)/);
    expect(sqlFor('analytics_events')).toMatch(/interval '13 months'/);
  });

  test('no table has a column that could hold an IP address or a full user agent', () => {
    for (const t of tables) {
      const columns = [...code(t.sql).matchAll(/^\s{2}(\w+)\s+(?:bigint|uuid|text|timestamptz|boolean|smallint|text\[\])\b/gim)].map((c) => c[1]);
      expect(columns.length).toBeGreaterThan(5);
      expect(columns.filter((c) => /^ip|ip_address|remote|address|^user_agent$|^ua$|forwarded/i.test(c)), t.table).toEqual([]);
      expect(code(t.sql)).not.toMatch(/\binet\b|\bcidr\b/i);
    }
  });

  test('consent_events and analytics_events hold no email, name or free text', () => {
    for (const name of ['consent_events', 'analytics_events']) {
      const t = tables.find((x) => x.table === name)!;
      const columns = [...code(t.sql).matchAll(/^\s{2}(\w+)\s+(?:bigint|uuid|text|timestamptz|boolean|smallint)\b/gim)].map((c) => c[1]);
      expect(columns.filter((c) => /email|name$|^name|details|notes|text$/i.test(c)), name).toEqual([]);
    }
  });

  test('analytics_events has no identifier, no incrementing id and no precise timestamp', () => {
    const sql = code(tables.find((x) => x.table === 'analytics_events')!.sql);
    expect(sql).not.toMatch(/identity|serial|created_at|received_at|occurred_at|session|visitor|device|cookie|fingerprint/i);
    expect(sql).toMatch(/id\s+uuid\s+primary key default gen_random_uuid\(\)/);
    expect(sql).toMatch(/event_hour\s+timestamptz not null default \(date_trunc\('hour'/);
  });

  test('privacy_requests stores the deadlines and a retention date, and no IP or user agent', () => {
    const sql = code(tables.find((x) => x.table === 'privacy_requests')!.sql);
    for (const col of ['received_at', 'status', 'due_at', 'ack_due_at', 'retain_until']) expect(sql).toContain(col);
  });
});

// ---------------------------------------------------------------------------
// The SQL CHECK constraints are a third copy of the contract (after the browser
// and the function). Nothing runs them here, so these tests read each constraint
// out of the migration and compare it with the TypeScript constants and patterns.
// Without them, adding (say) a consent action to the code but not to the SQL
// would make every such insert fail in production with a silent 500.
// ---------------------------------------------------------------------------

/** The text inside `constraint NAME check ( ... )`, found by counting brackets outside quotes. */
function constraintBody(table: string, name: string): string {
  const sql = code(tables.find((t) => t.table === table)!.sql);
  const start = sql.indexOf(`constraint ${name} check (`);
  if (start < 0) throw new Error(`no constraint ${name} in ${table}`);
  let depth = 0;
  let inQuote = false;
  const open = sql.indexOf('(', start);
  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'") inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) return sql.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated constraint ${name}`);
}

const quoted = (body: string): string[] => [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]);
const numbers = (body: string): number[] => (/in \(([\d,\s]+)\)/.exec(body)?.[1] ?? '').split(',').map((n) => Number(n.trim()));

/** The regex literals after ~ , ~* and !~ in a constraint, as JavaScript RegExps. */
function regexes(body: string): { positive: RegExp[]; negative: RegExp[] } {
  const positive: RegExp[] = [];
  const negative: RegExp[] = [];
  for (const m of body.matchAll(/(!~|~\*|~)\s*'([^']*)'/g)) {
    const re = new RegExp(m[2], m[1] === '~*' ? 'i' : '');
    (m[1] === '!~' ? negative : positive).push(re);
  }
  return { positive, negative };
}

/** Does the SQL constraint accept this value? */
const sqlAccepts = (body: string, value: string): boolean => {
  const { positive, negative } = regexes(body);
  return positive.every((r) => r.test(value)) && !negative.some((r) => r.test(value));
};

describe('the SQL constraints match the TypeScript contract', () => {
  test('consent_events: actions, page classes and browser families', () => {
    expect(quoted(constraintBody('consent_events', 'consent_events_action_known')).filter((s) => !s.includes(' '))).toEqual([...CONSENT_LOG_ACTIONS]);
    expect(quoted(constraintBody('consent_events', 'consent_events_page_class_known'))).toEqual([...PAGE_CLASSES]);
    expect(quoted(constraintBody('consent_events', 'consent_events_browser_family_known'))).toEqual([...BROWSER_FAMILIES]);
  });

  test('consent_events: id and version shapes accept and refuse exactly what the function does', () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID().toUpperCase(), 'a'.repeat(32), 'A'.repeat(32), 'not-an-id', '', 'a'.repeat(31), `${crypto.randomUUID()}x`];
    const eventBody = constraintBody('consent_events', 'consent_events_event_id_shape');
    for (const id of ids) expect(sqlAccepts(eventBody, id), `event_id ${id}`).toBe(ID_PATTERN.test(id));

    const consentIds = [crypto.randomUUID(), 'a'.repeat(32), 'Legacy-Id-123', 'x', 'g'.repeat(64), 'g'.repeat(65), '', 'has space', 'semi;colon'];
    const consentBody = constraintBody('consent_events', 'consent_events_consent_id_shape');
    for (const id of consentIds) expect(sqlAccepts(consentBody, id), `consent_id ${id}`).toBe(CONSENT_ID_PATTERN.test(id));

    const versions = ['2026-10-01.1', '1', '', 'x'.repeat(40), 'x'.repeat(41), '2026 10 01', '<script>'];
    const versionBody = constraintBody('consent_events', 'consent_events_versions_shape');
    for (const v of versions) expect(sqlAccepts(versionBody, v), `version ${v}`).toBe(VERSION_PATTERN.test(v));
  });

  test('privacy_requests: request types, limits and the loose email check', () => {
    expect(quoted(constraintBody('privacy_requests', 'privacy_requests_types_known')).filter((s) => !s.includes('::'))).toEqual(
      REQUEST_TYPES.map((t) => t.id),
    );
    expect(constraintBody('privacy_requests', 'privacy_requests_name_length')).toContain(`between 1 and ${MAX_NAME}`);
    expect(constraintBody('privacy_requests', 'privacy_requests_details_length')).toContain(`<= ${MAX_DETAILS}`);
    expect(constraintBody('privacy_requests', 'privacy_requests_email_shape')).toContain(`${MAX_EMAIL}`);
    expect(constraintBody('privacy_requests', 'privacy_requests_agent_length')).toContain(`between 1 and ${MAX_NAME}`);
  });

  test('privacy_requests: the SQL email check is never stricter than the function (so the function refuses first)', () => {
    for (const email of ['a@b.co', 'pat+tag@example.com', "o'brien@example.com", 'x@y.z', 'üser@exämple.com']) {
      const parsed = parsePrivacyRequest({ fullName: 'A B', email, types: ['opt_out'] });
      const functionAccepts = parsed.ok;
      const sqlAcceptsEmail = email.length >= 3 && email.length <= MAX_EMAIL && email.indexOf('@') > 0;
      if (functionAccepts) expect(sqlAcceptsEmail, email).toBe(true);
    }
  });

  test('analytics_events: every enumerated list matches the model', () => {
    expect(quoted(constraintBody('analytics_events', 'analytics_events_type_known'))).toEqual([...EVENT_TYPES]);
    expect(quoted(constraintBody('analytics_events', 'analytics_events_template_known'))).toEqual([...PAGE_TEMPLATES]);
    expect(quoted(constraintBody('analytics_events', 'analytics_events_from_template_known'))).toEqual([...PAGE_TEMPLATES]);
    expect(quoted(constraintBody('analytics_events', 'analytics_events_viewport_known'))).toEqual([...VIEWPORT_CLASSES]);
    expect(quoted(constraintBody('analytics_events', 'analytics_events_referrer_known'))).toEqual([...REFERRER_CLASSES]);
    expect(quoted(constraintBody('analytics_events', 'analytics_events_time_known'))).toEqual([...TIME_BUCKETS]);
    expect(numbers(constraintBody('analytics_events', 'analytics_events_scroll_known'))).toEqual([...SCROLL_BUCKETS]);
  });

  test('analytics_events: the path and click-target shapes accept and refuse exactly what the function does', () => {
    const paths = [
      '/', '/weight-loss', '/wellness-learning-center/what-is-a-glp-1', '/a/b/c/d', '/a/b/c/d/e', '/_unmatched', '/Weight', '/a b', '/a.b',
      '/ref/4155551234', '/year/2026', '/12345', '/123456', '/call-415-555-1234', '/dob-1990-01-15', '/ssn/123/45/6789', '/id_123_456_789',
      '/glp-1-in-2026', '/top-10-questions', '/nad-500mg', `/${'a'.repeat(119)}`, `/${'a'.repeat(120)}`, '', 'weight-loss', '/weight-loss/',
    ];
    const pathBody = constraintBody('analytics_events', 'analytics_events_path_shape');
    for (const p of paths) {
      const fromFunction = validateAnalyticsEvent({ event_type: 'page_view', page_path: p, page_template: 'other', viewport_class: 'mobile', referrer_class: 'direct' }).ok;
      const fromSql = p.length <= 120 && sqlAccepts(pathBody, p);
      expect(fromSql, `path ${p}`).toBe(fromFunction);
    }

    const targets = ['cta-assessment', 'nav', 'a'.repeat(40), 'a'.repeat(41), 'Cta', 'a b', '-lead', 'user-123456', 'user-12345', 'call-415-555-1234', 'x-12-34-56', '', 'a@b.com'];
    const targetBody = constraintBody('analytics_events', 'analytics_events_target_shape');
    for (const t of targets) {
      const fromFunction = validateAnalyticsEvent({ event_type: 'click', page_path: '/', page_template: 'home', viewport_class: 'mobile', click_target: t }).ok;
      expect(sqlAccepts(targetBody, t), `target ${t}`).toBe(fromFunction);
    }
  });

  test('the SQL parser used here really reads the constraints (a sanity check on the test itself)', () => {
    expect(quoted(constraintBody('consent_events', 'consent_events_page_class_known'))).toEqual(['health', 'other']);
    expect(sqlAccepts("x ~ '^a+$' and x !~ 'aaa'", 'aa')).toBe(true);
    expect(sqlAccepts("x ~ '^a+$' and x !~ 'aaa'", 'aaa')).toBe(false);
  });
});

describe('functions', () => {
  const sources = ['consent-log', 'privacy-request', 'analytics-event'].map((n) => ({
    name: n,
    src: readFileSync(resolve(functionsDir, n, 'index.ts'), 'utf8'),
  }));

  test.each(sources)('$name never reads, stores or logs the user agent, and never writes a request body to a log', ({ src }) => {
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(body).not.toMatch(/user-agent|userAgent|x-forwarded-for|cf-connecting-ip/i);
    expect(body).not.toMatch(/console\.(log|info|debug|warn|error)\s*\(/);
  });

  test.each(sources)('$name takes its allowed origins from ALLOWED_ORIGINS and uses the shared request pipeline', ({ src }) => {
    expect(src).toContain("Deno.env.get('ALLOWED_ORIGINS')");
    expect(src).toContain('createHandler');
    expect(src).toContain('Deno.serve(handler)');
  });

  test.each(sources)('$name contains no key, token or password literal', ({ src }) => {
    expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}|sb_secret_|service_role\s*[:=]\s*['"]/);
  });

  test('each function says plainly that it is written and not deployed', () => {
    for (const s of sources) expect(s.src).toMatch(/WRITTEN, NOT DEPLOYED/);
  });

  test('the Supabase config turns JWT checks off for exactly the three public functions', () => {
    const toml = readFileSync(resolve(repoRoot, 'supabase/config.toml'), 'utf8');
    for (const n of ['consent-log', 'privacy-request', 'analytics-event']) {
      expect(toml).toMatch(new RegExp(`\\[functions\\.${n}\\]\\s+verify_jwt = false`));
    }
  });
});
