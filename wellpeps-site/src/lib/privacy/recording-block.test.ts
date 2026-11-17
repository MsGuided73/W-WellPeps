/**
 * The privacy notices promise that what a visitor does is never tied to who they are. Curve's
 * session recorder (src/lib/privacy/trackers/curve.ts) masks typed input by default, but that is a
 * setting on Curve's side. Its recorder also skips any element with the class `ct-block`
 * entirely, so every form that can take a name, an email address, a password or a free-text
 * question carries that class, and so does the AI assistant panel. This test keeps it that way.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const SRC = join(__dirname, '..', '..');

function astroFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return astroFiles(path);
    return path.endsWith('.astro') ? [path] : [];
  });
}

/** Forms that take no personal details: the Learning Center search box. */
const EXEMPT = [/role="search"/];

describe('the recorder never sees what visitors type', () => {
  const forms = astroFiles(SRC).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/<form\b[^>]*>/g)].map((m) => ({ file: file.slice(SRC.length + 1), tag: m[0] })),
  );

  test('the site has forms to check', () => {
    expect(forms.length).toBeGreaterThan(5);
  });

  test.each(forms.filter((f) => !EXEMPT.some((re) => re.test(f.tag))).map((f) => [f.file, f.tag]))('%s carries ct-block', (_file, tag) => {
    expect(tag).toMatch(/class="[^"]*\bct-block\b/);
  });

  test('the AI assistant panel carries ct-block', () => {
    expect(readFileSync(join(SRC, 'components', 'Assistant.astro'), 'utf8')).toMatch(/<section class="wa__panel ct-block"/);
  });
});
