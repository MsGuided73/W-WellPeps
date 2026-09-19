import { describe, expect, test } from 'vitest';
import { assertTrustedLinks, isLinked } from './links';
import {
  ASSESSMENT_CTA_LABEL,
  GENERIC_FALLBACK_HREF,
  PROGRAM_SLUGS,
  createCtaResolver,
  resolveCta,
  toProductKey,
  toProgramSlug,
} from './cta';

const PORTAL_LINK = 'https://portal.wellpeps.com/checkout/abc?flow=intake-first';

const NOTHING_LINKED = {
  storefront: '#scriptful-stub-storefront',
  programs: {
    'weight-loss': '#scriptful-stub-weight-loss',
    'hair-restoration': '#scriptful-stub-hair-restoration',
    'sexual-wellness': '#scriptful-stub-sexual-wellness',
    'healthy-aging': '#scriptful-stub-healthy-aging',
  },
  products: {},
} as const;

const ORAL_SEMA = { program: 'weight-loss', url: PORTAL_LINK } as const;

describe('isLinked', () => {
  test('treats a stub fragment as not linked', () => {
    expect(isLinked('#scriptful-stub-weight-loss')).toBe(false);
  });

  test('treats an empty string as not linked', () => {
    expect(isLinked('')).toBe(false);
  });

  test('treats an https URL as linked', () => {
    expect(isLinked(PORTAL_LINK)).toBe(true);
  });

  test('rejects plain http so a checkout link is never sent in the clear', () => {
    expect(isLinked('http://portal.wellpeps.com/checkout/abc')).toBe(false);
  });

  test('rejects a javascript: URL', () => {
    expect(isLinked('javascript:alert(1)')).toBe(false);
  });

  test('accepts the GEN Health shared host as a fallback', () => {
    expect(isLinked('https://app.genhealthehr.com/checkout/abc?brand=wellpeps')).toBe(true);
  });

  test('rejects an https URL on a host we do not trust', () => {
    expect(isLinked('https://evil.example.com/checkout/abc')).toBe(false);
  });

  test('rejects a lookalike host that merely contains a trusted name', () => {
    expect(isLinked('https://portal.wellpeps.com.evil.example/checkout')).toBe(false);
    expect(isLinked('https://evil.example/portal.wellpeps.com')).toBe(false);
  });
});

describe('assertTrustedLinks', () => {
  test('allows stubs, so an unlaunched program does not fail the build', () => {
    expect(() => assertTrustedLinks(['#scriptful-stub-weight-loss', PORTAL_LINK])).not.toThrow();
  });

  test('fails loudly when a pasted URL is on an untrusted host', () => {
    expect(() => assertTrustedLinks(['https://evil.example.com/checkout'])).toThrow(/evil\.example\.com/);
  });

  test('fails loudly on plain http rather than silently showing Opening Soon', () => {
    expect(() => assertTrustedLinks(['http://portal.wellpeps.com/checkout'])).toThrow(/https/);
  });
});

describe('createCtaResolver', () => {
  test('uses one label for every CTA', () => {
    expect(ASSESSMENT_CTA_LABEL).toBe('Start Free Assessment');
  });

  test('marks a program coming soon while its link is still a stub', () => {
    const resolve = createCtaResolver(NOTHING_LINKED);

    const cta = resolve('weight-loss');

    expect(cta.isComingSoon).toBe(true);
    expect(cta.target).toBe('weight-loss');
  });

  test('opens only the program whose link has been pasted', () => {
    const resolve = createCtaResolver({
      ...NOTHING_LINKED,
      programs: { ...NOTHING_LINKED.programs, 'weight-loss': PORTAL_LINK },
    });

    expect(resolve('weight-loss')).toEqual({ href: PORTAL_LINK, isComingSoon: false, target: 'weight-loss' });
    expect(resolve('sexual-wellness').isComingSoon).toBe(true);
  });

  test('sends a generic CTA to the storefront once it is linked', () => {
    const resolve = createCtaResolver({ ...NOTHING_LINKED, storefront: PORTAL_LINK });

    expect(resolve()).toEqual({ href: PORTAL_LINK, isComingSoon: false, target: 'any' });
  });

  test('sends a generic CTA to the on-site program picker while the storefront is a stub', () => {
    const resolve = createCtaResolver(NOTHING_LINKED);

    const cta = resolve();

    expect(cta.href).toBe(GENERIC_FALLBACK_HREF);
    expect(cta.isComingSoon).toBe(false);
  });

  test('never returns a stub href for a generic CTA', () => {
    const resolve = createCtaResolver(NOTHING_LINKED);

    expect(resolve().href).not.toContain('scriptful-stub');
  });
});

