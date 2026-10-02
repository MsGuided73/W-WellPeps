import { describe, expect, test } from 'vitest';
import { EBOOKS } from './ebooks';
import { GUIDE_PAGES, GUIDE_SERIES, guidePageFor, PROGRAM_BAND_COPY } from './guide-pages';
import { PROGRAM_SLUGS } from '../lib/cta';

const everyString = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(everyString) : value && typeof value === 'object' ? Object.values(value).flatMap(everyString) : [];

describe('every guide has what its landing page needs', () => {
  test('there is a page for each guide and none for a guide that does not exist', () => {
    expect(Object.keys(GUIDE_PAGES).sort()).toEqual(EBOOKS.map((b) => b.slug).sort());
  });

  for (const book of EBOOKS) {
    const page = guidePageFor(book.slug);

    test(`${book.slug}: two headline lines, an intro, eight "inside" points and six topic cards`, () => {
      expect(page.headline).toHaveLength(2);
      expect(page.headline[0]).toBe('What Every Smart Patient Needs to Know');
      expect(page.intro.length).toBeGreaterThan(80);
      expect(page.inside).toHaveLength(8);
      expect(page.topics).toHaveLength(6);
      expect(new Set(page.inside).size).toBe(8);
      expect(new Set(page.topics.map((t) => t.title)).size).toBe(6);
    });

    test(`${book.slug}: the meta description is one short sentence for search results`, () => {
      expect(page.metaDescription.length).toBeGreaterThan(80);
      expect(page.metaDescription.length).toBeLessThanOrEqual(165);
      expect(page.metaDescription.startsWith('Free Smart Patient’s Guide to ')).toBe(true);
    });

    test(`${book.slug}: the article call to action and the thank-you assessment prompt are filled in`, () => {
      expect(page.articleCta.title).toMatch(/^Want to Learn More/);
      expect(page.articleCta.body.length).toBeGreaterThan(40);
      expect(page.articleCta.button).toMatch(/^Get the Free .+ Guide$/);
      expect(page.thanks.assessmentHeading).toMatch(/^Ready to Explore/);
      expect(PROGRAM_SLUGS).toContain(page.assessmentProgram);
    });

    test(`${book.slug}: no placeholder, no straight apostrophe and no doubled space in the copy`, () => {
      for (const text of everyString(page)) {
        expect(text, text).not.toMatch(/\[[A-Z ]+\]|TODO|lorem/i);
        expect(text, text).not.toContain("'");
        expect(text, text).not.toMatch(/ {2}/);
      }
    });
  }

  test('topic icons are names the site has', () => {
    const known = new Set(['stethoscope', 'pill', 'flask', 'shield', 'receipt', 'dna', 'target', 'molecule', 'layers', 'clock', 'sparkles', 'heart', 'calendar', 'info', 'leaf', 'venn', 'droplet', 'user', 'syringe', 'zap']);
    for (const book of EBOOKS) for (const t of guidePageFor(book.slug).topics) expect(known.has(t.icon), `${book.slug}: ${t.icon}`).toBe(true);
  });
});

describe('the program-page band copy', () => {
  test('every program has a question, a body and a button label', () => {
    for (const program of PROGRAM_SLUGS) {
      const copy = PROGRAM_BAND_COPY[program];
      expect(copy.question, program).toMatch(/^Want to learn more before choosing/i);
      expect(copy.body.length, program).toBeGreaterThan(60);
      expect(copy.body, program).toContain('what to realistically expect');
    }
  });

  test('the headline and button are the same on every program', () => {
    expect(GUIDE_SERIES.bandHeadline).toBe('Become a Smart Patient. Download Our Free eBook.');
    expect(GUIDE_SERIES.bandButton).toBe('Get the Free Guide');
  });
});

describe('series copy', () => {
  test('the home and index copy is Derek’s', () => {
    expect(GUIDE_SERIES.homeTitle).toBe('What Every Smart Patient Should Know.');
    expect(GUIDE_SERIES.indexTitle).toEqual(['Better Information.', 'Better Healthcare Decisions.']);
    expect(GUIDE_SERIES.exploreAll).toBe('Explore All Smart Patient Guides');
    expect(GUIDE_SERIES.indexMeta.length).toBeLessThanOrEqual(165);
  });
});
