# The nine standards → requirement register

LegitScript's certification standards, summarised from
`legitscript.com/certification/healthcare-certification/standards/` and the
telemedicine certification pages, **fetched 2026-09-22**. Do not fetch them during a
run — reproducibility beats freshness for a document set that changes annually. When
you believe the standards have changed, re-fetch deliberately, update this file, and
bump the fetch date.

## Submission context (confirmed 2026-09-22)

WellPeps is **not applying as a standalone merchant**. It is being submitted as an
**established client operating on the already-certified partner network** under
**Scriptful's Enterprise LegitScript Certification**. Both the dispensing pharmacies
and the prescribing physicians are certified under that enterprise certification.

This changes where the work is, and you must apply it when setting severity:

- **The clinical and dispensing chain is largely pre-answered.** Standards 2, 4 and 7
  are satisfied *by evidence from the network* rather than by WellPeps building
  anything. The job there is to produce the certificates and the addendum, and to make
  sure the site does not contradict them.
- **The burden shifts onto WellPeps' own website and business transparency.** Standards
  1, 5, 6 and 8 are entirely WellPeps' and cannot be inherited from the network: the
  legal entity, the business address, the states-served list, the legal pages, SSL,
  refund/shipping/contact, and honest availability representations.
- **Net effect: the standards currently failing are precisely the ones the enterprise
  certification does not cover.** Do not let "our partners are certified" be read as
  reducing the urgency of the website findings — it concentrates attention on them.
- Standard 3 still applies to the WellPeps entity and its principals regardless.

## How to use this file

Every requirement below has a **stable ID**. Your job on a run is to set `status` on
these IDs — not to invent new ones. The ID names the *requirement*, never the current
defect, so a record survives the defect changing shape and flips `open` → `resolved`
instead of dying and being reborn.

`Known state` records what was true at the last full survey (2026-09-22). It is a
starting hypothesis and a calibration aid, **not** a substitute for checking. Always
re-verify; the whole point of the register is that things change.

Owners: `you-provide` · `web-team` · `lawyer` · `pharmacy-partner` · `provider-group`.
The first three match the vocabulary the client already sees on the draft legal pages
(`wellpeps-site/src/components/LegalLayout.astro:44-46`); the last two exist because
the two largest gaps belong to neither.

---

## Standard 1 — Licensure & Business Registration

> Merchants must maintain adequate licensing for their services and for every
> jurisdiction where medications are prescribed or dispensed and where patients are
> located.

### LS1-LEGAL-ENTITY-NAMED
The exact registered legal entity name appears on the site.
**Check:** Terms §1, Privacy §1, NPP, footer copyright.
**Known state:** placeholder in all three policy pages (`privacy-policy.astro:23`,
`terms-of-use.astro:31`). Live footer shows only "© 2025 WellPeps" — also a stale year.
**Owner:** you-provide · **Default severity:** S1 · blocks application.

### LS1-ENTITY-CONSISTENT
The same entity name is used everywhere, and it matches the name on the business
registration and on every partner agreement.
**Check:** diff the entity string across all legal pages and the footer.
**Owner:** you-provide · **S2**.

### LS1-BUSINESS-ADDRESS-PUBLISHED
A real physical business address is published, not a placeholder.
**Check:** footer and every legal page.
**Known state:** absent site-wide; placeholders at `privacy-policy.astro:150`,
`terms-of-use.astro:246`, `notice-of-privacy-practices.astro:100`,
`accessibility.astro:110`.
**Owner:** you-provide · **S1** · blocks application.

### LS1-PROFESSIONAL-ENTITY-NAMED
The professional entity (PC/PA) that employs or contracts the prescribing providers is
named, and the MSO relationship is described.
**Check:** `/why-wellpeps`, footer disclaimer, Terms.
**Known state:** never named. Footer says only "independent providers."
**Owner:** provider-group · **S1** · blocks application.

