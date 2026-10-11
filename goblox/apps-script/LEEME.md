# Publicar GOBLOX para la clase (cuentas @iesgoya.es)

GOBLOX funciona de dos formas:

- **Sin conexión:** abres `goblox/index.html` en el navegador. Sirve para probarlo, pero el progreso se queda en ese navegador.
- **Con cuentas de clase:** lo publicas con Google Apps Script. Cada alumno entra con su cuenta de Google de iesgoya.es y todo se guarda en una hoja de cálculo tuya: partidas, nivel, estrellas, dinero que le queda en cada misión, puntuación y GOYUX.

No hace falta servidor ni pagar nada. Se tarda unos 10 minutos.

## 1. Crear la hoja de cálculo y el script

1. Entra en Google Drive con **tu cuenta de profesor de iesgoya.es**.
2. Crea una hoja de cálculo nueva y llámala, por ejemplo, `GOBLOX - datos`.
3. En la hoja, abre **Extensiones → Apps Script**.
4. Borra el contenido de `Código.gs` y pega todo el contenido de [`Code.gs`](Code.gs).
5. Arriba del todo, en `CONFIG`, cambia `tu.correo@iesgoya.es` por tu correo. Puedes poner varios profesores separados por comas:
   ```js
   TEACHERS: ['profe1@iesgoya.es', 'profe2@iesgoya.es'],
   ```
6. Pulsa **+ → HTML**, llama al archivo exactamente `index` (sin `.html`) y pega dentro todo el contenido de [`../index.html`](../index.html).
7. Guarda (icono del disquete).

## 2. Publicarlo solo para iesgoya.es

1. Pulsa **Implementar → Nueva implementación**.
2. En el engranaje elige **Aplicación web**.
3. Rellena:
   - **Ejecutar como:** *Yo* (tu cuenta). Así el script puede escribir en tu hoja.
   - **Quién tiene acceso:** *Cualquier usuario de IES Goya* (o "de iesgoya.es"). Con esto solo pueden entrar cuentas del instituto y Google se encarga del inicio de sesión.
4. Pulsa **Implementar** y acepta los permisos. Google te pedirá permiso para usar tu hoja de cálculo y ver tu correo.
5. Copia la **URL de la aplicación web** (termina en `/exec`). Ese es el enlace que compartes con la clase, por ejemplo en Classroom.

## 3. Crea tus clases

1. Abre el enlace de GOBLOX con tu cuenta y entra en **Profesor → Mis clases**.
2. Crea una clase por grupo (por ejemplo `3º ESO B`). Cada clase recibe un **código** (por ejemplo `3ESOB-K7Q2`).
3. Da a cada grupo su código. La primera vez que un alumno entra, el juego le pide el código y lo coloca en su clase.

Para qué sirven las clases:
- **Solo juegan tus alumnos.** Aunque el enlace llegue a otros alumnos del instituto, sin un código de clase válido no pueden entrar. Si no quieres este filtro, pon `REQUIRE_CLASS_CODE: false` en `CONFIG`.
- **Panel por clases.** Filtras la lista por clase, das GOYUX a una clase entera (selecciona todos y pulsa "Dar a los seleccionados") y mueves alumnos de una clase a otra.
- **Cada clase es un mundo.** En My Nation, el ranking, las visitas y las cartas son solo entre países de la misma clase.
- **Cerrar una clase.** Al cerrarla nadie más puede unirse con ese código; los alumnos que ya están siguen jugando.

### ¿Y si otros profesores quieren usarlo?

Hay dos opciones:

- **Cada profesor con su propia copia (recomendado).** El otro profesor abre tu hoja, hace **Archivo → Hacer una copia** (el script se copia con ella), cambia `TEACHERS` por su correo y publica su propia aplicación web (pasos 1 y 2). Tiene su propio enlace, sus alumnos y sus datos, y tú no ves los suyos. Es lo más sencillo y lo mejor para la protección de datos.
- **Una hoja compartida para un departamento.** Añade los correos de los demás profesores a `TEACHERS`. Cada profesor solo ve en su panel los alumnos de las clases que él ha creado.

No recomiendo una sola hoja para todo el instituto (cientos de alumnos y muchos profesores): Apps Script lo aguanta, pero cada profesor debe ser responsable de los datos de sus propios alumnos.

