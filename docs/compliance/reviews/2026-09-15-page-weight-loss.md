# Compliance review — page (weight-loss) — 2026-09-15

**Sample run for presentation. No edits have been applied to the site.**

Reviewer: Claude (wellpeps-compliance-review skill), human review pending  
Scope: https://wellpeps.com/weight-loss/ (live copy confirmed identical to repo at commit 709f82b)  
Snapshot: docs/compliance/snapshots/2026-09-15/weight.ts, weight-loss.astro  
Branch: none (analysis only)  
Spreadsheet: docs/compliance/reviews/2026-09-15-page-weight-loss.xlsx

## Summary

| Verdict | Count |
|---------|-------|
| PASS | 12 |
| REVISE | 5 |
| FLAG | 8 |

Flags and revisions by severity: S1 8 · S2 1 · S3 4

Republish needed if approved: rebuild and deploy the Astro site (all edits are in `src/data/weight.ts`, `EverythingIncludedStrip.astro`, `Footer.astro`, `weight-loss.astro`). Two flags (WL-16, WL-19) touch shared components and fix every treatment page at once.

## Items

### WL-01 — Metadata — REVISE

**Location:** wellpeps-site/src/pages/weight-loss.astro · description (meta)  
**Rule:** Rule 3 Provider terminology; Rule 1 Outcome claims · **Severity:** S3  
**Before:**
> Physician-guided GLP-1 weight management with semaglutide or tirzepatide, plus personalized support for sustainable results. Start your free online health assessment.
**After:**
> Provider-guided GLP-1 weight management with semaglutide or tirzepatide, plus personalized support for your weight management goals. Start your free online health assessment.
**Why:** "Physician-guided" implies every patient is seen by a physician when licensed non-physician clinicians may provide care. "Sustainable results" promises an outcome inside a 155-character field where no context is possible.  
**Source:** Client prompt rule 4; LS Step §5 advertising copy; WP Playbook §14 RED "Promise outcomes"

### WL-02 — Hero — REVISE

**Location:** src/data/weight.ts · weightHero.lead  
**Rule:** Rule 3; Rule 1 · **Severity:** S3  
**Before:**
> Physician-guided GLP-1 weight management that includes semaglutide or tirzepatide, combined with personalized support to help you achieve sustainable results.
**After:**
> Provider-guided GLP-1 weight management that includes semaglutide or tirzepatide, combined with personalized support for your weight management goals.
**Why:** Same two issues as WL-01, in the first sentence a visitor and a LegitScript analyst read.  
**Source:** Client prompt rule 4; LS Step §5

### WL-03 — Hero — REVISE

**Location:** src/data/weight.ts · weightHero.alt (image alt text)  
**Rule:** Rule 1; Rule 9 short formats · **Severity:** S3  
**Before:**
> A fit, smiling woman standing with arms crossed
**After:**
> A smiling woman standing with arms crossed
**Why:** "Fit" is an outcome cue in alt text, which the skill treats as public copy. Separately, if this page becomes a paid-ad landing page, the photo itself should be checked against Meta's idealized-body rule for weight-loss ads.  
**Source:** Surface map §5 Meta; LS Fact p.2 "before/afters, bold health claims"

### WL-04 — Metadata — PASS

**Location:** weight-loss.astro · title  
No material issue.

### WL-05 — How GLP-1 Medications Work — PASS

**Location:** src/data/weight.ts · weightWorksIntro + weightWorks (3 steps)  
Describes the established mechanism of the GLP-1 class and mirrors approved labeling (adjunct to diet and exercise). This is the model for how mechanism language should read across the site. No change.

### WL-06 — How GLP-1 Medications Work — PASS

**Location:** src/data/weight.ts · weightWorksNotes  
No material issue.

### WL-07 — Why Patients Choose WellPeps — FLAG

