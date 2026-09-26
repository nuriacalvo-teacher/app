#!/usr/bin/env python3
"""Genera apps-script/Datos.html (países, provincias y municipios de España).

Fuente de municipios: relación de municipios del INE, tal como la publica
https://github.com/frontid/ComunidadesProvinciasPoblaciones (poblaciones.json).

Uso:  python3 generar_datos.py ruta/poblaciones.json
"""
import json
import re
import unicodedata
import sys
from pathlib import Path

# Código INE de provincia -> nombre que se muestra en la aplicación
PROVINCIAS = {
    '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
    '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
    '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
    '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Guipúzcoa',
    '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
    '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
    '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
    '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria',
    '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel',
    '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Vizcaya', '49': 'Zamora',
    '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
}

# Primero los más habituales en los expedientes del s. XIX; después el resto.
PAISES_FRECUENTES = ['España', 'Francia', 'Portugal', 'Italia', 'Cuba', 'Puerto Rico', 'Filipinas',
                     'Argentina', 'México', 'Chile', 'Uruguay', 'Venezuela', 'Colombia', 'Perú']
PAISES = [p.replace('_', ' ') for p in """
Afganistán Albania Alemania Andorra Angola Arabia_Saudí Argelia Argentina Armenia Australia Austria
Bélgica Bolivia Bosnia_y_Herzegovina Brasil Bulgaria Canadá Chile China Colombia Corea Costa_Rica
Croacia Cuba Dinamarca Ecuador Egipto El_Salvador Eslovaquia Eslovenia España Estados_Unidos Estonia
Etiopía Filipinas Finlandia Francia Grecia Guatemala Guinea_Ecuatorial Haití Honduras Hungría India
Indonesia Irán Irak Irlanda Islandia Israel Italia Japón Letonia Líbano Lituania Luxemburgo Malta
Marruecos México Mónaco Nicaragua Noruega Nueva_Zelanda Países_Bajos Panamá Paraguay Perú Polonia
Portugal Puerto_Rico Reino_Unido República_Checa República_Dominicana Rumanía Rusia San_Marino Serbia
Siria Sudáfrica Suecia Suiza Túnez Turquía Ucrania Uruguay Venezuela
""".split()]

ARTICULO = re.compile(r"^(.*), (el|la|los|las|l'|els|les|es|sa|ses|o|a|os|as)$", re.I)


def natural(parte):
    """«Almunia de Doña Godina, La» -> «La Almunia de Doña Godina»."""
    parte = parte.strip()
    m = ARTICULO.match(parte)
    if not m:
        return parte
    art = m.group(2)
    art = art[0].upper() + art[1:].lower()
    return art + m.group(1) if art.endswith("'") else art + ' ' + m.group(1)


def orden(s):
    """Clave de orden alfabético español: sin tildes, con la Ñ tras la N."""
    s = s.lower().replace('ñ', 'n~')
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()


def main(ruta):
    datos = json.loads(Path(ruta).read_text(encoding='utf-8'))
    municipios = {nombre: [] for nombre in PROVINCIAS.values()}
    for m in datos:
        prov = PROVINCIAS[m['parent_code']]
        municipios[prov].append(' / '.join(natural(p) for p in m['label'].split('/')))
    for lista in municipios.values():
        lista.sort(key=orden)
    geo = {
        'paises': PAISES_FRECUENTES + sorted((p for p in PAISES if p not in PAISES_FRECUENTES), key=orden)
                  + ['Otro / desconocido'],
        'provincias': sorted(municipios, key=orden),
        'municipios': municipios,
    }
    salida = Path(__file__).resolve().parent.parent / 'apps-script' / 'Datos.html'
    salida.write_text(
        '<!-- Generado con herramientas/generar_datos.py. Países, provincias y municipios (INE). -->\n'
        '<script>\nwindow.GEO = ' + json.dumps(geo, ensure_ascii=False, separators=(',', ':')) + ';\n</script>\n',
        encoding='utf-8')
    print('Escrito', salida, sum(len(v) for v in municipios.values()), 'municipios')


if __name__ == '__main__':
    main(sys.argv[1])
