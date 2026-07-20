# WellPeps — Marketing Site

The brand-facing "window dressing" for WellPeps. All PHI, accounts, and the
telehealth intake/onboarding are operated by **OpenLoops**; this site is a
fast, static marketing layer that links out to it. That keeps the site almost
entirely out of HIPAA scope.

Built with **Astro** (static HTML/CSS output, reusable components, JSON/TS-driven
content) — chosen over hand-rolled HTML so the Nav/Footer/cards are authored once
and reused across every future sub-page.

## Commands
```bash
npm install        # once
npm run dev        # local dev at http://localhost:4321
npm run build      # static output to ./dist
npm run preview    # serve the built ./dist
```

## Structure
```
src/
  config.ts              # ONBOARDING_URL stub + contact + nav links  ← wire OpenLoops here
  styles/tokens.css      # design tokens (source of truth; mirrors Design System v2)
  styles/global.css      # base + shared component styles (buttons, cards, icons…)
  layouts/BaseLayout.astro
  components/
    NavBar.astro  Footer.astro  Icon.astro
    sections/            # the 10 Home Page sections, in order
  data/
    programs.ts          # 6 wellness program cards
    content.ts           # why/journey/includes/safety/insights/faqs
  pages/index.astro      # assembles the Home Page
public/images/           # optimized JPGs + logo + LegitScript seal
```

## Home Page sections (per MASTER Guide, in order)
1. Hero · 2. Why Patients Choose WellPeps · 3. We Help You Find the Treatment ·
4. Our Wellness Programs · 5. Your Wellness Journey · 6. Every WellPeps Program
Includes · 7. Safety, Wellness & Privacy · 8. Wellness Insights · 9. Common
Questions (FAQ) · 10. Final CTA.

## Design system
Follows **`Design Reference/WellPeps_Brand_Design_System_v2_MASTER-aligned.md`**:
editorial serif headings (Lora), Inter body, navy `#082B59` headings, and
working blue `#0077BE` for CTAs, links and accent words. Tokens live in
`src/styles/tokens.css`.

## TODO before launch
- [ ] Replace `ONBOARDING_URL` in `src/config.ts` with the real OpenLoops link
      (and per-program deep-link format if supported — see `assessmentUrl()`).
- [ ] Point the footer newsletter form at a real handler (Netlify Forms wiring
      is already stubbed via `data-netlify`), or your ESP.
- [ ] Self-host Lora + Inter to drop the Google Fonts request (perf/CSP).
- [ ] Swap the final-CTA image for the clean high-res original (currently
      cropped from the guide slide).
- [ ] Real hrefs for Insights articles, legal pages, and program sub-pages.