### LS1-PROVIDER-LICENSURE-SUBSTANTIATED
Every licensure claim on the site is backed by the licensure matrix.
**Check:** the "Licensed Providers in All 50 States" claim at `Footer.astro:149`,
`src/data/content.ts:21,57-58`, `why-wellpeps.astro:10`.
**Known state:** `terms-of-use.astro:8,68` already flags this claim internally as
unverified against actual licensure. This is simultaneously the Standard 5 disclosure
and an unverified Standard 1/8 claim — see the decision note in the triage playbook.
**The enterprise certification does not rescue this.** Certified physicians are not the
same as physicians licensed in all fifty states, and the claim is WellPeps' own copy on
WellPeps' own site. Get the actual coverage from Scriptful and make the sentence match it.
**Owner:** provider-group · **S1** · blocks application.

### LS1-LICENSURE-MATRIX-COMPLETE
The per-state, per-provider licensure record is available for submission.
**Check:** `eBooks/Marketing Plan/LegitScript Requirements/LegitScript+Licensure+Template.xlsx`.
**Under the enterprise submission** the physicians are certified through Scriptful, so
this record is sourced *from the network* rather than compiled by WellPeps. Confirm who
produces it before assigning work — but still obtain it, because it is what
`LS5-STATES-MATCH-LICENSURE` is checked against.
**Owner:** provider-group · **S2** · evidence pack item.

---

## Standard 2 — Legal Compliance

> Applicants must comply with all applicable laws and licensing, and cannot facilitate
> the prescribing or dispensing of medications that lack the necessary authorisation.

### LS2-FORMULARY-ALIGNED
Every therapy advertised on the site has a corresponding row in the partner formulary.
Anything advertised with no formulary row is an unauthorised offer.
**Check:** cross-reference product names in `src/data/weight.ts`, `peptide.ts`,
`hair.ts`, `sexual.ts`, `programs.ts` against `Scriptful/formulary-2026-09-16-00-18-55.csv`
and `docs/pricing/CSV-formulary.csv`.
**Owner:** web-team (to remove) / you-provide (to confirm) · **S1**.

### LS2-PEPTIDE-TIER-COMPLIANT
No Tier 3 peptide appears as a WellPeps therapy, benefit or program.
**Check:** the Tier 1/2/3 table in `docs/COMPLIANCE-CHEAT-SHEET.md` §1 against
`src/data/peptide.ts` and the Learning Center corpus.
**Why this matters more here than for a typical applicant:** LegitScript names
"unauthorized peptides" in its Top 10 Problematic Products for 2026, so the peptide
surface will get closer reading than the rest of the site.
**Owner:** you-provide · **S1**.

### LS2-COMPOUNDED-AUTHORITY
The regulatory basis for each compounded product is documented: 503A vs 503B, and for
compounded GLP-1s the documented clinical need.
**Why:** the FDA shortage allowances ended (tirzepatide 2025-03-05, semaglutide
2025-04-24). Post-shortage, compounding must meet a documented clinical need that a
commercially available FDA-approved product cannot satisfy, and must not be
"essentially a copy." FDA issued 58 warning letters in September 2025 and 30 more in
March 2026 to telehealth companies over compounded GLP-1 marketing.
**Check:** ask for the protocol as an attachable artifact, not a policy claim.
**Under the enterprise submission** this sits with the certified pharmacies rather than
with WellPeps; obtain it rather than author it, and never describe the protocol on the
site in terms the pharmacy has not confirmed.
**Owner:** pharmacy-partner · **S2** · evidence pack item.

### LS2-NO-UNAPPROVED-INDICATION
No product is presented for an indication it is not authorised for.
**Handoff:** sentence-level wording goes to `wellpeps-compliance-review`.
**Owner:** web-team · **S2**.

---

## Standard 3 — Prior Discipline and History

> Applicants must disclose criminal, regulatory or civil violations from the past ten
> years, and cannot have recent or repeated disciplinary sanctions.

