/**
 * =====================================================================
 *  ARCHIVO HISTÓRICO DEL IES GOYA · Expedientes de alumnos (siglo XIX)
 *  Código de servidor (Google Apps Script vinculado a una hoja de cálculo)
 * =====================================================================
 *
 *  Instalación resumida (ver README.md para la guía completa):
 *    1. Crear una hoja de cálculo de Google vacía.
 *    2. Extensiones > Apps Script. Pegar este archivo y los .html.
 *    3. Ejecutar la función «instalar» una vez y autorizar.
 *    4. Implementar > Nueva implementación > Aplicación web
 *       (Ejecutar como: yo · Acceso: los usuarios del dominio / cualquier usuario con cuenta de Google).
 *
 *  Estructura de la hoja de cálculo (se crea sola con «instalar»):
 *    Alumnos     → un expediente por fila. Fila 1 = claves de los campos.
 *    Campos      → definición del formulario (se edita desde la app).
 *    Profesores  → personas, correo, rol (ADMIN / EDITOR / LECTOR) y código de acceso.
 *    Cajas    → número de caja, primer y último apellido, estado y quién la trabaja.
 *    Historial   → registro de todos los cambios (quién, cuándo, qué).
 *    Ajustes     → opciones generales.
 */

/**
 * Identificador de la hoja de cálculo. Sólo hace falta si este proyecto NO se creó desde la propia
 * hoja (Extensiones > Apps Script). Está en la dirección de la hoja, entre «/d/» y «/edit»:
 *   https://docs.google.com/spreadsheets/d/ESTO_ES_EL_ID/edit
 */
const ID_HOJA = '';

/** Versión del código (aparece en la pantalla de acceso: sirve para comprobar qué versión está publicada). */
const VERSION_APP = '2026-10-03';

const HOJA = {
  EPOCAS: 'Épocas',
  ALUMNOS: 'Alumnos',
  CAMPOS: 'Campos',
  PROFESORES: 'Profesores',
  CARPETAS: 'Cajas',   // antes «Carpetas»: se renombra sola (ver renombrarCajas_)
  HISTORIAL: 'Historial',
  AJUSTES: 'Ajustes'
};

/**
 * Columnas internas de la hoja Alumnos (las claves de campos nunca empiezan por «_»).
 *  ID    → número de orden alfabético visible (GOYA000001 = primer alumno por apellidos).
 *          Se recalcula al añadir alumnos: si se intercala uno, los siguientes corren un puesto.
 *  _UID  → identificador interno permanente (R000001, por orden de entrada). Nunca cambia;
 *          es el que usan el historial y la aplicación para localizar cada expediente.
 *  _ORDEN → posición alfabética (sirve para ordenar físicamente las filas de la hoja).
 */
const META = ['ID', '_BORRADO', '_CREADO_EN', '_CREADO_POR', '_MODIFICADO_EN', '_MODIFICADO_POR', '_VERSION', '_UID', '_ORDEN', '_CLAVE', '_FONETICA'];
/** Columnas técnicas que se ocultan en la hoja de cálculo. */
const META_OCULTAS = ['_UID', '_ORDEN', '_CLAVE', '_FONETICA', '_VERSION'];

const CABECERAS = {
  Epocas: ['CODIGO', 'NOMBRE', 'DESDE', 'HASTA', 'PREFIJO', 'ESTADO', 'ID_HOJA', 'DESCRIPCION', 'PUBLICA'],
  Campos: ['CLAVE', 'ETIQUETA', 'TIPO', 'OPCIONES', 'OBLIGATORIO', 'SECCION', 'ORDEN', 'AYUDA', 'EN_LISTADOS', 'ACTIVO', 'SISTEMA'],
  Profesores: ['NOMBRE', 'EMAIL', 'ROL', 'ACTIVO', 'CODIGO_ACCESO', 'NOTAS'],
  Carpetas: ['NUMERO', 'DESDE', 'HASTA', 'ESTADO', 'ASIGNADA_A', 'NOTAS'],
  Historial: ['FECHA', 'EMAIL', 'USUARIO', 'ACCION', 'REGISTRO', 'DETALLE'],
  Ajustes: ['CLAVE', 'VALOR', 'DESCRIPCION']
};

const TIPOS = ['texto', 'texto_largo', 'numero', 'fecha', 'seleccion', 'si_no', 'profesor', 'carpeta', 'pais', 'provincia', 'localidad'];
/** PUBLICO = visitante sin identificar que consulta épocas marcadas como públicas (sólo ver). */
const ROLES = { NINGUNO: 0, PUBLICO: 1, LECTOR: 2, EDITOR: 3, ADMIN: 4 };
const ESTADOS_CARPETA = ['PENDIENTE', 'EN CURSO', 'TERMINADA'];

// clave, etiqueta, tipo, opciones, obligatorio, sección, ayuda, en listados, sistema
const CAMPOS_INICIALES = [
  ['PROFESOR', 'Profesor/a que registra', 'profesor', '', true, 'Registro', '', true, true],
  ['ESTADO', 'Estado de la toma de datos', 'seleccion', 'EN PROCESO\nTERMINADO\nPENDIENTE DE REVISIÓN', true, 'Registro', 'Marca TERMINADO cuando hayas vaciado todo el expediente.', true, true],
  ['CARPETA', 'Caja del archivo', 'carpeta', '', true, 'Registro', 'La app te sugiere la caja según los apellidos.', true, true],
  ['APELLIDOS', 'Apellidos', 'texto', '', true, 'Identificación del alumno', 'Tal como aparecen en el expediente. Ej.: ABADÍA Y CORTINA', true, true],
  ['NOMBRE', 'Nombre de pila', 'texto', '', true, 'Identificación del alumno', 'Ej.: Juan Manuel', true, true],
  ['PAIS', 'País de nacimiento', 'pais', '', false, 'Lugar y fecha de nacimiento', '', true, true],
  ['PROVINCIA', 'Provincia', 'provincia', '', false, 'Lugar y fecha de nacimiento', '', true, true],
  ['LOCALIDAD', 'Localidad', 'localidad', '', false, 'Lugar y fecha de nacimiento', 'Elígela de la lista o escríbela si no aparece (nombres antiguos, pedanías…).', true, true],
  ['FECHA_NACIMIENTO', 'Fecha de nacimiento', 'fecha', '', false, 'Lugar y fecha de nacimiento', 'dd/mm/aaaa. Si sólo consta el año, escribe el año.', false, false],
  ['CURSO', 'Curso del expediente (año de inicio)', 'numero', '', true, 'Expediente', 'Ej.: 1871', true, false],
  ['ILUSTRE', 'Alumno destacado o ilustre', 'seleccion', 'NO\nDESTACADO\nILUSTRE\nSIN COMPROBAR', true, 'Expediente', 'DESTACADO: sobresalió en algún campo. ILUSTRE: personaje de renombre. SIN COMPROBAR: nadie lo ha mirado aún.', true, false],
  ['DIGITALIZADO', 'Digitalización hecha', 'seleccion', 'NO\nSÍ\nHAY QUE BUSCAR', true, 'Expediente', '', true, false],
  ['OBSERVACIONES', 'Observaciones', 'texto_largo', '', false, 'Observaciones', 'Estudios cursados, calificaciones, títulos, documentos que contiene el expediente…', false, false]
];

const AJUSTES_INICIALES = [
  ['NOMBRE_APP', 'Archivo histórico del IES Goya', 'Título de la cabecera.'],
  ['SUBTITULO', 'Expedientes de alumnos desde 1845', 'Subtítulo de la portada.'],
  ['LECTURA_ABIERTA', 'NO', 'SÍ: cualquier persona identificada que no esté en Profesores puede consultar (sin editar).'],
  ['EDITORES_SOLO_PROPIOS', 'NO', 'SÍ: los editores sólo pueden modificar los expedientes que crearon ellos.'],
  ['PREFIJO_ID', 'GOYA', 'Prefijo por defecto del número de orden (cada época tiene el suyo en la hoja Épocas).'],
  ['PAIS_DEFECTO', 'España', 'País que aparece por defecto en el formulario.'],
  ['PROVINCIA_DEFECTO', 'Zaragoza', 'Provincia que aparece por defecto en el formulario.'],
  ['COPIA_AUTOMATICA', 'NO', 'SÍ: copia de seguridad semanal automática en Google Drive (domingo de madrugada).'],
  ['COPIAS_A_CONSERVAR', '12', 'Número de copias automáticas que se conservan.'],
  ['URL_ACCESO', '', 'Enlace de la app «Acceso con Google» (proyecto aparte): permite entrar con cualquier cuenta de Google, sin código.']
];

/** Memoria de la ejecución en curso (Apps Script la reinicia en cada petición). */
const MEMO = {};

/**
 * La hoja de cálculo se reordena físicamente cada noche (o con el botón de Ajustes), no al guardar:
 * reordenarla en cada guardado hacía esperar varios segundos. La aplicación siempre muestra el
 * número de orden correcto porque lo calcula al momento.
 */

// ---------------------------------------------------------------------
//  Web app
// ---------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Archivo histórico · IES Goya')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Archivo IES Goya')
    .addItem('Instalar / reparar estructura', 'instalar')
    .addItem('Ordenar alfabéticamente y renumerar', 'ordenarYNumerar')
    .addItem('Dar formato a las hojas', 'darFormato')
    .addItem('Crear copia de seguridad ahora', 'copiaSeguridadManual')
    .addItem('Ver enlace de la aplicación', 'mostrarEnlace')
    .addToUi();
}

/**
 * Ejecútala desde el editor (desplegable → diagnostico → Run) si «instalar» falla.
 * Escribe en el registro de ejecución con qué cuenta se ejecuta y si puede abrir la hoja.
 */
/**
 * Muestra en el registro de ejecución la «clave secreta» que hay que pegar en
 * SECRETO del proyecto aparte «Acceso con Google». Ejecútala desde el editor.
 */
function verClaveSecreta() {
  console.log('Clave secreta para pegar en Acceso.gs (entre las comillas de SECRETO):');
  console.log(secretoAcceso_());
}

function diagnostico() {
  pedirPermisos_();
  invalidarConfig_();
  MEMO.sinCacheConfig = true;
  const linea = function (t) { console.log(t); };
  let efectiva = '', activa = '';
  try { efectiva = Session.getEffectiveUser().getEmail(); } catch (e) { efectiva = 'ERROR: ' + e.message; }
  try { activa = Session.getActiveUser().getEmail(); } catch (e) { activa = 'ERROR: ' + e.message; }
  linea('1) Cuenta con la que se ejecuta el código: ' + (efectiva || '(Google no la facilita)'));
  linea('2) Cuenta activa: ' + (activa || '(Google no la facilita)'));
  try {
    const a = SpreadsheetApp.getActive();
    linea('3) Hoja vinculada al proyecto: ' + (a ? a.getName() + ' (' + a.getId() + ')' : 'NINGUNA (proyecto independiente)'));
  } catch (e) { linea('3) Hoja vinculada: ERROR ' + e.message); }
  const id = String(ID_HOJA || '').trim();
  if (!id) { linea('4) ID_HOJA está vacío.'); return; }
  linea('4) ID_HOJA: «' + id + '» (' + id.length + ' caracteres)');
  try {
    const f = DriveApp.getFileById(id);
    linea('5) Drive encuentra el archivo: «' + f.getName() + '» · propietario: ' + (f.getOwner() ? f.getOwner().getEmail() : '¿?') + ' · tipo: ' + f.getMimeType());
  } catch (e) { linea('5) Drive NO encuentra el archivo con esa cuenta: ' + e.message); }
  try {
    linea('6) SpreadsheetApp la abre: «' + SpreadsheetApp.openById(id).getName() + '» → TODO CORRECTO, ya puedes ejecutar «instalar».');
  } catch (e) { linea('6) SpreadsheetApp NO la abre: ' + e.message); }
  linea('7) Versión de este código: ' + VERSION_APP + ' (la app publicada debe mostrar la misma en la pantalla de acceso)');
  try {
    const h = ss_().getSheetByName(HOJA.EPOCAS);
    if (!h) { linea('8) No existe la pestaña «' + HOJA.EPOCAS + '»: ejecuta «instalar».'); return; }
    const v = h.getDataRange().getDisplayValues();
    linea('8) Cabecera de «Épocas»: ' + v[0].join(' | '));
    const col = v[0].indexOf('PUBLICA');
    if (col < 0) linea('   ⚠ Falta la columna PUBLICA: ejecuta «instalar».');
    v.slice(1).forEach(function (f) {
      if (!f[0]) return;
      linea('   Época ' + f[0] + ' → PUBLICA = «' + (col >= 0 ? f[col] : '') + '» → ' + (col >= 0 && si_(f[col]) ? 'PÚBLICA' : 'sólo equipo'));
    });
    linea('9) ¿Hay consulta pública? ' + (hayConsultaPublica_() ? 'SÍ → los visitantes verán la portada' : 'NO → los visitantes verán la pantalla de acceso'));
    let url = ''; try { url = ScriptApp.getService().getUrl(); } catch (e) { url = '(no publicada)'; }
    linea('10) Enlace de la app publicada: ' + url);
  } catch (e) { linea('8) Error leyendo «Épocas»: ' + e.message); }
}

/**
 * Aviso que no bloquea: se escribe en el registro de ejecución y, si la hoja está abierta, aparece
 * unos segundos abajo a la derecha. (Un alert() dejaría la ejecución esperando a que alguien pulse
 * «Aceptar» en la hoja, y desde el editor parece que se ha colgado.)
 */
function avisar_(texto) {
  console.log(texto);
  try { ss_().toast(texto, 'Archivo IES Goya', 8); } catch (e) { /* sin hoja abierta */ }
}

function mostrarEnlace() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Enlace de la aplicación:\n\n' + url
    : 'Todavía no has implementado la aplicación web (Implementar > Nueva implementación).');
}

/**
 * Punto de entrada único desde el navegador: google.script.run.api(accion, datos, token).
 * Devuelve siempre JSON en texto: {ok:true,data} o {ok:false,error,sesion}.
 */
function api(accion, datos, token) {
  try {
    const def = ACCIONES[accion];
    if (!def) throw new Error('Acción no reconocida: ' + accion);
    const u = usuarioActual_(token);
    if (ROLES[u.rol] < ROLES[def.rol]) {
      if (u.rol === 'PUBLICO') throw new Error('Esto es sólo para el profesorado. Pulsa «Acceso profesorado» (arriba a la derecha) para entrar.');
      if (!u.identificado) return JSON.stringify({ ok: false, sesion: true, error: 'La sesión ha caducado. Vuelve a entrar.' });
      throw new Error('No tienes permiso para esta operación.');
    }
    datos = datos || {};
    // Época con la que se trabaja: la del expediente (va en su nº de registro) o la elegida en la app.
    MEMO.epocaPedida = epocaDeUid_(datos.id) || datos.epoca || '';
    // Las consultas pueden usar la caché; las modificaciones leen siempre la hoja.
    if (ACCIONES_LECTURA.indexOf(accion) >= 0) MEMO.usarCache = true;
    else if (def.rol === 'ADMIN') { invalidarConfig_(); MEMO.sinCacheConfig = true; }
    const data = def.fn(datos, u);
    // Sólo la coordinación cambia la configuración (campos, profesorado, ajustes, épocas): guardar
    // expedientes o cajas no obliga a releerla, y así la siguiente pantalla carga más rápido.
    if (def.rol === 'ADMIN' && ACCIONES_LECTURA.indexOf(accion) < 0) invalidarConfig_();
    if (ACCIONES_LECTURA.indexOf(accion) < 0 && ['login', 'loginGoogle', 'logout', 'bloquear', 'liberar'].indexOf(accion) < 0) {
      CacheService.getScriptCache().remove('portada');
    }
    return JSON.stringify({ ok: true, data: data });
  } catch (e) {
    console.error(accion, e && e.stack || e);
    return JSON.stringify({ ok: false, error: (e && e.message) || String(e) });
  }
}

/** Acciones que sólo leen: pueden servirse desde la caché (mucho más rápido que leer la hoja). */
const ACCIONES_LECTURA = ['arranque', 'inicio', 'consultar', 'exportar', 'obtener', 'comprobarDuplicados', 'localidadesUsadas',
  'carpetas', 'historial', 'portada', 'capacidad'];

