import { describe, expect, test } from 'vitest';
import { EBOOKS } from '../data/ebooks';
import { isSensitivePath } from './privacy/consent';
import { GUIDES_INDEX_PATH, guideForArticle, guidePath, guideThanksPath, parseGuideFlow, keepGlpTogether, primaryGuideFor, splitAtMiddleSection } from './guide-flow';

describe('which guide flow is on', () => {
  test('the current dialog flow is the default for anything but "landing"', () => {
    expect(parseGuideFlow(undefined)).toBe('dialog');
    expect(parseGuideFlow('')).toBe('dialog');
    expect(parseGuideFlow('dialog')).toBe('dialog');
    expect(parseGuideFlow('true')).toBe('dialog');
    expect(parseGuideFlow(42)).toBe('dialog');
  });

  test('"landing" turns the landing-page flow on, whatever the case or spacing', () => {
    expect(parseGuideFlow('landing')).toBe('landing');
    expect(parseGuideFlow(' Landing ')).toBe('landing');
    expect(parseGuideFlow('LANDING')).toBe('landing');
  });
});

describe('guide addresses', () => {
  test('the index, a guide and its thank-you page nest under one path', () => {
    expect(GUIDES_INDEX_PATH).toBe('/smart-patient-guides');
    expect(guidePath('glp-1-weight-loss')).toBe('/smart-patient-guides/glp-1-weight-loss');
    expect(guideThanksPath('glp-1-weight-loss')).toBe('/smart-patient-guides/glp-1-weight-loss/thank-you');
  });

  test('every guide has a clean, lowercase, hyphenated slug', () => {
    for (const book of EBOOKS) expect(book.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('the guide a program page promotes', () => {
  test('each program gets its own guide', () => {
    expect(primaryGuideFor('weight-loss')?.slug).toBe('glp-1-weight-loss');
    expect(primaryGuideFor('hair-restoration')?.slug).toBe('hair-restoration');
    expect(primaryGuideFor('sexual-wellness')?.slug).toBe('sexual-wellness');
  });

  test('Healthy Aging promotes its own guide first, not the NAD+ one', () => {
    expect(primaryGuideFor('healthy-aging')?.slug).toBe('healthy-aging-vitality');
  });
});

describe('the guide an article points to', () => {
  const article = (category: string, slug = 'an-article', title = 'An article') => ({ slug, title, category: { slug: category } });

  test('a Learning Center category maps to its program guide', () => {
    expect(guideForArticle(article('weight-management'))?.slug).toBe('glp-1-weight-loss');
    expect(guideForArticle(article('sexual-wellness'))?.slug).toBe('sexual-wellness');
    expect(guideForArticle(article('hair-restoration'))?.slug).toBe('hair-restoration');
    expect(guideForArticle(article('peptides-wellness'))?.slug).toBe('healthy-aging-vitality');
  });

  test('an article about NAD+ in the healthy-aging category gets the NAD+ guide', () => {
    expect(guideForArticle(article('peptides-wellness', 'what-is-nad-therapy', 'What Is NAD+ Therapy?'))?.slug).toBe('nad-therapy');
    expect(guideForArticle(article('peptides-wellness', 'nad-vs-nmn', 'NAD vs NMN'))?.slug).toBe('nad-therapy');
  });

  test('a word that merely contains "nad" does not', () => {
    expect(guideForArticle(article('peptides-wellness', 'canada-shipping', 'Shipping to Canada and beyond'))?.slug).toBe('healthy-aging-vitality');
  });

  test('NAD+ matching only applies in the healthy-aging category', () => {
    expect(guideForArticle(article('weight-management', 'nad-and-weight', 'NAD+ and weight'))?.slug).toBe('glp-1-weight-loss');
  });

  test('categories with no guide get none', () => {
    expect(guideForArticle(article('wellness-foundations'))).toBeUndefined();
    expect(guideForArticle(article('telehealth-resources'))).toBeUndefined();
    expect(guideForArticle(article('something-new'))).toBeUndefined();
  });
});

describe('placing a call to action halfway through an article', () => {
  const section = (n: number) => `<h2 id="s${n}">Section ${n}</h2><p>Text ${n}</p>`;
  const article = (count: number) => Array.from({ length: count }, (_, i) => section(i + 1)).join('');

  test('splits before a section heading, and the two halves rebuild the article', () => {
    for (const count of [2, 3, 4, 5, 6, 9]) {
      const html = article(count);
      const [before, after] = splitAtMiddleSection(html);
      expect(before + after, `${count} sections`).toBe(html);
      expect(after.startsWith('<h2'), `${count} sections`).toBe(true);
    }
  });

  test('breaks about halfway, never before the first section', () => {
    expect(splitAtMiddleSection(article(2))[0]).toBe(section(1));
    expect(splitAtMiddleSection(article(4))[0]).toBe(section(1) + section(2));
    expect(splitAtMiddleSection(article(6))[0]).toBe(section(1) + section(2) + section(3));
  });

  test('an article with fewer than two sections is left whole', () => {
    expect(splitAtMiddleSection('<p>Only text</p>')).toEqual(['<p>Only text</p>', '']);
    expect(splitAtMiddleSection(article(1))).toEqual([article(1), '']);
    expect(splitAtMiddleSection('')).toEqual(['', '']);
  });

  test('an intro before the first heading stays in the first half', () => {
    const html = `<p>Intro</p>${article(4)}`;
    expect(splitAtMiddleSection(html)[0].startsWith('<p>Intro</p>')).toBe(true);
  });

  test('a heading level other than h2 is not a split point', () => {
    const html = `${section(1)}<h3>Sub</h3><p>x</p>${section(2)}`;
    expect(splitAtMiddleSection(html)[1].startsWith('<h2 id="s2"')).toBe(true);
  });
});

describe('keeping GLP-1 on one line', () => {
  test('wraps each GLP-1 and leaves its characters alone', () => {
    expect(keepGlpTogether('Choose a GLP-1 program')).toBe('Choose a <span class="nb">GLP-1</span> program');
    expect(keepGlpTogether('GLP-1 and GLP-1')).toBe('<span class="nb">GLP-1</span> and <span class="nb">GLP-1</span>');
    expect(keepGlpTogether('No such term').includes('<span')).toBe(false);
  });

  test('escapes markup in the text, so the helper is safe to use with set:html', () => {
    expect(keepGlpTogether('Fish & chips <b>"x"</b>')).toBe('Fish &amp; chips &lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});

describe('the guide pages are health-topic pages', () => {
  test('the series, each guide and each thank-you page count as sensitive, so no advertising runs there', () => {
    expect(isSensitivePath(GUIDES_INDEX_PATH)).toBe(true);
    for (const book of EBOOKS) {
      expect(isSensitivePath(guidePath(book.slug)), book.slug).toBe(true);
      expect(isSensitivePath(guideThanksPath(book.slug)), book.slug).toBe(true);
    }
  });
});
