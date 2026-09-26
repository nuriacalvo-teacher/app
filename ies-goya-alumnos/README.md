# Archivo histórico del IES Goya · Expedientes de alumnos (s. XIX)

Aplicación web para que varios profesores registren, entre todos y en distintos momentos, los expedientes de alumnos del IES Goya desde 1845. Los datos se guardan en una **hoja de cálculo de Google** (Google Sheets) y la aplicación funciona con **Google Apps Script**. No hay que pagar nada ni mantener ningún servidor.

**Ver cómo queda sin instalar nada:** descarga `demo.html` y ábrelo en el navegador. Es una simulación: los datos se quedan en tu navegador y no llegan a Google.

## Qué hace

| Función | Detalle |
|---|---|
| **Formulario de expediente** | Se genera a partir de la hoja *Campos*: la coordinación añade, renombra, ordena o desactiva campos desde la propia app, sin tocar código. |
| **Sin duplicados** | Mientras escribes, un panel comprueba si el alumno ya existe: nombre idéntico (sin tener en cuenta tildes, «Y», «DE»…), grafías antiguas (XIMÉNEZ/JIMÉNEZ, VIDAL/BIDAL, YGLESIAS/IGLESIAS…) y alumnos con los mismos apellidos. Al guardar se vuelve a comprobar en el servidor con bloqueo, así que dos personas no pueden crear el mismo alumno a la vez. Un homónimo sólo se guarda si alguien confirma que es otra persona, y queda anotado. |
| **Edición simultánea** | Si dos personas abren el mismo expediente, la app avisa. Si las dos guardan, sólo vale el primer cambio: el segundo recibe un aviso y no borra el trabajo del primero. |
| **Número de orden alfabético** | Cada alumno tiene un número **GOYA000001, GOYA000002…** que sigue el orden alfabético de apellidos y nombre: GOYA000001 es el primero. Si se registra un alumno que va delante, los siguientes corren un puesto. La app muestra siempre el número del momento. La hoja de cálculo se reordena y renumera sola cada noche (o al momento con el botón de *Ajustes*). Además, cada expediente tiene un **nº de registro permanente** (R000001…), que es el que usa el historial y no cambia nunca. |
| **Carpetas** | Cada carpeta tiene número, primer y último apellido, estado (pendiente / en curso / terminada) y quién la trabaja. La app **sugiere la carpeta** a partir de los apellidos y tiene un buscador «¿en qué carpeta está este apellido?». Con **«Asignar»** se elige en un desplegable qué profesor/a (con permiso de edición) trabaja cada carpeta, para no trabajar dos en la misma. Puedes crear carpetas de una en una o de golpe (p. ej. de la 41 a la 80). |
| **Lugar de nacimiento** | País (España por defecto; incluye Cuba, Puerto Rico, Filipinas, Francia…). Si el país es España, la provincia se elige en un desplegable. La localidad siempre se escribe a mano, con sugerencias de los municipios actuales del INE y de las localidades que ya ha escrito el equipo. Si el país no es España, no se pide provincia y la ciudad se escribe a mano. |
| **Índice alfabético** | Todos los alumnos por orden alfabético del primer apellido (la Ñ va detrás de la N), con barra de letras, recuentos y opción de imprimir. |
| **Búsqueda** | Por apellidos, nombre, localidad o número, con filtros por carpeta, profesor, estado, país, provincia, ilustre y digitalizado. Cada fila muestra el número, el lugar de nacimiento (localidad, provincia y, si nació fuera, el país destacado en azul), el curso, la carpeta, si es ilustre (★), si está digitalizado y el estado. La coordinación puede exportar el resultado a CSV (se abre en Excel). |
| **Permisos por correo** | Tres roles: **Coordinación** (todo), **Editor/a** (crear y modificar) y **Sólo consulta**. Sólo entra quien tú des de alta. |
| **Historial** | Cada alta, cambio, borrado y ajuste queda anotado con su autor, la fecha y qué ha cambiado (valor anterior → valor nuevo). |
| **Papelera** | Nada se borra del todo: los expedientes borrados van a una papelera y se pueden recuperar. |
| **Copias de seguridad** | Copia manual con un clic y copia automática semanal en Google Drive. |

