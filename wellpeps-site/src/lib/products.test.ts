import { describe, expect, test } from 'vitest';
import { weightProducts } from '../data/weight';
import { hairProducts } from '../data/hair';
import { sexProducts } from '../data/sexual';
import { peptideProducts } from '../data/peptide';
import { mensHormone, womensHormone } from '../data/hormone';
import { disclosureFor } from '../data/product-disclosures';
import { CTA_LINKS } from '../config';
import { isLinked } from './links';
import { toProductKey, type ProgramSlug } from './cta';
import { peptidesPage } from '../data/peptides';
import {
  PRODUCT_PAGES, descriptionCuts, metaDescription, pageTitle, productPath, productRoutes, productSlug, termsItems,
} from './products';

/** Every card's product name (the name its CTA uses), per program, read straight from the data files. */
const CARD_PRODUCTS: Record<ProgramSlug, string[]> = {
  'weight-loss': weightProducts.map((p) => p.name),
  'hair-restoration': hairProducts.map((p) => p.name),
  'sexual-wellness': sexProducts.map((p) => p.name),
  'healthy-aging': peptideProducts.flatMap((p) => (p.variants && p.variants.length > 1 ? p.variants.map((v) => v.product) : [p.name])),
  'mens-hormone-therapy': mensHormone.products.items.map((p) => p.name),
  'womens-hormone-therapy': womensHormone.products.items.map((p) => p.name),
  peptides: peptidesPage.products.items.map((p) => p.name),
};

describe('product pages', () => {
  test('every product in every data file has exactly one page', () => {
    for (const [program, names] of Object.entries(CARD_PRODUCTS) as [ProgramSlug, string[]][]) {
      for (const name of names) {
        const pages = PRODUCT_PAGES.filter((p) => p.program === program && p.product === name);
        expect(pages, `${program} / ${name}`).toHaveLength(1);
      }
      expect(PRODUCT_PAGES.filter((p) => p.program === program)).toHaveLength(names.length);
    }
  });

  test('NAD+ injection and NAD+ nasal spray are separate pages', () => {
    const nad = PRODUCT_PAGES.filter((p) => p.program === 'healthy-aging' && p.name === 'NAD+').map((p) => p.slug);
    expect(nad.sort()).toEqual(['nad-injection', 'nad-nasal-spray']);
  });

  test('slugs are unique within each program and URL-safe', () => {
    for (const program of Object.keys(CARD_PRODUCTS)) {
      const slugs = PRODUCT_PAGES.filter((p) => p.program === program).map((p) => p.slug);
      expect(new Set(slugs).size, program).toBe(slugs.length);
      for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test('the slug function is stable', () => {
    expect(productSlug('Topical Minoxidil + Finasteride')).toBe('topical-minoxidil-finasteride');
    expect(productSlug('MIC + B12')).toBe('mic-b12');
    expect(productSlug('hCG')).toBe('hcg');
  });

  test('every page has a disclosure decision, alt text and the card description', () => {
    for (const p of PRODUCT_PAGES) {
      expect(p.disclosure, p.path).toBe(disclosureFor(p.program, p.name));
      expect(p.alt.trim(), p.path).not.toBe('');
      expect(p.description.trim(), p.path).not.toBe('');
      expect(p.image, p.path).toMatch(/^\/images\//);
    }
  });

  test('a plan with a price and a live link is not coming soon; one without either is', () => {
    for (const page of PRODUCT_PAGES) {
      for (const plan of page.plans) {
        const live = Boolean(plan.price) && isLinked(CTA_LINKS.products[toProductKey(plan.product)]?.url ?? '');
        expect(plan.isLive, `${page.path} ${plan.label}`).toBe(live);
      }
      expect(page.isComingSoon, page.path).toBe(page.plans.every((pl) => !pl.isLive));
    }
  });

  test('Testosterone Cypionate is one page with a 1-month and a 3-month plan', () => {
    const t = PRODUCT_PAGES.find((p) => p.slug === 'testosterone-cypionate');
    expect(t?.plans.map((p) => [p.label, p.priceUnit])).toEqual([['1 month', '/month'], ['3 months', '/3 months']]);
  });

  test('healthy-aging pages use the vial image; the others use the product photo', () => {
    for (const p of PRODUCT_PAGES) expect(p.imageStyle, p.path).toBe(p.program === 'healthy-aging' ? 'vial' : 'photo');
  });

  test('productPath matches the generated route', () => {
    for (const { params, props } of productRoutes()) {
      const route = `/${params.program}/${params.product}/`;
      expect(props.page.path).toBe(route);
      expect(productPath(params.program, props.page.product)).toBe(route);
    }
    expect(productPath('mens-hormone-therapy', 'Testosterone Cypionate 3 Month')).toBe('/mens-hormone-therapy/testosterone-cypionate/');
    expect(productPath('healthy-aging', 'NAD+')).toBe('/healthy-aging/nad-injection/');
    expect(() => productPath('weight-loss', 'Brand New Drug')).toThrow(/No product page/);
  });

  test('titles and meta descriptions are unique, sized for search and end with the prescription line', () => {
    const titles = PRODUCT_PAGES.map(pageTitle);
    const descs = PRODUCT_PAGES.map(metaDescription);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
    for (const t of titles) expect(t.length, t).toBeLessThanOrEqual(60);
    for (const d of descs) {
      expect(d.length, d).toBeGreaterThanOrEqual(110);
      expect(d.length, d).toBeLessThanOrEqual(160);
      expect(d).toMatch(/(Prescription required\.|Prescribed only if a licensed clinician finds it appropriate\.)$/);
    }
  });

  test('a meta description adds nothing to the card description but the product name and the closing line', () => {
    for (const page of PRODUCT_PAGES) {
      const body = metaDescription(page)
        .replace(/ (Prescription required\.|Prescribed only if a licensed clinician finds it appropriate\.)$/, '')
        .replace(`${page.title}: `, '')
        .replace(/\.$/, '');
      expect(page.description.replace(/\s+/g, ' ').startsWith(body), `${page.path}: ${body}`).toBe(true);
    }
  });

  test('a long description is cut at a sentence or clause, never inside a list', () => {
    expect(descriptionCuts('One thing. Another thing.')).toEqual(['One thing. Another thing.', 'One thing.']);
    expect(descriptionCuts('It combines a, b and c with d, an essential nutrient.')).toContain('It combines a, b and c with d.');
    expect(descriptionCuts('Two medications in one foam: one does this, and one does that.')[1]).toBe('Two medications in one foam.');
  });

  test('the price terms split into check-list items', () => {
    expect(termsItems('Includes your clinician’s review and follow-ups, prescribed medication and shipping, and messaging with your care team. Full refund if not prescribed.'))
      .toEqual(['Your clinician’s review and follow-ups', 'Prescribed medication and shipping', 'Messaging with your care team', 'Full refund if not prescribed.']);
  });
});
