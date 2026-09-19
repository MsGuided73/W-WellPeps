# WellPeps Compliance Review Skill — Overview for Derek

Prepared 2026-09-15. Companion files: the sample analysis of the weight-loss page
(`docs/compliance/reviews/2026-09-15-page-weight-loss.md` and `.xlsx`), the skill
itself (`.claude/skills/wellpeps-compliance-review/`), and the verified compliance
cheat sheet (`docs/COMPLIANCE-CHEAT-SHEET.md`).

## What it is

A repeatable editing pass that reads any public-facing WellPeps content and
returns one of three verdicts on every questionable passage: PASS, REVISE, or
FLAG. It is built for LegitScript Healthcare Certification review, FDA and FTC
advertising standards, and the healthcare-ad policies of Google, Meta, and
TikTok. It runs inside Claude Code against the site repo and the Supabase blog.

The one principle it enforces on every sentence: **established biology and
clinical context may be described; a mechanism must never be converted into a
promised patient outcome.** "NAD+ plays a role in cellular energy metabolism" is
fine. "NAD+ injections increase your energy" is not.

## Why it exists now

LegitScript analysts evaluate "licensure, business registration, website
content, affiliates, privacy policies, patient practices (services, products),
and promotional activity" and require remediation of anything noncompliant
before certifying. After approval, they monitor continuously and require
remediation of anything reported, with suspension or revocation for failure to
correct. Certification also does not exempt ads from platform rules. The
standards allow remedial work during the application, so the review is worth
running before and during it, then on every new piece of content afterward.

## What it reviews

| Surface | Where it lives |
|---|---|
| Learning Center articles | Supabase `blog_articles`, seeded from `wellpeps-site/scripts/data/articles.json` |
| Treatment pages, homepage, Why WellPeps, FAQs | `wellpeps-site/src/data/*.ts` and `src/components` |
| Metadata, alt text, card labels, buttons | same files; treated as marketing claims |
| Footer and disclaimers | `Footer.astro`, `Safety.astro`, `EverythingIncludedStrip.astro` |
| eBooks | `eBooks/_build/outlines/*.json`, then rebuilt to PDF |
| Social captions, carousels, posters | `docs/marketing/` and `Social Media/` |
| Ad copy and landing pages | to be stored under `docs/marketing/ads/` |
| Virtual assistant answers | `src/data/knowledge.ts` (production corpus in Supabase) |

Legal pages (privacy, terms, notice of privacy practices) are read but never
edited. Anything found there is flagged for counsel.

## What it will not do

- It does not rewrite compliant copy for taste, and it does not sprinkle
  "may," "potentially," or "results vary" through every sentence. One accurate
  statement of provider evaluation per piece is usually enough.
- It never invents a study, statistic, FDA status, or partner accreditation. If
  it cannot verify a claim, it flags it.
- It never guesses on FDA approval status, compounded-drug language, pricing,
  refund terms, states served, or pharmacy and partner claims. Those are
  always flags for a human.
- It never edits without a snapshot and never edits silently. Every change is
  in a log with verbatim before and after text.

## The rule set in one page

Fourteen rules, each traceable to a source document already in the repo.

1. **No unsubstantiated treatment claims.** Weight loss, fat burning, energy,
   clarity, anti-aging, longevity, detox, immune, recovery, muscle, sleep,
   sexual performance, hair regrowth, disease prevention, "safer or better
   than." Card-style benefit pills count.
2. **Conservative prescribing language.** Treatments "may be considered for
   appropriate patients after evaluation by a licensed healthcare provider."
   Never "get prescribed X for," never "approved in minutes."
3. **Provider terminology.** "Licensed healthcare provider" or "medical
   provider," not "physician" or "doctor," unless a physician is genuinely
   required.
4. **Compounded is not FDA-approved.** No "generic Ozempic," no equivalence,
   superiority, or safety claims, and a disclosure where compounded products
   are offered.
5. **GLP-1 specifics.** Name the drug and formulation studied, no trial
   extrapolation from branded to compounded, no additive claims, no
   before/after.
6. **Healthy Aging & Vitality.** Mechanism and composition, not outcomes.
   Emerging research is labeled emerging. Only Tier 1 and Tier 2 peptides may
   appear as therapies.
7. **Hair loss.** No guaranteed regrowth or prevention; evidence-based
   timelines and variability.
8. **Sexual wellness.** Accurate mechanism and indication; no guaranteed
   performance; contraindications not minimized.
9. **Disclaimers do not rescue claims.** If a sentence needs an asterisk to be
   true, rewrite the sentence. Short formats get no rescue at all.
10. **Testimonials, statistics, and studies.** FTC typicality standard,
    sourced statistics, no animal or in-vitro findings as human outcomes.
11. **WellPeps' role.** WellPeps is the platform. Providers evaluate and
    prescribe. Pharmacy partners dispense. Partner regulatory claims need
    documentary support.
12. **Transparency items LegitScript checks.** Pricing and refunds, states
    served, eligibility, the prescription process, affiliates, privacy. Flag
    only. A missing item is itself a flag.
13. **Preserve education and SEO.** Keywords, headings, slugs, and article
    structure stay.
