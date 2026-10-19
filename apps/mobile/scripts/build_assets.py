"""
Builds the mobile app's bundled image assets.

  python apps/mobile/scripts/build_assets.py            # photos + brand marks
  python apps/mobile/scripts/build_assets.py --brand    # brand marks only (after a rebrand)

Photos: downloads each Unsplash photo listed in assets/images/sources.json,
centre-crops it to 3:2 (portrait 2:3 for hero.*) and saves an optimised JPEG.
Brand marks: renders icon / adaptive icon / splash / favicon from the brand
palette and monogram in packages/shared/src/brand/brand.json.

Requires Python 3 with Pillow.
"""
import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(APP))
IMAGES = os.path.join(APP, 'assets', 'images')
BRAND_DIR = os.path.join(APP, 'assets', 'brand')
BRAND_JSON = os.path.join(ROOT, 'packages', 'shared', 'src', 'brand', 'brand.json')
FONT = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'fraunces', '600SemiBold', 'Fraunces_600SemiBold.ttf')


def read_brand():
    data = json.load(open(BRAND_JSON, encoding='utf-8'))
    return {
        'monogram': data['monogram'],
        'primary': data['palette']['light']['primary'],
        'accent': data['palette']['light']['accent'],
        'gold': data['palette']['dark']['primary'],
    }


def photos():
    sources = json.load(open(os.path.join(IMAGES, 'sources.json'), encoding='utf-8'))['photos']
    for key, photo_id in sources.items():
        group, name = key.split('.', 1)
        out_dir = os.path.join(IMAGES, group)
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, name + '.jpg')
        if os.path.exists(out):
            continue
        portrait = group == 'hero'
        w, h = (1080, 1620) if portrait else (1200, 800)
        url = 'https://images.unsplash.com/photo-%s?w=%d&h=%d&fit=crop&crop=entropy&q=85&fm=jpg' % (photo_id, w, h)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=60).read()
        img = Image.open(io.BytesIO(data)).convert('RGB')
        if img.size != (w, h):
            img = img.resize((w, h), Image.LANCZOS)
        img.save(out, 'JPEG', quality=76, optimize=True, progressive=True)
        print('photo', key, os.path.getsize(out) // 1024, 'KB')


def monogram_layer(size, text, colour, scale):
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, int(size * scale))
    box = draw.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(((size - tw) / 2 - box[0], (size - th) / 2 - box[1]), text, font=font, fill=colour)
    return layer


def brand_marks():
    b = read_brand()
    os.makedirs(BRAND_DIR, exist_ok=True)
    size = 1024

    # iOS / general icon: opaque midnight square, champagne monogram, fine inset rule.
    icon = Image.new('RGBA', (size, size), b['primary'])
    rule = ImageDraw.Draw(icon)
    inset = 112
    rule.rounded_rectangle((inset, inset, size - inset, size - inset), radius=150, outline=b['gold'], width=6)
    icon.alpha_composite(monogram_layer(size, b['monogram'], b['gold'], 0.34))
    icon.convert('RGB').save(os.path.join(BRAND_DIR, 'icon.png'))

    # Android adaptive icon: transparent foreground inside the 66% safe zone.
    fg = monogram_layer(size, b['monogram'], b['gold'], 0.26)
    fg.save(os.path.join(BRAND_DIR, 'adaptive-foreground.png'))
    monogram_layer(size, b['monogram'], '#FFFFFF', 0.26).save(os.path.join(BRAND_DIR, 'adaptive-monochrome.png'))

    # Splash mark (shown centred on the midnight splash background).
    monogram_layer(size, b['monogram'], b['gold'], 0.30).save(os.path.join(BRAND_DIR, 'splash-icon.png'))

    # Favicon.
    icon.convert('RGB').resize((96, 96), Image.LANCZOS).save(os.path.join(BRAND_DIR, 'favicon.png'))
    print('brand marks written to', BRAND_DIR)


if __name__ == '__main__':
    if '--brand' not in sys.argv:
        photos()
    brand_marks()
