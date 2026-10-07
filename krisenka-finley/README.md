# Krisenka Finley · landing page animada

Web de una sola página construida sobre la ilustración original. Sin dependencias ni compilación: HTML, CSS y JavaScript.

## Qué hace la portada
- **WebGL** (`js/hero.js`): el río fluye hacia el puente (al fondo), las flores se mecen con ráfagas de viento, las nubes respiran, los rayos de sol salen proyectados del mandala y del sol, y el rótulo FINLEY cambia de color.
- **El siluro** salta del Ebro, se zambulle con salpicaduras y ondas y vuelve nadando bajo el agua. Al pulsar el agua salen ondas; al pulsar cerca de su sombra, salta.
- **Menú clicable**: las nubes MÚSICA, GIRA, BIOGRAFÍA y CONTACTO de la ilustración son botones.
- **Zonas interactivas**: la guitarra suena (acordes sintetizados), el sol gira, el título reproduce el single.
- Notas musicales que salen de la boca, pájaros, pétalos con el viento y estrellitas que siguen al cursor.
- En móvil se puede arrastrar la ilustración para explorarla. Con «reducir movimiento» activado se muestra estática.

## Secciones
Música (reproductor con visualizador y mini-reproductor flotante), Gira (cuenta atrás, filtros, botón «+ Calendario» que descarga un .ics), Biografía y Contacto (formulario que abre el correo + boletín).

## Editar contenido
Todo el contenido de ejemplo (canciones, conciertos, emails) está en `js/data.js`. Para usar las canciones reales, añade `src: "audio/cancion.mp3"` a cada pista. Los enlaces a plataformas y redes están en `index.html` (`href="#"`).

## Probar en local
Los efectos WebGL necesitan servirse por HTTP (no abriendo el archivo con doble clic):

```
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Regenerar recursos
`tools/` contiene la ilustración original y los scripts que generan el recorte del siluro, el fondo sin pez y las máscaras de animación:

```
python3 tools/build_fish.py tools/krisenka-original.jpg assets
python3 tools/build_masks.py assets
```
