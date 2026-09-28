# PROMPT GENÉRICO · Corrección robusta del LEVEL 3 (traducción español → inglés)

> **Cómo usarlo:** copia todo lo que hay debajo de la línea y rellena solo la sección **0 · FICHA DE LA APP**. El resto es igual para todas las apps (Present Tenses, Past Tenses, Irregular Verbs, Future Tenses, Relative Clauses, Passive Voice, Reported Speech, Prepositions, Adverbs, Conditionals, Modals…).

---

## 0 · FICHA DE LA APP (rellenar en cada app)

- **App:** `<<NOMBRE, p. ej. PAST TENSES>>`
- **Archivo:** `index.html` (un solo archivo; módulos × 3 niveles)
- **Punto gramatical que evalúa el Level 3:** `<<p. ej. "elegir entre past simple / past continuous / past perfect">>`
- **Ficha temática que aplica (sección 9):** `<<p. ej. 9.2 Past tenses>>` (puede ser más de una)
- **Repositorio de la app:** `<<https://github.com/nuriacalvo-teacher/NOMBRE>>`

> **Piezas comunes ya hechas** (repositorio `nuriacalvo-teacher/app`, carpeta `prompts/kit/`). Úsalas tal cual, no las reescribas:
> - `L3-ENGINE-v1.js`: el motor común de corrección (sección 3).
> - `retry_patch.py`: el parche para repetir solo las preguntas falladas (sección 13). Se aplica con `python3 retry_patch.py index.html`.
> - `tests/load.js` y `tests/level3.test.js`: los tests genéricos. En cada app solo hay que escribir `tests/level3.cases.js`.
> - Implementaciones de referencia ya publicadas: `present-tenses` y `past-tenses`.

---

## 1 · CONTEXTO Y ALCANCE

Trabaja sobre `index.html` de esta app educativa de gramática inglesa (N módulos × 3 niveles). **Antes de cambiar nada, haz una copia de seguridad `index.backup.html`** y no la vuelvas a tocar.

**Paso previo obligatorio (inspección):** localiza en el archivo y anota los nombres reales, porque pueden variar de una app a otra:
- Dónde se definen las frases del Level 3 (normalmente `tr: [...]` dentro de cada módulo de `MODULE_DEFS`, con `es`, `verb`/pista, `en`, `alts`, `x`).
- Dónde se construyen las preguntas (`type: "translate"`, `qid: \`${def.id}_l3_${i}\``, `answers`).
- Las funciones de corrección existentes (en Present Tenses: `normalize`, `normalizeLoose`, `expandTrContractions`, `sReadings`, `canonCore`, `canonVariants`, `contentBag`, `gradeTranslation`), las tablas `SWAPS`, `TIME_RX`, `GLOSS`, y `modelAnswer`.
- Dónde se guardan/envían resultados (`saveResultLocally`, `attemptLog`, el objeto `answers` que va a Firebase, `localStorage`).
Si algún nombre no existe o es distinto, adáptate a lo que haya y dilo en el resumen final.

**Solo puedes tocar el LEVEL 3:** los datos `tr` de cada módulo, las tablas de apoyo de la corrección (`SWAPS`, `TIME_RX`, `GLOSS` solo si hace falta), las funciones de corrección, `modelAnswer` y el texto `LEVELS[2].how`.
**No toques:** Level 1, Level 2, Firebase (configuración y estructura), panel del profesor, estilos, textos en español de las frases ni los `qid` (el progreso guardado depende de ellos).

## 2 · OBJETIVO

Un alumno que escribe una traducción **correcta** nunca debe ser penalizado por detalles que no son un error de inglés (mayúsculas, puntuación, apóstrofos, contracciones, espacios, cifras/letras, variantes británicas/americanas, sinónimos, construcciones equivalentes). Y una traducción **incorrecta** (gramática, orden de palabras, tiempo/estructura equivocada, ortografía inexistente) debe seguir fallando.

## 3 · ARQUITECTURA: MOTOR COMÚN + DATOS DE LA APP

