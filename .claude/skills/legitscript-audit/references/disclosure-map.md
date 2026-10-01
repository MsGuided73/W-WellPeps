# Disclosure placement map

The register says *whether* a disclosure exists. This file says **what it must say and
exactly where it goes**. Without it an audit produces findings nobody can act on.

Approved wording lives in `docs/COMPLIANCE-CHEAT-SHEET.md` §9 (site copy) and §11
(supplement claims). **None of it is on the site as of 2026-09-22** — it was specified
and never installed, which is why several register items fail.

Rule that governs all of it: **a disclaimer never rescues a claim.** If the sentence
needs an asterisk to be true, the sentence is wrong. These are baseline notices, not
patches.

---

## D1 — Site-wide telehealth footer

> This site does not provide medical advice. Prescriptions are issued only after
> evaluation by a licensed physician. Compounded medications are not FDA-approved and
> have not been evaluated for safety, efficacy, or quality. Availability varies by state.

**Goes on:** every page, in the footer — `wellpeps-site/src/components/Footer.astro`.
One edit covers the whole site because `BaseLayout.astro` renders the footer everywhere.

**Current state:** absent. The footer carries only the MSO role disclaimer
(`Footer.astro:163-167`), which is a different statement and does not substitute.

**Register:** `LS8-FDA-STRUCTURE-FUNCTION-STATEMENT`, and it also satisfies part of
`LS7-RX-REQUIRED-DISCLOSED` and `LS5-STATES-DISCLOSED` (the "varies by state" clause is
a pointer, **not** a substitute for publishing the actual state list).

---

## D2 — Educational content

> For educational purposes only. Not a substitute for advice from a licensed healthcare
> provider.

**Goes on:** the Learning Center index (`src/pages/wellness-learning-center/index.astro:172-176`),
every article (`disclaimer_html` on all 45 rows in `scripts/data/articles.json`, rendered
at `[slug].astro:162-166`), and the AI assistant (`Assistant.astro:50-52`).

**Current state:** present in all three places, but the wording differs from the
approved text. Align rather than add.

**Register:** `LS9-*` educational surfaces.

---

## D3 — Compounded medications

> Compounded medications are not FDA-approved and have not been evaluated for safety,
> efficacy, or quality.

**Goes on:** every page offering a compounded product, next to the product — not only
in Terms. That means `/weight-loss`, `/hair-restoration`, `/sexual-wellness` and
`/healthy-aging`.

**Current state:** present at `src/data/peptide.ts:166`, `src/data/hair.ts:174-175` and
`src/pages/terms-of-use.astro:83-86`. **Unconfirmed on weight loss and sexual wellness**,
which are the two highest-traffic compounded surfaces.

**Register:** `LS8-COMPOUNDED-NOT-FDA-APPROVED-DISCLOSED`.

---

## D4 — Prescription required

> Prescription required. Treatment recommendations depend on your assessment and
> provider evaluation.

**Goes on:** every program page, at the product grid — the pattern already used at
`src/data/weight.ts:109`.

**Current state:** only Weight Loss has it. Hair (`hair.ts:65`) and Sexual Wellness
(`sexual.ts:70`) say only "requires a consultation". Peptides (`peptide.ts:188`) has a
hedged FAQ line — *"Most therapies... require evaluation"* — and the word "Most" implies
some do not, which is worse than saying nothing.

**Why this one first:** LegitScript's own guidance names missing prescription-required
language as the most common application-delaying gap.

**Register:** `LS7-RX-REQUIRED-DISCLOSED`.

---

## D5 — Supplements and structure/function claims

> These statements have not been evaluated by the Food and Drug Administration. This
> product is not intended to diagnose, treat, cure, or prevent any disease.

**Goes on:** every supplement or wellness product page and the shop footer. Mandatory
under 21 CFR 101.93 for any structure/function claim.

**Current state:** absent, and no wellness shop exists yet. This becomes blocking the
moment a supplement is sold.

**Register:** `LS8-FDA-STRUCTURE-FUNCTION-STATEMENT`.

---

## D6 — States served

Not a disclaimer — a published list. `"Availability varies by state"` in D1 is a pointer
to it, never a replacement.

**Goes on:** its own findable page, linked from the footer, plus a per-program note
wherever availability differs.

**Current state:** no list anywhere. The site instead claims "Licensed Providers in All
50 States" in 18 places, which `terms-of-use.astro:8,68` already flags internally as
unverified.

**Register:** `LS5-STATES-DISCLOSED`, `LS5-STATES-MATCH-LICENSURE`.

---

## Placement summary

| Disclosure | Footer | Program pages | Articles | Assistant | Own page |
|---|---|---|---|---|---|
| D1 telehealth | ✅ required | — | — | — | — |
| D2 educational | — | — | ✅ required | ✅ required | — |
| D3 compounded | — | ✅ all four | — | — | — |
| D4 prescription required | — | ✅ all four | — | — | — |
| D5 structure/function | shop footer | supplement pages | — | — | — |
| D6 states served | ✅ link | ✅ where it varies | — | — | ✅ required |

## Before installing any of it

Two checks, in this order:

1. **Does the disclaimer contradict the page it sits on?** A compounded-medication
   notice under copy that implies FDA approval is worthless (Cheat Sheet §3). Fix the
   claim first.
2. **Has the wording been approved?** Section 9 of the information request asks the
   owner and their attorney to approve D1, D2 and D5 as written or edit them. Install
   the approved version, not this file's copy, if they differ.

   **Status 2026-09-22: deferred to the next pass by the user.** The wording above is
   the repo's own specified copy and has not yet been reviewed or signed off. Until it
   is, treat every text block in this file as *proposed*: place the findings, sequence
   the work, and leave the exact sentences open. Do not install D1, D2 or D5 on the
   site on the strength of this file alone, and re-read this note at the start of the
   next run rather than assuming approval happened in between.

Wording changes to existing page copy belong to `wellpeps-compliance-review`. This
skill records placement and absence; it does not write the sentences.
