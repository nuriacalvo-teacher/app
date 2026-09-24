# Archivo histórico del IES Goya · Expedientes de alumnos (s. XIX)

Aplicación web para que varios profesores registren, entre todos y en distintos momentos, los expedientes de alumnos del IES Goya desde 1845. Los datos se guardan en una **hoja de cálculo de Google** (Google Sheets) y la aplicación funciona con **Google Apps Script**. No hay que pagar nada ni mantener ningún servidor.

**Ver cómo queda sin instalar nada:** descarga `demo.html` y ábrelo en el navegador. Es una simulación: los datos se quedan en tu navegador y no llegan a Google.

## Qué hace

| Función | Detalle |
|---|---|
| **Formulario de expediente** | Se genera a partir de la hoja *Campos*: la coordinación añade, renombra, ordena o desactiva campos desde la propia app, sin tocar código. |
| **Sin duplicados** | Mientras escribes, un panel comprueba si el alumno ya existe: nombre idéntico (sin tener en cuenta tildes, «Y», «DE»…), grafías antiguas (XIMÉNEZ/JIMÉNEZ, VIDAL/BIDAL, YGLESIAS/IGLESIAS…) y alumnos con los mismos apellidos. Al guardar se vuelve a comprobar en el servidor con bloqueo, así que dos personas no pueden crear el mismo alumno a la vez. Un homónimo sólo se guarda si alguien confirma que es otra persona, y queda anotado. |
| **Edición simultánea** | Si dos personas abren el mismo expediente, la app avisa. Si las dos guardan, sólo vale el primer cambio: el segundo recibe un aviso y no borra el trabajo del primero. |
| **Carpetas** | Cada carpeta tiene número, primer y último apellido, estado (pendiente / en curso / terminada) y quién la trabaja. La app **sugiere la carpeta** a partir de los apellidos y tiene un buscador «¿en qué carpeta está este apellido?». Los profesores se asignan carpetas para no trabajar dos en la misma. Puedes crear carpetas de una en una o de golpe (p. ej. de la 41 a la 80). |
| **Lugar de nacimiento** | País (España por defecto; incluye Cuba, Puerto Rico, Filipinas, Francia…). Si el país es España, la provincia se elige en un desplegable. La localidad siempre se escribe a mano, con sugerencias de los municipios actuales del INE y de las localidades que ya ha escrito el equipo. Si el país no es España, no se pide provincia y la ciudad se escribe a mano. |
| **Índice alfabético** | Todos los alumnos por orden alfabético del primer apellido (la Ñ va detrás de la N), con barra de letras, recuentos y opción de imprimir. |
| **Búsqueda** | Por apellidos, nombre, localidad o identificador, con filtros por carpeta, profesor, estado, ilustre, digitalizado… Se puede exportar el resultado a CSV (se abre en Excel). |
| **Permisos por correo** | Tres roles: **Coordinación** (todo), **Editor/a** (crear y modificar) y **Sólo consulta**. Sólo entra quien tú des de alta. |
| **Historial** | Cada alta, cambio, borrado y ajuste queda anotado con su autor, la fecha y qué ha cambiado (valor anterior → valor nuevo). |
| **Papelera** | Nada se borra del todo: los expedientes borrados van a una papelera y se pueden recuperar. |
| **Copias de seguridad** | Copia manual con un clic y copia automática semanal en Google Drive. |

**Capacidad.** Una hoja de Google admite 10 millones de celdas. Con unos 25 campos por expediente caben **más de 300 000 expedientes**. Las búsquedas y el índice se calculan en el servidor y se muestran por páginas, de modo que la app sigue yendo rápida aunque haya decenas de miles de alumnos.

## Instalación (unos 10 minutos, una sola vez)

> Hazlo con la cuenta que vaya a ser la **propietaria** de los datos. Lo ideal es la cuenta del centro o del proyecto (por ejemplo, `@educa.aragon.es`) y no una cuenta personal.