Organiza el código en dos bloques claramente separados:

1. **Motor común**, idéntico en todas las apps, delimitado así para poder copiarlo tal cual de una app a otra:
   ```
   /* ===== L3-ENGINE v1 · START (no editar por app; copiar igual en todas) ===== */
   ...normalizador, contracciones, números, ortografía GB/US, expansor de plantillas, comparador por orden, gradeTranslation, modelAnswer del L3...
   /* ===== L3-ENGINE v1 · END ===== */
   ```
   Copia el de `prompts/kit/L3-ENGINE-v1.js` y solo amplíalo si hace falta, subiendo la versión y anotando qué cambia, para llevar ese cambio al resto de apps.
2. **Datos propios de la app**: frases `tr` con sus plantillas, tabla de huecos `{T:...}` y cualquier regla temática (sección 9), pasados al motor como configuración (p. ej. `L3_CONFIG = { movable: [...], slots: {...}, extraSwaps: [...] }`).

Las funciones antiguas que queden sin uso se eliminan, no se dejan muertas.

## 4 · TAREA A · Normalizador robusto (se aplica a la respuesta del alumno Y a las respuestas modelo)

1. Unicode NFKC, minúsculas, recorte y colapso de espacios.
2. Apóstrofos tipográficos (`' ’ ‘ ʼ \` ´`) → `'`.
3. **Todos los signos se sustituyen por un ESPACIO, nunca por vacío:** `. , ; : ! ? ¿ ¡ " « » “ ” ( ) [ ] - – — … /`. ("Every day,I get up" no puede convertirse en "dayi".) El apóstrofo se trata aparte (punto 4). Excepción: `7:00` y `7.30` como horas se normalizan antes de quitar signos.
4. **Contracciones**: toda forma vale CONTRAÍDA o COMPLETA, en cualquier mezcla dentro de la misma frase, con apóstrofo recto, curvo o sin apóstrofo. La forma completa es la canónica. Tabla mínima:
   - **BE:** I'm, you're, he's, she's, it's, we're, they're, that's, there's, here's, what's, who's, where's, how's, when's, why's (+ am/is/are). Negativas: isn't, aren't, wasn't, weren't, y "I'm not", "he's not", "you're not", "they're not" (= am not / is not / are not). "amn't" no.
   - **HAVE auxiliar:** I've, you've, we've, they've, who've, could've/should've/would've/might've/must've (= … have), y he's/she's/it's/who's/that's + participio (= has). Negativas: haven't, hasn't, hadn't, "I've not", "she's not arrived", "they've not".
   - **WILL:** I'll, you'll, he'll, she'll, it'll, we'll, they'll, that'll, there'll (= will). won't = will not. "'ll not" no se acepta (poco natural).
   - **WOULD / HAD:** I'd, you'd, he'd, she'd, it'd, we'd, they'd. Ambiguo: se prueban ambas lecturas (I'd go → would; I'd gone / I'd been → had; I'd better → had).
   - **DO:** don't, doesn't, didn't.
   - **MODALES:** can't / cannot / can not (canónico: can not o cannot, pero equivalentes), couldn't, shouldn't, wouldn't, mustn't, needn't, mightn't, shan't.
   - **Otras:** let's = let us; y'all no; what're, who're, where're, there're si el alumno las usa; gonna/wanna/gotta **no** (registro informal: no se aceptan).
   - **'s ambiguo** (is / has / posesivo / us en let's): probar todas las lecturas; la respuesta es correcta si **alguna** coincide con una aceptada.
   - **Sin apóstrofo** (dont, doesnt, didnt, isnt, arent, wasnt, werent, havent, hasnt, hadnt, cant, couldnt, wouldnt, shouldnt, mustnt, im, ive, youre, youve, youll, youd, theyre, theyve, theyll, theyd, weve, wed, itll, thats, theres, whats, lets…): reconocerlas. Las que son **palabras inglesas reales** (ill, well, were, wed, its, hes, shes, shell, hell, wont, id, lets, cant, whore…) solo se expanden como **lectura alternativa**: primero se prueba la lectura literal; si no coincide con ninguna respuesta aceptada, se prueba la contraída.
   - Límite de combinatoria: si una frase tiene muchas formas ambiguas, genera las lecturas de forma perezosa y para en cuanto una coincida (tope razonable, p. ej. 256 lecturas por respuesta).
