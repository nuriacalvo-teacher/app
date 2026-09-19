# Irregular Verbs · Fill in the Gaps — guía rápida

## 1. Qué subo a GitHub

Un solo archivo: **`index.html`** (esta carpeta). No hace falta nada más.

Ruta en el repositorio: `verbos-irregulares/index.html`
URL que queda: `https://nuriacalvo-teacher.github.io/app/verbos-irregulares/`

Pasos desde la web de GitHub (sin usar git):

1. Entra en `github.com/nuriacalvo-teacher/app`.
2. **Add file → Upload files**.
3. Arrastra el `index.html`. En la casilla del nombre escribe delante
   `verbos-irregulares/` para que quede dentro de esa carpeta.
4. **Commit changes**.
5. Solo la primera vez: **Settings → Pages → Source: Deploy from a branch →
   `main` / `root` → Save**. Tarda un par de minutos en publicarse.

Para actualizarla más adelante: repite el paso 2 con el archivo nuevo y
GitHub te preguntará si quieres reemplazar el anterior.

## 2. Los códigos de tus alumnos

Están en el archivo, arriba del todo (busca `C O N F I G U R A C I O N`).
Uno por grupo:

Los códigos de verdad están escritos en el propio `index.html`, arriba del
todo, en `CLASS_CODES`. Ahí es donde los cambias.

- Un mismo grupo puede tener **varios códigos**. Por ejemplo, las dos clases
  de 3º ESO: las dos eligen `3ESO` en el desplegable del curso y cada alumno
  escribe el código de su clase. **La web no dice en ningún sitio cuál es
  cuál**: el código se lo das tú en clase o por Google Classroom.
- En el panel del profesor los distingues por la columna **Code**, o
  escribiendo el código en el buscador para ver solo esa clase.
- El **curso** (1ESO … 2BTO) lo elige siempre el alumno en el desplegable,
  tenga código o no: los alumnos de otros profesores también dejan constancia
  de su curso en su informe.
- Si un código se filtra, cámbialo por otro: los resultados antiguos siguen
  guardados bajo el código viejo y los nuevos van al nuevo.
- El **PIN del panel** (botón ⚙️ Teacher) está en la línea `TEACHER_PIN`.
  Solo lo usas tú.
- `window.CODE_HINT` permite poner un aviso debajo de la casilla del código.
  Déjalo vacío (`""`) para que no aparezca nada.

A GitHub solo hace falta subir el `index.html`. Este `LEEME.md` y el
`reglas-firebase.json` son para ti; si el repositorio es público, mejor no
los subas.

## 3. Otros profesores

No tienen que tocar nada: entran en la misma web y pulsan **“Practise without
a code”**. Sus alumnos hacen los 5 módulos, ven su nota y su informe, y pueden
imprimirlo o hacer captura, pero **no se guarda nada en tu Firebase**: ni un
solo dato, ni una conexión. A ti no te llega nada de nadie que no tenga tu
código.

Si alguna compañera sí quiere recoger el trabajo de sus alumnos, tiene dos
caminos:

- **Compartir tu base de datos**: le añades una línea en `EXTRA_TEACHERS` con
  su código y su contraseña. Ella solo verá lo suyo y tú solo lo tuyo.
- **Tener la suya propia** (recomendado si son muchos grupos): se copia el
  `index.html`, crea su proyecto en Firebase y cambia el bloque
  `firebaseConfig`. Sus datos no pasan por tu cuenta.

## 4. Reglas de Firebase (recomendado)

Copia `reglas-firebase.json` (está en la **raíz del repositorio** y cubre
todas las apps) en *Firebase → Realtime Database → Reglas → Publicar*. Con eso:

- solo se puede escribir dentro de tus siete códigos;
- un intento guardado **no se puede borrar ni modificar** desde la web;
- nadie puede leer la raíz de la base de datos para husmear.

Cuando cambies un código, acuérdate de cambiarlo también en las dos líneas
donde aparece dentro de ese archivo.

## 5. Mantenimiento de fin de curso

Exporta el CSV desde el panel (botón *Export CSV*) y borra la carpeta del
curso en la consola de Firebase. Cada intento ocupa ~7 KB: con el plan
gratuito (1 GB) caben unos 150.000, así que no vas a quedarte sin espacio.