*Skipped entirely in `triage` mode — it has no site surface and cannot be resolved by
the web team.*

### LS3-DISCIPLINE-ATTESTATION
A ten-year attestation exists for the entity and its principals.
**Owner:** you-provide · **S1** · evidence pack item.

### LS3-NO-CONTRADICTING-CREDENTIAL-CLAIMS
Nothing on the site asserts a credential, board certification or standing that the
attestation or licensure record would contradict.
**Check:** scan for "board-certified", "award-winning", "top-rated" style assertions.
**Owner:** web-team · **S2**.

---

## Standard 4 — Affiliates and Partners

> All affiliated individuals, businesses and partners must comply with program
> standards and operate legally. Partners essential to care — such as pharmacies —
> generally require LegitScript certification or equivalent accreditation.

**This is WellPeps' strongest standard and its most visible gap at the same time.**
The dispensing pharmacies and the prescribing physicians are certified under
**Scriptful's Enterprise LegitScript Certification**, and WellPeps is submitted as an
established client on that network. Standard 4 is therefore answered with
*certificates*, not with prose — the analyst work here is document production, not
remediation.

The gap is that the site names none of them. The certificates and the website
currently disagree, which reads worse than silence: an applicant claiming the benefit
of a certified network while describing its partners only as "licensed U.S.
pharmacies" invites exactly the question it is trying to pre-empt.

### LS4-PHARMACY-NAMED
The dispensing pharmacy or pharmacies are named on the site, with state licensure.
**Check:** grep all of `src/` for any pharmacy name.
**Known state:** zero hits. The site says only "licensed U.S. pharmacies" /
"FDA-registered compounding pharmacies" — `src/data/content.ts:38,59`,
`knowledge.ts:97-127`, `weight.ts:57,80`, `peptide.ts:176`.
**As of 2026-09-22:** pharmacy **names and formularies are available in the GEN Health
back end**; full pharmacy detail has been requested. Addresses and registered legal
business names are **not yet in hand**.
**This requirement is satisfiable before the addresses arrive.** The public site needs
the pharmacy *name* plus the states it is licensed in; registered legal business names
and addresses are `LS4-PARTNER-CERT-EVIDENCED` / evidence-pack items, not site copy.
Do not let the missing address block the partner disclosure block from shipping.
**Owner:** pharmacy-partner · **S1** · blocks application.

### LS4-PARTNER-ROSTER
Every entity in the patient journey is named and its role described: WellPeps (MSO),
the professional entity (providers), GEN Health / Scriptful (platform), the pharmacy
(dispensing).
**Highest-leverage single site change available:** one "who does what" partner
disclosure block on `/why-wellpeps` with a footer link satisfies evidence for
Standards 1, 4, 7 and 8 in a single build.
**Owner:** you-provide · **S1** · blocks application.

### LS4-PARTNER-CERT-EVIDENCED
Enterprise certification evidence is on file for each partner, and **the exact legal
entity name on each certificate is recorded** — that name is what must appear on the
site, or certificate and site disagree.
**Repo leads:** `Scriptful/Addendum_WellPeps_OSI_Scriptful.docx`,
`Pharmacy Docs/`, `telehealth/genhealth-api-report.docx`, `docs/GenHealth Guide/`.
**Guardrail:** never assert a partner is certified without having seen the certificate.
**As of 2026-09-22:** confirmed that the pharmacies and physicians are certified under
**Scriptful's Enterprise LegitScript Certification**, with WellPeps submitted as an
established client on that network. The primary evidence is therefore the enterprise
certificate plus the WellPeps addendum
(`Scriptful/Addendum_WellPeps_OSI_Scriptful.docx`), not per-pharmacy applications.
Still outstanding — registered legal business name and business address per pharmacy.
Neither is needed for site copy, but the legal business name must match the enterprise
certificate exactly wherever it is used.
**Owner:** you-provide · **S1** · evidence pack item.