5. **Horas y números:**
   - "7", "7 am", "7 a.m.", "7:00", "7.00", "seven", "seven o'clock", "7 o'clock" equivalentes cuando la frase dice "a las siete" (am/pm solo si no contradice la frase: "a las siete de la tarde" ≠ "7 am"). `o'clock` / `oclock` / `o clock` opcional. "half past seven" = "seven thirty" = "7:30".
   - Cifras y letras equivalentes (0–100 al menos, decenas, "a hundred" / "one hundred" / "100", "a thousand"…). Años: "2020" = "twenty twenty" = "two thousand and twenty" = "two thousand twenty". Ordinales: "1st" = "first", "21st" = "twenty-first" (el guion ya es un espacio).
   - Fechas: "on 5 May" = "on May 5" = "on the fifth of May" = "on May the fifth".
6. **Ortografía y léxico británico/americano equivalentes** (tabla en el motor, ampliable): travelling/traveling, cancelled/canceled, learnt/learned, dreamt/dreamed, burnt/burned, spelt/spelled, smelt/smelled, got/gotten (solo como participio US), programme/program, colour/color, favourite/favorite, centre/center, theatre/theater, realise/realize, organise/organize, grey/gray, mum/mom, maths/math, at the weekend/on the weekend, holiday/vacation, flat/apartment, film/movie, mobile/cell phone/phone, autumn/fall, lorry/truck, underground/subway, shop/store, rubbish/garbage/trash, biscuit/cookie, football/soccer (solo si no hay ambigüedad), timetable/schedule, lift/elevator, queue/line, post/mail, have got/have (posesión).
7. **Nombres propios:** sin importar mayúsculas (lo cubre el paso a minúsculas). Nombres de ciudades/países con forma inglesa y española si ambas se usan en inglés (Saragossa/Zaragoza no: solo la usada habitualmente).
8. **Sin corrector difuso:** NO se aceptan erratas ni formas inexistentes ("studys", "goed", "writed", "childs", "informations"). La ortografía cuenta.

## 5 · TAREA B · Orden de palabras (eliminar la "bolsa de palabras")

Elimina cualquier comparación por bolsa de palabras ordenada (en Present Tenses: `contentBag`), que hoy acepta frases desordenadas como "day every seven at up get I". Sustitúyela por una comparación **que respete el orden del núcleo** (sujeto + auxiliares/verbo + complementos). Solo se permite mover libremente lo que en inglés se puede mover de verdad:

- **Expresiones de tiempo/frecuencia/lugar-tiempo** al principio o al final de la oración (amplía `TIME_RX` o la lista `movable` de la configuración): today, tonight, tomorrow, yesterday, now, right now, at the moment, these days, nowadays, this/last/next week|month|year|morning|afternoon|evening|summer…, every X, on Mondays, at/on (the) weekends, in 2020, in the morning, two days ago, lately, recently, all day/morning, for + X, since + X, by + X, at + hora, when/while/before/after + oración subordinada, if + oración (condicionales).
- **Adverbios de frecuencia y de foco** solo en sus posiciones legítimas: delante del verbo principal y detrás de be/auxiliar (I always get up / she is always late / I have never eaten), y los que admiten posición final o inicial (sometimes, usually, often al principio/final; yet al final; already/just/ever/never/still solo en su sitio). NO: "I get up always", "she always is late".
- **Adverbios oracionales** (unfortunately, luckily, however, actually, of course) al principio o tras el sujeto/auxiliar.
- **Artículos y determinantes** (a/the/my/our/your) solo cuando **ambos usos son correctos y mantienen el significado** — se declaran en la plantilla con `(a|the|my)`, no se ignoran globalmente.
- "for", "since", "ago", "yet", "already", "just", "by", preposiciones regidas y partículas de phrasal verbs **nunca se ignoran**.

