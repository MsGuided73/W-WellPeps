/**
 * Which GEN Health links the site will send a visitor to.
 *
 * Until the real links are pasted into src/config.ts they are
 * `#scriptful-stub-*` fragments. A link counts as "linked" only when it is an
 * https URL on a host we trust, so a half-configured program can never render
 * a dead or unsafe button.
 *
 * Kept free of imports so both config.ts and lib/cta.ts can use it.
 */

/** Hosts an assessment button may point at. The branded portal is the intended
 *  one; GEN Health's shared host is the documented fallback. If GEN Health
 *  issues checkout links on another host, add it here deliberately. */
export const TRUSTED_LINK_HOSTS: readonly string[] = ['portal.wellpeps.com', 'app.genhealthehr.com'];

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function isLinked(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed !== undefined && parsed.protocol === 'https:' && TRUSTED_LINK_HOSTS.includes(parsed.hostname);
}

/**
 * Fail the build on a link that was clearly meant to be real but is not
 * trusted — plain http, or a host outside TRUSTED_LINK_HOSTS. Without this a
 * bad paste would just show "Opening Soon" and the mistake would go unnoticed;
 * worse, without the host check a wrong URL would go live as a trusted button.
 * Stubs (anything not starting with "http") pass: they mean "not launched yet".
 */
export function assertTrustedLinks(urls: readonly string[]): void {
  for (const url of urls) {
    if (!url.startsWith('http') || isLinked(url)) continue;
    const host = parseUrl(url)?.hostname ?? 'unparseable URL';
    throw new Error(
      `src/config.ts: "${url}" is not a trusted GEN Health link (${host}). ` +
        `Links must be https on one of: ${TRUSTED_LINK_HOSTS.join(', ')}.`,
    );
  }
}
