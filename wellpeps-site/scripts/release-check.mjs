/**
 * Release check (compliance build list W12): run before every release, and in CI on every push.
 *
 *   node scripts/release-check.mjs                 tests, type check, production build, LegitScript scan
 *   node scripts/release-check.mjs --browser       also the strict-policy browser check (needs Chromium)
 *   node scripts/release-check.mjs --live          also scan production for repo-versus-live drift
 *   node scripts/release-check.mjs --update-baseline   record the current LegitScript gaps (only when a gap is closed)
 *
 * It builds the site the way production does (draft legal pages OFF), so it checks what visitors
 * would get. Every step runs even if an earlier one fails, so one run shows everything that is
 * wrong. Exit code 1 if anything failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareToBaseline, summarize, toBaseline } from './lib/legitscript-gate.mjs';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(SITE, '..');
const SCANNER = join(REPO, '.claude', 'skills', 'legitscript-audit', 'scripts', 'disclosure_scan.py');
const BASELINE = join(SITE, 'scripts', 'legitscript-baseline.json');
const args = new Set(process.argv.slice(2));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const results = [];
function step(name, fn) {
  console.log(`\n=== ${name} ===`);
  let ok = false;
  try {
    ok = fn() !== false;
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
  results.push({ name, ok });
  console.log(ok ? `  -> OK` : `  -> FAILED`);
}

function run(cmd, cmdArgs, extra = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: SITE, stdio: 'inherit', shell: process.platform === 'win32', ...extra });
  return r.status === 0;
}

function python() {
  for (const bin of ['python3', 'python']) {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
    if (r.status === 0) return bin;
  }
  return null;
}

step('Unit tests (includes the claims guard, the header tests and the legal-document hygiene tests)', () => run(npm, ['test', '--silent']));
step('Type check', () => run(npm, ['run', 'typecheck', '--silent']));
step('Production build (draft legal pages off)', () => {
  // Forced off: the check judges what the live site will be after launch, whatever the pre-launch default is.
  const env = { ...process.env, SHOW_DRAFT_PAGES: 'false' };
  return run(npm, ['run', 'build', '--silent'], { env });
});

step('LegitScript disclosure scan against the recorded gaps', () => {
  const py = python();
  if (!py) throw new Error('Python 3 is needed for the scanner (python3 or python on PATH)');
  if (!existsSync(SCANNER)) throw new Error(`scanner not found: ${SCANNER}`);
  const out = join(mkdtempSync(join(tmpdir(), 'ls-scan-')), 'scan.json');
  const scanArgs = [SCANNER, '--src', '--built', '--out', out];
  const r = spawnSync(py, scanArgs, { cwd: REPO, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (!existsSync(out)) throw new Error(`the scanner wrote no result (exit ${r.status}): ${(r.stderr || '').slice(0, 300)}`);
  const current = summarize(JSON.parse(readFileSync(out, 'utf8')));

  if (args.has('--update-baseline')) {
    writeFileSync(BASELINE, JSON.stringify(toBaseline(current, new Date().toISOString().slice(0, 10)), null, 2) + '\n');
    console.log(`  baseline rewritten with ${Object.values(current).filter((v) => v.verdict === 'FAIL').length} known gaps`);
    return true;
  }
  if (!existsSync(BASELINE)) throw new Error('no baseline yet: run with --update-baseline once');
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).checks ?? {};
  const { regressions, improvements } = compareToBaseline(current, baseline);
  const known = Object.values(current).filter((v) => v.verdict === 'FAIL').length;
  console.log(`  ${known} known disclosure gaps (listed in scripts/legitscript-baseline.json); none may get worse or be added.`);
  for (const i of improvements) console.log(`  IMPROVED: ${i}  (run --update-baseline in the change that closed it)`);
  for (const g of regressions) console.log(`  REGRESSION: ${g}`);
  return regressions.length === 0;
});

if (args.has('--browser')) {
  step('Strict-policy browser check (CSP, security headers, interactive pieces)', () => run('node', ['scripts/security-headers-check.mjs']));
}

if (args.has('--live')) {
  step('LegitScript scan of production (repo versus live drift)', () => {
    const py = python();
    if (!py) throw new Error('Python 3 needed');
    const r = spawnSync(py, [SCANNER, '--live'], { cwd: REPO, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    return r.status === 0;
  });
}

console.log('\n=== Summary ===');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\nRelease check FAILED (${failed} of ${results.length} steps)` : '\nRelease check passed');
process.exit(failed ? 1 : 0);
