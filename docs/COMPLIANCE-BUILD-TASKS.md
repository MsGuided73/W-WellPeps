# WellPeps Website: Compliance Build Tasks

Prepared 2026-10-01 for the web team. This is the work needed on the site, the checkout and the hosting to complete the compliance side. It lists what is **done**, what is **ready** (the web team can start now), and what is **blocked** (waiting on a decision, a document or a partner answer). Document IDs (A1, B4, C3 ...) refer to the draft legal documents and the placement guide kept with the legal drafts; those files are not in this repository.

Status: **Done** | **Ready** | **Blocked** (waiting on a decision or an outside party) | **Counsel** (needs a lawyer before it can ship).

## 1. Done

| Item | Notes |
|---|---|
| Privacy choices control | Panel opened from the footer on any page, a full /your-privacy-choices page, a first-visit bar above the menu, and the rules behind them (every optional tool starts off; a Global Privacy Control signal turns advertising off and cannot be undone by Accept all; advertising never runs on health-topic pages; any failure means everything off). |
| Choice is applied automatically | Each switch takes effect the moment it is flipped: tools start or stop in the same visit, their cookies are removed, other tabs follow, and the panel text is written from what is really running. |
| Tool registry | Empty in production on purpose, so no analytics or advertising tool loads today. Session-replay and heatmap tools are rejected by the build. |
| Privacy request form | Works with an email fallback until its server function is deployed. |
| Tests | 258 unit tests, a 54-check browser script, an 11-check production-build script and a banner-placement check at six window sizes. |
| Checkout lock (pre-launch) | Assessment buttons ask for an access password before showing an encrypted checkout link. Turn off at launch. |
| Footer mockup | Seven required legal links, built as a development-only mockup (not yet the live footer). |
| Terms of Use payment section | Updated after the deposit was removed; refund rule still a placeholder. |

## 2. Ready: the web team can start now

