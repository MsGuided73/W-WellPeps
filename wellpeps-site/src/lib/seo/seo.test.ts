import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { CONTACT_ADDRESS } from '../../config';
import { weightProducts } from '../../data/weight';
import { PROGRAMS, programAt, startingPrice, toFaqs, toPrice } from './catalog';
import { buildLlmsTxt } from './llms';
import { breadcrumbs, faqPage, organization, postalAddress, programService, serializeGraph } from './schema';
import { canonicalUrl } from './site';
import { belongsInSitemap, lastModifiedOf, pageUrlFor, renderSitemap } from '../../../scripts/lib/sitemap.mjs';
import { addTrailingSlashes, slashlessPageLinks } from '../../../scripts/lib/trailing-slash.mjs';

const SITE = resolve(__dirname, '../../..');

describe('canonical URLs', () => {
  test.each([
    ['/', 'https://wellpeps.com/'],
    ['/weight-loss', 'https://wellpeps.com/weight-loss/'],
    ['/weight-loss/', 'https://wellpeps.com/weight-loss/'],
    ['/weight-loss/?utm_source=x#faq', 'https://wellpeps.com/weight-loss/'],
    ['weight-loss', 'https://wellpeps.com/weight-loss/'],
    ['/wellness-learning-center/index.html', 'https://wellpeps.com/wellness-learning-center/'],
    ['/llms.txt', 'https://wellpeps.com/llms.txt'],
  ])('%s -> %s (the address that answers 200, never a redirect)', (path, url) => {
    expect(canonicalUrl(path)).toBe(url);
  });
});

describe('program catalog: built from the page data, so markup and llms.txt match the cards', () => {
  test('prices parse; placeholders do not', () => {
    expect(toPrice('179')).toBe(179);
    expect(toPrice('19.99')).toBe(19.99);
    expect(toPrice('XX')).toBeUndefined();
    expect(toPrice(undefined)).toBeUndefined();
  });

  test('every weight treatment and price comes straight from the weight cards', () => {
    const weight = programAt('/weight-loss/');
    expect(weight.treatments.map((t) => t.name)).toEqual(weightProducts.map((p) => p.name));
    expect(weight.treatments.map((t) => t.monthlyPrice)).toEqual(weightProducts.map((p) => toPrice(p.price)));
    expect(startingPrice(weight)).toBe(Math.min(...weightProducts.map((p) => Number(p.price))));
  });

  test('the four programs, each with treatments and FAQs, and plain-text summaries', () => {
    expect(PROGRAMS.map((p) => p.path)).toEqual(['/weight-loss/', '/hair-restoration/', '/sexual-wellness/', '/healthy-aging/']);
    for (const p of PROGRAMS) {
      expect(p.treatments.length, p.name).toBeGreaterThan(0);
      expect(p.faqs.length, p.name).toBeGreaterThan(0);
      expect(p.summary).not.toMatch(/<|>/);
    }
  });

  test('an FAQ answer given as paragraphs becomes one answer', () => {
    expect(toFaqs([{ q: 'Q', a: ['One.', 'Two.'] }])).toEqual([{ q: 'Q', a: 'One. Two.' }]);
  });
});

