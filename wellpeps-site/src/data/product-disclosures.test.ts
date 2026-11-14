import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  COMPOUNDED_ARTICLE, COMPOUNDED_SENTENCE, PRODUCT_DISCLOSURES, RENEWAL_LINE, RX_LINE, SAFETY_PAGE, disclosureFor,
} from './product-disclosures';
import { hairProducts } from './hair';
import { peptideProducts } from './peptide';
import { sexProducts } from './sexual';
import { weightProducts } from './weight';
import { mensHormone, womensHormone } from './hormone';
import { PROGRAM_SLUGS, resolveCta } from '../lib/cta';
import { LEGAL_DOCS } from '../lib/legal-docs';

const productsByProgram = {
  'weight-loss': weightProducts,
  'sexual-wellness': sexProducts,
  'hair-restoration': hairProducts,
  'healthy-aging': peptideProducts,
  'mens-hormone-therapy': mensHormone.products.items,
  'womens-hormone-therapy': womensHormone.products.items,
} as const;

describe('every product on a card has a disclosure decision', () => {
  for (const program of PROGRAM_SLUGS) {
    test(`${program}: every product is listed, and nothing extra is`, () => {
      const names = productsByProgram[program].map((p) => p.name).sort();
      expect(Object.keys(PRODUCT_DISCLOSURES[program]).sort()).toEqual(names);
    });
  }

  test('an unlisted product stops the build with an instruction', () => {
    expect(() => disclosureFor('weight-loss', 'Brand New Drug')).toThrow(/Add it to PRODUCT_DISCLOSURES/);
  });
});

describe('what the decisions say (placement guide, section 4)', () => {
  test('weight-loss products, including the oral ones, are tagged compounded', () => {
    for (const n of ['Compounded Semaglutide', 'Compounded Tirzepatide', 'Oral Semaglutide', 'Oral Tirzepatide']) {
      expect(disclosureFor('weight-loss', n).regulatory, n).toBe('compounded');
    }
  });
  test('every healthy-aging product is tagged compounded', () => {
    for (const p of peptideProducts) expect(disclosureFor('healthy-aging', p.name).regulatory, p.name).toBe('compounded');
  });
  test('hair: oral minoxidil is off-label, the foams are compounded, the plain tablets and solution carry no tag', () => {
    expect(disclosureFor('hair-restoration', 'Oral Minoxidil').regulatory).toBe('off-label');
    expect(disclosureFor('hair-restoration', 'Topical Minoxidil + Finasteride').regulatory).toBe('compounded');
    expect(disclosureFor('hair-restoration', 'Topical Finasteride + Minoxidil + Tretinoin').regulatory).toBe('compounded');
    expect(disclosureFor('hair-restoration', 'Oral Finasteride').regulatory).toBeUndefined();
    expect(disclosureFor('hair-restoration', 'Topical Minoxidil').regulatory).toBeUndefined();
  });
  test('sexual wellness products warn about nitrate medicines', () => {
    for (const p of sexProducts) expect(disclosureFor('sexual-wellness', p.name).note).toBe('Not for use with nitrate medicines.');
  });
  test('the estradiol patch is not compounded; the vaginal estradiol cream and testosterone cream are (owner, 2026-11-10)', () => {
    expect(disclosureFor('womens-hormone-therapy', 'Estradiol Transdermal Patches').regulatory).toBeUndefined();
    expect(disclosureFor('womens-hormone-therapy', 'Vaginal Estradiol Cream').regulatory).toBe('compounded');
    expect(disclosureFor('mens-hormone-therapy', 'Testosterone Cream').regulatory).toBe('compounded');
  });
  test('hCG is never tagged compounded (a biologic, not compoundable under 503A/503B)', () => {
    expect(disclosureFor('mens-hormone-therapy', 'hCG').regulatory).not.toBe('compounded');
  });
  test('no product name contains "Fat Burn"', () => {
    for (const list of Object.values(productsByProgram)) for (const p of list) expect(p.name).not.toMatch(/fat burn/i);
  });
});

describe('the wording', () => {
  test('is the approved short form', () => {
    expect(RX_LINE).toBe('For eligible patients only. Medical review and prescription required.');
    expect(COMPOUNDED_SENTENCE).toBe('Compounded medications are not FDA-approved and have not been evaluated by FDA for safety, effectiveness, or quality.');
    expect(RENEWAL_LINE).toBe('Renews monthly, cancel anytime.');
  });
  test('every safety page is its own registered draft page', () => {
    const paths = new Set(LEGAL_DOCS.map((d) => `/${d.path}`));
    const pages = Object.values(SAFETY_PAGE);
    for (const page of pages) expect(paths.has(page!), page).toBe(true);
    expect(new Set(pages).size).toBe(pages.length);
  });
  test('a program cannot open for assessments without a safety page', () => {
    for (const program of PROGRAM_SLUGS) {
      if (!resolveCta(program).isComingSoon) expect(SAFETY_PAGE[program], `${program} is open but has no safety page`).toBeTruthy();
    }
  });
  test('the four launched programs keep their safety pages', () => {
    for (const program of ['weight-loss', 'sexual-wellness', 'hair-restoration', 'healthy-aging'] as const) {
      expect(SAFETY_PAGE[program], program).toBeTruthy();
    }
  });
});

describe('the compounded link', () => {
  test('goes to a Learning Center article that is in the article source', () => {
    const articles: { url_path: string; title: string }[] = JSON.parse(readFileSync(resolve(__dirname, '../../scripts/data/articles.json'), 'utf8'));
    const found = articles.find((a) => a.url_path === COMPOUNDED_ARTICLE);
    expect(found?.title).toMatch(/^Understanding Compounded Medications/);
  });
});

describe('the cards use it', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');
  for (const [file, program] of [
    ['src/components/StandardProductCard.astro', 'program={program}'],
    ['src/components/ProductCard.astro', 'program="hair-restoration"'],
    ['src/components/PeptideCard.astro', 'program="healthy-aging"'],
  ] as const) {
    test(`${file.split('/').pop()} shows the notes above the price and the renewal line under it`, () => {
      const src = read(file);
      expect(src).toContain(`part="notes" ${program}`);
      expect(src).toContain('part="renewal"');
      expect(src.indexOf('part="notes"')).toBeLessThan(src.indexOf('part="renewal"'));
    });
  }
});
