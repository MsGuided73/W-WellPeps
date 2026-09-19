# WellPeps Content Compliance Specification

Internal specification behind the `wellpeps-compliance-review` skill. The skill's
SKILL.md is the operating procedure; this document is the rule set it enforces.
Rule numbers here are what the change log cites.

## Sources

Short names used in citations below. All paths are relative to the repo root.

| Short name | File |
|---|---|
| LS Step | `eBooks/Marketing Plan/Healthcare-Certification-Step-by-Step-Guide.pdf` |
| LS 101 | `eBooks/Marketing Plan/LegitScript Requirements/Healthcare-Certification-101-Guide.pdf` |
| LS Fact | `eBooks/Marketing Plan/LegitScript Requirements/Enterprise-Certification-FactSheet.pdf` |
| WP Strategy | `eBooks/Marketing Plan/WellPeps_Pre-LegitScript_Marketing_Community_Strategy.pdf` |
| WP Playbook | `eBooks/Marketing Plan/WellPeps_Pre-LegitScript_Marketing_Community_Playbook.pdf` |
| Cheat Sheet | `docs/COMPLIANCE-CHEAT-SHEET.md` |

The two client prompts this spec was built from (short "system prompt" version
and long "internal specification" version, supplied 2026-09-15) are the origin
of Rules 1 through 13. The sources above supply the citations, Rules 12 and 14,
and the conflicts section.

## Who this protects against

- **LegitScript Healthcare Certification.** Analysts evaluate "licensure,
  business registration, website content, affiliates, privacy policies,
  patient practices (services, products), and promotional activity" (LS Step
  §2). Certification rests on nine standards: Licensure and Registration;
  Prior History and Discipline; Affiliates and Partners; Privacy and HIPAA
  Compliance; Transparency and Accuracy; Legal Compliance; Patient Services
  Disclosure; Prescription Validity; Compliant Advertising (LS Fact p.1).
  Content review touches the last five directly. Minor noncompliance found
  during review "must be remediated before receiving certification" (LS Step
  §2), and after approval "LegitScript will require remediation" of anything
  reported, with suspension or revocation for failure to correct (LS Step §4).
  LegitScript's standards also warn that apparent circumvention of platform
  terms can be grounds for denial or revocation (WP Strategy p.1, p.23).
- **FDA.** Drug promotion, unapproved-use claims, and the line between an
  FDA-approved finished drug and a compounded preparation. FDA issued warning
  letters in September 2025 over compounded GLP-1 marketing that used
  "generic," "clinically proven," or implied equivalence to the branded drug
  (Cheat Sheet §4).
- **FTC.** "The FTC expects objective health claims to have appropriate
  substantiation, and disclosures needed to prevent deception must be clear
  and conspicuous" (WP Strategy p.5). Material creator relationships must be
  disclosed in the video itself, and influencers cannot make claims the
  advertiser could not substantiate (WP Strategy p.14). No "clinically
  proven," no "generic," no before/after (Cheat Sheet §2).
- **Ad platforms.** "Your certification is not a free pass." Each platform
  enforces its own claims requirements, prohibited-content rules, and
  landing-page standards, and certification "does not shield your ads from
  rejection or from account penalties" (LS Step §4, Advertising Compliance).
  Google requires LegitScript plus its own healthcare certification for
  telemedicine prescription-drug ads (WP Strategy p.6). LinkedIn telehealth
  ads may target healthcare professionals only (WP Strategy p.2). TikTok gets
  the most conservative standard (WP Playbook §03). Healthcare ads cannot use
  "before/afters, bold health claims or urgency language" (LS Fact p.2).

## Content categories in scope

- GLP-1 weight management: semaglutide, tirzepatide (branded and compounded)
- Healthy Aging & Vitality: Sermorelin, NAD+, Glutathione, MIC+B12,
  Lipo-C / L-Carnitine, Methylene Blue
