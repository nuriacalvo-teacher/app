"""Genera las máscaras que usa el shader WebGL.
fx-mask.png: R = peso de balanceo de flores, G = río (255 cerca / 128 lejos), B = nubes
fx-mask2.png: R = fase de cada flor, G = letras FINLEY
Uso: python3 build_masks.py <carpeta_assets>"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from regions import FLOWERS, CLOUDS, CLOUD_HOLES, RIVER_NEAR, RIVER_FAR, FINLEY

out = sys.argv[1]
W, H = 2000, 1116

sway = Image.new('L', (W, H), 0)
phase = Image.new('L', (W, H), 0)
for poly, base, top, ph, amp in FLOWERS:
    shape = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shape).polygon(poly, fill=255)
    shape = shape.filter(ImageFilter.GaussianBlur(9))
    ramp = Image.new('L', (W, H), 0)
    rp = ramp.load()
    for y in range(max(0, top - 20), min(H, base + 1)):
        t = max(0.0, min(1.0, (base - y) / (base - top)))
        v = int(255 * amp * t ** 1.4)
        for x in range(W):
            rp[x, y] = v
    sway = ImageChops.lighter(sway, ImageChops.multiply(shape, ramp))
    ImageDraw.Draw(phase).polygon(poly, fill=int(ph * 255))
phase = phase.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(4))

river = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(river)
d.polygon(RIVER_NEAR, fill=255)
d.polygon(RIVER_FAR, fill=128)
river = river.filter(ImageFilter.GaussianBlur(5))

clouds = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(clouds)
for r in CLOUDS:
    d.rounded_rectangle(r, radius=30, fill=255)
for r in CLOUD_HOLES:
    d.rectangle(r, fill=0)
clouds = clouds.filter(ImageFilter.GaussianBlur(10))

finley = Image.new('L', (W, H), 0)
ImageDraw.Draw(finley).rounded_rectangle(FINLEY, radius=20, fill=255)
finley = finley.filter(ImageFilter.GaussianBlur(6))

# A la mitad de resolución: son campos suaves
half = (W // 2, H // 2)
Image.merge('RGB', (sway, river, clouds)).resize(half, Image.BILINEAR).save(f'{out}/fx-mask.png', optimize=True)
Image.merge('RGB', (phase, finley, Image.new('L', (W, H), 0))).resize(half, Image.BILINEAR).save(f'{out}/fx-mask2.png', optimize=True)
