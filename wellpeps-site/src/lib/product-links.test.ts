import { describe, expect, test } from 'vitest';
import { LIVE_PRODUCTS, PRODUCT_LINKS } from '../config';
import { hairProducts } from '../data/hair';
import { peptideProducts } from '../data/peptide';
import { sexProducts } from '../data/sexual';
import { weightProducts } from '../data/weight';
import { mensHormone, womensHormone } from '../data/hormone';
import { peptidesPage } from '../data/peptides';
import { resolveCta, toProductKey } from './cta';

// A card's own name, plus the forms on a card with a toggle (NAD+ injection / nasal spray).
const CARD_KEYS = [
  ...[...weightProducts, ...hairProducts, ...sexProducts, ...peptideProducts].map((p) => toProductKey(p.name)),
  ...peptideProducts.flatMap((p) => (p.variants ?? []).map((v) => toProductKey(v.product))),
  // Hormone and Peptide Therapy cards, plus the plans on a card with a plan toggle (1 month / 3 months).
  ...[mensHormone, womensHormone, peptidesPage].flatMap((page) => page.products.items.flatMap((p) => [toProductKey(p.name), ...(p.plans ?? []).map((plan) => toProductKey(plan.product))])),
];

describe('product links in src/config.ts', () => {
  test('every link is keyed to a product card that exists on the site', () => {
    const unknown = Object.keys(PRODUCT_LINKS).filter((key) => !CARD_KEYS.includes(key));
    expect(unknown).toEqual([]);
  });

  test('opens every live treatment card', () => {
    for (const key of LIVE_PRODUCTS) {
      const { program, url } = PRODUCT_LINKS[key];
      expect(resolveCta(program, key)).toMatchObject({ href: url, isComingSoon: false });
    }
  });

  test('keeps a linked but not-yet-live card on Opening Soon', () => {
    const waiting = Object.entries(PRODUCT_LINKS).filter(([key]) => !(LIVE_PRODUCTS as readonly string[]).includes(key));
    for (const [key, { program }] of waiting) {
      expect(resolveCta(program, key).isComingSoon).toBe(true);
    }
  });
});