describe('createCtaResolver — product links', () => {
  const resolve = createCtaResolver({ ...NOTHING_LINKED, products: { 'oral-semaglutide': ORAL_SEMA } });

  test('opens a card whose product link has been pasted', () => {
    expect(resolve('weight-loss', 'oral-semaglutide')).toEqual({
      href: PORTAL_LINK,
      isComingSoon: false,
      target: 'oral-semaglutide',
    });
  });

  test('keeps a sibling card coming soon when only another product is linked', () => {
    expect(resolve('weight-loss', 'compounded-tirzepatide').isComingSoon).toBe(true);
  });

  test('sends a program-level button to the treatment list of that program once any of its products is linked', () => {
    const cta = resolve('weight-loss');

    expect(cta).toEqual({ href: '/weight-loss#weight-products', isComingSoon: false, target: 'weight-loss' });
  });

  test('leaves other programs coming soon', () => {
    expect(resolve('sexual-wellness').isComingSoon).toBe(true);
  });

  test('prefers a real program link over the treatment-list fallback', () => {
    const withProgram = createCtaResolver({
      ...NOTHING_LINKED,
      programs: { ...NOTHING_LINKED.programs, 'weight-loss': 'https://portal.wellpeps.com/program' },
      products: { 'oral-semaglutide': ORAL_SEMA },
    });

    expect(withProgram('weight-loss').href).toBe('https://portal.wellpeps.com/program');
  });

  test('a card without its own link falls back to a linked program link', () => {
    const withProgram = createCtaResolver({
      ...NOTHING_LINKED,
      programs: { ...NOTHING_LINKED.programs, 'weight-loss': 'https://portal.wellpeps.com/program' },
    });

    expect(withProgram('weight-loss', 'compounded-tirzepatide').href).toBe('https://portal.wellpeps.com/program');
  });
});

describe('toProductKey', () => {
  test('slugs a card name', () => {
    expect(toProductKey('Oral Semaglutide')).toBe('oral-semaglutide');
  });

  test('collapses punctuation and trims', () => {
    expect(toProductKey('  NAD+ (Injection) / Low-Dose ')).toBe('nad-injection-low-dose');
  });
});

describe('resolveCta (bound to src/config.ts)', () => {
  test('resolves every program without throwing and never yields a stub href for an open one', () => {
    for (const slug of PROGRAM_SLUGS) {
      const cta = resolveCta(slug);

      expect(cta.target).toBe(slug);
      // Open means a trusted GEN Health link or an on-site path — never a stub.
      if (!cta.isComingSoon) expect(isLinked(cta.href) || cta.href.startsWith('/')).toBe(true);
    }
  });

  test('generic CTA is always usable', () => {
    expect(resolveCta().isComingSoon).toBe(false);
    expect(resolveCta().href).not.toContain('scriptful-stub');
  });
});

describe('toProgramSlug', () => {
  test('passes a known slug through', () => {
    expect(toProgramSlug('healthy-aging')).toBe('healthy-aging');
  });

  test('returns undefined for an unknown value so the CTA falls back to generic', () => {
    expect(toProgramSlug('mental-wellness')).toBeUndefined();
    expect(toProgramSlug(undefined)).toBeUndefined();
    expect(toProgramSlug('')).toBeUndefined();
  });
});