const ACCIONES = {
  arranque:            { rol: 'NINGUNO', fn: arranque_ },
  login:               { rol: 'NINGUNO', fn: login_ },
  loginGoogle:         { rol: 'NINGUNO', fn: loginGoogle_ },
  logout:              { rol: 'NINGUNO', fn: logout_ },
  inicio:              { rol: 'LECTOR',  fn: inicio_ },
  consultar:           { rol: 'PUBLICO', fn: consultar_ },
  exportar:            { rol: 'ADMIN',   fn: exportar_ },  // descargar la base entera: sólo coordinación
  obtener:             { rol: 'PUBLICO', fn: obtener_ },
  comprobarDuplicados: { rol: 'LECTOR',  fn: comprobarDuplicados_ },
  localidadesUsadas:   { rol: 'LECTOR',  fn: localidadesUsadas_ },
  carpetas:            { rol: 'LECTOR',  fn: carpetasConRecuento_ },
  historial:           { rol: 'LECTOR',  fn: historial_ },
  guardar:             { rol: 'EDITOR',  fn: guardar_ },
  bloquear:            { rol: 'EDITOR',  fn: bloquear_ },
  liberar:             { rol: 'EDITOR',  fn: liberar_ },
  tomarCarpeta:        { rol: 'EDITOR',  fn: tomarCarpeta_ },
  borrar:              { rol: 'ADMIN',   fn: borrar_ },
  restaurar:           { rol: 'ADMIN',   fn: restaurar_ },
  guardarCampo:        { rol: 'ADMIN',   fn: guardarCampo_ },
  moverCampo:          { rol: 'ADMIN',   fn: moverCampo_ },
  guardarProfesor:     { rol: 'ADMIN',   fn: guardarProfesor_ },
  borrarProfesor:      { rol: 'ADMIN',   fn: borrarProfesor_ },
  guardarCarpeta:      { rol: 'ADMIN',   fn: guardarCarpeta_ },
  crearCarpetas:       { rol: 'ADMIN',   fn: crearCarpetas_ },
  borrarCarpeta:       { rol: 'ADMIN',   fn: borrarCarpeta_ },
  guardarAjustes:      { rol: 'ADMIN',   fn: guardarAjustes_ },
  copiaSeguridad:      { rol: 'ADMIN',   fn: function () { return crearCopia_(false); } },
  portada:             { rol: 'PUBLICO', fn: portada_ },
  crearEpoca:          { rol: 'ADMIN',   fn: crearEpoca_ },
  guardarEpoca:        { rol: 'ADMIN',   fn: guardarEpoca_ },
  ordenarAhora:        { rol: 'ADMIN',   fn: ordenarAhora_ },
  importar:            { rol: 'ADMIN',   fn: importar_ },
  capacidad:           { rol: 'ADMIN',   fn: capacidad_ }
};

// ---------------------------------------------------------------------
//  Usuarios y sesión
// ---------------------------------------------------------------------

/**
 * Identifica a quien usa la app:
 *  1) Por su cuenta de Google (funciona cuando la app y el usuario son del mismo dominio,
 *     p. ej. todos @educa.aragon.es).
 *  2) Si Google no facilita el correo (cuentas @gmail.com u otros dominios), con el
 *     token obtenido al entrar con correo + código de acceso.
 */
function usuarioActual_(token) {
  if (MEMO.usuario) return MEMO.usuario;
  let email = '', via = 'google';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { /* sin identidad */ }
  if (!email && token) {
    email = CacheService.getScriptCache().get('tok_' + token) || '';
    via = 'codigo';
  }
  email = String(email).trim().toLowerCase();
  const u = { email: email, nombre: '', rol: 'NINGUNO', via: via, identificado: !!email };
  if (email) {
    const p = profesores_().find(function (p) { return p.EMAIL.trim().toLowerCase() === email && si_(p.ACTIVO); });
    if (p) {
      u.nombre = p.NOMBRE;
      const rol = String(p.ROL).trim().toUpperCase();
      u.rol = ROLES[rol] !== undefined ? rol : 'LECTOR';
    } else if (si_(ajustes_().LECTURA_ABIERTA)) {
      u.nombre = email;
      u.rol = 'LECTOR';
    }
    // La persona propietaria del script siempre es administradora (nunca se queda fuera).
    let propietario = '';
    try { propietario = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { /* nada */ }
    if (propietario && email === propietario) {
      u.rol = 'ADMIN';
      if (!u.nombre) u.nombre = email;
    }
  }
  // Visitante sin identificar (o con una cuenta que no está en la lista): consulta pública si hay
  // alguna época abierta al público. Sólo ve esas épocas y nunca puede modificar nada.
  if (u.rol === 'NINGUNO' && hayConsultaPublica_()) u.rol = 'PUBLICO';
  MEMO.usuario = u;
  if (u.rol === 'PUBLICO') MEMO.soloPublicas = true;
  return u;
}

function hayConsultaPublica_() {
  try { return epocasTodas_().some(function (e) { return e.PUBLICA; }); } catch (e) { return false; }
}

function login_(d) {
  const email = String(d.email || '').trim().toLowerCase();
  const codigo = String(d.codigo || '').trim();
  if (!email || !codigo) throw new Error('Escribe tu correo y tu código de acceso.');
  const cache = CacheService.getScriptCache();
  const kFallos = 'fallos_' + email;
  const fallos = parseInt(cache.get(kFallos) || '0', 10);
  if (fallos >= 5) throw new Error('Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.');
  const p = profesores_().find(function (p) { return p.EMAIL.trim().toLowerCase() === email && si_(p.ACTIVO); });
  if (!p || !String(p.CODIGO_ACCESO).trim() || String(p.CODIGO_ACCESO).trim() !== codigo) {
    cache.put(kFallos, String(fallos + 1), 900);
    throw new Error('Correo o código de acceso incorrectos.');
  }
  cache.remove(kFallos);
  const token = Utilities.getUuid();
  cache.put('tok_' + token, email, 21600); // 6 horas (máximo que permite CacheService)
  delete MEMO.usuario;
  return { token: token };
}

/**
 * Entrada con CUALQUIER cuenta de Google (@gmail.com, @iesgoya.es…).
 * La app pública no puede saber quién es un visitante de otro dominio, así que un pequeño proyecto
 * aparte («Acceso con Google», archivo Acceso.gs) se ejecuta con la cuenta de la persona, obtiene su
 * correo y la devuelve aquí con un pase firmado con una clave secreta compartida: caduca en 5 minutos,
 * sólo vale una vez y no se puede falsificar. Después, los permisos los decide la lista de Profesores.
 */
function secretoAcceso_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRETO_ACCESO');
  if (!s) {
    s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('SECRETO_ACCESO', s);
  }
  return s;
}

function loginGoogle_(d) {
  const partes = String(d.acceso || '').split('.');
  if (partes.length !== 2) throw new Error('Enlace de acceso no válido.');
  let datos;
  try { datos = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString('UTF-8'); } catch (e) {
    throw new Error('Enlace de acceso no válido.');
  }
  const firma = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(datos, secretoAcceso_()));
  if (firma !== partes[1]) throw new Error('Enlace de acceso no válido: revisa que la clave secreta de la app «Acceso con Google» sea la misma que la de Ajustes.');
  const trozos = datos.split('|');
  const email = String(trozos[0] || '').trim().toLowerCase();
  const caduca = parseInt(trozos[1], 10) || 0;
  if (!email) throw new Error('Google no ha facilitado tu correo.');
  if (Date.now() > caduca) throw new Error('El enlace de acceso ha caducado. Vuelve a pulsar «Entrar con mi cuenta de Google».');
  const cache = CacheService.getScriptCache();
  const kUsado = 'usado_' + partes[1].slice(0, 200);
  if (cache.get(kUsado)) throw new Error('Este enlace de acceso ya se ha usado. Vuelve a pulsar «Entrar con mi cuenta de Google».');
  cache.put(kUsado, '1', 900);
  const token = Utilities.getUuid();
  cache.put('tok_' + token, email, 21600); // 6 horas
  delete MEMO.usuario;
  return { token: token, email: email };
}

function logout_(d, u) {
  if (d.token) CacheService.getScriptCache().remove('tok_' + d.token);
  return true;
}

function arranque_(d, u) {
  const r = { usuario: { email: u.email, nombre: u.nombre, rol: u.rol, via: u.via, identificado: u.identificado }, version: VERSION_APP };
  try { r.urlAcceso = ajustes_().URL_ACCESO || ''; } catch (e) { r.urlAcceso = ''; }
  r.consultaPublica = hayConsultaPublica_();
  if (u.rol === 'NINGUNO') return r;
  r.ajustes = ajustes_();
  r.campos = campos_();
  r.epocas = epocas_().map(function (e) { const x = Object.assign({}, e); delete x.ID_HOJA; delete x._fila; return x; });
  r.epoca = epocaActual_().CODIGO;
  r.carpetas = carpetasLista_();
  if (d.conPortada) r.portada = portada_(d, u); // así la portada llega en la misma petición
  if (u.rol === 'PUBLICO') {
    // Al público sólo le hace falta lo imprescindible.
    r.ajustes = { NOMBRE_APP: r.ajustes.NOMBRE_APP, SUBTITULO: r.ajustes.SUBTITULO, URL_ACCESO: r.ajustes.URL_ACCESO };
  }
  const profes = u.rol === 'PUBLICO' ? [] : profesores_();
  r.profesores = u.rol === 'ADMIN' ? profes : profes.filter(function (p) { return si_(p.ACTIVO); })
    .map(function (p) { return { NOMBRE: p.NOMBRE, ACTIVO: p.ACTIVO, ROL: p.ROL }; });
  if (u.rol === 'ADMIN') {
    r.secretoAcceso = secretoAcceso_();
    r.urlHoja = ss_().getUrl();
    try { r.urlApp = ScriptApp.getService().getUrl(); } catch (e) { r.urlApp = ''; }
  }
  return r;
}

// ---------------------------------------------------------------------
//  Acceso a la hoja de cálculo
// ---------------------------------------------------------------------

function ss_() {
  if (MEMO.ss) return MEMO.ss;
  let ss = null;
  const id = String(ID_HOJA || '').trim();
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) {
      throw new Error('No se puede abrir la hoja con el ID_HOJA indicado («' + id + '»). ' +
        'Motivo que da Google: ' + (e && e.message ? e.message : e) + ' · Ejecuta la función «diagnostico» para más detalles.');
    }
  }
  if (!ss) { try { ss = SpreadsheetApp.getActive(); } catch (e) { /* nada */ } }
  if (!ss) {
    const guardado = PropertiesService.getScriptProperties().getProperty('SS_ID');
    if (guardado) ss = SpreadsheetApp.openById(guardado);
  }
  if (!ss) {
    throw new Error('Este proyecto no está unido a ninguna hoja de cálculo. Copia el identificador de tu hoja ' +
      '(en su dirección, entre «/d/» y «/edit») y pégalo entre las comillas de ID_HOJA, al principio del código.');
  }
  MEMO.ss = ss;
  return ss;
}

function hoja_(nombre) {
  const h = ss_().getSheetByName(nombre);
  if (!h) throw new Error('Falta la hoja «' + nombre + '». Ejecuta «instalar» desde el editor de Apps Script.');
  return h;
}

// ---------------------------------------------------------------------
//  Épocas del archivo (Siglo XIX, 1900-1930…). La hoja central guarda lo común (épocas, campos,
//  profesorado, ajustes); cada época guarda sus alumnos y cajas en su propio archivo de Google
//  (el siglo XIX, en la propia hoja central). Así cada época tiene su propia capacidad.
// ---------------------------------------------------------------------

/** Épocas que puede ver quien usa la app (el público, sólo las marcadas como públicas). */
function epocas_() {
  const todas = epocasTodas_();
  return MEMO.soloPublicas ? todas.filter(function (e) { return e.PUBLICA; }) : todas;
}

function epocasTodas_() {
  if (MEMO.epocas) return MEMO.epocas;
  let lista = [];
  const filasEp = tablaConfig_(HOJA.EPOCAS);
  if (filasEp.length) {
    lista = filasEp.filter(function (e) { return String(e.CODIGO).trim(); }).map(function (e) {
      return {
        CODIGO: String(e.CODIGO).trim().toUpperCase(), NOMBRE: e.NOMBRE || e.CODIGO, DESDE: e.DESDE || '', HASTA: e.HASTA || '',
        PREFIJO: String(e.PREFIJO || '').trim().toUpperCase(), ESTADO: e.ESTADO || 'ABIERTA', ID_HOJA: String(e.ID_HOJA || '').trim(),
        DESCRIPCION: e.DESCRIPCION || '', PUBLICA: si_(e.PUBLICA), _fila: e._fila
      };
    });
    lista.sort(function (a, b) { return (parseInt(a.DESDE, 10) || 0) - (parseInt(b.DESDE, 10) || 0); });
  }
  if (!lista.length) {
    // Instalaciones anteriores a las épocas: todo es el siglo XIX, en la hoja central.
    lista = [{ CODIGO: 'XIX', NOMBRE: 'Siglo XIX', DESDE: '1845', HASTA: '1900', PREFIJO: '', ESTADO: 'ABIERTA', ID_HOJA: '', DESCRIPCION: '', PUBLICA: false }];
  }
  MEMO.epocas = lista;
  return lista;
}

/** Código de época que va delante del nº de registro permanente (XIX-R000123 → XIX). */
function epocaDeUid_(uid) {
  const m = /^([A-Z0-9_]+)-R\d+$/.exec(String(uid || ''));
  return m ? m[1] : '';
}

function usarEpoca_(codigo) {
  const lista = epocas_();
  if (!lista.length) throw new Error('No hay épocas disponibles.');
  const e = lista.find(function (x) { return x.CODIGO === String(codigo || '').toUpperCase(); }) || lista[0];
  if (MEMO.epoca !== e) {
    MEMO.epoca = e;
    delete MEMO.mapa; delete MEMO.cabecera; delete MEMO.libroEpoca;
  }
  return e;
}

function epocaActual_() {
  return MEMO.epoca || usarEpoca_(MEMO.epocaPedida);
}

function libroEpoca_() {
  if (MEMO.libroEpoca) return MEMO.libroEpoca;
  const e = epocaActual_();
  let libro = ss_();
  if (e.ID_HOJA && e.ID_HOJA !== libro.getId()) {
    // (el público sólo llega aquí con épocas públicas: epocas_() ya las filtra)
    try { libro = SpreadsheetApp.openById(e.ID_HOJA); } catch (err) {
      throw new Error('No se puede abrir el archivo de la época «' + e.NOMBRE + '»: ' + err.message);
    }
  }
  MEMO.libroEpoca = libro;
  return libro;
}

function hojaAlumnos_() {
  const h = libroEpoca_().getSheetByName(HOJA.ALUMNOS);
  if (!h) throw new Error('Falta la hoja «Alumnos» de la época «' + epocaActual_().NOMBRE + '». Ejecuta «instalar».');
  return h;
}

/** Las antiguas pestañas «Carpetas» pasan a llamarse «Cajas» (mismos datos). */
function renombrarCajas_(libro) {
  if (!libro.getSheetByName(HOJA.CARPETAS)) {
    const vieja = libro.getSheetByName('Carpetas');
    if (vieja) { try { vieja.setName(HOJA.CARPETAS); } catch (e) { console.error('Renombrar Carpetas', e); } }
  }
  return libro;
}

function hojaCarpetas_() {
  const h = renombrarCajas_(libroEpoca_()).getSheetByName(HOJA.CARPETAS);
  if (!h) throw new Error('Falta la hoja «Cajas» de la época «' + epocaActual_().NOMBRE + '». Ejecuta «instalar».');
  return h;
}

/** Ejecuta fn en cada época (para recuentos, búsquedas globales, formato y tareas nocturnas). */
function enCadaEpoca_(fn) {
  const previa = MEMO.epoca;
  const out = epocas_().map(function (e) { usarEpoca_(e.CODIGO); return fn(e); });
  if (previa) usarEpoca_(previa.CODIGO);
  else { delete MEMO.epoca; delete MEMO.mapa; delete MEMO.cabecera; delete MEMO.libroEpoca; }
  return out;
}

function epocaEditable_(u) {
  if (epocaActual_().ESTADO === 'CERRADA' && u.rol !== 'ADMIN') {
    throw new Error('La época «' + epocaActual_().NOMBRE + '» está cerrada: sólo la coordinación puede modificarla.');
  }
}

/** Lee una hoja pequeña (configuración) como lista de objetos. */
function tabla_(nombre) {
  return tablaDe_(hoja_(nombre));
}

function tablaDe_(h) {
  const v = h.getDataRange().getDisplayValues();
  const cab = v[0].map(function (s) { return String(s).trim(); });
  const out = [];
  for (let i = 1; i < v.length; i++) {
    if (!v[i].some(function (c) { return c !== ''; })) continue;
    const o = { _fila: i + 1 };
    cab.forEach(function (c, j) { if (c) o[c] = v[i][j]; });
    out.push(o);
  }
  return out;
}

/** Valor del campo «destacado o ilustre»: 'ILUSTRE', 'DESTACADO' o '' (los «SÍ» antiguos cuentan como ilustres). */
function nivelIlustre_(v) {
  const t = String(v || '').trim().toUpperCase();
  if (t === 'ILUSTRE' || t === 'SÍ' || t === 'SI') return 'ILUSTRE';
  return t === 'DESTACADO' ? 'DESTACADO' : '';
}

function si_(v) {
  return ['SÍ', 'SI', 'TRUE', 'VERDADERO', 'X', '1', 'S'].indexOf(String(v || '').trim().toUpperCase()) >= 0;
}

function ahora_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Madrid', 'yyyy-MM-dd HH:mm:ss');
}

// ---------------------------------------------------------------------
//  Caché (CacheService): la configuración y las columnas de alumnos se guardan unos minutos en la
//  memoria rápida de Google para no leer la hoja en cada clic. Cada escritura en una hoja de alumnos
//  cambia su «versión», así que nunca se sirven datos antiguos después de guardar.
// ---------------------------------------------------------------------

const SEG_CONFIG = 120;    // la configuración (ajustes, campos, profesorado, épocas) se relee cada 2 min
const SEG_DATOS = 1800;    // columnas de alumnos: 30 min (se invalidan al guardar)
const TROZO = 40000;       // caracteres por trozo (CacheService admite 100 KB por clave)

function cache_() { return CacheService.getScriptCache(); }

