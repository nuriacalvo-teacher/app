# Transcripción de expedientes desde PDFs (método)

Cómo se pasan a la base de datos los expedientes escaneados (letra manuscrita del siglo XIX) y cómo se busca si
cada alumno fue **destacado** o **ilustre**. Primera tanda hecha: 3 PDFs, 53 páginas, 51 alumnos (ABAD … ABETI).

## 1. Descargar y preparar las páginas
- Los PDFs están en Google Drive, compartidos «Cualquier persona con el enlace». Descarga directa:
  `curl -L -o docN.pdf "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`
  (hace falta acceso de red a `drive.google.com` y `drive.usercontent.google.com`).
- Son imágenes sin texto. Con PyMuPDF (`pip install pymupdf pillow openpyxl`) se pasa cada página a JPEG
  (1500 px para ver, 2600 px `_HD` para leer detalles). Muchas páginas vienen giradas 90°: rotar y recortar la
  cabecera («Expediente de D. … natural de … provincia de …») y la primera fila de la tabla.
- Casi siempre hay **un alumno por página**; a veces un mismo alumno ocupa dos páginas (portada + hoja) y hay
  muchos **hermanos** con los mismos apellidos (se mantienen separados).

## 2. Datos que se sacan de cada alumno
| Campo | Regla |
|---|---|
| APELLIDOS | MAYÚSCULAS, tal como vienen, con la «y» entre apellidos (ABADÍA Y CORTINA). Grafía histórica respetada. |
| Nombre | Solo inicial en mayúscula (Juan Manuel, Francisco de Paula). |
| País | España salvo que conste otro. |
| Provincia | Nombre actual, como en la app (Lleida, Guipúzcoa, Navarra, La Rioja…). «idem» = la de la localidad. |
| Localidad | Como está escrita; forma actual entre paréntesis si difiere: «Agreda (Ágreda)». |
| Año nacimiento | Si consta. Si solo consta la edad: año del documento − edad (se anota en Observaciones que es calculado). |
| Año expediente | Año de la portada; en hojas académicas, el de la fila de Ingreso/primera matrícula. |
| Destacado o ilustre | ILUSTRE / DESTACADO solo con coincidencia sólida (nombre + lugar + fechas); SIN COMPROBAR si hay un posible candidato; NO si no aparece nada. |
| Observaciones | Qué se encontró, fuente y enlace. Nada de enlaces inventados. |
| Caja | Nº de la caja del archivo donde están esos expedientes (me lo dice la coordinación; la 1.ª tanda es la caja 1). |

Lecturas dudosas: se marcan con **[?]** dentro del propio dato; lo ilegible, **[ilegible]**.

## 3. Búsqueda de destacados / ilustres
Nombre completo + localidad y variantes (Ximénez/Jiménez, sin «y», catalán…): Wikipedia/Viquipèdia,
Real Academia de la Historia (dbe.rah.es / historia-hispanica.rah.es), Gran Enciclopedia Aragonesa, Enciclopèdia
Catalana, Auñamendi/Gran Enciclopedia de Navarra, hemerotecas, PARES. Hace falta acceso de red **completo** para
abrir las páginas (en la primera tanda solo se vieron los resultados del buscador).

## 4. Entrega
Una hoja Excel ordenada por apellidos con estas 10 columnas (los títulos son los que reconoce la app):
`APELLIDOS | Nombre | País | Provincia | Localidad | Año nacimiento | Año expediente | Destacado o ilustre | Observaciones | Caja`
(`python3 herramientas/generar_xlsx.py <nº de caja>` la genera a partir de los JSON de la transcripción.)

## 5. Importar a la app
Coordinación → **Importar expedientes**: pegar la tabla copiada (con títulos) → Revisar → Importar.
Estado «PENDIENTE DE REVISIÓN», caja según la columna Caja o los apellidos, control de duplicados (los repetidos no entran y se listan).
Para **corregir** alumnos ya importados (caja, observaciones, destacado…): pegar la tabla corregida y marcar
**«Actualizar los que ya existen»**. Se cambian sólo las columnas que trae la tabla (el estado y el profesor se
respetan) y cada cambio queda en el historial. Si hay dos alumnos con el mismo nombre, no se toca ninguno.

## 6. Fuentes: notas prácticas
- Real Academia de la Historia: la web se carga con JavaScript, pero su buscador responde en
  `https://historia-hispanica.rah.es/api/search/<apellido>` (JSON con nombre, fechas y lugar de nacimiento).
- Gran Enciclopedia Aragonesa (`enciclopedia-aragonesa.com`): en septiembre de 2026 no respondía desde el entorno
  de trabajo; hay que revisarla a mano.

