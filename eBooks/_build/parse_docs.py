"""Parse the four Smart Patient Guide .docx manuscripts into a structured outline (JSON).

Structure produced per book:
{
  "slug", "title", "kicker", "subtitle", "deck", "tagline",
  "sections": [ {"num": "00"|"01".., "kind": "before"|"section"|"why"|"decide"|"cta"|"disclaimer",
                 "headline", "subtitle", "elements": [ ... ] } ]
}
Element kinds: lead, body, quote, emph, list, chips, cards, checklist, callout(principle|question|insight),
approach, redflag, flow, twocol(handled by cards with lists), note (author notes are dropped).
"""
import zipfile, re, glob, html, json, os, sys

SRC = os.path.join(os.path.dirname(__file__), '..', 'Content Only')
OUT = os.path.join(os.path.dirname(__file__), 'outlines')
os.makedirs(OUT, exist_ok=True)

SEC_RE = re.compile(r'^(\d\d) / SMART PATIENT GUIDE$')
CALLOUTS = {'SMART PATIENT PRINCIPLE': 'principle', 'SMART PATIENT QUESTION': 'question', 'SMART PATIENT INSIGHT': 'principle'}
NUMQ_RE = re.compile(r'^(\d)\.\s+(.+)$')
NUMDASH_RE = re.compile(r'^(\d\d)\s+[—–-]\s+(.+)$')
AUTHOR_NOTES = ['This should be one of the ebook', 'This is where I think we can create']


def paragraphs(path):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
    body = re.search(r'<w:body>(.*)</w:body>', x, flags=re.S).group(1)
    out = []
    for p in re.findall(r'<w:p[ >].*?</w:p>', body, flags=re.S):
        bold = '<w:b/>' in p or '<w:b ' in p
        t = html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)))
        t = t.replace(' ', ' ').strip()
        t = re.sub(r'\s+', ' ', t)
        out.append((bold, t))
    return out


def is_caps(t):
    letters = [c for c in t if c.isalpha()]
    return bool(letters) and all(c.isupper() for c in letters) and len(t) <= 60


def split_blocks(paras):
    """Split into blocks at blank lines."""
    blocks, cur = [], []
    for b, t in paras:
        if not t:
            if cur:
                blocks.append(cur); cur = []
        else:
            cur.append((b, t))
    if cur:
        blocks.append(cur)
    return blocks


def parse_elements(lines):
    """lines: list of (bold, text) after headline/subtitle removed."""
    els = []
    i = 0
    n = len(lines)
    while i < n:
        b, t = lines[i]
        if any(t.startswith(a) for a in AUTHOR_NOTES):
            i += 1; continue
        if t in CALLOUTS:
            els.append({'kind': 'callout', 'style': CALLOUTS[t], 'text': lines[i + 1][1]})
            i += 2; continue
        if t == 'THE WELLPEPS APPROACH':
            j = i + 1; body = []
            while j < n and lines[j][1] not in CALLOUTS and lines[j][1] != 'RED FLAG':
                body.append(lines[j][1]); j += 1
            body = [x for x in body if x != 'Personalized Wellness. Simplified.']
            def camel_join(x):
                guard = x.replace('WellPeps', 'WELLPEPS_GUARD')
                if not re.search(r'[a-z][A-Z]', guard):
                    return x
                return ' • '.join(p.strip() for p in re.split(r'(?<=[a-z\)])(?=[A-Z])', guard)).replace('WELLPEPS_GUARD', 'WellPeps')
            body = [camel_join(x) for x in body]
            els.append({'kind': 'approach', 'text': ' '.join(body)})
            i = j; continue
        if t == 'RED FLAG':
            j = i + 1; body = []
            while j < n and lines[j][1] not in CALLOUTS and lines[j][1] != 'THE WELLPEPS APPROACH':
                body.append(lines[j][1]); j += 1
            els.append({'kind': 'redflag', 'lines': body})
            i = j; continue
        # numbered checklist "1. WILL ..." + desc
        if b and NUMQ_RE.match(t):
            items = []
            while i < n and lines[i][0] and NUMQ_RE.match(lines[i][1]):
                m = NUMQ_RE.match(lines[i][1]); desc = ''
                if i + 1 < n and not lines[i + 1][0]:
                    desc = lines[i + 1][1]; i += 1
                items.append({'title': m.group(2), 'desc': desc}); i += 1
            els.append({'kind': 'checklist', 'items': items}); continue
        if b and NUMDASH_RE.match(t):
            items = []
            while i < n and lines[i][0] and NUMDASH_RE.match(lines[i][1]):
                m = NUMDASH_RE.match(lines[i][1]); desc = ''
                if i + 1 < n and not lines[i + 1][0]:
                    desc = lines[i + 1][1]; i += 1
                items.append({'title': m.group(2), 'desc': desc}); i += 1
            els.append({'kind': 'checklist', 'items': items}); continue
        # flow arrows
        if b and '↓' in t:
            els.append({'kind': 'flow', 'steps': [s.strip() for s in t.split('↓')]}); i += 1; continue
        # caps card run: descriptions are attached only when EVERY item in the run has one
        if b and is_caps(t):
            items = []
            while i < n and lines[i][0] and is_caps(lines[i][1]) and lines[i][1] not in CALLOUTS and lines[i][1] not in ('THE WELLPEPS APPROACH', 'RED FLAG'):
                title = lines[i][1]; desc = ''
                if i + 1 < n and not lines[i + 1][0] and not is_caps(lines[i + 1][1]) and len(lines[i + 1][1]) <= 260:
                    desc = lines[i + 1][1]; i += 2
                else:
                    i += 1
                items.append({'title': title, 'desc': desc})
            if items and not all(it['desc'] for it in items):
                trailing = [it['desc'] for it in items if it['desc']]
                for it in items:
                    it['desc'] = ''
                els.append({'kind': 'cards', 'items': items})
                for d in trailing:
                    els.append({'kind': 'body', 'text': d})
                continue
            els.append({'kind': 'cards', 'items': items}); continue
        # bold non-caps run of short lines -> list
        if b and len(t) <= 120 and not t.endswith(':'):
            j = i; items = []
            while j < n and lines[j][0] and len(lines[j][1]) <= 120 and not is_caps(lines[j][1]) and lines[j][1] not in CALLOUTS and lines[j][1] not in ('THE WELLPEPS APPROACH', 'RED FLAG') and not NUMQ_RE.match(lines[j][1]) and not lines[j][1].endswith(':'):
                items.append(lines[j][1]); j += 1
            if len(items) >= 2:
                els.append({'kind': 'list', 'items': items, 'bold': True}); i = j; continue
            els.append({'kind': 'emph', 'text': t}); i += 1; continue
        if b:
            els.append({'kind': 'emph', 'text': t}); i += 1; continue
        # plain short-line runs -> list (e.g. "Sleep." "Nutrition.")
        def shortline(x):
            return len(x.split()) <= 5 or (x[:1] in '“"' and x.rstrip()[-1:] in '”"')
        if shortline(t) and i + 1 < n and not lines[i + 1][0] and shortline(lines[i + 1][1]):
            j = i; items = []
            while j < n and not lines[j][0] and shortline(lines[j][1]):
                items.append(lines[j][1]); j += 1
            if len(items) >= 3:
                els.append({'kind': 'list', 'items': items, 'bold': False}); i = j; continue
        els.append({'kind': 'body', 'text': t}); i += 1
    return els


