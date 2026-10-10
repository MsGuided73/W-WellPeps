/**
 * The only other hosts the site may load images from (CSP img-src). Shared by the nginx policy checks
 * (csp-audit.mjs), the built-page scan (html-scan.mjs) and the browser check (security-headers-check.mjs).
 *
 * static.legitscript.com: the LegitScript certification seal (certified 2026-10-09). LegitScript requires
 * its live image rather than a copy, so the status it shows is always current.
 */
export const IMAGE_HOSTS = ['https://static.legitscript.com'];

/** True when an image URL is served from one of IMAGE_HOSTS over https. */
export function isAllowedImageUrl(url) {
  try {
    return IMAGE_HOSTS.includes(new URL(url.trim(), 'https://wellpeps.com').origin) && /^https:/i.test(url.trim());
  } catch {
    return false;
  }
}
