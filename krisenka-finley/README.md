# Krisenka Finley · web oficial

Web de una sola página: **de día** se pasea por la ilustración animada de Zaragoza y, al bajar, **anochece** y se entra en un concierto 3D que late con «Back Again».

## Qué hay
- **Entrada** sobre la propia ilustración: solo sus animaciones y dos nubes, «Entrar con sonido» y «Entrar sin sonido» (los navegadores solo dejan sonar música tras un clic). Al entrar aparecen las nubes del menú y las zonas interactivas.
- **Portada de día** (WebGL): el río fluye hacia el puente, las flores se mecen con el viento y con el bajo de la canción, las nubes se mueven, el sol proyecta rayos, el rótulo FINLEY cambia de color y el siluro salta y se sumerge (con la música, salta en los golpes fuertes). Las nubes del menú son botones, la guitarra suena y el sol gira.
- **Atardecer**: al bajar, la ilustración se oscurece y aparece el túnel de neón 3D (Three.js) que avanza con el scroll.
- **Viaje por el túnel**: cada sección es un disco que sale del fondo girando, se para para leerlo y sale volando. Los vinilos de Música salen uno a uno del centro.
- **Música**: reproductor de «Back Again» con ecualizador real, vinilos que giran y, al pulsar uno, su **caja de CD se abre** y muestra el disco.
- **Recorrido automático**: empieza solo al entrar y se para en cuanto el visitante toca la rueda, la pantalla o el teclado.
- **Reproductor flotante** con el progreso de la canción.
- **Calidad adaptable**: si el equipo va justo, la portada y el túnel bajan su resolución solos.
- Con «reducir movimiento» activado, todo se muestra estático.

## Editar contenido
Todo se cambia en **`js/data.js`**, que está explicado con ejemplos. Se puede editar desde GitHub con el lápiz («Edit this file»).

- **Canción principal** (la que suena al entrar): `cancionPrincipal`.
- **Discos y sus canciones**: `discos`. Cada canción es `{ titulo: "…", archivo: "musica/….mp3" }`; las que no tienen archivo salen en la lista sin botón de escuchar.
- **MP3**: súbelos a la carpeta `musica/` (en GitHub: «Add file» → «Upload files»). Siempre dentro de la web: con archivos de otras webs el navegador no los dejaría sonar.
- **Portadas**: `assets/portadas/` (las de los 4 álbumes son provisionales; sustitúyelas con el mismo nombre).
- **Conciertos** y **enlaces**: `conciertos` y `enlaces`.

La web baila con cualquier canción: si no trae su ritmo precalculado, lo calcula mientras suena.

## Probar en local
Los efectos necesitan servirse por HTTP:

```
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Regenerar recursos de la ilustración
```
python3 tools/build_fish.py tools/krisenka-original.jpg assets
python3 tools/build_menu.py tools/krisenka-original.jpg assets
python3 tools/build_masks.py assets
```
