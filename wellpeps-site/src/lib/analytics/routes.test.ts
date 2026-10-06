import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { isSensitivePath } from '../privacy/consent';
import { UNMATCHED_PATH } from './model';
import { pageTemplateOf, sanitizePage } from './sanitize';

/**
 * The analytics tool reports a path only for a page this site is known to have;
 * anything else is sent as /_unmatched (so text typed into the address bar can
 * never be reported). The known pages are listed in sanitize.ts. This test walks
 * src/pages so that a NEW page fails here until it is added there, instead of
 * quietly being counted as "unmatched" forever.
 */
const pagesDir = resolve(__dirname, '../../pages');

/** Pages that never load the privacy control (the pre-launch gate) or exist only for development. */
const NOT_TRACKED = new Set(['preview-access', 'dev-mockups']);

const routes = readdirSync(pagesDir, { withFileTypes: true })
  .map((e) => (e.isDirectory() ? e.name : e.name.replace(/\.astro$/, '')))
  .filter((name) => name !== 'index' && !name.startsWith('[') && !NOT_TRACKED.has(name));

describe('every page of the site is known to the analytics tool', () => {
  test('the walk found the pages (a sanity check on the test itself)', () => {
    // /privacy-policy and the other released legal documents are served by the [...doc] route, not their own page files.
    expect(routes).toEqual(expect.arrayContaining(['weight-loss', 'your-privacy-choices', 'wellness-learning-center']));
  });

  test.each(routes)('/%s is reported by its own path with a real template, not as unmatched', (name) => {
    const { path, template } = sanitizePage(`/${name}`);
    expect(path, `add /${name} to the known pages in src/lib/analytics/sanitize.ts`).not.toBe(UNMATCHED_PATH);
    expect(path).toBe(`/${name}`);
    expect(template).not.toBe('other');
  });

  test('the home page and a Learning Center article are known', () => {
    expect(sanitizePage('/')).toEqual({ path: '/', template: 'home' });
    expect(sanitizePage('/wellness-learning-center/any-article-slug').template).toBe('learning_center_article');
  });

  test('every health-topic section the consent rules know about has a program or learning-center template', () => {
    for (const name of routes) {
      if (!isSensitivePath(`/${name}`)) continue;
      expect(['program', 'learning_center_index', 'learning_center_article'], `/${name}`).toContain(pageTemplateOf(`/${name}`));
    }
  });

  test('pages that are not part of the site are not reported', () => {
    for (const name of NOT_TRACKED) expect(sanitizePage(`/${name}`).path).toBe(UNMATCHED_PATH);
  });
});
