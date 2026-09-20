# Irregular Verbs · 5 módulos × 3 niveles

App principal de verbos irregulares. Los **105 verbos** están repartidos en
**5 módulos de 21 verbos** (alfabéticos: *be → do*, *draw → hear*, *hide → pay*,
*put → sleep*, *smell → write*), y cada módulo se trabaja en **tres niveles de
dificultad crecientes sobre los mismos verbos**:

| Nivel | Qué hace el alumno | Preguntas | Aprueba con |
|-------|--------------------|-----------|-------------|
| **1 · The three forms** | Ve el verbo en español y escribe infinitivo, pasado y participio | 21 | 90 % |
| **2 · Fill in the gaps** | Completa frases con el verbo en pasado o participio | 50 | 90 % |
| **3 · Spanish into English** | Traduce al inglés frases cortas con esos mismos verbos | 42 | 70 % |

Son **15 unidades** independientes (565 preguntas en total). Cada una tiene su
nota, su cronómetro, su corrección y se guarda por separado, así que se pueden
mandar por separado: “esta semana, nivel 1 de los módulos 1 y 2”.

El panel del alumno muestra los tres niveles en tres bloques, con un contador
*x / 5 aprobados* en cada uno. El informe final solo sale “aprobado” cuando se
superan las 15 unidades.

## Nivel 3: frases cortas y corrección tolerante

Son **42 frases por módulo**: cada verbo aparece una vez en pasado y otra en
participio, en frases de 4 o 5 palabras y con vocabulario básico.

    Rompí un vaso hace dos días.  (break)
    PAST SIMPLE
    → I broke a glass two days ago.

**El verbo se ve entre paréntesis** y debajo solo pone *Past simple* o
*Present perfect*: el alumno tiene que pensar la forma, que de eso va el
ejercicio. El botón **💡 Vocabulary** da únicamente las palabras de la frase
(*nariz = nose*), **nunca la forma del verbo**.

### Practican también ago / for / since

48 de las 210 frases llevan marca temporal a propósito:

- **ago** (27 frases, siempre con past simple): *Rompí un vaso **hace dos
  días** → two days ago*.
- **for** (11 frases, con present perfect): *He tenido esta bici **desde
  hace** tres años → for three years*; *durante dos horas → for two hours*.
- **since** (10 frases, con present perfect): *La conozco **desde** 2020 →
  since 2020*; *desde el lunes → since Monday*.

Confundir *for* con *since* **sí cuenta como error**, para que sirva de
práctica. El glosario traduce las tres marcas para ayudar.

### Qué acepta como correcto

- **Sinónimos**: *phone / mobile / cell phone*, *film / movie*, *bike /
  bicycle*, *mum / mom / mother*, *photos / pictures*, *present / gift*,
  *came / arrived*, *got / received*, *thief / robber*, *a lot of / lots
  of / many*… Están en la lista `SWAPS` y se pueden ampliar.
- **Inglés británico y americano**, también en los verbos: *burnt / burned*,
  *learnt / learned*, *got / gotten*, *centre / center*.
- **Contracciones** (*I have = I've*) y **números en cifra** (*five = 5*).
- **El orden**: la expresión de tiempo puede ir delante o detrás, y valen
  igual *“I lent Sara my bike”* y *“I lent my bike to Sara”*. Los artículos y
  las preposiciones sueltas no hacen fallar la frase.
- **Traducciones alternativas escritas a mano** donde tienen sentido:
  *allowed me to go out* por *let me go out*, *stopped / gave up smoking* por
  *quit smoking*, *I set the table* por *I laid the table*…
- Mayúsculas, comas, apóstrofes y el punto final **no cuentan**.

Lo que **sí** sigue siendo error es el verbo y el tiempo: *“I break a glass
two days ago”*, *“He broke the window”* cuando tocaba participio o *“I never
ate sushi”*. Comprobado también que ninguna frase se puede confundir con otra.

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

## Panel del profesor

Una fila por alumno y **una columna por nivel** (L1, L2, L3) con
*aprobados / 5* y la media de ese nivel: se ve de un vistazo quién se ha
quedado atascado y en qué dificultad. Al pinchar en el alumno salen los 15
intentos con todas sus respuestas. El CSV exporta las 15 notas.

## Correcciones de contenido

- *hang* ahora da como forma principal **hung** (antes *hanged*, que solo se
  usa para “ahorcar”).
- El nivel 2 conserva las 50 frases por módulo: los 21 verbos en pasado y en
  participio (42) más 8 frases de refuerzo ya existentes.
