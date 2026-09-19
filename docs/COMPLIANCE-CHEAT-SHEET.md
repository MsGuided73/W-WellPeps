# WellPeps Compliance Cheat Sheet

**Source:** PeptideJournal, "Are Peptides Legal? State-by-State Guide"
(https://www.peptidejournal.org/legal/are-peptides-legal-state-by-state-guide).
Published Nov 11, 2025, last updated Feb 2026.
**Compiled:** Sep 13, 2026. **Verified:** Sep 15, 2026 against primary sources
(FDA interim 503A category list dated May 14, 2026, DEA/Federal Register, PCAC
July 2026 outcome, state actions through Aug 2026). See § 12 for the log and the
next re-check dates. Items still marked ⚠ VERIFY are counsel questions, not facts.

> This is a working checklist distilled from a secondary source, not legal advice.
> Have counsel confirm before launch, especially anything in § 1 and § 8.

---

## 0. First decision: which business are you?

Everything below branches on this. Pick one and stay on that side of the line.

| Model | What it means | Legal path per the guide |
|---|---|---|
| **A. Research-use-only (RUO) storefront** | Sells synthetic peptides labeled for laboratory research | Legal only if the *entire* presentation is genuinely research-oriented. Any human-use signal converts the product to an unapproved drug. |
| **B. Prescription / telehealth / clinic** | Physician evaluates, prescribes, licensed pharmacy fills | Safest path. Only FDA-approved or Category 1 compoundable peptides. |
| **C. Supplement** | DSHEA dietary supplement | Only for collagen peptides and single amino acids. Synthetic peptides are *never* supplements. |

**Do not blend A and B.** A site that sells RUO vials and also publishes dosing
protocols, wellness benefits, or physician content is Model A wearing Model B's
clothes, and that is exactly the pattern the FDA and state AGs are targeting.

---

## 1. Product list: what you may and may not offer

### Tier 1: FDA-approved peptide drugs (Model B only, valid Rx required)
Semaglutide, tirzepatide, liraglutide, leuprolide, octreotide, tesamorelin, bremelanotide.

### Tier 2: 503A-compoundable without FDA approval (Model B only, licensed 503A pharmacy + Rx)
Two legal bases, verified Sep 15, 2026 against FDA's interim 503A category list (May 14, 2026):
- **Category 1 (under evaluation, interim enforcement discretion):** NAD+ (NAD and NADH), glutathione,
  methylcobalamin, acetyl-L-carnitine, vasoactive intestinal peptide, GHK-Cu **non-injectable routes only**
  (the injectable nomination was withdrawn April 22, 2026; PCAC review of GHK-Cu due by Feb 2027).
- **Not on the category lists; compounded on the basis of a prior FDA approval:** sermorelin (Geref,
  discontinued 2008 for manufacturing reasons; FDA determined in 2013 it was not withdrawn for safety or
  effectiveness) and gonadorelin (Factrel). Methylene blue (ProvayBlue), levocarnitine (Carnitor), and
  cyanocobalamin are components of currently approved drugs. Sermorelin's basis is the least settled of
  these; ⚠ VERIFY with the dispensing pharmacy and counsel that they rely on it and document why.

### Tier 3: NOT 503A-eligible today, NOT for human use (Model A only, true research)
BPC-157, TB-500, CJC-1295, ipamorelin, AOD-9604, Melanotan II, Selank, Semax, KPV, DSIP (emideltide),
Epitalon, MOTS-c, thymosin alpha-1, LL-37, DiHexa, PEG-MGF, GHRP-2, GHRP-6, injectable GHK-Cu.

Status change since Feb 2026, verified Sep 15, 2026: FDA removed 12 peptides from Category 2 effective
April 22, 2026 (nominations withdrawn), leaving Category 2 with only cesium chloride, domperidone,
germanium sesquioxide, ibutamoren, kisspeptin-10, and intrauterine quinacrine. **None of the removed
peptides were placed in Category 1.** They are unlisted, which means no enforcement discretion and no
503A basis to compound. PCAC voted July 23-24, 2026 to recommend BPC-157, KPV, TB-500 (8-6-1 each),
MOTS-c (7-5-2), Epitalon (7-4-1), and Semax (8-5-1) for the 503A bulks list and against emideltide
(6-7-1). Votes are advisory; FDA rulemaking is expected to run into 2027. GHRP-2 and GHRP-6 remain
Category 3. **The marketing rule does not change: none of these may appear as a WellPeps therapy,
benefit, or program until FDA finalizes a listing.**

- [ ] Every SKU is assigned a tier and the tier is recorded in the product master.
- [ ] Tier 3 items are never sold with human-use context (see § 3).
- [ ] Tier 1/2 items are never sold without a prescription workflow.
- [ ] No human growth hormone (somatropin). It has its own federal restriction, 21 U.S.C. 333(e).
- [ ] No growth hormone secretagogues marketed for sport (WADA-prohibited; see § 7).
- [x] Verified Sep 15, 2026: no DEA scheduling action on GHS peptides located. Ibutamoren (MK-677) is
      FDA Category 2, not DEA-scheduled. Re-check quarterly.
- [x] Verified Sep 15, 2026 against FDA list dated May 14, 2026 (saved at
      `docs/compliance/sources/FDA-503A-interim-categories-2026-05-14.pdf`). See Tier 2 and Tier 3 above.
      Re-check after FDA acts on the July 2026 PCAC votes and after the Feb 2027 PCAC meeting.

---

## 2. Federal floor (applies in every state)

| Regulator | What triggers it | Checklist |
|---|---|---|
| **FDA** | Marketing intent, not chemistry. Product is a drug if intended to treat, prevent, or diagnose. | [ ] No disease, treatment, or prevention claims anywhere on the site, ads, or emails. |
| **FDA** | Manufacturing or distributing drugs | [ ] FDA establishment registration if you manufacture or distribute (Model B). |
| **FDA** | API sourcing | [ ] APIs for any human-use product come from FDA-registered suppliers. RUO-labeled API never enters a human-use product. |
| **DEA** | Controlled substances | [ ] Confirm nothing in the catalog is scheduled. Most peptides are not. |
| **FTC** | Advertising claims | [ ] Every claim is substantiated. No "clinically proven," no "generic," no before/after. |
| **DSHEA** | Supplement labeling | [ ] Synthetic peptides are never labeled or categorized as supplements. |

---

## 3. The "Research Use Only" trap (Model A critical)

Per the guide, an RUO label gives **no protection** if the presentation targets human consumers. The FDA treats the following as evidence of human-use intent:

| Red flag | Site audit item |
|---|---|
| Dosing guides or protocols for humans | [ ] No mg/kg, no "cycle," no "inject subcutaneously," no reconstitution-for-injection instructions in consumer-facing content. |
| Syringes, bacteriostatic water, alcohol swabs sold alongside | [ ] Remove injection kits and bundles. Do not cross-sell them. |
| Before-and-after photos | [ ] None. Not in products, blog, reviews, or social embeds. |
| Health benefit language | [ ] No "healing," "recovery," "fat loss," "anti-aging," "muscle," "sleep," "libido," "cognition" in product copy, category names, tags, URLs, or meta descriptions. |
| Consumer-focused messaging | [ ] No testimonials describing personal use. Moderate or disable reviews. |
| Wellness/clinic branding | [ ] Site voice, imagery, and brand name read as laboratory supply, not wellness. |
| SEO | [ ] No pages targeting "BPC-157 for tendon healing" style queries. Blog content is research-literature summary only, and never links a benefit to a product. |
| Checkout | [ ] RUO attestation at checkout ("I am purchasing for in-vitro laboratory research; not for human or animal consumption"). |
| Labels | [ ] "For research use only. Not for human or veterinary use." on every label, product page, invoice, and packing slip. |

**Honest assessment from the guide:** enforcement against RUO sellers targeting consumers is rising (Connecticut 2025 shutdown and judgment, Alabama Nov 2025 TRO, 40+ AG letter to FDA). Model A is a shrinking gray area, not a safe harbor.

---

## 4. Model B requirements (prescription / telehealth)

- [ ] Licensed physician evaluation before every prescription. No "peptide mill" intake (state medical boards are auditing these).
- [ ] Documented standard-of-care assessment and informed consent per patient.
- [ ] Legitimate patient-provider relationship established (remote is fine in most states; New York has extra rules since May 2025).
- [ ] Non-controlled substances only via telehealth unless you also meet DEA telemedicine rules (fourth temporary extension confirmed Sep 15, 2026: DEA/HHS rule published Dec 31, 2025, Federal
  Register 2025-24123, flexibilities run through Dec 31, 2026; the Special Registration for Telemedicine
  final rule went to OIRA Aug 25, 2026 with final action expected Nov 2026, so expect new requirements with
  weeks of lead time; re-check Nov 2026).
- [ ] Fulfilment only through licensed 503A/503B pharmacies. Never compound in a clinic or medspa (Connecticut explicitly prohibited this for GLP-1s, May 2025).
- [ ] GLP-1 marketing: no "generic," no "clinically proven," no "same as" or implication that the compounded product equals the branded drug. Verified Sep 15, 2026: FDA issued 55+ warning letters Sept 16, 2025 (30 to telehealth firms) citing "sameness" claims and trademark use that obscured the compounding source; FDA press release Feb 2026 announcing action against non-approved GLP-1s; warning to 503B facilities April 1, 2026; April 30, 2026 proposal to remove semaglutide, tirzepatide, and liraglutide from the 503B bulks list (comments closed June 29, 2026, final determination pending). 503A patient-specific compounding is unaffected by the 503B proposal but must still meet the "essentially a copy" test with documented individual need; cost or preference is not enough.
- [ ] State licensing: physician licensed in the patient's state; pharmacy licensed to ship into the patient's state; wholesale distributor license where required.
- [ ] Prescription drug monitoring program check where controlled substances are involved (California CURES).

---

## 5. State-by-state matrix

Only 15 states are named in the guide. Treat unlisted states as "follows federal floor" until verified. Federal law is the floor; no state can loosen it.

| State | Tier | What the guide says | WellPeps action |
|---|---|---|---|
| **Florida** | Permissive | Follows federal compounding rules. Registration required for drug manufacturers/wholesale distributors handling peptides. Broad telemedicine for non-controlled. | [ ] Obtain FL manufacturer/distributor registration if shipping drugs into FL (Model B). |
| **Texas** | Permissive | Board of Pharmacy follows federal categories. No peptide-specific medical board rules or legislation. | [ ] Standard federal compliance. |
| **Nevada** | Permissive | Follows federal compounding rules. Low enforcement. | [ ] Standard federal compliance. |
| **Arizona** | Permissive | No board restrictions. Health-freedom laws give latitude. Low enforcement. | [ ] Standard federal compliance. |
| **Illinois** | Moderate | Federal guidelines. Active medical board wants thorough documentation. Joins multi-state actions. | [ ] Documentation standard raised to IL level for all patients (Model B). |
| **Colorado** | Moderate | Federal framework. Integrative-friendly but documentation required. | [ ] Same as Illinois. |
| **Ohio** | Moderate | Federal rules plus state inspection requirements. Board investigates individual cases. | [ ] Pharmacy partner must pass OH inspection. |
| **Pennsylvania** | Moderate | Federal framework plus state pharmacy licensing. **AG active on marketing claims.** | [ ] Marketing copy audit before targeting PA. |
| **Georgia** | Moderate | Federal categories. Enhanced compounding oversight post-NECC. | [ ] Pharmacy partner meets GA enhanced standards. |
| **New York** | Restrictive | Extra compounding inspections and QC. OPMC actively investigates unapproved-substance prescribing. **May 2025 telemedicine rules.** **April 2025: no sale of muscle-building or weight-loss products to under-18s.** High enforcement. | [ ] Age verification (18+) for NY orders on anything muscle/weight related. [ ] NY telehealth rules built into intake. [ ] Consider geo-blocking NY for Model A. |
| **California** | Restrictive | Strict Board of Pharmacy compounding standards. Medical Board investigates unapproved peptide prescribing. CURES check for controlled. Minor-access legislation on performance supplements. Strong consumer-protection law. | [ ] Age verification for CA. [ ] Pharmacy partner meets CA standards. [ ] Consumer-protection review of all copy (UCL/FAL exposure). |
| **Massachusetts** | Restrictive | Strictest sharps rules: no sharps in household trash. Among most restrictive pharmacy regs. High enforcement. | [ ] Sharps-disposal instructions included with any MA shipment containing injectables (Model B). [ ] Do not ship syringes to MA in Model A. |
| **Connecticut** | Restrictive | **2025: AG shut down a peptide seller and won a monetary judgment.** **May 2025: no GLP-1 compounding at clinics/medspas.** Very high enforcement. | [ ] Strongly consider geo-blocking CT for Model A. [ ] Model B: no clinic-side compounding. |
| **Alabama** | Restrictive | **Nov 2025: AG obtained TRO against an unapproved peptide seller, targeting online sellers.** High enforcement. | [ ] Strongly consider geo-blocking AL for Model A. |
| **Louisiana** | Restrictive | Extra compounding restrictions, stricter inspection and documentation. Moderate-to-high enforcement. | [ ] Pharmacy partner meets LA standards (Model B). |

**Practical geo rules for Model A:** block or heavily restrict CT, AL, NY, CA at minimum. The guide's enforcement examples are all AG consumer-protection actions, which do not need FDA involvement.

- [x] Verified Sep 15, 2026 (state matrix above stands; additions below):
      - NY GBL § 391-oo upheld by the Second Circuit in 2025 (*Council for Responsible Nutrition v. James*, 159 F.4th 155). Age gate for NY stays.
      - CA AB 2030 (under-18 OTC diet pill and muscle-building supplement ban) passed the Legislature Aug 27, 2026; governor action pending, deadline Sept 30, 2026. Treat CA as an age-gate state now; re-check Oct 1, 2026.
      - Bills only, not enacted as of the latest sources: CO, IL, MA, MI, MO, NJ, RI, WA, TX, VA, NH.
      - CA rewrote its compounding regulations effective Oct 1, 2025 (stricter "essentially a copy" test; COA must name the API manufacturer). Pharmacy partner must meet it for CA patients.
      - OH: July 2025 board guidance treats semaglutide and tirzepatide as no longer compoundable post-shortage, bans retatrutide and cagrilintide, and has summarily suspended 30+ clinics and med spas since early 2025.
      - Federal: April 1, 2026 indictment of a Utah osteopathic physician for selling misbranded peptides (tirzepatide, semaglutide, retatrutide, cagrilintide, BPC-157, TB-500, ipamorelin, CJC-1295, GHK-Cu, NAD+) to 200+ patients. Enforcement has moved from sellers to prescribers.
      - No new AG peptide actions in AL, CT, or PA located beyond those listed in § 5.

---

## 6. Age, sharps, and consumer-protection

- [ ] **Age gate:** 18+ verification for all orders. Required in NY for muscle/weight products; CA moving the same way. Simplest to apply nationally.
- [ ] **Sharps:** if any injectable ships (Model B), include state-appropriate disposal instructions. MA prohibits household-trash disposal.
- [ ] **Consumer protection:** state AGs use unfair-trade-practice statutes independently of FDA. Every marketing claim must be true, substantiated, and not misleading. This is the actual enforcement vector in 2025.

---

## 7. Sports and anti-doping (relevant to any athlete-facing copy)

| Peptide class | WADA status |
|---|---|
| Growth hormone secretagogues (CJC-1295, ipamorelin, GHRP-2, GHRP-6, MK-677) | Prohibited |
| TB-500 / thymosin beta-4 | Prohibited |
| EPO-mimetic peptides | Prohibited |
| BPC-157 | Varies by federation |
| GLP-1 agonists | Generally not prohibited |

- [ ] No athletic-performance marketing. It is both a human-use signal (§ 3) and an anti-doping liability.
- [ ] If you must mention sport, state that these substances may be prohibited by WADA, NCAA, IOC, and professional leagues.

---

## 8. Payments and platform (practical gatekeepers)

- [ ] **LegitScript:** research peptides marketed for human use are classified "not eligible." Model A sites that trip § 3 red flags lose processing. Model B needs LegitScript healthcare-merchant certification.
- [ ] Major card networks are restricting peptide merchants. Confirm your processor's written policy before launch.
- [ ] Ad platforms (Google, Meta) follow similar rules. Assume no paid ads for Tier 3 products.

---

## 9. Required site copy

Place on every page footer, product page, checkout, and label as applicable.

**Model A (RUO) footer:**
> All products are sold for in-vitro laboratory research use only. Not for human or veterinary use, diagnostic, or therapeutic purposes. Not evaluated by the FDA. By purchasing you affirm you are a qualified researcher purchasing for research purposes only.

**Model B (telehealth) footer:**
> This site does not provide medical advice. Prescriptions are issued only after evaluation by a licensed physician. Compounded medications are not FDA-approved and have not been evaluated for safety, efficacy, or quality. Availability varies by state.

**Both:**
> For educational purposes only. Not a substitute for advice from a licensed healthcare provider.

- [ ] Privacy policy covers health data (Model B: HIPAA; both: state privacy laws such as CCPA).
- [ ] Terms of service include RUO attestation (A) or telehealth consent (B).
- [ ] No disclaimer contradicts the rest of the page. A disclaimer under a dosing guide is worthless (§ 3).

---

## 10. Pre-launch and quarterly audit

**Pre-launch**
1. [ ] Business model locked (§ 0) and every SKU tiered (§ 1).
2. [ ] Full-site copy sweep for § 3 red flags, including image alt text, URLs, meta, tags, emails, and social.
3. [ ] Geo-restrictions configured (§ 5).
4. [ ] Age gate live (§ 6).
5. [ ] Licenses in hand for every state you ship into (§ 4, § 5).
6. [ ] Processor and LegitScript status confirmed in writing (§ 8).
7. [ ] Counsel sign-off.

**Quarterly**
1. [ ] Re-check FDA 503A bulks category list.
2. [ ] Re-check DEA scheduling actions.
3. [ ] Search state AG press releases for "peptide" (CT, AL, NY, CA, PA first).
4. [ ] Re-check minor-access laws by state.
5. [ ] Re-run copy sweep on anything published since last audit.
6. [ ] Confirm DEA telemedicine flexibilities status (current expiry Dec 31, 2026).

---

## 12. Verification log

| Date | Item | Result | Source | Re-check |
|---|---|---|---|---|
| 2026-09-15 | FDA 503A interim categories | NAD+, glutathione, methylcobalamin, acetyl-L-carnitine, VIP, non-injectable GHK-Cu in Category 1. Category 2 holds no peptides except kisspeptin-10 and ibutamoren. 12 peptides removed from Category 2 on April 22, 2026 are unlisted, not Category 1. GHRP-2/GHRP-6 Category 3. Sermorelin and gonadorelin not on any list. | FDA list "Updated May 14, 2026", `docs/compliance/sources/FDA-503A-interim-categories-2026-05-14.pdf` | After FDA acts on PCAC votes; Feb 2027 PCAC |
| 2026-09-15 | PCAC July 23-24, 2026 | Six of seven peptides recommended for 503A list; emideltide rejected. Advisory only; rulemaking into 2027. | FDA PCAC meeting page; McDermott Jul 27, 2026; Restore Health Aug 17, 2026 | Quarterly |
| 2026-09-15 | DEA scheduling of GHS peptides | None found. | Search of DEA and legal commentary | Quarterly |
| 2026-09-15 | DEA telemedicine flexibilities | Extended through Dec 31, 2026 (FR 2025-24123, Dec 31, 2025). Special-registration final rule at OIRA since Aug 25, 2026, expected Nov 2026. | DEA press release Dec 31, 2025; HHS; McDermott+; Telehealth.org | Nov 2026 |
| 2026-09-15 | FDA GLP-1 compounding | Sept 16, 2025 warning letters (55+, 30 telehealth); Feb 2026 press release; April 1, 2026 503B warning; April 30, 2026 proposal to drop sema/tirz/lira from 503B bulks list, comments closed June 29, 2026, final pending. | FDA warning letter 715883; Orrick May 1, 2026; AJMC; Pharmacy Times | On FDA final determination |
| 2026-09-15 | State minor-access laws | NY enacted and upheld (2d Cir. 2025). CA AB 2030 passed Aug 27, 2026, governor pending. Others bills only. | Holland & Knight Feb 2026; SupplySide; Nutraceuticals World | Oct 1, 2026 |
| 2026-09-15 | State enforcement since Feb 2026 | CA compounding regs Oct 1, 2025; OH 30+ suspensions; CT AG May 2025; Utah federal indictment April 1, 2026. Matrix in § 5 stands. | Sheppard Mullin Aug 10, 2026; Stevens & Lee | Quarterly |
| 2026-09-15 | NY self-attested DOB for supplement sales | Not verifiable from public sources; counsel question. | — | Counsel |

## Bottom line from the guide

The trend at every level is tighter enforcement. FDA-approved peptides with a prescription and Category 1 compounded peptides through licensed pharmacies are the only path the guide calls safe. RUO retail to consumers is a gray area that state AGs are now closing through consumer-protection law, and payment processors are closing it faster than the courts.

---

## 11. Selling supplements alongside telehealth (Model B)

**Answer: yes, legal. The constraint is what you say, not what you sell.**
Basis: DSHEA (21 U.S.C. 343(r)(6)), 21 CFR 101.93, 21 CFR Part 111, FTC Act § 5.
This section is not from the PeptideJournal guide; it is the general federal supplement framework. Counsel to confirm.

### Claim rules (21 CFR 101.93)

| Claim type | Allowed? | Example | Requirements |
|---|---|---|---|
| Disease claim, incl. treating or mitigating a drug's adverse events | **No** | "Reduces GLP-1 nausea", "replenishes B12 depleted by metformin", "prevents muscle loss on semaglutide" | Would make the product an unapproved drug |
| Structure/function | Yes | "Supports digestive comfort", "supports lean muscle maintenance" | Substantiation; FDA notification within 30 days of first use; mandatory disclaimer |
| Nutrient deficiency | Yes | "Helps prevent vitamin B12 deficiency" | Must state prevalence of the deficiency in the U.S.; still cannot attribute it to the drug |
| Health claim (disease risk reduction) | Avoid | "Reduces risk of osteoporosis" | Needs FDA-authorized claim language |

**Mandatory disclaimer on every structure/function claim:**
> These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.

**Physician exception:** an individualized recommendation by the prescribing physician inside a documented consult is the practice of medicine, not labeling. A site banner, automated "recommended for your prescription" module, or marketing email saying the same thing is labeling and a disease claim.

### Checklist

- [ ] Wellness Shop is a separate section, not inside the treatment or checkout flow.
- [ ] No drug names, "side effect", or "depletion" in supplement copy, tags, URLs, metadata, emails, or ads.
- [ ] Disclaimer on every product page and the shop footer.
- [ ] FDA structure/function notification filed within 30 days of each new claim.
- [ ] Physician recommendations live only in the clinical record and patient portal, authored by the clinician.
- [ ] Contract manufacturer is 21 CFR Part 111 compliant; COA on file per lot. Your brand on the label makes you the responsible manufacturer.
- [ ] Supplement Facts panel per 21 CFR 101.36; domestic address or phone on label for adverse event reports.
- [ ] Serious adverse event reporting process: report to FDA within 15 business days, retain records 6 years.
- [ ] Only pre-1994 ingredients (vitamins, minerals, electrolytes, fiber, protein); otherwise NDI notification 75 days before sale.
- [ ] No synthetic peptides in the shop. Collagen peptides and single amino acids only.
- [ ] FTC substantiation file for every claim; testimonials reflect typical results and disclose compensation.
- [ ] California Prop 65 review for every formula.
- [ ] Age handling: no front-door gate on wellpeps.com. Checkout, intake, and patient creation all run on Scriptful GEN Health hosted checkout, which requires name, email, phone, **DOB, and full address** to create a patient (GEN Health API v2, patient create). So DOB is already captured alongside the shipping address for every order, prescription or supplement. Confirm with Scriptful: (a) the intake form auto-rejects under-18 before provider review, and (b) any supplement SKU also routes through hosted checkout, not a separate cart. Use GEN Health per-product **excluded-states** (`/v2/client/products/:id/excluded-states`) to withhold weight-loss or muscle supplement SKUs from NY and CA if counsel wants a hard block rather than DOB-only. ⚠ VERIFY with counsel whether NY accepts self-attested DOB for online supplement sales.
- [ ] Supplement purchase is never a condition of the prescription; never bundled into treatment pricing; labeled optional.
- [ ] Financial interest in the shop disclosed to patients (AMA Code of Medical Ethics 9.6.4).
- [ ] Anti-kickback review if any federal healthcare program billing exists.
