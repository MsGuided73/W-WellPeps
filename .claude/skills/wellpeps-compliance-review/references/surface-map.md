# WellPeps public-content surface map

Every place a consumer or a LegitScript analyst can read WellPeps copy, where it
lives in this repo, how it is edited, and how it gets republished. Paths are
relative to the repo root `C:\dev\W`. Verify a path still exists before relying
on it; this map was written 2026-09-15.

## 1. Learning Center / blog articles (Supabase)

| | |
|---|---|
| Source of truth | Supabase project `wellpeps-blog`, tables `blog_articles`, `blog_categories` |
| Read path | `wellpeps-site/src/lib/blog.ts` (build-time, `status = 'published'`) |
| Seed / upsert path | `wellpeps-site/scripts/seed-articles.mjs` from `wellpeps-site/scripts/data/articles.json` (upserts on `slug`) |
| Original manuscripts | `Learning Center/` (Word docs per category) |
| Reviewed fields | `title`, `seo_title`, `meta_title`, `meta_description`, `lede_html`, `body_html`, `key_takeaways`, `cta_title`, `cta_html`, `disclaimer_html` |
| Never change | `slug`, `url_path`, `id`, `position`, `featured_position` (social calendar references slugs) |
| Republish | Update the row (or `articles.json` then `npm run seed:articles`), then rebuild and deploy the Astro site |
| Snapshot | Export in-scope rows to `docs/compliance/snapshots/<date>/articles-before.json` first |

Treatment inserts that render between article prose and Key Takeaways
(Peptide, Sexual Wellness components) are page copy, not article copy; see
section 2.

## 2. Site pages and shared copy (Astro)

| Surface | File(s) |
|---|---|
| Homepage | `wellpeps-site/src/pages/index.astro`, `src/data/content.ts`, `src/data/programs.ts`, `src/components/sections/*.astro` |
| Weight loss | `src/pages/weight-loss.astro`, `src/data/weight.ts`, `src/components/sections/weight/`, `WeightTreatmentOptions.astro` |
| Peptides / Healthy Aging & Vitality | `src/pages/peptides.astro`, `src/data/peptide.ts`, `src/components/sections/peptide/`, `PeptideTherapies.astro`, `PeptideCard.astro` |
| Hair restoration | `src/pages/hair-restoration.astro`, `src/data/hair.ts`, `src/components/sections/hair/`, `HairTreatmentOptions.astro` |
| Sexual wellness | `src/pages/sexual-wellness.astro`, `src/data/sexual.ts`, `src/components/sections/sexual/`, `SexProductCard.astro` |
| Hormone optimization, mental wellness | `src/pages/hormone-optimization.astro`, `src/pages/mental-wellness.astro` (controlled-substance caution) |
| Why WellPeps / About | `src/pages/why-wellpeps.astro`, `WhyChoose.astro`, `Journey.astro` |
| FAQs | `src/components/sections/Faq.astro` and any `faq` arrays in `src/data/*.ts` |
| Safety and disclaimers | `src/components/sections/Safety.astro`, `Footer.astro` |
| Product cards | `StandardProductCard.astro`, `ProductCard.astro`, `ProductCardPills.astro`, `EverythingIncludedStrip.astro`, `Includes.astro` |
| CTAs and waitlist | `FinalCta.astro`, `WaitlistSection.astro`, `HelpFind.astro` |
| Virtual assistant answers | `src/data/knowledge.ts` (mock corpus; production pulls from Supabase via `src/lib/assistant.ts`) |
| Metadata | `src/layouts/BaseLayout.astro` default `description`; per-page `description` props; `og:` tags |
| Alt text | `alt` fields in `src/data/*.ts` and inline `alt=` in components |
| Legal pages (FLAG only) | `privacy-policy.astro`, `terms-of-use.astro`, `notice-of-privacy-practices.astro`, `your-privacy-choices.astro`, `accessibility.astro`, `LegalLayout.astro` |

Editing notes:
- Copy lives in the `src/data/*.ts` files wherever one exists. Edit the string,
  not the component, unless the copy is inline.
- Respect code comments about NBSPs, column-major ordering, and line breaks.
- Republish: `astro build` and deploy. Verify with the dev server
  (`.claude/launch.json`) that the layout did not shift.

