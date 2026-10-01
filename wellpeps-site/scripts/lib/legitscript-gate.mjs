/**
 * Turns the LegitScript disclosure scanner's output into a release gate.
 *
 * The scanner (.claude/skills/legitscript-audit/scripts/disclosure_scan.py) says, check by
 * check, whether a required disclosure exists. Today several checks truthfully FAIL: the work
 * to close them is on the compliance build list. So the gate is a regression guard against a
 * recorded baseline of those known gaps:
 *
 *   - a check that is not in the baseline now fails          -> regression, release blocked
 *   - a check already failing gets worse (more banned text,
 *     more programs missing a disclosure)                    -> regression, release blocked
 *   - a check in the baseline now passes                     -> improvement (tighten the baseline)
 *
 * `--update-baseline` rewrites the baseline from the current scan; do that only when a gap is
 * really closed, in the same change that closes it.
 */

/** One row per check: id, verdict, how many hits and which programs are missing. */
export function summarize(scan) {
  const rows = [...(scan.src ?? []), ...(scan.built ?? [])].filter((r) => r && typeof r === 'object' && r.id);
  const out = {};
  for (const r of rows) {
    out[r.id] = {
      verdict: r.verdict,
      kind: r.kind,
      hits: typeof r.hit_count === 'number' ? r.hit_count : 0,
      missing: Array.isArray(r.missing_programs) ? [...r.missing_programs].sort() : [],
    };
  }
  return out;
}

/** Compare the current summary with the baseline. Pure: no files, no clock. */
export function compareToBaseline(current, baseline) {
  const regressions = [];
  const improvements = [];
  for (const [id, now] of Object.entries(current)) {
    const was = baseline[id];
    if (now.verdict !== 'FAIL') {
      if (was && was.verdict === 'FAIL') improvements.push(`${id} now passes`);
      continue;
    }
    if (!was || was.verdict !== 'FAIL') {
      regressions.push(`${id} is a new failure${now.missing.length ? ` (missing: ${now.missing.join(', ')})` : ''}`);
      continue;
    }
    if (now.kind === 'must_not_exist' && now.hits > was.hits) {
      regressions.push(`${id} got worse: ${now.hits} hits, baseline ${was.hits}`);
    }
    const newlyMissing = now.missing.filter((p) => !was.missing.includes(p));
    if (newlyMissing.length) regressions.push(`${id} is now missing more: ${newlyMissing.join(', ')}`);
    const fixed = was.missing.filter((p) => !now.missing.includes(p));
    if (fixed.length) improvements.push(`${id} now has ${fixed.join(', ')}`);
    if (now.kind === 'must_not_exist' && now.hits < was.hits) improvements.push(`${id} improved: ${now.hits} hits, baseline ${was.hits}`);
  }
  for (const id of Object.keys(baseline)) {
    if (!(id in current)) regressions.push(`${id} is in the baseline but the scanner no longer runs it (was the check removed?)`);
  }
  return { regressions, improvements };
}

/** The baseline file's content for a scan: only failing checks, with the numbers the compare uses. */
export function toBaseline(current, scannedOn) {
  const checks = {};
  for (const [id, v] of Object.entries(current)) {
    if (v.verdict === 'FAIL') checks[id] = v;
  }
  return {
    note: 'Known LegitScript disclosure gaps. The release gate fails if a check not listed here fails, or a listed one gets worse. Update only when a gap is really closed (node scripts/release-check.mjs --update-baseline).',
    scannedOn,
    checks,
  };
}
