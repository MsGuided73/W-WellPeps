/**
 * Medical review of Learning Center articles: who reviewed which article, and when.
 *
 * Kept in code rather than the blog_articles table so every review has a git trail and a test
 * (medical-review.test.ts checks each slug against scripts/data/articles.json).
 *
 * Only verifiable facts go in a reviewer entry. Name, credential, specialty and NPI below come from the
 * public CMS NPI Registry (checked 2026-11-06); add a biography or photo only once the reviewer has
 * supplied and approved it.
 *
 * To record a new review: add the article slug to REVIEWS with the date the reviewer signed off.
 * The article then shows "Medically reviewed by", the review note, and reviewedBy/lastReviewed markup.
 */

export interface MedicalReviewer {
  /** URL slug of the reviewer's profile page. */
  id: string;
  givenName: string;
  familyName: string;
  /** Post-nominal credential, e.g. "MD". */
  credential: string;
  credentialName: string;
  specialty: string;
  npi: string;
  /** Last change to the reviewer's profile page, YYYY-MM-DD. Shown as "Last updated" and used as the
   *  page's dateModified, which the sitemap turns into <lastmod>. Change it whenever the profile changes. */
  profileUpdated: string;
}

export interface ArticleReview {
  reviewer: MedicalReviewer;
  /** Date the reviewer approved the article, YYYY-MM-DD. */
  reviewedOn: string;
}

export const MEDICAL_REVIEWERS = {
  'rahel-yirga-md': {
    id: 'rahel-yirga-md',
    givenName: 'Rahel',
    familyName: 'Yirga',
    credential: 'MD',
    credentialName: 'Doctor of Medicine',
    specialty: 'Internal Medicine',
    npi: '1437121910',
    profileUpdated: '2026-11-12',
  },
} as const satisfies Record<string, MedicalReviewer>;

type ReviewerId = keyof typeof MEDICAL_REVIEWERS;

/** The GLP-1 / Weight Management articles: reviewed and approved by Dr. Yirga on 2026-11-06 (owner, 2026-11-06). */
const GLP1_REVIEW = { reviewer: 'rahel-yirga-md', reviewedOn: '2026-11-06' } as const;

/** Hair Restoration, Sexual Wellness and Healthy Aging & Vitality articles, plus Healthy Aging (Wellness Foundations): approved by Dr. Yirga on 2026-11-07 (owner, 2026-11-07). */
const NOV7_REVIEW = { reviewer: 'rahel-yirga-md', reviewedOn: '2026-11-07' } as const;

/** The remaining Wellness Foundations and Telehealth Resources articles: approved by Dr. Yirga, confirmed by the owner 2026-11-12. */
const NOV12_REVIEW = { reviewer: 'rahel-yirga-md', reviewedOn: '2026-11-12' } as const;

export const REVIEWS: Readonly<Record<string, { reviewer: ReviewerId; reviewedOn: string }>> = {
  'common-glp1-side-effects': GLP1_REVIEW,
  'common-questions-about-glp1-medications': GLP1_REVIEW,
  'could-you-be-a-candidate-for-glp1-weight-management': GLP1_REVIEW,
  'healthy-habits-for-long-term-weight-management': GLP1_REVIEW,
  'hunger-appetite-and-fullness': GLP1_REVIEW,
  'online-weight-management-consultation': GLP1_REVIEW,
  'oral-vs-injectable-glp1-medications': GLP1_REVIEW,
  'semaglutide-vs-tirzepatide': GLP1_REVIEW,
  'stopping-glp1-medication': GLP1_REVIEW,
  'understanding-compounded-medications': GLP1_REVIEW,
  'understanding-glp1-medications': GLP1_REVIEW,
  'understanding-obesity-as-a-chronic-disease': GLP1_REVIEW,
  'weight-loss-plateaus-explained': GLP1_REVIEW,
  'why-am-i-not-losing-weight-on-glp1': GLP1_REVIEW,
  // Hair Restoration
  'female-hair-thinning': NOV7_REVIEW,
  'finasteride-explained': NOV7_REVIEW,
  'male-pattern-baldness': NOV7_REVIEW,
  'oral-vs-topical-minoxidil': NOV7_REVIEW,
  'understanding-hair-loss': NOV7_REVIEW,
  'why-hair-growth-takes-time': NOV7_REVIEW,
  // Sexual Wellness
  'common-causes-of-low-libido-in-men': NOV7_REVIEW,
  'daily-vs-on-demand-ed-medication': NOV7_REVIEW,
  'lifestyle-factors-that-affect-sexual-health': NOV7_REVIEW,
  'performance-anxiety-and-sexual-health': NOV7_REVIEW,
  'pt-141-explained': NOV7_REVIEW,
  'sildenafil-vs-tadalafil': NOV7_REVIEW,
  'understanding-erectile-dysfunction': NOV7_REVIEW,
  'when-to-talk-to-a-healthcare-provider-about-ed': NOV7_REVIEW,
  // Healthy Aging & Vitality (peptides-wellness)
  'glutathione-explained': NOV7_REVIEW,
  'mic-b12-explained': NOV7_REVIEW,
  'nad-explained': NOV7_REVIEW,
  'recovery-and-performance': NOV7_REVIEW,
  'sermorelin-explained': NOV7_REVIEW,
  'what-are-peptides': NOV7_REVIEW,
  // Wellness Foundations: the owner's Healthy Aging list includes this article
  'healthy-aging': NOV7_REVIEW,
  // Wellness Foundations (the rest)
  'healthy-nutrition': NOV12_REVIEW,
  'managing-stress': NOV12_REVIEW,
  'benefits-of-regular-exercise': NOV12_REVIEW,
  'importance-of-hydration': NOV12_REVIEW,
  'why-sleep-matters': NOV12_REVIEW,
  // Telehealth Resources
  'personalized-treatment-plans': NOV12_REVIEW,
  'how-telehealth-works': NOV12_REVIEW,
  'prescription-delivery': NOV12_REVIEW,
  'when-is-telehealth-appropriate': NOV12_REVIEW,
  'hipaa-and-telehealth-privacy': NOV12_REVIEW,
  'understanding-laboratory-testing': NOV12_REVIEW,
};

