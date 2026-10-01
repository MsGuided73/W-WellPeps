"""Swap a finished deck's embedded fonts for the known-good copies in pptx/embedded-fonts/.

Usage: python pptx_fonts.py <deck.pptx> [out.pptx]      (no out: rewrites the deck in place)
       python pptx_fonts.py --check <deck.pptx> ...       (report only: GOOD / BAD per deck)

Every deck that PowerPoint re-embedded fonts into on 2026-09-30 (Healthy Aging v5-v7, and GLP-1 v14, Hair v5, NAD v1
and Sexual Wellness v6 re-saved at 21:39) drew scrambled letters in PowerPoint for the web (Outlook's attachment
preview, Derek's machine): "HEALTHY" as a block, Y as v, G as C. Desktop PowerPoint with the fonts installed looked
fine. The fonts embedded on 2026-09-28/29 render correctly everywhere and are byte-identical in every deck from those
days, so they are kept here (taken from Healthy Aging v4) and copied into each new deck after PowerPoint's Save As.
They are subsets, but cover every character used by all five books; the swap refuses a deck that uses one they lack.
"""
import hashlib
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
GOOD_DIR = os.path.join(HERE, 'pptx', 'embedded-fonts')
# characters the good fonts are known to draw: everything used in the five books they were embedded with
COVERAGE = os.path.join(GOOD_DIR, 'coverage.txt')


def embedded(z):
    """{'<typeface>-<style>': 'ppt/fonts/fontN.fntdata'} from the deck's embedded-font list."""
    pres = z.read('ppt/presentation.xml').decode('utf8')
    rels = z.read('ppt/_rels/presentation.xml.rels').decode('utf8')
    targets = {}
    for rel in re.findall(r'<Relationship [^>]*>', rels):
        rid, tgt = re.search(r'Id="([^"]+)"', rel).group(1), re.search(r'Target="([^"]+)"', rel).group(1)
        targets[rid] = 'ppt/' + tgt.lstrip('/').removeprefix('ppt/')
    out = {}
    for face, body in re.findall(r'<p:font typeface="([^"]+)"[^>]*/>(.*?)</p:embeddedFont>', pres):
        for style, rid in re.findall(r'<p:(\w+) r:id="([^"]+)"', body):
            out[f'{face}-{style}'] = targets[rid]
    return out


def good_fonts():
    return {f[:-len('.fntdata')]: open(os.path.join(GOOD_DIR, f), 'rb').read()
            for f in os.listdir(GOOD_DIR) if f.endswith('.fntdata')}


def deck_chars(z):
    chars = set()
    for n in z.namelist():
        if re.match(r'ppt/slides/slide\d+\.xml$', n):
            for t in re.findall(r'<a:t>([^<]*)</a:t>', z.read(n).decode('utf8')):
                chars |= set(t)
    return {c for c in chars if not c.isspace()}


def check(path):
    good = good_fonts()
    with zipfile.ZipFile(path) as z:
        fonts = embedded(z)
        bad = [k for k, part in fonts.items() if k not in good or z.read(part) != good[k]]
    state = 'NO FONTS' if not fonts else ('BAD ' + ', '.join(bad) if bad else 'GOOD')
    print(f'{state:12s} {path}')
    return bool(fonts) and not bad


def mark_subset(xml):
    """The known-good fonts are subsets; flag the deck as subset-embedded, as PowerPoint did for them."""
    text = re.sub(r' saveSubsetFonts="\d"', '', xml.decode('utf8'))
    return text.replace('embedTrueTypeFonts="1"', 'embedTrueTypeFonts="1" saveSubsetFonts="1"', 1).encode('utf8')


def swap(src, out):
    good = good_fonts()
    covered = set(open(COVERAGE, encoding='utf8').read())
    with zipfile.ZipFile(src) as z:
        fonts = embedded(z)
        if not fonts:
            raise SystemExit(f'{src}: no embedded fonts. Save it from PowerPoint with "Embed fonts" first.')
        unknown = sorted(set(fonts) - set(good))
        if unknown:
            raise SystemExit(f'{src}: no known-good copy of {unknown}')
        missing = sorted(deck_chars(z) - covered)
        if missing:
            raise SystemExit(f'{src}: characters the known-good fonts may lack: {missing}')
        parts = {part: good[k] for k, part in fonts.items()}
        items = [(i, parts.get(i.filename) or z.read(i.filename)) for i in z.infolist()]
    items = [(i, mark_subset(data) if i.filename == 'ppt/presentation.xml' else data) for i, data in items]
    tmp = out + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zo:
        for i, data in items:
            zo.writestr(i, data)
    os.replace(tmp, out)
    print(f'{len(parts)} fonts replaced -> {out}')
    check(out)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--check']:
        ok = [check(p) for p in args[1:]]
        sys.exit(0 if all(ok) else 1)
    if len(args) not in (1, 2):
        raise SystemExit(__doc__)
    swap(args[0], args[1] if len(args) == 2 else args[0])
