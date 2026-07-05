import { defineConfig } from 'astro/config';

// WellPeps marketing site — static output.
// All PHI, accounts, and onboarding live on the OpenLoops platform;
// this site is the brand-facing "window dressing" that links out to it.
export default defineConfig({
  site: 'https://www.wellpeps.com',
  build: {
    inlineStylesheets: 'auto',
  },
});
