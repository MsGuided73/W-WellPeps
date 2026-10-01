# WellPeps Smart Patient Guide — build pipeline and playbook

Single source of truth for producing the Smart Patient Guide eBooks. The GLP-1 guide (`eBooks/glp-1_ebook-v10.pdf`,
built 2026-09-16) is the reference book and the template for every other guide. Read this whole file before
building another book.

## 1. Current state (2026-09-16)

- **Live:** GLP-1 Weight Loss, v10. Outline `outlines/glp-1-weight-loss.json`, config `config/glp-1-weight-loss-v5.json`,
  HTML `html/glp-1-v10.html`, PDF `pdf/glp-1-v10.pdf`, copied to `eBooks/glp-1_ebook-v10.pdf`. 18 pages: cover,
  sections 00–13, CTA (15), disclaimer.
- **Draft for review:** GLP-1 Weight Loss, v11 (2026-09-25), the first book on theme `editorial-v6`, built to Derek's
  "WellPeps eBook Formatting" standard (`eBooks/WellPeps eBook Formatting.docx`). Config `config/glp-1-weight-loss-v11.json`
  (v5 config with `"theme": "editorial-v6"`; the v10 config is untouched), PDF `eBooks/glp-1-weight-loss_ebook-v11.pdf`.
  v11/v12 let seven sections spill onto half-empty CONTINUED pages (25 pages); Derek rejected that on 2026-09-28
  ("pagination has overcorrected"). **v13** (`eBooks/glp-1-weight-loss_ebook-v13.pdf`, 18 pages) keeps the fixed type
  and fits every section on one page by: tightening the book-wide v6 spacing once (section 3a), a smaller photo on 02
  and 08, 2:1 product photos on 04 (`card_image_ratio`), full-width lead on 04, the 08 monitoring cards and the 12
  price icons in one row of four / two rows of four, and three redundancy trims in Approach boxes (04 twice, 08 once;
  listed in the v13 hand-off). Page 12 uses the new `iconlist` element instead of cards. The other guides stay on
  `editorial-v5` until Derek approves. See section 3a.