### LS4-MSO-ROLE-DISCLOSED
The site states plainly that WellPeps does not practise medicine, prescribe, compound,
dispense or ship.
**Known state:** the footer disclaimer (`Footer.astro:163-167`) does most of this
already — verify it survives any partner-block rewrite.
**Owner:** web-team · **S2**.

### LS4-DOMAIN-INVENTORY
Every domain under the applicant's control is inventoried for the application,
including `portal.wellpeps.com` — a WellPeps-branded subdomain fronting a partner
platform, which needs describing rather than glossing.
**Refs:** `telehealth/portal.wellpeps.com-dns-records.json`, `Scriptful/DNS Records/`.
**Owner:** web-team · **S2** · evidence pack item.

---

## Standard 5 — Patient Services

> Websites must clearly disclose all states, territories, provinces and countries
> where services are available.

### LS5-STATES-DISCLOSED
An actual enumerated list of states served exists on a findable page.
**Known state:** absent. The site asserts "all 50 states" in prose but publishes no
list. This is the cleanest direct hit in the audit.
**Owner:** you-provide (the list) + web-team (the page) · **S1** · blocks application.

### LS5-STATES-MATCH-LICENSURE
The published list matches `LS1-LICENSURE-MATRIX-COMPLETE` exactly.
**Failure mode to avoid:** leaving "all 50 states" in the footer while publishing a
states page that lists fewer than 50. That is worse than either alone.
**Owner:** provider-group · **S1** · blocks application.

### LS5-PROGRAM-STATE-VARIANCE
Where availability differs by program, that variance is disclosed per program rather
than only site-wide.
**Owner:** you-provide · **S2**.

---

## Standard 6 — Privacy

> Applicants must comply with all privacy laws, including HIPAA for US businesses
> handling PHI, and use SSL technology for sensitive data.

### LS6-LEGAL-PAGES-LIVE
No page carries a draft, template or internal-workflow marker in production.
**Known state — the single biggest application risk.** All five legal pages render
"Draft for review — not a live legal notice yet" plus colour-coded
You-provide / Web-team / Lawyer placeholders via
`wellpeps-site/src/components/LegalLayout.astro:36-58`. **Verified live** on
`https://wellpeps.com/privacy-policy/` on 2026-09-22, including visible internal
instructions such as "Lawyer: confirm whether the Washington My Health My Data Act
applies." A reviewer reads this in about two seconds, and it fails Standards 1, 6 and
8 simultaneously.
**Either finish the pages or pull them from the footer — never leave the banner where
an analyst lands.**
**Owner:** lawyer (content) + web-team (banner) · **S1** · blocks application.

### LS6-EFFECTIVE-DATES-SET
Every legal page carries a real effective date.
**Known state:** placeholders throughout.
**Owner:** lawyer · **S2** · blocks application.

### LS6-SSL-END-TO-END
No request downgrades from HTTPS to HTTP at any hop.
**Known state — verified live 2026-09-22:** `https://wellpeps.com/privacy-policy`
returns `301` to `http://wellpeps.com/privacy-policy/`, which then `302`s back to
HTTPS. Every URL without a trailing slash round-trips through plaintext. Cause:
`wellpeps-site/nginx.conf` has no `absolute_redirect off;`, so nginx builds absolute
redirects using the container's own `listen 80` scheme rather than the proxied scheme.
**Owner:** web-team · **S1** · blocks application.

### LS6-PRIVACY-DOCS-COMPLETE
Privacy Policy, Notice of Privacy Practices and Your Privacy Choices are complete and
internally consistent.
**Owner:** lawyer · **S1** · blocks application.

### LS6-CCPA-CONTROL-FUNCTIONAL
The "Do Not Sell or Share" control actually works.
**Known state:** non-functional; `your-privacy-choices.astro:20-34` says the button
still has to be built.
**Owner:** web-team · **S2** · blocks application.

