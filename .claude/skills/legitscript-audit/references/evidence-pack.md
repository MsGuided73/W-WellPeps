# Evidence pack

What gets attached to the application, who produces it, and where the repo already
holds a lead. Rendered per run as `evidence-pack.md` with a status column.

**Submission context:** WellPeps is submitted as an **established client on Scriptful's
Enterprise LegitScript Certification**; the dispensing pharmacies and the prescribing
physicians are certified under it. So Standard 4 is answered with *certificates*, and
the documents WellPeps must originate are narrower than for a standalone applicant.

**The hard guardrail:** never assert that a partner is certified without having seen
the certificate. This output goes to the certifier. Record the **exact legal entity
name printed on each certificate** — that is the name that must appear wherever the
site or the application names that partner.

## A. Documents WellPeps must originate

| # | Document | Standard | Owner | Repo lead |
|---|---|---|---|---|
| A1 | Business registration / articles for the WellPeps legal entity | 1 | you-provide | — |
| A2 | EIN / tax identification | 1 | you-provide | — |
| A3 | Ten-year discipline attestation for the entity and its principals | 3 | you-provide | — |
| A4 | MSO structure: management services agreement + the professional entity name and its state registrations | 1, 4 | you-provide | — |
| A5 | Domain inventory: `wellpeps.com`, `www`, `portal.wellpeps.com` | 4 | web-team | `telehealth/portal.wellpeps.com-dns-records.json`, `Scriptful/DNS Records/` |
| A6 | Off-site surface inventory: social profiles, ad accounts, eBooks, landing pages | 9 | you-provide | `docs/marketing/`, `Social Media/`, `eBooks/` |
| A7 | BAAs with GEN Health / Scriptful and the pharmacies | 6 | lawyer | `Scriptful/`, `docs/GenHealth Guide/` |

A4 is the item most likely to be missing outright, and it feeds Standards 1 and 4 at
the same time.

## B. Documents inherited from the certified network

Obtain these; do not author them.

| # | Document | Standard | Source | Repo lead |
|---|---|---|---|---|
| B1 | Scriptful Enterprise LegitScript Certification certificate | 4 | Scriptful | — |
| B2 | WellPeps addendum placing it on that network | 4 | Scriptful | `Scriptful/Addendum_WellPeps_OSI_Scriptful.docx` |
| B3 | Pharmacy roster: name, registered legal business name, address, resident and non-resident licences per state shipped to, 503A/503B status | 1, 2, 4 | pharmacies | `Pharmacy Docs/`, GEN Health back end |
| B4 | Physician/provider licensure coverage by state | 1, 5 | Scriptful | `eBooks/Marketing Plan/LegitScript Requirements/LegitScript+Licensure+Template.xlsx` |
| B5 | Documented clinical-need protocol for compounded GLP-1s (post-shortage) | 2 | pharmacies | — |
| B6 | Formulary as actually dispensed | 2 | Scriptful / GEN Health | `Scriptful/formulary-2026-09-16-00-18-55.csv`, `docs/pricing/CSV-formulary.csv` |

**Outstanding as of 2026-09-22:** pharmacy names and formularies are available in the
GEN Health back end; registered legal business names and business addresses have been
requested and are not yet in hand. Neither blocks the site copy — see
`LS4-PHARMACY-NAMED` — but both are needed for the application, and B3's legal name
must match B1.

## C. Site artifacts the pack points at

Live URLs the application references. **Four of these do not exist and five exist only
as drafts**, which is what makes this section the forcing function for the whole
remediation week.

| URL | Exists? | Register ID |
|---|---|---|
| `/privacy-policy` | draft banner live | `LS6-LEGAL-PAGES-LIVE` |
| `/terms-of-use` | draft banner live | `LS6-LEGAL-PAGES-LIVE` |
| `/notice-of-privacy-practices` | draft banner live | `LS6-LEGAL-PAGES-LIVE` |
| `/your-privacy-choices` | draft banner live, control non-functional | `LS6-CCPA-CONTROL-FUNCTIONAL` |
| `/accessibility` | draft banner live | `LS6-LEGAL-PAGES-LIVE` |
| states served | **missing** | `LS5-STATES-DISCLOSED` |
| refund / cancellation | **missing** | `LS8-REFUND-POLICY-PUBLISHED` |
| shipping | **missing** | `LS8-SHIPPING-POLICY-PUBLISHED` |
| contact | **missing** | `LS8-CONTACT-PAGE-PUBLISHED` |
| how prescribing works | **missing** | `LS7-PRESCRIBING-PROCESS-DESCRIBED` |

## The single highest-leverage site change

One **"who does what" partner disclosure block** on `/why-wellpeps`, linked from the
footer, naming:

- **WellPeps** — legal entity; MSO; does not practise medicine, prescribe, compound,
  dispense or ship
- **the professional entity** — employs or contracts the prescribing physicians
- **GEN Health / Scriptful** — the platform, certified under LegitScript Enterprise
- **the dispensing pharmacy or pharmacies** — named, with the states each is licensed in

That one build produces evidence for Standards 1, 4, 7 and 8 simultaneously, and it is
what makes the enterprise certification legible to a reviewer instead of invisible.
It does **not** require the pharmacy addresses — only names and licensure — so it can
ship before B3 lands.
