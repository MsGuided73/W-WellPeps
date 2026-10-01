# WellPeps — Marketing Site

The brand-facing "window dressing" for WellPeps. All PHI, accounts, and the
telehealth intake/onboarding are operated by **Scriptful (GEN Health)**; this site is a
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
npm run images     # convert newly-delivered photos to WebP
```

## Private-preview password gate

Until LegitScript certification, the live site can be locked behind one shared
password. The gate runs in nginx (`nginx.conf.template`), so a locked visitor
never receives page HTML: every page answers `401` with the branded gate page
(`src/pages/preview-access.astro`) at the URL they asked for. Entering the
password sets a 30-day `wp_gate` cookie and reloads that page. Images, fonts
and `/_astro/` assets stay public so the gate page can render.

**Turn it on**
1. `node scripts/gate-hash.mjs "the password"` and copy the 64-character hash.
2. In Coolify, add a **runtime** env var `SITE_GATE_HASH` = that hash (not a
   build variable; no rebuild needed).
3. Restart (or redeploy) the app. The container log shows `site gate ON`.

**Turn it off** — clear `SITE_GATE_HASH` (empty value, or delete it) and
restart. Everyone gets in, including visitors holding an old cookie.

**Rotate the password** — generate a new hash, replace the value, restart.
Every existing cookie stops working; people re-enter the new password.

Notes:
- The hash is the credential nginx checks (and the cookie value), so treat it
  like the password. A malformed value (not 64 lowercase hex characters, e.g.
  the raw password pasted by mistake) stops the container from starting.
- Unlock attempts are rate-limited to 30/minute (burst 10). Behind Coolify's
  proxy that limit may be shared by all visitors, so use a strong password
  rather than relying on the limit.
- `npm run dev` / `npm run preview` never show the gate — it only exists in
  nginx. The page itself can be previewed in dev at `/preview-access/`
  (production returns 404 there except as the gate response).

## Security headers (nginx)

`nginx.conf.template` sends a Content-Security-Policy, Strict-Transport-Security,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy on
every response, and redirects http to https when the proxy reports
`X-Forwarded-Proto: http`. They exist only in nginx: `npm run dev` and
`npm run preview` send none, so a policy problem will not show up there.

- The CSP allows scripts and styles from the site's own files only, so the build
  must not emit inline scripts or `<style>` elements (`astro.config.mjs` sets
  `inlineStylesheets: 'never'` and `assetsInlineLimit: 0`) and a page must not use
  `is:inline` scripts or `onclick=` attributes. A new outside address a page calls
  must be added to `connect-src` in the template.
- Change the policy in the `$wp_csp` line, then run `npm test` and, after
  `npm run build`, `npm run check:headers`. The check serves the build with the
  template's exact headers and drives Chromium through every page and the
  dialogs, forms and menus. It does not run nginx itself; run `nginx -t` on the
  image when Docker is available.

## Adding new images

Design delivers photography as PNG. **Do not commit PNG/JPG photos** — PNG is
lossless and built for flat-colour graphics, so a photo lands 30-40x larger than
it needs to be. One real example: a hero photo went from 2.74 MB to 71 KB with no
visible difference and no change in dimensions.

Workflow when a new batch arrives:

```bash
# 1. Drop the delivered files into public/images/<section>/
# 2. Preview what will change
npm run images -- --dry

# 3. Convert (originals are removed once the output is verified)
npm run images

# 4. Reference the .webp path in the relevant data/*.ts, then
npm run build
```

Notes:
- **Dimensions are never changed.** Delivered sizes (~1300-1500px) are already
  correct; this is only a format change.
- **Logos and icons are skipped automatically** — lossy compression softens
  crisp edges and saves almost nothing. They stay as lossless PNG.
- Use lowercase-with-hyphens filenames, no spaces (spaces must be URL-encoded
  and trip up some tooling).
- `--dir=public/images/peptide` limits the run to one folder; `--keep` retains
  the originals.

## Structure
```
src/
  config.ts              # SCRIPTFUL_* placeholders + contact + nav links  ← cutover edit lives here
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
- [ ] Replace the `SCRIPTFUL_*` placeholders in `src/config.ts` with the real GEN Health links
      (and per-program deep-link format if supported — see `assessmentUrl()`).
- [ ] Point the footer newsletter form at a real handler (Netlify Forms wiring
      is already stubbed via `data-netlify`), or your ESP.
- [ ] Self-host Lora + Inter to drop the Google Fonts request (perf/CSP).
- [ ] Swap the final-CTA image for the clean high-res original (currently
      cropped from the guide slide).
- [ ] Real hrefs for Insights articles, legal pages, and program sub-pages.