## Un solo archivo histórico, organizado por épocas

La app es el **Archivo histórico del IES Goya**, con una **portada** que muestra todas las épocas: *Siglo XIX (1845–1900)*, *1900–1930*, *1930–1975*…

- **Una sola app y un solo enlace** para todo el profesorado.
- **Comunes a todas las épocas:** profesorado y permisos, campos del formulario, historial de cambios, ajustes y copias de seguridad.
- **Propio de cada época:** sus alumnos, sus carpetas y su numeración. Por ejemplo, GOYA000001 en el siglo XIX y GOYA1900-000001 en 1900–1930.
- **Cada época va en su propio archivo de Google**, y cada archivo tiene su propio límite de 10 millones de celdas. La del siglo XIX va dentro de la hoja central; las nuevas se crean solas, en la misma carpeta de Drive, desde *Épocas del archivo → Nueva época*.
- **Búsqueda en todo el archivo:** en *Buscar*, el interruptor «Buscar en todas las épocas» junta los resultados en un único orden alfabético.
- **Duplicados entre épocas:** al registrar un alumno, la app avisa también si aparece en otra época (por ejemplo, alguien que ingresó en 1898 y siguió en 1903).
- **Épocas cerradas:** cuando se termine de vaciar una época, la coordinación puede **cerrarla**. A partir de ahí, sólo la coordinación puede modificarla.
- El **nº de registro permanente** lleva delante el código de la época (XIX-R000001, 1900_1930-R000001). Así, si algún día se quiere unir todo en una única tabla, no se repite ninguno.

## Dónde está la app y quién puede ver los datos

- **La app vive en Google, no en GitHub.** Al implementarla, Google le da una dirección del tipo `https://script.google.com/macros/s/…/exec`. Esa es la app «online» que se abre desde cualquier ordenador o móvil. Se puede poner como enlace o incrustar en la web del centro (Google Sites).
- **GitHub sólo guarda el código**, que no contiene datos, contraseñas ni correos reales. Da igual que el repositorio sea público: con el código nadie puede entrar en tu hoja. No publiques la app en GitHub Pages: se perdería la identificación con Google.
- **Los datos sólo están en tu hoja de cálculo**, en tu Google Drive, y no se comparten con nadie. La app los lee y escribe «como tú», y antes comprueba en el servidor de Google quién es cada persona y qué rol tiene. No hay forma de saltarse esa comprobación desde el navegador.
- **Quién entra:**
  - Sólo las personas dadas de alta en *Profesores y permisos*. Si alguien no está en la lista, ve «No tienes acceso».
  - Las personas con código de acceso tienen 5 intentos; después, la entrada queda bloqueada 15 minutos.
  - Si quitas a alguien, deja de entrar al momento.
- **Qué puede hacer cada rol:**
  - **Sólo consulta:** ver.
  - **Editor/a:** crear y modificar.
  - **Coordinación:** además, borrar (a la papelera), exportar la base completa, cambiar campos y permisos, y ver el historial.
- **Nada se pierde:**
  - Cada cambio queda en el historial con el valor anterior.
  - Los borrados van a la papelera.
  - Google guarda el historial de versiones de la hoja (*Archivo → Historial de versiones*), y puedes activar la copia semanal en Drive.

## Consulta pública (ver sin poder editar)

Cada época tiene un interruptor **«Consulta pública»** en *Coordinación → Épocas del archivo → ✏*. Si está activado, **cualquier persona** que abra la app puede buscar y ver los expedientes de esa época, **sin iniciar sesión ni código**, pero no puede cambiar nada.

