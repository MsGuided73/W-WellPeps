# WellPeps Brand Design System — v2 (MASTER-Guide Aligned)

> **Status:** This version **supersedes v1** for all website work.
> Where the earlier written brand docs (fonts guide, color guide, design
> system v1) disagree with the **MASTER Guide** (`WellPeps Home Page Guide
> By Section 7-2`), the **MASTER Guide wins** — per client direction.
> v1 is preserved for reference; this file is the source of truth going forward.
>
> The live implementation of every token below is in
> `wellpeps-site/src/styles/tokens.css`. Keep the two in sync.

---

## 0. What changed from v1 → v2 (the overrides)

| Area | v1 (written docs) | v2 (MASTER Guide — authoritative) |
| :-- | :-- | :-- |
| **Headline typeface** | Plus Jakarta Sans (sans) | **Editorial serif** (Lora) for all section & content-card titles |
| **Headline color** | Headline Blue `#153B73` | **Logo Navy `#082B59`** (darker, more premium) |
| **Primary / working blue** | `#1565C0` (muted) | `#0B5CEF` royal blue — **superseded, see below** |
| **Accent words in headlines** | (n/a) | Same working blue (e.g. "Simplified.", "WellPeps", "Come First") |

Everything else from v1 (backgrounds, gold usage, spacing philosophy,
iconography intent) carries forward unchanged.

> **Later revision (client-approved, July 2026):** the royal/electric blue
> `#0B5CEF` was replaced site-wide by **`#0077BE`** across CTAs, links, icons
> and accent words. `#0B5CEF` is retired — do not reintroduce it. The current
> value is authoritative in `wellpeps-site/src/styles/tokens.css` (`--blue`).

---

## 1. Typography (OVERRIDE)

**Pairing:** Editorial serif headings + Inter UI/body.

| Role | Font | Weight | Notes |
| :-- | :-- | :-- | :-- |
| H1 / Hero | **Lora** | 700 | Serif. Navy. Accent word in vivid blue. |
| H2 / Section titles | **Lora** | 700 | Serif. Navy. |
| H3 / Card titles | **Lora** | 600 | Serif. Navy. |
| Program card tagline | **Lora** *italic* | 500 | Working blue (`#0077BE`), e.g. "Feel Your Best". |
| Sub-headline / eyebrow line | Inter | 400–500 | Muted body color, sits under the serif title. |
| Body | **Inter** | 400 | `#4B5C73`, 17px base, line-height ~1.65. |
| Buttons / nav / labels / FAQ toggles* | Inter | 600 | (*FAQ question text itself is serif to match the guide.) |

> **Why serif?** The MASTER Guide and the client Design Note push a
> "magazine, not brochure" feel. Lora delivers that editorial character,
> is screen-optimized, and pairs cleanly with Inter. It is a Google Font
> and a drop-in swap if a different serif is preferred (e.g. Source Serif 4,
> Newsreader, PT Serif) — change one token (`--font-serif`).

**Fluid scale (implemented as clamp tokens):** Hero `44→80px`,
H2 `34→56px`, H3 `21→26px`, lead `17→21px`, body `17px`, small `15px`.

---

## 2. Color

### Brand
| Token | Hex | Usage |
| :-- | :-- | :-- |
| Logo Navy | `#082B59` | Headlines, nav wordmark, footer, premium elements |
| **Working Blue** | `#0077BE` | **Primary CTAs, links, active states, accent words** |
| Working Blue (hover) | `#005E96` | Button/link hover |
| Deep Navy (CTA bands) | `#082B59` → `#061F42` | Bottom-of-page CTA buttons only |
| Sky Accent | `#2EA8F7` | Icon fills on dark, subtle highlights |
| Gold Accent | `#D8A53A` | Footer newsletter button, thin dividers — **sparingly** |

### Surfaces
| Token | Hex | Usage |
| :-- | :-- | :-- |
| White | `#FFFFFF` | Primary page background, cards |
| Light Gray | `#F7F9FC` | Alternating sections |
| Soft Wellness Blue | `#EAF5FF` | Tinted sections, trust bars, icon medallions |
| Hero tint | `#F4F9FF` | Hero / final-CTA gradient end |
| Footer navy | `#082B59 → #061F42` | Footer gradient |

### Text
| Token | Hex | Usage |
| :-- | :-- | :-- |
| Heading | `#082B59` | H1–H4 |
| Body | `#4B5C73` | Paragraphs |
| Muted | `#7A8899` | Captions, footnotes |

### Status
Success `#2E7D32` · Warning `#F9A825` · Error `#D32F2F`

---

## 3. Components (as built on the Home Page)

- **Buttons** — Primary: solid `#0077BE`, white text, soft blue shadow, lift on
  hover. Secondary: white with 2px `#0077BE` border, inverts on hover.
  Radius 10px. Bottom-of-page CTA bands use navy `#082B59` instead — heroes and
  in-page section CTAs keep the working blue.
- **Pill link** (card CTA) — "Explore Program →" on a soft-blue pill; fills blue
  on hover, arrow nudges right. Muted variant for "Notify Me" (coming-soon).
- **Cards** — White, 1px `#E6ECF4` border, 16px radius, soft shadow; lift +
  deepen shadow on hover. Images `object-fit: cover`, subtle zoom on hover.
- **Icon medallion** — 72px soft-blue circle behind a 34px outline icon
  (`stroke: currentColor`, ~1.75px). Icons are a self-contained inline set.
- **Trust bars** — Soft-wellness-blue or white rails with shield/lock/badge icons.
- **FAQ** — Serif question, `+` that rotates to `×`, CSS-grid height animation.

### Section rhythm (Design Note)
Generous vertical spacing (`--space-section: 72→136px`), alternating
white / `#F7F9FC` / `#EAF5FF` backgrounds so the eye rests between sections.

---

## 4. Motion & principles
- Animate `transform`, `opacity` only. Reveal-on-scroll via IntersectionObserver.
- Honor `prefers-reduced-motion`.
- Generous white space; navy reserved for text/footer, never large dark panels
  mid-page; gold stays minimal; rounded corners + soft shadows throughout.
- Aesthetic target: premium consumer wellness (Hims × Willow × Wellmedr) —
  "Apple, not hospital."

---

## 5. How the remaining sub-pages should consume this
The Home Page build (`wellpeps-site/`) is the reference implementation:
- Import `src/styles/global.css` (which imports `tokens.css`).
- Reuse `NavBar`, `Footer`, `Icon`, `.btn`, `.card`, `.pill-link`, `.medallion`,
  `.section-head`, and the section-background utilities.
- Program/treatment pages follow the same card + trust-bar + journey grammar.