describe('structured data', () => {
  test('WellPeps is an Organization, never a medical practice or pharmacy type', () => {
    const org = organization();
    expect(org['@type']).toBe('Organization');
    expect(JSON.stringify(org)).not.toMatch(/MedicalBusiness|MedicalOrganization|Physician|Pharmacy"|Hospital/);
    expect(org.description).toMatch(/not a medical practice or a pharmacy/);
  });

  test('the business address parses into a postal address', () => {
    expect(postalAddress(CONTACT_ADDRESS)).toMatchObject({ addressLocality: 'Sheridan', addressRegion: 'WY', postalCode: '82801', addressCountry: 'US' });
    expect(postalAddress('somewhere')).toBeUndefined();
  });

  test('a live program lists one monthly offer per priced treatment, with no rating or review markup', () => {
    for (const p of PROGRAMS.filter((x) => x.live)) {
      const svc = programService(p) as any;
      const offers = svc.hasOfferCatalog?.itemListElement ?? [];
      expect(offers.length, p.name).toBe(p.treatments.filter((t) => t.monthlyPrice !== undefined).length);
      for (const o of offers) {
        expect(o.priceCurrency).toBe('USD');
        expect(o.priceSpecification.unitText).toBe('month');
        expect(o.description).toMatch(/^Prescription required\./);
      }
      expect(JSON.stringify(svc)).not.toMatch(/aggregateRating|"review"|ratingValue/i);
    }
  });

  test('a program that is not live has no offers', () => {
    const svc = programService({ ...programAt('/weight-loss/'), live: false }) as any;
    expect(svc.hasOfferCatalog).toBeUndefined();
  });

  test('breadcrumbs start at Home and use canonical URLs', () => {
    const b = breadcrumbs([{ name: 'Weight Management', path: '/weight-loss' }]) as any;
    expect(b.itemListElement.map((i: any) => i.item)).toEqual(['https://wellpeps.com/', 'https://wellpeps.com/weight-loss/']);
  });

  test('no FAQ, no FAQPage', () => {
    expect(faqPage([], '/')).toBeUndefined();
  });

  test('a "<" in any text cannot close the script element', () => {
    const out = serializeGraph([{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }, undefined]);
    expect(out).not.toContain('<');
    expect(JSON.parse(out)['@graph']).toHaveLength(1);
  });
});

describe('llms.txt', () => {
  const text = buildLlmsTxt([{ title: 'Understanding GLP-1s', path: '/wellness-learning-center/glp1/', category: 'Weight' }], new Date('2026-10-11T00:00:00Z'));

  test('lists every priced treatment with its monthly price, from the same data as the pages', () => {
    for (const p of PROGRAMS.filter((x) => x.live)) {
      for (const t of p.treatments.filter((x) => x.monthlyPrice !== undefined)) {
        expect(text).toContain(`- ${t.name} (${t.form}): $${t.monthlyPrice}/month`);
      }
    }
  });

  test('states the pay-at-checkout, full-refund-if-not-prescribed model and what WellPeps is not', () => {
    expect(text).toMatch(/refunds that payment in full if a clinician does not prescribe/i);
    expect(text).not.toMatch(/pay only if/i);
    expect(text).toMatch(/not a medical practice or a pharmacy/);
    expect(text).toMatch(/Compounded medications are not FDA-approved/);
  });

  test('never mentions a membership, and links the LegitScript listing', () => {
    expect(text).not.toMatch(/membership/i);
    expect(text).toContain('https://www.legitscript.com/websites/?checker_keywords=wellpeps.com');
  });

  test('includes the build date and the Learning Center articles', () => {
    expect(text).toContain('last built 2026-10-11');
    expect(text).toContain('[Understanding GLP-1s](https://wellpeps.com/wellness-learning-center/glp1/)');
  });
});

describe('sitemap and robots.txt', () => {
  test('a built file maps to its folder URL', () => {
    expect(pageUrlFor('index.html', 'https://wellpeps.com')).toBe('https://wellpeps.com/');
    expect(pageUrlFor('weight-loss/index.html', 'https://wellpeps.com')).toBe('https://wellpeps.com/weight-loss/');
  });

  test('noindex pages, redirect stubs and pages that point their canonical elsewhere are left out', () => {
    const url = 'https://wellpeps.com/a/';
    expect(belongsInSitemap(`<link rel="canonical" href="${url}">`, url)).toBe(true);
    expect(belongsInSitemap('<meta name="robots" content="noindex,nofollow">', url)).toBe(false);
    expect(belongsInSitemap('<meta http-equiv="refresh" content="0;url=/b">', url)).toBe(false);
    expect(belongsInSitemap('<link rel="canonical" href="https://wellpeps.com/b/">', url)).toBe(false);
  });

  test('the sitemap is valid XML with escaped URLs', () => {
    const xml = renderSitemap(['https://wellpeps.com/', 'https://wellpeps.com/a/?x=1&y=2']);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://wellpeps.com/a/?x=1&amp;y=2</loc>');
  });

  test('a page with a dateModified gets <lastmod>; others get none', () => {
    expect(lastModifiedOf('{"@type":"BlogPosting","dateModified":"2026-07-20T15:45:48.667+00:00"}')).toBe('2026-07-20');
    expect(lastModifiedOf('{"@type":"WebPage"}')).toBeUndefined();
    const xml = renderSitemap([{ loc: 'https://wellpeps.com/a/', lastmod: '2026-07-20' }, { loc: 'https://wellpeps.com/b/' }]);
    expect(xml).toContain('<url><loc>https://wellpeps.com/a/</loc><lastmod>2026-07-20</lastmod></url>');
    expect(xml).toContain('<url><loc>https://wellpeps.com/b/</loc></url>');
  });

  test('robots.txt allows everything public and names the sitemap', () => {
    const robots = readFileSync(resolve(SITE, 'public/robots.txt'), 'utf8');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/wellpeps\.com\/sitemap\.xml$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
  });
});

describe('internal links end in a slash', () => {
  const pages = new Set(['/weight-loss', '/wellness-learning-center/nad-explained', '/healthy-aging']);
  const isPageDir = (p: string) => pages.has(p);

  test('a link to a built page gains its slash; query strings and fragments are kept', () => {
    const html = '<a href="/weight-loss">a</a><a href="/healthy-aging#faq">b</a><a href="/wellness-learning-center/nad-explained?x=1">c</a>';
    expect(addTrailingSlashes(html, isPageDir)).toBe(
      '<a href="/weight-loss/">a</a><a href="/healthy-aging/#faq">b</a><a href="/wellness-learning-center/nad-explained/?x=1">c</a>',
    );
  });

  test('home, slashed links, files, unknown paths and other hosts are left alone', () => {
    const html = '<a href="/">h</a><a href="/weight-loss/">w</a><link href="/sitemap.xml"><a href="/nope">n</a>'
      + '<a href="//cdn.example.com/weight-loss">c</a><a href="https://wellpeps.com/weight-loss">x</a><a href="#top">t</a>';
    expect(addTrailingSlashes(html, isPageDir)).toBe(html);
    expect(slashlessPageLinks(html, isPageDir)).toEqual([]);
  });

  test('finds the links that still need a slash', () => {
    expect(slashlessPageLinks('<a href="/weight-loss">a</a><a href="/healthy-aging/">b</a>', isPageDir)).toEqual(['/weight-loss']);
  });
});