- **Qué ven los visitantes:** portada, búsqueda, índice alfabético y fichas.
- **Qué no ven:** correos del profesorado, historial, carpetas de trabajo y papelera.
- **Cómo entra el profesorado:** con el botón **«Acceso profesorado»** (correo y código de acceso), o directamente si Google les reconoce con su cuenta del instituto.
- **Épocas no públicas:** siguen siendo sólo para las personas dadas de alta en *Profesores y permisos*.
- ⚠️ **Protección de datos:** activa la consulta pública sólo en épocas antiguas, como el siglo XIX. Los expedientes de personas que pueden estar vivas están protegidos por el RGPD y **no deben publicarse**. Por eso cada época se decide por separado y el interruptor viene apagado.
- Para que la consulta pública funcione, la app debe estar publicada con **Who has access: Anyone**.

## Capacidad: ¿cabe todo el archivo?

Unos 1000 alumnos al año desde 1845 dan unos **181 000 expedientes** hasta hoy.

- Google Sheets admite **10 millones de celdas por archivo**. Cada expediente ocupa una fila de unas 25 columnas: 13 campos más los datos de control.
- **181 000 expedientes × 25 columnas ≈ 4,5 millones de celdas**, así que cabe con holgura. Quedaría sitio para unos 200 000 expedientes más, o para unos 25 campos nuevos.
- El **historial** de cambios va en **un archivo de Google aparte**, que se crea solo al instalar y tiene su propio límite. Así no le quita espacio a los alumnos.
- La instalación elimina las columnas vacías sobrantes, porque también cuentan para el límite.
- En *Ajustes y copias* verás un indicador con las celdas usadas y cuántos expedientes caben todavía.

**Velocidad.** Con decenas de miles de filas, Google Sheets tarda **unos segundos** en cada búsqueda. Para ahorrar tiempo:
- La clave de orden de cada alumno se guarda al grabarlo y no se recalcula en cada búsqueda.
- El historial se lee sólo por páginas.
- La reordenación física de la hoja (lo más pesado) se hace de noche.

Si algún día se quedara corto, la solución es separar el archivo por siglos (una copia de la app para el XIX y otra para el XX). No hay que cambiar nada del código.

## Instalación (unos 10 minutos, una sola vez)

> Hazlo con la cuenta que vaya a ser la **propietaria** de los datos. Lo ideal es la cuenta del centro o del proyecto (por ejemplo, `@educa.aragon.es`) y no una cuenta personal.

