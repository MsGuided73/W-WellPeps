# WellPeps Decision Log

Append-only. Newest entry first. Each entry records what shipped, what changed
course (and what would have been built without the change), decisions that
confirmed the plan, and what is carried forward.

---

## 2026-09-19 — wellpeps.com ↔ GEN Health integration architecture

Full plan: `docs/genhealth/INTEGRATION-PLAN.md`. It supersedes the plan drafted
by the browser extension on 2026-09-19, which was written without repo access.

### Decisions
- **Handoff: WellPeps handoff sheet → Intake-first checkout link. No iframe.**
  *First call, same day:* embed GEN's flow in an iframe inside a WellPeps sheet.
  *Reversed after reading* `docs/GenHealth Guide/` *("Put checkout on your own
  website"):* the embed hands over "only the payment step", and the flow
  "travels in the URL" of a checkout link. Under Intake-first the visitor is
  already on the portal when payment arrives, so an embed adds risk (our own
  `Permissions-Policy: camera=()`, GEN's staged `frame-ancestors`, iOS Safari)
  for no visible gain. The app feel comes from the handoff sheet, portal
  continuity settings, and a live catalog instead. Revisit only if the flow
  ever becomes Product-first, and then via `mountGenHealthCheckout`, not a
  hand-rolled iframe. No storefront key is needed for this plan.
- **Flow: Intake-first on every CTA.** Keeps "Free Assessment" literally true and
  avoids a buy-before-evaluation pattern. The extension plan's
  "Purchase → medication info → pay" sequence is not being built; medication
  info becomes an informational quick-view, and the CTA stays
  "Start Free Assessment".
- **Server-side piece: Supabase Edge Functions** (webhooks, order-state
  verification, non-PHI order status only). The marketing site stays a static
  nginx build with no Node runtime.

### Shipped (uncommitted at time of writing)
- **One assessment button.** `src/components/AssessmentCta.astro` +
  `src/lib/cta.ts` replace ~30 hand-written CTAs across nav, heroes, product
  cards, bottom CTAs, the Learning Center and the assistant. One label —
  "Start Free Assessment" — where there were eight variants.
- **Links are the launch switch.** A program is open when its link in
  `config.ts` is https on a trusted host (`src/lib/links.ts`) and "Opening
  Soon" otherwise, so programs go live one at a time. Removed
  `SEXUAL_HERO_COMING_SOON`, `PEPTIDE_HERO_COMING_SOON`, `ONBOARDING_URL`, the
  `*_ONBOARDING_URL` exports and `assessmentUrl()`; `HAIR_COMING_SOON` is now
  derived. A pasted link on http or an untrusted host **fails the build**.
- Hair Restoration gained its own link constant (it had been borrowing the
  generic storefront URL). `SCRIPTFUL_PEPTIDE_PRODUCT_URL` →
  `SCRIPTFUL_HEALTHY_AGING_PRODUCT_URL`.
- Generic CTAs go to `/#programs` until a storefront link exists. `dist/` now
  contains zero `scriptful-stub` hrefs at all times, not only after cutover.
- Patient Portal opens in the same tab and is also linked from the footer.
- Added vitest (`npm test`, 21 tests) and `npm run typecheck`. Deleted unused
  `ProductCardPills.astro` and `SexProductCard.astro`.
- **Visible pre-launch change:** Weight Loss, Sexual Wellness and Healthy Aging
  product cards and bottom CTAs used to show a live-looking button that went
  nowhere; they now show "Opening Soon" until their link is pasted.

- **First live link (local only):** GEN product "Oral Semaglutide
  (Low-Dose/Tablets)" → the Oral Semaglutide card, Intake-first. Verified the
  link opens a WellPeps-branded intake on `portal.wellpeps.com` whose first
  screen is "Patient Demographics & Vitals" — no payment up front.
- **GEN products are treatments, not programs** (confirmed by Dana: that product
  holds four tablet strengths; the provider picks). So links are per product
  card (`PRODUCT_LINKS` in `config.ts`, keyed by slugged card name). A program's
  hero / bottom buttons have no single GEN link; once any of its treatments is
  open they go to that program's treatment cards. The step-2 handoff sheet
  should replace that with an in-sheet treatment picker.

### Course changes
- **No custom intake UI on wellpeps.com.**
  *Extension plan was:* collect patient details on the site and call
  `POST /v2/client/patients` / `POST /v2/client/orders`.
  *Now:* GEN's hosted intake does this inside the iframe.
  *Without this change:* PHI on the marketing site, a backend we do not run,
  and HIPAA scope for the hosting stack — the same reason the DOB field was
  dropped on 2026-09-13.

### Discoveries
- `portal.wellpeps.com` sends **no `X-Frame-Options`** and its CSP is
  **report-only** with `frame-ancestors 'self'` (checked 2026-09-19). Framing a
  raw checkout link works today but GEN is visibly staging an enforcing policy
  that would break it. **Embed only through GEN's documented embed/session
  path, never by framing a copied checkout link.**
- Because the portal is on `portal.wellpeps.com`, an iframe on `wellpeps.com` is
  **same-site**: session cookies are not third-party, so Safari ITP and Chrome's
  third-party-cookie limits do not apply. This is a concrete reason to keep the
  branded host rather than `app.genhealthehr.com`.
- The catalog API returns `checkoutLinks` (product-first / intake-first /
  assessment-first) per product, so link values can be pulled at build time
  rather than hand-copied into `config.ts`.
- Affiliate status, listed as open in the extension plan, was already resolved
  2026-09-18: Review + Prescribe, non-affiliate.

### Carried forward
- Launch needs only active, priced products and four Intake-first links pasted
  into `src/config.ts`. The API key is needed later, for the build-time catalog
  and the webhook function — not for launch.
- Phase 1 blockers unchanged: 0 API keys, 0 of 64 products storefront-visible,
  webhooks unset.
- The platform guide in `docs/GenHealth Guide/` is the first place to look for
  any GEN Health question; it was missed on the first pass of this plan.

---

## 2026-09-13 — Compliance cheat sheet; DOB-at-checkout question resolved

### Shipped
- `docs/COMPLIANCE-CHEAT-SHEET.md` — compliance checklist distilled from the
  PeptideJournal state-by-state guide (published Nov 2025, updated Feb 2026),
  plus a § 11 on selling supplements alongside telehealth. Uncommitted at time
  of writing.

### Course changes
- **DOB field at checkout: not building it on wellpeps.com.**
  *Plan was:* add a DOB field to the shipping-address component so NY and CA
  minor-access rules could be enforced at point of sale.
  *Now:* no change to the site. Checkout, intake, shipping address, and patient
  creation all run on Scriptful's GEN Health hosted checkout, and GEN Health
  already requires DOB and full address to create a patient. Adding DOB on the
  marketing site would pull PHI back into scope for no gain.
  *Instead:* (a) get written confirmation from Scriptful that intake
  auto-rejects under-18 before provider review; (b) use GEN Health
  per-product excluded-states to withhold weight-loss/muscle SKUs from NY and
  CA if counsel wants a hard block.
  *Without this change:* a redundant PHI-collecting form on a site whose whole
  architecture depends on never touching PHI.

### Decisions that confirmed the plan
- Supplements may be sold alongside telehealth, but only with structure/function
  claims. Never tie a supplement to a prescribed drug's side effects or nutrient
  depletion in marketing; that is a disease claim under 21 CFR 101.93. The
  physician may make that connection inside a documented consult.
- No front-door age gate. Intake DOB + under-18 auto-reject + provider review is
  the same pattern the major GLP-1 telehealth services use.

### Discoveries
- `LaunchPad - BYOS Client Onboarding Guide (1).pdf` (root) is **OpenLoop's**
  product documentation, dated June 2026. It is obsolete since the Scriptful
  move and should not be used for setup. Scriptful's platform is GEN Health;
  its client guide is summarized in `Scriptful/getting-started.md` and the API
  in `telehealth/genhealth-api-report.docx`.
- The repo root is `C:\dev\W`, not `wellpeps-site/`. Docs belong in
  `C:\dev\W\docs\`.

### Corrections
- The cheat sheet was first written into the SherlockHealth repo by mistake
  (working directory of the session). Moved. **Rule:** WellPeps artifacts never
  go in SherlockHealth; check `git rev-parse --show-toplevel` before writing.

### Open, carried forward
- Counsel: does NY accept self-attested DOB for online sales of weight-loss or
  muscle-building supplements, or is more required?
- Scriptful: written confirmation of under-18 auto-reject at intake, and that any
  supplement SKU routes through hosted checkout rather than a separate cart.
- Cheat sheet items marked ⚠ VERIFY (FDA 503A category list, DEA scheduling,
  DEA telemedicine flexibilities expiring 2026-12-31, new state minor-access
  laws) are as of Feb 2026 and need a refresh before launch.

---

## 2026-09-11 — Telehealth and pharmacy network moved from OpenLoop to Scriptful

### Shipped
- Commit `4acb9bc` — "refactor: move telehealth backend from OpenLoop to
  Scriptful (GEN Health)". Files: `wellpeps-site/src/config.ts`,
  `wellpeps-site/README.md`, `wellpeps-site/astro.config.mjs`,
  `docs/PRE-LAUNCH.md`, `telehealth/README.md`; deleted
  `telehealth/intake.wellpeps.com-dns-records.json`.
- OpenLoop DNS records (A, SendGrid CNAMEs, MX, ACME challenge) removed from
  Cloudflare on 2026-09-11. They must not be re-added.

### Course changes
- **Telehealth services and pharmacy network: OpenLoop → Scriptful.**
  *Plan was:* OpenLoop LaunchPad as the intake, provider, and pharmacy backend,
  with `intake.wellpeps.com` pointed at OpenLoop and per-program OpenLoop
  product IDs wired into `config.ts`.
  *Now:* Scriptful's GEN Health platform is the telehealth backend (storefront,
  intake, provider review, prescriptions, patient portal). Clinical services
  come from Scriptful's linked provider network under the Network Access
  Agreement; pharmacy routing goes through OnlyScripts within GEN Health.
  Contract terms are in `Scriptful/Addendum_WellPeps_OSI_Scriptful.docx`.
  `config.ts` carries five `SCRIPTFUL_*` placeholders so the launch cutover is
  a single edit; the OpenLoop product IDs were deleted, not commented out.
  *Why:* cost and availability. OpenLoop was more expensive and could not
  reliably provide the service coverage WellPeps needed; Scriptful could, at a
  lower cost. Recorded 2026-09-13 from the founder's account; the commit
  message itself does not state the reason.
  *Without this change:* the site would still deep-link to OpenLoop product
  IDs and Cloudflare would still carry OpenLoop records, so any launch would
  have sent patients to a vendor WellPeps no longer uses.

### Decisions that confirmed the plan
- wellpeps.com stays a static Astro marketing layer that never handles PHI.
  Every CTA links out to the telehealth backend. The vendor changed; the
  architecture did not.
- Recommended integration path per `telehealth/genhealth-api-report.docx`:
  GEN-hosted or embedded checkout (~15 endpoints plus webhooks), not the
  server-to-server custom path, until conversion data justifies otherwise.

### Open, carried forward
- Replace the `SCRIPTFUL_*` placeholders in `config.ts` with real GEN Health
  links; pick one checkout flow (product-first / assessment-first /
  intake-first) and use it for all programs. See `docs/PRE-LAUNCH.md` § 1.
- Record the custom-domain DNS records Scriptful supplies as
  `telehealth/intake.wellpeps.com-dns-records.json`.
- ~~Confirm WellPeps' GEN Health client model~~ — **Resolved 2026-09-18:
  Review + Prescribe (`gfe_prescribe`).** WellPeps takes patient payments through
  its own processor; the provider network's acts only as fallback. The processor
  grid is therefore visible and the new **Stripe** account can be connected —
  on Affiliate it would have been hidden entirely.
  *Note:* the "Review Only" in `telehealth/genhealth-api-report.docx` was read
  from the **Pep Rite** tenant, not WellPeps. WellPeps has its own tenant as of
  2026-09-18, so every tenant-specific fact in that report (client model, API
  key, storefront key, webhook URL, feature flags) must be re-read from the
  WellPeps dashboard. The platform-level documentation in
  `docs/GenHealth Guide/` remains current — the live guides still read
  "Last updated August 24, 2026".
- Being non-affiliate, WellPeps is **eligible** for `features.apiOrders`, which
  gates vault-charge billing. Eligible is not enabled; only GEN Health can turn
  it on. This decides how the monthly membership is billed — see below.
- Who maintains the per-product excluded-states overlay: WellPeps via API or
  the provider network in admin.

### Opened 2026-09-18 — the membership model

WellPeps will charge a **$49–$79/month membership** (per
`docs/pricing/PRICING-ARCHITECTURE-MEMO-2026-09-17.md`) selling 24/7 portal
access, a channel to reach a doctor, and low-cost labs passed through at cost.
Three things about that are unresolved and each can block launch:

- **GEN Health may have no native membership object.** The platform guide says
  *"There is none. Subscriptions are a per-product switch, not a separate
  manager."* Our API review found `/v2/client/subscriptions` with
  `billingMode: invoice | vault_charge` and claims plans can be made in the admin
  UI. Those conflict. `vault_charge` needs `features.apiOrders`, which only GEN
  Health can enable. If `invoice` mode works it may sidestep that gate.
- **"Patients can message providers directly" is off by default** and is set by
  the *provider network*, not WellPeps. With it off, members reach the WellPeps
  care team rather than a doctor — a different product from the one sold. The
  client-side switch **"Allow messaging without an order"** matters just as much:
  a member who has not yet ordered medication cannot message without it.
- **Labs "at cost" are not at cost.** The lab editor's Cost field is a breakdown
  — the guide's example is *"$0.00 lab + $20.00 processing"* — and warns *"Keep
  Patient total higher than Cost or every order loses you money."* The pricing
  memo models labs as zero-margin-impact (`lab_glp = 0`), which does not account
  for a per-order GEN Health processing fee. Quantify it before publishing lab
  prices. Labs are also blocked entirely until an account payment method is on
  file, and held orders result if that fee goes unpaid.

Data request covering all of the above: `docs/genhealth/DASHBOARD-DATA-REQUEST.md`.
