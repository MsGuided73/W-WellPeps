# Pre-Launch Checklist

What must be done to take wellpeps.com from marketing-only to transacting.

Last updated: 2026-08-06 (when intake CTAs were disabled in `812afce`).

---

## 1. Re-enable the intake links (required)

All program CTAs currently resolve to the `#assessment-stub` anchor, which does
nothing when clicked. This was deliberate — backend testing against the live
intake platform finished and the links were disabled so no one could order
before launch.

### 1a. Restore the three per-program constants

**File:** `wellpeps-site/src/config.ts`

They currently read:

```ts
export const SEXUAL_ONBOARDING_URL = ONBOARDING_URL;
export const WEIGHT_ONBOARDING_URL = ONBOARDING_URL;
export const PEPTIDE_ONBOARDING_URL = ONBOARDING_URL;
```

Restore to:

```ts
export const SEXUAL_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNjg%3D';
export const WEIGHT_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNDQ%3D';
export const PEPTIDE_ONBOARDING_URL =
  'https://intake.wellpeps.com/intake?productId=UHJvZHVjdDoxNzg%3D';
```

Confirm the three `productId` values still match the current products in the
intake platform before trusting them — they were captured during testing and
could have changed since.

This one edit covers: Weight Loss / Sexual Wellness / Peptides product cards,
program heroes, bottom CTAs, the Sexual Wellness recommendation block, and the
Learning Center treatment inserts. They all read from these constants.

### 1b. Set the generic onboarding URL

Still a stub:

```ts
export const ONBOARDING_URL = '#assessment-stub';
```

This one drives the site-wide CTAs that aren't program-specific — nav bar
button, home page hero, Help-Find section, final CTA, Why WellPeps, the
Learning Center index, the assistant disclaimer, and both Hair Restoration
CTAs. Needs the real onboarding entry point.

If that destination supports per-program deep links, `assessmentUrl(slug)` in
the same file already builds them — it currently short-circuits while the value
starts with `#`.

### 1c. Turn off the Coming Soon gates

Three boolean flags in `config.ts` hold back programs that are not open yet.
Flip each to `false` at launch:

```ts
export const HAIR_COMING_SOON = true;         // whole Hair Restoration page
export const SEXUAL_HERO_COMING_SOON = true;  // Sexual Wellness hero CTA only
export const PEPTIDE_HERO_COMING_SOON = true; // Peptides hero CTA only
```

`HAIR_COMING_SOON` drives the announcement band under the hair hero, the
Coming Soon ribbon and disabled CTA on all four hair product cards, and the
hero / bottom CTA copy. The two `*_HERO_COMING_SOON` flags are narrower — they
replace only the hero button on their page.

> The hardcoded `'/#assessment-stub'` literals that used to sit in `hair.ts`
> were removed; those cards now import `ONBOARDING_URL` like every other
> program data file, so the config swap does reach them.

### 1d. Patient portal

```ts
export const PATIENT_PORTAL_URL = '#patient-portal-stub';
```

Powers the top-right "Patient Portal" nav button for existing patients. Needs
the real login URL. Opens in a new tab.

### 1e. Verify

```bash
cd wellpeps-site && npm run build
grep -rc "assessment-stub" dist/          # expect 0
grep -ro "intake.wellpeps.com" dist/ | wc -l   # expect > 0
```

Then click through one CTA per program on the built site and confirm each lands
on the correct product in the intake flow — the `productId` values are opaque
base64 and a wrong one fails silently by loading the wrong product.

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
