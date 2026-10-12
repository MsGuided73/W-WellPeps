/**
 * Site-wide facts for search engines and AI retrieval: the canonical origin, the share image, and the one
 * rule for turning a page path into its canonical URL. Every page's <link rel="canonical">, og:url, the
 * sitemap (scripts/lib/sitemap.mjs) and the structured data use these, so they can never disagree.
 */
export const SITE_URL = 'https://wellpeps.com';
export const SITE_NAME = 'WellPeps';

/** 1200x630 share card for links posted on social sites and in messages (public/images/og/). */
export const SHARE_IMAGE = {
  path: '/images/og/wellpeps-share.jpg',
  width: 1200,
  height: 630,
  alt: 'WellPeps: personalized wellness, simplified. A smiling couple walking along a coastal trail.',
} as const;

/**
 * The canonical URL of a page. Pages are served as folders, so the live server answers /weight-loss with a
 * 301 to /weight-loss/; the canonical is the address that answers 200, with the trailing slash.
 * Query strings and fragments are dropped.
 */
export function canonicalUrl(pathname: string): string {
  let path = pathname.split(/[?#]/)[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');
  // A file (robots.txt, llms.txt, an image) keeps its name; a page gets the folder slash.
  if (!/\.[a-z0-9]+$/i.test(path) && !path.endsWith('/')) path = `${path}/`;
  return new URL(path, SITE_URL).href;
}

/** An absolute URL for an asset or page path on this site. */
export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).href;
