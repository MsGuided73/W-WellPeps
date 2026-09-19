# wellpeps.com ↔ GEN Health integration plan

Revised 2026-09-19 (second pass, after reading the platform guide). Supersedes
the plan drafted by the browser extension the same day, which was written
without access to this repo. Decisions are recorded in `DECISION-LOG.md`
(2026-09-19); account-side setup is tracked in `DASHBOARD-DATA-REQUEST.md`.

**Read first:** `docs/GenHealth Guide/` — chapters *Put checkout on your own
website* and *Settings — Developers*. They answer most integration questions
without needing the live API docs.

## Decisions

| Question | Decision |
| --- | --- |
| How visitors enter GEN Health | **Intake-first checkout link**, launched from a WellPeps handoff sheet. No iframe at launch |
| Which GEN flow | **Intake-first**, on every CTA |
| Where server-side code lives | **Supabase Edge Functions**; the site stays static |
| Custom intake UI on wellpeps.com | **No** — it would put PHI on the marketing site |
| "Purchase" buttons | **No** — CTA stays "Start Free Assessment" |

### Why no iframe

The guide describes the embed as handing "only the payment step" to GEN, and
says the checkout flow "travels in the URL" of a checkout link. Under
Intake-first the visitor does intake on the portal and pays at the end of that
same flow — by the time there is a payment step to embed, they are already on
`portal.wellpeps.com`. The embed suits Product-first storefronts, which we ruled
out on compliance grounds.

It would also have cost us: `nginx.conf` sends
`Permissions-Policy: camera=(), microphone=()`, which blocks ID/selfie capture
and video visits inside any frame on wellpeps.com; the portal is staging an
enforcing `frame-ancestors 'self'` CSP; and nested payment iframes are where iOS
Safari misbehaves.

Revisit only if the flow ever changes to Product-first. If so, use the SDK
(`mountGenHealthCheckout` — client id, `clientProductId`, storefront key,
`onSuccess` / `onContinue`) rather than a hand-rolled iframe. Events:
`gen.checkout.ready`, `.resize`, `.success`, `.error`, `.continue`. Theme
parameters: `accentColor`, `backgroundColor`, `textColor`, `borderRadius`,
`logoMode`.

## Who owns what

| | wellpeps.com | GEN Health (`portal.wellpeps.com`) | Supabase |
| --- | --- | --- | --- |
| Product cards, medication quick-view | renders, from build-time catalog data | source of truth | — |
| Handoff sheet | owns | — | — |
| Intake, forms, ID upload, scheduling, payment | never sees it | owns | — |
| PHI | **none, ever** | all of it | **none** — order id + status only |
| Webhooks, order-state record | — | sends | receives |

The only identifier the site handles is a `clientProductId`.

## Where the "high-end app" feel comes from

Three places, none of which is an iframe.

**1. The handoff (wellpeps.com).** Every "Start Free Assessment" button opens a
full-viewport sheet — bottom sheet on mobile, centred panel on desktop — with
the program name, the three steps ahead (answer a few questions · a licensed
provider reviews · pay only if prescribed — wording subject to compliance
review and to what the flow really does), and one primary button that goes to
the Intake-first link. The sheet frames the move to the portal as the next
screen of one product rather than a jump to another site. The button's plain
`href` is the same link, so it works with JavaScript off.

**2. Continuity (GEN dashboard — no code).** The portal is already on our
domain with our logo, favicon and sending address. Remaining work:

- Fix the navy (`#012576` → `#082B59`) and check every colour field
  (`DASHBOARD-DATA-REQUEST.md` §7)
- `/settings/patient-experience` → **Portal layout**: navigation style, border
  style, layout width — pick the set closest to wellpeps.com
- **Dashboard sections**: GEN allows custom titled blocks with our own HTML on
  the patient home screen — use one for a WellPeps welcome / next-steps block
- Sidebar: Messages, Labs, Prescriptions, Orders visible
- Checkout order set to intake first; public checkout disclaimer reviewed

