# Compliance review — article (metadata) — 2026-11-07

Reviewer: Claude (Opus 5.5), wellpeps-compliance-review rules
Scope: `meta_title` and `meta_description` of 7 Learning Center articles (search-result title and snippet only; article text unchanged)
Snapshot: `docs/compliance/snapshots/2026-11-07/article-meta-before.json`
Where changed: `wellpeps-site/scripts/data/articles.json` and Supabase `blog_articles` (same 7 rows, two fields only)
Why: Search-term alignment from the Learning Center Indexing Plan (2026-11-07), before resubmitting to Google.

## Summary

| Verdict | Count |
|---------|-------|
| PASS    | 7 (new wording) |
| REVISE  | 3 (made while drafting, below) |
| FLAG    | 1 (existing content, not changed) |

Checks run: `blog-meta.test.ts` (length, banned words, uniqueness) and `claims.test.ts` pass; full suite 1,232 passed; `check:seo` passed; built pages match `articles.json` for all 46 articles.

## Changes

| Article | Before (title) | After (title) |
|---|---|---|
| why-hair-growth-takes-time | Why Hair Regrowth Takes Time \| WellPeps | How Long Does Hair Loss Treatment Take to Work? \| WellPeps |
| understanding-compounded-medications | Compounded Medications: What Patients Should Know \| WellPeps | Compounded Semaglutide and Tirzepatide Explained \| WellPeps |
| nad-explained | NAD+ Explained: What It Is and Why It Matters \| WellPeps | NAD+ Injections Explained: What NAD+ Is and Does \| WellPeps |
| glutathione-explained | Glutathione: The Body's Natural Antioxidant \| WellPeps | Glutathione Injections: What Glutathione Is \| WellPeps |
| sermorelin-explained | Sermorelin Explained: What It Is and How It Works \| WellPeps | Sermorelin Peptide Explained: What It Is \| WellPeps |
| male-pattern-baldness | Male Pattern Baldness: Causes and Treatments \| WellPeps | Male Pattern Baldness and Receding Hairlines \| WellPeps |
| common-questions-about-glp1-medications | GLP-1 Medications: Answers to Common Questions \| WellPeps | GLP-1 Questions: Timing, Diet and More \| WellPeps |

New descriptions are in `articles.json`; old ones are in the snapshot. All new wording describes topic, mechanism (approved product language for NAD+, glutathione, sermorelin) and the provider's role. No outcome, cure, guarantee or safety claim. Compounded products are distinguished from FDA-approved brand medications (Rule 4).

## Revised while drafting

1. **why-hair-growth-takes-time** — proposed "How Long Does Minoxidil Take to Work?" The article text never names minoxidil (only the product cards do), so the title would promise content the reviewed article doesn't contain. Changed to "hair loss treatment". Rule 1 / Rule 13.
2. **nad-explained** — proposed description named NAD+ nasal spray; the page never mentions it. Removed. Rule 13.
3. **common-questions-about-glp1-medications** — proposed description named side effects, which the article mentions once. Replaced with follow-up care. Rule 13.

## Not applied

- **mic-b12-explained** — proposed "Lipotropic" title. `claims.test.ts` bans "lipotropic": it implies fat loss for an injectable with no approved indication. Dropped.
- **hunger-appetite-and-fullness** — proposed "Food Noise" title; the article never discusses food noise. Needs a content addition (and review) first.
- **female-hair-thinning** — proposed "Oral Minoxidil for Women" title; the article text doesn't discuss oral minoxidil. Needs a content addition (and review) first.

## Flags requiring a decision

- [ ] mic-b12-explained — the article's H1 (Supabase `title`) reads "MIC + B12 Explained: Understanding Lipotropic Injections", and the body uses "lipotropic" 3 times, against the site's own claims rule. Owner and compliance decide whether to reword; it was physician-reviewed, so a change needs Dr. Yirga's sign-off.
- [ ] Confirm with Dr. Yirga whether her review covers search titles and descriptions.
