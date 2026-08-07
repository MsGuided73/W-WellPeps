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

### 1c. Fix the hardcoded Hair Restoration links (easy to miss)

**File:** `wellpeps-site/src/data/hair.ts`, lines ~98, 111, 129, 148

These four product cards hardcode the string `'/#assessment-stub'` instead of
importing the constant:

```ts
href: '/#assessment-stub',
```

**Updating `ONBOARDING_URL` will NOT fix these.** They will stay dead until
changed directly. Recommended fix is to make them consistent with the other
program data files — import the constant rather than repeating a literal:

```ts
import { ONBOARDING_URL } from '../config';
// ...
href: ONBOARDING_URL,
```

(`weight.ts`, `sexual.ts`, and `peptide.ts` already do it this way.)

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

- **Waitlist form** — `src/components/sections/WaitlistSection.astro`. The form
  confirms inline but posts nowhere; submissions are discarded. Needs the
  `action`/handler wired to the real notification list (ESP). See the TODOs at
  lines ~35 and ~124.
- **Footer newsletter signup** — `src/components/Footer.astro` (~line 84). Same
  situation: collects an email, does nothing with it.
- **Hair pricing placeholder** — `src/data/hair.ts`. "Advanced Liposomal
  Formulas" pricing is a placeholder (`XX`), not real. Do not launch showing a
  fake price.
- **Google Fonts** — `src/layouts/BaseLayout.astro` (~line 29) loads fonts from
  a third-party origin. Self-hosting removes the external request; worth doing
  but not launch-blocking.

---

## 3. Deployment

`main` auto-deploys via Coolify (Docker/nginx, root-context `Dockerfile`, Node
22). Anything under `wellpeps-site/` triggers a rebuild; files outside it (e.g.
`telehealth/`, `docs/`) do not.
