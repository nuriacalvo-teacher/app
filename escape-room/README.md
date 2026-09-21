# WORD VAULT · Escape Room RPG

Juego de **escape room + rol por equipos** para practicar inglés en la pizarra digital.
**El juego está íntegramente en inglés** (interfaz, historia y preguntas); este README está
en español porque es la guía de uso para clase.

🔗 `https://nuriacalvo-teacher.github.io/app/escape-room/`

| Fichero | Para qué sirve |
|---|---|
| `index.html` | El juego completo. No hace falta tocarlo. |
| `content.json` | **Contenido nuevo.** Lo que añadas aquí aparece en el juego. |
| `tools/rebuild-content.js` | Regenera el banco de preguntas desde las apps de la web. |

---

## Cómo se juega

De 2 a 6 equipos, **una sola pantalla**, sin móviles ni cuentas. Un jugador de cada equipo
sale a la pizarra por turnos.

1. **Cinco cámaras**, una por destreza: verbos irregulares, tiempos presentes, vocabulario,
   orden de la frase y hábitos (*used to*). El profesor o los propios equipos eligen con
   cuál jugar (modo *Free roam*).
2. Cada acierto **revela una letra de la piedra clave** de la cámara. Al terminar las
   preguntas, cualquier equipo puede escribirla para abrir la puerta (+15 puntos).
3. La primera letra de cada piedra clave forma el **código maestro** (con las cinco cámaras:
   `WORDS`).
4. **Capa de rol:** cada equipo elige una clase con un poder por cámara (escudo, revelar
   opciones, congelar el reloj, +15 segundos, segunda oportunidad), tiene corazones, gana XP
   y sube de nivel. Los fallos se pueden **robar** (rebote) y las rachas multiplican los puntos.
5. Al final aparece **el Guardián de las Palabras**: preguntas rápidas de todas las cámaras
   que le quitan vida, con golpes críticos si se responde deprisa.
6. **Informe de clase** al terminar: puntos, aciertos, porcentaje por equipo y por cámara,
   y la cámara más floja para repasar. Se puede imprimir.

**Teclado:** `1–4` o `A–D` responder · `Enter` enviar · `Espacio` continuar · `H` usar el poder.

---

## Añadir contenido nuevo (sin tocar código)

Hay tres formas, de la más rápida a la más permanente:

### 1 · Pegar palabras en clase (30 segundos)
En la pantalla de inicio, apartado **6 · New content**, caja *Our own words*:
una palabra por línea, con la pista detrás de una barra vertical.

```
wrist | the part between your arm and your hand
stomach | food goes here after you swallow
*meticulous | careful with every small detail
```

El `*` marca la palabra como **B2** (solo sale en niveles altos). Se guarda en ese ordenador.

### 2 · Subir preguntas a `content.json` (para todo el alumnado)
El juego lee `content.json` **cada vez que se abre**. Edita el fichero en GitHub
(lápiz ✏️ → *Commit changes*) y añade objetos a la lista `items`:

```json
{
  "items": [
    { "r": "vocab", "t": "mcq",
      "q": "Which word means a person who travels to work every day?",
      "o": ["commuter", "customer", "colleague", "coach"],
      "lv": [4, 6], "tip": "A commuter travels between home and work.",
      "sub": "Module 3", "em": "🚆" },

    { "r": "tense", "t": "gap",
      "q": "She ___ in this school since 2019.",
      "a": ["has worked", "has been working"], "hint": "work",
      "lv": [4, 6], "tip": "Since + momento concreto → present perfect.",
      "sub": "Present Perfect", "em": "🧪" }
  ]
}
```

| Campo | Qué es |
|---|---|
| `r` | cámara: `verb`, `tense`, `vocab`, `order`, `habit` |
| `t` | formato: `mcq`, `gap`, `forms`, `order`, `scramble`, `vowels`, `listen` |
| `q` | el enunciado (en los huecos, `___` donde falta la palabra) |
| `o` | opciones del test, **la correcta primero** (se barajan en pantalla) |
| `a` | respuestas válidas de los formatos escritos, p. ej. `["doesn't work","does not work"]` |
| `lv` | niveles que la ven: `[1,6]` = de 1º ESO a 2º Bach |
| `tip` | el comentario que sale tras responder |
| `sub` | pequeño título sobre la pregunta |
| `em` | un emoji |

Al abrir el juego aparece **“N extra questions loaded”** en el apartado 6.

### 3 · Cargar preguntas desde otra dirección
En el mismo apartado, *Question file from an address*: pega la URL de cualquier JSON con esa
misma estructura (por ejemplo, un `content.json` de otro repositorio) y pulsa **Add**.
Se recuerda solo en ese ordenador; *Forget sources* lo borra.

---

## Regenerar el banco desde las apps de la web

Las 800 preguntas que trae el juego salen de las apps destacadas del portal
(`irregular-verbs`, `present-tenses`, `battles`, `sentence-formation`, `habits`).
Si esas apps crecen, se puede regenerar el banco:

```bash
cd tools
git clone --depth 1 https://github.com/nuriacalvo-teacher/irregular-verbs
git clone --depth 1 https://github.com/nuriacalvo-teacher/present-tenses
git clone --depth 1 https://github.com/nuriacalvo-teacher/battles
git clone --depth 1 https://github.com/nuriacalvo-teacher/sentence-formation
git clone --depth 1 https://github.com/nuriacalvo-teacher/habits
node rebuild-content.js      # escribe content.json
```

Sube ese `content.json` al repositorio y el juego lo carga solo.

---

## Publicarlo en el portal

Para que salga en `nuriacalvo-teacher.github.io`, añade esta entrada a `apps.json`
del repositorio del portal:

```json
{
  "id": "word-vault",
  "repo": "app",
  "url": "https://nuriacalvo-teacher.github.io/app/escape-room/",
  "title": "Word Vault",
  "subtitle": "Escape room por equipos",
  "description": "Escape room y juego de rol por equipos: cinco cámaras de verbos irregulares, tiempos presentes, vocabulario, orden de la frase y hábitos, con piedras clave, poderes y jefe final.",
  "category": "grammar",
  "levels": ["2º ESO", "3º ESO", "4º ESO", "1º Bach", "2º Bach"],
  "tags": ["Escape room", "Por equipos", "Pizarra digital"],
  "icon": "fa-dungeon",
  "accent": "amber",
  "status": "live",
  "featured": true,
  "visible": true
}
```

---

Sin cuentas, sin servidor y sin datos guardados fuera del navegador. Necesita internet
para cargar Tailwind, Font Awesome y la tipografía, igual que el resto de las apps.