### LS6-THIRD-PARTY-DISCLOSED
Every third party receiving data from the browser is disclosed in the privacy policy.
**Check:** `src/lib/notify.ts` (Supabase Edge Function), `src/lib/assistant.ts` and
`Assistant.astro`, plus the third-party Google Fonts request from `BaseLayout.astro`
(which already carries a self-host TODO).
**Owner:** web-team (inventory) + lawyer (wording) · **S2**.

---

## Standard 7 — Validity of Prescription

> Merchants may dispense prescription drugs only on receipt of a valid prescription
> from an authorised provider, in compliance with applicable telemedicine law.

### LS7-RX-REQUIRED-DISCLOSED
Every program states plainly that a prescription is required.
**Why this one specifically:** LegitScript's own guidance names missing
"prescription required" language as the most common application-delaying gap.
**Known state:** present on weight (`weight.ts:109`,
`WeightProducts.astro:49`) and peptides (`peptide.ts:188`); **absent** on hair
(`hair.ts:65`) and sexual wellness (`sexual.ts:70`), which say only "requires a
consultation."
**Handoff:** `wellpeps-compliance-review`, mode `page`.
**Owner:** web-team · **S1** · blocks application.

### LS7-PRESCRIBING-PROCESS-DESCRIBED
The site describes how a prescription is actually obtained: intake, provider
evaluation, prescribing decision, dispensing.
**Owner:** web-team · **S2** · blocks application.

### LS7-EVALUATION-BEFORE-PAYMENT
The funnel does not take payment for a specific medication before a provider has
evaluated the patient.
**Known state:** `src/config.ts` uses `checkoutFlow=intake_first`, which is the
defensible order — but `Scriptful/Which Order do we want to enforce with regard to
payment.png` shows the question was still open. Record this as a **decision**, not an
assumption.
**Owner:** you-provide · **S1**.

### LS7-NO-GUARANTEED-PRESCRIPTION
No copy implies a prescription is assured, or that the consultation is a formality.
**Handoff:** `wellpeps-compliance-review`.
**Owner:** web-team · **S1**.

---

## Standard 8 — Transparency

> All practices and offers must be accurate, transparent, and not misleading to
> patients or the public.

### LS8-REFUND-POLICY-PUBLISHED
A refund / cancellation policy exists as a findable page.
**Known state:** no page. Fragments only at `membership.astro:37`,
`why-wellpeps.astro:34`, `src/data/content.ts:31`, plus an unfilled placeholder at
`terms-of-use.astro:105,118`.
**Owner:** lawyer (terms) + web-team (page) · **S1** · blocks application.

### LS8-SHIPPING-POLICY-PUBLISHED
A shipping / delivery policy exists as a findable page.
**Known state:** no page. The footer "Shipping & Delivery" link points at `/#faq`
(`Footer.astro:49`); substance lives only in `content.ts:59` and `knowledge.ts:121-127`.
**Owner:** web-team · **S1** · blocks application.

### LS8-CONTACT-PAGE-PUBLISHED
A contact page exists with a working route.
**Known state:** no route; the footer "Contact Us" link is `href="#"`.
**Owner:** web-team · **S1** · blocks application.

### LS8-NO-DEAD-LINKS
No navigation or footer link is a placeholder.
**Known state:** five dead links at `Footer.astro:37,39,40,47,48` — Our Mission,
Careers, Contact Us, Help Center, Virtual Assistant. (An earlier hand count said five
but cited four positions; the scanner resolves this to five.)
**Owner:** web-team · **S3** · blocks application.

### LS8-COMPOUNDED-NOT-FDA-APPROVED-DISCLOSED
The compounded-vs-approved distinction is disclosed wherever compounded products are
offered, not only in Terms.
**Known state:** present at `peptide.ts:166`, `terms-of-use.astro:83-86`,
`hair.ts:174-175`. Verify coverage on weight loss and sexual wellness.
**Owner:** web-team · **S2**.

