import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { NOTICE_TOOL_IDS } from './cookie-notice-inventory';
import { FONTS_SELF_HOSTED } from './config';
import { inventoryDiff, productionTrackers, validateRegistry } from './registry';

const root = resolve(__dirname, '../../..');

/** Every layout, page, component and stylesheet, so a Google font link cannot hide anywhere. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(astro|ts|css|html|mjs)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

describe('what the Cookie notice says vs what the site loads', () => {
  test('every tool in the registry is named in the notice, and every tool in the notice is in the registry', () => {
    const diff = inventoryDiff(NOTICE_TOOL_IDS, productionTrackers());
    expect(diff.missingFromNotice).toEqual([]);
    expect(diff.missingFromRegistry).toEqual([]);
  });

  test('the production registry is valid', () => {
    expect(() => validateRegistry(productionTrackers())).not.toThrow();
  });

  test('the fonts flag matches the site: the panel mentions Google Fonts exactly while anything loads them', () => {
    const loadsGoogleFonts = sourceFiles(resolve(root, 'src')).some((f) =>
      /fonts\.(googleapis|gstatic)\.com/.test(readFileSync(f, 'utf8')),
    );
    expect(FONTS_SELF_HOSTED).toBe(!loadsGoogleFonts);
  });

  test('the site serves its own copy of each font it declares', () => {
    const css = readFileSync(resolve(root, 'src/styles/fonts.css'), 'utf8');
    const files = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => resolve(root, 'src/styles', m[1]));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) expect(existsSync(f), f).toBe(true);
  });
});
