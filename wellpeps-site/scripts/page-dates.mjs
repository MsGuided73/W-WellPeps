/**
 * Last-changed dates for pages that show no "Last updated" stamp and carry no JSON-LD dateModified, so the
 * sitemap can still give them an honest <lastmod>: the date of the newest git commit that touched the page's
 * own source files (the page file plus the content sections it imports directly; the shared layout, header
 * and footer are left out because they change every page at once).
 *
 * The production image is built without .git (.dockerignore), so the dates are written to
 * src/data/page-dates.json and committed. Regenerate after changing one of these pages:
 *   node scripts/page-dates.mjs          (writes the file)
 *   node scripts/page-dates.mjs --check  (exits 1 if the file is out of date; run by check:seo when git is present)
 *
 * /wellness-learning-center/ is not listed: its article list comes from the database, so a file date would
 * not say when the page last changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src/data/page-dates.json');

const LOCAL_IMPORT = /^import\s+[^'"]*['"](\.[^'"]+)['"]/gm;
const SHARED = /\/(layouts|lib)\/|\/config(\.ts)?$|\/(Icon|AssessmentCta)\.astro$/;

/** The page file plus its direct relative imports, minus shared chrome. Paths relative to the site root. */
function sourcesOf(pageRel) {
  const abs = path.join(root, pageRel);
  const out = [pageRel];
  for (const m of fs.readFileSync(abs, 'utf8').matchAll(LOCAL_IMPORT)) {
    let dep = path.resolve(path.dirname(abs), m[1]);
    if (SHARED.test(dep)) continue;
    if (!fs.existsSync(dep)) dep = ['.ts', '.json', '.mjs'].map((e) => dep + e).find((p) => fs.existsSync(p));
    if (dep) out.push(path.relative(root, dep));
  }
  return out;
}

export const PAGES = {
  '/': 'src/pages/index.astro',
  '/weight-loss/': 'src/pages/weight-loss.astro',
  '/your-plan/': 'src/pages/your-plan.astro',
  '/why-wellpeps/': 'src/pages/why-wellpeps.astro',
  '/healthy-aging/': 'src/pages/healthy-aging.astro',
  '/sexual-wellness/': 'src/pages/sexual-wellness.astro',
  '/hair-restoration/': 'src/pages/hair-restoration.astro',
  '/hormone-optimization/': 'src/pages/hormone-optimization.astro',
  '/your-privacy-choices/': 'src/pages/your-privacy-choices.astro',
  '/smart-patient-guides/': 'src/pages/smart-patient-guides/[...path].astro',
  '/patient-information/': 'src/pages/[...doc].astro',
};

function gitDate(files) {
  const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out)) throw new Error(`no git date for ${files.join(', ')}`);
  return out;
}

export function computePageDates() {
  return Object.fromEntries(Object.entries(PAGES).map(([url, page]) => [url, gitDate(sourcesOf(page))]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fresh = JSON.stringify(computePageDates(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== fresh) { console.error('src/data/page-dates.json is out of date: run `node scripts/page-dates.mjs`'); process.exit(1); }
    console.log('page-dates.json is current');
  } else {
    fs.writeFileSync(OUT, fresh);
    console.log(fresh);
  }
}