**Location:** src/data/weight.ts · weightWhyIntro.lead and weightWhy[2] "Made in America Medications"  
**Rule:** Rule 11 WellPeps' role and partner claims; Rule 4 Compounded vs FDA-approved · **Severity:** S1  
**Original language:**
> Personalized care backed by licensed providers, nationwide lab access, and medications compounded in FDA-registered U.S. facilities. / Made in America Medications: Medications are compounded in FDA-registered U.S. facilities.
**Compliance concern:** "FDA-registered" is true only of 503B outsourcing facilities; 503A compounding pharmacies are state-licensed and do not register with FDA. Either way, a consumer hears FDA oversight or approval of the product. LegitScript verifies partner regulatory claims and requires fulfillment pharmacies to be LegitScript-certified or NABP-accredited.  
**Recommended revision:** Medications are prepared by licensed U.S. pharmacy partners. (If the filling pharmacy is a 503B outsourcing facility, "FDA-registered 503B outsourcing facility" may be used once its registration is documented.)  
**Human verification needed:** Which pharmacy fills each of the three products; whether each is 503A or 503B; its FDA registration (if 503B); its LegitScript or NABP status.  
**Suggested owner:** Derek / Scriptful  
**Source:** LS Step §3 Unverified Partners; LS 101 Affiliate and Partner Info; Cheat Sheet §4

### WL-08 — Why Patients Choose WellPeps — FLAG

**Location:** src/data/weight.ts · weightWhy[0] "Personalized Care & Coaching"  
**Rule:** Rule 12 Transparency (pricing and inclusions) · **Severity:** S1  
**Original language:**
> Licensed healthcare providers are available free-of-charge for scheduled follow-ups to discuss your GLP-1 treatment.
**Compliance concern:** "Free-of-charge" is a pricing representation that must match the plan terms and the Everything Included strip. "Coaching" in the card title must correspond to an actual service.  
**Recommended revision:** Keep as written only if follow-ups are included at no extra charge on every plan. Otherwise: "Scheduled follow-ups with a licensed healthcare provider are included in your plan."  
**Human verification needed:** Confirm follow-ups are included on all three plans; confirm what "coaching" is.  
**Suggested owner:** Derek  
**Source:** LS Fact standard "Transparency and Accuracy"

### WL-09 — Why Patients Choose WellPeps — FLAG

**Location:** src/data/weight.ts · weightWhy[1] "Quest® & Labcorp® Access"  
**Rule:** Rule 12 Transparency; Rule 10 unverifiable claims · **Severity:** S1  
**Original language:**
> Available nationwide for free-of-charge initial and follow-up tests for qualified patients.
**Compliance concern:** "Nationwide" and "free-of-charge" are availability and pricing claims; "qualified patients" is undefined; third-party trademarks must be used accurately. The same lab claim appears on other pages, so one decision fixes several.  
**Recommended revision:** Lab testing through Quest Diagnostics® or Labcorp® is available in most states. When your provider orders labs, they are included at no additional cost. (Only if true.)  
**Human verification needed:** Which states labs are available in; what "qualified" means; whether lab cost is included; trademark attribution.  
**Suggested owner:** Derek  
**Source:** LS Step §3 Inadequate Provider Transparency; FTC clear-and-conspicuous

### WL-10 — Weight Management Treatments — PASS

**Location:** src/data/weight.ts · weightProductsIntro.lead + footnote  
This is exactly the conservative prescribing language the spec asks for. No change.

### WL-11 — Weight Management Treatments — REVISE

**Location:** src/data/weight.ts · weightProducts[*].benefits (benefit pills on all three cards)  
**Rule:** Rule 1 Outcome claims; Rule 5 GLP-1 compounded; Rule 9 Short formats · **Severity:** S2  
**Before:**
> Weight Loss · Appetite Control · Reduced Cravings · Blood Sugar Support (semaglutide) / Weight Loss · Appetite Control · Metabolic Health · Blood Sugar Support (tirzepatide) / Weight Loss · Appetite Control · Reduced Cravings · Convenience (oral)
**After:**
> Compounded Semaglutide: GLP-1 Receptor Agonist · Appetite Regulation · Weekly Dosing · Provider Monitored / Compounded Tirzepatide: Dual GIP/GLP-1 · Appetite Regulation · Weekly Dosing · Provider Monitored / Oral: GLP-1 Receptor Agonist · Appetite Regulation · Daily Tablet · Needle-Free
**Why:** Two-word pills are headline outcome claims. For compounded products there is no trial evidence of their own to support them, and "Blood Sugar Support" reads as a diabetes claim on a weight-management product. A footnote cannot rescue a pill. Describing what the medication is and how it is taken keeps the design and removes the claims.  
**Source:** Cheat Sheet §4 FDA Sept 2025 warning letters (sameness and efficacy claims); LS Fact p.2 "bold health claims"; client prompt rule 10

