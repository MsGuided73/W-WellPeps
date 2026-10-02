/**
 * Pure sanitizers: they turn what the browser knows (a path, a referrer, a click
 * target, a scroll position, a width) into the few coarse values the event model
 * allows. Nothing here reads the page, the network or storage, so every rule is
 * tested on its own. The raw input is dropped; only the coarse result leaves.
 */
import { isSensitivePath, normalizePath } from '../privacy/consent';
import {
  CLICK_TARGETS,
  LOOKS_LIKE_AN_ID,
  MAX_PAGE_PATH,
  PAGE_PATH_PATTERN,
  UNMATCHED_PATH,
  type ClickTarget,
  type PageTemplate,
  type ReferrerClass,
  type ScrollBucket,
  type TimeBucket,
  type ViewportClass,
} from './model';

// ------------------------------------------------------------------------- paths

const PROGRAM_PATHS = [
  '/weight-loss',
  '/hair-restoration',
  '/sexual-wellness',
  '/healthy-aging',
  '/hormone-optimization',
  '/mental-wellness',
  '/peptides',
] as const;

/** Legal pages that exist today. A new legal page is "other" until it is added here. */
const LEGAL_PATHS = ['/privacy-policy', '/terms-of-use', '/notice-of-privacy-practices', '/accessibility'] as const;

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/**
 * The page template for an already-normalized path. "other" means the path is not
 * a page this site is known to have: sanitizePage reports it as UNMATCHED_PATH.
 * A page is "known" only if it appears in the lists above or below, so a NEW page
 * must be added here to be counted (src/lib/analytics/routes.test.ts walks
 * src/pages and fails until it is).
 */
export function pageTemplateOf(path: string): PageTemplate {
  if (path === '/') return 'home';
  if (PROGRAM_PATHS.some((p) => under(path, p))) return 'program';
  if (path === '/wellness-learning-center') return 'learning_center_index';
  if (path.startsWith('/wellness-learning-center/')) return 'learning_center_article';
  // The Smart Patient Guides are educational content, reported as the Learning Center is.
  if (path === '/smart-patient-guides') return 'learning_center_index';
  if (path.startsWith('/smart-patient-guides/')) return 'learning_center_article';
  if (LEGAL_PATHS.some((p) => under(path, p))) return 'legal';
  if (under(path, '/your-privacy-choices')) return 'privacy_choices';
  if (under(path, '/your-plan')) return 'plan';
  if (under(path, '/why-wellpeps')) return 'about';
  return 'other';
}

export type PathDetail = 'full' | 'section';

export interface SanitizedPage {
  path: string;
  template: PageTemplate;
}

/**
 * The path and template to report for a raw location. The query string and hash
 * are removed by normalizePath. A path that is not a known page of this site, or
 * is not a clean page path (odd characters, too long, id-like), is replaced by
 * UNMATCHED_PATH, so text a visitor typed into the address bar is never sent. With
 * detail "section", a health-topic page is reported by its section only
 * (/wellness-learning-center rather than one article).
 */
export function sanitizePage(rawPath: string, detail: PathDetail = 'full'): SanitizedPage {
  const normalized = normalizePath(rawPath);
  if (normalized === null) return { path: UNMATCHED_PATH, template: 'other' };
  const template = pageTemplateOf(normalized);
  const clean =
    normalized.length <= MAX_PAGE_PATH && PAGE_PATH_PATTERN.test(normalized) && !LOOKS_LIKE_AN_ID.test(normalized);
  if (!clean || template === 'other') return { path: UNMATCHED_PATH, template };
  if (detail === 'section' && isSensitivePath(normalized)) {
    return { path: `/${normalized.split('/')[1]}`, template };
  }
  return { path: normalized, template };
}

// ---------------------------------------------------------------------- referrer

/** Search engines by host (without a leading www.). Google is matched by its country domains only, so mail.google.com and docs.google.com are not "search". */
const SEARCH_HOSTS: readonly RegExp[] = [
  /^google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/,
  /^(?:bing|duckduckgo|startpage|qwant|baidu)\.com$/,
  /^ecosia\.org$/,
  /^yandex\.(?:com|ru)$/,
  /^(?:[a-z]{2}\.)?search\.yahoo\.com$/,
  /^yahoo\.com$/,
  /^search\.brave\.com$/,
];
const GOOGLE_APP = 'com.google.android.googlequicksearchbox';
const SOCIAL_DOMAINS = new Set([
  'facebook.com',
  'fb.com',
  'fb.me',
  'instagram.com',
  'x.com',
  't.co',
  'twitter.com',
  'linkedin.com',
  'lnkd.in',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'youtube.com',
  'youtu.be',
  'threads.net',
  'snapchat.com',
  'whatsapp.com',
]);
const SECOND_LEVELS = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

