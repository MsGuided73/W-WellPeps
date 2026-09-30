"""One-command build for a Smart Patient Guide, with the guardrails from README section 7.

Usage (from eBooks/_build):
  uv run --with pymupdf --with pillow python build_book.py outlines/<book>.json config/<book>.json --version N [--no-sheet] [--no-copy]

Steps: render HTML -> print PDF (Chromium) -> layout check (page fit, splits, orphans, fonts loaded) ->
page-too-empty check -> CTA panel overflow -> disclaimer overlap -> PDF checks (luminosity soft masks, embedded fonts, extractable text) -> banned-phrase scan (outline + PDF text) ->
contact sheet -> copy to eBooks/<slug>_ebook-vN.pdf. Exits 1 when any FAIL is reported; WARNs do not block.
"""
import argparse, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render_html  # noqa: E402

BANNED = [
    # (label, regex over the flattened text, scope)  scope: 'all' | 'pricing' (sections whose headline/kicker mention price/cost)
    ('"included" next to lab tests (labs are offered, never included)', re.compile(r'\blab[^.]{0,60}\bincluded?\b|\bincluded?\b[^.]{0,60}\blab', re.I), 'all'),
    ('"Care Coaching" (say ongoing/continued support)', re.compile(r'care coaching', re.I), 'all'),
    ('"if prescribed" in pricing copy', re.compile(r'if prescribed', re.I), 'pricing'),
    ('callout labelled PRINCIPLE (must read SMART PATIENT INSIGHT)', re.compile(r'SMART PATIENT PRINCIPLE'), 'rendered'),
]
PRICING = re.compile(r'price|pricing|cost', re.I)
# "Page too empty": largest visible vertical gap on a section/why/decide page (inches, measured by layout_check.mjs
# after the paginator has finished, so `spacious` type has already been applied). A gap this size means the page needs
# a borrowed figure or more copy from Derek; it is a WARN because it is a content decision, not a build defect.
EMPTY_PAGE_IN = 1.5
CONT_MIN_FILL = 0.6  # editorial-v6: a CONTINUED page under 60% full is a layout problem (Derek rejected every v12 continuation page, 14-52% full), not an acceptable split
CARD_CROP_MAX_PCT = 1.0  # product photos on cards must show the whole product (bottle, cap, base, pills)
# Fixed-type scale (editorial-v6, Derek's formatting standard): every text span on an interior page must be one of
# these point sizes. The first group is the standard's table; the second is the series-wide sizes of elements the
# table does not name (checklist title / tagline 15, Why tag 17, CTA headline 25 / button 12.5 / stack 22).
# The cover and the disclaimer page have their own scales and are not checked. Audit 2026-09-29 found the neutral
# two-column headings (11pt) and the flow steps (10.5pt) off the scale; both are now pinned to 12pt in the v6 CSS.
# Same day, second round: emphasis lines and sub-headings (13pt) and quotes (19pt) were on the scale only because
# other elements use those sizes; they now render at 12pt / 15.5pt and 19 is no longer allowed. Note the check is by
# size, not by element, so a body-area element at an Approach or callout size still passes: audit by page when in doubt.
TYPE_SCALE = {31, 27, 15.5, 12, 11.5, 14, 13, 7.5, 9.5, 16, 8} | {15, 17, 25, 12.5, 22}


def run(cmd, **kw):
    print('$', ' '.join(cmd), flush=True)
    r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, encoding='utf8', **kw)
    if r.stderr.strip():
        print(r.stderr.strip(), file=sys.stderr)
    return r


def flatten(o, out):
    if isinstance(o, dict):
        for v in o.values(): flatten(v, out)
    elif isinstance(o, list):
        for v in o: flatten(v, out)
    elif isinstance(o, str):
        out.append(o)
    return out