- **Consistency pass, 2026-09-28 (all on `editorial-v6`, each 18 pages, every section on one page, PDF + editable
  PPTX in `eBooks/`):** Sexual Wellness **v3**, Hair Restoration **v3**, Healthy Aging & Vitality **v2**. Configs are
  `config/<book>-v6.json` (the v5 configs are untouched; the Sexual Wellness product photos now point at
  `docs/site-revisions/source-images/`, after the website cleanup deleted the originals). Layout fixes: smaller photos
  (Sexual 12; Hair 01, 03, 09; Healthy 06, 09, 11), one-row card grids (Hair 11, Healthy 03), Hair 02 Men | Women side by
  side (`pair_groups` in the page config). Series-wide v6 changes that GLP-1 will also pick up on its next build:
  disclaimer legal text at 12pt with the series list flowing below it and standard headline->rule spacing; Why-page
  cards .8in min height, .12/.16/.10in padding, .10in row gap, 2.4in team photo; card side padding .13in; chip side
  padding .16in. Wording trims for Derek (all in outlines): Hair 02 lead "offer clues to" (was "provide important clues
  about"); Hair 05 lead "Finasteride targets one pathway behind male pattern hair loss" (was "addresses one of the
  biological pathways involved in"); Hair 05 Approach "considers" (was "includes considering"); Healthy 05 headline
  "Healthy Aging & Vitality Therapies" (dropped "Explore"); Healthy 05 lead "grouped as" (was "grouped together as
  generic"); Healthy 06 "look at the patient rather than assuming age" (dropped "individual" and "that").
  New build checks: disclaimer brand block vs footer, content past the right margin, cropped card photos.
- **Font-consistency pass, 2026-09-29:** Sexual Wellness **v4**, Hair Restoration **v4**, Healthy Aging & Vitality
  **v3** (PDF + editable PPTX with embedded fonts in `eBooks/`; v3/v3/v2 moved to `_archive/`). A span-by-span audit of
  the four v6 PDFs found the scale identical across the series except two one-book elements the v6 block had never
  covered: the neutral two-column headings on Hair 07 (11pt) and the flow steps on Healthy Aging 12 (10.5pt); both are
  now pinned to the 12pt card-heading size. Everything else already matched Derek's table (7.5 / 9.5 / 11.5 / 12 / 13 /
  14 / 15.5 / 16 / 27 / 31) plus the same series-wide sizes for elements the table does not name (quote 19, checklist
  titles 15, Why tag 17, CTA 25 / 12.5 / 22). Two things left as they are: the cover title steps from 58pt to 44pt when
  it exceeds 22 characters (Healthy Aging; at 58pt "HEALTHY AGING" alone would overrun the page width, so this is the
  cover's equivalent of the 31/27 rule), and GLP-1 v14's disclaimer still has the pre-v6 13pt legal text (it picks up
  the 12pt rule on its next build). `build_book.py` now FAILs a v6 build on any interior-page span off the scale
  (`TYPE_SCALE`, section 7). **Second round, same day** (the user still saw mixed sizes on Healthy Aging pages):
  three body-area elements the table does not name were on the scale only by coincidence: emphasis lines and
  sub-headings at 13pt (the Approach size) beside 12pt body, and quotes at 19pt above the 15.5pt deck. Under v6 they
  now take 12pt bold (emphasis, sub-headings) and 15.5pt (quotes), 19 left the allowed scale, and the three books were
  rebuilt as Sexual Wellness **v5**, Hair Restoration **v5**, Healthy Aging **v4**. GLP-1's one quote (04) and three
  emphasis lines change the same way on its next build.
- **Why page check, 2026-09-29:** Sexual Wellness, Hair Restoration and Healthy Aging all carry Derek's revised page 14
  (kicker A BETTER APPROACH TO CARE, founder-story intro in two paragraphs, the same eight cards with the last one
  titled per topic). Sexual Wellness was still on the default WHY WE CREATED WELLPEPS kicker and, like Healthy Aging,
  ran the two intro paragraphs together; fixed and rebuilt as Sexual Wellness **v6** and Healthy Aging **v5** (Hair v5
  already matched). **GLP-1 v14 still has the older Why page** from the approved v10 content (telehealth intro, Lab
  Access, U.S.-Based Prescription Fulfillment, Patient-Friendly Cancellations, default kicker). Whether GLP-1 adopts the
  revised page is Derek's call; nothing was changed there.
- **Healthy Aging v6, 2026-09-30:** page 03's four cards (Strength & Muscle, Energy & Metabolism, Sleep & Recovery,
  Cognitive Wellness) were four skinny columns; at the client's request they are now four full-width horizontal rows
  (`"layout": "rows"` on the cards element, no photos: title in a 1.6in left column, copy beside it). New CSS rule
  `.cards.rows:not(.withimg)` in `render_html.py`. Still 18 pages, every section on one page; PDF + PPTX in `eBooks/`.
- **Fonts, 2026-09-30 (Healthy Aging v7):** every PDF through v6 embedded Inter/Lora as **Type 3** glyphs (Chromium does
  this for variable fonts), and some viewers drew them as broken, half-missing letters. `font_css()` now embeds the
  static TTFs in `pptx/fonts/` (Inter 400/500/600/700 at opsz 16, Lora 600), which print as ordinary TrueType; the
  variable woff2 bundle is only a fallback. Static Inter is slightly wider than the variable font at large sizes, so a
  few leads re-wrap by a line (all pages still fit). `esc()` keeps "NAD+—" together. Other books still carry Type 3
  fonts until rebuilt.
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
  box. The one-line label lists on 01, 04 and 10 are chips (`style: chips`; 10 pinned to `cols: 2`), which took 01 off `dense`. On 04 the figure enters after the chips (`image_after: 3`): floated beside the lead it left a dead white block, because the card grid clears the float. 14 runs `dense`; the disclaimer stepped its type down the full four steps (the manuscript's seven legal
  paragraphs were merged into four without dropping a word). Deviations to raise with Derek: the CTA panel holds the
  two-line headline plus one paragraph, so the manuscript's closing imperatives ("Stay active. Protect your strength. ...")
  and the "make them part of a thoughtful, provider-guided plan" line are not on the CTA page; the 05 vial photos; the
  merged disclaimer paragraphs.
- **Draft for review:** NAD+ Therapy, v1 (built 2026-09-29 from `eBooks/Manuscripts/nad-guide_final.docx`, straight onto
  `editorial-v6`). Outline `outlines/nad-therapy.json`, config `config/nad-therapy-v6.json`, PDF + PPTX
  `eBooks/nad-therapy_ebook-v1.*`. 18 pages, every section on one page. Borrowed photos: cover `peptide/benefits-woman.webp`
  (focus 0.3 so her arm is not cut at the left edge), 00 `peptide/photo-nad`, 01 `peptide/hero`, 02 `hero-couple-coast`,
  03 `peptide/science`, 09 `doctor-assessment`, 10 `peptide/photo-lipoc`, 12 `journey-3`, CTA `about/cta-couple`.
  Layout: 01 renders the manuscript's vertical arrow chain as a `flow`; 05 is three profile cards (NAD+ / NR / NMN) with
  the ROLE and CONTEXT labels kept inline; 07 carries no photo and 08's four cards run in one row (both spilled
  otherwise); 13's closing SMART PATIENT PRINCIPLE renders as the inline series tagline line because the checklist plus
  a full callout box ran 0.88in over. Deviations to raise with Derek: his SMART PATIENT PRINCIPLE labels render as
  SMART PATIENT INSIGHT (section 5 rule); page 14 follows the series (kicker A BETTER APPROACH TO CARE, headline Why We
  Created WellPeps) where the manuscript swaps them; the CTA panel holds one paragraph, so the four closing
  imperatives ("Start with good questions." ...) and the two-line intro are not on the CTA page; the seven legal
  paragraphs are merged into two without dropping a word; the disclaimer headline is the series' "Educational
  information, not medical advice."; the back-page series list omits NAD+ itself.