14. **House GREEN / YELLOW / RED system** for social, ads, creators, and
    community, taken directly from the Pre-LegitScript Playbook.

Severity tags help triage: **S1** must be resolved before certification (FDA
status, compounded language, partner claims, pricing, states served, missing
disclosures, anything on the RED list). **S2** outcome and superiority claims.
**S3** wording and terminology.

## How a run works

1. **Snapshot.** Repo files are reviewed on a clean tree or a
   `compliance-review/<date>` branch. Supabase articles are exported to
   `docs/compliance/snapshots/<date>/` first.
2. **Read the whole piece.** Context decides whether a claim is supported:
   which medication, FDA-approved or compounded, which indication.
3. **Classify every passage** as PASS, REVISE, or FLAG, citing the rule.
4. **Apply REVISE edits** with the minimum change. Articles keep their slug
   and URL. Pages keep their layout. eBooks are edited at the outline level
   and rebuilt, never in the PDF.
5. **Write the log.** Markdown in `docs/compliance/reviews/` and the
   spreadsheet for review. Every changed passage appears verbatim, before and
   after. Flags say exactly what a human must verify and who should own it.
6. **Final test.** Could a reasonable consumer read any sentence as promising
   more than the evidence for that medication, formulation, and use supports?
   Then the twelve-point checklist, and for social or ad content the
   Playbook's six pre-publish questions.

On a full-site run it works in batches of ten articles or five pages between
check-ins so the log can be inspected as it grows.

## What it needs from you

- **Decisions on flags.** The skill will not guess on the S1 items. On the
  weight-loss page alone there are eight, most of them about facts only
  WellPeps or Scriptful can confirm: which pharmacy fills each product and its
  registration, whether follow-ups and labs are really free on every plan,
  what the oral semaglutide product actually is, the 52-week price condition,
  the missing "Cancel Anytime" footnote, and whether "all 50 states" is true.
- **The approved-messaging facts.** Current partner names, plan inclusions,
  refund terms, and the state list. Once these are recorded once, every future
  run can check against them instead of flagging them again.
- **Placement decisions** that cross pages: where the compounded-medication
  disclosure lives, what the benefit-pill template says, and the shared
  Everything Included strip.
- **Counsel on two open items** from the cheat sheet: the legal basis the
  pharmacy relies on for sermorelin, and whether New York accepts self-attested
  date of birth for supplement sales.

## What is already verified

The cheat sheet's tier list and state matrix were checked against primary
sources on 2026-09-15 and carry re-check dates:

- FDA's interim 503A category list (May 14, 2026) is saved in the repo. NAD+,
  glutathione, methylcobalamin, acetyl-L-carnitine, VIP, and non-injectable
  GHK-Cu are Category 1. Category 2 no longer contains peptides.
- The 12 peptides FDA removed from Category 2 on April 22, 2026, and the six
  the advisory committee recommended in July 2026, are still not eligible for
  503A compounding. Rulemaking runs into 2027. None may appear as a WellPeps
  therapy.
- DEA telemedicine flexibilities run through December 31, 2026; the
  special-registration final rule is expected in November 2026.
- FDA's September 2025 warning letters on compounded GLP-1 marketing and its
  April 30, 2026 proposal to remove semaglutide, tirzepatide, and liraglutide
  from the 503B bulks list are confirmed.
- New York's minor-access law was upheld on appeal; California's AB 2030 is
  awaiting the governor with a September 30, 2026 deadline.

## The sample: weight-loss page

Run on the live page at wellpeps.com/weight-loss, whose copy matches the repo.
No edits were applied. Twenty-five items:

| Verdict | Count | Examples |
|---|---|---|
| PASS | 12 | How GLP-1 Medications Work section, treatments intro, six FAQs, footer disclaimer |
| REVISE | 5 | "Physician-guided" in hero and meta; "sustainable results"; benefit pills; "It only takes a few minutes" |
| FLAG | 8 | "FDA-registered" facility claim; free follow-ups and labs; "Oral Semaglutide" naming; no compounded-drug disclosure; 52-week starting price; "Cancel Anytime*" with no footnote; "all 50 states" |

Two flags fix every treatment page at once because they live in shared
components. The page also contains model language worth copying elsewhere: the
mechanism section, the treatments intro, and the footer disclaimer.

## How to review the spreadsheet

Columns A through L are the skill's output. The yellow columns M through Q are
for comments, a Decision (Approve, Modify, Reject, Needs info), and Status. The
Summary tab counts verdicts and decisions as they are filled in. Nothing on the
site changes until a decision is recorded and the edit is applied and deployed.
The spreadsheet is the record of what was approved.

## Recommended order of work

1. Decide the eight weight-loss flags. Most are facts, not judgment calls.
2. Apply the five revisions and the approved flag fixes; deploy.
3. Run `site` mode on the remaining pages, metadata, and footer. The same flag
   pattern will repeat, so the decisions from step 1 carry over.
4. Run `article` mode on the 46 Learning Center articles in batches of ten.
5. Run `ebook` mode on the five Smart Patient Guides and rebuild.
6. Run `social` mode on the Month 1 calendar captions and posters.
7. Re-run on every new article, eBook, ad, or campaign before it publishes.
