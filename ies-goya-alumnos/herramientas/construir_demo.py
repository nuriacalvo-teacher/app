#!/usr/bin/env python3
"""Genera demo.html: la aplicación completa funcionando en el navegador con datos simulados
(sin Google). Sirve para enseñarla y para probarla. Uso: python3 construir_demo.py"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GAS = RAIZ / 'apps-script'


def main():
    html = (GAS / 'Index.html').read_text(encoding='utf-8')
    incluir = lambda m: (GAS / (m.group(1) + '.html')).read_text(encoding='utf-8')
    simulado = (Path(__file__).parent / 'gas-simulado.js').read_text(encoding='utf-8')
    codigo = (GAS / 'Codigo.gs').read_text(encoding='utf-8')
    # Codigo.gs va aislado en una función para que sus constantes no choquen con las del cliente.
    exporta = '__api: api, instalar, guardar_, guardarProfesor_, guardarCarpeta_, crearEpoca_, MEMO'
    servidor = (f'<script>\n{simulado}\n</script>\n<script>\n(function () {{\n{codigo}\n'
                f'Object.assign(window, {{ {exporta} }});\n}})();\n__prepararDemo();\n</script>\n')
    html = html.replace("<?!= include('Datos'); ?>", servidor + "<?!= include('Datos'); ?>")
    html = re.sub(r"<\?!= include\('(\w+)'\); \?>", incluir, html)
    (RAIZ / 'demo.html').write_text(html, encoding='utf-8')
    print('Escrito', RAIZ / 'demo.html')


if __name__ == '__main__':
    main()