/** Tablas de configuración de la hoja central (con caché corta). */
function tablaConfig_(nombre) {
  if (!MEMO.cfg) {
    MEMO.cfg = {};
    if (!MEMO.sinCacheConfig) {
      try { const t = cache_().get('config'); if (t) MEMO.cfg = JSON.parse(t); } catch (e) { MEMO.cfg = {}; }
    }
  }
  if (!MEMO.cfg[nombre]) {
    MEMO.cfg[nombre] = ss_().getSheetByName(nombre) ? tabla_(nombre) : [];
    if (!MEMO.sinCacheConfig) {
      try { cache_().put('config', JSON.stringify(MEMO.cfg), SEG_CONFIG); } catch (e) { /* demasiado grande: sin caché */ }
    }
  }
  return MEMO.cfg[nombre];
}

function invalidarConfig_() {
  try { cache_().remove('config'); } catch (e) { /* nada */ }
  ['cfg', 'ajustes', 'profesores', 'campos', 'epocas'].forEach(function (k) { delete MEMO[k]; });
}

function versionDatos_(h) {
  const k = 'ver_' + h.getParent().getId();
  let v = cache_().get(k);
  if (!v) { v = String(Date.now()); cache_().put(k, v, 21600); }
  return v;
}

/** Marca los datos de alumnos de esa hoja como cambiados (la caché anterior deja de usarse). */
function tocarDatos_(h) {
  try {
    cache_().put('ver_' + h.getParent().getId(), String(Date.now()) + Math.random().toString(36).slice(2, 6), 21600);
    cache_().remove('portada');
  } catch (e) { /* nada */ }
}

function cacheLeer_(clave) {
  const c = cache_();
  const n = parseInt(c.get(clave) || '0', 10);
  if (!n) return null;
  const claves = [];
  for (let i = 0; i < n; i++) claves.push(clave + '#' + i);
  const trozos = c.getAll(claves);
  let txt = '';
  for (let i = 0; i < n; i++) { if (trozos[claves[i]] == null) return null; txt += trozos[claves[i]]; }
  try { return JSON.parse(txt); } catch (e) { return null; }
}

function cacheGuardar_(clave, valor, seg) {
  try {
    const txt = JSON.stringify(valor);
    const obj = {};
    let n = 0;
    for (let i = 0; i < txt.length; i += TROZO) obj[clave + '#' + (n++)] = txt.slice(i, i + TROZO);
    if (n > 400) return; // demasiado grande: no merece la pena
    cache_().putAll(obj, seg);
    cache_().put(clave, String(n), seg);
  } catch (e) { /* la caché es sólo una ayuda */ }
}

function ajustes_() {
  if (MEMO.ajustes) return MEMO.ajustes;
  const a = {};
  AJUSTES_INICIALES.forEach(function (x) { a[x[0]] = x[1]; });
  tablaConfig_(HOJA.AJUSTES).forEach(function (r) { if (r.CLAVE) a[r.CLAVE] = r.VALOR; });
  MEMO.ajustes = a;
  return a;
}

function profesores_() {
  if (!MEMO.profesores) {
    MEMO.profesores = tablaConfig_(HOJA.PROFESORES).map(function (p) {
      p = Object.assign({}, p);
      p.EMAIL = String(p.EMAIL || '').trim();
      p.ROL = String(p.ROL || 'EDITOR').trim().toUpperCase();
      return p;
    });
  }
  return MEMO.profesores;
}

function campos_() {
  if (MEMO.campos) return MEMO.campos;
  const lista = tablaConfig_(HOJA.CAMPOS).filter(function (c) { return c.CLAVE; }).map(function (c) {
    return {
      clave: String(c.CLAVE).trim(),
      etiqueta: c.ETIQUETA || c.CLAVE,
      tipo: TIPOS.indexOf(c.TIPO) >= 0 ? c.TIPO : 'texto',
      opciones: String(c.OPCIONES || '').split(/\r?\n|;/).map(function (s) { return s.trim(); }).filter(String),
      obligatorio: si_(c.OBLIGATORIO),
      seccion: c.SECCION || 'Otros datos',
      orden: parseFloat(c.ORDEN) || 999,
      ayuda: c.AYUDA || '',
      enListados: si_(c.EN_LISTADOS),
      activo: c.ACTIVO === '' ? true : si_(c.ACTIVO),
      sistema: si_(c.SISTEMA),
      _fila: c._fila
    };
  });
  lista.sort(function (a, b) { return a.orden - b.orden; });
  MEMO.campos = lista;
  return lista;
}

function camposActivos_() {
  return campos_().filter(function (c) { return c.activo; });
}

/** Columnas que se muestran en los listados (además de apellidos y nombre). */
function columnasListado_() {
  return camposActivos_().filter(function (c) {
    return c.enListados && c.clave !== 'APELLIDOS' && c.clave !== 'NOMBRE';
  }).map(function (c) { return c.clave; });
}

/** {CLAVE: número de columna} de la hoja Alumnos. */
function mapaColumnas_(h) {
  if (MEMO.mapa) return MEMO.mapa;
  let cab = null;
  const k = MEMO.usarCache ? 'cab_' + h.getParent().getId() + '_' + versionDatos_(h) : '';
  if (k) cab = cacheLeer_(k);
  if (!cab) {
    const lastCol = h.getLastColumn();
    cab = lastCol ? h.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
    if (k) cacheGuardar_(k, cab, SEG_DATOS);
  }
  const m = {};
  cab.forEach(function (c, i) { c = String(c).trim(); if (c && !m[c]) m[c] = i + 1; });
  MEMO.mapa = m;
  MEMO.cabecera = cab.map(function (c) { return String(c).trim(); });
  return m;
}

/** Garantiza que existen las columnas internas y las de todos los campos definidos. */
function asegurarColumnas_(h) {
  const mapa = mapaColumnas_(h);
  const necesarias = ['ID', 'APELLIDOS', 'NOMBRE'].concat(campos_().map(function (c) { return c.clave; }), META.slice(1))
    .filter(function (k, i, a) { return a.indexOf(k) === i; });
  const faltan = necesarias.filter(function (k) { return !mapa[k]; });
  if (faltan.length) {
    let col = h.getLastColumn();
    const libres = h.getMaxColumns() - col;
    if (libres < faltan.length) h.insertColumnsAfter(h.getMaxColumns(), faltan.length - libres);
    h.getRange(1, col + 1, h.getMaxRows(), faltan.length).setNumberFormat('@');
    h.getRange(1, col + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
    delete MEMO.mapa;
    MEMO.formatoPendiente = true;
    tocarDatos_(h);
    return mapaColumnas_(h);
  }
  return mapa;
}

/** Lee varias columnas completas de Alumnos: {CLAVE: [valores…]} (n = nº de filas de datos). */
function leerColumnas_(h, mapa, claves) {
  claves = claves.filter(function (k, i) { return claves.indexOf(k) === i; });
  if (!MEMO.usarCache || h.getName() !== HOJA.ALUMNOS) return leerColumnasHoja_(h, mapa, claves);
  // Con caché: cada columna se guarda aparte; sólo se leen de la hoja las que falten.
  const base = 'col_' + h.getParent().getId() + '_' + versionDatos_(h) + '_';
  let n = parseInt(cache_().get(base + '_n') || '-1', 10);
  const out = {};
  const faltan = [];
  claves.forEach(function (k) {
    const v = n >= 0 ? cacheLeer_(base + k) : null;
    if (v && v.length === n) out[k] = v; else faltan.push(k);
  });
  if (faltan.length) {
    const leidas = leerColumnasHoja_(h, mapa, faltan);
    if (n >= 0 && leidas._n !== n) return leerColumnasHoja_(h, mapa, claves); // la hoja cambió por fuera
    n = leidas._n;
    cache_().put(base + '_n', String(n), SEG_DATOS);
    faltan.forEach(function (k) { out[k] = leidas[k]; if (mapa[k]) cacheGuardar_(base + k, leidas[k], SEG_DATOS); });
  }
  out._n = Math.max(n, 0);
  return out;
}

function leerColumnasHoja_(h, mapa, claves) {
  const n = h.getLastRow() - 1;
  const out = { _n: Math.max(n, 0) };
  claves = claves.filter(function (k, i) { return claves.indexOf(k) === i; });
  if (n < 1) { claves.forEach(function (k) { out[k] = []; }); return out; }
  const cols = claves.map(function (k) { return mapa[k]; }).filter(Boolean);
  if (cols.length) {
    const min = Math.min.apply(null, cols), max = Math.max.apply(null, cols);
    if (max - min + 1 <= cols.length * 3) {
      // Un único bloque contiguo: una sola llamada a la hoja.
      const bloque = h.getRange(2, min, n, max - min + 1).getDisplayValues();
      claves.forEach(function (k) {
        const c = mapa[k];
        out[k] = c ? bloque.map(function (r) { return r[c - min]; }) : vacio_(n);
      });
      return out;
    }
  }
  claves.forEach(function (k) {
    out[k] = mapa[k] ? h.getRange(2, mapa[k], n, 1).getDisplayValues().map(function (r) { return r[0]; }) : vacio_(n);
  });
  return out;
}

function vacio_(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = ''; return a; }

function leerFila_(h, fila) {
  mapaColumnas_(h);
  const cab = MEMO.cabecera;
  const v = h.getRange(fila, 1, 1, cab.length).getDisplayValues()[0];
  const o = { _fila: fila };
  cab.forEach(function (c, i) { if (c) o[c] = v[i]; });
  return o;
}

function escribirFila_(h, fila, obj) {
  mapaColumnas_(h);
  const cab = MEMO.cabecera;
  if (fila > h.getMaxRows()) {
    const nuevas = 500;
    h.insertRowsAfter(h.getMaxRows(), nuevas);
    h.getRange(h.getMaxRows() - nuevas + 1, 1, nuevas, h.getMaxColumns()).setNumberFormat('@');
    MEMO.formatoPendiente = true;
  }
  const fila1 = cab.map(function (c) {
    let v = obj[c] === undefined || obj[c] === null ? '' : String(obj[c]);
    if (/^[=+@]/.test(v)) v = "'" + v; // evita que un texto se interprete como fórmula
    return v;
  });
  h.getRange(fila, 1, 1, cab.length).setValues([fila1]);
  tocarDatos_(h);
}

/** Fila de un expediente a partir de su identificador interno permanente (_UID). */
function filaDeId_(h, mapa, uid) {
  const ids = leerColumnas_(h, mapa, ['_UID'])._UID;
  const i = ids.indexOf(String(uid));
  if (i < 0) throw new Error('No se encuentra el expediente ' + uid + '.');
  return i + 2;
}

/**
 * El historial va en un archivo de Google aparte (se crea al instalar) para no gastar la capacidad
 * de la hoja de alumnos. Si no existe, se usa la pestaña «Historial» de la hoja principal.
 */
function hojaHistorial_() {
  if (MEMO.historial) return MEMO.historial;
  let h = null;
  const id = PropertiesService.getScriptProperties().getProperty('HISTORIAL_ID');
  if (id) { try { h = SpreadsheetApp.openById(id).getSheetByName(HOJA.HISTORIAL); } catch (e) { h = null; } }
  if (!h) h = hoja_(HOJA.HISTORIAL);
  MEMO.historial = h;
  return h;
}

function registrar_(u, accion, id, detalle) {
  try {
    hojaHistorial_().appendRow([ahora_(), u.email, u.nombre, accion, id || '', String(detalle || '').slice(0, 45000)]);
  } catch (e) { console.error('Historial', e); }
}

// ---------------------------------------------------------------------
//  Normalización de nombres (orden alfabético y detección de duplicados)
// ---------------------------------------------------------------------

function sinAcentos_(s) {
  return String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'Ñ');
}

/** Clave de orden alfabético español (Ñ después de N; se ignora la conjunción «Y»). */
function claveOrden_(s) {
  return sinAcentos_(s).replace(/[^A-ZÑ0-9 ]/g, ' ').replace(/(^| )Y(?= |$)/g, ' ')
    .replace(/\s+/g, ' ').trim().replace(/Ñ/g, 'N{');
}