- **Draft for review:** Modern Healthcare, v1 (built 2026-10-01 from `eBooks/Manuscripts/THE SMART PATIENT’S GUIDE TO
  MODERN HEALTHCARE.docx`, straight onto `editorial-v6`). Outline `outlines/modern-healthcare.json`, config
  `config/modern-healthcare-v6.json`, PDF `eBooks/modern-healthcare_ebook-v1.pdf`. 19 pages: cover, 00–13, Why (14),
  a closing section (15, The Future of Healthcare), CTA, disclaimer; every section on one page. Borrowed photos: cover
  `weight/why-doctor`, 00 `journey-1`, 02 `journey-5`, 03 `journey-3`, 05 `weight/why-lab`, 09 `journey-4`, 15 hero
  `about/built-around-you` + `about/our-promise`, CTA `learning-center/couple`. Page 08 waits for a privacy-safe
  WellPeps portal screenshot (the manuscript's design note; the user is supplying it). Layout: 07's six connected-care
  steps are six numbered cards (`flow` takes labels only); 11 is the ✓/✕ two-column block with the connected
  experience first; 12's eight red flags are a bold-lead-in list (cards ran 0.7in over); 13's nine-item checklist uses
  the new `"compact": true` (0.52in number squares, .12in row gap, same type) and its closing principle renders as the
  tagline line. Deviations to raise with Derek: SMART PATIENT PRINCIPLE renders as INSIGHT (section 5); page 14
  follows the series (kicker A BETTER APPROACH TO CARE); the CTA uses the series kicker with the manuscript's EXPLORE
  WELLPEPS paragraph; 11's column order. Derek sent a mockup (light cover with a couple on a tablet, pill-style
  kicker); 2026-10-01 decision: reference only, the book stays in the series style. WARNs left: 15 has 1.9in free,
  10's "WHO CAN ACCESS MY INFORMATION?" card title wraps one word.
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

### Editable PowerPoint export (added 2026-09-28)

