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

## 3. (Opcional) Enlace para invitados sin cuenta de iesgoya.es

Sirve para que juegue alguien de fuera del instituto, por ejemplo tu hija. Se hace con una **segunda implementación** del mismo script; tus alumnos siguen usando el primer enlace.

1. **Implementar → Nueva implementación → Aplicación web.**
2. **Ejecutar como:** *Yo*. **Quién tiene acceso:** *Cualquier usuario*. Así no necesita ninguna cuenta de Google.
3. Copia esta segunda URL: es el **enlace para invitados**.
4. En GOBLOX, abre la pestaña **Profesor → Invitados**, escribe su nombre y pulsa **Crear código** (por ejemplo `LUCIA-7K3P`).
5. Dale el enlace para invitados y su código. La primera vez el juego le pide el código y lo recuerda en ese navegador.

Sin un código válido no se puede jugar, aunque alguien consiga el enlace. Desde el mismo panel puedes **desactivar** un código cuando quieras. Los invitados aparecen en la lista de alumnos con un correo del tipo `invitado:lucia-7k3p` y puedes darles GOYUX igual que a un alumno.

## 4. Uso diario

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
| Alumnos | alumno | nombre, nivel, partidas, GOYUX (de juego, del profesor y total), estrellas por juego, última conexión |
| Partidas | misión terminada | fecha, juego, puntuación, estrellas, presupuesto, dinero restante, % de inglés, modales, duración, errores, GOYUX ganados y código de partida |
| GOYUX | premio del profesor | fecha, alumno, cantidad (puede ser negativa), motivo y profesor |
| Invitados | persona invitada | código, nombre y si está activo (SÍ/NO) |

## Cuando actualices el juego

Si cambias `index.html` (por ejemplo, con un juego nuevo):

1. Pega el nuevo contenido en el archivo `index` del proyecto de Apps Script.
2. Ve a **Implementar → Gestionar implementaciones**, edita la implementación (lápiz), elige **Versión: nueva versión** y pulsa **Implementar**. Si tienes también el enlace para invitados, repítelo con esa implementación.

Los enlaces no cambian.

## Problemas frecuentes

- **"Necesitas permiso" o "No se puede abrir el archivo":** el alumno ha entrado con una cuenta personal (gmail). Tiene que cambiar a su cuenta de iesgoya.es (icono de su foto → cambiar de cuenta) o abrir el enlace en una ventana de incógnito.
- **"Could not connect to your account":** revisa que la implementación esté en *Ejecutar como: Yo* y *Cualquier usuario de IES Goya*.
- **Un alumno no puede abrir la aplicación aunque use su cuenta del instituto:** algunos centros tienen bloqueadas las aplicaciones de Apps Script para alumnos menores de edad. El administrador de Google Workspace del instituto puede permitirlo en *Consola de administración → Seguridad → Acceso y control de datos → Controles de API*, o en los ajustes de Apps Script para la unidad organizativa de alumnos.
- **Trampas:** el servidor limita la puntuación a 0–100. Las misiones terminadas en menos de 90 segundos no dan GOYUX y solo se guarda una partida por minuto. Puedes cambiar estos valores en `CONFIG`.
