#!/usr/bin/env python3
"""Genera la carpeta para-copiar/ con sólo dos archivos (Codigo.gs e Index.html, con estilos,
lógica y datos ya dentro), para que la instalación en Apps Script sea copiar y pegar dos veces."""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GAS = RAIZ / 'apps-script'
SALIDA = RAIZ / 'para-copiar'


def main():
    SALIDA.mkdir(exist_ok=True)
    html = (GAS / 'Index.html').read_text(encoding='utf-8')
    html = re.sub(r"<\?!= include\('(\w+)'\); \?>", lambda m: (GAS / (m.group(1) + '.html')).read_text(encoding='utf-8'), html)
    assert '<?' not in html, 'Quedan etiquetas de plantilla sin resolver'
    (SALIDA / 'Index.html').write_text(html, encoding='utf-8')
    (SALIDA / 'Codigo.gs').write_text((GAS / 'Codigo.gs').read_text(encoding='utf-8'), encoding='utf-8')
    (SALIDA / 'Acceso.gs').write_text((GAS / 'Acceso.gs').read_text(encoding='utf-8'), encoding='utf-8')
    print('Escrito', SALIDA)


if __name__ == '__main__':
    main()
