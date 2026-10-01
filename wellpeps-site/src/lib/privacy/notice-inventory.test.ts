import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { NOTICE_TOOL_IDS } from './cookie-notice-inventory';
import { FONTS_SELF_HOSTED } from './config';
import { inventoryDiff, productionTrackers, validateRegistry } from './registry';

const root = resolve(__dirname, '../../..');

describe('what the Cookie notice says vs what the site loads', () => {
  test('every tool in the registry is named in the notice, and every tool in the notice is in the registry', () => {
    const diff = inventoryDiff(NOTICE_TOOL_IDS, productionTrackers());
    expect(diff.missingFromNotice).toEqual([]);
    expect(diff.missingFromRegistry).toEqual([]);
  });

  test('the production registry is valid', () => {
    expect(() => validateRegistry(productionTrackers())).not.toThrow();
  });

  test('the fonts flag matches the layout: the panel mentions Google Fonts exactly while the layout loads them', () => {
    const layout = readFileSync(resolve(root, 'src/layouts/BaseLayout.astro'), 'utf8');
    const loadsGoogleFonts = /fonts\.(googleapis|gstatic)\.com/.test(layout);
    expect(FONTS_SELF_HOSTED).toBe(!loadsGoogleFonts);
  });
});
