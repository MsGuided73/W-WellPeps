# Smart Patient Guides: two flows, one switch

The free Smart Patient Guides can be offered two ways. Both are in the code; one environment variable chooses which one a build shows. Nothing was removed, so the current flow can be compared against the new one and either can be the live one.

| | `dialog` (default, what is live) | `landing` (Derek's guide-funnel strategy) |
|---|---|---|
| Home page | Five covers in a row; each opens an email dialog | A 3D ring of covers you can turn; each guide opens its own landing page |
| Program pages | A navy band near the bottom; opens the dialog | A band high on the page after the program is explained; opens the guide's landing page |
| Articles | A guide card in the sidebar | One call to action partway through and one at the end, matched to the article's subject |
| Learning Center hub | Five covers in a row | The same ring |
| Email form | A dialog on whatever page you are on | A compact landing page per guide (email only; first name dropped 2026-10-02), then a thank-you page |
| Extra pages | none | `/smart-patient-guides` (index, never behind a form), `/smart-patient-guides/<guide>`, `/smart-patient-guides/<guide>/thank-you` |
| Footer | unchanged | adds a "Smart Patient Guides" link |

## How to choose

Set `PUBLIC_GUIDE_FLOW` when the site is **built**:

- unset, empty or `dialog`: the current flow. This is the default, so merging this work changes nothing until the variable is set.
- `landing`: the guide-funnel flow.

**Coolify:** Application, Environment Variables, add `PUBLIC_GUIDE_FLOW=landing` and tick *Build Variable*, then deploy. Remove the variable (or set it to `dialog`) and deploy to go back. The Dockerfile passes it through as a build argument.

**Locally:**

```bash
PUBLIC_GUIDE_FLOW=landing npm run dev      # the guide-funnel flow
npm run dev                                # the current flow
```

To look at both at once, run two previews of the same code, or deploy two Coolify apps from the same branch with different values (the client preview app stays on the default).

In the default flow the new pages are not built at all: `/smart-patient-guides` and its children return 404 and nothing links to them.

**The default build is the old build.** Astro bundles a component's CSS and script into every page that imports it, even if the page never renders it. So with the flow off, `astro.config.mjs` points every import of a `components/guides/Guide*.astro` component at an empty stub (`GuideOff.astro`), and the default pages carry none of the new flow's CSS or JavaScript. Checked 2026-10-01: a default build has the same 38 built asset files as a build of the code before this work, within 100 bytes in total, and byte-identical page markup. The variable is read in `astro.config.mjs` from the shell or a `.env` file; Coolify's build variable works the same way.

## Where things are

- The switch: `GUIDE_FLOW` and `GUIDE_LANDING_FLOW` in `src/config.ts`; parsing, addresses, which guide an article gets, and where an article is split are in `src/lib/guide-flow.ts` (tested).
- Copy: `src/data/guide-pages.ts`. It comes from Derek's strategy document and the sample first emails; the six topic cards are real chapter titles from `eBooks/_build/outlines/`. Change copy only there.
- Components: `src/components/guides/` (`GuideRing`, `GuideBand`, `GuideArticleCta`, `GuideLeadForm`, `GuideLanding`, `GuideThanks`, `GuideIndex`, `GuideBook`). The routes are `src/pages/smart-patient-guides/[...path].astro`.
- The old flow: `src/components/EbookOffer.astro`, untouched except for the wording and layout changes made at Derek's request on 2026-10-01.

## Checking it

```bash
npm test                                                   # unit tests, both flows' logic
PUBLIC_GUIDE_FLOW=landing npx astro dev --port 4325        # one terminal
npx astro dev                                              # another (default port 4321)
node scripts/guide-flow-check.mjs                          # ring, bands, articles, form, thank-you, axe, the review's regressions; and that the dialog flow is unchanged
```

For the security headers (the production server blocks inline scripts and styles), build in landing mode and run `node scripts/security-headers-check.mjs`.

## Decisions and things to know

- **One guide set.** Five guides have landing pages. A sixth, Modern Healthcare, has an outline and a first build in `eBooks/` but no cover on the site and no sign-up source in the sign-up function, so it is not included. Adding it means exporting its cover, adding it to `src/data/ebooks.ts` and `guide-pages.ts`, and adding its source to the `notify-signup` function.
- **Consent.** The landing form uses the same two separate, unchecked boxes as the dialog (`chd-form-v0.3-draft`); since 2026-10-02 it asks for email only, like the dialog. Derek's proposed one-line privacy note is not enough for the consumer-health-data laws in the current counsel-pending draft, so the form keeps the boxes until counsel answers the Appendix A.1 question.
- **Sign-up source.** The landing form records the same source as the dialog (for example `ebook_glp1`), so the two flows cannot be told apart in the sign-up table. Add a source (and the function change) if that is wanted.
- **The thank-you page and the PDF.** The landing page never links to the PDF; the thank-you page does. On a static site that is not a lock: anyone who knows the PDF's address can open it. Until Derek approves a guide's final PDF (`pdf` in `src/data/ebooks.ts`), the thank-you page says the guide will be emailed and shows no download button. It does not say "we've also sent a copy" because nothing sends one yet.
- **Not built yet:** tracking of the funnel (analytics is off in production and sits behind the privacy control), remembering a visitor so later guides are one click, and the follow-up email sequence (needs an email provider).
- **Button wording.** The assessment button is always "Start Free Health Assessment" (`src/lib/cta.ts`), not "Start Your Free Assessment".
- **Healthy Aging.** Derek's line for that page reads "how different therapies," and was completed as "how different therapies work."
- **Guide names.** The cover and the sign-up consent say "GLP-1 Weight Loss"; Derek's landing copy says "GLP-1 Weight Management". The pages use the cover's name so the page, the consent and the PDF agree. Needs Derek's decision.
