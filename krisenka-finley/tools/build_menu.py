"""Quita las nubes del menú de la ilustración (rellenando el cielo) y las guarda
como recortes aparte, para que el menú aparezca al entrar en la web.
Uso: python3 build_menu.py <imagen_original.jpg> <carpeta_assets>
(ejecutar después de build_fish.py: modifica assets/krisenka-hero.jpg)"""
import sys
from PIL import Image, ImageDraw, ImageFilter

MENU = {  # nombre: (x, y, ancho, alto), igual que data-rect en index.html
    "musica": (318, 24, 232, 92), "gira": (566, 14, 226, 102),
    "biografia": (1204, 14, 262, 102), "contacto": (1506, 14, 270, 102),
}
# contorno real de cada nube (algo más ajustado que el recorte)
SHAPES = {
    "musica": (326, 30, 544, 110), "gira": (572, 20, 786, 110),
    "biografia": (1210, 20, 1460, 110), "contacto": (1510, 20, 1770, 110),
}

src, out = sys.argv[1], sys.argv[2]
orig = Image.open(src).convert("RGB")
plate = Image.open(f"{out}/krisenka-hero.jpg").convert("RGB")
W, H = plate.size

for name, (x, y, w, h) in MENU.items():
    orig.crop((x, y, x + w, y + h)).save(f"{out}/nube-{name}.jpg", quality=90)

hole = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(hole)
for b in SHAPES.values():
    d.rounded_rectangle(b, radius=34, fill=255)
hole = hole.filter(ImageFilter.MaxFilter(9))

# relleno siguiendo los rayos del cielo: salen del mandala de la estatua, así
# que cada píxel toma el color de su mismo rayo justo fuera del hueco
import math
CX, CY = 1000.0, 152.0
px, hp = plate.load(), hole.load()
fill = {}
for y in range(H):
    for x in range(W):
        if not hp[x, y]:
            continue
        dx, dy = x - CX, y - CY
        r = math.hypot(dx, dy) or 1.0
        ux, uy = dx / r, dy / r
        found = []
        for sign in (1, -1):
            t = 1
            while t < 600:
                xx, yy = int(round(x + ux * t * sign)), int(round(y + uy * t * sign))
                if not (0 <= xx < W and 0 <= yy < H):
                    break
                if not hp[xx, yy]:
                    found.append((t, px[xx, yy]))
                    break
                t += 1
        if not found:
            continue
        if len(found) == 2:
            (t1, c1), (t2, c2) = found
            w = t2 / (t1 + t2)
            fill[(x, y)] = tuple(int(c1[i] * w + c2[i] * (1 - w)) for i in range(3))
        else:
            fill[(x, y)] = found[0][1]
for (x, y), c in fill.items():
    px[x, y] = c

# suavizado y algo de grano para que no se note el parche
soft = plate.filter(ImageFilter.GaussianBlur(1.2))
mask = hole.filter(ImageFilter.GaussianBlur(3))
plate = Image.composite(soft, plate, mask)
plate.save(f"{out}/krisenka-hero.jpg", quality=88, optimize=True, progressive=True)
