#!/usr/bin/env python3
"""Task 02B — side-by-side before/after contact sheets for the pilot screenshots (PNG in, PNG out; nothing else touched)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
before = ROOT / sys.argv[1]; after = ROOT / sys.argv[2]; out = ROOT / sys.argv[3]; out.mkdir(parents=True, exist_ok=True)
try: font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 28)
except Exception: font = ImageFont.load_default()
names = sorted(p.name for p in after.glob('*.png') if (before / p.name).exists())
made = 0
for n in names:
    a = Image.open(before / n).convert('RGB'); b = Image.open(after / n).convert('RGB')
    H = max(a.height, b.height); scale = 1.0
    if H > 2600: scale = 2600 / H
    a = a.resize((int(a.width * scale), int(a.height * scale))); b = b.resize((int(b.width * scale), int(b.height * scale)))
    W = a.width + b.width + 60; H = max(a.height, b.height) + 70
    im = Image.new('RGB', (W, H), (240, 242, 240)); d = ImageDraw.Draw(im)
    d.text((20, 18), f'BEFORE · {n}', fill=(60, 60, 60), font=font); d.text((a.width + 60, 18), 'AFTER · Visual V3 pilot', fill=(47, 107, 79), font=font)
    im.paste(a, (20, 60)); im.paste(b, (a.width + 40, 60))
    im.save(out / n.replace('.png', '_compare.png')); made += 1
print('compare images', made, '->', out)