def parse_book(path):
    paras = paragraphs(path)
    blocks = split_blocks(paras)
    book = {'source': os.path.basename(path), 'sections': []}
    # cover block
    cover = blocks[0]
    texts = [t for b, t in cover]
    if texts[0].startswith('A WELLPEPS'):
        texts = texts[1:]
    book['title'] = texts[0].replace('THE SMART PATIENT’S GUIDE TO ', '').replace("THE SMART PATIENT'S GUIDE TO ", '')
    book['subtitle'] = texts[1]
    book['deck'] = texts[2] if len(texts) > 3 else ''
    book['tagline'] = texts[-1]
    for blk in blocks[1:]:
        first = blk[0][1]
        sec = {'elements': []}
        if first == 'BEFORE YOU START':
            sec.update(num='00', kind='before', headline=blk[1][1]); rest = blk[2:]
        elif SEC_RE.match(first):
            sec.update(num=SEC_RE.match(first).group(1), kind='section', headline=blk[1][1]); rest = blk[2:]
            if sec['headline'].startswith('Why We Created'):
                sec['kind'] = 'why'
            # subtitle: a bold short line immediately after the headline that is not a marker
            if rest and rest[0][0] and len(rest[0][1]) <= 70 and rest[0][1] not in CALLOUTS and not is_caps(rest[0][1]) and not NUMQ_RE.match(rest[0][1]):
                # treat as subtitle only when a further line exists and the line has no terminal period
                if not rest[0][1].rstrip().endswith(('.', '?', '!')):
                    sec['subtitle'] = rest[0][1]; rest = rest[1:]
        elif first == 'BEFORE YOU DECIDE':
            sec.update(num='', kind='decide', headline=''); rest = blk[1:]
        elif first == 'READY TO LEARN MORE?':
            sec.update(num='', kind='cta', headline=blk[1][1]); rest = blk[2:]
        elif first == 'IMPORTANT INFORMATION':
            sec.update(num='', kind='disclaimer', headline=''); sec['text'] = [t for b, t in blk[1:]]
            book['sections'].append(sec); continue
        else:
            sec.update(num='', kind='unknown', headline=first); rest = blk[1:]
        sec['elements'] = parse_elements(rest)
        book['sections'].append(sec)
    return book


if __name__ == '__main__':
    for f in sorted(glob.glob(os.path.join(SRC, '*.docx'))):
        book = parse_book(f)
        slug = re.sub(r'[^a-z0-9]+', '-', book['title'].lower()).strip('-')
        book['slug'] = slug
        with open(os.path.join(OUT, slug + '.json'), 'w', encoding='utf8') as fh:
            json.dump(book, fh, indent=1, ensure_ascii=False)
        kinds = {}
        for s in book['sections']:
            for e in s['elements']:
                kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
        print(slug, len(book['sections']), 'sections', kinds)
