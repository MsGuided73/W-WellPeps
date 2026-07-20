/**
 * Convert delivered photography (PNG/JPG) to WebP.
 *
 * Design assets arrive as PNG, which is lossless and meant for flat-colour
 * graphics — for photographs it produces files roughly 30-40x larger than
 * needed. This converts them in place and removes the original.
 *
 *   npm run images            convert everything under public/images
 *   npm run images -- --dry   preview: show what would change, touch nothing
 *   npm run images -- --keep  convert but keep the original files
 *   npm run images -- --dir=public/images/peptide   limit to one folder
 *
 * Dimensions are never changed. Logos and icons are skipped: lossy
 * compression softens their crisp edges and saves almost nothing.
 */
import sharp from 'sharp';
import { readdirSync, statSync, existsSync, unlinkSync } from 'fs';
import { join, relative, sep } from 'path';

const QUALITY = 82;
// Files matching this keep their lossless original.
const SKIP = /logo|wordmark|w-mark|icon|seal|legitscript|favicon/i;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const keep = args.includes('--keep');
const dirArg = args.find((a) => a.startsWith('--dir='));
const root = dirArg ? dirArg.slice(6) : 'public/images';

if (!existsSync(root)) {
  console.error(`Folder not found: ${root}`);
  process.exit(1);
}

const walk = (d, acc = []) => {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const mb = (bytes) => (bytes / 1048576).toFixed(2);
const all = walk(root);
const targets = all.filter((f) => /\.(png|jpe?g)$/i.test(f) && !SKIP.test(f));
const skipped = all.filter((f) => /\.(png|jpe?g)$/i.test(f) && SKIP.test(f));

if (targets.length === 0) {
  console.log(`Nothing to convert in ${root} — all photography is already WebP.`);
  if (skipped.length) console.log(`(${skipped.length} logo/icon files left as-is by design.)`);
  process.exit(0);
}

console.log(`${dry ? '[DRY RUN] ' : ''}Converting ${targets.length} file(s) at quality ${QUALITY}\n`);

let before = 0;
let after = 0;
const failures = [];

for (const file of targets) {
  const out = file.replace(/\.(png|jpe?g)$/i, '.webp');
  const shortName = relative(root, file).split(sep).join('/');
  const sourceSize = statSync(file).size;

  if (existsSync(out)) {
    failures.push(`${shortName} — a .webp of the same name already exists; skipped`);
    continue;
  }

  try {
    const meta = await sharp(file).metadata();
    if (dry) {
      console.log(`  ${mb(sourceSize).padStart(6)} MB  ${meta.width}x${meta.height}  ${shortName}`);
      before += sourceSize;
      continue;
    }

    await sharp(file).webp({ quality: QUALITY, effort: 6 }).toFile(out);

    // Only remove the original once the output is confirmed intact.
    const outMeta = await sharp(out).metadata();
    if (outMeta.width !== meta.width || outMeta.height !== meta.height) {
      failures.push(`${shortName} — dimensions changed, original kept`);
      continue;
    }

    const outSize = statSync(out).size;
    before += sourceSize;
    after += outSize;
    if (!keep) unlinkSync(file);

    console.log(`  ${mb(sourceSize).padStart(6)} -> ${mb(outSize).padStart(6)} MB  ${meta.width}x${meta.height}  ${shortName}`);
  } catch (err) {
    failures.push(`${shortName} — ${err.message}`);
  }
}

console.log('');
if (dry) {
  console.log(`Would convert ${mb(before)} MB. Re-run without --dry to apply.`);
} else {
  const saved = before - after;
  const pct = before ? ((saved / before) * 100).toFixed(1) : '0';
  console.log(`${mb(before)} MB -> ${mb(after)} MB  (${pct}% smaller, ${mb(saved)} MB saved)`);
  if (keep) console.log('Originals kept (--keep).');
}
if (skipped.length) console.log(`${skipped.length} logo/icon file(s) left lossless by design.`);
if (failures.length) {
  console.log(`\n${failures.length} needed attention:`);
  failures.forEach((f) => console.log('  ' + f));
}
console.log('\nNext: update any references to the old extension, then `npm run build`.');
