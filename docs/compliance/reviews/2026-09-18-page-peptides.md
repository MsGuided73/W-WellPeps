# Compliance review — page — 2026-09-18

Reviewer: Claude Opus 5 (1M context), `wellpeps-compliance-review`
Scope: Healthy Aging & Vitality page, route `/peptides` — `src/data/peptide.ts`,
`src/pages/peptides.astro`, `src/components/sections/peptide/*.astro`, and the
shared `EverythingIncludedStrip.astro` and `Footer.astro` as they render on this page.
Snapshot: `docs/compliance/snapshots/2026-09-18/` (pre-rewrite copies taken from `git show HEAD:`)
Branch: none — reviewed on a dirty working tree (see Working-tree note below)

**Run type: report only.** The user applied Derek's rewrite immediately before this
run and asked for verification plus a sweep of what the rewrite did not cover. No
files were edited by this review.

**Addendum 2026-09-19 — four flags remediated.** On the user's instruction, F3, F4,
F5 and F10 were fixed the day after this review, and the page moved from `/peptides`
to `/healthy-aging`. See the Remediation section at the end. F1, F2, F6, F7, F8, F9,
F11, F12, F13 and F14 remain open, and the rename sweep surfaced F15–F20.

## Working-tree note

Workflow step 1 requires a clean tree or a review branch. Neither applied. The five
page files were modified in the working tree minutes before the review and are
uncommitted. The pre-rewrite state is fully recoverable — all five are tracked and
clean at `HEAD` — and has been copied into the snapshot directory above. Flagging
per the skill's "never review on a dirty tree without telling the user" rule.

## Summary

| Verdict | Count |
|---------|-------|
| PASS    | 12 |
| REVISE  | 0 |
| FLAG    | 14 |

Flags by severity: S1 8 · S2 2 · S3 4

Republish needed: none from this review (no edits made). The rewrite itself needs a
site rebuild + deploy, which is outside this log.

## Verdict on the applied rewrite

Derek's rewrite is a material compliance improvement and clears the issues it set out
to clear. All twelve PASS items below were re-verified against the built HTML at
`dist/peptides/index.html`, not just the source.

The six product descriptions now track spec Rule 6 closely enough that three of them
are near-verbatim matches for the rule's own ACCEPTABLE examples (NAD+, L-carnitine,
methylene blue incl. its "emerging research" framing). All six products are Tier 1 or
Tier 2 per Cheat Sheet §1 — **no Tier 3 peptide appears on the page**. The mechanism →
outcome conversions that Rule 1 targets ("Improved Energy", "Better Sleep", "boosts",
"optimize performance") are gone, and the asterisk-plus-footnote pattern that Rule 9
rejects has been replaced with a single substantive disclosure carrying the Rule 4
compounded-medication language.

Every remaining FLAG is in copy the rewrite did not touch.

## Items

### Hero — H1 and lead — PASS
No material issue. "Healthy Aging & Vitality. / Feel Like Yourself Again." is brand
tagline copy with no medication attached; the lead is Rule 2 preferred wording.

### Science band — heading and both paragraphs — PASS
No material issue. "options that providers may consider for appropriate patients" is
textbook Rule 2. The prior version's outcome list ("help support healthy aging,
metabolic health, energy, recovery") is gone.

### Benefits band — heading, lead and footnote — PASS
No material issue. Reframing from "Potential Benefits of…" to "Supporting Your Healthy
Aging Goals" converts the block from claimed benefits to patient goal categories, which
is the substantive fix Rule 1 asks for. Footnote is Rule 2 language. (One label pair is
flagged separately — see F1.)

### Products section — heading and lead — PASS
No material issue.

### Product card — Sermorelin — PASS
No material issue. Matches Rule 6's sermorelin bullet. (Legal basis flagged separately — F2.)

### Product card — NAD+ — PASS
No material issue. Near-verbatim match for the spec's ACCEPTABLE NAD+ example.

### Product card — Glutathione — PASS
No material issue. Matches Rule 6's glutathione bullet.

### Product card — MIC + B12 — PASS
No material issue. Matches Rule 6's vitamin B12 bullet.

### Product card — Lipo-C — PASS
No material issue. Near-verbatim match for the spec's ACCEPTABLE L-carnitine example.

### Product card — Methylene Blue — PASS
No material issue. Matches Rule 6's methylene blue bullet, including the required
characterisation of research as still evolving.

### Products disclaimer footnote — PASS
No material issue. Carries the Rule 4 compounded disclosure.