La permutación de piezas movibles se genera en la expansión (sección 6) o se resuelve en la comparación extrayendo esas piezas a una lista y comparando el núcleo en orden estricto + el conjunto de piezas. Una frase con las palabras correctas en orden agramatical ("Fridays on work doesn't mother my") debe **FALLAR**.

## 6 · TAREA C · Mini-lenguaje de plantillas para generar variantes

Añade a cada frase un campo opcional `pat` (compatible con `en` y `alts`, que se siguen aceptando):

- `(a|b|c)` = alternativas; se pueden anidar: `(have just left|have just gone out of) (home|the house|their house)`.
- `[x]` = opcional: `at seven [o'clock]`.
- `{T:clave}` = hueco movible (expresión de tiempo, adverbial, subordinada…) cuyos equivalentes y posiciones permitidas (`inicio`, `final`, o ambas) se definen en una tabla `SLOTS` de la configuración de la app: `SLOTS["every day"] = { forms: ["every day","each day","daily"], pos: ["start","end"] }`.
- `@sinonimo` opcional: referencias a grupos de sinónimos compartidos (`@mobile` = mobile|mobile phone|phone|cell phone|cellphone) definidos una vez en el motor o en la app.
- Ejemplo: `(I|We) [usually] (get up|wake up) at (seven|7) [o'clock] {T:every day}`

Reglas:
- Se expande **una sola vez, de forma perezosa**, al abrir el módulo (o la primera vez que se corrige una pregunta), a un `Set` de cadenas **ya normalizadas** (contracciones expandidas, números y GB/US canonizados) que se guarda en `q.accepted`.
- Tope: **5.000 variantes por pregunta**; si se supera, `console.warn` con el `qid` y el número, y se trunca (o se reescribe la plantilla).
- `q.answers` sigue siendo la **lista corta** que ve el alumno: respuesta modelo + como mucho 2 alternativas representativas.
- `q.accepted` es solo para corregir: **no** se guarda en `localStorage`, ni en `attemptLog`, ni en lo que se envía a Firebase (revisa `saveResultLocally`, `attemptLog`, el objeto `answers` enviado y cualquier `JSON.stringify` de preguntas/módulos). Si algo serializa `MODULES` o preguntas enteras, exclúyelo explícitamente.
- La carga de la página no debe notar la expansión: **menos de ~200 ms en total** medidos con `performance.now()`; indica el tiempo medido en el resumen.

## 7 · TAREA D · Cobertura obligatoria en TODAS las frases del Level 3

Para **cada** frase (todas las de todos los módulos; cuéntalas y dilo en el resumen), revisa y añade, si son inglés **correcto y natural** y **conservan el significado del español**:

1. **Sinónimos** de cada palabra léxica (nombres, verbos, adjetivos, adverbios): mobile/phone/cell phone, film/movie, series/show/TV series, dinner/supper, mother/mum/mom, house/home, big/large, start/begin, finish/end, quickly/fast, half an hour/thirty minutes/30 minutes…
2. **Expresiones equivalentes**: "Acaban de salir de casa" → have just left (home / the house / their house) / have just gone out; "Llevo esperándote media hora" → I have been waiting for you for half an hour / for thirty minutes / for 30 minutes.
3. **Otros tiempos y construcciones válidas** para el mismo significado, cuando sean gramaticalmente correctos (simple/continuo, perfect simple/continuous, going to / will / presente continuo para planes, used to / would para hábitos pasados, etc.). Respeta las restricciones gramaticales reales (verbos de estado —know, understand, like, love, want, need, believe, own, have = poseer— **no** admiten continuo).
4. **Preposiciones y artículos alternativos** que sean correctos (at/on the weekend, arrive at/in según lugar, been to/in, late for/to class, at home / at my house). Tan importante como añadir las correctas es **no aceptar las incorrectas** ("arrive to London", "married with", "depend of").
5. **Partes de la frase española sin traducir en las respuestas actuales** (p. ej. "ya está decidido", "hoy", "¡Mira!", "por favor", "¿verdad?"): acepta tanto su traducción (con sinónimos: "it's already decided / it's settled / it's all arranged") como que el alumno traduzca solo la parte principal, **siempre que la estructura evaluada sea correcta**.
6. **Formas con y sin contracción**, y mezcladas en la misma frase (lo resuelve el motor; no hace falta escribirlas en `pat`).
7. **Posición de los complementos movibles**: "This month we are living with my grandparents" = "We are living with my grandparents this month".
8. **Cifras/letras y GB/US** donde aparezcan (lo resuelve el motor; compruébalo en los tests).