## 4. (Opcional) Enlace para invitados sin cuenta de iesgoya.es

Sirve para que juegue alguien de fuera del instituto, por ejemplo tu hija. Se hace con una **segunda implementación** del mismo script; tus alumnos siguen usando el primer enlace.

1. **Implementar → Nueva implementación → Aplicación web.**
2. **Ejecutar como:** *Yo*. **Quién tiene acceso:** *Cualquier usuario*. Así no necesita ninguna cuenta de Google.
3. Copia esta segunda URL: es el **enlace para invitados**.
4. En GOBLOX, abre la pestaña **Profesor → Invitados**, escribe su nombre, elige la clase en la que quieres que aparezca y pulsa **Crear código** (por ejemplo `LUCIA-7K3P`).
5. Dale el enlace para invitados y su código. La primera vez el juego le pide el código y lo recuerda en ese navegador.

Sin un código válido no se puede jugar, aunque alguien consiga el enlace. Desde el mismo panel puedes **desactivar** un código cuando quieras. Los invitados aparecen en la lista de alumnos con un correo del tipo `invitado:lucia-7k3p` y puedes darles GOYUX igual que a un alumno.

## 5. Uso diario

- **Alumnos:** abren el enlace. Si no han iniciado sesión, Google les pide su cuenta del instituto. La primera vez aparecen solos en la hoja **Alumnos**.
- **Profesorado:** con tu cuenta verás la pestaña **Profesor** en el menú de arriba. Desde ella puedes:
  - Ver nivel, partidas, estrellas y GOYUX de cada alumno.
  - Dar GOYUX con un clic (+1, +5, +10, −5) o a varios alumnos a la vez con una cantidad y un motivo.
  - Ver el historial de partidas de cada alumno: fecha, juego, puntuación, presupuesto, dinero restante, inglés, modales y minutos.
  - Crear y desactivar códigos de invitado.
- **Capturas de los alumnos:** en la pantalla de inicio tienen el botón **My progress card**, una tarjeta con su nombre, correo, nivel, GOYUX, estrellas y últimas misiones, pensada para hacerle una captura. La pantalla de resultados de cada misión muestra también su nombre, la fecha y un **código de partida** (por ejemplo `PZLKQ`). Para comprobar que una captura es real, busca ese código en la columna *Código partida* de la hoja **Partidas** (Ctrl + F).
- **También puedes dar GOYUX directamente en la hoja:** añade una fila en la pestaña **GOYUX** con fecha, correo del alumno, nombre, cantidad y motivo. Los totales de **Alumnos** se recalculan solos.

## Qué guarda cada hoja

| Hoja | Una fila por… | Contenido |
| --- | --- | --- |
| Alumnos | alumno | nombre, clase, nivel, partidas, GOYUX (de juego, del profesor y total), estrellas por juego, última conexión |
| Partidas | misión terminada | fecha, juego, puntuación, estrellas, presupuesto, dinero restante, % de inglés, modales, duración, errores, GOYUX ganados y código de partida |
| GOYUX | premio del profesor | fecha, alumno, cantidad (puede ser negativa), motivo y profesor |
| Invitados | persona invitada | código, nombre, si está activo (SÍ/NO) y su clase |
| Clases | clase | código, nombre, profesor y si está abierta (SÍ/NO) |
| Países | país de un alumno | nombre, capital, lema, terrenos, edificios, GOYUX gastados, impuestos cobrados, población, felicidad, economía, seguridad, cultura, medio ambiente y puntuación |
| Diplomacia | carta entre países | quién la envía, a quién, tipo de tratado, estado (pendiente, aceptado o rechazado) y el texto de la carta y de la respuesta |

## Niveles de dificultad

Antes de cada misión el alumno elige la dificultad:

| | Easy (A2) | Normal (A2–B1) | Hard (B1+) |
| --- | --- | --- | --- |
| Opciones de respuesta | 2 | 3 | 4 |
| Traducción al español | siempre visible | con el botón ES | no hay |
| Presupuesto | más dinero | normal | más ajustado |
| Sorpresas | menos | normal | todas |
| GOYUX | ×0,8 | ×1 | ×1,25 |

La dificultad de cada partida queda guardada en la hoja **Partidas**. El **nivel** que aparece en el perfil ("Level 2") es otra cosa: es la experiencia del alumno, que sube cada 200 GOYUX ganados jugando.