1. **Crea la hoja de cálculo.** Entra en [sheets.new](https://sheets.new) y ponle nombre, por ejemplo *Archivo histórico IES Goya – Alumnos*.
2. **Abre el editor de código:** menú *Extensiones → Apps Script*.
3. **Pega los archivos** de la carpeta `apps-script/`:
   - Borra lo que haya en `Código.gs` y pega el contenido de **`Codigo.gs`**.
   - Crea con **＋ → HTML** estos cuatro archivos, **con estos nombres exactos y sin `.html`**: `Index`, `Estilos`, `Cliente` y `Datos`. En cada uno, pega el contenido del archivo correspondiente.
   - Opcional: en *Configuración del proyecto* (⚙) activa «Mostrar el archivo de manifiesto appsscript.json» y pega `appsscript.json`. Así se fija la zona horaria de Madrid.
   - Guarda (💾).
4. **Instala la estructura:** en la barra superior elige la función **`instalar`** y pulsa **▶ Ejecutar**. Google te pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (proyecto) → Permitir*. Así se crean las hojas *Alumnos, Campos, Profesores, Carpetas, Historial y Ajustes*, las carpetas de la 1 a la 40 (la 1 ya con ABADÍA Y CORTINA – ABEIJÓN Y FUERTES) y tu usuario como coordinación.
5. **Publica la aplicación:** *Implementar → Nueva implementación → ⚙ Tipo: Aplicación web*.
   - **Ejecutar como:** *Yo*.
   - **Quién tiene acceso:**
     - Si todo el profesorado usa cuentas del mismo dominio (p. ej. `@educa.aragon.es`), elige **«Cualquier usuario de [dominio]»**. Google identifica a cada persona automáticamente.
     - Si hay cuentas de distintos dominios o `@gmail.com`, elige **«Cualquier usuario con una cuenta de Google»**. A quien Google no identifique, la app le pedirá su correo y el **código de acceso** que le asignes en *Profesores y permisos* (botón «Generar»).
   - Pulsa *Implementar* y copia la **URL de la aplicación web**. Ese es el enlace que se envía al profesorado.
6. **Da de alta al equipo:** abre la app, ve a *Profesores y permisos → Añadir persona* e indica el nombre (tal como debe salir en la lista de profesores), el correo y el rol.

### Importante

- **No compartas la hoja de cálculo** con el profesorado. Todos deben trabajar desde la app, que es la que controla permisos, duplicados e historial. La hoja sólo la deben abrir la coordinación y los administradores.
- **Cuando cambies el código** (una versión nueva de estos archivos), ve a *Implementar → Gestionar implementaciones → ✏ → Versión: Nueva versión → Implementar*. La URL no cambia.
- En la hoja aparece el menú **«Archivo IES Goya»**, con opciones para reinstalar o reparar la estructura, hacer una copia de seguridad y ver el enlace de la app.
- Las columnas de la hoja *Alumnos* están en formato texto a propósito, para que Google no convierta las fechas antiguas ni los números. La fila 1 contiene las claves internas de los campos: no la cambies.

## Organización del trabajo (recomendada)

1. La coordinación define el primer y el último apellido de cada carpeta a medida que se abren (*Carpetas → ✏*).
2. Cada profesor se asigna una carpeta, registra sus expedientes («Guardar y siguiente» mantiene su nombre y la carpeta) y la marca como terminada.
3. Antes de crear un expediente, hay que mirar el panel **Comprobación de duplicados**. Si el alumno ya existe, se completa el expediente existente.
4. La coordinación revisa de vez en cuando el *Historial* y la *Papelera*, y activa la copia semanal en *Ajustes y copias*.

## Estructura del proyecto

```
apps-script/        ← lo que se pega en Apps Script
  Codigo.gs         servidor: datos, permisos, duplicados, historial, copias
  Index.html        estructura de la página
  Estilos.html      diseño
  Cliente.html      lógica de la interfaz
  Datos.html        países, provincias y municipios (INE) para las sugerencias
  appsscript.json   manifiesto (zona horaria, V8)
demo.html           demostración autónoma (generada)
herramientas/
  generar_datos.py  regenera Datos.html a partir del listado de municipios del INE
  construir_demo.py regenera demo.html
  gas-simulado.js   simulación de Apps Script usada por la demo
```
