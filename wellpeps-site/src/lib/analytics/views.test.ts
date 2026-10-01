import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Static checks on supabase/analytics/example-views.sql. The views are not run
 * here (nothing is deployed and no database is touched); these guard what the file
 * promises: the views are closed to the browser roles and read only columns the
 * migration defines.
 */
const repoRoot = resolve(__dirname, '../../../..');
const views = readFileSync(resolve(repoRoot, 'supabase/analytics/example-views.sql'), 'utf8');
const migration = readFileSync(resolve(repoRoot, 'supabase/migrations/20261001090200_analytics_events.sql'), 'utf8');
const code = (sql: string) => sql.replace(/--.*$/gm, '');

const tableColumns = [...code(migration).matchAll(/^\s{2}(\w+)\s+(?:uuid|text|timestamptz|smallint)\b/gim)].map((m) => m[1]);

describe('example reporting views', () => {
  test('there is a view for each question the owner asked, and the rest of the file is a view too', () => {
    const names = [...code(views).matchAll(/create or replace view reporting\.(\w+)/g)].map((m) => m[1]);
    for (const wanted of ['top_pages', 'click_through_by_target', 'scroll_depth_by_template', 'drop_off_by_template']) {
      expect(names).toContain(wanted);
    }
    expect(names.length).toBeGreaterThanOrEqual(4);
  });

  test('every view is created in the reporting schema (not exposed by the Data API) and is security_invoker', () => {
    const creates = [...code(views).matchAll(/create or replace view ([\w.]+)\s+with \(([^)]*)\)/g)];
    const all = [...code(views).matchAll(/create or replace view /g)];
    expect(creates.length).toBe(all.length);
    for (const [, name, options] of creates) {
      expect(name.startsWith('reporting.'), name).toBe(true);
      expect(options).toContain('security_invoker = true');
    }
  });

  test('nothing is ever granted to anyone, and the browser roles are revoked', () => {
    expect(code(views)).not.toMatch(/\bgrant\b/i);
    expect(code(views)).toMatch(/revoke all on schema reporting from public, anon, authenticated/i);
    expect(code(views)).toMatch(/revoke all on all tables in schema reporting from public, anon, authenticated/i);
  });

  test('the file says plainly that it is not a migration and has not been run', () => {
    expect(views).toMatch(/NOT a migration/);
    expect(views).toMatch(/has NOT been run/);
  });

  test('every view reads only from public.analytics_events and only filters on the last 30 days', () => {
    const selects = code(views).replace(/(revoke|alter default privileges)[\s\S]*?;/gi, '');
    const sources = [...selects.matchAll(/\bfrom\s+([\w.]+)/gi)].map((m) => m[1]);
    expect(sources.length).toBeGreaterThan(0);
    // The only table is analytics_events; "views", "clicks" and "onward" are the CTEs defined inside the file.
    for (const s of sources) expect(['public.analytics_events', 'views', 'clicks', 'onward']).toContain(s);
    expect(sources.filter((s) => s.startsWith('public.'))).toEqual(sources.filter((s) => s === 'public.analytics_events'));
    expect(code(views)).not.toMatch(/\bnow\(\)\s*-\s*interval '(?!30 days)/);
  });

  test('every column the views read exists in the table, and no identifier-like column is referenced', () => {
    const used = new Set(
      [...code(views).matchAll(/\b(event_hour|event_type|page_path|page_template|viewport_class|referrer_class|from_template|click_target|max_scroll|time_bucket|retain_until|id|session\w*|visitor\w*|ip\w*|user_agent)\b/g)].map((m) => m[1]),
    );
    for (const c of used) expect(tableColumns, c).toContain(c);
  });
});