**3. The catalog (wellpeps.com).** Cards read live names, prices and images from
GEN at build time, so the site and the portal never disagree. A quick-view
drawer carries medication information as *information*, not a gate before
payment. Astro View Transitions carry the product image from card to drawer.

Accessibility is part of done: focus trap, `Esc` to close, focus restored to
the launching button, `prefers-reduced-motion` honoured.

## Constraints found in the repo

1. **The site has no server.** Static Astro served by nginx
   (`wellpeps-site/Dockerfile`). Anything needing `X-API-Key` runs at **build
   time** — the pattern `src/lib/blog.ts` already uses for Supabase — with the
   key as a Coolify build arg. It never reaches the browser bundle.
2. **Same-site.** `wellpeps.com` → `portal.wellpeps.com` stays within one
   registrable domain. Keep the branded host; do not link to
   `app.genhealthehr.com`.
3. **UTM tags** appended to a checkout link are carried through with the order
   (per the guide). Preserve the visitor's UTMs on the handoff link — non-PHI
   attribution for free.

## Phases

### Phase 1 — GEN account setup (blocking; Dana + Natalie)

As of 2026-09-19: 0 API keys, 0 of 64 products storefront-visible, webhooks
unset.

- [ ] Client record confirmed separate from "Pep Rite", linked to OSI
- [ ] Stripe connected with **test** keys (never the `None` tile — hosted
      checkout does not support it)
- [ ] Sandbox mode on, via the provider network
- [ ] Launch products **Active**, priced, imaged, formulary-paired
- [ ] Assessment price confirmed per product (must make "Free" true)
- [ ] Portal continuity items above
- [ ] `X-API-Key` created → Coolify build arg + Supabase secret. Never committed,
      never pasted into chat
- [ ] Storefront key: **not needed** for this plan

Launch needs only the first six. The API key unlocks Phase 3.

### Phase 2 — Handoff sheet + links (site; can start now)

- `AssessmentSheet.astro` + a small client script, no framework dependency.
- CTAs keep their `href`; the script upgrades the click and appends UTMs.
- Until real links exist the sheet runs against the current `#scriptful-stub-*`
  values, and the `*_COMING_SOON` flags keep gated programs gated.
- Going live = pasting four Intake-first links into `src/config.ts`.

### Phase 3 — Catalog at build time (site; needs API key)

- `src/lib/genhealth.ts`: `GET /v2/client/products?view=formulary`, validate the
  response, fail the build loudly on a bad response, fall back to hand-written
  data only when the key is absent (local dev).
- Read each product's `checkoutLinks` intake-first URL — this replaces the
  hand-pasted constants from Phase 2.
- Rebuild trigger: scheduled Coolify deploy webhook (daily is enough).

### Phase 4 — Webhooks (Supabase Edge Function)

- Verify GEN's signature; upsert `{orderId, status, updatedAt}` into a table
  with RLS on and no public policies. **No patient fields.**
- Subscribe to `order.status_updated`, `visit.completed`, `prescription.sent`.
  Prove delivery with the dashboard's **Send ping**.
- For attribution and ops alerts. Nothing patient-facing depends on it.

### Phase 5 — Test and launch

- End-to-end order, Stripe test keys, sandbox on: desktop Chrome, iOS Safari,
  Android Chrome.
- Compliance pass on sheet and quick-view copy (`wellpeps-compliance-review`).
- Launch day: Stripe live keys, confirm GEN re-registered the Stripe webhook,
  sandbox off at the agreed time, flip the `*_COMING_SOON` flags.

## Open questions

1. Does the Intake-first link resolve on `portal.wellpeps.com` or a GEN shared
   host? If shared, test swapping the hostname (`DASHBOARD-DATA-REQUEST.md` §4c).
2. Does the catalog carry enough medication detail for a compliant quick-view,
   or is a second source needed? Check one real product record.
3. Membership ($49 → $79) is unresolved on the GEN side
   (`DASHBOARD-DATA-REQUEST.md` §6) and out of scope here until it is.