- Hair restoration medications and treatments
- Sexual wellness medications and treatments (sildenafil, tadalafil, others)
- Any other program the site presents (hormone optimization, mental wellness,
  lab work) is reviewed under the same rules, with extra caution where a
  controlled substance or an off-label use is involved.

## Core principle

Do not state or imply that a medication or treatment produces a benefit,
outcome, cure, prevention, reversal, improvement, or therapeutic effect unless
that claim is appropriately supported for the specific drug, formulation,
indication, and context.

Distinguish:

1. **Established biological facts or mechanisms**: what a molecule, nutrient,
   hormone, receptor, enzyme, or pathway does in the body.
2. **Treatment outcome claims**: what receiving a particular WellPeps
   treatment will do for the patient.

A mechanism is never automatically a benefit.

ACCEPTABLE: "NAD+ is a naturally occurring coenzyme that plays an essential role in cellular energy metabolism."
AVOID: "NAD+ injections increase your energy, improve mental clarity, and slow aging."
ACCEPTABLE: "L-carnitine plays a role in transporting fatty acids into cells for energy metabolism."
AVOID: "Lipo-C burns fat, boosts energy, and accelerates weight loss."

"Appropriately supported" means, in practice:
- for an FDA-approved product, the labeled indication and the results in the
  labeling or the pivotal trials for that product;
- for a compounded preparation, mechanism, composition, and honestly
  characterized research on the active ingredient, never a transferred
  efficacy or safety claim;
- for anything else, a clear statement of the evidence level (emerging,
  preliminary, animal, in vitro, limited, under investigation).

## Rule 1. Remove or revise unsubstantiated treatment claims

Flag and revise statements that promise or imply: guaranteed or predictable
weight loss; rapid or effortless weight loss; fat burning; increased energy;
mental clarity; cognitive enhancement; improved mood; anti-aging or age
reversal; longevity; detoxification; immune boosting; faster healing; improved
recovery; muscle building; improved sleep; enhanced sexual performance;
guaranteed erections; restored libido; guaranteed hair regrowth; prevention
or reversal of disease; or that one treatment is safer, more effective,
superior, or equivalent to another without substantiation.

Also remove or revise, unless specifically supported in context: "proven to,"
"clinically proven," "guaranteed," "works," "will improve," "will restore,"
"will reverse," "dramatically," "breakthrough," "miracle," "game-changing,"
"risk-free," "side-effect free," "no side effects," "safe" as an absolute.

Card-style benefit lists ("Improved Energy", "Better Sleep", "Healthy Aging")
are outcome claims in headline form. They are held to this rule regardless of
any footnote beneath them.

