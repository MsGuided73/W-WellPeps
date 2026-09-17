# WellPeps Smart Patient Guide — build pipeline and playbook

Single source of truth for producing the Smart Patient Guide eBooks. The GLP-1 guide (`eBooks/glp-1_ebook-v10.pdf`,
built 2026-09-16) is the reference book and the template for every other guide. Read this whole file before
building another book.

## 1. Current state (2026-09-16)

- **Live:** GLP-1 Weight Loss, v10. Outline `outlines/glp-1-weight-loss.json`, config `config/glp-1-weight-loss-v5.json`,
  HTML `html/glp-1-v10.html`, PDF `pdf/glp-1-v10.pdf`, copied to `eBooks/glp-1_ebook-v10.pdf`. 18 pages: cover,
  sections 00–13, CTA (15), disclaimer.
- **Draft for review:** Sexual Wellness, v2 (built 2026-09-16 from Derek's `eBooks/Manuscripts/sexual-wellness_revised-final.docx`,
  which replaced the first pasted manuscript wholesale: new cover subtitle, new page order, no Before You Decide page).
  Outline `outlines/sexual-wellness.json`, config `config/sexual-wellness.json`, PDF `eBooks/sexual-wellness_ebook-v2.pdf`
  (v1 is in `_archive/`). 18 pages: cover, 00–14, CTA (15), disclaimer. Per Derek's note, 04 is the three-option page
  (profile cards: name, tagline, description, text-only because the website product photos show combination products)
  and 13 is the GLP-1 checklist layout with seven items. Photos are borrowed from the site and limited to couples, men
  alone or product shots (Derek's rule for this guide: no female-only images): the cover is `sexual/hero-couple.webp`
  (1114px, soft at full bleed), 02 the coastal couple, 11 the couple opening a WellPeps box, 12 the man outdoors from
  the peptide page. Layout notes: the Why page runs `dense` (eight cards plus a two-sentence founder intro); 06 and 07
  carry no photo (any figure was dropped by the paginator); the disclaimer stepped its type down to fit four legal
  paragraphs plus the series list; on 04 the middle card is much taller than its neighbours because the tadalafil copy
  is three times longer. CTA button now "Start Your Free Assessment" per the manuscript, matching the series.
- **Draft for review:** Hair Restoration, v2 (built 2026-09-16 evening from Derek's "HAIR RESTORATION - Final Text.docx",
  filed in `eBooks/9-16-26/`, plus his revised page 14 from `eBooks/Manuscripts/hair-restoration-revised.docx`: new
  kicker "A BETTER APPROACH TO CARE", founder-story intro, eight reworded cards). Outline `outlines/hair-restoration.json`,
  config `config/hair-restoration.json`, PDF `eBooks/hair-restoration_ebook-v2.pdf`. Derek generated the page 04
  Finasteride product photo (`wellpeps-site/public/images/hair/product-finasteride.png`); Minoxidil and "other options"
  photos are still to come, then page 04 gets image cards. v1 is in `_archive/`.
  18 pages: cover, 00–14, CTA (15), disclaimer; no Before You Decide page
  (the manuscript has none). Every photo is borrowed from `wellpeps-site/public/images/hair/` plus the shared
  `doctor-assessment`, `insight-hair`, `program-hair` and `journey-3`; the cover is `hair/hero-couple.webp`. Derek's
  production notes asked for scalp-pattern illustrations on 02 (rendered as two rows of three cards under Men / Women
  until art exists), medication cards on 04 (text-only: the website product photos all show combination products
  the copy does not name, and were cropped at the top; needs photos of plain minoxidil, finasteride 1 mg and the
  other options), a visual Oral vs. Topical on 07
  (the neutral two-column block) and a horizontal timeline on 10 (four cards in one row). Deviations to raise with
  Derek: the off-label sentence on 04 moved out of the third card into a body line so the three image cards stay
  level; 02 and 11 run `dense`; 11 has no photo (any figure pushed it to a second sheet); the disclaimer stepped its
  type down to 10.5pt to fit five legal paragraphs (GLP-1 has three); the topical-finasteride FDA caution on 05 is a
  RED FLAG box, which Derek asked to keep prominent. The Why page also runs `dense` after Derek's longer page 14 copy.
- **Draft for review:** Healthy Aging & Vitality, v1 (built 2026-09-16 night from Derek's
  `eBooks/Manuscripts/healthy-aging-and-vitality_final.docx`). Outline `outlines/healthy-aging-vitality.json`, config
  `config/healthy-aging-vitality.json`, PDF `eBooks/healthy-aging-vitality_ebook-v1.pdf`. 18 pages: cover, 00–14, CTA (15),
  disclaimer; no Before You Decide page. The manuscript has no images, so every photo is borrowed: cover `hormone/couple.webp`
  (814px, soft at full bleed; `peptide/hero.webp` was tried first but its two hikers are too far apart for a portrait crop
  and the man was sliced at the edge), 00 `peptide/photo-nad.webp`, 04 `hero-couple-coast.webp`, 06 `peptide/photo-sermorelin.webp`,
  07 `peptide/photo-lipoc.webp`, 09 `peptide/photo-methylene.webp`, 11 `doctor-assessment.webp`, 12 `journey-4.webp`,
  CTA `peptide/cta-couple.webp`. Page 05 is the six-therapy profile page, text-only (the `peptide/vial-*.webp` product
  shots do carry matching labels, but they are portrait and the NAD+ vial sits on a black background; Derek can decide);
  09 carries the serotonin-syndrome caution as a RED FLAG box; 12 renders the care pathway as a flow above the Approach
  box. On 04 the figure enters after the six goal cards (`image_after: 3`): floated beside the lead it left a dead white block, because the card grid clears the float. 01 and 14 run `dense`; the disclaimer stepped its type down the full four steps (the manuscript's seven legal
  paragraphs were merged into four without dropping a word). Deviations to raise with Derek: the CTA panel holds the
  two-line headline plus one paragraph, so the manuscript's closing imperatives ("Stay active. Protect your strength. ...")
  and the "make them part of a thoughtful, provider-guided plan" line are not on the CTA page; the 05 vial photos; the
  merged disclaimer paragraphs.
- **Manuscript waiting:** `eBooks/Manuscripts/nad-guide_final.docx` (2026-09-16 evening), not yet built. Start from section 6.
- **Archived:** every earlier GLP-1 version and the old NAD+, Peptides, Sexual Wellness and Healthy Aging guides are in
  `eBooks/_archive/`. Their content is being rewritten; new manuscripts arrive one at a time. Do not rebuild from the
  archived outlines.
- **Derek's original template** (PPTX + PDF) is in `eBooks/GLP-1 Final Template/` for reference only.
- **Open decisions with Derek:** page 06 headline ("Why Might These Be Included?" — alternatives offered:
  "A Medical Decision, Not a Menu Choice" and others); whether to keep the drafted FDA-approved page at 07.

## 2. Pipeline

```
manuscript .docx  --parse_docs.py-->  outlines/<book>.json     (structure: sections + elements)
                                      config/<book>.json        (kickers, photos, cover, CTA, per-page options)
outline + config  --render_html.py-> html/<book>.html          (self-paginating page)
html              --make_pdf.mjs---> pdf/<book>.pdf            (Chromium via Playwright, print media)
pdf               --render_sheet.py-> qa/<book>/sheet.jpg      (contact sheet)
html              --page_fit.mjs----> which pages tightened / split (run this on every build)
```

**One command does all of it** (render, print, layout check, PDF checks, banned-phrase scan, contact sheet, copy to
`eBooks/<slug>_ebook-vN.pdf`), from this directory:

```bash
uv run --with pymupdf --with pillow python build_book.py outlines/<book>.json config/<book>.json --version N
```

It prints a BUILD REPORT and exits 1 on any FAIL: a page overflowed or split onto a CONTINUED page, Lora/Inter did not
load, a fallback font (Arial etc.) is embedded in the PDF, more than one luminosity soft mask (section 4), no
extractable text, or a banned phrase (section 5). WARNs do not block: orphan words (a one-word last line in a headline,
lead, card title, checklist title or box), and figures the paginator dropped. `--no-copy` skips the copy to `eBooks/`,
`--no-sheet` skips the contact sheet. `layout_check.mjs` is the browser-side half of it (JSON), usable on its own.

The individual steps, if you need one on its own:

```bash
uv run --with pillow python render_html.py outlines/<book>.json config/<book>.json html/<book>.html
node make_pdf.mjs html/<book>.html pdf/<book>.pdf        # reports OVERFLOW if a page still does not fit
node page_fit.mjs html/<book>.html                       # per-page: default | spacious | tight+compact+tighter | CONTINUED
node measure_split.mjs html/<book>.html <num>            # for a split section: free space vs. what the continuation needs
uv run --with pymupdf --with pillow python render_sheet.py pdf/<book>.pdf qa/<book> 40
```

`make_pdf.mjs` uses the Playwright install under `wellpeps-site/node_modules`. `parse_docs.py` was written for the
first-round manuscripts; for GLP-1 the outline JSON was hand-built and is the source of truth. Expect to hand-check
any parsed outline against the element kinds in section 5.

## 3. Design system (theme `editorial-v5`)

Every visual decision lives in the `CSS` string in `render_html.py`, scoped under `.theme-editorial-v4` (base) and
`.theme-editorial-v5` (kicker band). Config: `"theme": "editorial-v5"`, `"cover_style": "editorial"`,
`"shadows": "blur"` (default). Do not create per-book styling.

- **Colour.** Royal blue `#1576C4` and navy `#1C2961`, sampled from the cover logo (`wellpeps-site/public/images/logo-full-v2.png`),
  which is also the logo used on the CTA page. Accent sky `#2EA8F7` for the short rule only. Page ground `#FAFCFD`.
  Body ink `#33475A`, hairline `#D3DFEA`, card edge `#C6D9EA`. The cover shade gradient uses the same navy.
- **Type.** Lora 600 for headlines (31pt, stepping to 27/24 when long), the checklist item titles, the Why page tag, the
  CTA headline and closing stack. Inter for everything else: lead 15.5pt/500 navy, body 11.5pt/1.55, box labels 12pt
  tracked caps, box body 14pt (Insight/Question) and 13.5pt (Approach). Inter and Lora are bundled under `eBooks/_assets/fonts/` (woff2 subsets from Google Fonts, listed in
  `manifest.json`) and embedded in the HTML as data URIs, so no network is needed at render or print time. If the
  bundle is missing the renderer warns and falls back to the Google Fonts import.
- **Kicker.** Full-width navy band, `.52in` from the top, `.62in` tall, bold white Inter 16pt (14pt if the text is long).
  No page-number square. This is Derek's original treatment and he prefers it.
- **Running head / footer.** Running head "SMART PATIENT GUIDE TO <TOPIC>" in muted tracked caps. Footer carries only
  the page number at the right; the "WELLPEPS / SMART PATIENT GUIDE" label was removed. Footer rule is `#EEF3F7`,
  barely visible on purpose.
- **Numbering.** Page 00 is the intro ("Before You Start"); topics count from 01. This is intentional.
- **Cards and boxes.** White, 1px `--edge` border, 8px radius, lifted (see section 4). Card text is left-aligned and
  top-aligned (Derek's preference, 2026-09-16; cards were centred before). Image cards: image slot at
  `card_image_ratio` (default 9:5, centre-cropped; set `4/3` for the website product shots so caps are not cut off),
  equal padding. A product photo goes on a card only when its label matches the card copy: the hair product shots
  are all combination products, so Hair 04 runs text-only cards until dedicated photography exists. Five text cards render 3 across + 2 wider (`.cards.five`).
  Insight/Question box: white with a blue left bar and the reader icon. Approach box: navy with sky label.
  Callout label is **SMART PATIENT INSIGHT** (never "Principle") or **SMART PATIENT QUESTION**.
- **Figures.** Section photo floats right; `image_after` says how many text blocks run full width before it enters;
  `image_min_w` lets the paginator shrink it stepwise instead of dropping it. Hero pages: two photos inset to the text
  column with a gap, rounded, lifted. Never crop a person at the frame edge (set `focus`).
- **Balanced headings.** Headlines, leads, subtitles, emphasis lines and the Why tag use `text-wrap: balance`.
  `glue()` keeps "Weight Loss/Management" and hyphenated terms like "peptide-1" on one line. A `\n` in a lead or
  emphasis paragraph forces a line break. On a page with no figure, balanced half-lines can read as a missing photo;
  `full_width_head: true` in the page config lets the headline and lead wrap edge to edge instead (Hair 02).
- **Per-page options in config:** `kicker`, `image` + `image_w`/`image_h`/`focus`, `image_after`, `image_min_w`,
  `hero` (list of photos), `headline_icon`, `kicker` also works on the `why` page (default WHY WE CREATED WELLPEPS), `dense` (one type step down on a long page), `lead_small` (13pt lead,
  used only to hold a long lead to two lines), for `decide`: `image`, `focus`, and for `cta`: `kicker`, `image`,
  `focus`, `button`. `config/_template.json` documents every option; copy it to start a new config.
- **Per-element options in the outline:** `list` takes `cols` (1 or 2) to override the column heuristic; `cards` takes
  `cols` too (the Hair Restoration timeline is four cards in one row); a `redflag` (or callout/approach) with
  `"inline": true` stays in the text flow instead of joining the bottom stack. Red-flag lines that are short and have
  no full stop render as bold labels. `twocol` defaults to good (✓ blue) vs bad (✕ red); `"style": "neutral"` renders
  two equal blue columns with bullets for comparisons where neither side is wrong (oral vs topical).
- **Glyphs.** The bundled Inter subset has no U+2192 arrow; the `flow` arrow is an inline SVG for that reason (the
  fallback-font check caught it as Arial). Bullets (•), check (✓) and cross (✕) are fine.
- **Disclaimer page.** The legal text sits in a fixed slot above the series list. When a manuscript's legal block is
  longer than GLP-1's three paragraphs, the page steps its type down (13 → 12 → 11.5 → 11 → 10.5pt) until it clears;
  the build report prints how many steps it took, and FAILs if it still overlaps.

## 4. Rendering constraint (Apple Preview) — do not regress this

Blurred or semi-transparent `box-shadow` / `filter: drop-shadow()` values become luminosity soft masks in the Chromium
PDF. Apple Preview (PDFKit) renders those as grey translucent boxes. Screen styles keep the blurred lift, but the
`@media print` block at the end of `CSS` (Playwright's `page.pdf()` uses print media) replaces every shadow with the
hard opaque offset `2px 3px 0 #d9dee7`, hides the tile pseudo-elements and disables filters. Shadows are never applied
directly to an `img`; hero photos are wrapped in `span.hph`. Card backgrounds stay opaque; no `opacity` on containers.

Verify every build: luminosity soft masks must be 0 on interior pages (the cover shade gradient is the one remaining
transparency object, on page 1 only), the only images with SMask are the alpha PNGs (icon, logos), and text must still
extract. A check snippet:

```python
import pymupdf, re
d = pymupdf.open('pdf/<book>.pdf'); lum = 0
for i in range(d.xref_length()):
    try: s = d.xref_object(i, compressed=False)
    except Exception: continue
    if re.search(r'/S\s*/Luminosity', s): lum += 1
print('luminosity soft masks:', lum)   # expect 1 (cover)
```

`"shadows": "tile"` is an alternative (opaque 9-slice image behind each box); it rendered badly on the Insight/Approach
boxes in Preview and is not used.

## 5. Copy rules (apply to every guide)

- Lab tests are **offered**, never "included". Mention at-home lab kits alongside Quest Diagnostics and Labcorp.
- No "Care Coaching" anywhere; say **ongoing support** or **continued support**. Page 00 Approach reads
  "Healthcare is more than medication. GLP-1 patients deserve continued support." Page 01: "...review by medical
  providers and continued support, with lab tests offered as needed."
- Pricing copy never says "if prescribed" (kept only on page 03 where it is a clinical statement).
- Price grid: eight cards (Medication, Provider care, Ongoing support, Medical reviews, Providers in 50 states,
  U.S.A. pharmacies, No separate member fee, Easy cancel policy). Header forced to two lines:
  "Make sure you choose a provider that offers comprehensive care / for one all-inclusive price."
- Checklist item 05 asks whether the provider will say if the medication is FDA-approved or compounded.
- Author notes addressed to the designer are dropped from outlines.

Element kinds the template renders: `lead`, `body`, `emph` (supports `\n`), `quote`, `subhead` (title + desc), `list`
("Name — description" items get a bold lead-in), `cards` (title/desc/image; 5 → 3+2 layout), `flow`, `checklist`,
`callout` (`style`: principle|insight|question), `approach`, `tagline`, `redflag`, `twocol`. Page kinds: `before`,
`section`, `why`, `decide`, `cta`, `disclaimer`.

## 6. Starting a new guide

1. Put the manuscript in `eBooks/<date>/`. Parse or hand-build `outlines/<book>.json`; apply the copy rules in
   section 5 while doing so.
2. Copy `config/_template.json` to `config/<book>.json` (delete the `_`-prefixed documentation keys); fill in
   topic/title/cover/photos/kickers/series; keep `theme`, `cover_style` and `shadows` as they are. Only add
   `image_after`, `lead_small` or `dense` when a page needs them. `config/sexual-wellness.json` is a complete example.
   **Images.** If the manuscript arrives without images, or a section has none, pull them from the matching section of
   the WellPeps website at `wellpeps-site/public/images/` rather than leaving a page without a figure or generating
   new art. Use the folder for the guide's treatment area (`sexual/`, `hormone/`, `peptide/`, `peptide-therapies/`,
   `hair/`, `mental/`, `weight/`), the `program-<area>.webp` hero for the cover, and the shared assets at the root
   (`doctor-assessment.webp` for the medical-question page, `cta-couple*.webp` / `hero-couple*.webp` for the CTA,
   `journey-*.webp` for care-continues pages, `about/` for the Why WellPeps team photo, `insight-<area>.webp` for the
   callout treatment). Reference them by relative path from `_build` (for example `../../wellpeps-site/public/images/sexual/<file>`),
   set `focus` so no person is cropped at the frame edge, and list what was borrowed in the build notes so Derek can
   swap in dedicated photography later. The GLP-1 CTA already uses `weight/cta-woman.webp` this way.
3. Run `build_book.py --version 1`. A `CONTINUED` FAIL is a content problem: either split the section into two
   full pages in the outline (what we did for Personalized Treatment Options) or trim copy with Derek. Do not go
   below 10pt body text. Fix every FAIL; read every WARN.
4. Open `qa/<slug>/sheet.jpg` and check every page for: balanced headings, figures not cropping people, lists not
   wrapping badly beside a figure (set the list's `cols`), card grids symmetrical, boxes at the bottom with the
   standard padding, and pages with a large empty middle (add a borrowed figure or ask Derek for copy). The build
   report's `gap` column and its "too empty" WARNs point at those pages; the sheet confirms them.
5. Bump `--version` on every change Derek reviews; the copy lands in `eBooks/<slug>_ebook-vN.pdf`. Move old versions
   to `eBooks/_archive/`.

## 7. Guardrails (built 2026-09-16)

- `config/_template.json` documents every config option.
- `build_book.py` (section 2) renders, prints, and runs `layout_check.mjs` (page fit, CONTINUED splits, dropped
  figures, orphan words, Lora/Inter loaded in the browser), the luminosity-soft-mask check, a fallback-font check on the
  PDF, a text-extraction check and the banned-phrase scan ("included" near "lab", "Care Coaching", "if prescribed" in a
  pricing section, a callout labelled PRINCIPLE). Note: Chromium embeds the web fonts as unnamed Type3 glyph programs,
  so Lora and Inter never appear by name in the PDF; the browser check proves they loaded, and any *named* Arial /
  Helvetica / Times font in the PDF means a face or a glyph fell back (the red-flag triangle is an inline SVG for this
  reason).
- Inter and Lora are bundled in `_assets/fonts/` and embedded in the HTML; no network dependency remains.
- **Page-too-empty check** (added 2026-09-16 evening). `layout_check.mjs` measures `emptyIn` for every section, Why
  and Before You Decide page: the largest visible vertical gap, in inches, between the lowest content block and either
  the top of the bottom stack (callout/approach/decide figure) or the bottom of the body area when there is no stack.
  It is measured after pagination, so `spacious` type has already been applied. The fit line prints it for every page
  (`06: spacious  gap 1.81in`) and `build_book.py` WARNs above `EMPTY_PAGE_IN = 1.5`. Calibration on the approved
  GLP-1 v10: page 05 at 1.13in reads fine, page 06 at 1.81in is the known dead gap (the open headline decision with
  Derek). On Sexual Wellness v1 it flags 00, 02, 03 and 15. It is a WARN, not a FAIL, because the fix is content
  (a borrowed figure, section 6 step 2, or more copy). Limits: it measures vertical space only, so a five-card Why
  grid with an empty right slot reads about 1.3in and does not trip it; and a `checklist` page that the paginator
  stretched to fill reads 0in by design.
- **CTA panel overflow check** (added with Healthy Aging). The CTA hero panel is `overflow:hidden` with its content
  centred, so too much copy clips the *headline at the top* with no other symptom, and `make_pdf.mjs` never sees it.
  The paginator already steps the panel to `tight`/`tighter`; `layout_check.mjs` now measures, as geometry, how far the
  panel's content extends past the panel's own edges (`cta[].overflowIn`; copy that merely runs into the padding is
  invisible and is not counted) and `build_book.py` FAILs on any clipping. Calibration: GLP-1 v10, Sexual Wellness v2 and
  Hair Restoration v2 all pass; Healthy Aging with the manuscript's full closing copy clips 0.58in. Capacity is the two-line headline plus one short
  paragraph (GLP-1) or two very short ones (Sexual Wellness); everything else belongs on another page.
- **Disclaimer overlap check** (added with Hair Restoration). `layout_check.mjs` reports the overlap in inches between
  the legal text and the series list after the page has stepped its type down; any overlap is a FAIL.
- `spacious` in the fit report still means the paginator had more than 0.7in to spare and bumped the type; a run of
  `spacious` pages plus a large `gap` is the signal to look at the sheet.

## 8. Known follow-ups

- Series cross-references on the disclaimer page are plain text until the guides have public URLs (add `url` to each
  `series` entry and `linkify` will turn mentions into links).
- The CTA button links to `https://wellpeps.com/#assessment`.
- Hair Restoration 02 wants four simple scalp/pattern illustrations (Derek's production note); the cards are a stand-in.
- Derek floated a protocol-trained triage chatbot; notes on scope and safety are in the 2026-09-15 session.