### WL-12 — Weight Management Treatments — PASS

**Location:** src/data/weight.ts · weightProducts[0..1].description  
Mechanism-level, hedged appropriately. Acceptable once the pills above are fixed.

### WL-13 — Weight Management Treatments — FLAG

**Location:** src/data/weight.ts · weightProducts[2].name "Oral Semaglutide"  
**Rule:** Rule 4 FDA-approved vs compounded · **Severity:** S1  
**Original language:**
> Oral Semaglutide — Daily oral GLP-1 option—a convenient, needle-free alternative.
**Compliance concern:** This is the only card without "Compounded" in the name. An FDA-approved oral semaglutide exists (Rybelsus), so the unlabeled name implies the approved product.  
**Recommended revision:** Compounded Oral Semaglutide (if compounded). If this is the FDA-approved product, name it as such.  
**Human verification needed:** Confirm the formulation and source of the oral product.  
**Suggested owner:** Derek / Scriptful  
**Source:** Cheat Sheet §4; client prompt rule 5

### WL-14 — Weight Management Treatments — FLAG

**Location:** Page-level: no compounded-drug disclosure anywhere on the page  
**Rule:** Rule 4; Rule 12 Missing transparency item · **Severity:** S1  
**Original language:**
> (absent)
**Compliance concern:** The page sells two, possibly three, compounded products with no statement of their FDA status. Both LegitScript's transparency standard and the FDA's September 2025 letters target this omission.  
**Recommended revision:** Add beneath the product cards or in the site footer: "Compounded medications are not FDA-approved finished drug products and have not been evaluated by FDA for safety, effectiveness, or quality. A licensed healthcare provider determines whether a particular treatment and formulation may be appropriate for you."  
**Human verification needed:** Decide placement: product section on each treatment page, site-wide footer, or both.  
**Suggested owner:** Derek  
**Source:** Cheat Sheet §9 Model B footer; LS Fact "Transparency and Accuracy"; client prompt rule 5

### WL-15 — Weight Management Treatments — FLAG

**Location:** src/data/weight.ts · price / priceNote / priceFootnote  
**Rule:** Rule 12 Transparency (pricing) · **Severity:** S1  
**Original language:**
> Starting at $179 /month* … $269 … $209 … * Starting price reflects a 52-week plan. Actual pricing depends on your provider's recommended plan.
**Compliance concern:** Starting-price claims tied to a 52-week commitment must be clear and conspicuous and must match checkout. LegitScript reads pricing pages against the application's service description.  
**Recommended revision:** No wording change if accurate. Consider showing the shorter-commitment monthly price next to the 52-week price so the "starting at" figure is not the only number a visitor sees.  
**Human verification needed:** Confirm the three prices and the 52-week condition against Scriptful checkout.  
**Suggested owner:** Derek  
**Source:** LS Fact "Transparency and Accuracy"; FTC clear-and-conspicuous

### WL-16 — Everything Included strip — FLAG

**Location:** src/components/EverythingIncludedStrip.astro (renders on every treatment page)  
**Rule:** Rule 12 Transparency; Rule 9 Disclaimers · **Severity:** S1  
**Original language:**
> One simple monthly price. No surprises. … No Membership Fees · No Hidden Fees · Cancel Anytime*
**Compliance concern:** "Cancel Anytime*" carries an asterisk with no footnote anywhere on the strip. "No surprises" and "No Hidden Fees" are absolute claims sitting next to a 52-week starting price.  
**Recommended revision:** Add the footnote the asterisk promises, on the strip itself: "* Cancel anytime. Refunds are available before that month's medication has been ordered." (wording already used on the homepage in content.ts)  
**Human verification needed:** Confirm cancellation and refund terms with Scriptful; fix once, since the strip is shared by all treatment pages.  
**Suggested owner:** Derek  
**Source:** LS Fact "Transparency and Accuracy"; client prompt rule 10