**La pista entre paréntesis** (`verb`/hint) indica el verbo o la estructura esperada. Una traducción con **otro verbo** distinto al de la pista se acepta solo si es igual de natural y conserva el punto evaluado (criterio de abajo).

**Criterio (decide tú como lingüista, sin pedir revisión al profesor):** una variante se acepta si es inglés correcto y natural, significa lo mismo que el español y **ejercita el punto gramatical que evalúa la app** (sección 0). Por tanto:
- **Se aceptan** los sinónimos y los verbos distintos al de la pista cuando son igual de naturales (*departs*, *watched a series*, *done my homework*).
- **No se aceptan:**
  - las traducciones que **esquivan** el punto evaluado: voz activa en Passive Voice, estilo directo en Reported Speech, pasado simple americano en lugar del present perfect;
  - los registros muy informales (*gonna*);
  - los calcos del español (*married with*, *lost the bus*).

No hay que generar `REVISAR.md`.

## 8 · TAREA E · Tests obligatorios

Crea `tests/level3.test.js` (Node puro, sin dependencias). Carga el código real del `index.html` extrayendo el `<script>` y ejecutándolo con `vm` en un contexto con stubs mínimos (`window`, `document`, `localStorage`, `firebase`…), de modo que se prueben las funciones **reales**, no una copia. Recorre automáticamente **todas** las preguntas `type: "translate"`.

Por cada pregunta:
- **POSITIVOS** (deben ACEPTARSE): respuesta modelo; sin punto final; sin ningún signo; TODO EN MAYÚSCULAS; todo en minúsculas; espacios dobles y espacios al principio/final; coma sin espacio detrás; apóstrofo recto, curvo y ausente; cada variante de sinónimos/tiempos/preposiciones/construcciones añadida; pieza movible al principio y al final; cifras en número y en letra; variante GB y US.
  - Si contiene una forma contraíble: (1) todo completo, (2) todo contraído con apóstrofo, (3) todo contraído sin apóstrofo, (4) mezcla completo/contraído.
- **NEGATIVOS** (deben FALLAR, mínimo 4 por pregunta, elegidos según el punto gramatical): orden de palabras roto (barajado) y núcleo invertido; estructura/tiempo incorrecto para el significado; concordancia rota (falta -s de 3ª persona, "he don't", "they was"); falta una palabra clave gramatical (for/since/ago/by/that/who/been/being…); palabra clave o verbo equivocado; forma inexistente ("goed", "studys"); frase vacía o de una sola palabra; contracción con lectura imposible (p. ej. "I'll" donde se exige pasado, "she's" leído como posesivo donde no cabe).
- Tests del **motor** independientes de las frases: normalizador (signos → espacio), cada contracción de la tabla, lecturas ambiguas ('s, 'd, palabras reales sin apóstrofo), números, horas, GB/US, expansor de plantillas (alternativas, opcionales, anidadas, huecos, tope de 5.000 con aviso).
- Test de que `q.accepted` **no** aparece en lo que se guarda/envía, y de que `modelAnswer` muestra como máximo 3 respuestas.
- Test de rendimiento: expansión de todos los módulos < 200 ms.

