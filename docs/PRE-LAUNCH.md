# Pre-Launch Checklist

What must be done to take wellpeps.com from marketing-only to transacting.

Last updated: 2026-09-16 (patient portal wired to the branded subdomain
portal.wellpeps.com; the four remaining Scriptful links are still stubbed).

---

## 1. Wire the Scriptful (GEN Health) links (required)

The telehealth backend is Scriptful's GEN Health platform. Every CTA on the
site reads from a single block at the top of `wellpeps-site/src/config.ts`.
The patient portal is wired. The other five are still placeholders
(`#scriptful-stub-*`) until the real links are pasted in. A placeholder can
never reach a visitor: every assessment button renders through
`AssessmentCta`, which shows a program as **Opening Soon** while its link is a
stub and sends generic buttons to the home page's program cards.

### 1a. Paste the links — this is the whole launch switch

**File:** `wellpeps-site/src/config.ts`, block headed `SCRIPTFUL CUTOVER`.

| Constant | Replace with | Drives |
| --- | --- | --- |
| `SCRIPTFUL_STOREFRONT_URL` | GEN Health storefront / generic assessment entry | Nav button, home hero, Help-Find, final CTA, Learning Center index, assistant disclaimer. Until set, these go to `/#programs` |
| ~~`SCRIPTFUL_PORTAL_URL`~~ | **Done** — `https://portal.wellpeps.com` | "Patient Portal" button in the nav and link in the footer (same tab) |
| `SCRIPTFUL_WEIGHT_PRODUCT_URL` | Weight Loss **Intake-first** link | Weight Loss cards, hero, bottom CTA, Learning Center inserts |
| `SCRIPTFUL_HAIR_PRODUCT_URL` | Hair Restoration **Intake-first** link | Hair cards, hero, bottom CTA — and the page's whole Coming Soon state (§1b) |
| `SCRIPTFUL_SEXUAL_PRODUCT_URL` | Sexual Wellness **Intake-first** link | Sexual Wellness cards, hero, bottom CTA, recommendation block |
| `SCRIPTFUL_HEALTHY_AGING_PRODUCT_URL` | Healthy Aging & Vitality **Intake-first** link | Healthy Aging cards, hero, bottom CTA |

Programs open **one at a time**: paste one link and that program goes live
everywhere it appears, while the others stay Opening Soon. Only `https://` URLs
count as linked.

