import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

// Bing Webmaster (2026-11-19) flags every <img> with an empty alt as "Missing ALT text", including decorative
// icons. Every image gets a description; one that repeats text beside it (an icon over its label, a guide cover
// next to its title) also gets aria-hidden="true" so screen readers do not read it twice.
const src = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function astroFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'dev-mockups' ? [] : astroFiles(path);
    return name.endsWith('.astro') ? [path] : [];
  });
}

describe('every image has alt text', () => {
  test('no component or page writes an empty alt', () => {
    const offenders = astroFiles(src).filter((f) => /\balt=(""|''|\{\s*(''|"")\s*\})/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
