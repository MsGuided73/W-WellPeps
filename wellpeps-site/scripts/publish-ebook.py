"""Publish an approved Smart Patient Guide PDF to the site, for download and for reading online.

    uv run --with pymupdf --with pillow python scripts/publish-ebook.py <slug> <path-to-approved.pdf> [--published YYYY-MM-DD]

Run from wellpeps-site/. It writes:
  public/ebooks/<slug>.pdf                  the download
  public/ebooks/<slug>/page-01.webp ...     one image per page, for the read-online page
  src/data/ebook-pages/<slug>.json          page size, version, dates, each page's text (read by screen readers)
                                            and its clickable areas (the CTA button), laid over the image as links

The read-online page shows "Published <date> · Last updated <date>". The published date is set the first time a guide
is published and kept on every later run (or set it with --published); the last-updated date is the day of the run.

Then set `pdf: '/ebooks/<slug>.pdf'` on the guide in src/data/ebooks.ts. Only a version Derek has approved is
published (his standing rule). The read-online page shows images, not an embedded PDF, because the site's
Content-Security-Policy forbids frames and plugins (frame-src 'none', object-src 'none'), and phones such as
Android Chrome cannot show a PDF inside a page anyway.
"""
import datetime
import io
import json
import os
import re
import shutil
import sys

import pymupdf
from PIL import Image

WIDTH = 1200       # px; a US Letter page is 8.5in wide, so about 141 dpi, sharp on a phone and a laptop
QUALITY = 78
SITE = re.compile(r'^https://(?:www\.)?wellpeps\.com(?=/|$)')  # links into the site become root-relative


def page_links(page: pymupdf.Page) -> list[dict]:
    """The PDF's clickable areas on this page (the CTA page's See If You Qualify button and site link), as
    percentages of the page, so the read-online page can lay a real link over the same spot on the image."""
    links = []
    pw, ph = page.rect.width, page.rect.height
    for link in page.get_links():
        uri = link.get('uri') or ''
        if not uri.startswith(('https://', 'mailto:')):
            continue
        r = link['from']
        label = re.sub(r'\s+', ' ', page.get_textbox(r)).strip()
        links.append({'href': SITE.sub('', uri) or '/', 'label': label,
                      'x': round(r.x0 / pw * 100, 2), 'y': round(r.y0 / ph * 100, 2),
                      'w': round(r.width / pw * 100, 2), 'h': round(r.height / ph * 100, 2)})
    return links


def main(slug: str, pdf_path: str, published: str | None = None) -> None:
    if not re.fullmatch(r'[a-z0-9-]+', slug):
        raise SystemExit(f'bad slug: {slug!r}')
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pub = os.path.join(here, 'public', 'ebooks')
    img_dir = os.path.join(pub, slug)
    data_dir = os.path.join(here, 'src', 'data', 'ebook-pages')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(data_dir, exist_ok=True)

    shutil.copyfile(pdf_path, os.path.join(pub, f'{slug}.pdf'))
    for old in os.listdir(img_dir):  # a shorter new version must not leave old pages behind
        if old.startswith('page-') and old.endswith('.webp'):
            os.remove(os.path.join(img_dir, old))

    doc = pymupdf.open(pdf_path)
    pages = []
    for i, page in enumerate(doc, 1):
        zoom = WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        im = Image.open(io.BytesIO(pix.tobytes('png')))
        name = f'page-{i:02d}.webp'
        im.save(os.path.join(img_dir, name), 'WEBP', quality=QUALITY, method=6)
        text = re.sub(r'\s+', ' ', page.get_text('text')).strip()  # one run of words; line breaks are only the PDF's layout
        entry = {'src': f'/ebooks/{slug}/{name}', 'text': text}
        links = page_links(page)
        if links:
            entry['links'] = links
        pages.append(entry)
    w, h = WIDTH, round(WIDTH * doc[0].rect.height / doc[0].rect.width)
    data_file = os.path.join(data_dir, f'{slug}.json')
    today = datetime.date.today().isoformat()
    earlier = {}
    if os.path.exists(data_file):
        with open(data_file, encoding='utf-8') as f:
            earlier = json.load(f)
    published_on = published or earlier.get('publishedOn') or today
    datetime.date.fromisoformat(published_on)  # fails on a malformed date
    out = {'source': os.path.basename(pdf_path), 'publishedOn': published_on, 'updatedOn': today,
           'width': w, 'height': h, 'pages': pages}
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    size = sum(os.path.getsize(os.path.join(img_dir, n)) for n in os.listdir(img_dir))
    print(f'{slug}: {len(pages)} pages, {size / 1e6:.1f} MB of images, from {os.path.basename(pdf_path)}; '
          f'published {published_on}, last updated {today}')


if __name__ == '__main__':
    args = sys.argv[1:]
    when = None
    if '--published' in args:
        k = args.index('--published')
        when = args[k + 1] if k + 1 < len(args) else None
        args = args[:k] + args[k + 2:]
    if len(args) != 2 or ('--published' in sys.argv and not when):
        raise SystemExit(__doc__)
    main(args[0], args[1], when)
