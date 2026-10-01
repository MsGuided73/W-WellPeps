import { defineConfig } from 'astro/config';

// WellPeps marketing site — static output.
// All PHI, accounts, and onboarding live on Scriptful's GEN Health platform;
// this site is the brand-facing "window dressing" that links out to it.
export default defineConfig({
  // Canonical is the apex domain; www 301-redirects to it at the edge/server.
  site: 'https://wellpeps.com',
  // /peptides was the route until 2026-09-19, when the program was renamed
  // "Healthy Aging & Vitality" to match the GEN Health product. Keep the old
  // URL working for anything already shared or indexed.
  redirects: {
    '/peptides': '/healthy-aging',
    // The membership fee was dropped 2026-09-30; its manage/cancel page became
    // /your-plan. Keep the old footer URL working.
    '/membership': '/your-plan',
    // The Mental Wellness program was removed; its waitlist page still collected email addresses
    // tied to a mental-health topic, for a service that does not exist. Send the old URL home.
    '/mental-wellness': '/',
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  build: {
    // Security headers (W4): production nginx sends a Content-Security-Policy
    // with `script-src 'self'` and `style-src 'self'` (nginx.conf.template).
    // That only works if the build emits NO inline executable script and NO
    // inline <style> element, so small scripts and stylesheets are written out
    // as external files under /_astro/ instead of being pasted into the HTML.
    // The rendered pages look and behave the same; the cost is a few more
    // small, immutable-cached requests. `node scripts/security-headers-check.mjs`
    // fails if an inline one ever comes back.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Vite/Astro paste any script or asset smaller than this (default 4 KB)
      // into the HTML or into CSS as a data: URI. 0 = always emit a file.
      assetsInlineLimit: 0,
    },
  },
});