Al final imprime una tabla: `qid | nº variantes | positivos OK/total | negativos OK/total` y un total. **Todo debe pasar.** Ejecútalo (`node tests/level3.test.js`), arregla lo que falle y vuelve a ejecutarlo. Pega la salida final en el resumen.

## 9 · FICHAS TEMÁTICAS (aplica la que indique la sección 0)

Estas reglas completan las tareas B, D y E según el punto gramatical. Si la app no está aquí, aplica el mismo criterio: acepta todo lo correcto y equivalente, falla lo incorrecto y no aceptes lo que esquiva el punto evaluado.

- **9.1 Present tenses:** simple/continuous según hábito/acción en curso; present continuous y going to para planes (y will si el sentido lo permite); present perfect simple/continuous con for/since; verbos de estado sin continuo; adverbios de frecuencia en su sitio; for ≠ since ≠ ago.
- **9.2 Past tenses:** past simple / continuous / perfect (simple y continuous); "when/while" + subordinada movible; used to = would (hábitos, no estados) = past simple con adverbio de frecuencia (solo si no cambia el matiz); ago obligatorio donde lo pide el español; negativos: "didn't went", "was go", orden roto.
- **9.3 Irregular verbs:** acepta todas las formas **reales** y sus variantes GB/US (learnt/learned, dreamt/dreamed, burnt/burned, spelt/spelled, got/gotten, dived/dove, lit/lighted, knelt/kneeled, leant/leaned, spoilt/spoiled). Negativos: regularizaciones inexistentes (goed, writed, buyed, teached, catched, thinked, eated, drinked) y confundir pasado/participio (I have went, I seen).
- **9.4 Future tenses:** will / going to / present continuous / present simple (horarios) según el significado; will para decisiones espontáneas, promesas y predicciones sin evidencia; going to para intención y predicción con evidencia; future continuous y future perfect (by + tiempo obligatorio). Acepta varias solo si todas son naturales para ese contexto; lo discutible no se acepta. Contracciones 'll, won't, 're going to, gonna (no).
- **9.5 Relative clauses:** who/that (personas) y which/that (cosas) en especificativas; **omisión del relativo** cuando es objeto en especificativas (the book I bought); whose, where = in which = which… in (y preposición al final); en explicativas (con comas en español) **no** se acepta "that" ni la omisión (las comas del alumno no se exigen porque la puntuación no cuenta, pero "that" en explicativa sí falla). Negativos: "who" para cosas, "which" para personas, pronombre duplicado (the man who I saw him), "what" como relativo.
- **9.6 Passive voice:** acepta be + participio en el tiempo correcto (is made / was built / has been sold / is being repaired / will be sent / must be done), con o sin agente cuando el español lo permite, y la "get"-passive cuando es natural. La voz activa **no** se acepta (esquiva el punto evaluado). "Se dice que…" → It is said that… = X is said to…. Negativos: falta "be", participio incorrecto, tiempo del auxiliar equivocado.
- **9.7 Reported speech:** said (that) / told + objeto (that): "that" opcional; say ≠ tell (tell exige objeto; "said me" falla); backshift obligatorio por defecto y opcional cuando la situación sigue siendo cierta (acepta ambos solo si el español lo permite); cambios de pronombres, tiempo y lugar (tomorrow → the next day / the following day, here → there, ago → before / earlier); preguntas indirectas con orden afirmativo (asked if/whether I was…; "asked where was I" falla); órdenes: told me to / asked me to / told me not to.
- **9.8 Prepositions:** aquí **la preposición es lo evaluado**: solo se aceptan alternativas realmente equivalentes (on/at the weekend, in/on the street GB/US, different from/to/than según GB/US). Negativos: preposición española calcada (married with, depend of, arrive to + ciudad, think in = pensar en, interested on).
- **9.9 Adverbs:** posición (frecuencia: delante del verbo principal/tras be; modo: final; grado: delante del adjetivo; enough detrás del adjetivo); formación (-ly, irregulares: well, fast, hard ≠ hardly, late ≠ lately); adjetivo vs adverbio (she sings good → falla). Los adverbios que se pueden mover se declaran como huecos `{T:}` con sus posiciones legítimas.
- **9.10 Conditionals / Modals / Comparatives / Gerunds & infinitives / Phrasal verbs (futuras):** oración con "if" movible (inicio/final; la coma no cuenta); unless = if… not (solo si no cambia el matiz); must/have to (equivalentes en obligación afirmativa, **no** en negativa: mustn't ≠ don't have to); can/be able to; comparativos irregulares (better, worse, further/farther); verbos + gerundio/infinitivo con sus alternativas reales (like doing/to do; stop doing ≠ stop to do); phrasal verbs: partícula antes o después del objeto nominal, obligatoriamente después si es pronombre (turn it off; "turn off it" falla).

