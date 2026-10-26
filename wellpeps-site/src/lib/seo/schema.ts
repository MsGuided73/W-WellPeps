/**
 * schema.org structured data (JSON-LD) for search engines and AI retrieval. Each builder returns a plain
 * object; BaseLayout puts them in one @graph per page.
 *
 * Compliance limits, on purpose:
 *  - WellPeps is typed as an Organization, never a MedicalBusiness, Physician or Pharmacy: it is not a
 *    medical practice or a pharmacy (site footer, Terms).
 *  - Treatments are Offers of a Service with the page's own monthly price; no rating, review or outcome
 *    claim is marked up, because none is substantiated.
 *  - Prices come from the data files through catalog.ts, so markup and page cannot disagree.
 */
import { CONTACT, CONTACT_ADDRESS, LEGITSCRIPT } from '../../config';
import type { Faq, ProgramEntry } from './catalog';
import { SHARE_IMAGE, SITE_NAME, SITE_URL, absoluteUrl, canonicalUrl } from './site';

export type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

/** "30 N Gould St., Suite R, Sheridan, WY 82801" -> PostalAddress, or undefined if it does not parse. */
export function postalAddress(address: string): JsonLd | undefined {
  const m = address.trim().match(/^(.+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!m) return undefined;
  return { '@type': 'PostalAddress', streetAddress: m[1], addressLocality: m[2], addressRegion: m[3], postalCode: m[4], addressCountry: 'US' };
}

export function organization(): JsonLd {
  const address = postalAddress(CONTACT_ADDRESS);
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/images/logo-full-v2.png'), width: 600, height: 125 },
    description:
      'WellPeps is a U.S. telehealth wellness company offering provider-guided care for weight management, hair restoration, ' +
      'sexual wellness and healthy aging. Care is provided by independent licensed clinicians, and prescriptions are filled ' +
      'by state-licensed pharmacies. WellPeps is not a medical practice or a pharmacy.',
    email: CONTACT.email,
    telephone: CONTACT.phoneHref.replace(/^tel:/, ''),
    ...(address ? { address } : {}),
    areaServed: { '@type': 'Country', name: 'United States' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT.email,
      telephone: CONTACT.phoneHref.replace(/^tel:/, ''),
      areaServed: 'US',
      availableLanguage: 'English',
    },
    // Brand-entity profiles search engines cross-reference: the public
    // LegitScript listing for wellpeps.com (certified 2026-10-09) and the
    // official GitHub organization (owner-confirmed 2026-10-26). Add social
    // profiles here as they go live.
    sameAs: [LEGITSCRIPT.listingUrl, 'https://github.com/Wellpeps'],
  };
}

export function website(): JsonLd {
  return { '@type': 'WebSite', '@id': SITE_ID, url: `${SITE_URL}/`, name: SITE_NAME, inLanguage: 'en-US', publisher: { '@id': ORG_ID } };
}

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Article pages are BlogPosting; everything else is a WebPage. */
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage';
}

export function webPage({ path, title, description, type = 'WebPage' }: PageMeta): JsonLd {
  const url = canonicalUrl(path);
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'en-US',
    isPartOf: { '@id': SITE_ID },
    publisher: { '@id': ORG_ID },
    primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(SHARE_IMAGE.path) },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** Home is always the first step; pass the steps after it. */
export function breadcrumbs(steps: readonly Crumb[]): JsonLd {
  const all = [{ name: 'Home', path: '/' }, ...steps];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: canonicalUrl(c.path) })),
  };
}

export function faqPage(faqs: readonly Faq[], path: string): JsonLd | undefined {
  if (!faqs.length) return undefined;
  return {
    '@type': 'FAQPage',
    '@id': `${canonicalUrl(path)}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/**
 * A program as a Service with one Offer per treatment at its monthly price. A program that is still
 * "coming soon" is described without offers.
 */
export function programService(program: ProgramEntry): JsonLd {
  const url = canonicalUrl(program.path);
  const offers = program.live
    ? program.treatments
        .filter((t) => t.monthlyPrice !== undefined)
        .map((t) => ({
          '@type': 'Offer',
          name: `${t.name} (${t.form})`,
          url,
          price: t.monthlyPrice!.toFixed(2),
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: t.monthlyPrice!.toFixed(2),
            priceCurrency: 'USD',
            unitText: 'month',
            billingDuration: 'P1M',
          },
          eligibleRegion: { '@type': 'Country', name: 'US' },
          ...(t.availability ? { description: `Prescription required. ${t.availability}` } : { description: 'Prescription required.' }),
          itemOffered: { '@type': 'Service', name: t.name },
        }))
    : [];
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: `${program.name} by WellPeps`,
    serviceType: program.name,
    description: program.summary,
    url,
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'Country', name: 'United States' },
    ...(offers.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: `${program.name} treatments`, itemListElement: offers } } : {}),
  };
}

export interface ArticleMeta {
  path: string;
  headline: string;
  description: string;
  section?: string;
  published?: string | null;
  /** Last change; dateModified falls back to `published`. */
  updated?: string | null;
  readingMinutes?: number;
}

export function article({ path, headline, description, section, published, updated, readingMinutes }: ArticleMeta): JsonLd {
  const url = canonicalUrl(path);
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@id': `${url}#webpage` },
    url,
    headline: headline.slice(0, 110),
    description,
    inLanguage: 'en-US',
    image: absoluteUrl(SHARE_IMAGE.path),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    ...(section ? { articleSection: section } : {}),
    // The page shows this date as "Updated"; dateModified matches it so search and AI tools read the same date.
    ...(published ? { datePublished: published, dateModified: updated && updated > published ? updated : published } : {}),
    ...(readingMinutes ? { timeRequired: `PT${readingMinutes}M` } : {}),
  };
}

/** One JSON-LD document for a page. `<` is escaped so no string inside can close the script element. */
export function serializeGraph(nodes: readonly (JsonLd | undefined)[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }).replace(/</g, '\\u003c');
}