### LS8-FDA-STRUCTURE-FUNCTION-STATEMENT
The site-wide "not evaluated by the FDA" structure/function statement is present where
required.
**Known state:** absent site-wide. Only the narrower compounded disclaimer exists. The
repo's own `docs/COMPLIANCE-CHEAT-SHEET.md:264` and the Model B footer block at `:197`
specify copy that does not appear in `Footer.astro`.
**Owner:** web-team · **S2**.

### LS8-PRICING-ACCURATE
Advertised prices are complete — including the membership fee wherever medication
prices appear — and match the partner formulary.
**Owner:** you-provide · **S2**.

### LS8-AUTORENEW-TERMS-CLEAR
Membership auto-renewal, billing cadence and cancellation are stated where a patient
signs up, not only in Terms.
**Owner:** lawyer + web-team · **S2**.

### LS8-AVAILABILITY-REPRESENTATION-HONEST
What the site says about availability matches reality.
**Known state:** `ASSESSMENTS_PAUSED = true` (`src/config.ts:116`) makes every
treatment CTA read "Opening Soon". Needs a deliberate decision — see the triage
playbook.
**Owner:** you-provide · **S2**.

### LS8-CONTACT-DETAILS-MATCH-LIVE
Published contact details are correct and consistent between repo and production.
**Known state:** `src/config.ts:175-181` sets `hello@wellpeps.com`; the live footer
appeared to render `support@wellpeps.com` (obscured by email protection, so confirm
with the `--live` pass rather than trusting the earlier read). Live copyright reads
"© 2025" in 2026.
**Owner:** web-team · **S3**.

---

## Standard 9 — Advertising

> Applicants must advertise in compliance with all applicable laws and platform terms
> of service, and all advertisements must be accurate, transparent and not misleading.

Deliberately narrow here. Sentence-level claim work belongs to
`wellpeps-compliance-review`; this standard owns the *inventory* and the
certification-status claims.

### LS9-NO-CERTIFICATION-CLAIM
No surface states or implies LegitScript certification before it is granted, including
"certification pending" phrasing a reader could mistake for certified status.
**Known state:** the seal and badges are commented out in `Footer.astro:179-189`,
`content.ts:39-41`, `knowledge.ts:138-141`, `why-wellpeps.astro:14-15`. Verify they
stay out and that no off-site surface claims it.
**Owner:** web-team · **S1** · blocks application.

### LS9-NO-COMPARATIVE-EFFICACY
No comparative efficacy claim against brand-name FDA-approved GLP-1s.
**Handoff:** `wellpeps-compliance-review`.
**Owner:** web-team · **S1**.

### LS9-NO-OUTCOME-GUARANTEE
No guaranteed weight-loss or treatment outcome, anywhere, including social and ads.
**Handoff:** `wellpeps-compliance-review`.
**Owner:** web-team · **S1**.

### LS9-NO-BEFORE-AFTER
No before/after imagery on owned or paid surfaces.
**Owner:** web-team · **S1**.

### LS9-TESTIMONIALS-SUBSTANTIATED
Any testimonial, statistic or study reference is traceable and carries required FTC
disclosure.
**Handoff:** `wellpeps-compliance-review`.
**Owner:** you-provide · **S2**.

### LS9-OFFSITE-SURFACE-INVENTORY
Every off-site surface the applicant controls is inventoried: social profiles, ad
accounts, eBooks and landing pages.
**Owner:** you-provide · **S2** · evidence pack item.

### LS9-ASSISTANT-SURFACE-CONTROLLED
The site-wide AI assistant answering clinical questions has a reviewer-visible control.
**Known state:** `Assistant.astro` plus the `knowledge.ts` corpus answers clinical
questions live with no gate. Its full answer space cannot be audited in a week; the
defensible move is to gate or narrow it during review rather than claim it was swept.
**Owner:** you-provide (decision) + web-team (implementation) · **S1**.