Checkout links come from GEN Health: **/products → link icon on the row
("Checkout links for …")**. Each product offers three flows. **Use Intake-first
for every program** (decided 2026-09-19 — it is the flow that keeps "Free
Assessment" true; see `DECISION-LOG.md`):

| Flow | Patient experience |
| --- | --- |
| Product-first | Pays for the product, then onboarding and intake |
| Assessment-first | Intake and forms first, then pays for the visit only |
| Intake-first | Intake and forms first, then pays for the product |

Links are disabled until the product is **Active** and a real payment
processor is set at Settings → Payments. UTM tags can be appended to any
checkout URL and travel with the order, which is what Curve will want for
attribution. Guide: https://guides.genhealthehr.com/clients/settings-admin/connect-your-website

The portal login is the branded host itself, `https://portal.wellpeps.com` —
not `/login`. The GEN Health portal is a client-routed SPA, so every path
returns the same shell and only the JS router decides what renders; the bare
host sends a signed-out patient to the login view and a signed-in one to their
dashboard.

Our URL slug is **`wellpeps`**, so the shared-host fallback is
`https://app.genhealthehr.com/login?brand=wellpeps`. Same login, unbranded
domain — use it if the branded certificate stalls. Treat the slug as permanent:
any link already shared with `?brand=wellpeps` breaks if it is renamed.

### 1b. Coming Soon gates — nothing to flip

There are no launch flags. `SEXUAL_HERO_COMING_SOON` and
`PEPTIDE_HERO_COMING_SOON` were removed on 2026-09-19, and `HAIR_COMING_SOON`
is now computed from `SCRIPTFUL_HAIR_PRODUCT_URL`.

`HAIR_COMING_SOON` still drives the announcement band under the hair hero, the
Coming Soon ribbon on the hair product cards, and the pre-launch hero / bottom
CTA copy. **Do not paste the Hair link until hair pricing is real (see §2)** —
the link is what opens the page.

### 1c. Add the Curve tracking script

Paste the Curve snippet into the `<head>` of
`wellpeps-site/src/layouts/BaseLayout.astro`, after the font links. Marketing
site only — do not place it on GEN Health portal pages unless Curve confirms
that is intended, since those pages carry PHI.

### 1d. DNS cutover (Cloudflare) — done for the portal

The branded portal host is **portal.wellpeps.com** (root domains are not
supported by GEN Health). All three records GEN Health issued are live in
Cloudflare, resolving, and activated as of 2026-09-16; they are recorded in
`telehealth/portal.wellpeps.com-dns-records.json`:

| Type | Host | Points to |
| --- | --- | --- |
| CNAME | `portal` | `portals.gen-health.app` — **DNS only (grey cloud)** |
| TXT | `_gen-health.portal` | GEN Health domain-verification token |
| CNAME | `_acme-challenge.portal` | Google Certificate Manager validation target |

The portal CNAME must stay grey-cloud so Cloudflare's proxy does not intercept
certificate issuance. Paste each Host exactly as GEN Health shows it; Cloudflare
appends `.wellpeps.com` itself.

**TLS: active.** Google Trust Services issued the certificate at 17:51 UTC on
2026-09-16 — `CN=portal.wellpeps.com`, valid through 2026-12-15. HTTPS verifies
clean and the portal serves branded (`<title>WellPeps</title>`). The deploy gate
that was here is lifted: the Patient Portal button is safe to ship.

```bash
curl -sS -o /dev/null -w '%{http_code} ssl=%{ssl_verify_result}
' https://portal.wellpeps.com/
# 200 ssl=0  ✅
```

Renewal is automatic, but it depends on two things staying as they are: the
`_acme-challenge.portal` CNAME must not be removed, and the `portal` CNAME must
stay **DNS only (grey cloud)**. Proxying it later would break renewal.

**Email domain: done.** The **Email Domain** setting is Active — patient email
sends from `notifications@wellpeps.com` through Postmark, via a DKIM TXT record
(`20260916181147pm._domainkey`) and a return-path CNAME (`pm-bounces` →
`pm.mtasv.net`). Both verified live; values are in the JSON above.

Deliverability checks out: DKIM aligns to `wellpeps.com`, and SPF passes on the
`pm-bounces` return path, which carries Postmark's own SPF — so Postmark
deliberately does **not** need adding to the `wellpeps.com` SPF record (that one
stays Google Workspace only). DMARC is `p=none` (monitoring, reports to
hello@wellpeps.com); worth tightening to `quarantine` once reports look clean.

Guide: https://guides.genhealthehr.com/clients/getting-started/brand-your-portal

### 1e. Verify

```bash
cd wellpeps-site && npm run build
grep -rc "scriptful-stub" dist/            # expect 0 — always, even before links are pasted
```

That grep will stay non-zero until the four remaining links are filled in; the
portal stub is already gone. Confirm with:

```bash
grep -rc "scriptful-stub-portal" dist/     # expect 0 now
```

Then click through one CTA per program on the built site and confirm each lands
on the correct product in GEN Health, and that the Patient Portal button opens
the branded login page over valid HTTPS. Place one real test order end to end per program before
announcing launch.

---

## 2. Adjacent items that are also unwired

Not strictly link-related, but they will be visibly broken at launch.

- ~~**Signup forms discard input**~~ — **Done.** All three (hair notify,
  waitlist, footer newsletter) now POST to the `notify-signup` Supabase Edge
  Function, which writes `public.notify_signups`. See "Signup capture" below.
- **Signups are not in a mailing list.** The table is your own record; it does
  not send anything. Wiring an ESP (and its unsubscribe handling) is still to
  do — export from `notify_signups` or have the Edge Function forward on.
- **Hair pricing placeholder** — `src/data/hair.ts`. "Advanced Liposomal
  Formulas" pricing is a placeholder (`XX`), not real. Do not launch showing a
  fake price.
- **Google Fonts** — `src/layouts/BaseLayout.astro` (~line 29) loads fonts from
  a third-party origin. Self-hosting removes the external request; worth doing
  but not launch-blocking.

---

## 3. Signup capture (how it works)

The site is a static build with no server of its own, so forms cannot write to
Postgres directly. They POST to a Supabase Edge Function instead.

```
browser  ──POST {email, source}──▶  notify-signup  ──service role──▶  notify_signups
                                    (Edge Function)                   RLS on, no policies
```

- **Table:** `public.notify_signups` — `email`, `source`, `first_name`,
  `created_at`. Unique on `(email, source)`, so a repeat submit is a no-op and
  the same person can appear once per form. RLS is enabled with **no policies**,
  so the table is unreachable from any browser; only the function's service role
  can touch it.
- **Function:** `notify-signup`, JWT verification off (visitors have no session).
  Guards instead: origin allowlist, honeypot field, strict validation,
  idempotent upsert.
- **Client:** `src/lib/notify.ts`, shared by all three forms.
- **No new build env vars.** The endpoint is a public URL, not a credential —
  Coolify needs nothing added.

Reading signups: `select * from notify_signups order by created_at desc;`

> The origin allowlist in the function is `wellpeps.com`, `www.wellpeps.com`,
> and localhost. **If the site ever moves domain, add it there or every signup
> starts failing with a 403.**

## 4. Deployment

`main` auto-deploys via Coolify (Docker/nginx, root-context `Dockerfile`, Node
22). Anything under `wellpeps-site/` triggers a rebuild; files outside it (e.g.
`telehealth/`, `docs/`) do not.