**Every deck must carry the known-good embedded fonts: run `pptx_fonts.py` after PowerPoint's Save As (2026-09-30).**
Every deck PowerPoint embedded fonts into on 2026-09-30 drew scrambled letters in PowerPoint for the web (Outlook's
attachment preview, Derek's machine): "HEALTHY" as a block, Y as v, G as C, on every page. Desktop PowerPoint with the
fonts installed looked fine, which hid it. Affected: Healthy Aging v5, v6, v7 and the 21:39 re-saves of GLP-1 v14,
Hair v5, NAD v1 and Sexual Wellness v6, with both subset and full embedding, from the same installed font files as
before. All of them are in `eBooks/_archive/scrambled-fonts-2026-09-30/`. The fonts embedded on 2026-09-28/29 render
correctly and are byte-identical in every deck from those days. They are kept in `pptx/embedded-fonts/` (from Healthy
Aging v4, with `coverage.txt`, every character the five books use). The exact defect in the new embeds is unknown:
PowerPoint compresses embedded fonts in a format we cannot unpack. The desktop TTFs do have overlapping contours left
from the variable font, which fits the symptom but is unproven. The 2026-09-28 originals of the four re-saved decks
are in `eBooks/_archive/subset-fonts/` and back in `eBooks/`. Healthy Aging v8 is v7 with the good fonts swapped in.

```bash
python pptx_fonts.py ../<book>_ebook-vN.pptx           # swap in the known-good fonts (in place), then reports GOOD
python pptx_fonts.py --check ../*.pptx                  # GOOD / BAD per deck; run before sending any deck
```

The swap refuses a deck that uses a character outside `coverage.txt`. If that ever happens, the known-good fonts may
lack it, so test that deck in Outlook's preview before sending. `pptx_build.py` writes `saveSubsetFonts="1"` to match
the known-good decks. It also strips invisible characters the fonts lack (the renderer's U+2060 word joiner in
"NAD+—") and refuses to build if any character is missing from the desktop fonts. PowerPoint keeps already-embedded
font data on a re-save, so save from the fontless `-draft.pptx`. Customers only ever get the PDF; the PPTX is the
team's editing copy, and `eBooks/WellPeps-eBook-Fonts.zip` installs the fonts for whoever edits.

Rebuilds a built book's HTML as a fully editable .pptx (one 8.5 x 11 slide per page): every box, rule, card, callout,
photo and text block is its own PowerPoint object at the PDF's exact position, font, size, colour and tracking.

```bash
node pptx_extract.mjs html/<book>-vN.html pptx/<book>-vN.json          # geometry + styles from Chromium (print media)
uv run --with python-pptx python pptx_build.py pptx/<book>-vN.json pptx/<book>-vN-draft.pptx
```

Then open the draft in PowerPoint and Save As with "Embed fonts" (COM: `Presentation.SaveAs(path, 24, -1)`) so the file
carries Inter / Inter Medium / Inter SemiBold / Lora SemiBold, then run `pptx_fonts.py` on the saved deck (above).
Never ship a deck straight from PowerPoint's save. Those desktop fonts are static instances generated from
the bundled woff2 (`pptx/fonts/*.ttf`, Inter at opsz 16); PowerPoint must have them installed to render or embed them
(installed per-user on this machine 2026-09-28). Text keeps the browser's line breaks as soft line breaks, so it wraps
exactly as the PDF; after editing a paragraph, remove or move those breaks by hand. Photos keep their crop as an
editable PowerPoint crop; inline SVG icons become small PNG pictures. 2026-10-01 fix: the extractor dropped the
text of every two-column (`twocol`) row, because the row's absolutely positioned mark computes as display:block. It now
skips out-of-flow children when deciding what is a text block and extracts them separately. Every Hair Restoration deck
before this date has an empty page 07 comparison. The twocol ✓/✕ marks are now inline SVG, because desktop Inter has no
glyph for them. QA: export slides via PowerPoint COM and compare
against the PDF pages (GLP-1 v14: all 18 slides matched).

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
  equal padding. In the five-card (3 + 2) layout the second row sizes to its own copy rather than stretching to row one's tallest card (changed 2026-09-17 for Healthy Aging 02; GLP-1 05 picks it up on its next rebuild). A product photo goes on a card only when its label matches the card copy: the hair product shots
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
- **`iconlist`** (added 2026-09-25): items `{icon, title, desc?}`, optional `cols` (1-4); a navy disc with a white
  inline-SVG icon (`LIST_ICONS` in render_html.py: molecule, pen, tablet, stethoscope, chat, clipboard, pin, pharmacy,
  tag, calendar) then a bold title, "Title. desc" when a desc is given. GLP-1 page 12 uses it for the price items.
- **Per-element options in the outline:** `list` takes `cols` (1 or 2) to override the column heuristic; `cards` takes
  `cols` too (the Hair Restoration timeline is four cards in one row); a `cards` element whose items are one-line
  labels with no description can take `"style": "chips"` to render as a wrapping row of auto-width centred chips
  (the flow-step look without arrows) instead of a grid of two-line-tall cards that is mostly air (Healthy Aging 01, 04, 10). Chips flow by width, so the outline order sets the rows; add `cols` to pin a fixed grid of equal-width chips instead (Healthy Aging 10 is 2 x 2); a `redflag` (or callout/approach) with
  `"inline": true` stays in the text flow instead of joining the bottom stack. Red-flag lines that are short and have
  no full stop render as bold labels. `twocol` defaults to good (✓ blue) vs bad (✕ red); `"style": "neutral"` renders
  two equal blue columns with bullets for comparisons where neither side is wrong (oral vs topical).
- **Glyphs.** The bundled Inter subset has no U+2192 arrow; the `flow` arrow is an inline SVG for that reason (the
  fallback-font check caught it as Arial). Bullets (•), check (✓) and cross (✕) are fine.
- **Disclaimer page.** The legal text sits in a fixed slot above the series list. When a manuscript's legal block is
  longer than GLP-1's three paragraphs, the page steps its type down (13 → 12 → 11.5 → 11 → 10.5pt) until it clears;
  the build report prints how many steps it took, and FAILs if it still overlaps.

## 3a. Fixed typography (theme `editorial-v6`, 2026-09-25)

**Round two (Derek, 2026-09-28):** fixed type AND efficient pages. Before any section continues: rework the layout
(image size/placement, grids that use the width, `cols`), then trim redundant words; only then continue. A
continuation page must hold substantial content: `build_book.py` WARNs when one is under `CONT_MIN_FILL` (60%) full.
Keep 05 and 06 as separate pages (two topics). Spacing tokens now: head->rule .14in, rule->deck .2in, deck->body
.16in, paragraphs .13in, cards .16in, content->boxes .22in, box->box .1in, card padding .14in .16in, callout icon
1.02in, body area 1.44in-10.40in.

Derek's formatting standard: the type and spacing never change from page to page to make content fit. `editorial-v6`
is v5 plus one fixed scale, set in the `.theme-editorial-v6` block of `CSS` (spacing as `--sp-*` / `--pad-*` variables):
headline Lora 31pt, or 27pt when it takes two lines (nothing smaller); deck and quotes 15.5pt; body, lists, emphasis lines and sub-headings 12pt on 16.5pt
leading; card heading 12pt bold navy, card body 11.5pt; Smart Patient label 7.5pt tracked caps, question/insight 14pt
semibold; Approach label 9.5pt, text 13pt; chapter bar 16pt always; running head 7.5pt medium. The Insight/Approach
stack sits a fixed .3in below the content instead of being pinned to the page bottom.

Under v6 the paginator ignores `dense` and `lead_small`, and never applies `tight`/`compact`/`tighter`/`spacious`,
the checklist stretch, the CTA-panel steps, the disclaimer steps, or figure shrink/drop. A section (or the Why page)
that does not fit continues onto a page whose chapter bar reads "<KICKER> — CONTINUED", with no repeated headline:
the boxes move over with the end of the section; content moves from the end until page one fits; card grids,
Why cards and lists break between rows (five-card and chip grids move whole); if only the boxes overflowed, the
section's last block (or a grid's last row) goes with them so the second page is never just two boxes. The build
report lists each continued section with how far it runs over on one page, and does not WARN "too empty" on
split sections, whose white space is intentional.

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
- **Fixed-type scale check** (added 2026-09-29, v6 builds only). `check_pdf` reads every text span on the interior
  pages (not the cover or disclaimer) and `build_book.py` FAILs when a size is not in `TYPE_SCALE`: Derek's table plus
  the series-wide sizes of the elements it does not name. A new element kind must be given a size from the scale in the
  `.theme-editorial-v6` block, or the check will name the page and the text. It is what caught the two-column headings
  and the flow steps.
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
