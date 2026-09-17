"""Render a Smart Patient Guide outline + config into a paginated HTML document.

Usage: python render_html.py outlines/nad.json config/nad.json html/nad.html
The HTML paginates itself in the browser (see the <script> at the end); make_pdf.mjs prints it to PDF.
"""
import json, os, re, sys, html as H, base64, io
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MEDIA = os.path.join(HERE, '..', '_assets', 'glp1-media', 'ppt', 'media')
ICON = os.path.join(MEDIA, 'image2.png')
LOGO = os.path.join(MEDIA, 'image17.png')
LOGO_WHITE = os.path.join(HERE, '..', '..', 'Logo', 'all-white-logo-transparent.png')
LOGO_BLUE = os.path.join(HERE, '..', '..', 'wellpeps-site', 'public', 'images', 'logo-full-v2.png')  # official transparent wordmark
SITE_IMG = os.path.join(HERE, '..', '..', 'wellpeps-site', 'public', 'images')

CALLOUT_TITLE = {'principle': 'SMART PATIENT INSIGHT', 'question': 'SMART PATIENT QUESTION', 'insight': 'SMART PATIENT INSIGHT'}
AUTHOR_NOTES = ('This should be one of the ebook', 'This is where I think we can create')


def esc(t):
    return H.escape(t, quote=False)


GLUE = re.compile(r'\b(Weight|weight) (Loss|loss|Management|management)\b')
HYPH = re.compile(r'\b([A-Za-z]+-\d+)\b')  # GLP-1, peptide-1: never break at the hyphen


def glue(t):
    """Escape display text and keep compound terms ('Weight Loss', 'peptide-1') from breaking across lines."""
    t = GLUE.sub(lambda m: m.group(1) + chr(0xA0) + m.group(2), esc(t))
    return HYPH.sub(r'<span class="nb">\1</span>', t)


def img_uri(path, max_px=1800, quality=84, crop=None):
    """Embed an image as a JPEG data URI (PNG with alpha kept as PNG)."""
    p = path if os.path.isabs(path) else os.path.normpath(os.path.join(HERE, path))
    im = Image.open(p)
    if crop:
        W, Hh = im.size; l, t, rr, b = crop
        im = im.crop((int(W * l), int(Hh * t), int(W * (1 - rr)), int(Hh * (1 - b))))
    if im.mode in ('RGBA', 'LA', 'P') and 'A' in im.getbands() and im.getextrema()[-1][0] < 255:
        im.thumbnail((max_px, max_px)); buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    im = im.convert('RGB'); im.thumbnail((max_px, max_px))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=quality, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


FONTS = os.path.join(HERE, '..', '_assets', 'fonts')
FONT_SUBSETS = ('latin', 'latin-ext', 'symbols', 'math')  # English guides; the other subsets stay on disk unused
GOOGLE_FONTS = "@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');"


def font_css():
    """@font-face rules with the bundled Inter/Lora woff2 files embedded as data URIs (no network at render or print
    time). Falls back to the Google Fonts import, with a warning, only if the bundle is missing."""
    manifest = os.path.join(FONTS, 'manifest.json')
    if not os.path.exists(manifest):
        print('WARNING: _assets/fonts/manifest.json missing; falling back to Google Fonts (Arial if offline)', file=sys.stderr)
        return GOOGLE_FONTS
    rules = []
    for f in json.load(open(manifest, encoding='utf8')):
        if f['subset'] not in FONT_SUBSETS:
            continue
        data = base64.b64encode(open(os.path.join(FONTS, f['file']), 'rb').read()).decode()
        rules.append(f"@font-face{{font-family:'{f['family']}';font-style:{f['style']};font-weight:{f['weight']};font-display:block;"
                     f"src:url(data:font/woff2;base64,{data}) format('woff2');unicode-range:{f['unicode_range']}}}")
    return chr(10).join(rules)


