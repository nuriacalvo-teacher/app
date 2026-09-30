# Relative Clauses · EnglishPRO

App de práctica de las **oraciones de relativo** en inglés (ESO / Bachillerato), hecha con el mismo motor y el mismo sistema de corrección que [past-tenses](https://github.com/nuriacalvo-teacher/past-tenses).

**8 módulos × 3 niveles, con 10 ejercicios por nivel (240 en total):**

1. Relative Pronouns (who, which, that, whose, where, when, why, whom, what)
2. Defining Relative Clauses (sin comas, *that*, omisión del pronombre)
3. Non-defining Relative Clauses (comas, nunca *that*, *which* = lo cual)
4. Defining vs Non-defining (las comas cambian el significado)
5. Prepositions, whom & quantifiers (*the man to whom…*, *some of which*, *what*)
6. Reduced Relative Clauses (*the girl sitting…*, *a book written by…*, *the first to arrive*)
7. Rephrasing (unir dos frases con un relativo)
8. Review of Relative Clauses

- **Level 1:** opción múltiple (hace falta un 90 % para aprobar)
- **Level 2:** rellenar huecos (80 %)
- **Level 3:** traducción del español al inglés (80 %). En el módulo 7 se unen dos frases en inglés con la palabra que va entre paréntesis.

En **cada lista de 10 ejercicios** hay 5 frases afirmativas (50 %), 3 preguntas (30 %) y 2 negativas (20 %). Los ejemplos de la teoría siguen el mismo reparto.

Cada módulo empieza con una explicación en español y ejemplos. Los alumnos pueden entrar con su cuenta de Google y el código de clase, o como invitados (en ese caso no se guarda nada).

## Corrección

- **Level 2:** si valen varios pronombres (*who / that*, *which / that*, *where / in which*), se acepta cualquiera que sea correcto. Las contracciones y las mayúsculas no cuentan.
- **Level 3:** igual que en past-tenses, se aceptan todas las respuestas correctas, no solo la del modelo:
  - *who* o *that* cuando valen los dos, y la omisión del pronombre cuando es objeto de una defining
  - la preposición al final o delante (*the girl I spoke to* / *the girl to whom I spoke*)
  - sinónimos (mum/mother, film/movie, shop/store, grandma/grandmother…), ortografía británica y americana, contracciones y números en cifra o en letra
  - *he* o *she* cuando la frase en español no lleva sujeto
- Se marcan como error: *which* para personas, *that* o la falta de pronombre en una non-defining, repetir el pronombre (*the book which I read it*), *what* detrás de un nombre, etc.
- ⚠️ El corrector ignora la puntuación, así que **las comas no se corrigen en el nivel 3** (sí en los niveles 1 y 2). La teoría y las instrucciones avisan de que en los exámenes sí cuentan.

Si hay que añadir una alternativa, se escribe en el campo `pat` de la frase: `(a|b)` = vale a o b, `[x]` = opcional, `@grupo` = grupo de sinónimos.

## Tests

```
node tests/level3.test.js    # corrector del nivel 3: 80 frases, respuestas buenas y malas
node tests/content.test.js   # 10 ejercicios por nivel y reparto 50/30/20
```

## ⚠️ Firebase: hay que hacer una cosa una sola vez

Esta app guarda los resultados en su propio nodo, **`relative_clauses_v1`** (el de past-tenses es `past_tenses_v1`), para que las notas de las apps no se mezclen.

En la consola de Firebase (proyecto *goya-english*): Realtime Database → **Reglas**. Duplica el bloque de `past_tenses_v1`, cambia el nombre a `relative_clauses_v1` y publica.

Hasta que no lo hagas, el modo invitado funciona, pero la entrada con código de clase mostrará "Wrong class code".

## Publicarla

Settings → Pages → Deploy from a branch → rama / root.