/** Nombre normalizado sin partículas (Y, DE, DEL, LA…) para comparar. */
function normNombre_(s) {
  return (' ' + sinAcentos_(s).replace(/[^A-ZÑ ]/g, ' ') + ' ')
    .replace(/ (?:(?:Y|E|DE|DEL|LA|LAS|LOS|EL|D) )+/g, ' ').replace(/ (?:(?:Y|E|DE|DEL|LA|LAS|LOS|EL|D) )+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function claveDuplicado_(apellidos, nombre) {
  return normNombre_(apellidos) + '|' + normNombre_(nombre);
}

/** Clave «fonética» para grafías históricas y erratas: XIMÉNEZ = JIMÉNEZ, BIDAL = VIDAL, YGLESIAS = IGLESIAS, MUNOZ = MUÑOZ… */
function fonetica_(s) {
  return normNombre_(s)
    .replace(/PH/g, 'F').replace(/CH/g, '\u0002').replace(/H/g, '')
    .replace(/[VW]/g, 'B').replace(/X/g, 'J').replace(/G(?=[EI])/g, 'J')
    .replace(/QU(?=[EI])/g, 'K').replace(/C(?=[EI])/g, 'S').replace(/Z/g, 'S').replace(/[CQ]/g, 'K')
    .replace(/LL/g, 'I').replace(/Y/g, 'I').replace(/Ñ/g, 'N').replace(/\u0002/g, 'CH')
    .replace(/\s+/g, '').replace(/(.)\1+/g, '$1');
}

function claveFonetica_(apellidos, nombre) {
  return fonetica_(apellidos) + '|' + fonetica_(nombre);
}

function letraIndice_(claveOrden) {
  const c = claveOrden.charAt(0);
  if (c === 'N' && claveOrden.charAt(1) === '{') return 'Ñ';
  return /[A-Z]/.test(c) ? c : '#';
}

function normBusqueda_(s) {
  return sinAcentos_(s).replace(/[^A-ZÑ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function ordenNatural_(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  if (isNaN(na) !== isNaN(nb)) return isNaN(na) ? 1 : -1;
  return String(a).localeCompare(String(b), 'es');
}

function cero_(x, k) { return ('0000000000' + x).slice(-k); }

function prefijo_() { return String(epocaActual_().PREFIJO || ajustes_().PREFIJO_ID || 'GOYA').trim().toUpperCase(); }

/** Clave con la que se ordena cada alumno (se guarda en la columna _ORDEN para no recalcularla). */
function claveOrdenFila_(apellidos, nombre, uid) {
  return claveOrden_(apellidos) + '  ' + claveOrden_(nombre) + '  ' + (uid || '');
}

/**
 * Numeración alfabética en vivo: pone en c.ID el número que corresponde ahora mismo a cada alumno
 * (GOYA000001 = primero por apellidos; la papelera no tiene número). Así la app siempre muestra el
 * número correcto aunque la hoja todavía no se haya reordenado (se hace cada noche).
 * Necesita en c: _UID, _BORRADO, _ORDEN, APELLIDOS, NOMBRE. Devuelve los índices vivos ya ordenados.
 */
function numerar_(c) {
  const pref = prefijo_();
  const lista = [];
  for (let i = 0; i < c._n; i++) {
    if (!c._UID[i] || si_(c._BORRADO[i])) continue;
    if (!c._ORDEN[i]) c._ORDEN[i] = claveOrdenFila_(c.APELLIDOS[i], c.NOMBRE[i], c._UID[i]);
    lista.push(i);
  }
  lista.sort(function (a, b) { return c._ORDEN[a] < c._ORDEN[b] ? -1 : c._ORDEN[a] > c._ORDEN[b] ? 1 : 0; });
  c.ID = vacio_(c._n);
  lista.forEach(function (i, p) { c.ID[i] = pref + cero_(p + 1, 6); });
  return lista;
}

const COLS_NUMERACION = ['_UID', '_BORRADO', '_ORDEN', 'APELLIDOS', 'NOMBRE'];

// ---------------------------------------------------------------------
//  Panel de inicio
// ---------------------------------------------------------------------

function inicio_(d, u) {
  const h = hojaAlumnos_();
  const mapa = mapaColumnas_(h);
  const c = leerColumnas_(h, mapa, ['_UID', 'ESTADO', 'DIGITALIZADO', 'ILUSTRE', 'PROFESOR', '_BORRADO', '_CREADO_POR', '_CREADO_EN']);
  const r = { total: 0, terminados: 0, digitalizados: 0, ilustres: 0, destacados: 0, mios: 0, hoy: 0, porEstado: {}, porProfesor: {} };
  const hoy = ahora_().slice(0, 10);
  for (let i = 0; i < c._n; i++) {
    if (!c._UID[i] || si_(c._BORRADO[i])) continue;
    r.total++;
    const est = c.ESTADO[i] || '(sin estado)';
    r.porEstado[est] = (r.porEstado[est] || 0) + 1;
    if (est === 'TERMINADO') r.terminados++;
    if (si_(c.DIGITALIZADO[i])) r.digitalizados++;
    if (nivelIlustre_(c.ILUSTRE[i]) === 'ILUSTRE') r.ilustres++;
    if (nivelIlustre_(c.ILUSTRE[i]) === 'DESTACADO') r.destacados++;
    if (c._CREADO_POR[i] === u.email) r.mios++;
    if (String(c._CREADO_EN[i]).slice(0, 10) === hoy) r.hoy++;
    const p = c.PROFESOR[i] || '(sin profesor)';
    r.porProfesor[p] = (r.porProfesor[p] || 0) + 1;
  }
  const cajas = carpetasLista_();
  r.carpetas = {
    total: cajas.length,
    terminadas: cajas.filter(function (x) { return x.ESTADO === 'TERMINADA'; }).length,
    enCurso: cajas.filter(function (x) { return x.ESTADO === 'EN CURSO'; }).length,
    mias: cajas.filter(function (x) { return x.ASIGNADA_A && x.ASIGNADA_A === u.nombre && x.ESTADO !== 'TERMINADA'; })
      .map(function (x) { return x.NUMERO; })
  };
  // Últimos movimientos
  const hh = hojaHistorial_();
  const n = hh.getLastRow() - 1;
  r.ultimos = [];
  if (n > 0) {
    const k = Math.min(n, 12);
    r.ultimos = hh.getRange(hh.getLastRow() - k + 1, 1, k, 6).getDisplayValues().reverse()
      .map(function (x) { return { FECHA: x[0], USUARIO: x[2] || x[1], ACCION: x[3], ID: x[4], DETALLE: String(x[5]).slice(0, 160) }; });
  }
  return r;
}

// ---------------------------------------------------------------------
//  Consultas: búsqueda e índice alfabético
// ---------------------------------------------------------------------

function filtrar_(d, u, clavesExtra) {
  const h = hojaAlumnos_();
  const mapa = mapaColumnas_(h);
  const activos = camposActivos_().map(function (c) { return c.clave; });
  const listado = columnasListado_();
  const filtros = {};
  Object.keys(d.filtros || {}).forEach(function (k) {
    if (activos.indexOf(k) >= 0 && d.filtros[k] !== '' && d.filtros[k] !== null) filtros[k] = String(d.filtros[k]);
  });
  const claves = COLS_NUMERACION.concat(['_MODIFICADO_EN', '_CREADO_POR'], listado, Object.keys(filtros),
    d.q ? ['LOCALIDAD', 'PROVINCIA', 'PAIS', 'OBSERVACIONES'] : [], clavesExtra || []);
  const c = leerColumnas_(h, mapa, claves);
  const vivos = numerar_(c);
  const papelera = !!d.papelera && u.rol === 'ADMIN';
  let candidatos = vivos;
  if (papelera) {
    candidatos = [];
    for (let i = 0; i < c._n; i++) {
      if (!c._UID[i] || !si_(c._BORRADO[i])) continue;
      if (!c._ORDEN[i]) c._ORDEN[i] = claveOrdenFila_(c.APELLIDOS[i], c.NOMBRE[i], c._UID[i]);
      candidatos.push(i);
    }
    candidatos.sort(function (a, b) { return c._ORDEN[a] < c._ORDEN[b] ? -1 : 1; });
  }
  const q = d.q ? normBusqueda_(d.q).split(' ').filter(String) : [];
  const textoClaves = claves.filter(function (k) { return k.charAt(0) !== '_'; }).concat(['ID']);
  const letras = {};
  const idx = [];
  candidatos.forEach(function (i) {
    if (d.soloMios && c._CREADO_POR[i] !== u.email) return;
    for (const k in filtros) { if (String(c[k][i]) !== filtros[k]) return; }
    if (q.length) {
      const texto = ' ' + normBusqueda_(textoClaves.map(function (k) { return c[k] ? c[k][i] : ''; }).join(' ')) + ' ';
      if (!q.every(function (t) { return texto.indexOf(t) >= 0; })) return;
    }
    const letra = letraIndice_(c._ORDEN[i]);
    letras[letra] = (letras[letra] || 0) + 1;
    if (d.letra && letra !== d.letra) return;
    idx.push(i);
  });
  // Ya están en orden alfabético; el resto de órdenes respetan ese orden en caso de empate.
  const o = d.orden || 'apellidos';
  if (o !== 'apellidos') {
    idx.sort(function (a, b) {
      if (o === 'carpeta') return ordenNatural_(c.CARPETA ? c.CARPETA[a] : '', c.CARPETA ? c.CARPETA[b] : '');
      if (o === 'curso') return ordenNatural_(c.CURSO ? c.CURSO[a] : '', c.CURSO ? c.CURSO[b] : '');
      return String(c._MODIFICADO_EN[b]).localeCompare(String(c._MODIFICADO_EN[a]));
    });
  }
  return { c: c, idx: idx, letras: letras, listado: listado };
}

function consultar_(d, u) {
  if (d.todas) return consultarTodas_(d, u);
  const extra = d.orden === 'carpeta' ? ['CARPETA'] : d.orden === 'curso' ? ['CURSO'] : [];
  const f = filtrar_(d, u, extra);
  const tam = Math.min(Math.max(parseInt(d.tam, 10) || 50, 10), 500);
  const paginas = Math.max(1, Math.ceil(f.idx.length / tam));
  const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
  const claves = ['_UID', 'ID', 'APELLIDOS', 'NOMBRE'].concat(f.listado);
  const filas = f.idx.slice((pagina - 1) * tam, pagina * tam).map(function (i) {
    const o = {};
    claves.forEach(function (k) { o[k] = f.c[k] ? f.c[k][i] : ''; });
    return o;
  });
  return { total: f.idx.length, pagina: pagina, paginas: paginas, tam: tam, filas: filas, columnas: f.listado, letras: f.letras };
}

/** Búsqueda en todas las épocas a la vez (orden alfabético común). */
function consultarTodas_(d, u) {
  const tam = Math.min(Math.max(parseInt(d.tam, 10) || 50, 10), 500);
  const filtros = Object.assign({}, d.filtros || {});
  delete filtros.CARPETA; // las cajas son de cada época
  const todas = [];
  const letras = {};
  let listado = [];
  enCadaEpoca_(function (e) {
    const f = filtrar_(Object.assign({}, d, { filtros: filtros, orden: 'apellidos' }), u, []);
    listado = f.listado;
    Object.keys(f.letras).forEach(function (l) { letras[l] = (letras[l] || 0) + f.letras[l]; });
    const claves = ['_UID', 'ID', 'APELLIDOS', 'NOMBRE'].concat(f.listado);
    f.idx.forEach(function (i) {
      const o = { EPOCA: e.NOMBRE, _k: f.c._ORDEN[i] };
      claves.forEach(function (k) { o[k] = f.c[k] ? f.c[k][i] : ''; });
      todas.push(o);
    });
  });
  todas.sort(function (a, b) { return a._k < b._k ? -1 : a._k > b._k ? 1 : 0; });
  const paginas = Math.max(1, Math.ceil(todas.length / tam));
  const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
  const filas = todas.slice((pagina - 1) * tam, pagina * tam);
  filas.forEach(function (o) { delete o._k; });
  return { total: todas.length, pagina: pagina, paginas: paginas, tam: tam, filas: filas, columnas: listado, letras: letras, todas: true };
}

/** Exporta a CSV (separador «;», para Excel en español) los expedientes que cumplen los filtros. */
function exportar_(d, u) {
  const campos = camposActivos_();
  const h = hojaAlumnos_();
  const f = filtrar_(d, u, campos.map(function (c) { return c.clave; }).concat(['_CREADO_EN', '_CREADO_POR', '_MODIFICADO_EN', '_MODIFICADO_POR']));
  const claves = ['ID'].concat(campos.map(function (c) { return c.clave; }), ['_CREADO_EN', '_CREADO_POR', '_MODIFICADO_EN', '_MODIFICADO_POR']);
  const titulos = ['ID'].concat(campos.map(function (c) { return c.etiqueta; }), ['Creado', 'Creado por', 'Modificado', 'Modificado por']);
  const cel = function (v) { v = String(v === undefined ? '' : v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const lineas = [titulos.map(cel).join(';')];
  f.idx.forEach(function (i) { lineas.push(claves.map(function (k) { return cel(f.c[k] ? f.c[k][i] : ''); }).join(';')); });
  registrar_(u, 'EXPORTAR', '', f.idx.length + ' expedientes');
  return { csv: '\ufeff' + lineas.join('\r\n'), total: f.idx.length };
}

function obtener_(d, u) {
  const h = hojaAlumnos_();
  const mapa = mapaColumnas_(h);
  const c = leerColumnas_(h, mapa, COLS_NUMERACION);
  const i = c._UID.indexOf(String(d.id));
  if (i < 0) throw new Error('No se encuentra el expediente. Puede que se haya borrado.');
  numerar_(c);
  const reg = leerFila_(h, i + 2);
  delete reg._fila;
  reg.ID = c.ID[i];
  if (u.rol === 'PUBLICO') {
    if (si_(reg._BORRADO)) throw new Error('No se encuentra el expediente.');
    ['_CREADO_POR', '_MODIFICADO_POR', '_CREADO_EN', '_MODIFICADO_EN', '_CLAVE', '_FONETICA', '_ORDEN', '_VERSION'].forEach(function (k) { delete reg[k]; });
    return { registro: reg, puedeEditar: false, bloqueo: null, publico: true };
  }
  let bloqueo = null;
  try {
    const b = CacheService.getScriptCache().get('edit_' + reg._UID);
    if (b) { bloqueo = JSON.parse(b); if (bloqueo.email === u.email) bloqueo = null; }
  } catch (e) { bloqueo = null; }
  return { registro: reg, puedeEditar: puedeEditar_(u, reg), bloqueo: bloqueo };
}

function puedeEditar_(u, reg) {
  if (si_(reg._BORRADO)) return false;
  if (u.rol === 'ADMIN') return true;
  if (u.rol !== 'EDITOR') return false;
  return !si_(ajustes_().EDITORES_SOLO_PROPIOS) || reg._CREADO_POR === u.email;
}

function resumen_(c, i) {
  const o = {};
  ['_UID', 'ID', 'APELLIDOS', 'NOMBRE', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PAIS', 'PROFESOR', 'ESTADO'].forEach(function (k) {
    o[k] = c[k] ? c[k][i] : '';
  });
  return o;
}

/**
 * Busca expedientes que podrían ser el mismo alumno:
 *  exactos         → mismos apellidos y nombre (sin tildes, sin «y», «de»…)
 *  parecidos       → iguales «de oído» (grafías antiguas: X/J, V/B, Y/I, H muda…)
 *  mismosApellidos → mismos apellidos con otro nombre (posibles hermanos)
 */
function comprobarDuplicados_(d, u) {
  const vacio = { exactos: [], parecidos: [], mismosApellidos: [], totalMismos: 0 };
  const ap = String(d.apellidos || ''), no = String(d.nombre || '');
  if (normNombre_(ap).length < 2) return vacio;
  const h = hojaAlumnos_();
  const mapa = mapaColumnas_(h);
  const c = leerColumnas_(h, mapa, COLS_NUMERACION.concat(['_CLAVE', '_FONETICA', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PAIS', 'PROFESOR', 'ESTADO']));
  const clave = claveDuplicado_(ap, no), fonAp = fonetica_(ap), fon = fonAp + '|' + fonetica_(no);
  const conNombre = normNombre_(no).length > 0;
  const ex = [], pa = [], mi = [];
  for (let i = 0; i < c._n; i++) {
    if (!c._UID[i] || c._UID[i] === d.id || si_(c._BORRADO[i])) continue;
    // Si la fila se escribió a mano en la hoja, calculamos las claves al vuelo.
    const k = c._CLAVE[i] || claveDuplicado_(c.APELLIDOS[i], c.NOMBRE[i]);
    const f = c._FONETICA[i] || claveFonetica_(c.APELLIDOS[i], c.NOMBRE[i]);
    if (conNombre && k === clave) ex.push(i);
    else if (conNombre && f === fon) pa.push(i);
    else if (f.split('|')[0] === fonAp) mi.push(i);
  }
  if (ex.length || pa.length || mi.length) numerar_(c); // sólo se numera si hay algo que enseñar
  const r = function (i) { return resumen_(c, i); };
  vacio.exactos = ex.map(r);
  vacio.parecidos = pa.map(r);
  vacio.totalMismos = mi.length;
  vacio.mismosApellidos = mi.sort(function (a, b) { return c._ORDEN[a] < c._ORDEN[b] ? -1 : 1; }).slice(0, 25).map(r);
  // Mismo alumno en otras épocas (p. ej., empezó en 1898 y siguió en 1903): sólo aviso.
  vacio.otrasEpocas = [];
  if (conNombre && epocas_().length > 1) {
    const actual = epocaActual_();
    enCadaEpoca_(function (e) {
      if (e.CODIGO === actual.CODIGO) return;
      const h2 = hojaAlumnos_();
      const c2 = leerColumnas_(h2, mapaColumnas_(h2), COLS_NUMERACION.concat(['_CLAVE', '_FONETICA', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PAIS', 'PROFESOR', 'ESTADO']));
      const hits = [];
      for (let i = 0; i < c2._n; i++) {
        if (!c2._UID[i] || si_(c2._BORRADO[i])) continue;
        const k = c2._CLAVE[i] || claveDuplicado_(c2.APELLIDOS[i], c2.NOMBRE[i]);
        const f = c2._FONETICA[i] || claveFonetica_(c2.APELLIDOS[i], c2.NOMBRE[i]);
        if (k === clave || f === fon) hits.push(i);
      }
      if (hits.length) numerar_(c2);
      hits.slice(0, 10).forEach(function (i) { const x = resumen_(c2, i); x.EPOCA = e.NOMBRE; vacio.otrasEpocas.push(x); });
    });
  }
  return vacio;
}

function localidadesUsadas_(d) {
  const h = hojaAlumnos_();
  const c = leerColumnas_(h, mapaColumnas_(h), ['PAIS', 'PROVINCIA', 'LOCALIDAD']);
  const vistos = {};
  for (let i = 0; i < c._n; i++) {
    const l = String(c.LOCALIDAD[i]).trim();
    if (!l) continue;
    if (d.provincia && c.PROVINCIA[i] !== d.provincia) continue;
    if (d.pais && c.PAIS[i] && c.PAIS[i] !== d.pais) continue;
    vistos[l] = true;
  }
  return Object.keys(vistos).sort(function (a, b) { return a.localeCompare(b, 'es'); }).slice(0, 3000);
}

// ---------------------------------------------------------------------
//  Guardar, bloquear, borrar
// ---------------------------------------------------------------------

function fechaValida_(v) {
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12;
  m = /^(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return +m[1] >= 1 && +m[1] <= 12;
  return /^\d{4}$/.test(v);
}

function guardar_(d, u) {
  epocaEditable_(u);
  const campos = camposActivos_();
  const entrada = d.registro || {};
  const reg = {};
  const errores = [];
  campos.forEach(function (c) {
    let v = entrada[c.clave];
    v = v === undefined || v === null ? '' : String(v);
    v = c.tipo === 'texto_largo' ? v.trim() : v.replace(/\s+/g, ' ').trim();
    if (c.clave === 'APELLIDOS') v = v.toUpperCase();
    if (v.length > 5000) v = v.slice(0, 5000);
    if (c.obligatorio && !v) errores.push('«' + c.etiqueta + '» es obligatorio.');
    if (v && c.tipo === 'numero' && !/^-?\d+([.,]\d+)?$/.test(v)) errores.push('«' + c.etiqueta + '» debe ser un número.');
    if (v && c.tipo === 'fecha' && !fechaValida_(v)) errores.push('«' + c.etiqueta + '»: usa dd/mm/aaaa, mm/aaaa o sólo el año.');
    reg[c.clave] = v;
  });
  if (!reg.APELLIDOS || !reg.NOMBRE) errores.push('Los apellidos y el nombre son obligatorios.');
  if (errores.length) throw new Error(errores.filter(function (e, i) { return errores.indexOf(e) === i; }).join(' '));

  const clave = claveDuplicado_(reg.APELLIDOS, reg.NOMBRE);
  const fon = claveFonetica_(reg.APELLIDOS, reg.NOMBRE);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const h = hojaAlumnos_();
    const mapa = asegurarColumnas_(h);
    const idx = leerColumnas_(h, mapa, COLS_NUMERACION.concat(['_CLAVE', '_FONETICA', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PAIS', 'PROFESOR', 'ESTADO']));
    let fila = 0, anterior = null;
    if (d.id) {
      const i = idx._UID.indexOf(String(d.id));
      if (i < 0) throw new Error('No se encuentra el expediente ' + d.id + '.');
      fila = i + 2;
      anterior = leerFila_(h, fila);
      if (si_(anterior._BORRADO)) throw new Error('Este expediente está en la papelera.');
      if (!puedeEditar_(u, anterior)) throw new Error('No tienes permiso para modificar este expediente.');
      if (String(d.version || '') !== String(anterior._VERSION || '')) {
        throw new Error('CONFLICTO: ' + (anterior._MODIFICADO_POR || 'otra persona') + ' ha modificado este expediente (' +
          anterior._MODIFICADO_EN + ') mientras lo tenías abierto. Vuelve a abrirlo para ver la versión actual.');
      }
    }
    // Control de duplicados (dentro del bloqueo: dos personas no pueden crear el mismo a la vez)
    const coincidencias = [];
    for (let i = 0; i < idx._n; i++) {
      if (!idx._UID[i] || idx._UID[i] === d.id || si_(idx._BORRADO[i])) continue;
      const k = idx._CLAVE[i] || claveDuplicado_(idx.APELLIDOS[i], idx.NOMBRE[i]);
      const f = idx._FONETICA[i] || claveFonetica_(idx.APELLIDOS[i], idx.NOMBRE[i]);
      if (k === clave || f === fon) { const x = resumen_(idx, i); x._i = i; coincidencias.push(x); }
    }
    const cambiaNombre = !anterior || claveDuplicado_(anterior.APELLIDOS, anterior.NOMBRE) !== clave;
    if (coincidencias.length && cambiaNombre && !d.confirmarHomonimo) {
      numerar_(idx);
      return { duplicado: true, coincidencias: coincidencias.slice(0, 10).map(function (x) { x.ID = idx.ID[x._i]; return x; }) };
    }

    const t = ahora_();
    const nuevo = Object.assign({}, anterior || {}, reg, { _CLAVE: clave, _FONETICA: fon, _MODIFICADO_EN: t, _MODIFICADO_POR: u.email });
    let detalle;
    if (anterior) {
      nuevo._VERSION = (parseInt(anterior._VERSION, 10) || 0) + 1;
      detalle = campos.filter(function (c) { return String(anterior[c.clave] || '') !== reg[c.clave]; })
        .map(function (c) { return c.clave + ': «' + (anterior[c.clave] || '') + '» → «' + reg[c.clave] + '»'; }).join(' | ') || 'Sin cambios';
      detalle = reg.APELLIDOS + ', ' + reg.NOMBRE + ' | ' + detalle;
    } else {
      nuevo._UID = nuevoUid_(idx._UID);
      nuevo.ID = '';
      nuevo._CREADO_EN = t;
      nuevo._CREADO_POR = u.email;
      nuevo._VERSION = 1;
      nuevo._BORRADO = '';
      fila = h.getLastRow() + 1;
      detalle = reg.APELLIDOS + ', ' + reg.NOMBRE + (reg.CARPETA ? ' · caja ' + reg.CARPETA : '');
    }
    if (coincidencias.length && cambiaNombre) {
      detalle += ' | HOMÓNIMO CONFIRMADO frente a ' + coincidencias.map(function (x) { return x.APELLIDOS + ', ' + x.NOMBRE + ' (' + x._UID + ')'; }).join('; ');
    }
    nuevo._ORDEN = claveOrdenFila_(reg.APELLIDOS, reg.NOMBRE, nuevo._UID);
    escribirFila_(h, fila, nuevo);
    // Número de orden alfabético actual: cuántos alumnos vivos van delante + 1.
    let delante = 0;
    for (let i = 0; i < idx._n; i++) {
      if (!idx._UID[i] || idx._UID[i] === nuevo._UID || si_(idx._BORRADO[i])) continue;
      const k = idx._ORDEN[i] || claveOrdenFila_(idx.APELLIDOS[i], idx.NOMBRE[i], idx._UID[i]);
      if (k < nuevo._ORDEN) delante++;
    }
    const numero = prefijo_() + cero_(delante + 1, 6);
    // Con pocos datos la hoja se reordena al momento; con muchos, cada noche (o con el botón de Ajustes).
    registrar_(u, anterior ? 'MODIFICAR' : 'CREAR', nuevo._UID, detalle + ' · Nº ' + numero);
    CacheService.getScriptCache().remove('edit_' + nuevo._UID);
    formatoSiHaceFalta_();
    return { id: nuevo._UID, numero: numero, version: String(nuevo._VERSION), creado: !anterior };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Importación en bloque (p. ej. expedientes transcritos de PDFs): cada fila pasa por el mismo control
 * de duplicados que el formulario (también contra las demás filas del lote). Los posibles duplicados
 * no se importan salvo que se pida expresamente; se devuelven para revisarlos a mano.
 * Con «actualizar», un alumno que ya existe con el mismo nombre (sin contar tildes, «Y», «DE»…) no se
 * salta: se le ponen los datos de las columnas pegadas (caja, observaciones…) y queda en el historial.
 */
function importar_(d, u) {
  epocaEditable_(u);
  const filas = Array.isArray(d.filas) ? d.filas.slice(0, 500) : [];
  if (!filas.length) throw new Error('No hay filas para importar.');
  const campos = camposActivos_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const h = hojaAlumnos_();
    const mapa = asegurarColumnas_(h);
    const idx = leerColumnas_(h, mapa, COLS_NUMERACION.concat(['_CLAVE', '_FONETICA']));
    const existentes = {}, filaDe = {};
    for (let i = 0; i < idx._n; i++) {
      if (!idx._UID[i] || si_(idx._BORRADO[i])) continue;
      const nombre = idx.APELLIDOS[i] + ', ' + idx.NOMBRE[i];
      const k = 'c' + (idx._CLAVE[i] || claveDuplicado_(idx.APELLIDOS[i], idx.NOMBRE[i]));
      existentes[k] = nombre;
      existentes['f' + (idx._FONETICA[i] || claveFonetica_(idx.APELLIDOS[i], idx.NOMBRE[i]))] = nombre;
      filaDe[k] = filaDe[k] === undefined ? i + 2 : -1; // -1: hay más de uno con ese nombre
    }
    const t = ahora_();
    const uids = idx._UID.slice();
    const nuevos = [], saltados = [], actualizados = [];
    filas.forEach(function (x, n) {
      const reg = {};
      campos.forEach(function (c) {
        let v = x[c.clave] === undefined || x[c.clave] === null ? '' : String(x[c.clave]);
        v = c.tipo === 'texto_largo' ? v.trim() : v.replace(/\s+/g, ' ').trim();
        if (v && c.tipo === 'seleccion') {
          const op = c.opciones.find(function (o) { return sinAcentos_(o) === sinAcentos_(v); });
          if (op) v = op;
        }
        if (!v && c.clave === 'ESTADO') v = d.estado || 'PENDIENTE DE REVISIÓN';
        if (!v && c.tipo === 'profesor') v = d.profesor || u.nombre;
        if (!v && c.obligatorio && (c.tipo === 'seleccion' || c.tipo === 'si_no')) v = (c.opciones || [])[0] || 'NO';
        reg[c.clave] = v.slice(0, 5000);
      });
      reg.APELLIDOS = String(reg.APELLIDOS || '').toUpperCase();
      const quien = (reg.APELLIDOS || '¿?') + ', ' + (reg.NOMBRE || '¿?');
      if (!reg.APELLIDOS || !reg.NOMBRE) { saltados.push({ fila: n + 1, alumno: quien, motivo: 'Faltan los apellidos o el nombre.' }); return; }
      const clave = claveDuplicado_(reg.APELLIDOS, reg.NOMBRE), fon = claveFonetica_(reg.APELLIDOS, reg.NOMBRE);
      const ya = existentes['c' + clave] || existentes['f' + fon];
      if (ya && d.actualizar && filaDe['c' + clave] > 0) {
        // Ya existe con el mismo nombre: se actualizan sólo las columnas que traía la tabla.
        const fila = filaDe['c' + clave];
        const anterior = leerFila_(h, fila);
        const cambios = campos.filter(function (c) {
          return c.clave !== 'APELLIDOS' && c.clave !== 'NOMBRE' && x[c.clave] !== undefined && x[c.clave] !== null &&
            String(x[c.clave]).trim() !== '' && String(anterior[c.clave] || '') !== reg[c.clave];
        });
        filaDe['c' + clave] = -2; // una segunda fila igual en la misma tabla ya no lo vuelve a tocar
        existentes['c' + clave] = existentes['f' + fon] = quien + ' (de esta importación)';
        if (!cambios.length) { saltados.push({ fila: n + 1, alumno: quien, motivo: 'Ya existía y no había nada que cambiar.' }); return; }
        const nuevo = Object.assign({}, anterior, { _MODIFICADO_EN: t, _MODIFICADO_POR: u.email, _VERSION: (parseInt(anterior._VERSION, 10) || 0) + 1 });
        cambios.forEach(function (c) { nuevo[c.clave] = reg[c.clave]; });
        escribirFila_(h, fila, nuevo);
        CacheService.getScriptCache().remove('edit_' + anterior._UID);
        actualizados.push([t, u.email, u.nombre, 'MODIFICAR', anterior._UID, (anterior.APELLIDOS + ', ' + anterior.NOMBRE + ' (importación) | ' +
          cambios.map(function (c) { return c.clave + ': «' + (anterior[c.clave] || '') + '» → «' + reg[c.clave] + '»'; }).join(' | ')).slice(0, 45000)]);
        return;
      }
      if (ya && !d.duplicados) { saltados.push({ fila: n + 1, alumno: quien, motivo: 'Posible duplicado de «' + ya + '».' }); return; }
      existentes['c' + clave] = existentes['f' + fon] = quien + ' (de esta importación)';
      const uid = nuevoUid_(uids);
      uids.push(uid);
      nuevos.push(Object.assign(reg, {
        ID: '', _BORRADO: '', _UID: uid, _CLAVE: clave, _FONETICA: fon, _ORDEN: claveOrdenFila_(reg.APELLIDOS, reg.NOMBRE, uid),
        _CREADO_EN: t, _CREADO_POR: u.email, _MODIFICADO_EN: t, _MODIFICADO_POR: u.email, _VERSION: 1
      }));
    });
    if (nuevos.length) {
      mapaColumnas_(h);
      const cab = MEMO.cabecera;
      const fila0 = h.getLastRow() + 1;
      const faltan = fila0 + nuevos.length - 1 - h.getMaxRows();
      if (faltan > 0) {
        const n = faltan + 500;
        h.insertRowsAfter(h.getMaxRows(), n);
        h.getRange(h.getMaxRows() - n + 1, 1, n, h.getMaxColumns()).setNumberFormat('@');
        MEMO.formatoPendiente = true;
      }
      h.getRange(fila0, 1, nuevos.length, cab.length).setValues(nuevos.map(function (o) {
        return cab.map(function (c) {
          let v = o[c] === undefined || o[c] === null ? '' : String(o[c]);
          if (/^[=+@]/.test(v)) v = "'" + v;
          return v;
        });
      }));
      tocarDatos_(h);
      // Historial: una línea por expediente, escritas de una vez.
      try {
        const hh = hojaHistorial_();
        const f = hh.getLastRow() + 1;
        if (f + nuevos.length - 1 > hh.getMaxRows()) hh.insertRowsAfter(hh.getMaxRows(), nuevos.length + 100);
        hh.getRange(f, 1, nuevos.length, 6).setValues(nuevos.map(function (o) {
          return [t, u.email, u.nombre, 'IMPORTAR', o._UID, o.APELLIDOS + ', ' + o.NOMBRE + (o.CARPETA ? ' · caja ' + o.CARPETA : '')];
        }));
      } catch (e) { console.error('Historial', e); }
      formatoSiHaceFalta_();
    }
    if (actualizados.length) {
      try {
        const hh = hojaHistorial_();
        const f = hh.getLastRow() + 1;
        if (f + actualizados.length - 1 > hh.getMaxRows()) hh.insertRowsAfter(hh.getMaxRows(), actualizados.length + 100);
        hh.getRange(f, 1, actualizados.length, 6).setValues(actualizados);
      } catch (e) { console.error('Historial', e); }
    }
    return { importados: nuevos.length, actualizados: actualizados.length, saltados: saltados };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Identificador interno permanente: código de época + R + número de entrada (XIX-R000001…).
 * Nunca se repite entre épocas, así que se pueden unir todas sin conflictos.
 */
function nuevoUid_(uids) {
  const props = PropertiesService.getScriptProperties();
  const cod = epocaActual_().CODIGO;
  const clave = 'ULTIMO_NUM_' + cod;
  let n = parseInt(props.getProperty(clave) || (cod === 'XIX' ? props.getProperty('ULTIMO_NUM') : '') || '0', 10);
  uids.forEach(function (id) { const m = /R(\d+)$/.exec(id); if (m) n = Math.max(n, parseInt(m[1], 10)); });
  n++;
  props.setProperty(clave, String(n));
  return cod + '-R' + ('000000' + n).slice(-6);
}

/**
 * Numera y ordena físicamente la hoja Alumnos por apellidos y nombre (lo hace cada noche un
 * activador, el botón de Ajustes y el menú de la hoja):
 *  - ID = PREFIJO + posición alfabética (GOYA000001…); los de la papelera se quedan sin número y al final.
 *  - Recalcula las claves internas (también de filas pegadas o corregidas a mano en la hoja).
 * Devuelve el nº de expedientes numerados.
 */
function ordenar_(h) {
  const conCache = MEMO.usarCache;
  MEMO.usarCache = false;
  try { return ordenarSinCache_(h); } finally { MEMO.usarCache = conCache; }
}

function ordenarSinCache_(h) {
  const mapa = asegurarColumnas_(h);
  const c = leerColumnas_(h, mapa, ['ID', '_UID', 'APELLIDOS', 'NOMBRE', '_BORRADO', '_ORDEN', '_CLAVE', '_FONETICA']);
  const n = c._n;
  if (!n) return 0;
  const pref = prefijo_();
  const filas = [];
  const tocadas = {};
  let sinUid = 0;
  for (let i = 0; i < n; i++) {
    if (!c._UID[i] && !String(c.APELLIDOS[i]).trim() && !String(c.NOMBRE[i]).trim()) continue; // fila vacía
    if (!c._UID[i]) {
      // Filas pegadas a mano: se les da identificador interno de una vez (sin recorrer la hoja por cada una).
      if (!sinUid) sinUid = parseInt(nuevoUid_(c._UID).slice(1), 10); else sinUid++;
      c._UID[i] = epocaActual_().CODIGO + '-R' + cero_(sinUid, 6);
      tocadas._UID = true;
    } else if (!epocaDeUid_(c._UID[i])) {
      // Registros anteriores a las épocas (R000001) → XIX-R000001
      c._UID[i] = epocaActual_().CODIGO + '-' + c._UID[i];
      tocadas._UID = true;
    }
    const valores = {
      _CLAVE: claveDuplicado_(c.APELLIDOS[i], c.NOMBRE[i]),
      _FONETICA: claveFonetica_(c.APELLIDOS[i], c.NOMBRE[i]),
      _ORDEN: claveOrdenFila_(c.APELLIDOS[i], c.NOMBRE[i], c._UID[i])
    };
    Object.keys(valores).forEach(function (k) { if (c[k][i] !== valores[k]) { c[k][i] = valores[k]; tocadas[k] = true; } });
    filas.push({ i: i, b: si_(c._BORRADO[i]) ? 1 : 0, k: valores._ORDEN });
  }
  if (sinUid) PropertiesService.getScriptProperties().setProperty('ULTIMO_NUM_' + epocaActual_().CODIGO, String(sinUid));
  filas.sort(function (a, b) { return a.b - b.b || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0); });
  let num = 0;
  filas.forEach(function (x) {
    const id = x.b ? '' : pref + cero_(++num, 6);
    if (c.ID[x.i] !== id) { c.ID[x.i] = id; tocadas.ID = true; }
  });
  Object.keys(tocadas).forEach(function (k) {
    h.getRange(2, mapa[k], n, 1).setValues(c[k].map(function (v) { return [v]; }));
  });
  if (Object.keys(tocadas).length) tocarDatos_(h);
  // ¿Están ya las filas en su sitio? Si no, se ordena la hoja por el ID (los de la papelera, sin ID, al final).
  let enOrden = true;
  for (let j = 0; j < filas.length; j++) { if (filas[j].i !== j) { enOrden = false; break; } }
  if (!enOrden) {
    const rango = h.getRange(2, 1, n, h.getLastColumn());
    try {
      rango.sort({ column: mapa.ID, ascending: true });
    } catch (e) {
      // Si Sheets no deja ordenar (p. ej. por un filtro activo), se reescriben las filas ya ordenadas.
      const pos = {};
      filas.forEach(function (x, p) { pos[x.i] = p; });
      const v = rango.getValues().map(function (r, i) { return { r: r, p: pos[i] === undefined ? 1e9 + i : pos[i] }; });
      v.sort(function (a, b) { return a.p - b.p; });
      rango.setValues(v.map(function (x) { return x.r; }));
    }
    tocarDatos_(h);
  }
  return num;
}

/** Activador nocturno: ordena la hoja y renumera. */
function ordenarNocturno() {
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try { enCadaEpoca_(function () { ordenar_(hojaAlumnos_()); }); } finally { lock.releaseLock(); }
}

function ordenarAhora_(d, u) {
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  let n;
  try {
    n = enCadaEpoca_(function () { const h = hojaAlumnos_(); const k = ordenar_(h); tocarDatos_(h); return k; }).reduce(function (a, b) { return a + b; }, 0);
  } finally { lock.releaseLock(); }
  invalidarConfig_();
  registrar_(u, 'ORDENAR', '', 'Hojas ordenadas y numeradas: ' + n + ' expedientes');
  return { total: n };
}

function configurarOrdenNocturno_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'ordenarNocturno') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ordenarNocturno').timeBased().everyDays(1).atHour(2).create();
}

/** Celdas ocupadas en los dos archivos (el límite de Google es de 10 millones por archivo). */
function capacidad_(d, u) {
  const LIMITE = 10000000;
  const celdas = function (libro) {
    return libro.getSheets().reduce(function (t, h) { return t + h.getMaxRows() * h.getMaxColumns(); }, 0);
  };
  const r = { limite: LIMITE };
  r.epocas = enCadaEpoca_(function (e) {
    const h = hojaAlumnos_();
    const n = Math.max(h.getLastRow() - 1, 0);
    const usadas = celdas(libroEpoca_());
    return { codigo: e.CODIGO, nombre: e.NOMBRE, expedientes: n, celdas: usadas, columnas: h.getMaxColumns(),
      caben: Math.floor((LIMITE - usadas) / h.getMaxColumns()) + Math.max(h.getMaxRows() - 1 - n, 0),
      central: libroEpoca_().getId() === ss_().getId() };
  });
  const hh = hojaHistorial_();
  r.historialAparte = hh.getParent().getId() !== ss_().getId();
  r.historialFilas = Math.max(hh.getLastRow() - 1, 0);
  return r;
}

/** Menú de la hoja: ordenar y renumerar (útil tras pegar datos a mano en la hoja Alumnos). */
function ordenarYNumerar() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { enCadaEpoca_(function () { ordenar_(hojaAlumnos_()); }); } finally { lock.releaseLock(); }
  avisar_('Hoja ordenada alfabéticamente y numerada.');
}

/** Marca un expediente como «en edición» durante 10 minutos (se renueva mientras sigue abierto). */
function bloquear_(d, u) {
  const cache = CacheService.getScriptCache();
  const k = 'edit_' + d.id;
  const actual = cache.get(k);
  if (actual) {
    const b = JSON.parse(actual);
    if (b.email !== u.email) return { bloqueo: b };
  }
  cache.put(k, JSON.stringify({ email: u.email, nombre: u.nombre, desde: ahora_() }), 600);
  return { bloqueo: null };
}

function liberar_(d, u) {
  const cache = CacheService.getScriptCache();
  const k = 'edit_' + d.id;
  const actual = cache.get(k);
  if (actual && JSON.parse(actual).email === u.email) cache.remove(k);
  return true;
}

function borrar_(d, u) {
  return marcarBorrado_(d, u, true);
}

function restaurar_(d, u) {
  return marcarBorrado_(d, u, false);
}

function marcarBorrado_(d, u, borrar) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const h = hojaAlumnos_();
    const mapa = asegurarColumnas_(h);
    const fila = filaDeId_(h, mapa, d.id);
    const reg = leerFila_(h, fila);
    reg._BORRADO = borrar ? 'SÍ' : '';
    reg._MODIFICADO_EN = ahora_();
    reg._MODIFICADO_POR = u.email;
    reg._VERSION = (parseInt(reg._VERSION, 10) || 0) + 1;
    escribirFila_(h, fila, reg);
    registrar_(u, borrar ? 'BORRAR' : 'RESTAURAR', d.id, (reg.APELLIDOS + ', ' + reg.NOMBRE) + (reg.ID ? ' · era ' + reg.ID : '') + (d.motivo ? ' · Motivo: ' + d.motivo : ''));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
//  Portada y gestión de épocas
// ---------------------------------------------------------------------

/** Resumen de cada época para la portada del archivo. */
function portada_(d, u) {
  // Se calcula para todas las épocas y se guarda 5 min; al público sólo se le muestran las públicas.
  let todas = null;
  try { const t = cache_().get('portada'); if (t) todas = JSON.parse(t); } catch (e) { todas = null; }
  if (!todas) {
    const soloPub = MEMO.soloPublicas;
    MEMO.soloPublicas = false;
    try { todas = portadaCalcular_(); } finally { MEMO.soloPublicas = soloPub; }
    try { cache_().put('portada', JSON.stringify(todas), 300); } catch (e) { /* nada */ }
  }
  const visibles = epocas_().map(function (e) { return e.CODIGO; });
  return todas.filter(function (e) { return visibles.indexOf(e.CODIGO) >= 0; });
}

function portadaCalcular_() {
  return enCadaEpoca_(function (e) {
    const h = hojaAlumnos_();
    const c = leerColumnas_(h, mapaColumnas_(h), ['_UID', '_BORRADO', 'ESTADO', 'DIGITALIZADO', 'ILUSTRE']);
    const r = { CODIGO: e.CODIGO, NOMBRE: e.NOMBRE, DESDE: e.DESDE, HASTA: e.HASTA, ESTADO: e.ESTADO, DESCRIPCION: e.DESCRIPCION,
      total: 0, terminados: 0, digitalizados: 0, ilustres: 0, destacados: 0 };
    for (let i = 0; i < c._n; i++) {
      if (!c._UID[i] || si_(c._BORRADO[i])) continue;
      r.total++;
      if (c.ESTADO[i] === 'TERMINADO') r.terminados++;
      if (si_(c.DIGITALIZADO[i])) r.digitalizados++;
      if (nivelIlustre_(c.ILUSTRE[i]) === 'ILUSTRE') r.ilustres++;
      if (nivelIlustre_(c.ILUSTRE[i]) === 'DESTACADO') r.destacados++;
    }
    const cp = carpetasLista_();
    r.carpetas = cp.length;
    r.carpetasTerminadas = cp.filter(function (x) { return x.ESTADO === 'TERMINADA'; }).length;
    return r;
  });
}

/**
 * Crea una época nueva con su propio archivo de Google (Alumnos + Cajas) en la misma caja de
 * Drive que la hoja central. Usa los mismos campos, profesorado y ajustes que el resto del archivo.
 */
function crearEpoca_(d, u) {
  const codigo = String(d.CODIGO || '').trim().toUpperCase().replace(/[\s\-–]+/g, '_');
  const nombre = String(d.NOMBRE || '').trim();
  if (!/^[A-Z0-9_]{2,20}$/.test(codigo)) throw new Error('El código sólo puede tener letras, números y «_» (p. ej. 1900_1930).');
  if (!nombre) throw new Error('Escribe el nombre de la época.');
  if (epocas_().some(function (e) { return e.CODIGO === codigo; })) throw new Error('Ya existe una época con el código ' + codigo + '.');
  const ss = ss_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const libro = SpreadsheetApp.create(ajustes_().NOMBRE_APP + ' · ' + nombre);
    try {
      const destino = DriveApp.getFileById(ss.getId()).getParents();
      if (destino.hasNext()) DriveApp.getFileById(libro.getId()).moveTo(destino.next());
    } catch (e) { /* se queda en «Mi unidad» */ }
    const hAl = libro.getSheets()[0].setName(HOJA.ALUMNOS);
    hAl.getRange(1, 1, hAl.getMaxRows(), hAl.getMaxColumns()).setNumberFormat('@');
    const hCp = crearHoja_(libro, HOJA.CARPETAS, CABECERAS.Carpetas);
    hCp.getRange(1, 1, hCp.getMaxRows(), 6).setNumberFormat('@');
    const n = Math.min(Math.max(parseInt(d.carpetas, 10) || 0, 0), 2000);
    if (n) {
      if (n + 1 > hCp.getMaxRows()) hCp.insertRowsAfter(hCp.getMaxRows(), n + 1 - hCp.getMaxRows());
      const filas = [];
      for (let k = 1; k <= n; k++) filas.push([String(k), '', '', 'PENDIENTE', '', '']);
      hCp.getRange(2, 1, n, 6).setValues(filas);
    }
    validarLista_(hCp, 4, ESTADOS_CARPETA);
    if (hCp.getMaxColumns() > 6) hCp.deleteColumns(7, hCp.getMaxColumns() - 6);
    const prefijo = String(d.PREFIJO || ('GOYA' + (String(d.DESDE || '').trim() || codigo) + '-')).trim().toUpperCase();
    hoja_(HOJA.EPOCAS).appendRow([codigo, nombre, String(d.DESDE || ''), String(d.HASTA || ''), prefijo, 'ABIERTA', libro.getId(), String(d.DESCRIPCION || ''), 'NO']);
    invalidarConfig_();
    usarEpoca_(codigo);
    const h = hojaAlumnos_();
    asegurarColumnas_(h);
    if (h.getMaxColumns() > h.getLastColumn()) h.deleteColumns(h.getLastColumn() + 1, h.getMaxColumns() - h.getLastColumn());
    delete MEMO.mapa;
    formatoAlumnos_(h);
    formatoCarpetas_();
    registrar_(u, 'ÉPOCA', '', 'Nueva época ' + codigo + ' «' + nombre + '» (' + (d.DESDE || '?') + '–' + (d.HASTA || '?') + ') · archivo ' + libro.getUrl());
    return { epocas: epocas_().map(function (e) { const x = Object.assign({}, e); delete x.ID_HOJA; delete x._fila; return x; }), codigo: codigo };
  } finally {
    lock.releaseLock();
  }
}

function guardarEpoca_(d, u) {
  const e = epocas_().find(function (x) { return x.CODIGO === String(d.CODIGO || '').toUpperCase(); });
  if (!e || !e._fila) throw new Error('No se encuentra la época.');
  const h = hoja_(HOJA.EPOCAS);
  const nombre = String(d.NOMBRE || e.NOMBRE).trim();
  const estado = d.ESTADO === 'CERRADA' ? 'CERRADA' : 'ABIERTA';
  h.getRange(e._fila, 2, 1, 5).setValues([[nombre, String(d.DESDE || ''), String(d.HASTA || ''),
    String(d.PREFIJO || e.PREFIJO || 'GOYA').trim().toUpperCase(), estado]]);
  h.getRange(e._fila, 8, 1, 2).setValues([[String(d.DESCRIPCION || ''), si_(d.PUBLICA) ? 'SÍ' : 'NO']]);
  registrar_(u, 'ÉPOCA', '', 'Modificada ' + e.CODIGO + ': «' + nombre + '» ' + d.DESDE + '–' + d.HASTA + ' · ' + estado +
    ' · consulta pública: ' + (si_(d.PUBLICA) ? 'SÍ' : 'NO'));
  invalidarConfig_();
  return epocas_().map(function (x) { const y = Object.assign({}, x); delete y.ID_HOJA; delete y._fila; return y; });
}

// ---------------------------------------------------------------------
//  Cajas
// ---------------------------------------------------------------------

function carpetasLista_() {
  return tablaDe_(hojaCarpetas_()).filter(function (c) { return String(c.NUMERO).trim(); }).map(function (c) {
    return {
      NUMERO: String(c.NUMERO).trim(), DESDE: c.DESDE || '', HASTA: c.HASTA || '',
      ESTADO: c.ESTADO || 'PENDIENTE', ASIGNADA_A: c.ASIGNADA_A || '', NOTAS: c.NOTAS || '', _fila: c._fila
    };
  }).sort(function (a, b) { return ordenNatural_(a.NUMERO, b.NUMERO); });
}

function carpetasConRecuento_(d, u) {
  const h = hojaAlumnos_();
  const c = leerColumnas_(h, mapaColumnas_(h), ['_UID', 'CARPETA', 'ESTADO', '_BORRADO']);
  const n = {}, t = {};
  for (let i = 0; i < c._n; i++) {
    if (!c._UID[i] || si_(c._BORRADO[i])) continue;
    const k = String(c.CARPETA[i]).trim();
    n[k] = (n[k] || 0) + 1;
    if (c.ESTADO[i] === 'TERMINADO') t[k] = (t[k] || 0) + 1;
  }
  return carpetasLista_().map(function (x) { x.EXPEDIENTES = n[x.NUMERO] || 0; x.TERMINADOS = t[x.NUMERO] || 0; return x; });
}

function buscarCarpeta_(numero) {
  const c = carpetasLista_().find(function (x) { return x.NUMERO === String(numero).trim(); });
  if (!c) throw new Error('No existe la caja ' + numero + '.');
  return c;
}

function escribirCarpeta_(c) {
  hojaCarpetas_().getRange(c._fila, 1, 1, 6)
    .setValues([[c.NUMERO, c.DESDE, c.HASTA, c.ESTADO, c.ASIGNADA_A, c.NOTAS]]);
}

/** Un editor se asigna una caja, la libera o la da por terminada (para no trabajar dos en la misma). */
function tomarCarpeta_(d, u) {
  epocaEditable_(u);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const c = buscarCarpeta_(d.numero);
    const esMia = c.ASIGNADA_A === u.nombre;
    const admin = u.rol === 'ADMIN';
    if (d.accion === 'asignar') {
      if (c.ASIGNADA_A && !esMia && c.ESTADO !== 'TERMINADA' && !admin) throw new Error('La caja ' + c.NUMERO + ' ya la está trabajando ' + c.ASIGNADA_A + '.');
      // Se asigna a quien se elija en el desplegable (sólo profesorado activo con permiso de edición).
      const nombre = String(d.profesor || u.nombre).trim();
      const p = profesores_().find(function (x) { return x.NOMBRE === nombre && si_(x.ACTIVO) && (x.ROL === 'EDITOR' || x.ROL === 'ADMIN'); });
      if (!p && nombre !== u.nombre) throw new Error(nombre + ' no está activo/a como editor/a.');
      c.ASIGNADA_A = nombre; c.ESTADO = 'EN CURSO';
    } else if (d.accion === 'liberar') {
      if (!esMia && !admin) throw new Error('Sólo quien tiene asignada la caja (o la coordinación) puede liberarla.');
      c.ASIGNADA_A = ''; c.ESTADO = 'PENDIENTE';
    } else if (d.accion === 'terminar') {
      if (!esMia && !admin) throw new Error('Sólo quien tiene asignada la caja (o la coordinación) puede darla por terminada.');
      c.ESTADO = 'TERMINADA';
    } else if (d.accion === 'reabrir') {
      if (!esMia && !admin) throw new Error('Sólo quien la terminó (o la coordinación) puede reabrirla.');
      c.ESTADO = c.ASIGNADA_A ? 'EN CURSO' : 'PENDIENTE';
    } else {
      throw new Error('Acción no válida.');
    }
    escribirCarpeta_(c);
    registrar_(u, 'CAJA', '', 'Caja ' + c.NUMERO + ': ' + d.accion + ' → ' + c.ESTADO + (c.ASIGNADA_A ? ' (' + c.ASIGNADA_A + ')' : ''));
    return carpetasLista_();
  } finally {
    lock.releaseLock();
  }
}

function guardarCarpeta_(d, u) {
  const numero = String(d.NUMERO || '').trim();
  if (!numero) throw new Error('Indica el número de caja.');
  const lista = carpetasLista_();
  const existente = lista.find(function (x) { return x.NUMERO === numero; });
  const original = d.original ? lista.find(function (x) { return x.NUMERO === String(d.original); }) : null;
  if (existente && (!original || existente._fila !== original._fila)) throw new Error('Ya existe la caja ' + numero + '.');
  const c = {
    NUMERO: numero,
    DESDE: String(d.DESDE || '').trim().toUpperCase(),
    HASTA: String(d.HASTA || '').trim().toUpperCase(),
    ESTADO: ESTADOS_CARPETA.indexOf(d.ESTADO) >= 0 ? d.ESTADO : 'PENDIENTE',
    ASIGNADA_A: String(d.ASIGNADA_A || '').trim(),
    NOTAS: String(d.NOTAS || '').trim()
  };
  if (c.DESDE && c.HASTA && claveOrden_(c.DESDE) > claveOrden_(c.HASTA)) {
    throw new Error('El primer apellido (' + c.DESDE + ') va alfabéticamente después del último (' + c.HASTA + ').');
  }
  const h = hojaCarpetas_();
  if (original) {
    c._fila = original._fila;
    escribirCarpeta_(c);
  } else {
    h.appendRow([c.NUMERO, c.DESDE, c.HASTA, c.ESTADO, c.ASIGNADA_A, c.NOTAS]);
  }
  registrar_(u, 'CAJA', '', 'Caja ' + numero + ': ' + (c.DESDE || '…') + ' – ' + (c.HASTA || '…') + ' · ' + c.ESTADO);
  return carpetasLista_();
}

function crearCarpetas_(d, u) {
  const desde = parseInt(d.desde, 10), hasta = parseInt(d.hasta, 10);
  if (!(desde > 0) || !(hasta >= desde) || hasta - desde > 2000) throw new Error('Indica un intervalo válido (por ejemplo, de 41 a 80).');
  const existen = {};
  carpetasLista_().forEach(function (c) { existen[c.NUMERO] = true; });
  const filas = [];
  for (let n = desde; n <= hasta; n++) if (!existen[String(n)]) filas.push([String(n), '', '', 'PENDIENTE', '', '']);
  if (filas.length) {
    const h = hojaCarpetas_();
    const f = h.getLastRow() + 1;
    if (f + filas.length - 1 > h.getMaxRows()) h.insertRowsAfter(h.getMaxRows(), filas.length + 50);
    h.getRange(f, 1, filas.length, 6).setValues(filas);
    registrar_(u, 'CAJA', '', 'Creadas ' + filas.length + ' cajas (' + desde + '–' + hasta + ')');
  }
  return carpetasLista_();
}

function borrarCarpeta_(d, u) {
  const c = buscarCarpeta_(d.numero);
  const usadas = carpetasConRecuento_(d, u).find(function (x) { return x.NUMERO === c.NUMERO; });
  if (usadas && usadas.EXPEDIENTES) throw new Error('No se puede borrar: la caja ' + c.NUMERO + ' tiene ' + usadas.EXPEDIENTES + ' expedientes.');
  hojaCarpetas_().deleteRow(c._fila);
  registrar_(u, 'CAJA', '', 'Borrada la caja ' + c.NUMERO);
  return carpetasLista_();
}

// ---------------------------------------------------------------------
//  Administración: campos, profesores, ajustes
// ---------------------------------------------------------------------

function guardarCampo_(d, u) {
  const h = hoja_(HOJA.CAMPOS);
  const lista = campos_();
  const etiqueta = String(d.etiqueta || '').trim();
  if (!etiqueta) throw new Error('Escribe el nombre del campo.');
  const tipo = TIPOS.indexOf(d.tipo) >= 0 ? d.tipo : 'texto';
  const opciones = (Array.isArray(d.opciones) ? d.opciones : String(d.opciones || '').split(/\r?\n/))
    .map(function (s) { return String(s).trim(); }).filter(String);
  if (tipo === 'seleccion' && !opciones.length) throw new Error('Un campo de selección necesita al menos una opción.');
  let c = d.clave ? lista.find(function (x) { return x.clave === d.clave; }) : null;
  let clave;
  if (c) {
    clave = c.clave;
    const tipoFinal = c.sistema ? c.tipo : tipo;
    h.getRange(c._fila, 2, 1, 10).setValues([[
      etiqueta, tipoFinal, opciones.join('\n'), d.obligatorio ? 'SÍ' : 'NO', String(d.seccion || c.seccion).trim(),
      c.orden, String(d.ayuda || '').trim(), d.enListados ? 'SÍ' : 'NO', c.sistema || d.activo ? 'SÍ' : 'NO', c.sistema ? 'SÍ' : 'NO'
    ]]);
    registrar_(u, 'CAMPO', '', 'Modificado el campo ' + clave + ' («' + etiqueta + '»)');
  } else {
    clave = sinAcentos_(etiqueta).replace(/Ñ/g, 'NY').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'CAMPO';
    if (/^\d/.test(clave)) clave = 'C_' + clave;
    const base = clave;
    let n = 2;
    const usadas = lista.map(function (x) { return x.clave; }).concat(META);
    while (usadas.indexOf(clave) >= 0) clave = base + '_' + (n++);
    const orden = lista.reduce(function (m, x) { return Math.max(m, x.orden < 999 ? x.orden : 0); }, 0) + 1;
    h.appendRow([clave, etiqueta, tipo, opciones.join('\n'), d.obligatorio ? 'SÍ' : 'NO', String(d.seccion || 'Otros datos').trim(),
      orden, String(d.ayuda || '').trim(), d.enListados ? 'SÍ' : 'NO', 'SÍ', 'NO']);
    invalidarConfig_();
    enCadaEpoca_(function () { asegurarColumnas_(hojaAlumnos_()); formatoSiHaceFalta_(); });
    registrar_(u, 'CAMPO', '', 'Nuevo campo ' + clave + ' («' + etiqueta + '», ' + tipo + ')');
  }
  invalidarConfig_();
  return campos_();
}

function moverCampo_(d, u) {
  const lista = campos_();
  const i = lista.findIndex(function (c) { return c.clave === d.clave; });
  const j = i + (d.dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const tmp = lista[i]; lista[i] = lista[j]; lista[j] = tmp;
  const h = hoja_(HOJA.CAMPOS);
  lista.forEach(function (c, k) { if (c.orden !== k + 1) h.getRange(c._fila, 7).setValue(k + 1); });
  invalidarConfig_();
  return campos_();
}

function guardarProfesor_(d, u) {
  const nombre = String(d.NOMBRE || '').trim();
  const email = String(d.EMAIL || '').trim().toLowerCase();
  const rol = String(d.ROL || 'EDITOR').toUpperCase();
  if (!nombre) throw new Error('Escribe el nombre.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo no parece válido.');
  if (!ROLES[rol]) throw new Error('Rol no válido.');
  const lista = profesores_();
  const fila = parseInt(d._fila, 10) || 0;
  lista.forEach(function (p) {
    if (p._fila === fila) return;
    if (email && p.EMAIL.toLowerCase() === email) throw new Error('Ese correo ya está dado de alta (' + p.NOMBRE + ').');
    if (p.NOMBRE.trim().toUpperCase() === nombre.toUpperCase()) throw new Error('Ya existe un profesor/a con ese nombre.');
  });
  const codigo = String(d.CODIGO_ACCESO || '').trim();
  if (codigo && (codigo.length < 8 || !/[A-Za-z]/.test(codigo) || !/\d/.test(codigo))) {
    throw new Error('El código de acceso debe tener al menos 8 caracteres, con letras y números. Pulsa «Generar» para crear uno seguro.');
  }
  const activo = d.ACTIVO === false || d.ACTIVO === 'NO' ? 'NO' : 'SÍ';
  if (fila && email === u.email && (rol !== 'ADMIN' || activo === 'NO')) {
    throw new Error('No puedes quitarte a ti mismo/a el rol de administración.');
  }
  const valores = [nombre, email, rol, activo, String(d.CODIGO_ACCESO || '').trim(), String(d.NOTAS || '').trim()];
  const h = hoja_(HOJA.PROFESORES);
  if (fila) h.getRange(fila, 1, 1, 6).setValues([valores]);
  else h.appendRow(valores);
  registrar_(u, 'PROFESOR', '', (fila ? 'Modificado: ' : 'Alta: ') + nombre + ' <' + email + '> · ' + rol + (activo === 'NO' ? ' · INACTIVO' : ''));
  invalidarConfig_();
  return profesores_();
}

function borrarProfesor_(d, u) {
  const p = profesores_().find(function (x) { return x._fila === parseInt(d._fila, 10); });
  if (!p) throw new Error('No se encuentra.');
  if (p.EMAIL.toLowerCase() === u.email) throw new Error('No puedes borrarte a ti mismo/a.');
  hoja_(HOJA.PROFESORES).deleteRow(p._fila);
  registrar_(u, 'PROFESOR', '', 'Baja: ' + p.NOMBRE + ' <' + p.EMAIL + '>');
  invalidarConfig_();
  return profesores_();
}

function guardarAjustes_(d, u) {
  const h = hoja_(HOJA.AJUSTES);
  const filas = tabla_(HOJA.AJUSTES);
  const cambios = [];
  AJUSTES_INICIALES.forEach(function (a) {
    const k = a[0];
    if (d[k] === undefined) return;
    const v = String(d[k]).trim();
    const f = filas.find(function (x) { return x.CLAVE === k; });
    if (f) { if (f.VALOR !== v) { h.getRange(f._fila, 2).setValue(v); cambios.push(k + '=' + v); } }
    else { h.appendRow([k, v, a[2]]); cambios.push(k + '=' + v); }
  });
  invalidarConfig_();
  if (d.COPIA_AUTOMATICA !== undefined) configurarCopiaAutomatica_(si_(d.COPIA_AUTOMATICA));
  if (cambios.length) registrar_(u, 'AJUSTES', '', cambios.join(' | '));
  return ajustes_();
}

// ---------------------------------------------------------------------
//  Historial
// ---------------------------------------------------------------------

function historial_(d, u) {
  if (!d.id && u.rol !== 'ADMIN') throw new Error('Sólo la coordinación puede ver el historial completo.');
  const h = hojaHistorial_();
  const n = h.getLastRow() - 1;
  const tam = 100;
  const vacio = { filas: [], total: 0, pagina: 1, paginas: 1 };
  if (n < 1) return vacio;
  const aObj = function (r) { return { FECHA: r[0], EMAIL: r[1], USUARIO: r[2], ACCION: r[3], ID: r[4], DETALLE: r[5] }; };
  if (!d.id && !d.q) {
    // Sin filtros: sólo se lee la página pedida (el historial puede tener cientos de miles de filas).
    const paginas = Math.max(1, Math.ceil(n / tam));
    const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
    const hasta = n + 1 - (pagina - 1) * tam, desde = Math.max(2, hasta - tam + 1);
    return { filas: h.getRange(desde, 1, hasta - desde + 1, 6).getDisplayValues().reverse().map(aObj), total: n, pagina: pagina, paginas: paginas };
  }
  let filas;
  if (d.id) {
    // Un expediente: se lee sólo la columna de registro y después sus filas.
    const ids = h.getRange(2, 5, n, 1).getDisplayValues();
    filas = [];
    for (let i = ids.length - 1; i >= 0 && filas.length < 300; i--) {
      if (ids[i][0] === d.id) filas.push(aObj(h.getRange(i + 2, 1, 1, 6).getDisplayValues()[0]));
    }
  } else {
    filas = h.getRange(2, 1, n, 6).getDisplayValues().reverse().map(aObj);
  }
  if (d.q) {
    const q = normBusqueda_(d.q).split(' ').filter(String);
    filas = filas.filter(function (f) {
      const t = normBusqueda_([f.FECHA, f.EMAIL, f.USUARIO, f.ACCION, f.ID, f.DETALLE].join(' '));
      return q.every(function (x) { return t.indexOf(x) >= 0; });
    });
  }
  const paginas = Math.max(1, Math.ceil(filas.length / tam));
  const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
  return { filas: filas.slice((pagina - 1) * tam, pagina * tam), total: filas.length, pagina: pagina, paginas: paginas };
}

// ---------------------------------------------------------------------
//  Copias de seguridad
// ---------------------------------------------------------------------

function copiaSeguridadManual() {
  const r = crearCopia_(false);
  avisar_('Copia creada: ' + r.nombre + ' · ' + r.url);
}

function copiaSeguridadAutomatica() {
  crearCopia_(true);
}

function carpetaCopias_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARPETA_COPIAS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se volvió a crear abajo */ } }
  const carpeta = DriveApp.createFolder('Copias de seguridad · ' + ss_().getName());
  props.setProperty('CARPETA_COPIAS', carpeta.getId());
  return carpeta;
}

function crearCopia_(automatica) {
  const ss = ss_();
  const carpeta = carpetaCopias_();
  const nombre = (automatica ? '[auto] ' : '') + ss.getName() + ' · ' + ahora_().replace(/:/g, '.');
  const copia = DriveApp.getFileById(ss.getId()).makeCopy(nombre, carpeta);
  const hist = hojaHistorial_().getParent();
  if (hist.getId() !== ss.getId()) DriveApp.getFileById(hist.getId()).makeCopy(nombre + ' · Historial', carpeta);
  enCadaEpoca_(function (e) {
    const id = libroEpoca_().getId();
    if (id !== ss.getId()) DriveApp.getFileById(id).makeCopy(nombre + ' · ' + e.NOMBRE, carpeta);
  });
  if (automatica) {
    const conservar = parseInt(ajustes_().COPIAS_A_CONSERVAR, 10) || 12;
    const autos = [];
    const it = carpeta.getFiles();
    const base = '[auto] ' + ss.getName() + ' · ';
    while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(base) === 0 && /· \d{4}-\d\d-\d\d \d\d\.\d\d\.\d\d$/.test(f.getName())) autos.push(f); }
    autos.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    autos.slice(conservar).forEach(function (f) {
      f.setTrashed(true);
      // Con la copia central se van también sus acompañantes (historial y épocas) de la misma fecha.
      const it2 = carpeta.getFiles();
      while (it2.hasNext()) { const g = it2.next(); if (g.getName().indexOf(f.getName() + ' · ') === 0) g.setTrashed(true); }
    });
  }
  registrar_({ email: automatica ? 'sistema' : (usuarioActual_().email || 'sistema'), nombre: automatica ? 'Copia automática' : usuarioActual_().nombre },
    'COPIA', '', nombre);
  return { nombre: nombre, url: copia.getUrl(), carpeta: carpeta.getUrl() };
}

function configurarCopiaAutomatica_(activar) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'copiaSeguridadAutomatica') ScriptApp.deleteTrigger(t);
  });
  if (activar) {
    ScriptApp.newTrigger('copiaSeguridadAutomatica').timeBased()
      .onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  }
}

// ---------------------------------------------------------------------
//  Instalación (ejecutar una vez desde el editor; se puede repetir sin riesgo)
// ---------------------------------------------------------------------

/**
 * Google ahora deja desmarcar permisos en la ventana de autorización; si falta alguno, el código
 * falla sin volver a preguntar. Esto obliga a Google a mostrar de nuevo la ventana con todos los
 * permisos que necesita la aplicación (hojas de cálculo, Drive para las copias y activadores).
 */
function pedirPermisos_() {
  console.log('Comprobando permisos…');
  try { ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); } catch (e) {
    // Si Google falla aquí («unknown error»), seguimos: si de verdad falta algún
    // permiso, el primer paso que lo necesite dará un mensaje más claro.
    console.warn('Aviso al comprobar permisos: ' + (e && e.message ? e.message : e));
  }
}

function instalar() {
  pedirPermisos_();
  invalidarConfig_();
  MEMO.sinCacheConfig = true;
  const ss = ss_();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  let propietario = '';
  try { propietario = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { /* nada */ }

  console.log('Instalando en la hoja «' + ss.getName() + '»…');
  console.log('1/7 Ajustes');
  // Ajustes
  const hAj = crearHoja_(ss, HOJA.AJUSTES, CABECERAS.Ajustes);
  const ajExist = tabla_(HOJA.AJUSTES).map(function (r) { return r.CLAVE; });
  AJUSTES_INICIALES.forEach(function (a) { if (ajExist.indexOf(a[0]) < 0) hAj.appendRow(a); });
  hAj.setColumnWidth(1, 200); hAj.setColumnWidth(2, 260); hAj.setColumnWidth(3, 560);

  // Épocas (la del siglo XIX vive en esta misma hoja central)
  const hEp = crearHoja_(ss, HOJA.EPOCAS, CABECERAS.Epocas);
  hEp.getRange(1, 1, hEp.getMaxRows(), CABECERAS.Epocas.length).setNumberFormat('@');
  if (!tabla_(HOJA.EPOCAS).some(function (e) { return String(e.CODIGO).trim(); })) {
    hEp.appendRow(['XIX', 'Siglo XIX', '1845', '1900', ajustes_().PREFIJO_ID || 'GOYA', 'ABIERTA', ss.getId(),
      'Expedientes de los alumnos que ingresaron en el Instituto entre 1845 y 1900.', 'NO']);
  }
  // Instalaciones anteriores: añadir la columna PUBLICA si falta.
  const cabEp = hEp.getRange(1, 1, 1, Math.max(hEp.getLastColumn(), 1)).getDisplayValues()[0];
  if (cabEp.indexOf('PUBLICA') < 0) {
    if (hEp.getMaxColumns() < 9) hEp.insertColumnsAfter(hEp.getMaxColumns(), 9 - hEp.getMaxColumns());
    hEp.getRange(1, 9).setValue('PUBLICA').setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
  }
  validarLista_(hEp, 6, ['ABIERTA', 'CERRADA']);
  validarLista_(hEp, 9, ['SÍ', 'NO']);
  invalidarConfig_();
  usarEpoca_('XIX');

  console.log('2/7 Campos del formulario');
  // Campos
  const hCa = crearHoja_(ss, HOJA.CAMPOS, CABECERAS.Campos);
  hCa.getRange(1, 1, hCa.getMaxRows(), CABECERAS.Campos.length).setNumberFormat('@');
  const caExist = tabla_(HOJA.CAMPOS).map(function (r) { return r.CLAVE; });
  // Actualización: «ilustre» pasa de NO/SÍ/HAY QUE BUSCAR a NO/DESTACADO/ILUSTRE/SIN COMPROBAR.
  tabla_(HOJA.CAMPOS).forEach(function (r) {
    const antiguas = ['NO|SÍ|HAY QUE BUSCAR', 'NO|DESTACADO|ILUSTRE', 'NO|DESTACADO|ILUSTRE|HAY QUE BUSCAR', 'NO|DESTACADO|ILUSTRE|HAY QUE BUSCAR|SIN COMPROBAR'];
    if (r.CLAVE === 'ILUSTRE' && antiguas.indexOf(String(r.OPCIONES).trim().split(/\s*[\n;]\s*/).join('|')) >= 0) {
      const def = CAMPOS_INICIALES.find(function (c) { return c[0] === 'ILUSTRE'; });
      hCa.getRange(r._fila, 2).setValue(def[1]);
      hCa.getRange(r._fila, 4).setValue(def[3]);
      hCa.getRange(r._fila, 8).setValue(def[6]);
      MEMO.migrarIlustre = true;
    }
  });
  // Actualización: «Carpeta del archivo» pasa a «Caja del archivo» (mismo campo, mismos datos).
  tabla_(HOJA.CAMPOS).forEach(function (r) {
    if (r.CLAVE === 'CARPETA' && /carpeta/i.test(r.ETIQUETA)) {
      hCa.getRange(r._fila, 2).setValue(String(r.ETIQUETA).replace(/Carpeta/g, 'Caja').replace(/carpeta/g, 'caja'));
      hCa.getRange(r._fila, 8).setValue(String(r.AYUDA || '').replace(/carpeta/g, 'caja'));
    }
  });
  CAMPOS_INICIALES.forEach(function (c, i) {
    if (caExist.indexOf(c[0]) >= 0) return;
    hCa.appendRow([c[0], c[1], c[2], c[3], c[4] ? 'SÍ' : 'NO', c[5], String(i + 1), c[6], c[7] ? 'SÍ' : 'NO', 'SÍ', c[8] ? 'SÍ' : 'NO']);
  });
  invalidarConfig_();

  console.log('3/7 Profesores');
  // Profesores
  const hPr = crearHoja_(ss, HOJA.PROFESORES, CABECERAS.Profesores);
  hPr.getRange(1, 1, hPr.getMaxRows(), 6).setNumberFormat('@');
  invalidarConfig_();
  if (propietario && !profesores_().some(function (p) { return p.EMAIL.toLowerCase() === propietario; })) {
    hPr.appendRow([propietario.split('@')[0].toUpperCase(), propietario, 'ADMIN', 'SÍ', '', 'Coordinación (propietaria de la hoja)']);
  }
  validarLista_(hPr, 3, ['ADMIN', 'EDITOR', 'LECTOR']);
  validarLista_(hPr, 4, ['SÍ', 'NO']);

  console.log('4/7 Cajas');
  // Cajas
  renombrarCajas_(ss);
  const hCp = crearHoja_(ss, HOJA.CARPETAS, CABECERAS.Carpetas);
  hCp.getRange(1, 1, hCp.getMaxRows(), 6).setNumberFormat('@');
  if (hCp.getLastRow() < 2) {
    const filas = [];
    for (let n = 1; n <= 40; n++) filas.push([String(n), n === 1 ? 'ABADÍA Y CORTINA' : '', n === 1 ? 'ABEIJÓN Y FUERTES' : '', 'PENDIENTE', '', '']);
    hCp.getRange(2, 1, filas.length, 6).setValues(filas);
  }
  validarLista_(hCp, 4, ESTADOS_CARPETA);

  console.log('5/7 Archivo del historial');
  // Historial: en un archivo aparte, junto a la hoja principal, para no gastar su capacidad
  const props = PropertiesService.getScriptProperties();
  delete MEMO.historial;
  let historialAparte = false;
  try { historialAparte = hojaHistorial_().getParent().getId() !== ss.getId(); } catch (e) { historialAparte = false; }
  if (!historialAparte) {
    try {
      const libro = SpreadsheetApp.create(ss.getName() + ' · Historial');
      const hh = libro.getSheets()[0].setName(HOJA.HISTORIAL);
      hh.getRange(1, 1, 1, CABECERAS.Historial.length).setValues([CABECERAS.Historial]);
      hh.getRange(1, 1, hh.getMaxRows(), CABECERAS.Historial.length).setNumberFormat('@');
      if (hh.getMaxColumns() > 6) hh.deleteColumns(7, hh.getMaxColumns() - 6);
      try {
        const destino = DriveApp.getFileById(ss.getId()).getParents();
        if (destino.hasNext()) DriveApp.getFileById(libro.getId()).moveTo(destino.next());
      } catch (e) { /* se queda en «Mi unidad» */ }
      // Si ya había movimientos en la pestaña local, se trasladan.
      const local = ss.getSheetByName(HOJA.HISTORIAL);
      if (local && local.getLastRow() > 1) {
        const v = local.getRange(2, 1, local.getLastRow() - 1, 6).getDisplayValues();
        if (v.length > hh.getMaxRows() - 1) hh.insertRowsAfter(hh.getMaxRows(), v.length);
        hh.getRange(2, 1, v.length, 6).setValues(v);
      }
      if (local) ss.deleteSheet(local);
      props.setProperty('HISTORIAL_ID', libro.getId());
      delete MEMO.historial;
    } catch (e) {
      crearHoja_(ss, HOJA.HISTORIAL, CABECERAS.Historial); // sin permiso para crear archivos: pestaña local
    }
  }

  console.log('6/7 Hoja de alumnos');
  // Alumnos (todo en formato texto: las fechas antiguas y los números no se transforman)
  let hAl = ss.getSheetByName(HOJA.ALUMNOS);
  if (!hAl) {
    hAl = ss.insertSheet(HOJA.ALUMNOS, 0);
    hAl.getRange(1, 1, hAl.getMaxRows(), hAl.getMaxColumns()).setNumberFormat('@');
  }
  delete MEMO.mapa;
  asegurarColumnas_(hAl);

  // Hoja vacía por defecto
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    const h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  // Numeración alfabética (también completa filas pegadas a mano) y formato de todas las hojas
  ordenar_(hAl);
  // Las celdas vacías también cuentan para el límite de Google: se quitan las columnas sobrantes.
  enCadaEpoca_(function (e) {
    if (e.ID_HOJA && e.ID_HOJA !== ss.getId()) { asegurarColumnas_(hojaAlumnos_()); ordenar_(hojaAlumnos_()); }
  });
  usarEpoca_('XIX');
  if (MEMO.migrarIlustre) {
    // Los expedientes que ya tenían «SÍ» pasan a «ILUSTRE» y los «HAY QUE BUSCAR», a «SIN COMPROBAR».
    enCadaEpoca_(function () {
      const h = hojaAlumnos_(), mapa = mapaColumnas_(h), n = h.getLastRow() - 1;
      if (!mapa.ILUSTRE || n < 1) return;
      const r = h.getRange(2, mapa.ILUSTRE, n, 1);
      const v = r.getDisplayValues();
      let cambia = false;
      v.forEach(function (f) {
        const t = String(f[0]).trim().toUpperCase();
        if (/^S[IÍ]$/.test(t)) { f[0] = 'ILUSTRE'; cambia = true; }
        else if (t === 'HAY QUE BUSCAR') { f[0] = 'SIN COMPROBAR'; cambia = true; }
      });
      if (cambia) { r.setValues(v); tocarDatos_(h); }
    });
    usarEpoca_('XIX');
  }
  [[hAl, hAl.getLastColumn()], [hAj, 3], [hCa, 11], [hPr, 6], [hCp, 6], [hEp, CABECERAS.Epocas.length]].forEach(function (x) {
    if (x[0].getMaxColumns() > x[1]) x[0].deleteColumns(x[1] + 1, x[0].getMaxColumns() - x[1]);
  });
  console.log('7/7 Formato y colores');
  darFormato_();
  try { configurarOrdenNocturno_(); } catch (e) { console.error('Activador nocturno', e); }

  avisar_('INSTALACIÓN COMPLETADA. Siguiente paso: Implementar > Nueva implementación > Aplicación web.');
  return true;
}

function crearHoja_(ss, nombre, cabecera) {
  let h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  const actual = h.getLastColumn() ? h.getRange(1, 1, 1, h.getLastColumn()).getDisplayValues()[0] : [];
  if (!actual.some(String)) {
    h.getRange(1, 1, 1, cabecera.length).setValues([cabecera]);
  }
  h.getRange(1, 1, 1, cabecera.length).setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
  h.setFrozenRows(1);
  return h;
}

function validarLista_(h, col, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
  h.getRange(2, col, h.getMaxRows() - 1, 1).setDataValidation(regla);
}

// ---------------------------------------------------------------------
//  Formato de la hoja de cálculo (para que se lea bien también desde Google Sheets)
// ---------------------------------------------------------------------

const COLOR = {
  tinta: '#1f2a44', gris: '#5b6475', papel: '#f6f4ef', blanco: '#ffffff', granate: '#8c2332',
  verde: '#e3f1e8', verdeT: '#1f5a37', ambar: '#fff1d6', ambarT: '#7a5212', rosa: '#f6e3e6',
  oro: '#f3e7c9', oroT: '#6b4e16', azul: '#e3ecf6', azulT: '#1d4f8c', borrado: '#eeeeee', borradoT: '#9aa0a6'
};

/** Menú de la hoja. */
function darFormato() {
  darFormato_();
  avisar_('Formato aplicado.');
}

function formatoSiHaceFalta_() {
  if (!MEMO.formatoPendiente) return;
  delete MEMO.mapa;
  MEMO.formatoPendiente = false;
  try { formatoAlumnos_(hojaAlumnos_()); } catch (e) { console.error('Formato', e); }
}

function letraColumna_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function darFormato_() {
  enCadaEpoca_(function () { formatoAlumnos_(hojaAlumnos_()); formatoCarpetas_(); });
  formatoConfig_();
}

function reglaTexto_(texto, rango, fondo, color, negrita) {
  const b = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texto).setBackground(fondo).setFontColor(color).setRanges([rango]);
  if (negrita) b.setBold(true);
  return b.build();
}

function reglaFormula_(formula, rango, fondo, color, tachado) {
  const b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges([rango]);
  if (fondo) b.setBackground(fondo);
  if (color) b.setFontColor(color);
  if (tachado) b.setStrikethrough(true);
  return b.build();
}

/**
 * Hoja Alumnos: cabecera fija y oscura, filas alternas, apellidos en negrita, colores por estado,
 * ilustres y digitalizados, nacidos fuera de España en azul, papelera en gris tachado,
 * columnas técnicas ocultas y filtro activado.
 */
function formatoAlumnos_(h) {
  const mapa = asegurarColumnas_(h);
  const campos = campos_();
  const nc = h.getLastColumn(), nf = h.getMaxRows();
  const cuerpo = h.getRange(2, 1, nf - 1, nc);
  const col = function (k) { return mapa[k] ? h.getRange(2, mapa[k], nf - 1, 1) : null; };

  // Cabecera: clave del campo + nota con su nombre completo y ayuda
  h.getRange(1, 1, 1, nc).setFontWeight('bold').setFontColor(COLOR.blanco).setBackground(COLOR.tinta)
    .setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true).setFontSize(10);
  h.setRowHeight(1, 40);
  campos.forEach(function (c) {
    if (mapa[c.clave]) h.getRange(1, mapa[c.clave]).setNote(c.etiqueta + (c.ayuda ? '\n\n' + c.ayuda : '') + (c.activo ? '' : '\n\n(Campo desactivado)'));
  });
  META.forEach(function (k) { if (mapa[k] && k !== 'ID') h.getRange(1, mapa[k]).setBackground(COLOR.gris); });
  if (mapa.ID) h.getRange(1, mapa.ID).setNote('Número de orden alfabético (GOYA000001 = primer alumno por apellidos). Se recalcula solo: no lo escribas a mano.');

  // Cuerpo
  cuerpo.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle').setWrap(false);
  if (col('ID')) col('ID').setFontFamily('Roboto Mono').setFontColor(COLOR.gris).setHorizontalAlignment('center');
  if (col('APELLIDOS')) col('APELLIDOS').setFontWeight('bold').setFontColor(COLOR.tinta);
  campos.forEach(function (c) {
    const r = col(c.clave);
    if (!r) return;
    if (c.tipo === 'texto_largo') r.setWrap(true);
    if (['seleccion', 'si_no', 'carpeta', 'numero', 'fecha'].indexOf(c.tipo) >= 0) r.setHorizontalAlignment('center');
  });

  // Anchos
  const anchos = { ID: 110, APELLIDOS: 240, NOMBRE: 170, PROFESOR: 190, ESTADO: 150, CARPETA: 80, PAIS: 110, PROVINCIA: 120, LOCALIDAD: 160, CURSO: 80, ILUSTRE: 110, DIGITALIZADO: 120 };
  campos.forEach(function (c) { if (mapa[c.clave]) h.setColumnWidth(mapa[c.clave], anchos[c.clave] || (c.tipo === 'texto_largo' ? 340 : 140)); });
  ['_CREADO_EN', '_MODIFICADO_EN'].forEach(function (k) { if (mapa[k]) h.setColumnWidth(mapa[k], 140); });
  ['_CREADO_POR', '_MODIFICADO_POR'].forEach(function (k) { if (mapa[k]) h.setColumnWidth(mapa[k], 200); });
  if (mapa._BORRADO) h.setColumnWidth(mapa._BORRADO, 90);
  META_OCULTAS.forEach(function (k) { if (mapa[k]) h.hideColumns(mapa[k]); });

  // Filas alternas
  h.getBandings().forEach(function (b) { b.remove(); });
  h.getRange(1, 1, nf, nc).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(COLOR.tinta).setFirstRowColor(COLOR.blanco).setSecondRowColor(COLOR.papel);

  // Colores condicionales (el orden importa: la papelera manda sobre todo lo demás)
  const reglas = [];
  if (mapa._BORRADO) reglas.push(reglaFormula_('=$' + letraColumna_(mapa._BORRADO) + '2="SÍ"', cuerpo, COLOR.borrado, COLOR.borradoT, true));
  if (col('ESTADO')) {
    reglas.push(reglaTexto_('TERMINADO', col('ESTADO'), COLOR.verde, COLOR.verdeT, true));
    reglas.push(reglaTexto_('EN PROCESO', col('ESTADO'), COLOR.ambar, COLOR.ambarT, true));
    reglas.push(reglaTexto_('PENDIENTE DE REVISIÓN', col('ESTADO'), COLOR.rosa, COLOR.granate, true));
  }
  if (col('ILUSTRE')) {
    reglas.push(reglaTexto_('ILUSTRE', col('ILUSTRE'), COLOR.oro, COLOR.oroT, true));
    reglas.push(reglaTexto_('DESTACADO', col('ILUSTRE'), COLOR.azul, COLOR.azulT, true));
    reglas.push(reglaTexto_('SÍ', col('ILUSTRE'), COLOR.oro, COLOR.oroT, true));
    reglas.push(reglaTexto_('SIN COMPROBAR', col('ILUSTRE'), COLOR.borrado, COLOR.gris, false));
  }
  if (col('DIGITALIZADO')) {
    reglas.push(reglaTexto_('SÍ', col('DIGITALIZADO'), COLOR.verde, COLOR.verdeT, true));
    reglas.push(reglaTexto_('HAY QUE BUSCAR', col('DIGITALIZADO'), COLOR.ambar, COLOR.ambarT, false));
  }
  if (col('PAIS')) {
    const l = letraColumna_(mapa.PAIS);
    reglas.push(reglaFormula_('=AND($' + l + '2<>"",$' + l + '2<>"España")', col('PAIS'), COLOR.azul, COLOR.azulT, false));
  }
  h.setConditionalFormatRules(reglas);

  // Fijar ID + apellidos + nombre y activar el filtro
  h.setFrozenRows(1);
  h.setFrozenColumns(mapa.ID === 1 && mapa.APELLIDOS === 2 && mapa.NOMBRE === 3 ? 3 : 1);
  const filtro = h.getFilter();
  if (filtro) filtro.remove();
  h.getRange(1, 1, nf, nc).createFilter();
  h.setTabColor(COLOR.granate);
}

function formatoCarpetas_() {
  const h = hojaCarpetas_();
  const nf = h.getMaxRows();
  cabeceraConfig_(h, [70, 240, 240, 120, 220, 300]);
  h.getRange(2, 1, nf - 1, 1).setHorizontalAlignment('center').setFontWeight('bold');
  h.getRange(2, 2, nf - 1, 2).setFontWeight('bold').setFontColor(COLOR.tinta);
  const est = h.getRange(2, 4, nf - 1, 1);
  h.setConditionalFormatRules([
    reglaTexto_('TERMINADA', est, COLOR.verde, COLOR.verdeT, true),
    reglaTexto_('EN CURSO', est, COLOR.ambar, COLOR.ambarT, true),
    reglaFormula_('=AND($A2<>"",OR($B2="",$C2=""))', h.getRange(2, 2, nf - 1, 2), COLOR.rosa, null, false)
  ]);
  h.setTabColor('#b08d57');
}

function formatoConfig_() {
  cabeceraConfig_(hoja_(HOJA.PROFESORES), [260, 260, 100, 80, 130, 300]);
  const hp = hoja_(HOJA.PROFESORES), np = hp.getMaxRows();
  const rol = hp.getRange(2, 3, np - 1, 1);
  hp.setConditionalFormatRules([
    reglaFormula_('=$D2="NO"', hp.getRange(2, 1, np - 1, 6), COLOR.borrado, COLOR.borradoT, true),
    reglaTexto_('ADMIN', rol, COLOR.rosa, COLOR.granate, true),
    reglaTexto_('EDITOR', rol, COLOR.azul, COLOR.azulT, true)
  ]);
  cabeceraConfig_(hoja_(HOJA.CAMPOS), [170, 260, 110, 200, 100, 200, 70, 320, 110, 80, 80]);
  hoja_(HOJA.CAMPOS).getRange(2, 4, hoja_(HOJA.CAMPOS).getMaxRows() - 1, 1).setWrap(true);
  const hh = hojaHistorial_();
  cabeceraConfig_(hh, [150, 220, 200, 110, 90, 700]);
  hh.getRange(2, 6, hh.getMaxRows() - 1, 1).setWrap(true);
  hh.setTabColor(COLOR.tinta);
  cabeceraConfig_(hoja_(HOJA.AJUSTES), [200, 260, 560]);
  if (ss_().getSheetByName(HOJA.EPOCAS)) {
    cabeceraConfig_(hoja_(HOJA.EPOCAS), [110, 220, 70, 70, 130, 100, 330, 420, 90]);
    hoja_(HOJA.EPOCAS).setTabColor(COLOR.granate);
  }
  [HOJA.CAMPOS, HOJA.PROFESORES, HOJA.AJUSTES].forEach(function (n) { hoja_(n).setTabColor(COLOR.tinta); });
}

function cabeceraConfig_(h, anchos) {
  const nc = anchos.length, nf = h.getMaxRows();
  h.getRange(1, 1, 1, nc).setFontWeight('bold').setFontColor(COLOR.blanco).setBackground(COLOR.tinta).setVerticalAlignment('middle');
  h.setRowHeight(1, 32);
  h.getRange(2, 1, nf - 1, nc).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('top');
  anchos.forEach(function (a, i) { h.setColumnWidth(i + 1, a); });
  h.getBandings().forEach(function (b) { b.remove(); });
  h.getRange(1, 1, nf, nc).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(COLOR.tinta).setFirstRowColor(COLOR.blanco).setSecondRowColor(COLOR.papel);
  h.setFrozenRows(1);
}
