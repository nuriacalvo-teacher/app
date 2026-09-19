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

| Grupo | Código |
|-------|--------|
| 1º ESO | `1ESO-PWDJ` |
| 2º ESO | `2ESO-XH9J` |
| **3º ESO A/B** | **`E3AB`** |
| **3º ESO B/C** | **`E3BC`** |
| 4º ESO | `4ESO-XAXD` |
| 1º BTO | `1BTO-976F` |
| 2º BTO | `2BTO-KMJR` |

Un mismo grupo puede tener varios códigos: los de 3º ESO eligen `3ESO` en la
casilla del grupo y luego escriben `E3AB` o `E3BC` según su clase. En el panel
del profesor los distingues por la columna **Code**. Debajo de la casilla del
código los alumnos ven el aviso que hay en `CODE_HINT`, que puedes cambiar.

- Se dictan en clase o se pegan en Google Classroom.
- El **curso** (1ESO … 2BTO) lo elige siempre el alumno en el desplegable,
  tenga código o no: los alumnos de otros profesores también dejan constancia
  de su curso en su informe.
- Borra del archivo las líneas de los grupos que no des.
- Si un código se filtra, cámbialo por otro: los resultados antiguos siguen
  guardados bajo el código viejo y los nuevos van al nuevo.
- **PIN del panel del profesor: `nuria123`** (botón ⚙️ Teacher). Solo lo usas
  tú; cámbialo cuando quieras en la línea `TEACHER_PIN`.

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

Copia `reglas-firebase.json` en *Firebase → Realtime Database → Reglas →
Publicar*. Con eso:

- solo se puede escribir dentro de tus siete códigos;
- un intento guardado **no se puede borrar ni modificar** desde la web;
- nadie puede leer la raíz de la base de datos para husmear.

Cuando cambies un código, acuérdate de cambiarlo también en las dos líneas
donde aparece dentro de ese archivo.

## 5. Mantenimiento de fin de curso

Exporta el CSV desde el panel (botón *Export CSV*) y borra la carpeta del
curso en la consola de Firebase. Cada intento ocupa ~7 KB: con el plan
gratuito (1 GB) caben unos 150.000, así que no vas a quedarte sin espacio.