### WL-17 — Common Questions — PASS

**Location:** src/data/weight.ts · weightFaqs[0,1,2,4,5,7]  
All six describe individualized provider evaluation without promising a prescription. No change.

### WL-18 — Common Questions — PASS

**Location:** src/data/weight.ts · weightFaqs[3] delivery  
Correctly separates provider, WellPeps, and pharmacy partner. No change.

### WL-19 — Common Questions + Footer — FLAG

**Location:** src/data/weight.ts · weightFaqs[6] and Footer.astro "Licensed Providers in All 50 States"  
**Rule:** Rule 12 Transparency (states served) · **Severity:** S1  
**Original language:**
> WellPeps works with licensed providers across all 50 states, although specific treatment availability may vary based on state regulations. / Licensed Providers in All 50 States
**Compliance concern:** LegitScript requires the site to clearly disclose every state in which services are available. "All 50 states" must be true for both provider licensure and pharmacy shipping, and must match the Scriptful excluded-states configuration.  
**Recommended revision:** WellPeps works with licensed providers in [N] states. Treatment availability varies by state; see our [state availability] page.  
**Human verification needed:** Provider coverage by state from the licensure spreadsheet; pharmacy shipping states; publish a state list page.  
**Suggested owner:** Derek  
**Source:** LS Step §3 Inadequate Provider Transparency; LS 101 "Understand your service jurisdictions"

### WL-20 — Final CTA — REVISE

**Location:** src/data/weight.ts · weightCta  
**Rule:** Rule 2 Prescribing language; LS Fact urgency · **Severity:** S3  
**Before:**
> Ready to Start Your Weight Loss Journey? Begin your personalized, provider-guided weight loss journey today. It only takes a few minutes.
**After:**
> Ready to Start? Begin your personalized, provider-guided weight management plan with a free online health assessment. The assessment takes only a few minutes.
**Why:** "It only takes a few minutes" beside "start your weight loss journey" reads as minutes to treatment, which is both a guaranteed-prescription implication and urgency language. Tying the time to the assessment fixes it without losing the CTA.  
**Source:** LS Fact p.2 "urgency language"; client prompt rule 3

### WL-21 — Footer — PASS

**Location:** src/components/Footer.astro · disclaimer  
This is the correct description of WellPeps' role. No change.

### WL-22 — Footer — PASS

**Location:** src/components/Footer.astro · copyright  
No compliance issue. Housekeeping: update to 2026.

### WL-23 — Virtual assistant — PASS

**Location:** Assistant.astro greeting and quick questions (answers live in src/data/knowledge.ts)  
Greeting is compliant. The answer corpus behind "Where do your medications come from?" is a separate surface and is queued for its own review.

### WL-24 — Everything Included strip — PASS

**Location:** EverythingIncludedStrip.astro · "Prescription Medication" as an included item  
Read together with the "Prescription required" footnote directly above it, this does not imply a guaranteed prescription. Acceptable.

### WL-25 — Navigation — PASS

**Location:** NavBar.astro labels  
No material issue.

## Flags requiring a decision

- [ ] WL-07 — Why Patients Choose WellPeps — Which pharmacy fills each of the three products; whether each is 503A or 503B; its FDA registration (if 503B); its LegitScript or NABP status.
- [ ] WL-08 — Why Patients Choose WellPeps — Confirm follow-ups are included on all three plans; confirm what "coaching" is.
- [ ] WL-09 — Why Patients Choose WellPeps — Which states labs are available in; what "qualified" means; whether lab cost is included; trademark attribution.
- [ ] WL-13 — Weight Management Treatments — Confirm the formulation and source of the oral product.
- [ ] WL-14 — Weight Management Treatments — Decide placement: product section on each treatment page, site-wide footer, or both.
- [ ] WL-15 — Weight Management Treatments — Confirm the three prices and the 52-week condition against Scriptful checkout.
- [ ] WL-16 — Everything Included strip — Confirm cancellation and refund terms with Scriptful; fix once, since the strip is shared by all treatment pages.
- [ ] WL-19 — Common Questions + Footer — Provider coverage by state from the licensure spreadsheet; pharmacy shipping states; publish a state list page.
