import { describe, expect, test } from 'vitest';
import { FALLBACK_SAFETY_PAGE, shortDisclosure } from './disclosure-line';
import { PRODUCT_DISCLOSURES, SAFETY_PAGE } from '../data/product-disclosures';
import type { ProgramSlug } from './cta';

describe('short-form phone disclosures', () => {
  test('a compounded product is tagged Rx and Compounded, and says it is not FDA-approved', () => {
    const d = shortDisclosure('weight-loss', 'Compounded Tirzepatide');
    expect(d.tags).toEqual(['Rx', 'Compounded']);
    expect(d.line).toEqual(['Rx required', 'Compounded, not FDA-approved']);
    expect(d.safetyHref).toBe('/safety/glp-1');
  });

  test('an off-label product says so, and an FDA-approved one carries only the Rx tag', () => {
    expect(shortDisclosure('hair-restoration', 'Oral Minoxidil').tags).toEqual(['Rx', 'Off-label']);
    expect(shortDisclosure('hair-restoration', 'Oral Minoxidil').line).toContain('Off-label use');
    expect(shortDisclosure('hair-restoration', 'Oral Finasteride').tags).toEqual(['Rx']);
  });

  test('tadalafil and sildenafil carry the nitrate warning in the price box line', () => {
    for (const name of ['Tadalafil As Needed', 'Sildenafil As Needed', 'Tadalafil Daily']) {
      expect(shortDisclosure('sexual-wellness', name).line).toContain('Not with nitrates');
    }
  });

  test('every program links its own safety page, falling back to the medical disclaimer only when it has none', () => {
    for (const program of Object.keys(PRODUCT_DISCLOSURES) as ProgramSlug[]) {
      const name = Object.keys(PRODUCT_DISCLOSURES[program])[0];
      expect(shortDisclosure(program, name).safetyHref).toBe(SAFETY_PAGE[program] ?? FALLBACK_SAFETY_PAGE);
    }
    expect(shortDisclosure('womens-hormone-therapy', 'Oral Micronized Progesterone').safetyHref).toBe('/safety/estradiol-progesterone');
  });

  test('every listed product gets a short disclosure that starts with the prescription line', () => {
    for (const [program, products] of Object.entries(PRODUCT_DISCLOSURES)) {
      for (const name of Object.keys(products)) {
        const d = shortDisclosure(program as ProgramSlug, name);
        expect(d.tags[0]).toBe('Rx');
        expect(d.line[0]).toBe('Rx required');
      }
    }
  });
});