def shadow_tile(bg='#FAFCFD', shadow=(8, 43, 89)):
    """Opaque 9-slice shadow tile: the original blurred lift composited onto the page tint, so the PDF gets a plain
    RGB image instead of a transparent soft mask (which Apple Preview paints as a grey box). Rendered at 2x."""
    from PIL import ImageDraw, ImageFilter
    core, m, mb, r = 64, 56, 72, 16                        # core (stretched), margins, bottom margin, corner radius @2x
    W, Hh = m + core + m, m + core + mb
    bgc = tuple(int(bg[i:i + 2], 16) for i in (1, 3, 5))
    out = Image.new('RGB', (W, Hh), bgc)
    for dy, sigma, alpha in ((4, 4, 0.16), (16, 18, 0.23)):  # box-shadow 0 2px 4px .10, 0 8px 18px .14 at 2x, boosted to match the measured blur depth
        mask = Image.new('L', (W, Hh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((m, m + dy, m + core, m + core + dy), radius=r, fill=int(255 * alpha))
        mask = mask.filter(ImageFilter.GaussianBlur(sigma))
        layer = Image.new('RGB', (W, Hh), shadow)
        out = Image.composite(layer, out, mask)
    buf = io.BytesIO(); out.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def smart_title(t):
    small = {'a', 'an', 'the', 'of', 'for', 'with', 'and', 'in', 'to', 'or', 'than'}
    words = t.lower().split(' ')
    out = []
    for i, w in enumerate(words):
        parts = w.split('-')
        parts = [p if (p in small and i and False) else p.capitalize() for p in parts]
        w2 = '-'.join(parts)
        if i and w in small:
            w2 = w
        out.append(w2)
    s = ' '.join(out)
    return s.replace('Wellpeps', 'WellPeps').replace('Glp-1', 'GLP-1').replace('U.s.', 'U.S.').replace('Nad+', 'NAD+')


def split_camel(t):
    """Split concatenated phrases like 'Cellular EnergyParticipates in' -> ['Cellular Energy', 'Participates in']."""
    return [s.strip() for s in re.split(r'(?<=[a-z\)\.\+])(?=[A-Z])', t) if s.strip()]


# ---- normalization of parser output --------------------------------------------
def normalize(els):
    out = []
    i = 0
    while i < len(els):
        e = els[i]
        k = e['kind']
        if k in ('body', 'emph') and e.get('text', '').startswith(AUTHOR_NOTES):
            i += 1; continue
        # therapy profile run: (cards[1] , emph) pairs -> profile cards
        if k == 'cards' and len(e['items']) == 1 and i + 1 < len(els) and els[i + 1]['kind'] == 'emph' and i + 3 < len(els) and els[i + 2]['kind'] == 'cards' and len(els[i + 2]['items']) == 1 and els[i + 3]['kind'] == 'emph':
            items = []
            j = i
            while j + 1 < len(els) and els[j]['kind'] == 'cards' and len(els[j]['items']) == 1 and els[j + 1]['kind'] == 'emph':
                parts = split_camel(els[j + 1]['text'])
                items.append({'title': els[j]['items'][0]['title'], 'sub': parts[0] if len(parts) > 1 else '', 'desc': parts[-1]})
                j += 2
            out.append({'kind': 'cards', 'items': items, 'profile': True}); i = j; continue
        # two-column language page: cards[1](+desc) list cards[1](+desc) list
        if k == 'cards' and len(e['items']) == 1 and i + 3 < len(els) and els[i + 1]['kind'] == 'list' and els[i + 2]['kind'] == 'cards' and len(els[i + 2]['items']) == 1 and els[i + 3]['kind'] == 'list':
            c1, l1, c2, l2 = e['items'][0], els[i + 1]['items'], els[i + 2]['items'][0], els[i + 3]['items']
            out.append({'kind': 'twocol', 'cols': [{'title': c1['title'], 'items': ([c1['desc']] if c1.get('desc') else []) + l1},
                                                   {'title': c2['title'], 'items': ([c2['desc']] if c2.get('desc') else []) + l2}]})
            i += 4; continue
        if k == 'cards' and len(e['items']) == 1 and not e.get('single'):  # "single": true keeps a lone card as a full-width card
            it = e['items'][0]
            out.append({'kind': 'subhead', 'title': it['title'], 'desc': it.get('desc', '')}); i += 1; continue
        if k == 'emph' and e['text'][:1] in '“"' and e['text'].rstrip()[-1:] in '”"':
            out.append({'kind': 'quote', 'text': e['text']}); i += 1; continue
        if k == 'body' and re.search(r'[a-z][A-Z]', e['text'].replace('WellPeps', 'X')) and len(split_camel(e['text'].replace('WellPeps', 'Wellpeps'))) >= 3 and len(e['text']) < 160:
            out.append({'kind': 'cards', 'items': [{'title': s.upper()} for s in split_camel(e['text'])]}); i += 1; continue
        out.append(e); i += 1
    return out


def promote_lead(els):
    if any(e['kind'] == 'lead' for e in els):
        return els
    for idx, e in enumerate(els):
        if e['kind'] in ('body', 'emph') and len(e['text']) <= 190:
            new = dict(e); new['kind'] = 'lead'
            return els[:idx] + [new] + els[idx + 1:]
        if e['kind'] not in ('body', 'emph'):
            break
    return els


# ---- element HTML -------------------------------------------------------------------
def render_el(e, book):
    k = e['kind']
    if k == 'lead':
        return f'<p class="lead">{glue(e["text"]).replace(chr(10), "<br>")}</p>'
    if k == 'body':
        return f'<p class="body">{linkify(esc(e["text"]), book)}</p>'
    if k == 'emph':
        # "clear": true drops the paragraph below a floated figure so text-wrap:balance can even out its lines
        cls = 'emph clear' if e.get('clear') else 'emph'
        return f'<p class="{cls}">{esc(e["text"]).replace(chr(10), "<br>")}</p>'
    if k == 'quote':
        return f'<p class="quote">{esc(e["text"])}</p>'
    if k == 'subhead':
        d = f'<p class="body">{esc(e["desc"])}</p>' if e.get('desc') else ''
        return f'<div class="subhead"><h4>{esc(e["title"])}</h4>{d}</div>'
    if k == 'list':
        n = len(e['items']); longest = max(len(x) for x in e['items'])
        cols = e.get('cols') or (2 if (n >= 5 and longest <= 40) else 1)  # 'cols' in the outline overrides the heuristic
        cls = 'list bold' if e.get('bold') else 'list'
        lis = ''.join(f'<li>{list_item(x)}</li>' for x in e['items'])
        return f'<ul class="{cls} cols{cols}">{lis}</ul>'
    if k == 'cards':
        return render_cards(e, book)
    if k == 'flow':
        # the arrow is an inline SVG, not U+2192: the bundled Inter subset has no glyph for it and Chromium would fall back to Arial
        arrow = '<div class="arrow"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 6h7M6 2.5 9.5 6 6 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
        steps = ''.join(f'<div class="step">{esc(s)}</div>' + (arrow if i < len(e['steps']) - 1 else '') for i, s in enumerate(e['steps']))
        return f'<div class="flow">{steps}</div>'
    if k == 'checklist':
        rows = ''.join(f'<div class="ck"><div class="num">{i:02d}</div><div class="ckt"><h4>{esc(it["title"])}</h4>' + (f'<p>{esc(it["desc"])}</p>' if it.get('desc') else '') + '</div></div>' for i, it in enumerate(e['items'], 1))
        return f'<div class="checklist">{rows}</div>'
    if k == 'callout':
        return f'<div class="callout"><img class="icon" src="{book["_icon"]}" alt=""><div class="ct"><h4>{CALLOUT_TITLE[e.get("style", "principle")]}</h4><p>{esc(e["text"])}</p></div></div>'
    if k == 'approach':
        return f'<div class="approach"><h4>THE WELLPEPS APPROACH</h4><p>{esc(e["text"])}</p></div>'
    if k == 'tagline':
        return f'<p class="ptag">{esc(e["text"])}</p>'
    if k == 'redflag':
        # bullet runs and short label-like lines (no full stop) render bold; everything else is body text
        ps = ''.join(f'<p class="{"emph" if ("•" in ln or (len(ln) < 48 and not ln.rstrip().endswith("."))) else "body"}">{esc(ln)}</p>' for ln in e['lines'])
        return f'<div class="redflag"><h4><svg class="tri" viewBox="0 0 10 9" width="10" height="9" aria-hidden="true"><path d="M5 0 10 9H0Z" fill="currentColor"/></svg> RED FLAG</h4>{ps}</div>'
    if k == 'twocol':
        # default: good (✓, blue) vs bad (✕, red). "style": "neutral" renders two equal blue columns with bullets,
        # for comparisons where neither side is wrong (oral vs topical, daily vs as needed).
        neutral = e.get('style') == 'neutral'
        cols = ''
        for c, col in enumerate(e['cols']):
            mark = '•' if neutral else ('✓' if c == 0 else '✕')
            cls = 'neu' if neutral else ('good' if c == 0 else 'bad')
            lis = ''.join(f'<li><span class="mk">{mark}</span>{esc(x)}</li>' for x in col['items'])
            cols += f'<div class="col {cls}"><h4>{esc(col["title"])}</h4><ul>{lis}</ul></div>'
        return f'<div class="twocol">{cols}</div>'
    return f'<!-- unknown {k} -->'


def list_item(x):
    """'Name — description' list items get a bold lead-in; anything else renders as plain text."""
    if ' — ' in x:
        name, desc = x.split(' — ', 1)
        return f'<b>{esc(name)}</b> — {esc(desc)}'
    return esc(x)


def render_cards(e, book):
    items = e['items']
    n = len(items)
    has_desc = any(i.get('desc') for i in items)
    if e.get('cols'):
        cols = e['cols']  # 'cols' in the outline overrides the heuristic (e.g. a four-step timeline in one row)
    elif e.get('profile'):
        cols = 3
    elif not has_desc:
        cols = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 3, 7: 4, 8: 4, 9: 3, 10: 5}.get(n, 4)
    else:
        cols = {1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4}.get(n, 3)
    cls = 'cards' + (' plain' if not has_desc else '') + (' profile' if e.get('profile') else '') + (' withimg' if any(i.get('image') for i in items) else '')
    if e.get('layout') == 'rows':  # one full-width row per item: photo slot at the left, text beside it (long copy costs width, not height)
        cls += ' rows'; cols = 1
    if e.get('style') == 'chips' and not has_desc:  # one-line labels as a wrapping row of centred chips instead of two-line-tall cards
        cls += ' chips' + (' grid' if e.get('cols') else '')  # with cols: a fixed grid of equal-width chips per column (2 x 2)
    if n == 5 and has_desc:
        cls += ' five'  # 3 across, then 2 wider: keeps the block symmetrical
    out = []
    for it in items:
        # card_image_ratio in the config (e.g. "4/3") sizes the slot to the photos so nothing is cropped; default 9/5
        ratio = book.get('_cimg_ratio')
        rstyle = f' style="aspect-ratio:{ratio}"' if ratio else ''
        im = f'<img class="cimg"{rstyle} src="{book["_imgs"][it["image"]]}" alt="">' if it.get('image') and it['image'] in book.get('_imgs', {}) else ''
        sub = f'<div class="csub">{esc(it["sub"])}</div>' if it.get('sub') else ''
        d = f'<p>{glue(it["desc"])}</p>' if it.get('desc') else ''
        out.append(f'<div class="card">{im}<div class="ctext"><h5>{esc(it["title"])}</h5>{sub}{d}</div></div>')
    return f'<div class="{cls}" style="--cols:{cols}">{"".join(out)}</div>'


def linkify(text, book):
    """Turn 'The Smart Patient's Guide to X' cross-references into links when a URL is known."""
    for s in book.get('series', []):
        t = esc(s['title'].replace('The ', '', 1))
        if t in text and s.get('url'):
            text = text.replace(t, f'<a href="{s["url"]}">{t}</a>')
    return text


# ---- pages ------------------------------------------------------------------------
def page_shell(book, num, kicker, inner, cls='', hero=None):
    hero_html = ''
    if hero:
        imgs = ''.join(f'<span class="hph"><img src="{h}" alt=""></span>' for h in hero)
        hero_html = f'<div class="hero n{len(hero)}">{imgs}</div>'
    if book.get('_theme') in ('editorial-v4', 'editorial-v5'):
        knum = '' if book['_theme'] == 'editorial-v5' else f'<span class="knum">{num}</span>'
        top = (f'<div class="runhead">SMART PATIENT GUIDE TO {esc(book["topic"])}</div>'
               f'<div class="kicker">{knum}<span class="ktext">{esc(kicker)}</span></div>')
    else:
        top = (f'<div class="runhead">{num}&nbsp;&nbsp;/&nbsp;&nbsp;SMART PATIENT GUIDE TO {esc(book["topic"])}</div>'
               f'<div class="banner">{esc(kicker)}</div>')
    return f'''<section class="page {cls}" data-num="{num}">
  {top}
  {hero_html}
  <div class="bodywrap{" hashero" if hero else ""}">{inner}</div>
  <div class="foot"><span></span><span class="pn">{num}</span></div>
</section>'''


def section_page(book, sec, cfg):
    els = promote_lead(normalize(sec['elements']))
    j = len(els)
    while j > 0 and els[j - 1]['kind'] in ('callout', 'approach', 'redflag', 'tagline') and not els[j - 1].get('inline'):  # "inline": true keeps a box in the text flow
        j -= 1
    body_els, bottom_els = els[:j], els[j:]
    kicker = cfg.get('kicker') or re.sub(r'[“”"?.:]', '', sec['headline']).upper()[:46]
    sub = f'<div class="sub">{esc(sec["subtitle"])}</div>' if sec.get('subtitle') else ''
    fig = ''
    if cfg.get('image') and not cfg.get('hero'):
        w = cfg.get('image_w', 3.05); h = cfg.get('image_h', 2.2)
        fx, fy = cfg.get('focus', (0.5, 0.4))
        minw = f' data-minw="{cfg["image_min_w"]}"' if cfg.get('image_min_w') else ''
        fig = f'<img class="figure"{minw} src="{img_uri(cfg["image"])}" style="width:{w}in;height:{h}in;object-position:{fx*100:.0f}% {fy*100:.0f}%" alt="">'
    after = cfg.get('image_after', 0)  # how many body elements run full-width before the figure enters the flow
    rendered = [render_el(e, book) for e in body_els]
    content = ''.join(rendered[:after]) + fig + ''.join(rendered[after:])
    bottom = ''.join(render_el(e, book) for e in bottom_els)
    icon = f' <img class="hicon" src="{img_uri(cfg["headline_icon"])}" alt="">' if cfg.get('headline_icon') else ''
    inner = f'<div class="head"><h2>{glue(sec["headline"]).replace(chr(10), "<br>")}{icon}</h2>{sub}<div class="rule"></div></div><div class="content">{content}</div><div class="bottom">{bottom}</div>'
    hero = [img_uri(p) for p in cfg['hero']] if cfg.get('hero') else None
    cls = 'section dense' if cfg.get('dense') else 'section'  # dense: one type step down so a long page holds on one sheet
    if cfg.get('lead_small'):
        cls += ' lead-sm'  # lead one size down, e.g. to hold a long lead to two lines
    if cfg.get('full_width_head'):
        cls += ' fullhead'  # headline and lead wrap edge to edge instead of balancing, for pages without a figure
    return page_shell(book, sec['num'], kicker, inner, cls=cls, hero=hero)


def why_page(book, sec, cfg):
    els = normalize(sec['elements'])
    cards = next((e for e in els if e['kind'] == 'cards'), None)
    approach = next((e for e in els if e['kind'] == 'approach'), None)
    texts = [e for e in els if e['kind'] in ('emph', 'body', 'quote', 'lead')]
    tag = next((e for e in texts if e['kind'] == 'emph'), None)
    intro = ''
    if tag:
        intro += f'<p class="tag">{esc(tag["text"])}</p>'; texts = [t for t in texts if t is not tag]
    for t in texts:
        intro += f'<p class="{"emph" if t["kind"] in ("emph", "quote") else "body"}">{esc(t["text"])}</p>'
    team = img_uri(cfg.get('image', os.path.join(MEDIA, 'image14.png')))
    grid = ''
    if cards:
        for it in cards['items']:
            t = it['title'] if not it['title'].isupper() else smart_title(it['title'])
            grid += f'<div class="fcard"><h5>{esc(t)}</h5><p>{esc(it.get("desc", ""))}</p></div>'
        grid = f'<div class="fgrid" style="--rows:{-(-len(cards["items"]) // 2)}">{grid}</div>'
    ap = render_el(approach, book) if approach else ''
    if not cards and approach and ' • ' in approach['text']:
        items = [x.strip() for x in approach['text'].split(' • ')]
        grid = '<div class="fgrid">' + ''.join(f'<div class="fcard plain"><h5>{esc(smart_title(x))}</h5></div>' for x in items) + '</div>'
        ap = ''
    inner = f'<div class="head"><h2>Why We Created WellPeps</h2><div class="rule"></div></div><div class="whytop"><div class="whyintro">{intro}</div><img class="team" src="{team}" alt=""></div><div class="content nosplit">{grid}</div><div class="bottom">{ap}</div>'
    return page_shell(book, sec['num'], cfg.get('kicker', 'WHY WE CREATED WELLPEPS'), inner, cls='why dense' if cfg.get('dense') else 'why')  # dense: one step down when eight cards + a long intro overflow


def decide_page(book, sec, num, cfg):
    els = normalize(sec['elements'])
    heads = []
    if els and els[0]['kind'] == 'list' and els[0].get('bold') and len(els[0]['items']) <= 2:
        heads = els.pop(0)['items']
    while els and els[0]['kind'] in ('emph', 'quote') and len(heads) < 2:
        heads.append(els.pop(0)['text'])
    headline = ' '.join(heads) if heads else 'Before You Decide'
    closing = ''
    if els and els[-1]['kind'] == 'emph' and els[-1]['text'].startswith('Be informed'):
        closing = f'<p class="closing">{esc(els.pop()["text"])}</p>'
    content = ''.join(render_el(e, book) for e in els)
    fig = ''
    if cfg.get('image'):
        fx, fy = cfg.get('focus', (0.5, 0.4))
        fig = f'<img class="band" src="{img_uri(cfg["image"])}" style="object-position:{fx*100:.0f}% {fy*100:.0f}%" alt="">'
    inner = f'<div class="head"><h2>{esc(headline)}</h2><div class="rule"></div></div><div class="content nosplit">{content}</div><div class="bottom decide">{fig}{closing}</div>'
    return page_shell(book, num, 'BEFORE YOU DECIDE', inner, cls='decide')


def cta_page(book, sec, num, cfg):
    bodies = ''.join(f'<p class="body">{esc(e["text"])}</p>' for e in sec['elements'] if e['kind'] == 'body')
    fx, fy = cfg.get('focus', (0.5, 0.4))
    button = cfg.get('button', 'Start Your Free Assessment')
    url = book['cta_url']
    inner = f'''<div class="ctahero">
  <img src="{img_uri(cfg["image"])}" style="object-position:{fx*100:.0f}% {fy*100:.0f}%" alt="">
  <div class="ctapanel">
    <h2>{glue(sec["headline"])}</h2>
    {bodies}
    <a class="btn" href="{url}">{esc(button)}</a>
    <p class="tiny">It only takes a few minutes.</p>
  </div>
</div>
<div class="ctabody">
  <p class="stack">Be informed.<br>Ask questions.<br>Become a Smart Patient<br>and get the comprehensive care you deserve.</p>
  <img class="logo" src="{img_uri(LOGO_BLUE)}" alt="WellPeps">
  <p class="tagline">Personalized Wellness. Simplified.</p>
  <p class="site"><a href="{url}">www.wellpeps.com</a></p>
</div>'''
    return page_shell(book, num, cfg.get('kicker', 'GET THE COMPREHENSIVE CARE YOU DESERVE'), inner, cls='cta')


def disclaimer_page(book, sec, theme='classic'):
    ps = ''.join(f'<p>{esc(t)}</p>' for t in sec['text'])
    dlogo = f'<img class="dlogo" src="{img_uri(LOGO_WHITE)}" alt="WellPeps">' if theme.startswith('editorial') else ''
    series = ''
    if book.get('series'):
        lis = ''.join(f'<li>{esc(s["title"])}</li>' for s in book['series'])
        series = f'<div class="series"><h4>MORE IN THE SMART PATIENT’S GUIDE SERIES</h4><ul>{lis}</ul></div>'
    return f'''<section class="page disclaimer">
  {dlogo}<div class="dtop">IMPORTANT INFORMATION</div>
  <h2>Educational information,<br>not medical advice.</h2>
  <div class="rule"></div>
  <div class="dtext">{ps}</div>
  {series}
  <div class="dbrand"><div class="wp">WELLPEPS</div><div class="ser">The Smart Patient’s Guide Series</div></div>
  <div class="dfoot">WELLPEPS&nbsp;&nbsp; | &nbsp;&nbsp;THE SMART PATIENT’S GUIDE&nbsp;&nbsp; | &nbsp;&nbsp;wellpeps.com</div>
</section>'''


def cover_page(book, cfg):
    style = cfg.get('cover_style', 'classic')
    fx, fy = cfg.get('cover_focus', (0.5, 0.35))
    photo = img_uri(cfg['cover'], crop=cfg.get('cover_crop'))
    pos = f'object-position:{fx*100:.0f}% {fy*100:.0f}%'
    title = esc(book['title'])
    tcls = 'long' if len(book['title']) > 22 else ''
    meta = cfg.get('cover_meta', 'A WellPeps Smart Patient Guide')
    if style == 'editorial':
        return f"""<section class="page cover cover-editorial">
  <img class="cphoto" src="{photo}" style="{pos}" alt="">
  <div class="shade"></div>
  <div class="ctop"><img class="clogo" src="{img_uri(LOGO_BLUE)}" alt="WellPeps"></div>
  <div class="cblock">
    <div class="eyebrow">THE SMART PATIENT’S GUIDE TO</div>
    <h1 class="{tcls}">{title}</h1>
    <div class="crule"></div>
    <p class="csub">{esc(book["subtitle"])}</p>
  </div>
  <div class="cbottom"><span>Personalized Wellness. Simplified.</span></div>
</section>"""
    if style == 'plate':
        return f"""<section class="page cover cover-plate">
  <img class="cphoto" src="{photo}" style="{pos}" alt="">
  <div class="navyfill"></div>
  <div class="plate">
    <div class="eyebrow">THE SMART PATIENT’S GUIDE TO</div>
    <h1 class="{tcls}">{title}</h1>
    <div class="crule"></div>
    <p class="csub">{esc(book["subtitle"])}</p>
  </div>
  <div class="cbottom"><img class="wlogo" src="{img_uri(LOGO_WHITE)}" alt="WellPeps"><div class="cmeta"><span>{esc(meta)}</span><span>Personalized Wellness. Simplified.</span></div></div>
</section>"""
    if style == 'minimal':
        return f"""<section class="page cover cover-minimal">
  <div class="ctop"><img class="clogo" src="{img_uri(LOGO)}" alt="WellPeps"><span class="series">SMART PATIENT GUIDE SERIES</span></div>
  <div class="cblock">
    <div class="eyebrow">THE SMART PATIENT’S GUIDE TO</div>
    <h1 class="{tcls}">{title}</h1>
    <div class="crule"></div>
    <p class="csub">{esc(book["subtitle"])}</p>
  </div>
  <img class="cphoto" src="{photo}" style="{pos}" alt="">
  <div class="cbottom"><span>{esc(meta)}</span><span>Personalized Wellness. Simplified.</span></div>
</section>"""
    # classic (original band layout)
    return f"""<section class="page cover cover-classic">
  <div class="ck">A WELLPEPS SMART PATIENT GUIDE</div>
  <div class="cband">THE SMART PATIENT’S GUIDE TO</div>
  <h1 class="{tcls}">{title}</h1>
  <p class="csub">{esc(book["subtitle"])}</p>
  <img class="cphoto" src="{photo}" style="{pos}" alt="">
  <div class="cfoot">Personalized Wellness. Simplified.</div>
</section>"""


CSS = r'''
__FONT_FACES__
:root{--navy:#173A5E;--blue:#1576C4;--slate:#243746;--ice:#F2F7FA;--ice2:#F5F9FC;--sky:#8BC7EE;--muted:#8294A1;--frame:#244466;--cardline:#0070C0;--red:#B3261E;--redbg:#FDF1EF}
*{box-sizing:border-box;margin:0;padding:0}
.nb{white-space:nowrap}
html,body{background:#fff}
body{font-family:Inter,Arial,sans-serif;font-optical-sizing:auto;color:var(--slate);-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:8.5in 11in;margin:0}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;page-break-after:always;break-after:page;background:#fff}
.page:last-child{page-break-after:auto}
h1,h2,h4,h5{font-weight:700;letter-spacing:-0.005em}
a{color:var(--blue);text-decoration:none}

/* running furniture */
.runhead{position:absolute;left:.58in;top:.18in;font-size:7.5pt;font-weight:700;color:var(--blue);letter-spacing:.02em}
.banner{position:absolute;left:0;top:.52in;width:8.5in;height:.62in;background:var(--navy);color:#fff;font-weight:700;font-size:16pt;padding-left:.62in;display:flex;align-items:center;letter-spacing:.01em}
.banner.small{font-size:14pt}
.foot{position:absolute;left:.58in;right:.58in;top:10.56in;display:flex;justify-content:space-between;font-size:6.8pt;font-weight:700;color:var(--blue);letter-spacing:.02em}
.foot .pn{font-size:7.5pt}
.bodywrap{position:absolute;left:.62in;top:1.40in;width:7.05in;height:8.95in;display:flex;flex-direction:column}
.bodywrap.hashero{top:4.75in;height:5.6in}
.hero{position:absolute;left:0;top:1.14in;width:8.5in;height:3.4in;display:flex}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero.n2 img{width:50%}
.head h2{font-size:28pt;line-height:1.08;color:var(--navy);letter-spacing:-0.012em;text-wrap:balance}
.head h2.l2{font-size:24pt}
.head h2.l3{font-size:21pt}
.head h2 .hicon{height:.42in;width:auto;vertical-align:-.06in;margin-left:.1in}
.head .sub{font-size:15pt;font-weight:700;color:var(--blue);margin-top:.08in}
.rule{width:3.8in;height:.03in;background:var(--blue);margin:.13in 0 .2in}
.head.cont .rule{margin-bottom:.16in}
.head .contlabel{font-size:8pt;font-weight:700;letter-spacing:.08em;color:var(--muted);margin-top:.06in}
.content{flex:0 0 auto}
.bottom{margin-top:auto;padding-top:.14in}
.bottom > * + *{margin-top:.14in}
.bottom:empty{display:none}

/* text */
p.lead{font-size:16pt;line-height:1.28;color:var(--blue);margin-bottom:.16in;letter-spacing:-0.004em}
p.body{font-size:12pt;line-height:1.4;margin-bottom:.12in}
.tight p.body{font-size:11.5pt;line-height:1.36;margin-bottom:.1in}
.tighter p.body{font-size:11pt;line-height:1.33;margin-bottom:.09in}
.tighter p.lead{font-size:15pt}
p.emph{font-size:14pt;line-height:1.3;font-weight:700;color:var(--navy);margin-bottom:.13in}
p.emph.clear{clear:both}
p.quote{font-size:19pt;line-height:1.2;font-weight:700;color:var(--blue);margin-bottom:.16in;letter-spacing:-0.01em}
.subhead{margin:.04in 0 .12in}
.subhead h4{font-size:11.5pt;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.06in}
.figure{float:right;object-fit:cover;margin:0 0 .16in .3in;display:block}
.list{list-style:none;margin:.02in 0 .14in;clear:none}
.list li{position:relative;padding-left:.28in;font-size:12pt;line-height:1.38;margin-bottom:.055in}
.list li::before{content:"";position:absolute;left:.04in;top:.10in;width:.09in;height:.09in;border-radius:50%;background:var(--blue)}
.list.bold li{font-weight:700;color:var(--navy)}
.list.cols2{display:grid;grid-template-columns:1fr 1fr;column-gap:.3in}
.tight .list li,.tighter .list li{font-size:11.5pt;line-height:1.34}

/* cards */
.cards{display:grid;grid-template-columns:repeat(var(--cols),1fr);grid-auto-rows:1fr;gap:.14in;margin:.06in 0 .18in;clear:both}
.card{background:var(--ice);border:1px solid var(--sky);border-radius:7px;padding:.16in .14in;text-align:left;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;box-shadow:0 1px 2px rgba(23,58,94,.08)}
.card h5{font-size:11pt;color:var(--blue);text-transform:uppercase;letter-spacing:.03em;line-height:1.2}
.card p{font-size:11.5pt;line-height:1.3;margin-top:.08in;color:var(--slate)}
.cards.plain .card{padding:.12in .1in;min-height:.81in}
.cards.plain .card h5{text-transform:none;font-size:12.5pt;letter-spacing:0;color:var(--navy);line-height:1.22}
.cards.profile .card{align-items:stretch;text-align:left;padding:.16in .16in}
.cards.profile .card h5{font-size:11pt}
.cards.profile .csub{font-size:11pt;font-weight:700;color:var(--navy);margin-top:.04in}
.cards.profile .card p{text-align:left;font-size:11pt;margin-top:.06in}
.cimg{width:100%;height:1.1in;object-fit:cover;border-radius:5px;margin-bottom:.12in}
.cards.withimg .card{padding-top:.1in}
.flow{display:flex;align-items:stretch;gap:.08in;margin:.08in 0 .2in;clear:both}
.flow .step{flex:1;background:var(--ice);border:1px solid var(--sky);border-radius:7px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10.5pt;font-weight:700;color:var(--blue);padding:.12in .1in;min-height:.72in;letter-spacing:.02em}
.flow .step:last-child{background:var(--navy);border-color:var(--navy);color:#fff}
.flow .arrow{display:flex;align-items:center;color:var(--blue);font-size:18pt;font-weight:700;padding:0 .02in}
.checklist{clear:both;margin-top:.06in}
.checklist.fill{display:flex;flex-direction:column;justify-content:space-between}.checklist.fill + p.body{margin-top:.28in;font-size:11pt;color:var(--muted)}.checklist.fill .ck{margin-bottom:0}
.ck{display:grid;grid-template-columns:.78in 1fr;column-gap:.21in;margin-bottom:.19in;align-items:start}
.ck .num{width:.78in;height:.78in;border-radius:7px;background:var(--blue);color:#fff;font-weight:700;font-size:16pt;display:flex;align-items:center;justify-content:center}
.ck h4{font-size:15pt;color:var(--blue);line-height:1.15;margin-top:-.01in}
.ck p{font-size:12.5pt;line-height:1.36;margin-top:.06in}
.tight .ck{margin-bottom:.14in}.tight .ck p{font-size:11.5pt}
.twocol{display:grid;grid-template-columns:1fr 1fr;gap:.2in;margin:.06in 0 .18in;clear:both}
.twocol .col{border-radius:7px;padding:.18in .22in .16in}
.twocol .good{background:var(--ice);border:1px solid var(--sky)}
.twocol .bad{background:var(--redbg);border:1px solid var(--red)}
.twocol h4{font-size:11pt;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.12in}
.twocol .good h4{color:var(--blue)}.twocol .bad h4{color:var(--red)}
.twocol ul{list-style:none}
.twocol li{font-size:12pt;line-height:1.35;margin-bottom:.07in;padding-left:.28in;position:relative}
.twocol .mk{position:absolute;left:0;top:0;font-weight:700}
.twocol .good .mk{color:var(--blue)}.twocol .bad .mk{color:var(--red)}
.twocol .neu{background:#fff;border:1px solid var(--edge,#C6D9EA)}.twocol .neu h4{color:var(--blue)}.twocol .neu .mk{color:var(--blue)}

/* callouts */
.callout{position:relative;border:1.5px solid var(--frame);border-radius:7px;background:#fff;min-height:1.1in;padding:.26in .28in .24in 1.36in}
.callout .icon{position:absolute;left:-.17in;top:.04in;width:1.45in;height:1.1in}
.callout h4{font-size:15pt;color:var(--blue);letter-spacing:.06em;text-transform:uppercase}
.callout p{font-size:13pt;line-height:1.3;margin-top:.07in}
.approach{background:var(--navy);border-radius:7px;padding:.2in .22in .2in;color:#fff}
.approach h4{font-size:15pt;color:var(--sky);letter-spacing:.06em;text-transform:uppercase}
.approach p{font-size:13pt;line-height:1.3;margin-top:.07in}
.redflag{background:var(--redbg);border:1.5px solid var(--red);border-radius:7px;padding:.2in .24in .12in}
.redflag h4{font-size:14pt;color:var(--red);letter-spacing:.06em;margin-bottom:.08in}
.redflag .tri{width:.13in;height:.12in;vertical-align:-.005in;margin-right:.03in;color:var(--red)}
.redflag p.body{font-size:12.5pt;margin-bottom:.07in}
.redflag p.emph{font-size:12.5pt;margin-bottom:.07in}
.bottom .callout + .approach{margin-top:.14in}
.content .callout,.content .approach,.content .redflag{margin:.04in 0 .18in;clear:both}

.compact .callout{min-height:.95in;padding:.2in .24in .18in 1.2in}
.compact .callout .icon{width:1.25in;height:.95in;left:-.14in}
.compact .callout h4,.compact .approach h4{font-size:13.5pt}
.compact .callout p,.compact .approach p{font-size:12pt;line-height:1.28;margin-top:.05in}
.compact .approach{padding:.16in .2in .16in}
.compact .bottom{padding-top:.1in}.compact .bottom > * + *{margin-top:.1in}
.tight .fcard{min-height:.9in;padding:.12in .14in .11in}.tight .fcard p{font-size:11pt}.tight .fcard h5{font-size:12.5pt}
.tight .whyintro p.body{font-size:11.5pt}.tight .whytop{margin-bottom:.16in}
.tight .cards{gap:.11in;margin-bottom:.14in}.tight .card p{font-size:11pt}
.ptag{text-align:center;font-size:16pt;font-weight:700;color:var(--blue);margin-top:.04in}
/* why page */
.whytop{display:grid;grid-template-columns:1fr 2.65in;column-gap:.3in;margin-bottom:.22in}
.whyintro .tag{font-size:17pt;font-weight:700;color:var(--blue);line-height:1.2;margin-bottom:.12in}
.whyintro p.body{font-size:12pt}
.team{width:2.65in;height:1.77in;object-fit:cover;object-position:50% 35%;display:block}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:.14in .27in}
.fcard{background:var(--ice2);border:1px solid var(--cardline);border-radius:7px;padding:.15in .16in .14in;min-height:1.05in}
.fcard h5{font-size:13.5pt;color:var(--blue);line-height:1.15;margin-bottom:.07in}
.fcard p{font-size:11.5pt;line-height:1.32}
.fcard.plain{min-height:.7in;display:flex;align-items:center}.fcard.plain h5{margin:0}

/* decide */
.bottom.decide{display:flex;flex-direction:column;gap:.18in}
.band{width:7.05in;height:2.6in;object-fit:cover;display:block;border-radius:6px}
.closing{font-size:20pt;font-weight:700;color:var(--navy);line-height:1.2}

/* cta */
.cta .bodywrap{position:static;display:block;height:auto}
.cta .ctahero{position:absolute;left:0;top:1.14in;width:8.5in;height:4.0in;background:#F6F2EB}
.cta .ctahero img{position:absolute;left:0;top:0;width:4.6in;height:100%;object-fit:cover;display:block}
.cta .ctapanel{position:absolute;left:3.85in;right:0;top:0;height:100%;padding:.34in .58in .28in .95in;overflow:hidden;background:linear-gradient(90deg,rgba(246,242,235,0) 0,#F6F2EB .75in);display:flex;flex-direction:column;justify-content:center}
.cta .ctapanel h2{font-size:25pt;line-height:1.1;color:var(--navy);letter-spacing:-0.012em;margin-bottom:.14in;text-wrap:balance}
.cta .ctapanel p.body{font-size:11.5pt;line-height:1.38;color:var(--slate);margin-bottom:.16in}
.cta .btn{display:inline-block;align-self:flex-start;background:var(--blue);color:#fff;font-weight:700;font-size:12.5pt;padding:.14in .36in;border-radius:6px}
.cta .tiny{font-size:9.5pt;font-weight:700;color:var(--slate);margin-top:.12in}
.cta .ctabody{position:absolute;left:.62in;top:5.55in;width:7.2in}
.cta .ctapanel.tight h2{font-size:21pt;margin-bottom:.1in}.cta .ctapanel.tight p.body{font-size:10.5pt;line-height:1.34;margin-bottom:.1in}.cta .ctapanel.tight .btn{font-size:11.5pt;padding:.12in .3in}.cta .ctapanel.tight .tiny{margin-top:.08in}
.cta .ctapanel.tighter h2{font-size:19pt}.cta .ctapanel.tighter p.body{font-size:10pt;line-height:1.3;margin-bottom:.08in}
.cta .stack{font-size:22pt;font-weight:700;color:var(--navy);line-height:1.22;letter-spacing:-0.01em}
.cta .logo{display:block;width:2.6in;margin:.42in 0 0 -.06in}
.cta .tagline{font-size:18pt;font-weight:700;color:var(--blue);margin-top:.18in}
.cta .site{font-size:16pt;font-weight:700;margin-top:.08in}

/* cover */
.cover-classic .ck{position:absolute;left:.7in;top:.72in;white-space:nowrap;font-size:8pt;font-weight:700;color:var(--blue);letter-spacing:.06em}
.cover-classic .cband{position:absolute;left:0;top:1.71in;width:8.5in;height:.67in;background:var(--navy);color:#fff;font-size:24pt;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:.01em}
.cover-classic h1{position:absolute;left:.4in;right:.4in;top:2.55in;text-align:center;font-size:40pt;color:var(--navy);line-height:1.05;letter-spacing:-0.015em}
.cover-classic h1.long{font-size:32pt}
.cover-classic .csub{position:absolute;left:.7in;right:.7in;top:3.78in;text-align:center;font-size:15pt;font-weight:700;color:var(--blue);line-height:1.25}
.cover-classic .cphoto{position:absolute;left:0;top:4.6in;width:8.5in;height:5.98in;object-fit:cover;display:block}
.cover-classic .cfoot{position:absolute;left:0;bottom:0;width:8.5in;height:.42in;background:var(--navy);color:#fff;font-size:9pt;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:.04em}

/* ---- cover: editorial (full-bleed photo, type on a navy shade) ---- */
.cover-editorial .cphoto{position:absolute;inset:0;width:8.5in;height:11in;object-fit:cover;display:block}
.cover-editorial .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 22%,rgba(23,58,94,.55) 58%,rgba(23,58,94,.96) 100%)}
.cover-editorial .ctop{position:absolute;left:.62in;top:.58in}
.cover-editorial .clogo{height:.56in;width:auto;display:block}
.cover .wlogo{height:.46in;width:auto;display:block}
.cover .series{font-size:8.5pt;font-weight:700;letter-spacing:.14em;color:#fff}
.cover-editorial .series,.cover-editorial .wlogo{text-shadow:0 1px 6px rgba(6,31,66,.45);filter:drop-shadow(0 1px 4px rgba(6,31,66,.35))}
.cover-editorial .cblock{position:absolute;left:.7in;right:.7in;bottom:1.55in}
.cover .eyebrow{font-size:10pt;font-weight:700;letter-spacing:.16em;color:var(--sky)}
.cover-editorial .eyebrow{font-size:13pt;letter-spacing:.14em}
.cover-editorial h1{margin-top:.18in;font-size:58pt;line-height:.98;letter-spacing:-0.025em;color:#fff;text-wrap:balance;max-width:6.6in}
.cover-editorial h1.long{font-size:44pt}
.cover .crule{width:1.1in;height:.05in;background:var(--sky);margin:.3in 0 .26in}
.cover-editorial .csub{font-size:17pt;line-height:1.35;color:#fff;max-width:6in;font-weight:500;text-wrap:balance}
.cover-editorial .cbottom{position:absolute;left:.7in;right:.7in;bottom:.62in;display:flex;justify-content:flex-start;font-size:8.5pt;font-weight:700;letter-spacing:.08em;color:var(--sky);text-transform:uppercase;border-top:1px solid rgba(139,199,238,.45);padding-top:.22in}

/* ---- cover: plate (photo top, navy base, white title card bridging the seam) ---- */
.cover-plate .cphoto{position:absolute;left:0;top:0;width:8.5in;height:6.9in;object-fit:cover;display:block}
.cover-plate .navyfill{position:absolute;left:0;top:6.9in;width:8.5in;height:4.1in;background:var(--navy)}
.cover-plate .plate{position:absolute;left:.7in;right:.7in;top:5.55in;background:#fff;padding:.5in .55in .52in;box-shadow:0 .22in .6in rgba(6,31,66,.28)}
.cover-plate .plate .eyebrow{color:var(--blue)}
.cover-plate h1{margin-top:.14in;font-size:44pt;line-height:1.0;letter-spacing:-0.02em;color:var(--navy);text-wrap:balance}
.cover-plate h1.long{font-size:34pt}
.cover-plate .crule{background:var(--blue);margin:.24in 0 .22in}
.cover-plate .csub{font-size:14pt;line-height:1.35;color:var(--slate);max-width:6in;text-wrap:balance}
.cover-plate .cbottom{position:absolute;left:.7in;right:.7in;bottom:.6in;display:flex;justify-content:space-between;align-items:flex-end}
.cover-plate .cmeta{display:flex;flex-direction:column;align-items:flex-end;gap:.06in;font-size:8.5pt;font-weight:700;letter-spacing:.08em;color:var(--sky);text-transform:uppercase}

/* ---- cover: minimal (white ground, generous margins, photo as a framed plate) ---- */
.cover-minimal .ctop{position:absolute;left:.7in;right:.7in;top:.62in;display:flex;justify-content:space-between;align-items:center}
.cover-minimal .clogo{height:.5in;width:auto;display:block}
.cover-minimal .series{color:var(--blue)}
.cover-minimal .cblock{position:absolute;left:.7in;right:.7in;top:1.9in}
.cover-minimal .eyebrow{color:var(--blue)}
.cover-minimal h1{margin-top:.16in;font-size:52pt;line-height:.98;letter-spacing:-0.025em;color:var(--navy);text-wrap:balance;max-width:6.8in}
.cover-minimal h1.long{font-size:40pt}
.cover-minimal .crule{background:var(--blue)}
.cover-minimal .csub{font-size:15pt;line-height:1.35;color:var(--slate);max-width:5.4in;text-wrap:balance}
.cover-minimal .cphoto{position:absolute;left:.7in;top:5.55in;width:7.1in;height:4.35in;object-fit:cover;display:block;border-radius:6px}
.cover-minimal .cbottom{position:absolute;left:.7in;right:.7in;bottom:.6in;display:flex;justify-content:space-between;font-size:8.5pt;font-weight:700;letter-spacing:.08em;color:var(--blue);text-transform:uppercase}

/* ---- editorial interior theme: carries the cover language into the pages ---- */
.theme-editorial .runhead{color:var(--muted);letter-spacing:.08em}
.theme-editorial .banner{font-size:11.5pt;letter-spacing:.16em;color:var(--sky);font-weight:700}
.theme-editorial .banner.small{font-size:10.5pt}
.theme-editorial .rule{width:1.1in;height:.05in;background:var(--sky);margin:.16in 0 .22in}
.theme-editorial .foot{color:var(--muted);letter-spacing:.08em;border-top:1px solid #DCE6F0;padding-top:.09in;top:10.46in}
.theme-editorial-v4 .foot{border-top-color:#EEF3F7}
.theme-editorial .foot .pn{color:var(--navy)}
.theme-editorial p.lead{color:var(--navy);font-weight:500}
.theme-editorial .callout{border:0;background:var(--ice);border-left:.07in solid var(--navy);border-radius:0 8px 8px 0;padding-left:1.42in}
.theme-editorial .callout .icon{left:-.1in}
.theme-editorial .callout h4{color:var(--navy)}
.theme-editorial .approach{border-radius:8px}
.theme-editorial .card{background:#fff;border:1px solid #D5E3EF;box-shadow:0 1px 3px rgba(23,58,94,.10)}
.theme-editorial .cards.plain .card h5{color:var(--navy)}
.theme-editorial .fcard{background:#fff;border:1px solid #D5E3EF;border-left:.05in solid var(--blue)}
.theme-editorial .ck .num{background:var(--navy)}
.theme-editorial .ck h4{color:var(--navy)}
.theme-editorial .subhead h4,.theme-editorial .card h5,.theme-editorial .twocol .good h4{color:var(--blue)}
.theme-editorial .flow .step{background:#fff;border-color:#D5E3EF}
.theme-editorial .flow .step:last-child{background:var(--navy);border-color:var(--navy);color:#fff}  /* the editorial repaint above must not turn the final step white-on-white */
.theme-editorial .cta .ctahero{background:var(--navy)}
.theme-editorial .cta .ctapanel{background:linear-gradient(90deg,rgba(23,58,94,0) 0,var(--navy) .75in)}
.theme-editorial .cta .ctapanel h2{color:#fff}
.theme-editorial .cta .ctapanel p.body{color:#DCE6F0}
.theme-editorial .cta .btn{background:#fff;color:var(--navy)}
.theme-editorial .cta .tiny{color:var(--sky)}
.theme-editorial .cta .stack{color:var(--navy)}
.theme-editorial .disclaimer .dlogo{position:absolute;right:.7in;top:.66in;height:.46in;width:auto}
.theme-editorial .disclaimer .rule{width:1.1in;height:.05in}

/* editorial v3: navy header band + tinted page (adds to v2 accents) */
.theme-editorial-v3 .page{background:#F3F7FA}
.theme-editorial-v3 .page.cover,.theme-editorial-v3 .page.disclaimer{background:var(--navy)}
.theme-editorial-v3 .page.cover{background:#fff}
.theme-editorial-v3 .page.section:not(.has-hero)::before,.theme-editorial-v3 .page.why::before,.theme-editorial-v3 .page.decide::before{content:'';position:absolute;left:0;top:.52in;width:8.5in;height:var(--headh,2.3in);background:var(--navy)}
.theme-editorial-v3 .page:not(.has-hero) .head h2,.theme-editorial-v3 .page.why .head h2,.theme-editorial-v3 .page.decide .head h2{color:#fff}
.theme-editorial-v3 .page:not(.has-hero) .head .sub{color:var(--sky)}
.theme-editorial-v3 .page:not(.has-hero) .head .contlabel{color:var(--sky)}
.theme-editorial-v3 .page:not(.has-hero) .head .rule{margin-bottom:.34in}
.theme-editorial-v3 .page.has-hero .head h2{color:var(--navy)}
.theme-editorial-v3 .callout{background:#fff}
.theme-editorial-v3 .redflag{background:#fff}
.theme-editorial-v3 .twocol .good{background:#fff}
.theme-editorial-v3 .cta .ctahero{box-shadow:none}
.theme-editorial-v3 .fcard,.theme-editorial-v3 .card{background:#fff}
.theme-editorial-v3 .list li::before{background:var(--navy)}
.theme-editorial-v3 .whytop .team{border-radius:0}

/* ---- editorial v4: no bands. Numbered kicker label + Lora display headline + brand tokens ---- */
.theme-editorial-v4{--navy:#1C2961;--blue:#1576C4;--sky:#8BC7EE;--accent:#2EA8F7;--slate:#243746;--hair:#D3DFEA;--ink:#33475A}
.theme-editorial-v4 .page{background:#FAFCFD}
.theme-editorial-v4 .page.cover{background:#fff}
.theme-editorial-v4 .page.disclaimer{background:var(--navy)}
.theme-editorial-v4 .cover-editorial .shade{background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 22%,rgba(28,41,97,.55) 58%,rgba(28,41,97,.96) 100%)}
.theme-editorial-v4 .runhead{top:.42in;left:.62in;color:var(--muted);font-size:7.5pt;letter-spacing:.14em;font-weight:600}
.theme-editorial-v4 .kicker{position:absolute;left:.62in;width:7.26in;top:.78in;display:flex;align-items:center;gap:.16in;padding-bottom:.14in;border-bottom:1px solid var(--hair)}
.theme-editorial-v4 .knum{flex:0 0 auto;width:.4in;height:.4in;background:var(--navy);color:#fff;font-weight:700;font-size:11pt;display:flex;align-items:center;justify-content:center;border-radius:3px;letter-spacing:.02em}
.theme-editorial-v4 .ktext{font-size:10pt;font-weight:700;letter-spacing:.18em;color:var(--blue)}
.theme-editorial-v4 .ktext.small{font-size:9pt;letter-spacing:.14em}
.theme-editorial-v4 .bodywrap{top:1.62in;height:8.72in}
.theme-editorial-v4 .head h2{font-family:Lora,Georgia,serif;font-weight:600;font-size:31pt;line-height:1.1;letter-spacing:-0.01em;color:var(--navy)}
.theme-editorial-v4 .head h2.l2{font-size:27pt}
.theme-editorial-v4 .head h2.l3{font-size:24pt}
.theme-editorial-v4 .head .sub{color:var(--blue);font-size:14pt;margin-top:.1in}
.theme-editorial-v4 .head .contlabel{color:var(--muted)}
.theme-editorial-v4 p.body,.theme-editorial-v4 .callout p,.theme-editorial-v4 .approach p,.theme-editorial-v4 .card h5,.theme-editorial-v4 .card p,.theme-editorial-v4 .fcard p,.theme-editorial-v4 .ck h4,.theme-editorial-v4 .ck p,.theme-editorial-v4 .redflag p{text-wrap:pretty}
.theme-editorial-v4 .rule{width:.9in;height:.05in;background:var(--accent);margin:.18in 0 .26in}
.theme-editorial-v4 p.lead,.theme-editorial-v4 .head .sub,.theme-editorial-v4 p.emph,.theme-editorial-v4 .whyintro .tag,.theme-editorial-v4 .cta .ctapanel h2{text-wrap:balance}
.theme-editorial-v4 .page.fullhead .head h2,.theme-editorial-v4 .page.fullhead p.lead,.theme-editorial-v4 .page.fullhead .head .sub{text-wrap:pretty}
.theme-editorial-v4 p.lead{font-size:15.5pt;line-height:1.38;font-weight:500;color:var(--navy);margin-bottom:.2in}
.theme-editorial-v4 p.body{font-size:11.5pt;line-height:1.55;margin-bottom:.15in;color:var(--ink)}
.theme-editorial-v4 p.emph{font-size:13pt;line-height:1.35;margin:.04in 0 .16in}
.theme-editorial-v4 .spacious p.body{font-size:12.5pt;line-height:1.6;margin-bottom:.18in}
.theme-editorial-v4 .spacious p.lead{font-size:17pt;margin-bottom:.24in}
.theme-editorial-v4 .spacious p.emph{font-size:14pt}
.theme-editorial-v4 .tight p.body{font-size:11pt;line-height:1.45;margin-bottom:.11in}
.theme-editorial-v4 .tight p.lead{font-size:14.5pt;margin-bottom:.16in}
.theme-editorial-v4 .tighter p.body{font-size:10.5pt;line-height:1.4;margin-bottom:.1in}
.theme-editorial-v4 .tighter p.lead{font-size:14pt}
.theme-editorial-v4 .list li{font-size:11.5pt;line-height:1.5;color:var(--ink)}
.theme-editorial-v4 .list li::before{background:var(--blue)}
.theme-editorial-v4 .list li b{color:var(--navy);font-weight:700}
.theme-editorial-v4 .page.lead-sm p.lead{font-size:13pt;line-height:1.38;letter-spacing:-0.01em}
.theme-editorial-v4 .page.dense .head h2{font-size:25pt}
.theme-editorial-v4 .page.dense .rule{margin:.12in 0 .16in}
.theme-editorial-v4 .page.dense p.lead{font-size:13.5pt;margin-bottom:.12in}
.theme-editorial-v4 .page.dense .callout h4,.theme-editorial-v4 .page.dense .approach h4{font-size:10.5pt}
.theme-editorial-v4 .page.dense .callout p,.theme-editorial-v4 .page.dense .approach p{font-size:11.5pt;line-height:1.3;margin-top:.05in}
.theme-editorial-v4 .page.dense .callout{padding:.13in .2in .12in 1.14in;min-height:.85in}
.theme-editorial-v4 .page.dense .callout .icon{width:1.1in;height:.83in;left:-.07in}
.theme-editorial-v4 .page.dense .approach{padding:.12in .2in}
.theme-editorial-v4 .page.dense .bottom{padding-top:.12in}
.theme-editorial-v4 .page.dense p.body{font-size:10.5pt;line-height:1.42;margin-bottom:.1in}
.theme-editorial-v4 .page.dense .list{margin-bottom:.1in}
.theme-editorial-v4 .page.dense .list li{font-size:10.5pt;line-height:1.38;margin-bottom:.04in}
.theme-editorial-v4 .page.dense .subhead{margin:.02in 0 .08in}
.theme-editorial-v4 .page.dense .subhead h4{font-size:12pt}
.theme-editorial-v4 .subhead h4{color:var(--navy);text-transform:none;letter-spacing:0;font-size:13pt;font-weight:700;margin-bottom:.05in}
.theme-editorial-v4 .figure{margin:0 0 .18in .34in;border-radius:4px}
.theme-editorial-v4{--edge:#C6D9EA}
/* shadows: body.shadow-blur = original CSS box-shadow (transparent rasters in the PDF; needs flattening for Apple Preview);
   body.shadow-tile = opaque 9-slice image behind each element (no PDF transparency) */
.shadow-blur.theme-editorial-v4{--lift:0 2px 4px rgba(8,43,89,.10),0 8px 18px rgba(8,43,89,.14)}
.shadow-blur.theme-editorial-v4 .card,.shadow-blur.theme-editorial-v4 .fcard,.shadow-blur.theme-editorial-v4 .flow .step,.shadow-blur.theme-editorial-v4 .twocol .col,.shadow-blur.theme-editorial-v4 .callout,.shadow-blur.theme-editorial-v4 .redflag,.shadow-blur.theme-editorial-v4 .hph{box-shadow:var(--lift)}
.shadow-blur.theme-editorial-v4 .approach{box-shadow:0 2px 4px rgba(8,43,89,.16),0 8px 18px rgba(8,43,89,.22)}
.shadow-blur.theme-editorial-v4 .hph{border-radius:6px}
.shadow-tile.theme-editorial-v4 .page{isolation:isolate}
.shadow-tile.theme-editorial-v4 .card,.shadow-tile.theme-editorial-v4 .fcard,.shadow-tile.theme-editorial-v4 .flow .step,.shadow-tile.theme-editorial-v4 .twocol .col,.shadow-tile.theme-editorial-v4 .callout,.shadow-tile.theme-editorial-v4 .redflag,.shadow-tile.theme-editorial-v4 .approach,.shadow-tile.theme-editorial-v4 .hph{position:relative}
.shadow-tile.theme-editorial-v4 .card::before,.shadow-tile.theme-editorial-v4 .fcard::before,.shadow-tile.theme-editorial-v4 .flow .step::before,.shadow-tile.theme-editorial-v4 .twocol .col::before,.shadow-tile.theme-editorial-v4 .callout::before,.shadow-tile.theme-editorial-v4 .redflag::before,.shadow-tile.theme-editorial-v4 .approach::before,.shadow-tile.theme-editorial-v4 .hph::before{content:"";position:absolute;left:-28px;right:-28px;top:-28px;bottom:-36px;z-index:-1;pointer-events:none;border-style:solid;border-width:28px 28px 36px 28px;border-image:url(__SHADOW_TILE__) 56 56 72 56 / 28px 28px 36px 28px stretch}
.theme-editorial-v4 .hph{display:block;height:100%}
.theme-editorial-v4 .hph img{width:100%;height:100%;object-fit:cover;display:block;border-radius:6px}
.theme-editorial-v4 .card{border:1px solid var(--edge);border-radius:8px;padding:.18in .16in}
.theme-editorial-v4 .cards{gap:.15in}
.cards.five{grid-template-columns:repeat(6,1fr);grid-auto-rows:auto}  /* the two wider cards in row 2 size to their own copy instead of stretching to row 1's tallest card */
.cards.five .card:nth-child(-n+3){grid-column:span 2}
.cards.five .card:nth-child(n+4){grid-column:span 3}
.theme-editorial-v4 .cards.five .card h5{text-transform:none;letter-spacing:0;font-size:12pt;color:var(--navy)}
.theme-editorial-v4 .cards.five .card p{font-size:10.5pt;line-height:1.36;margin-top:.06in}
.theme-editorial-v4 .cards.plain .card{padding:.1in .1in;min-height:.78in}
.theme-editorial-v4 .fcard,.theme-editorial-v4 .flow .step{border-color:var(--edge)}
.theme-editorial-v4 .twocol .good{border-color:var(--edge)}
.theme-editorial-v4 .card h5{font-size:9.5pt;letter-spacing:.16em}
.theme-editorial-v4 .card p{font-size:11pt;line-height:1.38;color:var(--ink)}
.theme-editorial-v4 .cards.plain .card h5{font-size:12pt;letter-spacing:0;color:var(--navy)}
/* chips: a plain cards element with "style": "chips" in the outline. Auto-width, centred, single-line labels that wrap
   into as many rows as they need (the flow steps' look, without arrows), for lists where every label is one line and a
   two-line-tall card grid would be mostly air (Healthy Aging 04). */
.cards.chips{display:flex;flex-wrap:wrap;justify-content:flex-start;gap:.1in .1in;margin:.08in 0 .2in}
.cards.chips.grid{display:grid;grid-template-columns:repeat(var(--cols),max-content);grid-auto-rows:auto;justify-content:start}
.cards.chips.grid .card{justify-self:stretch}
.cards.chips .card{flex:0 0 auto;min-height:0;padding:.1in .22in;justify-content:center;align-items:center;text-align:center}
.theme-editorial-v4 .cards.chips .card{padding:.09in .2in;min-height:0;border-radius:6px}  /* min-height:0 beats the plain-card .78in rule above at equal specificity */
.theme-editorial-v4 .cards.chips .card h5{font-size:11.5pt;letter-spacing:.01em;white-space:nowrap}
.tight .cards.chips{gap:.08in .1in}
.theme-editorial-v4 .cards.withimg .card{justify-content:flex-start;padding:.14in}
.theme-editorial-v4 .cards.withimg .cimg{flex:0 0 auto;width:100%;height:auto;aspect-ratio:9/5;object-fit:cover;border-radius:4px;margin-bottom:.14in}
.cards.rows{grid-auto-rows:auto}.cards.rows .card{display:grid;grid-template-columns:1.35in 1fr;column-gap:.2in;align-items:center;padding:.11in .18in .11in .11in}.cards.rows .ctext{min-width:0}.cards.rows .ctext h5{margin-top:0}.theme-editorial-v4 .cards.rows .cimg{aspect-ratio:4/3;width:100%;height:auto;margin:0;border-radius:4px}.theme-editorial-v4 .cards.rows.profile .card p{margin-top:.05in}.theme-editorial-v4 .cards.rows{gap:.13in}
.theme-editorial-v4 .cards.withimg .card h5{margin-bottom:.02in}
.theme-editorial-v4 .cards.withimg .card p{margin-top:.06in}
.theme-editorial-v4 .callout{background:#fff;border-left:.07in solid var(--blue);border-radius:0 8px 8px 0;padding:.16in .22in .15in 1.22in;min-height:.95in}
.theme-editorial-v4 .callout .icon{width:1.2in;height:.9in;left:-.08in;top:.025in}
.theme-editorial-v4 .compact .callout .icon{width:1.1in;height:.83in;left:-.07in}
.theme-editorial-v4 .callout h4{font-size:12pt;letter-spacing:.14em;color:var(--blue);font-weight:700}
.theme-editorial-v4 .callout p{font-size:14pt;line-height:1.38;margin-top:.08in;color:var(--navy);font-weight:500}
.theme-editorial-v4 .approach{background:var(--navy);border-radius:8px;padding:.15in .22in .15in}
.theme-editorial-v4 .approach h4{font-size:12pt;letter-spacing:.14em;color:var(--accent)}
.theme-editorial-v4 .approach p{font-size:13.5pt;line-height:1.42;margin-top:.08in;color:#E6EEF6}
.theme-editorial-v4 .bottom{padding-top:.16in}
.theme-editorial-v4 .bottom > * + *{margin-top:.1in}
.theme-editorial-v4 .compact .callout{padding:.14in .2in .13in 1.14in;min-height:.88in}
.theme-editorial-v4 .compact .callout h4,.theme-editorial-v4 .compact .approach h4{font-size:11pt}
.theme-editorial-v4 .compact .callout p,.theme-editorial-v4 .compact .approach p{font-size:12.5pt;line-height:1.32}
.theme-editorial-v4 .compact .approach{padding:.13in .2in}
.theme-editorial-v4 .ptag{font-family:Lora,Georgia,serif;font-weight:600;font-size:15pt;color:var(--navy)}
.theme-editorial-v4 .ck h4{font-family:Lora,Georgia,serif;font-weight:600;font-size:15pt;color:var(--navy)}
.theme-editorial-v4 .ck p{font-size:12pt;line-height:1.42;color:var(--ink)}
.theme-editorial-v4 .ck .num{background:var(--navy);font-size:15pt}
.theme-editorial-v4 .checklist.fill + p.body{color:var(--muted)}
.theme-editorial-v4 .whyintro .tag{font-family:Lora,Georgia,serif;font-weight:600;font-size:17pt;color:var(--navy)}
.theme-editorial-v4 .whyintro p.body{font-size:11.5pt;line-height:1.5}
.theme-editorial-v4 .fcard{background:#fff;border:1px solid var(--edge);border-left:.05in solid var(--blue)}
.theme-editorial-v4 .fcard h5{color:var(--navy);font-size:12.5pt}
.theme-editorial-v4 .fcard p{font-size:11pt;line-height:1.4;color:var(--ink)}
.theme-editorial-v4 .page.why.dense .whyintro p.body{font-size:11pt;line-height:1.42}.theme-editorial-v4 .page.why.dense .team{height:1.6in}.theme-editorial-v4 .page.why.dense .whytop{margin-bottom:.16in}.theme-editorial-v4 .page.why.dense .fcard{padding:.12in .14in .1in;min-height:.85in}.theme-editorial-v4 .page.why.dense .fcard p{font-size:10.5pt;line-height:1.36}.theme-editorial-v4 .page.why.dense .fgrid{gap:.11in .27in}
.theme-editorial-v4 .twocol .good{background:#fff;border-color:var(--edge)}
.theme-editorial-v4 .redflag{background:#fff}
.theme-editorial-v4 .flow .step{border-color:var(--edge)}
.theme-editorial-v4 .hero{left:.62in;width:7.26in;top:1.62in;height:3.0in;gap:.18in}
.theme-editorial-v4 .hero.n1 .hph{width:100%}
.theme-editorial-v4 .hero .hph{width:calc(50% - .09in)}
.theme-editorial-v4 .bodywrap.hashero{top:4.8in;height:5.54in}
.theme-editorial-v4 .cta .ctahero{top:1.42in;height:4.0in}
.theme-editorial-v4 .cta .ctahero img{width:3.85in}
.theme-editorial-v4 .cta .ctapanel{background:var(--navy)}
.theme-editorial-v4 .cta .ctapanel h2{font-family:Lora,Georgia,serif;font-weight:600;font-size:25pt;line-height:1.12}
.theme-editorial-v4 .cta .ctapanel p.body{color:#DCE6F0;font-size:11.5pt;line-height:1.45}
.theme-editorial-v4 .cta .ctabody{top:5.85in}
.theme-editorial-v4 .cta .stack{font-family:Lora,Georgia,serif;font-weight:600;font-size:22pt;line-height:1.25}
.theme-editorial-v4 .cta .tagline{font-size:16pt}
.theme-editorial-v4 .cta .site{font-size:14pt}
.theme-editorial-v4 .disclaimer h2{font-family:Lora,Georgia,serif;font-weight:600}
.theme-editorial-v4 .disclaimer .rule{background:var(--accent)}
.theme-editorial-v4 .closing{font-family:Lora,Georgia,serif;font-weight:600}

/* editorial v5: v4 with the kicker set as a full-width navy band, bold white, like the original (no number square) */
.theme-editorial-v5 .runhead{top:.2in}
.theme-editorial-v5 .kicker{left:0;width:8.5in;top:.52in;height:.62in;padding:0 0 0 .62in;border:0;background:var(--navy);align-items:center}
.theme-editorial-v5 .ktext{color:#fff;font-size:16pt;font-weight:700;letter-spacing:.02em}
.theme-editorial-v5 .ktext.small{font-size:14pt;letter-spacing:.015em}
.theme-editorial-v5 .bodywrap{top:1.5in;height:8.84in}
.theme-editorial-v5 .hero{top:1.42in;height:3.1in}
.theme-editorial-v5 .bodywrap.hashero{top:4.8in;height:5.54in}
.theme-editorial-v5 .cta .ctahero{top:1.14in}
.theme-editorial-v5 .cta .ctabody{top:5.6in}

/* disclaimer */
.disclaimer{background:var(--navy);color:#fff}
.disclaimer .dtop{position:absolute;left:.7in;top:.8in;font-size:9pt;font-weight:700;color:var(--sky);letter-spacing:.08em}
.disclaimer h2{position:absolute;left:.7in;top:1.55in;font-size:29pt;line-height:1.12;color:#fff}
.disclaimer .rule{position:absolute;left:.7in;top:3.2in;background:var(--sky);margin:0}
.disclaimer .dtext{position:absolute;left:.7in;top:3.65in;width:7.05in}
.disclaimer .dtext p{font-size:13pt;line-height:1.42;margin-bottom:.18in}
.disclaimer .dtext.d1 p{font-size:12pt;margin-bottom:.14in}
.disclaimer .dtext.d2 p{font-size:11.5pt;line-height:1.36}
.disclaimer .dtext.d3 p{font-size:11pt;margin-bottom:.1in}
.disclaimer .dtext.d4 p{font-size:10.5pt;line-height:1.3}
.disclaimer .series{position:absolute;left:.7in;top:6.9in;width:7in}
.disclaimer .series h4{font-size:9pt;color:var(--sky);letter-spacing:.08em;margin-bottom:.12in}
.disclaimer .series ul{list-style:none}
.disclaimer .series li{font-size:12pt;line-height:1.5;color:#fff}
.disclaimer .dbrand{position:absolute;left:.7in;top:8.7in}
.disclaimer .wp{font-size:16pt;font-weight:700;letter-spacing:.04em}
.disclaimer .ser{font-size:15pt;font-weight:700;margin-top:.1in}
.disclaimer .dfoot{position:absolute;left:.7in;top:10.1in;font-size:8pt;font-weight:700;color:var(--sky);letter-spacing:.04em}
/* ---- print / PDF: no blurred or filter-based shadows (Chromium writes them as luminosity soft masks, which Apple
   Preview renders as grey boxes). Hard opaque offset shadow instead; text stays vector. Screen styles above are unchanged. ---- */
@media print{
  .card,.fcard,.flow .step,.twocol .col,.callout,.redflag,.approach,.hph,.cover-plate .plate{box-shadow:2px 3px 0 #d9dee7 !important}
  .card::before,.fcard::before,.flow .step::before,.twocol .col::before,.callout::before,.redflag::before,.approach::before,.hph::before{display:none !important}
  .cover-editorial .series,.cover-editorial .wlogo{text-shadow:none !important}
  *{filter:none !important;backdrop-filter:none !important}
  img{box-shadow:none !important}
}

'''

SCRIPT = r'''
<script>
// Paginate: shrink headlines, then tighten type, then drop the figure, then split the section across pages.
(async function(){
  if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
  const IN = 96; // css px per inch
  function fits(page){
    const wrap = page.querySelector('.bodywrap'); if(!wrap) return true;
    const limit = wrap.getBoundingClientRect().bottom;
    let maxBottom = 0;
    wrap.querySelectorAll('.head, .content > *, .bottom > *, .whytop').forEach(el=>{ const r = el.getBoundingClientRect(); if (r.height>0) maxBottom = Math.max(maxBottom, r.bottom); });
    return maxBottom <= limit + 0.5;
  }
  // headline sizing
  document.querySelectorAll('.head h2').forEach(h=>{
    const lh = parseFloat(getComputedStyle(h).fontSize)*1.08;
    if (h.getBoundingClientRect().height > lh*1.6) h.classList.add('l2');
    const lh2 = parseFloat(getComputedStyle(h).fontSize)*1.08;
    if (h.getBoundingClientRect().height > lh2*2.6) h.classList.add('l3');
  });
  document.querySelectorAll('.banner, .ktext').forEach(b=>{ if (b.textContent.trim().length > 40) b.classList.add('small'); });
  const pages = Array.from(document.querySelectorAll('.page.section, .page.why, .page.decide'));
  const report = [];
  for (let page of pages){
    let guard = 0;
    while (!fits(page) && guard++ < 12){
      const content = page.querySelector('.content');
      if (!page.classList.contains('tight')) { page.classList.add('tight'); continue; }
      if (!page.classList.contains('compact')) { page.classList.add('compact'); continue; }
      if (!page.classList.contains('tighter')) { page.classList.add('tighter'); continue; }
      if (!page.classList.contains('section')) break;
      const fig = content.querySelector('.figure');
      if (fig) {
        // a figure with a minimum width shrinks in steps before it is ever dropped
        const w = parseFloat(fig.style.width), h = parseFloat(fig.style.height), minW = parseFloat(fig.dataset.minw || '0');
        if (w * 0.93 >= minW) { fig.style.width = (w * 0.93).toFixed(2) + 'in'; fig.style.height = (h * 0.93).toFixed(2) + 'in'; continue; }
        fig.remove(); page.dataset.figDropped='1'; continue;
      }
      if (content.classList.contains('nosplit')) break;
      // split: move trailing content children to a continuation page
      const kids = Array.from(content.children);
      if (kids.length < 2) break;
      const cont = page.cloneNode(true);
      cont.classList.remove('tight','tighter','compact');
      const cc = cont.querySelector('.content'); cc.innerHTML = '';
      const ch = cont.querySelector('.head'); ch.classList.add('cont');
      const lbl = document.createElement('div'); lbl.className='contlabel'; lbl.textContent='CONTINUED'; ch.appendChild(lbl);
      const hero = cont.querySelector('.hero'); if (hero){ hero.remove(); cont.querySelector('.bodywrap').classList.remove('hashero'); }
      // move bottom stack to the continuation page
      const bottom = page.querySelector('.bottom'); const cb = cont.querySelector('.bottom');
      cb.innerHTML = bottom.innerHTML; bottom.innerHTML = '';
      page.after(cont);
      // move children from the end until this page fits
      let moved = 0;
      cc.prepend(content.lastElementChild); moved++;
      while (!fits(page) && content.children.length > 1){ cc.prepend(content.lastElementChild); moved++; }
      pages.push(cont);
      break;
    }
    if (!fits(page)) report.push(page.dataset.num + ' ' + (page.querySelector('.head h2')||{}).textContent);
  }
  document.querySelectorAll('.page.section').forEach(page=>{
    const content=page.querySelector('.content'), bottom=page.querySelector('.bottom'), wrap=page.querySelector('.bodywrap');
    const ck=content && content.querySelector(':scope > .checklist'); if(!ck) return;
    if(bottom && bottom.children.length) return;
    let after=0; let sib=ck.nextElementSibling; while(sib){ after+=sib.getBoundingClientRect().height+34; sib=sib.nextElementSibling; }
    const avail=wrap.getBoundingClientRect().bottom - ck.getBoundingClientRect().top - after - 8;
    if (ck.getBoundingClientRect().height < avail){ ck.classList.add('fill'); ck.style.height=avail+'px'; }
  });
  document.querySelectorAll('.ctapanel').forEach(p=>{ for (const c of ['tight','tighter']) { if (p.scrollHeight > p.clientHeight + 1) p.classList.add(c); } });
  // number pages: keep section numbers; nothing else to do
  // editorial theme: size the navy header band to the headline block on every page (including continuation pages)
  if (document.body.classList.contains('theme-editorial-v3')){
    document.querySelectorAll('.page').forEach(page=>{
      if (page.querySelector('.hero')) page.classList.add('has-hero');
      const head=page.querySelector('.head'); if(!head) return;
      const rule=head.querySelector('.rule');
      const bottom=(rule?rule:head).getBoundingClientRect().bottom - page.getBoundingClientRect().top;
      page.style.setProperty('--headh', (bottom + 0.22*96 - 0.52*96) + 'px');
    });
  }
  // editorial v4: on light pages, open up the type so the page reads generously instead of leaving a dead gap above the callouts
  if (document.body.classList.contains('theme-editorial-v4')){
    document.querySelectorAll('.page.section').forEach(page=>{
      if (page.classList.contains('tight')) return;
      const content=page.querySelector('.content'), bottom=page.querySelector('.bottom');
      if (!content || !bottom || !bottom.children.length) return;
      const gap = bottom.getBoundingClientRect().top - content.getBoundingClientRect().bottom;
      if (gap > 0.7*IN){ page.classList.add('spacious'); if (!fits(page)) page.classList.remove('spacious'); }
    });
  }
  // disclaimer: a long legal block steps its type down until it clears the series list (CSS .dtext.d1 .. .d4)
  document.querySelectorAll('.page.disclaimer').forEach(pg=>{
    const t=pg.querySelector('.dtext'), s=pg.querySelector('.series'); if(!t||!s) return;
    let guard=0;
    while (t.getBoundingClientRect().bottom > s.getBoundingClientRect().top - 0.15*IN && guard < 4){ guard++; t.classList.add('d'+guard); }
  });
  window.__paginated = true;
  window.__overflow = report;
})();
</script>
'''


def theme_classes(t):
    if t == 'editorial-v5':
        return 'theme-editorial theme-editorial-v4 theme-editorial-v5'
    if t in ('editorial-v3', 'editorial-v4'):
        return f'theme-editorial theme-{t}'
    return f'theme-{t}'


def build(outline_path, config_path, out_path, cover_style=None):
    book = json.load(open(outline_path, encoding='utf8'))
    cfg = json.load(open(config_path, encoding='utf8'))
    if cover_style:
        cfg['cover_style'] = cover_style
    book.update({k: v for k, v in cfg.items() if k in ('topic', 'title', 'cta_url', 'series')})
    book['_theme'] = cfg.get('theme', 'classic')
    book['_icon'] = img_uri(ICON)
    book['_imgs'] = {k: img_uri(v) for k, v in cfg.get('card_images', {}).items()}
    book['_cimg_ratio'] = cfg.get('card_image_ratio')
    scfg = cfg.get('sections', {})
    pages = [cover_page(book, cfg)]
    numbered = [s for s in book['sections'] if s['kind'] in ('before', 'section', 'why')]
    for sec in numbered:
        c = scfg.get(sec['num'], {})
        pages.append(why_page(book, sec, c) if sec['kind'] == 'why' else section_page(book, sec, c))
    n = int(numbered[-1]['num']) + 1
    decide = next((s for s in book['sections'] if s['kind'] == 'decide'), None)
    if decide:
        pages.append(decide_page(book, decide, f'{n:02d}', scfg.get('decide', {}))); n += 1
    cta = next(s for s in book['sections'] if s['kind'] == 'cta')
    pages.append(cta_page(book, cta, f'{n:02d}', scfg.get('cta', {})))
    disc = next(s for s in book['sections'] if s['kind'] == 'disclaimer')
    pages.append(disclaimer_page(book, disc, cfg.get('theme', 'classic')))
    doc = f'<!doctype html><html><head><meta charset="utf-8"><title>{esc(book["title"])}</title><style>{CSS.replace("__SHADOW_TILE__", shadow_tile()).replace("__FONT_FACES__", font_css())}</style></head><body class="{theme_classes(cfg.get('theme', 'classic'))} shadow-{cfg.get('shadows', 'blur')}">{"".join(pages)}{SCRIPT}</body></html>'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    open(out_path, 'w', encoding='utf8').write(doc)
    print(f'{book["slug"]}: {len(pages)} pages (before pagination) -> {out_path} {os.path.getsize(out_path)/1e6:.1f}MB')


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