| # | Task | Why | Docs |
|---|---|---|---|
| W1 | ~~Adopt the new footer (legal row plus "Patient Information" column) in the live footer and add the pages it links to~~ **Done 2026-10-01.** The live footer is now the compliance footer: seven-link legal row, Patient Information column, approved-draft disclosure, no HIPAA badge or "All 50 States", current year. A link to a page that is not built is hidden, so it never shows a dead link. Re-check with `node scripts/footer-check.mjs drafts` (dev) or `nodrafts` (plain build) | Required links on every page: privacy policy, consumer health data policy, cookie notice, terms, notice of privacy practices, accessibility, "Your Privacy Choices" | A1-A8, A13 |
| W2 | **Built as drafts 2026-10-01; waiting on counsel.** All 25 document drafts (A1 to A17, B1 to B8) are in the site as noindex DRAFT pages with colour-coded open items, plus `/legal-review` (index for counsel), `/patient-information`, `/contact` and `/states-we-serve`. They exist only in dev and in a deployment built with `SHOW_DRAFT_PAGES=true` (set it as a Build-time variable on the client preview); a normal build omits them and the footer hides their links. To publish one, set `approved: true` in `src/lib/legal-docs.ts` and replace its JSON with the approved text. Re-check with `node scripts/legal-pages-check.mjs` | Pages exist today: privacy policy, terms, notice of privacy practices, accessibility, your privacy choices. Text arrives from counsel-reviewed drafts | A2-A17, B5, B8 |
| W3 | ~~Self-host the fonts (Lora and Inter), then set `FONTS_SELF_HOSTED` to true~~ **Done 2026-10-01.** Inter and Lora are served from this site (`src/styles/fonts.css`, Latin subsets, SIL OFL licence); the flag is true and a test fails if any file loads Google Fonts. Re-check with `node scripts/fonts-check.mjs` | Today Google receives each visitor's IP address. The panel says so while the flag is false, and a test fails if the flag and the layout disagree | A2, A4 |
| W4 | Add security headers in nginx: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; fix the HTTP to HTTPS redirect | Production has none of these today | C-series security |
| W5 | Write and deploy three Supabase functions: consent log, privacy request, anonymous analytics event (each with its migration), then switch on the matching flags in `config.ts` | The control saves choices in the browser only until the consent-log function exists; the request form falls back to email until the request function exists. Nothing deployed without owner approval | A5, C8 |
| W6 | Build the anonymous, opt-in analytics tool (page views, click targets, scroll depth and drop-off, no cookies, no storage, no identifiers, no IP kept) and add it to the registry | Designed; counsel approval pending for use on health pages. The first-visit bar then appears | A4, A2 |
| W7 | Update the Cookie Notice tool table and the Privacy Policy when any tool is added; bump `NOTICE_VERSION` | A test fails if the notice list and the registry disagree | A4, A2 |
| W8 | Fix the existing site claims that contradict the documents: "HIPAA Compliant" badge, "All 50 States", "FDA-registered", "FDA-approved treatments", Healthy Aging benefit claims, "Physician & Pharmacy Founded" | Deceptive-claim exposure; list is in the placement guide, section 6 | Section 6 |
| W9 | Add consumer-health-data consent text and policy links to the eBook dialogs, waitlists and footer newsletter | Health-topic email signups need separate consent in Washington and Nevada | A3, A2 |
| W10 | Product cards on every program page: "prescription required" line, compounded or off-label tag with a "What compounded means" link, price with "renews monthly, cancel anytime" and refund link, "Important safety information" link | One change in the shared product card covers every program | A8-A10, A14-A17, B5 |
| W11 | AI disclosure banner and link on the assistant chat | Required disclosure for AI chat in several states | A12 |
| W12 | Run the claims and disclosure scan (LegitScript audit skill) on every release and keep it green | Catches missing disclosures and banned claims before deploy | all |
| W13 | Accessibility audit to WCAG 2.2 AA: keyboard, focus, contrast, reduced motion, screen reader pass on the privacy panel, forms and menus | Accessibility statement promises it | A7 |
| W14 | ~~Fix sideways scrolling at 900 to 1400 px windows (header buttons overflow)~~ **Fixed 2026-10-01.** Cause was the header row, not the privacy notice. Menu button below 1440 px, Patient Portal shrinks to an icon from 1440 to 1699 px, plus the home page "Every WellPeps Program Includes" heading. Re-check with `node scripts/header-overflow-check.mjs` | Found while testing the banner; present without the banner too | A7 |
| W15 | Gate "States We Serve" and the checkout location check from the 50-state readiness matrix | Never list a state until every gate is yes | A13 |
| W16 | Make the repository private, or move the legal and partner material out of it | The GitHub repository is public | all |
| W17 | At launch: set `CHECKOUT_LOCKED` to false, remove the lock files, deploy | Lock is for pre-launch review only | n/a |

## 3. Blocked: waiting on a decision or an outside party

| # | Task | Waiting on |
|---|---|---|
| X1 | Refund rule when the provider does not prescribe, and the matching checkout and Terms wording | Company decision (fact sheet item I1); decides whether "Free Health Assessment" stays |
| X2 | Notice of Privacy Practices and the privacy-role decision | Counsel on the HIPAA role; the practice's own notice |
| X3 | Naming the medical practice anywhere on the site | The practice's signed written consent (contract section 20) |
| X4 | GEN Health checkout: form order, conditional acknowledgments by product, custom text and a required checkbox at the pay button, edited emails | Platform answers to the capability questions (partner request list, Scriptful sheet) |
| X5 | Pharmacy and state lists on the site | Signed, enabled pharmacy roster with licenses (partner request list) |
| X6 | Merchant of record, billing descriptor, price statement | Company decisions (fact sheet F1-F3) |
| X7 | Text messaging terms and consent | Decision on whether marketing texts are used at all |
| X8 | Publication of every legal page | Counsel review of all drafts (attorney issues list); medical director confirmation of clinical statements |

## 4. Order of attack

1. W16 (repository) and W4 (headers): quick and independent.
2. W1, W2, W9, W10: pages and links, as drafts clear counsel.
3. W3, W5, W6, W7: fonts, server functions, analytics, notice updates.
4. W8, W11-W15: claims, AI banner, scans, accessibility, state gating.
5. X1-X8 as the decisions and answers arrive; W17 on launch day.
