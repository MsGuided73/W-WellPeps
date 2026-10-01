/**
 * The real page behind the collector. Every function reads the page when it is
 * CALLED, not when this module loads, so importing it in a test or on the server
 * touches nothing. It reads only: the path (never the query), the referrer (which
 * the sanitizer classifies and discards), the window width, scroll position and
 * page height, and the visibility state. It reads nothing about the device
 * (no user agent, screen size, language, plugins) and writes nothing.
 */
import type { CollectorEnv } from './collector';

export function browserEnv(): CollectorEnv {
  return {
    pathname: () => location.pathname,
    hostname: () => location.hostname,
    referrer: () => document.referrer,
    viewportWidth: () => window.innerWidth,
    scroll: () => ({
      top: window.scrollY,
      viewport: window.innerHeight,
      total: document.documentElement.scrollHeight,
    }),
    visibility: () => (document.visibilityState === 'hidden' ? 'hidden' : 'visible'),
    now: () => Date.now(),
    listen(target, type, handler, capture = false) {
      const node: Window | Document = target === 'window' ? window : document;
      const fn = handler as EventListener;
      node.addEventListener(type, fn, { capture, passive: true });
      return () => node.removeEventListener(type, fn, { capture });
    },
  };
}
