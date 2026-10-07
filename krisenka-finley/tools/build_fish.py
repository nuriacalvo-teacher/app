"""Recorta el siluro de la ilustración (sprite con transparencia) y rellena el
hueco con río para que el pez pueda saltar dentro y fuera del agua.
Uso: python3 build_fish.py <imagen_original.jpg> <carpeta_assets>"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from regions import FISH, SPLASH_BOXES

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size

fish = Image.new('L', (W, H), 0)
ImageDraw.Draw(fish).polygon(FISH, fill=255)
fish_sprite_a = fish.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))

hole = fish.filter(ImageFilter.MaxFilter(9))
d = ImageDraw.Draw(hole)
for b in SPLASH_BOXES:
    d.rounded_rectangle(b, radius=6, fill=255)

# Sprite: recortado a su caja
bbox = fish_sprite_a.getbbox()
sprite = im.crop(bbox).convert('RGBA')
sprite.putalpha(fish_sprite_a.crop(bbox))
sprite.save(f'{out}/siluro.webp', quality=82, method=6)
print('fish bbox', bbox)

# Relleno: copia de franjas de río desplazadas (el río es un patrón de bandas)
fill = im.copy()
px, fp, hp = im.load(), fill.load(), hole.load()
for y in range(H):
    for x in range(W):
        if hp[x, y]:
            # arriba (bajo el arco) copiamos agua del mismo arco, abajo río abierto
            opts = [(-205, 0), (-250, 10), (-300, 0)] if y > 880 else [(-120, 15), (-280, 30), (-235, 25)]
            for dx, dy in opts:
                if not hp[x + dx, y + dy]:
                    fp[x, y] = px[x + dx, y + dy]
                    break
soft = hole.filter(ImageFilter.GaussianBlur(3))
plate = Image.composite(fill, im, soft)
plate.save(f'{out}/krisenka-hero.webp', quality=78, method=6)
