# Smart Patient Guides: the guide funnel

Since 2026-10-12 the guide funnel (Derek's strategy) is the site's only way of offering the free Smart Patient Guides. The old email-dialog flow (`EbookOffer.astro`) and the `PUBLIC_GUIDE_FLOW` build switch were removed; nothing needs to be set in Coolify.

| Where | What it shows |
|---|---|
| Home page | A strip of covers that slides; each guide opens its own landing page |
| Program pages | A band high on the page after the program is explained; opens the guide's landing page |
| Articles | One call to action partway through and one at the end, matched to the article's subject |
| Learning Center hub | The same strip |
| Email form | A landing page per guide (email only; first name dropped 2026-10-02), then a thank-you page. GLP-1 uses the full layout (`GuideFeatureLanding`, client mock 2026-10-12); the other guides keep the compact layout until Derek has reviewed it |
| Pages | `/smart-patient-guides` (index, never behind a form), `/smart-patient-guides/<guide>`, `/smart-patient-guides/<guide>/thank-you` |
| Footer | a "Smart Patient Guides" link |

## Where things are

- Addresses, which guide an article gets, and where an article is split: `src/lib/guide-flow.ts` (tested).
- Copy: `src/data/guide-pages.ts`. It comes from Derek's strategy document and the sample first emails; the six topic cards are real chapter titles from `eBooks/_build/outlines/`. Change copy only there.
- Components: `src/components/guides/` (`GuideRing`, `GuideBand`, `GuideArticleCta`, `GuideLeadForm`, `GuideLanding`, `GuideFeatureLanding`, `GuideThanks`, `GuideIndex`, `GuideBook`). The routes are `src/pages/smart-patient-guides/[...path].astro`.

## Checking it

```bash
npm test                              # unit tests
npm run dev                           # http://localhost:4321
node scripts/guide-flow-check.mjs     # strip, bands, articles, forms, thank-you pages, axe; and that the old dialog has not come back
```

For the security headers (the production server blocks inline scripts and styles), build and run `node scripts/security-headers-check.mjs`.

## Decisions and things to know

- **One guide set.** Five guides have landing pages. A sixth, Modern Healthcare, has an outline and a first build in `eBooks/` but no cover on the site and no sign-up source in the sign-up function, so it is not included. Adding it means exporting its cover, adding it to `src/data/ebooks.ts` and `guide-pages.ts`, and adding its source to the `notify-signup` function.
- **Consent.** The landing form uses two separate, unchecked boxes (`chd-form-v0.3-draft`) and asks for email only (since 2026-10-02). Derek's proposed one-line privacy note is not enough for the consumer-health-data laws in the current counsel-pending draft, so the form keeps the boxes until counsel answers the Appendix A.1 question.
- **Sign-up source.** The landing form records the guide's source (for example `ebook_glp1`); sign-ups from before 2026-10-12 with the same source came from the old dialog.
- **The thank-you page and the PDF.** The landing page never links to the PDF; the thank-you page does. On a static site that is not a lock: anyone who knows the PDF's address can open it. Until Derek approves a guide's final PDF (`pdf` in `src/data/ebooks.ts`), the thank-you page says the guide will be emailed and shows no download button. It does not say "we've also sent a copy" because nothing sends one yet.
- **Not built yet:** tracking of the funnel (analytics is off in production and sits behind the privacy control), remembering a visitor so later guides are one click, and the follow-up email sequence (needs an email provider).
- **Button wording.** The assessment button is always "See If You Qualify" (`src/lib/cta.ts`), never "Start Your Free Assessment".
- **Healthy Aging.** Derek's line for that page reads "how different therapies," and was completed as "how different therapies work."
- **Guide names.** The cover and the sign-up consent say "GLP-1 Weight Loss"; Derek's landing copy says "GLP-1 Weight Management". The pages use the cover's name so the page, the consent and the PDF agree. Needs Derek's decision.
