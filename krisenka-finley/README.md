# Krisenka Finley · web oficial

Web de una sola página: **de día** se pasea por la ilustración animada de Zaragoza y, al bajar, **anochece** y se entra en un concierto 3D que late con «Back Again».

## Qué hay
- **Entrada** con o sin sonido (los navegadores solo dejan sonar música tras un clic).
- **Portada de día** (WebGL): el río fluye hacia el puente, las flores se mecen con el viento y con el bajo de la canción, las nubes se mueven, el sol proyecta rayos, el rótulo FINLEY cambia de color y el siluro salta y se sumerge (con la música, salta en los golpes fuertes). Las nubes del menú son botones, la guitarra suena y el sol gira.
- **Atardecer**: al bajar, la ilustración se oscurece y aparece el túnel de neón 3D (Three.js) que avanza con el scroll.
- **Secciones en forma de disco** que giran al entrar: biografía, trayectoria, directo y enlaces.
- **Música**: reproductor de «Back Again» con ecualizador real, vinilos que giran y, al pulsar uno, su **caja de CD se abre** y muestra el disco.
- **Reproductor flotante** con el progreso de la canción y **recorrido automático** por toda la página.
- Con «reducir movimiento» activado, todo se muestra estático.

## Editar contenido
Todo está en `js/data.js`: canción, discos (portada y enlace), conciertos y enlaces.
- **Portadas**: las de los 4 álbumes en `assets/portadas/` son recreaciones provisionales; sustitúyelas por las originales con el mismo nombre de archivo.
- **Conciertos**: mientras `gigs` esté vacío se muestra «Cocinando un disco nuevo».
- **Ritmo de la canción**: `assets/back-again-bands.txt` (24 bandas por fotograma) y `back-again-hits.txt` (golpes), en base64, a 30 fotogramas por segundo.

## Probar en local
Los efectos necesitan servirse por HTTP:

```
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Regenerar recursos de la ilustración
```
python3 tools/build_fish.py tools/krisenka-original.jpg assets
python3 tools/build_masks.py assets
```
