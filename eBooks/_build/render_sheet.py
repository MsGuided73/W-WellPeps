"""Render a PDF to a contact sheet (and per-page PNGs) for visual QA.
Usage: python render_sheet.py file.pdf out_dir [dpi]
"""
import sys, os
import pymupdf
from PIL import Image, ImageDraw

pdf, out = sys.argv[1], sys.argv[2]
dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 45
os.makedirs(out, exist_ok=True)
d = pymupdf.open(pdf)
pages = []
for i, p in enumerate(d):
    pix = p.get_pixmap(dpi=dpi)
    img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    img.save(os.path.join(out, f'p{i+1:02d}.png'))
    pages.append(img)
cols = 5 if len(pages) > 12 else 4
w, h = pages[0].size
rows = -(-len(pages) // cols)
sheet = Image.new('RGB', (cols * (w + 10), rows * (h + 24)), (235, 235, 235))
dr = ImageDraw.Draw(sheet)
for i, img in enumerate(pages):
    x = (i % cols) * (w + 10) + 5; y = (i // cols) * (h + 24) + 4
    sheet.paste(img, (x, y)); dr.text((x + 2, y + h + 4), f'page {i+1}', fill=(0, 0, 0))
sheet.save(os.path.join(out, 'sheet.jpg'), quality=82)
print(len(pages), 'pages ->', os.path.join(out, 'sheet.jpg'), sheet.size)