Athletic-performance framing ("optimize performance," "stamina," "peak
performance") is both an outcome claim and an anti-doping liability for
growth-hormone secretagogues (Cheat Sheet §7). Revise to non-sport wording.

Sources: WP Playbook §14 RED "Promise outcomes" and "Say medications are risk
free"; WP Strategy p.5 FTC substantiation; LS Step §5 "Avoid using unapproved
health claims or misleading descriptions."

## Rule 2. Be conservative about why a treatment is prescribed

Never imply WellPeps or its providers prescribe because a patient wants a
result, or that a prescription follows automatically from an online form.

Preferred: "may be considered," "may be appropriate for some patients," "a
licensed healthcare provider determines whether treatment is appropriate,"
"treatment recommendations are individualized," "based on your health
information and individual needs."

Avoid: "Get prescribed X for...," "Choose X if you want...," "X is right for
anyone who...," "Take X to achieve...," "no doctor visit needed," "approved
in minutes," "guaranteed prescription."

The prescription process itself must be disclosed clearly on the site (LS 101
"Disclose prescription processes clearly"; LS Fact standards "Prescription
Validity" and "Patient Services Disclosure"). If a page describes the visit
flow, it must match what actually happens: intake, licensed-provider
evaluation, prescription only when appropriate, partner-pharmacy dispensing.

## Rule 3. Provider terminology

Replace "physician review," "doctor review," "reviewed by a physician," "our
doctors prescribe," "MD-reviewed" with "medical provider review," "licensed
healthcare provider review," or "reviewed by a licensed healthcare provider,"
unless the context genuinely requires a physician. Do not imply every patient
sees a physician when appropriately licensed non-physician clinicians provide
care.

## Rule 4. FDA-approved versus compounded

Never state or imply a compounded medication is FDA-approved because its
active ingredient appears in an FDA-approved drug. Never suggest the compounded
finished product has been reviewed by FDA for safety, effectiveness, or quality.

Never present compounded products as inherently superior, safer, more
effective, more personalized, or equivalent to FDA-approved products.

Never call a compounded product "generic Ozempic," "generic Wegovy," or
similar. Compounded semaglutide is not a generic.

Where disclosure is needed, use:
"Compounded medications are not FDA-approved finished drug products. A licensed
healthcare provider determines whether a particular treatment and formulation
may be appropriate for an individual patient."

Brand names (Ozempic, Wegovy, Zepbound, Mounjaro, Viagra, Cialis, Propecia,
Rogaine) may appear only for accurate reference or comparison, with a clear
statement that WellPeps is not affiliated with the manufacturer where a reader
could be confused. Never use a brand name as the name of a WellPeps product.

Sources: Cheat Sheet §4 (FDA Sept 2025 warning letters: no "generic," no
"clinically proven," no implied equivalence to the branded drug); Cheat Sheet
§9 Model B footer ("Compounded medications are not FDA-approved and have not
been evaluated for safety, efficacy, or quality"); WP Playbook §14 YELLOW "Any
content involving compounded medication."

## Rule 5. GLP-1 content

- Distinguish FDA-approved branded medications from compounded formulations.
- Do not guarantee any amount or percentage of weight loss.
- When citing trial results, identify the drug and formulation studied, the
  population, the timeframe, and that individual results vary.
- Do not present branded-product trial results as evidence that a compounded
  formulation will produce the same results.
- Do not claim additives such as B12, B6, glycine, niacinamide, or L-carnitine
  make compounded GLP-1 medication more effective, safer, better tolerated, or
  better for weight loss unless specifically substantiated.
- Do not suggest GLP-1 treatment is appropriate for everyone seeking weight
  loss. BMI and comorbidity eligibility belong to the provider evaluation.
- No before-and-after imagery or numeric transformation claims in ads.

## Rule 6. Healthy Aging & Vitality content

Favor established biology, composition, mechanism, and areas of scientific
interest over patient outcomes:

- NAD+: cellular energy metabolism and fundamental cellular processes
- Glutathione: naturally occurring antioxidant; cellular antioxidant defenses
- Sermorelin: stimulation of the body's natural growth-hormone release
- Vitamin B12: normal cellular metabolism, red-blood-cell formation, nervous-system function
- L-carnitine: fatty-acid transport and normal energy metabolism
- Methylene blue: established medical history, cellular redox processes,
  mitochondrial biology, emerging research

Do not convert these into claims of increased energy, fat loss, mental
clarity, anti-aging, cognition, mood, sleep, recovery, muscle growth,
detoxification, immune enhancement, or longer life unless specifically
supported for the treatment and context.

Characterize emerging research as emerging, preliminary, limited, or under
investigation. Hypotheses, animal studies, laboratory studies, and early-stage
research are never presented as established human clinical benefits.

Most of these therapies reach patients as compounded preparations or are used
off-label. Rule 4 applies to every one of them.

Peptide tiering (Cheat Sheet §1, verified 2026-09-15 against FDA's interim
503A category list dated May 14, 2026, saved at
`docs/compliance/sources/FDA-503A-interim-categories-2026-05-14.pdf`) governs
which peptides may appear as WellPeps therapies at all:
- Tier 1, FDA-approved peptide drugs: semaglutide, tirzepatide, liraglutide,
  leuprolide, octreotide, tesamorelin, bremelanotide.
- Tier 2, 503A-compoundable without approval: NAD+, glutathione,
  methylcobalamin, acetyl-L-carnitine, VIP, and non-injectable GHK-Cu are
  Category 1. Sermorelin and gonadorelin are on no FDA list and are compounded
  on the basis of a prior approval; sermorelin's basis is the least settled.
  Methylene blue, levocarnitine, and cyanocobalamin are components of
  currently approved drugs.
- Tier 3, not 503A-eligible today and not for human use: BPC-157, TB-500,
  CJC-1295, ipamorelin, AOD-9604, Melanotan II, Selank, Semax, KPV, DSIP,
  Epitalon, MOTS-c, thymosin alpha-1, LL-37, DiHexa, PEG-MGF, GHRP-2, GHRP-6,
  injectable GHK-Cu. FDA removed 12 of these from Category 2 on April 22, 2026
  but placed none in Category 1, and the July 2026 PCAC votes recommending six
  of them are advisory with rulemaking expected into 2027.
Any Tier 3 peptide presented as a WellPeps treatment, program, or benefit is an
S1 FLAG. Human growth hormone (somatropin) is never offered (21 U.S.C. 333(e)).
Copy that says a Tier 3 peptide is "now legal," "FDA-cleared," or "approved for
compounding" because of the 2026 Category 2 removal or the PCAC vote is false
and is S1 FLAG. Re-check the list after FDA acts on the PCAC votes and after the
February 2027 PCAC meeting (Cheat Sheet §12).

## Rule 7. Hair-loss content

Keep claims consistent with the evidence and approved use of the specific
medication. Do not guarantee regrowth, a full head of hair, prevention of
future loss, or that every patient responds. Do not imply an off-label or
compounded formulation carries FDA approval it lacks.

Prefer factual explanation of how established medications work, what they are
used for, supported timelines, variability in response, adverse effects, and
provider evaluation.

## Rule 8. Sexual-wellness content

- Describe approved mechanisms and indications accurately.
- Do not guarantee erections, performance, satisfaction, libido, stamina, or
  relationship improvement.
- Do not imply PDE5 inhibitors cause an erection without sexual stimulation.
- Do not minimize contraindications (nitrates, certain cardiac conditions) or
  interactions.
- Distinguish medications, dosing approaches, and approved versus off-label
  uses (for example, compounded troches or combinations).
- Avoid language suggesting a prescription is available to anyone who asks.

## Rule 9. Disclaimers do not rescue claims

An asterisk, "results may vary," "individual results vary," "not medical
advice," "potential benefits," or a footnote does not make an unsupported claim
acceptable. Revise the substantive statement.

Do NOT retain "NAD+ improves energy, cognition and longevity*" because a
footnote says results vary. Rewrite the sentence.

Short formats (ad headlines, captions, card titles, button labels, alt text,
meta descriptions) have no room for context, so every word in them must stand
on its own.

## Rule 10. Testimonials, statistics, and studies

Flag:
- testimonials implying atypical or guaranteed outcomes (FTC requires that a
  testimonial reflect typical results or clearly disclose what the typical
  consumer can expect; "results not typical" alone is insufficient)
- before-and-after claims or imagery
- unsourced statistics
- study results without drug, formulation, population, and timeframe
- animal or in-vitro findings presented as human outcomes
- correlation presented as causation
- research on one formulation used to substantiate another
- claims based only on anecdote
- pricing or savings claims that cannot be documented

Never invent citations, studies, statistics, or FDA status. If a claim cannot
be verified from the source material, FLAG it.

Testimonials are always YELLOW in the house system ("Patient testimonials"
and "Before/after imagery" require separate review: WP Playbook §07, §13,
§14). Creator content that describes a personal medication experience is the
same trigger. Compensated creators must disclose the relationship clearly and
conspicuously, inside the video for video content (WP Strategy p.14).

## Rule 11. WellPeps' role

WellPeps is an MSO / telehealth wellness platform. It is not the dispensing
pharmacy and does not manufacture or compound medication. Review and revise:
"our pharmacy," "we compound," "we manufacture," "we prescribe," "WellPeps
ships your medication," "our doctors."

Distinguish WellPeps, the licensed healthcare providers who evaluate and
prescribe, and the dispensing pharmacy partners. Make no unsupported claims
about a partner pharmacy's FDA status, accreditation (503A/503B, PCAB),
manufacturing standards, testing, sourcing, or regulatory status. Verify any
partner name against current documents in `docs/` before using it.

LegitScript treats partners as part of the application: fulfillment
pharmacies "are generally required to be LegitScript-certified or accredited
by another recognized body" such as NABP (LS Step §3 Unverified Partners;
LS 101 Affiliate and Partner Info). Any public statement that a partner is
certified or accredited is S1 FLAG until the status is confirmed with the
LegitScript "See the Status of a Website" tool or NABP.

"Founded by a physician and pharmacy professionals" is a factual statement of
company origin and is acceptable when true. It must not be worded so that a
reader thinks WellPeps itself is the pharmacy or that a physician reviews
every patient (see Rule 3).

## Rule 12. Transparency items LegitScript checks beyond claims

Flag, do not rewrite, anything touching:
- pricing, what is and is not included, refund and cancellation terms
- provider licensing and the states served
- eligibility restrictions (age, pregnancy, conditions)
- the online-visit process (must not read as "no prescription required")
- affiliate, referral, or partner representations
- privacy, terms, and consent language
- any statement of LegitScript status

Items the analyst review specifically looks for, and that a content sweep
should confirm are present and accurate (LS Step §3 Inadequate Provider
Transparency; LS 101 Tips; LS Fact standards):
- the site "must clearly disclose all states, territories, provinces, and/or
  countries in which applicants' services are available"
- all domains and websites under WellPeps' control are disclosed, and the
  copy on each is consistent
- all affiliates are disclosed; affiliate and partner links are declared
- a privacy policy appropriate to the jurisdiction, covering health data
- the prescription process is described accurately
- the required footer language is present on every page (Cheat Sheet §9,
  Model B wording, with the provider-terminology correction in the conflicts
  section below)

If any of these is missing, record it as an S1 FLAG titled "Missing
transparency item" even though there is no sentence to revise.

These live mostly in legal pages, pricing sections, footers, and FAQs. They
need a human owner, not an AI edit.

## Rule 13. Preserve educational value and SEO

Do not delete legitimate educational discussion because it involves a
medication, condition, mechanism, side effect, clinical study, or potential
treatment. Preserve useful factual content wherever accurate wording and
appropriate context make it compliant. Keep target keywords, H2/H3 structure,
slugs, internal links, and article length. The objective is responsible
patient education, not sterilized copy.

## Rule 14. House GREEN / YELLOW / RED system for social, ads, creators, community

The WellPeps pre-LegitScript documents classify every post, comment, creator
script, video, article, email, or community response before publication
(WP Playbook §01; WP Strategy p.1). The skill maps GREEN to PASS, YELLOW to
FLAG or a confident REVISE, and RED to S1 FLAG "do not publish."

**GREEN (WP Playbook §14):** educational, accurate, affiliation disclosed when
relevant, approved claims and WellPeps descriptions, directs to educational
resources, human-approved, respects community rules, paid creator
relationships disclosed, individualized medical questions escalated.

**YELLOW triggers (WP Playbook §01, §07, §13, §14; WP Strategy p.22):**
medication names; pricing; treatment-specific CTAs; weight-loss or efficacy
claims; patient testimonials; before/after imagery; creator discussions of
personal medication experiences; links from community conversations directly
to assessment or purchase pages; TikTok commercial content; any content
involving compounded medication; comparisons with competitors. "When in doubt
... treat it as YELLOW until reviewed."

**RED (WP Playbook §14; WP Strategy p.23):** prohibited Google/Meta
prescription-service ads before authorization; fake patient accounts;
astroturfing; hidden WellPeps affiliation; AI bots for mass unsolicited
comments; promising outcomes; "risk free"; influencer-invented medical
claims; paid fake reviews; an educational post that is actually disguised
prescription advertising; certification-pending language suggesting WellPeps
is already certified; circumventing a platform restriction through another
account, domain, or creator.

**Creator guardrails (WP Playbook §06):** approved messaging guide; no
improvised medical claims; no guaranteed results; no fabricated personal
experience; no before/after without separate approval; no "this will make
you lose 30 pounds"; no posing as an independent customer when compensated;
clear and conspicuous disclosure; no treatment-specific pricing or hard-sell
medication CTA before approval; TikTok creator content gets its own approval.

**Escalation (WP Playbook §13):** individualized dosing, side effects,
adverse events, or diagnosis requests are not content problems. Note them as
"escalate to clinical" and do not draft a reply.

## Known conflicts between source documents

Resolve these the same way every time:

1. **Cheat Sheet §9 footer says "licensed physician."** Rule 3 wins. Use
   "licensed healthcare provider" in the footer unless counsel confirms every
   patient is evaluated by a physician. Flag the footer if it still says
   physician.
2. **WP Strategy p.17 says "get as many client testimonials as possible."**
   WP Playbook §14 makes testimonials YELLOW and Rule 10 applies the FTC
   standard. Collecting testimonials is fine; publishing any one of them is a
   FLAG until reviewed for typicality and disclosure.
3. **WP Strategy creator scripts say "founded by a doctor and pharmacy."**
   Acceptable as company origin (Rule 11) but the same script must not imply
   physician review of every patient (Rule 3).
4. **Cheat Sheet was distilled from a secondary source dated Feb 2026 and
   verified against primary sources on 2026-09-15** (its §12 log). The tier
   list and state matrix may be relied on until the re-check dates in that
   log pass. Two items remain counsel questions, not facts: the legal basis
   the dispensing pharmacy relies on for sermorelin, and whether NY accepts
   self-attested DOB for online supplement sales. Never cite the cheat sheet
   itself in public copy; it is internal.
5. **The client prompt's category list omits hormone optimization and mental
   wellness**, which the site offers. Review those pages under the same rules
   with controlled-substance caution (Cheat Sheet §4 DEA telemedicine rules).

## Verdicts

- **PASS**: no material change. Do not rewrite for taste.
- **REVISE**: minimum edit, tone and structure preserved, rule cited.
- **FLAG**: human review required. Record original language, compliance
  concern, recommended revision if one is defensible, and exactly what needs
  human verification.

Severity tags for the log, to help triage:
- `S1` FDA status, compounded-drug regulatory language, pharmacy or partner
  regulatory claims, testimonials with outcomes, pricing or refund terms,
  LegitScript status language, Tier 3 peptides, missing transparency items,
  anything on the RED list
- `S2` outcome claims, superiority claims, trial extrapolation, guarantees
- `S3` provider terminology, mechanism-to-benefit drift, hedging that reads as
  a promise, tone words ("breakthrough")

## Final quality check, per item

1. Does anything promise or strongly imply an unsupported treatment outcome?
2. Has mechanism language become an efficacy claim?
3. Does anything imply a compounded medication is FDA-approved?
4. Are FDA-approved and compounded formulations clearly distinguished?
5. Does anything imply treatment or a prescription is guaranteed?
6. Is provider involvement described accurately?
7. Has physician-specific wording been changed where appropriate?
8. Are study results presented with context and without extrapolation?
9. Are emerging or preliminary findings identified as such?
10. Are safety information and limitations presented fairly?
11. Is WellPeps distinguished from providers and pharmacies?
12. Would a reasonable consumer read any sentence as promising more than the
    evidence establishes?

Any yes means revise or flag before publishing.
