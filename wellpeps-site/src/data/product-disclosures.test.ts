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
import { PROGRAM_SLUGS } from '../lib/cta';
import { LEGAL_DOCS } from '../lib/legal-docs';

const productsByProgram = {
  'weight-loss': weightProducts,
  'sexual-wellness': sexProducts,
  'hair-restoration': hairProducts,
  'healthy-aging': peptideProducts,
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
  test('every program links to its own safety page, and each is a registered draft page', () => {
    const paths = new Set(LEGAL_DOCS.map((d) => `/${d.path}`));
    for (const program of PROGRAM_SLUGS) expect(paths.has(SAFETY_PAGE[program]), program).toBe(true);
    expect(new Set(Object.values(SAFETY_PAGE)).size).toBe(4);
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
