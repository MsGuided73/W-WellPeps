# WellPeps Decision Log

Append-only. Newest entry first. Each entry records what shipped, what changed
course (and what would have been built without the change), decisions that
confirmed the plan, and what is carried forward.

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
- Confirm WellPeps' GEN Health client model (Affiliate vs. Review + Prescribe);
  it decides whether WellPeps may take payment itself.
- Who maintains the per-product excluded-states overlay: WellPeps via API or
  the provider network in admin.