/** example.co.uk -> example.co.uk; www.example.com -> example.com. Good enough to classify, not a public-suffix list. */
function registrableDomain(host: string): string {
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  const [secondLast, last] = labels.slice(-2);
  return SECOND_LEVELS.has(secondLast) && last.length === 2 ? labels.slice(-3).join('.') : labels.slice(-2).join('.');
}

const stripWww = (host: string) => host.replace(/^www\./, '');

export interface ReferrerInfo {
  referrerClass: ReferrerClass;
  /** Template of the previous page on this site; set only for an internal referrer whose path could be read. */
  fromTemplate?: PageTemplate;
}

/**
 * Classify `document.referrer`. The referrer URL (which can hold a search query)
 * is read here and thrown away: only the class, and for a page on this site its
 * template, leave.
 */
export function classifyReferrer(referrer: string, ownHost: string): ReferrerInfo {
  if (!referrer) return { referrerClass: 'direct' };
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return { referrerClass: 'other' };
  }
  const host = stripWww(url.hostname.toLowerCase());
  if (url.protocol === 'android-app:') return { referrerClass: host === GOOGLE_APP ? 'search' : 'other' };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { referrerClass: 'other' };
  if (host === stripWww(ownHost.toLowerCase())) {
    const previous = normalizePath(url.pathname);
    return previous === null ? { referrerClass: 'internal' } : { referrerClass: 'internal', fromTemplate: pageTemplateOf(previous) };
  }
  const domain = registrableDomain(host);
  if (SEARCH_HOSTS.some((re) => re.test(host))) return { referrerClass: 'search' };
  if (SOCIAL_DOMAINS.has(domain)) return { referrerClass: 'social' };
  return { referrerClass: 'other' };
}

// ------------------------------------------------------------------ click target

/** The two methods of an element the click rule uses. A DOM Element satisfies this. */
export interface ElementLike {
  closest(selector: string): ElementLike | null;
  getAttribute(name: string): string | null;
}

const ALLOWED_TARGETS: readonly string[] = CLICK_TARGETS;

/**
 * What to report for a click, or null to report nothing. Only two things count:
 * the nearest `data-track` attribute whose value is in the allow-list, and (when
 * there is none) a link or button inside the site footer (`footer.footer`) or the
 * site header (the element marked `data-nav`), reported as the coarse role
 * "footer" or "nav". Other headers, footers and navs (an article's table of
 * contents, the chat widget's header) are not site chrome and count for nothing.
 * The element's text, id, class and href are never read.
 */
export function clickTarget(el: ElementLike | null | undefined): ClickTarget | null {
  if (!el || typeof el.closest !== 'function') return null;
  const tagged = el.closest('[data-track]');
  if (tagged) {
    const value = tagged.getAttribute('data-track');
    return value !== null && ALLOWED_TARGETS.includes(value) ? (value as ClickTarget) : null;
  }
  const control = el.closest('a[href], button, [role="button"]');
  if (!control) return null;
  if (control.closest('footer.footer')) return 'footer';
  if (control.closest('[data-nav]')) return 'nav';
  return null;
}

// -------------------------------------------------------- scroll, time, viewport

export interface ScrollMetrics {
  /** Pixels scrolled from the top. */
  top: number;
  /** Height of the visible window. */
  viewport: number;
  /** Height of the whole page. */
  total: number;
}

/** How much of the page has been seen: the bottom of the window as a share of the page, 0 to 100. */
export function scrollPercent(m: ScrollMetrics): number {
  if (![m.top, m.viewport, m.total].every(Number.isFinite) || m.total <= 0) return 0;
  return Math.min(100, Math.max(0, ((m.top + m.viewport) / m.total) * 100));
}

/** Coarse depth reached. 100 allows for fractional pixels and overscroll. */
export function scrollBucket(percent: number): ScrollBucket {
  if (!Number.isFinite(percent)) return 0;
  if (percent >= 98) return 100;
  if (percent >= 75) return 75;
  if (percent >= 50) return 50;
  if (percent >= 25) return 25;
  return 0;
}

export function timeBucket(visibleMs: number): TimeBucket {
  if (!Number.isFinite(visibleMs) || visibleMs < 10_000) return '0-10s';
  if (visibleMs < 30_000) return '10-30s';
  if (visibleMs < 60_000) return '30-60s';
  if (visibleMs < 180_000) return '1-3m';
  return '3m+';
}

export function viewportClass(widthPx: number): ViewportClass {
  if (!Number.isFinite(widthPx)) return 'desktop';
  if (widthPx < 768) return 'mobile';
  if (widthPx < 1024) return 'tablet';
  return 'desktop';
}
