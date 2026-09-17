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
    return {'pages': len(d), 'luminosity': len(lum_pages), 'fonts': sorted(fonts), 'text': text}


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
            if gap > EMPTY_PAGE_IN:
                warns.append(f"page {row['page']} is too empty: {gap:.2f}in of free space (limit {EMPTY_PAGE_IN}in): add a borrowed figure or more copy")
            if row['continued']:
                fails.append(f"page {row['page']} split onto a CONTINUED page: split the section in the outline or trim copy")
            if row['figureDropped']:
                warns.append(f"page {row['page']}: the paginator dropped the figure (set image_min_w or trim copy)")
        for o in lay['orphans']:
            warns.append(f"orphan word on page {o['page']} ({o['block']}): '...{o['lastWord']}'  <- {o['text']}")
        for d in lay.get('disclaimer', []):
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