1. **Crea la hoja de cálculo.** Entra en [sheets.new](https://sheets.new) y ponle nombre, por ejemplo *Archivo histórico IES Goya – Alumnos*.
2. **Abre el editor de código:** menú *Extensiones → Apps Script*.
3. **Pega los archivos.** La forma más fácil es usar la carpeta **`para-copiar/`**, que tiene sólo dos archivos:
   - En `Código.gs`, borra todo y pega el contenido de **`para-copiar/Codigo.gs`**.
   - Pulsa **＋ → HTML**, llama al archivo **`Index`** (sin `.html`) y pega el contenido de **`para-copiar/Index.html`**.
   - Guarda (💾) y pasa al paso 4.

   *Alternativa (para quien vaya a tocar el código): pegar los archivos separados de la carpeta `apps-script/`:*
   - Borra lo que haya en `Código.gs` y pega el contenido de **`Codigo.gs`**.
   - Crea con **＋ → HTML** estos cuatro archivos, **con estos nombres exactos y sin `.html`**: `Index`, `Estilos`, `Cliente` y `Datos`. En cada uno, pega el contenido del archivo correspondiente.
   - Opcional: en *Configuración del proyecto* (⚙) activa «Mostrar el archivo de manifiesto appsscript.json» y pega `appsscript.json`. Así se fija la zona horaria de Madrid.
   - Guarda (💾).
4. **Instala la estructura:** en la barra superior elige la función **`instalar`** y pulsa **▶ Ejecutar**. Google te pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (proyecto) → Permitir*. Así se crean las hojas *Alumnos, Campos, Profesores, Carpetas y Ajustes*, el archivo aparte del *Historial*, el formato de colores, las carpetas de la 1 a la 40 (la 1 ya con ABADÍA Y CORTINA – ABEIJÓN Y FUERTES) y tu usuario como coordinación.
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
- En la hoja aparece el menú **«Archivo IES Goya»**, con opciones para reinstalar o reparar la estructura, ordenar y renumerar, dar formato, hacer una copia de seguridad y ver el enlace de la app.
- Al instalar se crean dos tareas automáticas: la **ordenación nocturna** (2:00) y, si la activas en *Ajustes*, la **copia semanal**. Puedes verlas en Apps Script, en *Activadores* (icono del reloj).
- Las columnas de la hoja *Alumnos* están en formato texto a propósito, para que Google no convierta las fechas antiguas ni los números. La fila 1 contiene las claves internas de los campos: no la cambies.

## Cómo se ve la hoja de cálculo en Google Sheets

No hay que pasar nada a mano: **la app escribe directamente en la hoja de Google**, y `instalar` le da formato para que se lea bien también desde Google Sheets.

- **Pestañas por colores:** *Alumnos* en granate, *Carpetas* en dorado y la configuración (*Campos, Profesores, Ajustes*) en azul oscuro. El historial está en su propio archivo, en la misma carpeta de Drive.
- **Alumnos:**
  - La primera fila es una cabecera azul oscuro que se queda fija. Cada columna lleva una nota con su nombre completo y su ayuda: pasa el ratón por la cabecera para verla.
  - Las columnas **Nº, APELLIDOS y NOMBRE** van primero y se quedan fijas al desplazarte a la derecha. Los apellidos van en negrita.
  - Las filas alternan blanco y crema, y están **ordenadas alfabéticamente** (se reordenan cada noche).
  - Colores automáticos:
    - **Estado:** TERMINADO en verde, EN PROCESO en ámbar y PENDIENTE DE REVISIÓN en rosa.
    - **Ilustre:** SÍ en dorado.
    - **Digitalizado:** SÍ en verde; HAY QUE BUSCAR en ámbar.
    - **País:** los nacidos fuera de España, en azul.
    - **Papelera:** los expedientes borrados salen en gris tachado.
  - El **filtro** está activado en la cabecera, para filtrar u ordenar desde la propia hoja.
  - Las columnas técnicas (claves de duplicados, nº de registro, orden, versión) están ocultas.
- **Carpetas:** en verde las terminadas y en ámbar las que están en curso. En rosa salen las que aún no tienen definido el primer o el último apellido.
- **Profesores:** la coordinación en rosa y los editores en azul. Las personas inactivas salen tachadas.

Si alguna vez se descoloca algo (por ejemplo, tras añadir campos o pegar datos a mano), usa el menú de la hoja **Archivo IES Goya → Dar formato a las hojas**.

**¿Tienes ya datos en otra hoja o en Excel?**
1. Pégalos en la hoja *Alumnos*, debajo de la cabecera y respetando las columnas: APELLIDOS, NOMBRE, CARPETA, etc.
2. Usa **Archivo IES Goya → Ordenar alfabéticamente y renumerar**. Se completan los números, las claves de duplicados y el orden.

## Organización del trabajo (recomendada)

1. La coordinación define el primer y el último apellido de cada carpeta a medida que se abren (*Carpetas → ✏*).
2. Cada profesor se asigna una carpeta (*Carpetas → Asignar* y elige su nombre), registra sus expedientes («Guardar y siguiente» mantiene su nombre y la carpeta) y la marca como terminada.
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
para-copiar/        ← instalación fácil: sólo 2 archivos (generados)
demo.html           demostración autónoma (generada)
herramientas/
  generar_datos.py  regenera Datos.html a partir del listado de municipios del INE
  construir_demo.py regenera demo.html
  empaquetar.py     regenera para-copiar/ (Codigo.gs + Index.html con todo dentro)
  gas-simulado.js   simulación de Apps Script usada por la demo
```
