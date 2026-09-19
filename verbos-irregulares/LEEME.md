# Irregular Verbs · 5 módulos × 3 niveles

App principal de verbos irregulares. Los **105 verbos** están repartidos en
**5 módulos de 21 verbos** (alfabéticos: *be → do*, *draw → hear*, *hide → pay*,
*put → sleep*, *smell → write*), y cada módulo se trabaja en **tres niveles de
dificultad crecientes sobre los mismos verbos**:

| Nivel | Qué hace el alumno | Preguntas | Aprueba con |
|-------|--------------------|-----------|-------------|
| **1 · The three forms** | Ve el verbo en español y escribe infinitivo, pasado y participio | 21 | 90 % |
| **2 · Fill in the gaps** | Completa frases con el verbo en pasado o participio | 50 | 90 % |
| **3 · Spanish into English** | Traduce al inglés esas mismas frases enteras | 50 | 70 % |

Son **15 unidades** independientes (605 preguntas en total). Cada una tiene su
nota, su cronómetro, su corrección y se guarda por separado, así que se pueden
mandar por separado: “esta semana, nivel 1 de los módulos 1 y 2”.

El panel del alumno muestra los tres niveles en tres bloques, con un contador
*x / 5 aprobados* en cada uno. El informe final solo sale “aprobado” cuando se
superan las 15 unidades.

## Nivel 3: qué acepta como correcto

Las 250 frases del nivel 2 están traducidas al español; el alumno escribe la
frase inglesa completa. La corrección es generosa a propósito:

- **Sinónimos**: *phone / mobile / cell phone*, *film / movie*, *bike /
  bicycle*, *mum / mom / mother*, *a lot of / lots of / many*, *photos /
  pictures*, *children / kids*, *great / fantastic / brilliant*, *match /
  game*… La lista está en `SWAPS`, dentro del archivo, y se pueden añadir más
  líneas sin tocar nada más.
- **Inglés británico y americano**: *centre / center*, *favourite / favorite*,
  *burnt / burned*, *learnt / learned*, *got / gotten*…
- **Contracciones**: *I have = I've*, *she has = she's*…
- **Números**: *eighteen = 18*.
- **La expresión de tiempo puede ir delante o detrás**: “Yesterday I was
  tired…” = “I was tired… yesterday”.
- Mayúsculas, comas, apóstrofes y el punto final **no cuentan**.

Lo que **no** se perdona es el verbo: *“Tom break his arm”* o *“I have never
ate”* siguen siendo incorrectos, que es de lo que va la app. Está comprobado
además que ninguna frase se puede confundir con otra al corregir.

**Pista (💡 Hint)**: da el verbo que hace falta con su forma y el vocabulario
de esa frase concreta (*rodilla = knee*, *nevera = fridge*…). El diccionario
está en `GLOSS` y también se puede ampliar.

## Acceso

Igual que en el resto de tus apps: nombre, apellidos, email, grupo
(1ESO…2BTO) y código de clase, con modo invitado para los demás profesores.
Mismos códigos y mismo PIN, en el bloque `C O N F I G U R A C I O N` de
`index.html`. Los resultados siguen yendo al nodo `irregular_verbs`.

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
