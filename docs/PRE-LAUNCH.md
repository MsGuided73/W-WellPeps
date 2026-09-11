# Pre-Launch Checklist

What must be done to take wellpeps.com from marketing-only to transacting.

Last updated: 2026-09-11 (backend moved from OpenLoop to Scriptful / GEN Health;
all OpenLoop links and DNS retired).

---

## 1. Wire the Scriptful (GEN Health) links (required)

The telehealth backend is Scriptful's GEN Health platform. Every CTA on the
site reads from a single block at the top of `wellpeps-site/src/config.ts`.
All five links are placeholders (`#scriptful-stub-*`) until Scriptful provides
the real ones, so no CTA can start an order before launch.

### 1a. Fill in the five placeholders

**File:** `wellpeps-site/src/config.ts`, block headed `SCRIPTFUL CUTOVER`.

| Constant | Replace with | Drives |
| --- | --- | --- |
| `SCRIPTFUL_STOREFRONT_URL` | GEN Health storefront / generic assessment entry | Nav button, home hero, Help-Find, final CTA, Why WellPeps, Learning Center index, assistant disclaimer, both Hair CTAs |
| `SCRIPTFUL_PORTAL_URL` | GEN Health patient portal login | Top-right "Patient Portal" nav button (new tab) |
| `SCRIPTFUL_WEIGHT_PRODUCT_URL` | Weight Loss product link from `/products` | Weight Loss cards, hero, bottom CTA, Learning Center inserts |
| `SCRIPTFUL_SEXUAL_PRODUCT_URL` | Sexual Wellness product link | Sexual Wellness cards, hero, bottom CTA, recommendation block |
| `SCRIPTFUL_PEPTIDE_PRODUCT_URL` | Peptides product link | Peptides cards, hero, bottom CTA |

Checkout links come from GEN Health: **/products → link icon on the row
("Checkout links for …")**. Each product offers three flows; pick one and use
it consistently:

| Flow | Patient experience |
| --- | --- |
| Product-first | Pays for the product, then onboarding and intake |
| Assessment-first | Intake and forms first, then pays for the visit only |
| Intake-first | Intake and forms first, then pays for the product |

Links are disabled until the product is **Active** and a real payment
processor is set at Settings → Payments. UTM tags can be appended to any
checkout URL and travel with the order, which is what Curve will want for
attribution. Guide: https://guides.genhealthehr.com/clients/settings-admin/connect-your-website

The portal login is `https://<custom-subdomain>/login`, or the GEN Health shared
host with `/login?brand=<slug>` until the custom domain is verified.

### 1b. Turn off the Coming Soon gates

Three boolean flags in `config.ts` hold back programs that are not open yet.
Flip each to `false` at launch:

```ts
export const HAIR_COMING_SOON = true;         // whole Hair Restoration page
export const SEXUAL_HERO_COMING_SOON = true;  // Sexual Wellness hero CTA only
export const PEPTIDE_HERO_COMING_SOON = true; // Peptides hero CTA only
```

`HAIR_COMING_SOON` drives the announcement band under the hair hero, the
Coming Soon ribbon and disabled CTA on all four hair product cards, and the
hero / bottom CTA copy. Keep it `true` until hair pricing is real (see §2).
The two `*_HERO_COMING_SOON` flags are narrower — they replace only the hero
button on their page.

### 1c. Add the Curve tracking script

Paste the Curve snippet into the `<head>` of
`wellpeps-site/src/layouts/BaseLayout.astro`, after the font links. Marketing
site only — do not place it on GEN Health portal pages unless Curve confirms
that is intended, since those pages carry PHI.

### 1d. DNS cutover (Cloudflare)

In GEN Health → Settings → Branding, enter the subdomain (root domains are not
supported). It generates three records to add in Cloudflare: a **CNAME** for
the portal host, a **TXT** for verification, and a **certificate** CNAME for
SSL. Paste each Host exactly as shown; Cloudflare appends `.wellpeps.com`.
Set the portal CNAME to **DNS only (grey cloud)** so GEN Health's certificate
issuance is not intercepted by the Cloudflare proxy. Remove every legacy
record for that hostname in the same change, then use **Check DNS** in GEN
Health; verification usually completes within 20 minutes of propagation.

Optional: the separate **Email Domain** setting lets patient emails send from
`@wellpeps.com` via a DKIM TXT record and a return-path CNAME.

Save the final record list to `telehealth/intake.wellpeps.com-dns-records.json`.
Guide: https://guides.genhealthehr.com/clients/getting-started/brand-your-portal

### 1e. Verify

```bash
cd wellpeps-site && npm run build
grep -rc "scriptful-stub" dist/            # expect 0
```

Then click through one CTA per program on the built site and confirm each lands
on the correct product in GEN Health, and that the Patient Portal button opens
the login page. Place one real test order end to end per program before
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
