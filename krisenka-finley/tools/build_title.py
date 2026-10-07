"""Recorta el rótulo «KRISENKA FINLEY» de la ilustración, sin el fondo,
para usarlo al final de la web. Sigue el contorno oscuro de las letras.
Uso: python3 build_title.py <imagen_original.jpg> <carpeta_assets>"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB").crop((610, 385, 1380, 720))
a = np.asarray(im).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)

dark = nd.binary_closing(lum < 62, structure=np.ones((3, 3)))
# zonas no oscuras rodeadas de contorno: rellenos de las letras (y algún hueco de fondo)
lab, n = nd.label(~dark)
border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
fills = np.zeros_like(dark)
for i in range(1, n + 1):
    if i in border:
        continue
    m = lab == i
    area = m.sum()
    if area < 40:
        continue
    ys, xs = np.nonzero(m)
    cy, cx = ys.mean(), xs.mean()
    # zona de cada línea del rótulo (en píxeles del recorte)
    in_krisenka = 35 < cy < 205 and 50 < cx < 720
    in_finley = 200 <= cy < 330 and 170 < cx < 630
    if not (in_krisenka or in_finley):
        continue
    L, S = lum[m].mean(), sat[m].mean()
    # crema (KRISENKA) o colores vivos (FINLEY); el fondo entre letras es morado oscuro
    if (in_krisenka and L > 150) or (in_finley and S > 0.4 and L > 110):
        fills |= m
# contorno oscuro solo junto a las letras, y huecos pequeños rellenos
near = nd.binary_dilation(fills, iterations=8)
mask = fills | (dark & near)
holes = nd.binary_fill_holes(mask) & ~mask
hl, hn = nd.label(holes)
sizes = nd.sum(holes, hl, range(1, hn + 1))
for i, sz in enumerate(sizes, 1):
    if sz < 500:
        mask |= hl == i
mask = nd.binary_opening(mask, iterations=1)
# fuera restos sueltos del fondo
cl, cn = nd.label(mask)
cs = nd.sum(mask, cl, range(1, cn + 1))
mask = np.isin(cl, [i + 1 for i, v in enumerate(cs) if v > 400])
alpha = Image.fromarray((mask * 255).astype("uint8")).filter(__import__("PIL.ImageFilter", fromlist=["x"]).GaussianBlur(0.8))
img = im.convert("RGBA")
img.putalpha(alpha)
img = img.crop(alpha.getbbox())
img.save(f"{out}/rotulo-krisenka-finley.webp", quality=88, method=6)
print(img.size)
