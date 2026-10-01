# Surface inventory

**Structural** surfaces only: routes, domains and entities. For where page *content*
lives and how it is republished, use the sibling skill's
`wellpeps-compliance-review/references/surface-map.md` — but note that file is stale
(it cites `peptides.astro`, renamed to `healthy-aging`, and `ProductCardPills.astro`,
which no longer exists). Do not depend on it until it is fixed.

## Routes that exist

Astro static build, `wellpeps-site/`, site `https://wellpeps.com`, served by
`wellpeps-site/nginx.conf`. Directory-style URLs; `/peptides` 301s to `/healthy-aging`.

`/` · `/weight-loss` · `/hair-restoration` · `/sexual-wellness` · `/healthy-aging` ·
`/hormone-optimization` (waitlist) · `/mental-wellness` (waitlist) · `/why-wellpeps` ·
`/membership` · `/wellness-learning-center` + 45 article slugs ·
`/privacy-policy` · `/terms-of-use` · `/notice-of-privacy-practices` ·
`/accessibility` · `/your-privacy-choices`

Articles are not in the repo — they build from Supabase (`src/lib/blog.ts`), seeded
from `wellpeps-site/scripts/data/articles.json`.

## Routes that should exist and do not

| Route | Register ID |
|---|---|
| states served | `LS5-STATES-DISCLOSED` |
| refund / cancellation | `LS8-REFUND-POLICY-PUBLISHED` |
| shipping & delivery | `LS8-SHIPPING-POLICY-PUBLISHED` |
| contact | `LS8-CONTACT-PAGE-PUBLISHED` |
| how prescribing works | `LS7-PRESCRIBING-PROCESS-DESCRIBED` |
| partner / pharmacy disclosure | `LS4-PARTNER-ROSTER` |

Also absent: `robots.txt` and a sitemap in `public/`.

## Domains

| Domain | Role | Note |
|---|---|---|
| `wellpeps.com` | marketing site | this repo |
| `www.wellpeps.com` | alias | |
| `portal.wellpeps.com` | patient portal | **WellPeps-branded subdomain fronting GEN Health.** Declare it and describe the relationship; do not gloss it. Refs: `telehealth/portal.wellpeps.com-dns-records.json`, `Scriptful/DNS Records/` |

## The site ↔ portal boundary

Intake, consent, PHI, payment and the patient relationship all live **off this repo**
on `portal.wellpeps.com` (GEN Health / Scriptful). A reviewer's checkout-flow review
leaves this codebase entirely.

`src/config.ts:116` sets `ASSESSMENTS_PAUSED = true`, so every treatment CTA currently
renders "Opening Soon" rather than linking through. That means the prescription flow
cannot presently be walked by a reviewer — see the decision note in the triage playbook.

## Entities in the patient journey

Named here so the audit can check the site names them too. **Verify each against a
document before publishing it anywhere.**

| Role | Entity | Status |
|---|---|---|
| Platform / MSO | WellPeps (legal entity name **unknown — placeholder on site**) | `LS1-LEGAL-ENTITY-NAMED` |
| Prescribing providers | professional entity **unnamed** | `LS1-PROFESSIONAL-ENTITY-NAMED` |
| Telehealth platform | GEN Health / Scriptful | certified (LegitScript Enterprise) |
| Dispensing | pharmacies — names in the GEN Health back end; legal names and addresses requested | certified under the same enterprise certification |
| Labs | Quest®, Labcorp® name-dropped at `src/data/weight.ts:72-73` | verify the relationship supports naming them |
