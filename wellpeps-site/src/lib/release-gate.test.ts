import { describe, expect, test } from 'vitest';
import { compareToBaseline, summarize, toBaseline } from '../../scripts/lib/legitscript-gate.mjs';

const fail = (over: Record<string, unknown> = {}) => ({ verdict: 'FAIL', kind: 'must_exist', hits: 0, missing: [] as string[], ...over });

describe('summarize', () => {
  test('flattens the source and built results into one row per check', () => {
    const s = summarize({
      src: [{ id: 'LS1-A', verdict: 'FAIL', kind: 'must_exist', hit_count: 0 }, { id: 'LS7-RX', verdict: 'FAIL', kind: 'must_exist_per_program', missing_programs: ['hair', 'aging'] }],
      built: [{ id: 'LS9-B', verdict: 'PASS', kind: 'must_not_exist', hit_count: 0 }],
    });
    const rows = s as Record<string, { verdict: string; missing: string[] }>;
    expect(Object.keys(rows).sort()).toEqual(['LS1-A', 'LS7-RX', 'LS9-B']);
    expect(rows['LS7-RX'].missing).toEqual(['aging', 'hair']);
    expect(rows['LS9-B'].verdict).toBe('PASS');
  });
  test('ignores empty or malformed rows', () => {
    expect(summarize({ src: [null, {}, { id: 'X', verdict: 'PASS' }] })).toEqual({ X: { verdict: 'PASS', kind: undefined, hits: 0, missing: [] } });
    expect(summarize({})).toEqual({});
  });
});

describe('compareToBaseline', () => {
  const baseline = {
    'LS1-A': fail(),
    'LS6-LEGAL': fail({ kind: 'must_not_exist', hits: 93 }),
    'LS7-RX': fail({ kind: 'must_exist_per_program', missing: ['hair', 'peptide'] }),
  };

  test('the same gaps are not a regression', () => {
    expect(compareToBaseline(JSON.parse(JSON.stringify(baseline)), baseline)).toEqual({ regressions: [], improvements: [] });
  });

  test('a check that fails and is not in the baseline blocks the release', () => {
    const r = compareToBaseline({ ...baseline, 'LS9-NEW': fail({ kind: 'must_not_exist', hits: 1 }) }, baseline);
    expect(r.regressions).toEqual(['LS9-NEW is a new failure']);
  });

  test('banned text increasing blocks the release; decreasing is an improvement', () => {
    const worse = compareToBaseline({ ...baseline, 'LS6-LEGAL': fail({ kind: 'must_not_exist', hits: 94 }) }, baseline);
    expect(worse.regressions).toEqual(['LS6-LEGAL got worse: 94 hits, baseline 93']);
    const better = compareToBaseline({ ...baseline, 'LS6-LEGAL': fail({ kind: 'must_not_exist', hits: 40 }) }, baseline);
    expect(better.regressions).toEqual([]);
    expect(better.improvements).toEqual(['LS6-LEGAL improved: 40 hits, baseline 93']);
  });

  test('a program newly missing its disclosure blocks the release; one fixed is an improvement', () => {
    const worse = compareToBaseline({ ...baseline, 'LS7-RX': fail({ kind: 'must_exist_per_program', missing: ['hair', 'peptide', 'weight'] }) }, baseline);
    expect(worse.regressions).toEqual(['LS7-RX is now missing more: weight']);
    const better = compareToBaseline({ ...baseline, 'LS7-RX': fail({ kind: 'must_exist_per_program', missing: ['peptide'] }) }, baseline);
    expect(better.improvements).toEqual(['LS7-RX now has hair']);
  });

  test('a baseline gap that now passes is an improvement, not a failure', () => {
    const r = compareToBaseline({ ...baseline, 'LS1-A': { verdict: 'PASS', kind: 'must_exist', hits: 3, missing: [] } }, baseline);
    expect(r).toEqual({ regressions: [], improvements: ['LS1-A now passes'] });
  });

  test('a check that disappears from the scanner is flagged, so a gap cannot be hidden by deleting its check', () => {
    const { 'LS1-A': _gone, ...rest } = JSON.parse(JSON.stringify(baseline));
    const r = compareToBaseline(rest, baseline);
    expect(r.regressions).toHaveLength(1);
    expect(r.regressions[0]).toMatch(/LS1-A is in the baseline but the scanner no longer runs it/);
  });
});

describe('toBaseline', () => {
  test('records only the failing checks', () => {
    const b = toBaseline({ A: fail({ hits: 2 }), B: { verdict: 'PASS', kind: 'must_exist', hits: 1, missing: [] } }, '2026-10-01');
    expect(Object.keys(b.checks)).toEqual(['A']);
    expect(b.scannedOn).toBe('2026-10-01');
  });
});
