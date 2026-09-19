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
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
