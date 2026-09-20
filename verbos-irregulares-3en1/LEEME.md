# Irregular Verbs · Three Exercises

Segunda app de verbos irregulares. **Mismo acceso, mismo panel y mismo aspecto
que `verbos-irregulares/`**; lo que cambia es el contenido.

## Los tres ejercicios

| # | Ejercicio | Contenido | Por intento | Aprueba con |
|---|-----------|-----------|-------------|-------------|
| 1 | The three forms | 109 verbos con su significado | 50 al azar | 90 % |
| 2 | Fill in the gaps | 50 frases con hueco | las 50 | 90 % |
| 3 | Translate into English | 55 frases españolas con pista de vocabulario | 50 al azar | 70 % |

La nota mínima de cada uno se cambia en `MODULE_DEFS` (campo `pass`). El
informe final solo sale “aprobado” si se superan los tres.

## Quién puede entrar

Hacen falta **las dos cosas**:

1. Una cuenta de Google **@iesgoya.es** (lo comprueba la página y también
   Firebase, por su cuenta).
2. El **código de clase** que tú le hayas dado.

Los códigos **ya no están dentro del archivo**: viven solo en las reglas de
Firebase, que nadie puede leer. Por eso, un alumno de otro profesor —aunque
sea del instituto y mire el código fuente— no encuentra ningún código y no
puede registrarse. Puede usar la app como **invitado**: hace todo, ve su
nota, pero no se guarda nada.

### Tus códigos (guárdalos tú, no están en ningún sitio público)

| Grupo | Código |
|---|---|
| 1º ESO | `1ESO-PWDJ` |
| 2º ESO | `2ESO-XH9J` |
| 3º ESO A/B | `3ESO-AB` |
| 3º ESO B/C | `3ESO-BC` |
| 4º ESO | `4ESO-XAXD` |
| 1º BTO | `1BTO-976F` |
| 2º BTO | `2BTO-KMJR` |

Para cambiarlos o añadir uno, se editan en `reglas-firebase.json` y se vuelve
a publicar en la consola. La página no hay que tocarla.

### Quién ve qué

| | Puede |
|---|---|
| Alumno | Solo sus propios resultados, desde cualquier dispositivo |
| Tú (nuria.calvo@iesgoya.es) | Todos los grupos, en el panel ⚙️ Teacher |
| Cualquier otro | Nada |

Un intento guardado no se puede borrar ni cambiar, ni siquiera por quien lo hizo.

## Lo que hay que configurar una vez

1. En el archivo, línea `window.TEACHER_EMAIL`: **tu correo de Google**.
2. El mismo correo en `reglas-firebase.json` (sale tres veces).
3. En la consola de Firebase:
   - **Authentication → Sign-in method → Google → Habilitar**.
   - **Authentication → Settings → Dominios autorizados**: añadir
     `nuriacalvo-teacher.github.io`.
   - **Realtime Database → Reglas**: pegar `reglas-firebase.json`.

Cómo quedan guardados los datos:

    irregular_verbs / E3AB / <cuenta del alumno> / profile
                                                 / attempts / <intento>

Un intento guardado **no se puede borrar ni cambiar**, ni siquiera por el
alumno que lo hizo.

## Correcciones que acepta

- Mayúsculas, espacios de sobra y el punto final dan igual.
- Ejercicio 1: vale `was` o `were` para *be*, y las variantes británica y
  americana (`dreamt`/`dreamed`, `learnt`/`learned`, `got`/`gotten`…).
- Ejercicio 2: si el alumno repite el auxiliar (`has chosen`) se ignora.
- Ejercicio 3: cada frase tiene varias traducciones válidas; comas, comillas
  y apóstrofes no cuentan.

## Cambios sobre el contenido original

- Se añadieron a la tabla de teoría 8 verbos que el ejercicio 2 preguntaba y
  que no estaban en la lista: *hold, lead, overcome, ring, sit, sink, split,
  stand*. Por eso son 109 y no 101.
- Corregida una errata en el ejercicio 3: “competención” → “competición”.
- El marcador global (leaderboard) del original no está: dependía de Google
  Sheets, y aquí los resultados van a Firebase con el resto de las apps.

## Qué subir

Solo el `index.html`, en su carpeta. Las reglas de Firebase están en
`reglas-firebase.json`, en la raíz del repositorio, y **cubren las dos apps**:
hay que volver a pegarlas en la consola de Firebase para que esta funcione.