/**
 * Medical review of the Smart Patient Guides (eBooks), by guide slug (src/data/ebooks.ts). The guide's landing page
 * shows the same "Medically reviewed by" line as an article, and the reviewer's profile lists the guide.
 * The owner confirmed 2026-11-12 that Dr. Yirga approved every guide, including the two hormone therapy guides
 * (Women's at v2, the 2026-11-10 compounded-cream correction).
 */
export const GUIDE_REVIEWS: Readonly<Record<string, { reviewer: ReviewerId; reviewedOn: string }>> = {
  'glp-1-weight-loss': NOV12_REVIEW,
  'sexual-wellness': NOV12_REVIEW,
  'hair-restoration': NOV12_REVIEW,
  'healthy-aging-vitality': NOV12_REVIEW,
  'nad-therapy': NOV12_REVIEW,
  'modern-healthcare': NOV12_REVIEW,
  'mens-hormone-therapy': NOV12_REVIEW,
  'womens-hormone-therapy': NOV12_REVIEW,
};

export function reviewForGuide(slug: string): ArticleReview | undefined {
  const entry = GUIDE_REVIEWS[slug];
  return entry ? { reviewer: MEDICAL_REVIEWERS[entry.reviewer], reviewedOn: entry.reviewedOn } : undefined;
}

/** Slugs of the guides a reviewer has reviewed, with the review date. */
export function guidesReviewedBy(reviewerId: string): { slug: string; reviewedOn: string }[] {
  return Object.entries(GUIDE_REVIEWS)
    .filter(([, r]) => r.reviewer === reviewerId)
    .map(([slug, r]) => ({ slug, reviewedOn: r.reviewedOn }));
}

/** "Rahel Yirga, MD" */
export const reviewerName = (r: MedicalReviewer): string => `${r.givenName} ${r.familyName}, ${r.credential}`;

/** "Dr. Yirga" */
export const reviewerShortName = (r: MedicalReviewer): string => `Dr. ${r.familyName}`;

export const reviewerPath = (r: MedicalReviewer): string => `/medical-reviewers/${r.id}/`;

/** The reviewer's public record in the CMS NPI Registry: an outside source anyone can use to verify the credential. */
export const npiRegistryUrl = (r: MedicalReviewer): string => `https://npiregistry.cms.hhs.gov/provider-view/${r.npi}`;

export function reviewForArticle(slug: string): ArticleReview | undefined {
  const entry = REVIEWS[slug];
  return entry ? { reviewer: MEDICAL_REVIEWERS[entry.reviewer], reviewedOn: entry.reviewedOn } : undefined;
}

/** Slugs of the articles a reviewer has reviewed, with the review date. */
export function reviewsBy(reviewerId: string): { slug: string; reviewedOn: string }[] {
  return Object.entries(REVIEWS)
    .filter(([, r]) => r.reviewer === reviewerId)
    .map(([slug, r]) => ({ slug, reviewedOn: r.reviewedOn }));
}

/** "2026-11-06" -> "November 6, 2026". Formatted in UTC so a date-only value never shifts a day. */
export function formatReviewDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