### Page metadata — `<title>` and `meta description` — PASS
No material issue. The description previously carried "optimize performance", which
Rule 1 treats as both an outcome claim and an anti-doping liability on a page selling a
growth-hormone secretagogue; it was replaced during the rewrite.

---

### F1. Benefits labels — "Healthy Aging", "Strength & Body Composition" — FLAG

**Location:** `src/data/peptide.ts` > `peptideBenefits`
**Rule:** Rule 1 (card-style benefit lists); Cheat Sheet §7 · **Severity:** S3
**Original language:**
> Energy & Vitality · Cognitive Wellness · Healthy Aging · Metabolic Wellness · Skin & Cellular Health · Strength & Body Composition · Recovery & Physical Wellness · Sleep & Rest

**Compliance concern:** Rule 1 names "Healthy Aging" explicitly as an outcome claim in
headline form and says such lists are held to the rule "regardless of any footnote
beneath them." Separately, "Strength & Body Composition" sits on a page whose lead
product is a growth-hormone secretagogue, and Cheat Sheet §7 warns that
body-composition and performance framing is both a human-use signal and an anti-doping
liability for that drug class.

**Recommended revision:** none required if the reframing is accepted. The new heading
("Supporting Your Healthy Aging Goals") and lead ("Your health, needs, and goals are
individual… may be considered as part of a personalized approach") reposition the eight
as *patient goal categories* rather than *benefits of the therapies*, which is a real
and defensible distinction. If a more conservative reading is wanted, "Strength & Body
Composition" is the one to change — "Physical Wellness" would absorb it.

**Human verification needed:** Derek or counsel to confirm the goal-category framing is
the intended defence, given Rule 1's explicit naming of "Healthy Aging".

### F2. Sermorelin — 503A compounding basis — FLAG

**Location:** `src/data/peptide.ts` > `peptideProducts[0]`; rendered card
**Rule:** Rule 6 (peptide tiering); Cheat Sheet §1, §12; spec conflicts §4 · **Severity:** S1
**Original language:**
> Sermorelin — Natural Growth Hormone Support

**Compliance concern:** Pre-existing, not introduced by this rewrite. Sermorelin appears
on no FDA 503A category list. It is compounded on the basis of a prior approval (Geref,
discontinued 2008), and the cheat sheet calls this "the least settled" of the Tier 2
bases and carries a standing ⚠ VERIFY. The product copy itself is compliant; the
question is whether the product may be offered at all.

**Recommended revision:** none to the copy.
**Human verification needed:** written confirmation from the dispensing pharmacy of the
legal basis it relies on for sermorelin, and counsel sign-off. Cheat Sheet §12 lists
this as an open counsel question.

### F3. FAQ trust line — "physician-guided" and delivery attribution — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqsIntro.trust`
**Rule:** Rule 3 (provider terminology); Rule 11 (WellPeps' role) · **Severity:** S3
**Original language:**
> All therapies are physician-guided, prescribed only when appropriate, and delivered discreetly to your door.

**Compliance concern:** Two issues. "physician-guided" implies every patient is
evaluated by a physician (Rule 3). "delivered discreetly to your door" attributes
delivery to WellPeps, which does not dispense or ship (Rule 11) — note that FAQ #8 on
the same page gets this right by naming the pharmacy.

**Recommended revision:**
> All therapies are provider-guided, prescribed only when appropriate, and shipped discreetly from a licensed pharmacy.

**Human verification needed:** none — this is a confident wording fix, held only because
this run is report-only.

### F4. FAQ #1 — "physician-guided protocols" — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqs[0].a`
**Rule:** Rule 3 · **Severity:** S3
**Original language:**
> Our wellness therapies include prescription medications, peptide therapies, vitamin-based treatments, and other physician-guided protocols designed to support your health and wellness goals.

**Compliance concern:** Same Rule 3 issue as F3.
**Recommended revision:** replace "physician-guided" with "provider-guided".
**Human verification needed:** none — confident wording fix.

### F5. FAQ #3 — "safe and effective" — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqs[2].a`
**Rule:** Rule 1; Rule 4 · **Severity:** S2
**Original language:**
> When prescribed appropriately and monitored by a licensed healthcare provider, wellness therapies may be a safe and effective option for many patients.

**Compliance concern:** "safe and effective" is the FDA approval standard. On a page
where most products reach the patient as compounded preparations, using that exact
phrase risks implying the finished products have been evaluated by FDA for safety and
effectiveness, which Rule 4 prohibits. The "may be" hedge does not cure the borrowed
terminology.

**Recommended revision:**
> When prescribed and monitored by a licensed healthcare provider, wellness therapies may be an appropriate option for some patients. Your provider will review the risks and benefits of any treatment with you.

**Human verification needed:** none — confident wording fix.

### F6. FAQ #4 — partner pharmacy quality claims — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqs[3]` (question and answer)
**Rule:** Rule 11 (partner regulatory claims); Rule 10 (unsourced claims) · **Severity:** S1
**Original language:**
> Are the medications high quality? — Yes. We partner with licensed pharmacies that meet rigorous quality and safety standards. Every prescription is dispensed only after review by a licensed provider.

**Compliance concern:** Rule 11 forbids unsupported claims about a partner pharmacy's
accreditation, manufacturing standards, testing or regulatory status. "rigorous quality
and safety standards" is exactly that, and it is unsourced. LegitScript treats partners
as part of the application (LS Step §3) and any public statement of partner
certification is S1 until confirmed. The heading "Are the medications high quality?"
answered "Yes." is itself an unsubstantiated quality claim.

**Recommended revision:** none defensible without verification. A safe placeholder
would describe only what is documented — that medications are dispensed by
state-licensed pharmacies — and drop the standards characterisation.

**Human verification needed:** confirm which pharmacies WellPeps actually partners
with, their licensure and any accreditation (503A/503B, PCAB, NABP), and whether those
statuses can be evidenced. Check names against current documents in `docs/` and via the
LegitScript "See the Status of a Website" tool before any is named or characterised.

### F7. FAQ #5 — asserted improvement over time — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqs[4].a`
**Rule:** Rule 1; Rule 10 · **Severity:** S2
**Original language:**
> The timeline depends on the therapy and your individual goals. Some patients notice improvements within a few weeks, while others see gradual benefits over time.

**Compliance concern:** The sentence frames benefit as certain and only the timing as
variable — every patient either notices improvements quickly or sees them gradually.
That is an unsubstantiated outcome claim, and it is unsourced.

**Recommended revision:**
> The timeline depends on the therapy and your individual circumstances. Your provider will discuss what to expect from your specific treatment and will monitor your progress. Responses vary, and not every patient responds to a given therapy.

**Human verification needed:** none — confident wording fix.

### F8. FAQ #10 — state availability not disclosed — FLAG

**Location:** `src/data/peptide.ts` > `peptideFaqs[9].a`
**Rule:** Rule 12 (missing transparency item) · **Severity:** S1
**Original language:**
> WellPeps provides care through a nationwide network of licensed providers. Availability may vary based on state regulations and the specific therapy requested.

**Compliance concern:** LS Step §3 requires that the site "must clearly disclose all
states, territories, provinces, and/or countries in which applicants' services are
available." "May vary" is a hedge, not a disclosure. Compounded by `CONTACT.coverage`
in `src/config.ts` asserting "50 States · Nationwide Care" — if any program is
state-restricted, those two statements conflict.

**Recommended revision:** none until the facts are known.
**Human verification needed:** the actual list of states per program, from the GEN
Health product **Unavailable states** field and the provider network's licensure. This
is site-wide, not specific to this page, and should become a published coverage
statement. Note that `docs/genhealth/DASHBOARD-DATA-REQUEST.md` §4a already asks for
Unavailable states per product — that answer feeds this flag.

### F9. Bottom CTA — speed and ease framing — FLAG

**Location:** `src/data/peptide.ts` > `peptideCta.lead` and `peptideCta.note`
**Rule:** Rule 2 · **Severity:** S3
**Original language:**
> Complete a quick assessment to learn which treatments may be right for you.
> It only takes a few minutes.

**Compliance concern:** Rule 2 warns against wording that implies a prescription
follows easily or automatically ("approved in minutes"). "Quick assessment" plus "only
takes a few minutes" is milder — it describes the intake, not the approval — but the
combination edges toward that framing on a page whose every CTA is a purchase funnel.

**Recommended revision:** drop "quick", or change the note to "Most people finish the
assessment in a few minutes." Low priority.
**Human verification needed:** none — editorial judgment.

### F10. Everything Included strip — "No Membership Fees" contradicts the decided membership — FLAG

**Location:** `src/components/EverythingIncludedStrip.astro` > `items`, and `included__sub`
**Rule:** Rule 12 (pricing, what is and is not included) · **Severity:** S1
**Original language:**
> One simple monthly price. No surprises.
> … No Membership Fees · No Hidden Fees · Cancel Anytime*

**Compliance concern:** This is now factually wrong. `docs/genhealth/DASHBOARD-DATA-REQUEST.md`
§6 records a decision dated 2026-09-18 — the same day as this review — for a membership
fee of **$49 the first month, then $79 per month thereafter**. A page that advertises
"No Membership Fees" and "One simple monthly price" while a membership fee is charged
on top of the medication price is a pricing misrepresentation, which is both an
FTC-deception exposure and a LegitScript Transparency and Accuracy issue. The strip is
**shared across all four program pages**, so the same contradiction is live site-wide.

**Recommended revision:** none until the pricing model is final.
**Human verification needed:** Dana to confirm the membership is going ahead as decided.
If it is, "No Membership Fees" must be removed from the strip on every page, "One simple
monthly price" must be re-worded, and the membership must be disclosed wherever price
appears. This should be treated as a launch blocker, not a copy tidy.

### F11. Everything Included strip — orphan asterisk on "Cancel Anytime*" — FLAG

**Location:** `src/components/EverythingIncludedStrip.astro` > `items[6]`
**Rule:** Rule 12 (refund and cancellation terms); Rule 9 · **Severity:** S1
**Original language:**
> Cancel Anytime*

**Compliance concern:** The asterisk has **no corresponding footnote anywhere on the
page** — verified against the built HTML. The qualifying condition exists elsewhere in
the codebase (`src/data/content.ts`: "before medication is already ordered for that
month") but is never rendered here. An asterisk that points at nothing is worse than no
asterisk: it signals a material condition and then withholds it, which is the opposite
of the "clear and conspicuous" standard in WP Strategy p.5.

**Recommended revision:** either render the qualifying condition on the strip, or drop
the asterisk and use unqualified "Cancel Anytime" only if that is literally true.
**Human verification needed:** confirm the actual cancellation and refund terms, which
must also match what GEN Health enforces at checkout.

### F12. Footer — Model B required copy missing — FLAG

**Location:** `src/components/Footer.astro` > `footer__disclaimer`
**Rule:** Rule 12 (required footer language); Cheat Sheet §9 · **Severity:** S1
**Original language:**
> WellPeps is a platform that connects patients with licensed healthcare providers and pharmacy partners. Medical services are provided by independent providers. WellPeps does not provide medical advice, diagnosis, or treatment.

**Compliance concern:** What is present is accurate and correctly separates WellPeps
from providers and pharmacies (Rule 11 satisfied). But Cheat Sheet §9 requires the
Model B footer on **every page**, and three required elements are absent site-wide:
"Compounded medications are not FDA-approved and have not been evaluated for safety,
efficacy, or quality"; "Availability varies by state"; and "For educational purposes
only. Not a substitute for advice from a licensed healthcare provider." On this
particular page the compounded disclosure does appear in the products footnote, but
that does not satisfy a site-wide footer requirement.

Per spec conflicts §1, use "licensed healthcare provider" and not the cheat sheet's
"licensed physician" wording when this is added.

**Recommended revision:** append the three missing elements to the footer disclaimer,
in provider (not physician) wording.
**Human verification needed:** counsel review of final footer wording before launch.
Site-wide, not page-specific.

### F13. "Start Free Assessment" — free-ness unverified — FLAG

**Location:** rendered 10× on this page — nav ×2, six product cards, bottom CTA, assistant disclaimer
**Rule:** Rule 12 (pricing) · **Severity:** S1
**Original language:**
> Start Free Assessment / Start Your Free Assessment

**Compliance concern:** A pricing claim on a healthcare site must be literally true.
Per `docs/genhealth/DASHBOARD-DATA-REQUEST.md` §5, whether the assessment is free
depends on the GEN Health checkout flow chosen and the per-product **Assessment price**
field, neither of which is settled: Product-first charges before intake, and
Assessment-first is free only if Assessment price is $0. Already tracked as an open item
in the cutover document; recorded here because it renders ten times on this page.

**Recommended revision:** none until the flow is chosen.
**Human verification needed:** confirm the checkout flow and the Assessment price for
each program. If neither makes the assessment genuinely free, the copy changes across
roughly twenty files.

### F14. Product card prices are stale — FLAG

**Location:** `src/data/peptide.ts` > `peptideProducts[*].price`
**Rule:** Rule 12 (pricing) · **Severity:** S1
**Original language:**
> Starting at $149 / $169 / $129 / $119 / $109 / $79 per month

**Compliance concern:** Known-stale, and Derek's document does not revise them.
`docs/genhealth/DASHBOARD-DATA-REQUEST.md` §4a states plainly that "every price on the
website is out of date" and that prices are being reset from actual formulary costs.
Publishing prices that do not match checkout is a Transparency and Accuracy problem
regardless of intent.

**Recommended revision:** none until the formulary pricing lands.
**Human verification needed:** final per-product pricing, and a check that the site
figure matches what GEN Health charges at checkout.

## Flags requiring a decision

- [ ] F1 — benefits labels — S3 — "Healthy Aging" / "Strength & Body Composition" are named in Rule 1 / Cheat Sheet §7; confirm goal-category framing is the intended defence
- [ ] F2 — Sermorelin — S1 — 503A legal basis is a standing counsel question; get pharmacy confirmation in writing
- [ ] F3 — FAQ trust line — S3 — "physician-guided" → "provider-guided"; delivery attributed to WellPeps rather than the pharmacy
- [ ] F4 — FAQ #1 — S3 — "physician-guided protocols" → "provider-guided"
- [ ] F5 — FAQ #3 — S2 — "safe and effective" borrows the FDA approval standard on a page of compounded products
- [ ] F6 — FAQ #4 — S1 — unsourced partner-pharmacy "rigorous quality and safety standards" claim
- [ ] F7 — FAQ #5 — S2 — asserts every patient sees improvement, only timing varies
- [ ] F8 — FAQ #10 — S1 — states served not disclosed; conflicts with "50 States · Nationwide Care" in config
- [ ] F9 — bottom CTA — S3 — "quick assessment" / "only takes a few minutes" edges toward ease-of-prescription framing
- [ ] F10 — included strip — S1 — **"No Membership Fees" contradicts the $49 → $79 membership decided 2026-09-18; live on all four program pages. Launch blocker.**
- [ ] F11 — included strip — S1 — "Cancel Anytime*" asterisk has no footnote anywhere on the page
- [ ] F12 — footer — S1 — Model B required copy incomplete site-wide (compounded disclosure, state availability, educational-purposes line)
- [ ] F13 — "Start Free Assessment" ×10 — S1 — free-ness depends on an unchosen GEN Health checkout flow
- [ ] F14 — card prices — S1 — known-stale, pending formulary-based repricing

## Out of scope but noted

The page renders under nav label **"Peptides & More"** at route `/peptides` while its
H1 now reads "Healthy Aging & Vitality". Not a compliance issue, but the naming
mismatch is tracked in `docs/genhealth/DASHBOARD-DATA-REQUEST.md` §4a, which records
"Healthy Aging and Vitality" as the agreed name with the site to be changed to match.

---

## Remediation — 2026-09-19

Applied on the user's instruction. Verified against a rebuilt
`dist/healthy-aging/index.html`; the whole `dist/` tree was swept for each phrase.

### F10 — "No Membership Fees" — FIXED

**Location:** `src/components/EverythingIncludedStrip.astro`
**Before:**
> One simple monthly price. No surprises.
> … Standard Shipping · **No Membership Fees** · No Hidden Fees · Cancel Anytime*

**After:**
> Know your full cost up front. No surprises.
> … Standard Shipping · **Transparent Pricing** · No Hidden Fees · Cancel Anytime*

**Why:** "No Membership Fees" is false once the $49 → $79 membership is charged.
"Transparent Pricing" is the site's own wording for this idea (`src/data/content.ts`,
`includes[0]`) and stays true whatever the final pricing model turns out to be. The
strip's sub-line was changed in the same pass because "One simple monthly price"
asserts a single charge and carries the identical factual problem. The strip is
shared, so this corrects all four program pages at once. Sweep confirms zero
occurrences of either phrase anywhere in `dist/`.

### F3 — delivery attribution and provider terminology — FIXED

**Location:** `src/data/peptide.ts` > `peptideFaqsIntro.trust`
**Before:**
> All therapies are physician-guided, prescribed only when appropriate, and delivered discreetly to your door.

**After:**
> All therapies are provider-guided, prescribed only when appropriate, and shipped discreetly from a licensed pharmacy.

**Why:** Rule 11 — WellPeps does not dispense or ship; the pharmacy does. Rule 3 —
"physician-guided" implies every patient is seen by a physician. Now consistent with
FAQ #8 on the same page, which already attributed shipping correctly.

### F4 — "physician-guided protocols" — FIXED

**Location:** `src/data/peptide.ts` > `peptideFaqs[0].a`
**Before:**
> …and other physician-guided protocols designed to support your health and wellness goals.

**After:**
> …and other provider-guided protocols designed to support your health and wellness goals.

**Why:** Rule 3. The same one-word fix as F3, in the second of the two occurrences.

### F5 — "safe and effective" — FIXED

**Location:** `src/data/peptide.ts` > `peptideFaqs[2].a`
**Before:**
> When prescribed appropriately and monitored by a licensed healthcare provider, wellness therapies may be a safe and effective option for many patients.

**After:**
> When prescribed and monitored by a licensed healthcare provider, wellness therapies may be an appropriate option for some patients. Your provider will review the risks and benefits of your recommended treatment and monitor how you respond.

**Why:** Rules 1 and 4 — "safe and effective" is the FDA approval standard and must
not attach to compounded products. "Many patients" was softened to "some patients" in
the same sentence, and the replacement adds real information rather than only
removing a claim, per the spec's "do not sterilize" guardrail.

### Route rename — not a compliance item

`/peptides` → `/healthy-aging`, with a 301 in `nginx.conf` and an Astro redirect stub
at the old path. Nav label "Peptides & More" → "Healthy Aging"; footer "Peptide
Therapies" → "Healthy Aging & Vitality"; `programs.ts` title "Wellness & Longevity" →
"Healthy Aging & Vitality"; program-name mentions updated in `content.ts` and
`knowledge.ts`. This closes the naming mismatch noted under "Out of scope but noted".

## New findings from the 2026-09-19 rename sweep

Surfaced while sweeping the built site for the renamed program. None are on the
Healthy Aging page itself; all are pre-existing and unremediated.

### F15. Learning-centre therapy grid carries the superseded product copy — FLAG

**Location:** `src/components/sections/PeptideTherapies.astro` > `therapies`
**Rule:** Rules 1, 6, 9 · **Severity:** S2
**Original language:** (four of the six products, verbatim pre-rewrite)
> Supports detoxification, immune health, and protection against oxidative stress.*
> Supports natural growth hormone production to help promote lean muscle, recovery, sleep quality, and healthy aging.*
> Supports healthy cellular energy production, helping promote energy, mental clarity, and healthy aging.*
> Supports healthy metabolism, fat utilization, and natural energy production.*

**Compliance concern:** This component renders inside Healthy Aging learning-centre
articles and duplicates Glutathione, Sermorelin, MIC + B12 and NAD+ using the exact
copy Derek's rewrite replaced — asterisks included. The program page is now clean
while the same claims stay live one click away. Its intro paragraph ("designed to
support your energy, recovery, metabolism, and overall wellness") has the same issue.

**Recommended revision:** port the approved copy from `src/data/peptide.ts`. This is
mechanical reuse of already-approved language, not new drafting. Better still, have
the component import from `peptide.ts` so the two cannot drift apart again.
**Human verification needed:** none on the wording — it is Derek's approved text.
Confirm only that the four-card subset and its `features` labels ("All-Inclusive
Pricing") are still wanted.

### F16. Assistant knowledge base asserts the old benefit list — FLAG

**Location:** `src/data/knowledge.ts` > `peptide-basics`
**Rule:** Rules 1, 6 · **Severity:** S2
**Original language:**
> Depending on the therapy, patients pursue them for improved energy, recovery, healthy aging, mental focus, metabolic health, sleep, lean muscle support, and skin health.

**Compliance concern:** The pre-rewrite benefits list, served by the on-site
assistant. "Patients pursue them for…" is thinner cover than it looks — the assistant
is answering what the therapies do.
**Recommended revision:** restate as goal categories matching the page's new benefits
band, or as mechanism per Rule 6.
**Human verification needed:** none — confident wording fix, held pending instruction.

### F17. Home-page program blurb — FLAG

**Location:** `src/data/programs.ts` > `wellness-longevity` (title updated, blurb not)
**Rule:** Rule 1 · **Severity:** S3
**Original language:**
> Optimize your health, boost energy, and support long-term vitality.

**Compliance concern:** "boost energy" is an outcome claim Rule 1 names directly, on
the home page.
**Recommended revision:**
> Provider-guided wellness therapies for healthy aging and vitality.

**Human verification needed:** none — confident wording fix.

### F18. Home-page insight card — FLAG

**Location:** `src/data/content.ts` > insights, "How Peptide Therapies May Support Recovery & Vitality"
**Rule:** Rule 1 · **Severity:** S3
**Original language:**
> Discover the potential benefits of peptide therapies for energy, recovery, and overall wellness.

**Compliance concern:** "potential benefits … for energy, recovery" is the
mechanism-to-benefit drift the rewrite removed elsewhere, and Rule 9 says "potential"
does not rescue it.
**Human verification needed:** none — confident wording fix. Note the card links to a
published article whose title cannot change without breaking the slug.

### F19. Why WellPeps — "physician-guided care" ×2 — FLAG

**Location:** `src/pages/why-wellpeps.astro` lines 30 and 51
**Rule:** Rule 3 · **Severity:** S3
**Compliance concern:** The same Rule 3 issue fixed on the Healthy Aging page; these
are the last two instances in the repo.
**Human verification needed:** none — confident wording fix.

### F20. GLP-1 learning-centre article — "safe and effective" — FLAG

**Location:** Supabase `blog_articles`, slug `common-questions-about-glp1-medications`
**Rule:** Rules 1, 4, 5 · **Severity:** S2
**Compliance concern:** The same FDA-approval-standard phrasing as F5, in a GLP-1
article where Rule 5 makes the branded-versus-compounded distinction sharper. It
lives in the database, not the repo, so it needs an `article`-mode run with a
snapshot per workflow step 1.
**Human verification needed:** read the full passage in context before revising.

## Flags requiring a decision — updated 2026-09-19

- [x] F3 — FAQ trust line — FIXED 2026-09-19
- [x] F4 — FAQ #1 — FIXED 2026-09-19
- [x] F5 — FAQ #3 — FIXED 2026-09-19
- [x] F10 — included strip — FIXED 2026-09-19
- [ ] F1 — benefits labels — S3
- [ ] F2 — Sermorelin 503A basis — S1 — counsel
- [ ] F6 — FAQ #4 pharmacy quality claims — S1
- [ ] F7 — FAQ #5 asserted improvement — S2
- [ ] F8 — FAQ #10 states served — S1
- [ ] F9 — bottom CTA speed framing — S3
- [ ] F11 — "Cancel Anytime*" orphan asterisk — S1
- [ ] F12 — footer Model B copy incomplete — S1
- [ ] F13 — "Start Free Assessment" free-ness — S1
- [ ] F14 — card prices stale — S1
- [ ] F15 — learning-centre therapy grid has superseded copy — S2
- [ ] F16 — assistant knowledge base benefit list — S2
- [ ] F17 — home-page program blurb "boost energy" — S3
- [ ] F18 — home-page insight card — S3
- [ ] F19 — Why WellPeps "physician-guided" ×2 — S3
- [ ] F20 — GLP-1 article "safe and effective" — S2

---

## Remediation round 2 — 2026-09-19 (Learning Centre)

Triggered by a sweep of the Learning Centre after the route rename. Snapshot of
the database before these changes: `docs/compliance/snapshots/2026-09-19/`
(`categories-before.json`, `articles-before.json` — all 6 categories, all 45
articles, every field).

### Finding that reframes the sweep: no article body was stale

All 45 articles were scanned across `title`, `seo_title`, `meta_title`,
`meta_description`, `lede_html`, `body_html`, `key_takeaways`, `cta_title`,
`cta_html`, `disclaimer_html` and `url_path`. Results: zero references to
`/peptides`, "Peptides & More" or "Wellness & Longevity"; zero internal `href`s
of any kind in any article; zero instances of the superseded product copy. The
route rename therefore broke nothing in the prose, and no article body required
an edit. The staleness was entirely in shared surfaces that render *inside* the
articles, plus one database row.

### F15 — learning-centre therapy grid — FIXED

**Location:** `src/components/sections/PeptideTherapies.astro`
**Before:** four cards duplicating Glutathione, Sermorelin, MIC + B12 and NAD+
with the pre-rewrite copy, asterisks included, e.g.
> Supports healthy cellular energy production, helping promote energy, mental clarity, and healthy aging.*

**After:** the component no longer holds product copy at all. Name, tagline,
description, bullets and price are read from `data/peptide.ts`; only per-card art
direction (photo, vial, overlay geometry, icon path) stays local. Section heading
and intro now read from `peptideProductsIntro`. A missing product name throws at
build time rather than rendering a blank card.

**Why sourced rather than copied:** duplication is what caused the defect. The
copy was correct when written and was simply left behind when the programme page
was rewritten. Sourcing removes the failure mode instead of resetting it.

Verified: the four superseded descriptions return zero matches across `dist/`,
and all six articles render the approved text.

### F21 (new) — "All-Inclusive Pricing" on 19 learning-centre pages — FIXED

**Location:** `src/components/sections/PeptideTherapies.astro` (first bullet on
four cards) and `src/components/sections/WeightTreatmentOptions.astro`
(highlighted pill on three plans)
**Rule:** Rule 12 (pricing, what is and is not included) · **Severity:** S1
**Before:** > All-Inclusive Pricing
**After:** the peptide cards now carry the three approved bullets from
`peptide.ts`, which displaces the pricing claim entirely; the weight plans read
> Transparent Pricing

**Why:** the same defect as F10, in a place the first review did not reach. With
a $49 → $79 membership charged alongside the medication price, "all-inclusive" is
not true. The phrase rendered on **19** Learning Centre pages. Verified zero
occurrences across `dist/`.

### F22 (new) — insert gating coupled to editorial copy — FIXED

**Location:** `src/pages/wellness-learning-center/[slug].astro`
**Severity:** S2 (latent, no reader-facing symptom yet)
**Before:**
> const showTherapies = article.category.name.toLowerCase().includes('peptide');

**After:**
> const showTherapies = article.category.slug === 'peptides-wellness';

**Why:** all four treatment inserts were gated on the category *name*, which is
reader-facing editorial copy. Renaming the category — which the item below does —
would have silently removed the therapy insert and the Everything Included bar
from six articles, with no error and a green build. The slug is a stable
identifier and `categoryIcon()` already depends on it. The original comment
reasoned that names are steadier than slugs; the rename disproved that, and the
comment now records why.

### Category rename — APPLIED

**Location:** Supabase `blog_categories`, row `peptides-wellness`
**Before:** name "Peptides & Wellness Therapies"; description "Peptide therapy
explained, plus NAD+, sermorelin, MIC + B12, glutathione, and recovery support."
**After:** name "Healthy Aging & Vitality"; description "NAD+, sermorelin,
glutathione, MIC + B12, Lipo-C and methylene blue explained, plus recovery and
healthy-aging foundations."

Slug deliberately unchanged. The old description also omitted Lipo-C and
methylene blue, two of the six therapies. The name renders three times per
article (breadcrumb, eyebrow, hub card). Shipped in the same commit as F22, which
it depends on.

### F18 — home-page insight card — FIXED

**Location:** `src/data/content.ts` insights; `src/data/knowledge.ts` `peptide-basics`
**Before:** title "How Peptide Therapies May Support Recovery & Vitality", body
"Discover the potential benefits of peptide therapies for energy, recovery, and
overall wellness."
**After:** title "What Are Peptides? Understanding Peptide Therapy", body "What
peptides are, how they function in the body, and how a provider evaluates whether
peptide therapy may be appropriate."

**Why:** two problems. The Rule 1 benefit claim, and a mismatch — the card
promised a title the linked article does not have. The new title is the article's
actual title.

## Corrections to the 2026-09-18 log

Both found when the underlying content was read in full rather than matched on a
phrase. Recording them because the original entries overstated the concern.

### F20 — downgraded to PASS

The GLP-1 article's "safe and effective" is `key_takeaways[4]`:
> Personalized medical guidance remains the foundation of safe and effective care.

That characterises *care quality*, not a medication's regulatory status, and does
not attach the FDA approval standard to a compounded product the way FAQ #3 did.
The original entry assumed it was the same defect as F5 on the strength of the
matching phrase. It is not. No change needed.

### F1 (recovery-and-performance strand) — concern withdrawn

The `recovery-and-performance` article title was noted as athletic-performance
framing under Cheat Sheet §7. Its body's third sentence is "Recovery is not
limited to athletes," and the piece is about sleep, nutrition, hydration and
stress. The title is accurate and the concern does not hold. The F1 entry's other
strand — the "Healthy Aging" and "Strength & Body Composition" benefit labels —
is unaffected and remains open.

## Flags requiring a decision — updated 2026-09-19 (round 2)

- [x] F3, F4, F5, F10 — fixed earlier on 2026-09-19
- [x] F15 — therapy grid now sources from `peptide.ts`
- [x] F18 — home-page insight card
- [x] F21 — "All-Inclusive Pricing" across 19 pages
- [x] F22 — insert gating moved to slug
- [x] Category renamed to "Healthy Aging & Vitality"
- [x] F20 — withdrawn, PASS on re-reading
- [ ] F1 — benefits labels "Healthy Aging" / "Strength & Body Composition" — S3
- [ ] F2 — Sermorelin 503A basis — S1 — counsel
- [ ] F6 — FAQ #4 pharmacy quality claims — S1
- [ ] F7 — FAQ #5 asserted improvement — S2
- [ ] F8 — FAQ #10 states served — S1
- [ ] F9 — bottom CTA speed framing — S3
- [ ] F11 — "Cancel Anytime*" orphan asterisk — S1
- [ ] F12 — footer Model B copy incomplete — S1
- [ ] F13 — "Start Free Assessment" free-ness — S1
- [ ] F14 — prices stale — S1 — **now in two places**: `peptide.ts` feeds both the
      programme page and the learning-centre insert, so one fix covers both
- [ ] F16 — assistant knowledge base benefit list — S2
- [ ] F17 — home-page programme blurb "boost energy" — S3
- [ ] F19 — Why WellPeps "physician-guided" ×2 — S3