## 10 · TAREA F · Textos de ayuda y pantalla de solución

- Actualiza `LEVELS[2].how` (en inglés, con el mismo estilo HTML que ya tiene) para decir claramente: **no importan** mayúsculas, signos de puntuación, apóstrofos ni contracciones (I'm / I am / Im); números en cifra o letra; inglés británico o americano; **se aceptan** sinónimos y varias construcciones correctas; las expresiones de tiempo pueden ir al principio o al final; **sí cuentan** el orden de las palabras, la gramática y la ortografía.
- `modelAnswer(q)` del Level 3: muestra solo la respuesta principal + como máximo 2 alternativas (de `q.answers`), nunca `q.accepted`.

## 11 · RESTRICCIONES

- Sigue siendo **un solo `index.html`**, sin dependencias nuevas, sin build, sin CDNs nuevos.
- No cambies los textos en español, ni los `qid`, ni Level 1/Level 2, Firebase, panel del profesor ni estilos.
- Rendimiento: expansión perezosa por módulo; < ~200 ms en total.
- Compatibilidad: las frases que aún no tengan `pat` siguen funcionando con `en` + `alts`.
- Trabaja en la rama indicada, haz commits claros y sube los cambios; **no** abras pull request salvo que te lo pida.

## 12 · ENTREGA

1. `index.html` modificado e `index.backup.html` intacto.
2. `tests/level3.test.js` y la salida completa de su ejecución (todo en verde).
3. Resumen breve: cambios hechos, versión del bloque `L3-ENGINE`, nombres de funciones que eran distintos a los esperados, tiempo de expansión medido y tabla `qid | nº variantes aceptadas`.

## 13 · REPETIR SOLO LAS PREGUNTAS FALLADAS (todos los niveles)

Si el alumno **no llega al mínimo** de un módulo, puede repetir **solo las preguntas que ha fallado**, en vez del módulo entero. Se aplica igual en las 3 niveles y en todas las apps con el parche `prompts/kit/retry_patch.py` (bloque `RETRY-WRONG v1`):

- En la pantalla de resultados de un módulo suspendido aparecen dos botones: **"🎯 Repeat only the N I got wrong"** y **"🔁 Try the whole module again"**.
- En la ronda de repaso solo salen las falladas, y el título lo indica ("🎯 Only your mistakes"). Las acertadas se conservan.
- La nota se calcula **siempre sobre el módulo entero**. Ejemplo: 6/10 → repite 4 → acierta 3 → 9/10 = 90 %.
- Si vuelve a suspender, puede repetir otra vez solo las que siguen mal: ronda 3, 4…
- **El tiempo suma todo el intento.** El resultado que se guarda en Firebase y en `localStorage` es el del módulo completo, más el campo `retryRound` (1 = a la primera).
- Si cierra la pestaña a mitad de la ronda de repaso, al volver la continúa.
- Empezar el módulo de cero borra la ronda de repaso.
- Cada entrada de `attemptLog` guarda su `qid` para saber qué repetir. Los registros antiguos sin `qid` se emparejan por el enunciado.

Si el parche no encaja (nombres o textos distintos en esa app), aplica los mismos cambios a mano y pruébalo en Chromium: suspender, repetir, cerrar a mitad, reanudar y aprobar.