def check_pdf(pdf_path):
    import pymupdf
    d = pymupdf.open(pdf_path)
    lum_pages = []
    for i in range(d.xref_length()):
        try:
            s = d.xref_object(i, compressed=False)
        except Exception:
            continue
        if re.search(r'/S\s*/Luminosity', s):
            lum_pages.append(i)
    fonts = set()
    for p in d:
        for f in p.get_fonts(full=True):
            fonts.add(f[3])
    text = '\n'.join(p.get_text() for p in d)
    # every span's point size on the interior pages, one sample per (page, size) for the report
    off_scale = {}
    for pno in range(1, len(d) - 1):
        for b in d[pno].get_text('dict')['blocks']:
            for ln in b.get('lines', []):
                for sp in ln['spans']:
                    t = sp['text'].strip()
                    if not t:
                        continue
                    size = round(sp['size'] * 2) / 2
                    if size not in TYPE_SCALE:
                        off_scale.setdefault((pno + 1, size), t[:40])
    return {'pages': len(d), 'luminosity': len(lum_pages), 'fonts': sorted(fonts), 'text': text, 'offScale': off_scale}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('outline'); ap.add_argument('config')
    ap.add_argument('--version', type=int, required=True, help='vN suffix for eBooks/<slug>_ebook-vN.pdf')
    ap.add_argument('--no-sheet', action='store_true'); ap.add_argument('--no-copy', action='store_true')
    a = ap.parse_args()

    outline = json.load(open(a.outline, encoding='utf8'))
    slug = outline['slug']; tag = f'{slug}-v{a.version}'
    html = os.path.join('html', f'{tag}.html'); pdf = os.path.join('pdf', f'{tag}.pdf')
    fails, warns = [], []

    # 1. render + print
    render_html.build(a.outline, a.config, os.path.join(HERE, html))
    r = run(['node', 'make_pdf.mjs', html, pdf])
    print(r.stdout.strip())
    if r.returncode or 'OVERFLOW' in r.stdout:
        fails.append('make_pdf reported overflow or failed')

    # 2. layout facts from the browser
    r = run(['node', 'layout_check.mjs', html])
    if r.returncode:
        fails.append('layout_check.mjs failed'); lay = {}
    else:
        lay = json.loads(r.stdout)
        for row in lay['fit']:
            gap = row.get('emptyIn', 0)
            line = f"  {row['page']}: {'+'.join(row['flags']) or 'default'}  gap {gap:.2f}in{'  CONTINUED' if row['continued'] else ''}{'  figure dropped' if row['figureDropped'] else ''}"
            print(line)
            # v6 (fixed type): a CONTINUED page is the intended outcome for a long section, and its white space is
            # intentional, so neither is reported as a problem; it is listed for the reviewer instead.
            fixed = row.get('fixedType', False)
            # ...and the first page of a continued section ends early by design (its boxes and last block moved on)
            split = fixed and any(r['continued'] and r['page'] == row['page'] for r in lay['fit'])
            if gap > EMPTY_PAGE_IN and not split:
                warns.append(f"page {row['page']} is too empty: {gap:.2f}in of free space (limit {EMPTY_PAGE_IN}in): add a borrowed figure or more copy")
            if row['continued'] and fixed:
                # Derek, round two (2026-09-28): a continuation page should hold about half a page or more; below
                # that, rework the first page's layout (images, grids, spacing) or trim redundant words instead
                if row.get('fill', 1) < CONT_MIN_FILL:
                    warns.append(f"section {row['page']} continuation page is only {row['fill']:.0%} full (minimum {CONT_MIN_FILL:.0%}): rework the layout so the section fits on one page")
            elif fixed and row.get('overIn'):
                print(f"  INFO  section {row['page']} continues onto a second page; on one page it runs {row['overIn']:.2f}in over")
            elif row['continued']:
                fails.append(f"page {row['page']} split onto a CONTINUED page: split the section in the outline or trim copy")
            if row['figureDropped']:
                warns.append(f"page {row['page']}: the paginator dropped the figure (set image_min_w or trim copy)")
        for w in lay.get('wide', []):
            fails.append(f"page {w['page']}: content runs {w['overIn']:.2f}in into the right margin or off the page ('{w['text']}')")
        for c in lay.get('cardCrops', []):
            print(f"  card photo {c['page']} {c['title']}: slot {c['slotIn']}in, photo {c['photo']}px, cropped {c['cropPct']}%")
            if c['cropPct'] > CARD_CROP_MAX_PCT:
                fails.append(f"card photo '{c['title']}' on page {c['page']} is cropped {c['cropPct']}%: product photos must show the whole product; drop card_image_ratio or supply a photo at the slot's proportions")
        for o in lay['orphans']:
            warns.append(f"orphan word on page {o['page']} ({o['block']}): '...{o['lastWord']}'  <- {o['text']}")
        for d in lay.get('disclaimer', []):
            if d.get('brandOverIn', 0) > 0:
                fails.append(f"disclaimer: the series list pushed the WELLPEPS brand block into the footer by {d['brandOverIn']:.2f}in")
            if d['overlapIn'] > 0:
                fails.append(f"disclaimer text overlaps the series list by {d['overlapIn']:.2f}in even after {d['steps']} type steps: shorten or merge the legal paragraphs")
            elif d['steps']:
                print(f"  disclaimer: type stepped down {d['steps']}x to clear the series list")
        for c in lay.get('cta', []):
            if c['overflowIn'] > 0:
                fails.append(f"CTA panel copy is clipped by {c['overflowIn']:.2f}in even after {c['steps']} type steps (the headline is cut off at the top): cut the CTA bodies to one short paragraph")
            elif c['steps']:
                print(f"  cta: panel type stepped down {c['steps']}x to fit")
        f = lay['fonts']
        if not (f['loraLoaded'] and f['interLoaded']):
            fails.append(f"fonts did not load in the browser: {f}")
        if 'Lora' not in f['headlineFamily'] or 'Inter' not in f['bodyFamily']:
            fails.append(f"headline/body font-family resolved to {f['headlineFamily']} / {f['bodyFamily']}")

    # 3. PDF checks
    info = check_pdf(os.path.join(HERE, pdf))
    print(f"  PDF: {info['pages']} pages, luminosity soft masks {info['luminosity']}, fonts {info['fonts']}")
    if info['luminosity'] > 1:
        fails.append(f"{info['luminosity']} luminosity soft masks (expect 1, the cover shade): Apple Preview will show grey boxes")
    # Chromium embeds the web fonts as unnamed Type3 glyph programs, so Lora/Inter never appear by name; a fallback
    # font does (e.g. 'Arial-BoldMT' when a glyph or the whole face was missing). Lora/Inter presence is proven by the
    # browser-side document.fonts check above.
    fallback = [x for x in info['fonts'] if re.search(r'Arial|Helvetica|Georgia|Times|Segoe|Calibri', x)]
    if fallback:
        fails.append(f"fallback font embedded in the PDF: {fallback} (fonts not loaded, or a glyph missing from Inter/Lora)")
    if len(info['text']) < 2000:
        fails.append('PDF text extraction returned almost nothing')
    if json.load(open(a.config, encoding='utf8')).get('theme') == 'editorial-v6':
        for (pno, size), sample in sorted(info['offScale'].items()):
            fails.append(f"fixed-type scale: {size}pt on PDF page {pno} ('{sample}') is not on the v6 scale: pin the element's size in the .theme-editorial-v6 CSS block")

    # 4. banned phrases (outline JSON strings and rendered PDF text)
    strings = flatten(outline, [])
    pricing_strings = []
    for sec in outline.get('sections', []):
        if PRICING.search(sec.get('headline', '')):
            pricing_strings += flatten(sec, [])
    for label, rx, scope in BANNED:
        corpus = {'all': strings + [info['text']], 'pricing': pricing_strings, 'rendered': [info['text']]}[scope]
        hits = [m.group(0) for s in corpus for m in rx.finditer(s)]
        if hits:
            fails.append(f"banned phrase: {label}: {hits[:3]}")

    # 5. contact sheet + copy out
    if not a.no_sheet:
        r = run([sys.executable, 'render_sheet.py', pdf, os.path.join('qa', slug), '40'])
        print(r.stdout.strip())
    if not a.no_copy:
        dst = os.path.join(HERE, '..', f'{slug}_ebook-v{a.version}.pdf')
        shutil.copyfile(os.path.join(HERE, pdf), dst); print('  copied ->', os.path.normpath(dst))

    print('\n== BUILD REPORT', tag)
    for w in warns: print('WARN ', w)
    for f in fails: print('FAIL ', f)
    print('RESULT:', 'FAIL' if fails else 'PASS', f'({len(warns)} warnings)')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
