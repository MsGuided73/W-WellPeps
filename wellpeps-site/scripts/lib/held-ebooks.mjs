/**
 * Leaves the files of held guides out of the build. A guide that is built but not yet released
 * (src/data/held-ebooks.json) has no page and no link, but its PDF and page images live in public/ebooks/,
 * and everything in public/ is copied into dist/ and would be reachable by a direct address. This removes
 * dist/ebooks/<slug>.pdf and dist/ebooks/<slug>/ for each held slug after the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function heldEbookSlugs(root) {
  const file = path.join(root, 'src/data/held-ebooks.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).slugs;
}

export function heldEbooksIntegration() {
  return {
    name: 'wellpeps-held-ebooks',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const root = path.resolve(dist, '..');
        for (const slug of heldEbookSlugs(root)) {
          for (const target of [path.join(dist, 'ebooks', `${slug}.pdf`), path.join(dist, 'ebooks', slug)]) {
            if (fs.existsSync(target)) {
              fs.rmSync(target, { recursive: true, force: true });
              logger.info(`held guide left out of the build: ${path.relative(dist, target)}`);
            }
          }
        }
      },
    },
  };
}