## My Nation: el país de cada alumno

Cada alumno funda su propio país anglosajón en una isla 3D y lo hace crecer con sus GOYUX:

- **Terreno:** la isla tiene 81 parcelas (9 × 9). Se empieza con 5 y cada parcela nueva cuesta 4 GOYUX más que la anterior (30, 34, 38…). Comprar la isla entera cuesta más de 13.000 GOYUX, así que hay terreno para muchos juegos.
- **Precios:** los edificios cuestan entre 30 GOYUX (parque) y 240 (Estatua de la Libertad, Ópera de Sídney). Una partida da unos 100 GOYUX.
- **Mover un edificio:** desde el edificio (tecla E → *Move to another plot*) se puede trasladar a otra parcela vacía propia, por la mitad de lo que costó.
- **Edificios:** cada uno tiene un precio y un **test de inglés autocorregido**. Hay que acertar 4 de 5 para construirlo, y las preguntas cambian en cada intento. Cada edificio practica un tema: pasiva (fábrica), modales (parlamento), pasado simple (museo), *should* (hospital), primer condicional (puerto), estilo indirecto (TV), etc. Los monumentos (Big Ben, Estatua de la Libertad, Ópera de Sídney, CN Tower, castillo de Edimburgo) piden una **lectura comprensiva**.
- **Indicadores:** población, felicidad, economía, seguridad, cultura y medio ambiente. Una fábrica da dinero pero contamina, así que tienen que equilibrar.
- **Impuestos:** una vez al día pueden cobrar impuestos acertando una pregunta de inglés: entre 5 y 30 GOYUX, según la economía del país.
- **Diplomacia:** con una embajada pueden escribir una **carta formal** a otro país de la clase para proponer un tratado comercial, cultural o de paz. Las cartas se construyen eligiendo frases correctas y formales. Si el otro país responde aceptando, también con una carta correcta, los dos ganan bonificaciones.
- **Visitas:** pueden visitar los países de sus compañeros y ver sus edificios.

### Ideas para clase

- **Ranking semanal:** proyecta el ranking mundial (botón 🌍 dentro de My Nation) y premia con GOYUX al país que más haya mejorado.
- **Asamblea de las Naciones Unidas:** cada alumno presenta su país en inglés en un minuto (nombre, capital, lema, edificio favorito y por qué). Los demás votan.
- **Mapa de alianzas:** pide que cada alumno firme al menos un tratado con alguien con quien no suele trabajar. Así se mezclan los grupos.
- **Crisis:** anuncia una "crisis" (por ejemplo, contaminación) y da GOYUX extra a los países que tengan el medio ambiente por encima del 60%.
- **Todos participan:** como cada país es individual y todo queda en la hoja (edificios, tests aprobados, cartas), ves enseguida quién no avanza.

## Cuando actualices el juego

Si cambias `index.html` (por ejemplo, con un juego nuevo):

1. Pega el nuevo contenido (y el nuevo `Code.gs` si también ha cambiado) en el archivo `index` del proyecto de Apps Script.
2. Ve a **Implementar → Gestionar implementaciones**, edita la implementación (lápiz), elige **Versión: nueva versión** y pulsa **Implementar**. Si tienes también el enlace para invitados, repítelo con esa implementación.

Los enlaces no cambian.

## Problemas frecuentes

- **"Necesitas permiso" o "No se puede abrir el archivo":** el alumno ha entrado con una cuenta personal (gmail). Tiene que cambiar a su cuenta de iesgoya.es (icono de su foto → cambiar de cuenta) o abrir el enlace en una ventana de incógnito.
- **"Could not connect to your account":** revisa que la implementación esté en *Ejecutar como: Yo* y *Cualquier usuario de IES Goya*.
- **Un alumno no puede abrir la aplicación aunque use su cuenta del instituto:** algunos centros tienen bloqueadas las aplicaciones de Apps Script para alumnos menores de edad. El administrador de Google Workspace del instituto puede permitirlo en *Consola de administración → Seguridad → Acceso y control de datos → Controles de API*, o en los ajustes de Apps Script para la unidad organizativa de alumnos.
- **Trampas:** el servidor limita la puntuación a 0–100. Las misiones terminadas en menos de 90 segundos no dan GOYUX y solo se guarda una partida por minuto. Puedes cambiar estos valores en `CONFIG`.
