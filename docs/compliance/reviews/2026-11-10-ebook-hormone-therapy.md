# Compliance review — ebook — 2026-11-10

Reviewer: Claude Code (claude-opus-5-5), wellpeps-compliance-review skill
Scope: Men's Hormone Therapy and Women's Hormone Therapy eBook manuscripts (V1), as built into
`eBooks/_build/outlines/mens-hormone-therapy.json` and `womens-hormone-therapy.json` (v1 PDFs in `eBooks/`).
Snapshot: the source manuscripts are unchanged at `website-additions/Hormone Therapy/Hormone-eBooks/` (copy in
`eBooks/Hormone-eBooks/`). Edits were made while hand-building the outlines; the manuscripts were not edited.
Branch: none. Work left uncommitted in `main`'s working tree for the owner to review (the hormone program pages it
depends on are themselves uncommitted).

Facts used: the estradiol patch is not compounded (owner, 2026-11-10); the vaginal estradiol cream IS compounded
(owner correction later on 2026-11-10: every cream in the GEN formulary is made in a pharmacy base; applied in Women's v2); testosterone cream
is compounded (owner); testosterone cypionate and oral progesterone status unverified (`src/data/product-disclosures.ts`
tags both compounded meanwhile, and their product photos are labelled Compounded); hCG is a provider-directed
specialty option with no product card (formulary note, `product-disclosures.ts`).

## Summary

| Verdict | Count |
|---------|-------|
| PASS    | 31 sections (17 Men's, 14 Women's) |
| REVISE  | 15 passages |
| FLAG    | 9 |

Flags by severity: S1 6 · S2 3 · S3 0

Republish needed: both books are built (Men's v1, Women's v2). Nothing is deployed. Medical review (Dr. Yirga) and Derek's approval
are required before the site entries go live.

Grammar-only fixes (not compliance, listed so nothing is silent): Men's 00 "doesn't automatically mean testosterone
is only the possible problem" -> "doesn't automatically mean low testosterone is the problem"; Men's and Women's
checklists "been evaluated/considered/confirmed" -> "be evaluated/considered/confirmed" (six questions).

## Items

### Men's 00–04, 06–08, 11, 13, 14, 16 (journey body), 18 — PASS
No material issue.

### Men's 05 — Your Lab Results Tell an Important Part of the Story — REVISE

**Location:** THE WELLPEPS APPROACH
**Rule:** 11 (partner representations) and site rule `claims.test.ts` (no named lab partner without a written arrangement); 10 (undocumented pricing claim) · **Severity:** S1
**Before:**
> WellPeps offers convenient laboratory testing options, including access to Quest Diagnostics and Labcorp at discounted rates, with provider review of results. Available at-home testing options may also be considered when clinically suitable.
**After:**
> WellPeps offers convenient laboratory testing options at a nearby lab or, when clinically suitable, with an at-home kit, with provider review of results. Lab fees are billed separately.
**Why:** Names lab partners without a written arrangement and claims "discounted rates" that cannot be documented; lab fees are billed separately.

### Men's 09 — Understanding Testosterone Cypionate — REVISE (and FLAG below)

**Location:** body, added after the considerations list
**Rule:** 4 (FDA-approved vs compounded) · **Severity:** S1
**Before:**
> (no statement of regulatory status)
**After:**
> Testosterone cypionate is made both as an FDA-approved manufactured product and as a compounded preparation. Compounded medications are not FDA-approved. Ask your provider which one you are prescribed.
**Why:** The site and product photo label WellPeps' vial "Compounded" while the page describes the approved indication; the reader must not infer approval.

**Location:** THE WELLPEPS APPROACH
**Rule:** 11 (WellPeps' role) · **Severity:** S3
**Before:**
> Testosterone cypionate is among the treatment options that a WellPeps medical provider may prescribe for eligible patients.
**After:**
> Testosterone cypionate is among the treatment options a licensed provider may prescribe through WellPeps for eligible patients.
**Why:** Providers are independent licensed providers on the platform, not WellPeps staff.

### Men's 10 — Understanding Testosterone Cream — REVISE

**Location:** body
**Rule:** 4 · **Severity:** S1
**Before:**
> Testosterone creams may be compounded preparations. Unlike FDA-approved manufactured testosterone products, compounded medications are not FDA-approved and have not undergone FDA review for safety, effectiveness, or quality.
**After:**
> The testosterone cream prescribed through WellPeps is a compounded preparation. Unlike FDA-approved manufactured testosterone products, compounded medications are not FDA-approved and have not undergone FDA review for safety, effectiveness, or quality.
**Why:** The owner confirmed WellPeps' cream is compounded; "may be" understated it.

### Men's 15 — Personalized Hormone Care, Step by Step — PASS
No material issue. ("If prescribed" in step 04 is a clinical statement, not pricing copy.)

### Men's 17 / Women's 16 — Why We Created WellPeps (added from the series) — REVISE

**Location:** Straightforward Pricing card
**Rule:** 12 (pricing transparency) · **Severity:** S1
**Before:**
> One monthly price: provider review, follow-up care, messaging, shipping and medication when prescribed.
**After:**
> One monthly price: provider review, follow-up care, messaging, shipping and medication when prescribed. Lab fees are billed separately.
**Why:** Hormone therapy requires labs (men) or may (women); the series card alone could read as all-inclusive.

### Men's CTA — REVISE

**Location:** CTA button and line under it
**Rule:** site rule `claims.test.ts` / README section 5 (no "free" assessment; intake-first: payment at checkout before review) · **Severity:** S1
**Before:**
> START YOUR FREE HEALTH ASSESSMENT
> See if you qualify for treatment. There is no cost to complete this initial screening.
**After:**
> [button] See If You Qualify (the no-cost line is removed)
**Why:** The clinician review is part of the paid monthly price and the patient pays at checkout before review.

### Men's disclaimer — REVISE

**Location:** disclaimer page (the manuscript's one-paragraph note plus the series standard, as the manuscript asks)
**Rule:** 4, 9 · **Severity:** S2
**Before:**
> Educational information only. This guide does not provide medical advice, establish a diagnosis, or guarantee eligibility for treatment. Prescription medications require evaluation and authorization by an appropriately licensed healthcare provider. Medication availability and treatment requirements may vary.
**After:** four paragraphs: the note above with the series wording; off-label and compounded-medication paragraph (hCG with testosterone is off-label; testosterone cream is compounded); "Testosterone therapy can reduce sperm production and fertility. Topical testosterone can transfer to other people through skin contact; follow the application instructions."
**Why:** The book discusses a compounded product and an off-label use; the disclaimer states both plainly.

### Women's 00–03, 05–07, 11–15 (except the items below), 17 — PASS
No material issue.

### Women's 04 — Do You Need Hormone Testing to Diagnose Menopause? — REVISE

**Location:** THE WELLPEPS APPROACH
**Rule:** 11 and `claims.test.ts` (named lab partners) · **Severity:** S1
**Before:**
> WellPeps offers laboratory testing access through Quest Diagnostics, Labcorp, and appropriate at-home options. Providers review relevant results in context.
**After:**
> WellPeps offers laboratory testing access at a nearby lab or, when appropriate, with an at-home kit. Providers review relevant results in context. Lab fees are billed separately.
**Why:** Same as Men's 05.

### Women's 08 — Understanding Estradiol Transdermal Patches — REVISE

**Location:** Potential advantages, fourth item
**Rule:** 1 (comparative safety claim), 10 (evidence level) · **Severity:** S2
**Before:**
> May have a lower blood-clot risk than oral estrogen, although individual risks still matter
**After:**
> Observational studies suggest a lower blood-clot risk than oral estrogen, although individual risks still matter
**Why:** A safer-than claim must say what the evidence is; the transdermal VTE data are observational.

**Location:** body, added
**Rule:** 4 · **Severity:** S1
**Before:**
> (no statement of regulatory status)
**After:**
> The estradiol patches prescribed through WellPeps are manufactured, FDA-approved products, not compounded preparations.
**Why:** Owner confirmed estradiol is not compounded; the checklist asks readers to check this, so the book answers it. See FLAG 6.

**Location:** THE WELLPEPS APPROACH
**Rule:** none (wording) · **Severity:** S3
**Before:**
> Your provider selects whether systemic estrogen is appropriate and determines the dose and formulation.
**After:**
> Your provider determines whether systemic estrogen is appropriate and selects the dose and formulation.
**Why:** "Selects whether" did not read; verbs swapped, meaning unchanged.

### Women's 09 — Why Is Progesterone Often Prescribed With Estrogen? — REVISE

**Location:** body, added after the list
**Rule:** 4 · **Severity:** S1
**Before:**
> (no statement of regulatory status)
**After:**
> Oral micronized progesterone is made both as an FDA-approved manufactured product and as a compounded preparation. Compounded medications are not FDA-approved. Ask your provider which one you are prescribed.
**Why:** WellPeps' product photo is labelled Compounded and the status is unverified.

### Women's 10 — Vaginal Dryness, Discomfort & Menopause — REVISE

**Location:** body
**Rule:** 1 (outcome wording), 4 · **Severity:** S2
**Before:**
> Low-dose vaginal estradiol cream delivers estrogen locally to relieve symptoms.
**After:**
> Low-dose vaginal estradiol cream delivers estrogen locally and is used to treat these symptoms. The vaginal estradiol cream prescribed through WellPeps is a compounded preparation made by a state-licensed pharmacy. Compounded medications are not FDA-approved and have not been evaluated by FDA for safety, effectiveness, or quality.
**Why:** States the use rather than a promised result, and the cream's compounded status (v1 wrongly said FDA-approved; corrected in v2 after the owner's correction).

### Women's CTA — REVISE

**Location:** CTA
**Rule:** as Men's CTA · **Severity:** S1
**Before:**
> Start Your Free Health Assessment
> See if you qualify for treatment. There is no cost to complete this initial screening.
**After:**
> [button] See If You Qualify. Body (series wording, the manuscript has none left): "Begin with a private online health assessment. A licensed healthcare provider will review your health information and determine whether treatment is appropriate for you."
**Why:** As Men's CTA.

### Women's disclaimer — REVISE

**Location:** disclaimer page
**Rule:** 4, 9 · **Severity:** S2
**Before:**
> Educational information only. This guide does not provide medical advice or guarantee eligibility. Prescription medications require licensed-provider evaluation. Availability and requirements may vary.
**After:** four paragraphs: the note with the series wording; the compounded-medication paragraph (progesterone may be compounded); "Systemic estrogen has contraindications and potential risks. Women with a uterus who use systemic estrogen generally need a progestogen to protect the uterine lining. Report unexpected vaginal bleeding to a healthcare professional."
**Why:** Safety points from the book's own pages 08–10 restated where a reader expects them.

## Flags

**FLAG 1 — Men's 08 and 12, hCG — S1**
**Original language:** "hCG — A different hormonal approach ..." (options card) and the whole page 12.
**Compliance concern:** hCG is a biologic that 503A pharmacies may not compound (since March 2020); FDA-approved
products exist. Its use alongside testosterone to preserve fertility is off-label. The manuscript's editorial note
asks the clinical team to confirm its approach to hCG. The book presents it as a WellPeps option ("WellPeps offers
multiple hormone therapy options").
**Recommended revision:** none needed if WellPeps' providers do prescribe an FDA-approved hCG through a partner
pharmacy; otherwise drop the options card and keep page 12 as education only.
**Human verification needed:** medical director: is hCG prescribed, which product, and for which indications.

**FLAG 2 — Men's 09 and Women's 09 — S1**
Testosterone cypionate and oral micronized progesterone: manufactured (FDA-approved) or compounded? The added
"made both ways, ask your provider" line is accurate either way, but once the pharmacy confirms, replace it with a
plain statement (as on the cream and estradiol pages) and update `product-disclosures.ts` to match.

**FLAG 3 — Men's (whole book) — S1, legal**
Testosterone is a Schedule III controlled substance. Telehealth prescribing relies on the DEA telemedicine
flexibilities, extended to Dec 31, 2026 (Cheat Sheet §4, special-registration rule expected Nov 2026). The book
does not mention this, but it promotes an online program for a controlled substance. Counsel to confirm the program
can prescribe after Dec 31, 2026 before the guide is promoted; `legitscript-audit` owns the program-level check.

**FLAG 4 — both CTAs and journeys — S1, pricing transparency (owned by legitscript-audit)**
The books no longer say the assessment is free, but they also do not say the patient pays at checkout before the
clinician review and is refunded in full if not prescribed (the site's journey says so). Decide whether the eBook
should state it.

**FLAG 5 — Women's 05 — S2**
"It is among the most effective treatments for bothersome hot flashes and night sweats and may help prevent bone
loss in selected patients." Guideline-consistent (systemic estrogen), but a comparative efficacy claim. Dr. Yirga
to confirm.

**FLAG 6 — Women's 08 — S1**
"manufactured, FDA-approved products, not compounded preparations" (patch) rests on the owner's statement. Confirm
with the pharmacy that the dispensed patch is FDA-approved (brand or generic). The cream is compounded (resolved, v2).

**FLAG 7 — Women's 08 — S2**
Transdermal vs oral clot risk now attributed to observational studies. Dr. Yirga to confirm the wording.

**FLAG 8 — Men's 04 and 07 — S2**
"Clinical guidelines can recommend confirming low testosterone with two separate early-morning measurements" and
the list of potential benefits (sexual desire, some aspects of sexual function, anemia, bone density, body
composition). Accurate to current guidelines and trials as far as known; Dr. Yirga to confirm.

**FLAG 9 — both books — S1, medical review**
Both books need Dr. Yirga's medical review before publication (manuscript note: "Clinical team to review fertility,
contraindications, monitoring, and compounded-medication language"). Not recorded as reviewed anywhere.

## Flags requiring a decision

- [ ] Men's 08/12 — hCG: is it prescribed, which product, which indications (medical director)
- [ ] Men's 09 / Women's 09 — testosterone cypionate and progesterone: compounded or FDA-approved (pharmacy)
- [ ] Men's — DEA telemedicine status for testosterone after Dec 31, 2026 (counsel)
- [ ] Both — say "pay at checkout, full refund if not prescribed" in the eBooks? (owner / legitscript-audit)
- [ ] Women's 05 — "among the most effective treatments" (Dr. Yirga)
- [ ] Women's 08 — estradiol patch FDA-approved status (pharmacy); cream resolved as compounded (v2)
- [ ] Women's 08 — observational clot-risk wording (Dr. Yirga)
- [ ] Men's 04/07 — diagnosis guideline and benefits list (Dr. Yirga)
- [ ] Both — full medical review by Dr. Yirga before publishing