## 3. eBooks (Smart Patient Guides)

| | |
|---|---|
| Copy source | `eBooks/_build/outlines/*.json` (sections, leads, cards, callouts, checklists) |
| CTA and kicker copy | `eBooks/_build/config/*.json` |
| Original manuscripts | `eBooks/Content Only/*.docx` (fix here too if the docx will be re-parsed) |
| Never edit | `eBooks/Final/*.pdf`, `eBooks/_build/pdf/*.pdf`, `eBooks/*.pdf` |
| Rebuild | per `eBooks/_build/README.md`: render_html.py, then make_pdf.mjs, then copy to `eBooks/Final/` |
| Books | glp-1-weight-loss, nad, peptides-wellness-therapies, sexual-wellness-medications, healthy-aging-vitality |

Every eBook is a downloadable marketing asset and is in LegitScript scope.

## 4. Social media

| | |
|---|---|
| Calendar | `docs/marketing/WellPeps Social Calendar - Month 1.xlsx` |
| Captions | `docs/marketing/social-carousels-education/CAPTIONS.md`, `docs/marketing/social-carousel-day12/`, `docs/marketing/social-posters/` |
| Rendered assets | `Social Media/Instagram/*.png`, `docs/marketing/social-posters/*.png` (text baked into images: review the source HTML/copy, then re-render) |
| Poster and carousel sources | `docs/marketing/social-posters/posters.html`, `build_posters.py`; `docs/marketing/social-carousels-education/carousels.html` |
| Strategy docs | `Marketing Plan/*.pdf`, `docs/marketing/HANDOFF-social-and-ebooks.md` (context, not consumer-facing) |

Captions get no disclaimer rescue. Every headline in a rendered image is a claim.

## 5. Ads and landing pages

No ad copy is stored in the repo yet. When it is, keep it under
`docs/marketing/ads/<platform>/<campaign>.md` with headline, description,
primary text, CTA, and the landing URL. Review the ad and its landing page
together; platform reviewers compare them.

Platform notes:
- Google: prescription-drug and telehealth ads require certification and
  claims must match the landing page.
- Meta: weight-loss ads must not show before/after, idealized body imagery,
  or target minors; personal-health-attribute targeting is restricted.
- TikTok: weight-management product ads carry age and claim restrictions.

## 5a. Compliance source documents (read, never edit during a review)

| File | Role |
|---|---|
| `eBooks/Marketing Plan/Healthcare-Certification-Step-by-Step-Guide.pdf` | LegitScript: what analysts review, common requests, post-approval duties |
| `eBooks/Marketing Plan/LegitScript Requirements/Healthcare-Certification-101-Guide.pdf` | LegitScript: documents, partners, tips |
| `eBooks/Marketing Plan/LegitScript Requirements/Enterprise-Certification-FactSheet.pdf` | LegitScript: the nine certification standards |
| `eBooks/Marketing Plan/LegitScript Requirements/LegitScript+Licensure+Template.xlsx` | Licensure spreadsheet (application input, not content) |
| `eBooks/Marketing Plan/WellPeps_Pre-LegitScript_Marketing_Community_Strategy.pdf` | WellPeps GREEN/YELLOW/RED strategy |
| `eBooks/Marketing Plan/WellPeps_Pre-LegitScript_Marketing_Community_Playbook.pdf` | WellPeps operating rules and triggers |
| `docs/COMPLIANCE-CHEAT-SHEET.md` | Federal and state floor, peptide tiers, required footer copy |
| `docs/PRE-LAUNCH.md` | Launch checklist context |

## 6. Everything else that is public

- `sitemap`, `robots`, and indexed landing pages generated by Astro
- Email signup confirmations and the `notify-signup` Edge Function copy
- Any Notion, Canva, or Google Drive doc that is shared publicly
- The LegitScript application answers themselves (product/service
  descriptions must match the site)

## Out of scope for editing (FLAG only)

Legal pages, pricing and refund terms, provider-licensing statements, state
availability, partner pharmacy names and accreditations, and anything that
asserts a regulatory status. Record the concern and hand it to a human.
