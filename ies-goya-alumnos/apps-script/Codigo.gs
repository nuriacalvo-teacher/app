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
 *    Carpetas    → número de carpeta, primer y último apellido, estado y quién la trabaja.
 *    Historial   → registro de todos los cambios (quién, cuándo, qué).
 *    Ajustes     → opciones generales.
 */

const HOJA = {
  ALUMNOS: 'Alumnos',
  CAMPOS: 'Campos',
  PROFESORES: 'Profesores',
  CARPETAS: 'Carpetas',
  HISTORIAL: 'Historial',
  AJUSTES: 'Ajustes'
};

/** Columnas internas de la hoja Alumnos (las claves de campos nunca empiezan por «_»). */
const META = ['ID', '_CLAVE', '_FONETICA', '_CREADO_EN', '_CREADO_POR', '_MODIFICADO_EN', '_MODIFICADO_POR', '_VERSION', '_BORRADO'];

const CABECERAS = {
  Campos: ['CLAVE', 'ETIQUETA', 'TIPO', 'OPCIONES', 'OBLIGATORIO', 'SECCION', 'ORDEN', 'AYUDA', 'EN_LISTADOS', 'ACTIVO', 'SISTEMA'],
  Profesores: ['NOMBRE', 'EMAIL', 'ROL', 'ACTIVO', 'CODIGO_ACCESO', 'NOTAS'],
  Carpetas: ['NUMERO', 'DESDE', 'HASTA', 'ESTADO', 'ASIGNADA_A', 'NOTAS'],
  Historial: ['FECHA', 'EMAIL', 'USUARIO', 'ACCION', 'ID', 'DETALLE'],
  Ajustes: ['CLAVE', 'VALOR', 'DESCRIPCION']
};

const TIPOS = ['texto', 'texto_largo', 'numero', 'fecha', 'seleccion', 'si_no', 'profesor', 'carpeta', 'pais', 'provincia', 'localidad'];
const ROLES = { NINGUNO: 0, LECTOR: 1, EDITOR: 2, ADMIN: 3 };
const ESTADOS_CARPETA = ['PENDIENTE', 'EN CURSO', 'TERMINADA'];

// clave, etiqueta, tipo, opciones, obligatorio, sección, ayuda, en listados, sistema
const CAMPOS_INICIALES = [
  ['PROFESOR', 'Profesor/a que registra', 'profesor', '', true, 'Registro', '', true, true],
  ['ESTADO', 'Estado de la toma de datos', 'seleccion', 'EN PROCESO\nTERMINADO\nPENDIENTE DE REVISIÓN', true, 'Registro', 'Marca TERMINADO cuando hayas vaciado todo el expediente.', true, true],
  ['CARPETA', 'Carpeta del archivo', 'carpeta', '', true, 'Registro', 'La app te sugiere la carpeta según los apellidos.', true, true],
  ['APELLIDOS', 'Apellidos', 'texto', '', true, 'Identificación del alumno', 'Tal como aparecen en el expediente. Ej.: ABADÍA Y CORTINA', true, true],
  ['NOMBRE', 'Nombre de pila', 'texto', '', true, 'Identificación del alumno', 'Ej.: Juan Manuel', true, true],
  ['PAIS', 'País de nacimiento', 'pais', '', false, 'Lugar y fecha de nacimiento', '', false, true],
  ['PROVINCIA', 'Provincia', 'provincia', '', false, 'Lugar y fecha de nacimiento', '', false, true],
  ['LOCALIDAD', 'Localidad', 'localidad', '', false, 'Lugar y fecha de nacimiento', 'Elígela de la lista o escríbela si no aparece (nombres antiguos, pedanías…).', true, true],
  ['FECHA_NACIMIENTO', 'Fecha de nacimiento', 'fecha', '', false, 'Lugar y fecha de nacimiento', 'dd/mm/aaaa. Si sólo consta el año, escribe el año.', false, false],
  ['CURSO', 'Curso del expediente (año de inicio)', 'numero', '', true, 'Expediente', 'Ej.: 1871', true, false],
  ['ILUSTRE', 'Alumno ilustre o destacado', 'seleccion', 'NO\nSÍ\nHAY QUE BUSCAR', true, 'Expediente', '', false, false],
  ['DIGITALIZADO', 'Digitalización hecha', 'seleccion', 'NO\nSÍ\nHAY QUE BUSCAR', true, 'Expediente', '', false, false],
  ['OBSERVACIONES', 'Observaciones', 'texto_largo', '', false, 'Observaciones', 'Estudios cursados, calificaciones, títulos, documentos que contiene la carpeta…', false, false]
];

const AJUSTES_INICIALES = [
  ['NOMBRE_APP', 'Archivo histórico del IES Goya', 'Título de la cabecera.'],
  ['SUBTITULO', 'Expedientes de alumnos · Siglo XIX (desde 1845)', 'Subtítulo de la cabecera.'],
  ['LECTURA_ABIERTA', 'NO', 'SÍ: cualquier persona identificada que no esté en Profesores puede consultar (sin editar).'],
  ['EDITORES_SOLO_PROPIOS', 'NO', 'SÍ: los editores sólo pueden modificar los expedientes que crearon ellos.'],
  ['PREFIJO_ID', 'GOYA', 'Prefijo de los identificadores de expediente (GOYA-000001).'],
  ['PAIS_DEFECTO', 'España', 'País que aparece por defecto en el formulario.'],
  ['PROVINCIA_DEFECTO', 'Zaragoza', 'Provincia que aparece por defecto en el formulario.'],
  ['COPIA_AUTOMATICA', 'NO', 'SÍ: copia de seguridad semanal automática en Google Drive (domingo de madrugada).'],
  ['COPIAS_A_CONSERVAR', '12', 'Número de copias automáticas que se conservan.']
];

/** Memoria de la ejecución en curso (Apps Script la reinicia en cada petición). */
const MEMO = {};

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
    .addItem('Crear copia de seguridad ahora', 'copiaSeguridadManual')
    .addItem('Ver enlace de la aplicación', 'mostrarEnlace')
    .addToUi();
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
      if (!u.identificado) return JSON.stringify({ ok: false, sesion: true, error: 'La sesión ha caducado. Vuelve a entrar.' });
      throw new Error('No tienes permiso para esta operación.');
    }
    return JSON.stringify({ ok: true, data: def.fn(datos || {}, u) });
  } catch (e) {
    console.error(accion, e && e.stack || e);
    return JSON.stringify({ ok: false, error: (e && e.message) || String(e) });
  }
}

const ACCIONES = {
  arranque:            { rol: 'NINGUNO', fn: arranque_ },
  login:               { rol: 'NINGUNO', fn: login_ },
  logout:              { rol: 'NINGUNO', fn: logout_ },
  inicio:              { rol: 'LECTOR',  fn: inicio_ },
  consultar:           { rol: 'LECTOR',  fn: consultar_ },
  exportar:            { rol: 'LECTOR',  fn: exportar_ },
  obtener:             { rol: 'LECTOR',  fn: obtener_ },
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
  copiaSeguridad:      { rol: 'ADMIN',   fn: function () { return crearCopia_(false); } }
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
  MEMO.usuario = u;
  return u;
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

function logout_(d, u) {
  if (d.token) CacheService.getScriptCache().remove('tok_' + d.token);
  return true;
}

function arranque_(d, u) {
  const r = { usuario: { email: u.email, nombre: u.nombre, rol: u.rol, via: u.via, identificado: u.identificado } };
  if (!u.identificado || u.rol === 'NINGUNO') return r;
  r.ajustes = ajustes_();
  r.campos = campos_();
  r.carpetas = carpetasLista_();
  const profes = profesores_();
  r.profesores = u.rol === 'ADMIN' ? profes : profes.filter(function (p) { return si_(p.ACTIVO); })
    .map(function (p) { return { NOMBRE: p.NOMBRE, ACTIVO: p.ACTIVO }; });
  if (u.rol === 'ADMIN') {
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
  try { ss = SpreadsheetApp.getActive(); } catch (e) { /* nada */ }
  if (!ss) {
    const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
    if (id) ss = SpreadsheetApp.openById(id);
  }
  if (!ss) throw new Error('No se encuentra la hoja de cálculo. Ejecuta «instalar» desde el editor de Apps Script.');
  MEMO.ss = ss;
  return ss;
}

function hoja_(nombre) {
  const h = ss_().getSheetByName(nombre);
  if (!h) throw new Error('Falta la hoja «' + nombre + '». Ejecuta «instalar» desde el editor de Apps Script.');
  return h;
}

/** Lee una hoja pequeña (configuración) como lista de objetos. */
function tabla_(nombre) {
  const v = hoja_(nombre).getDataRange().getDisplayValues();
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

function si_(v) {
  return ['SÍ', 'SI', 'TRUE', 'VERDADERO', 'X', '1', 'S'].indexOf(String(v || '').trim().toUpperCase()) >= 0;
}

function ahora_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Madrid', 'yyyy-MM-dd HH:mm:ss');
}

function ajustes_() {
  if (MEMO.ajustes) return MEMO.ajustes;
  const a = {};
  AJUSTES_INICIALES.forEach(function (x) { a[x[0]] = x[1]; });
  tabla_(HOJA.AJUSTES).forEach(function (r) { if (r.CLAVE) a[r.CLAVE] = r.VALOR; });
  MEMO.ajustes = a;
  return a;
}

function profesores_() {
  if (!MEMO.profesores) {
    MEMO.profesores = tabla_(HOJA.PROFESORES).map(function (p) {
      p.EMAIL = String(p.EMAIL || '').trim();
      p.ROL = String(p.ROL || 'EDITOR').trim().toUpperCase();
      return p;
    });
  }
  return MEMO.profesores;
}

function campos_() {
  if (MEMO.campos) return MEMO.campos;
  const lista = tabla_(HOJA.CAMPOS).filter(function (c) { return c.CLAVE; }).map(function (c) {
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
  const lastCol = h.getLastColumn();
  const cab = lastCol ? h.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
  const m = {};
  cab.forEach(function (c, i) { c = String(c).trim(); if (c && !m[c]) m[c] = i + 1; });
  MEMO.mapa = m;
  MEMO.cabecera = cab.map(function (c) { return String(c).trim(); });
  return m;
}

/** Garantiza que existen las columnas internas y las de todos los campos definidos. */
function asegurarColumnas_(h) {
  const mapa = mapaColumnas_(h);
  const necesarias = ['ID'].concat(campos_().map(function (c) { return c.clave; }), META.slice(1));
  const faltan = necesarias.filter(function (k) { return !mapa[k]; });
  if (faltan.length) {
    let col = h.getLastColumn();
    const libres = h.getMaxColumns() - col;
    if (libres < faltan.length) h.insertColumnsAfter(h.getMaxColumns(), faltan.length - libres);
    h.getRange(1, col + 1, h.getMaxRows(), faltan.length).setNumberFormat('@');
    h.getRange(1, col + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
    delete MEMO.mapa;
    return mapaColumnas_(h);
  }
  return mapa;
}

/** Lee varias columnas completas de Alumnos: {CLAVE: [valores…]} (n = nº de filas de datos). */
function leerColumnas_(h, mapa, claves) {
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
  }
  const fila1 = cab.map(function (c) {
    let v = obj[c] === undefined || obj[c] === null ? '' : String(obj[c]);
    if (/^[=+@]/.test(v)) v = "'" + v; // evita que un texto se interprete como fórmula
    return v;
  });
  h.getRange(fila, 1, 1, cab.length).setValues([fila1]);
}

function filaDeId_(h, mapa, id) {
  const ids = leerColumnas_(h, mapa, ['ID']).ID;
  const i = ids.indexOf(String(id));
  if (i < 0) throw new Error('No se encuentra el expediente ' + id + '.');
  return i + 2;
}

function registrar_(u, accion, id, detalle) {
  try {
    hoja_(HOJA.HISTORIAL).appendRow([ahora_(), u.email, u.nombre, accion, id || '', String(detalle || '').slice(0, 45000)]);
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

// ---------------------------------------------------------------------
//  Panel de inicio
// ---------------------------------------------------------------------

function inicio_(d, u) {
  const h = hoja_(HOJA.ALUMNOS);
  const mapa = mapaColumnas_(h);
  const c = leerColumnas_(h, mapa, ['ID', 'ESTADO', 'DIGITALIZADO', 'ILUSTRE', 'PROFESOR', '_BORRADO', '_CREADO_POR', '_CREADO_EN']);
  const r = { total: 0, terminados: 0, digitalizados: 0, ilustres: 0, mios: 0, hoy: 0, porEstado: {}, porProfesor: {} };
  const hoy = ahora_().slice(0, 10);
  for (let i = 0; i < c._n; i++) {
    if (!c.ID[i] || si_(c._BORRADO[i])) continue;
    r.total++;
    const est = c.ESTADO[i] || '(sin estado)';
    r.porEstado[est] = (r.porEstado[est] || 0) + 1;
    if (est === 'TERMINADO') r.terminados++;
    if (si_(c.DIGITALIZADO[i])) r.digitalizados++;
    if (si_(c.ILUSTRE[i])) r.ilustres++;
    if (c._CREADO_POR[i] === u.email) r.mios++;
    if (String(c._CREADO_EN[i]).slice(0, 10) === hoy) r.hoy++;
    const p = c.PROFESOR[i] || '(sin profesor)';
    r.porProfesor[p] = (r.porProfesor[p] || 0) + 1;
  }
  const carpetas = carpetasLista_();
  r.carpetas = {
    total: carpetas.length,
    terminadas: carpetas.filter(function (x) { return x.ESTADO === 'TERMINADA'; }).length,
    enCurso: carpetas.filter(function (x) { return x.ESTADO === 'EN CURSO'; }).length,
    mias: carpetas.filter(function (x) { return x.ASIGNADA_A && x.ASIGNADA_A === u.nombre && x.ESTADO !== 'TERMINADA'; })
      .map(function (x) { return x.NUMERO; })
  };
  // Últimos movimientos
  const hh = hoja_(HOJA.HISTORIAL);
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
  const h = hoja_(HOJA.ALUMNOS);
  const mapa = mapaColumnas_(h);
  const activos = camposActivos_().map(function (c) { return c.clave; });
  const listado = columnasListado_();
  const filtros = {};
  Object.keys(d.filtros || {}).forEach(function (k) {
    if (activos.indexOf(k) >= 0 && d.filtros[k] !== '' && d.filtros[k] !== null) filtros[k] = String(d.filtros[k]);
  });
  const claves = ['ID', 'APELLIDOS', 'NOMBRE', '_BORRADO', '_MODIFICADO_EN', '_CREADO_POR']
    .concat(listado, Object.keys(filtros), d.q ? ['LOCALIDAD', 'PROVINCIA', 'OBSERVACIONES'] : [], clavesExtra || []);
  const c = leerColumnas_(h, mapa, claves);
  const q = d.q ? normBusqueda_(d.q).split(' ').filter(String) : [];
  const papelera = !!d.papelera && u.rol === 'ADMIN';
  const soloMios = !!d.soloMios;
  const letras = {};
  const idx = [];
  const orden = {};
  for (let i = 0; i < c._n; i++) {
    if (!c.ID[i] || si_(c._BORRADO[i]) !== papelera) continue;
    if (soloMios && c._CREADO_POR[i] !== u.email) continue;
    let ok = true;
    for (const k in filtros) { if (String(c[k][i]) !== filtros[k]) { ok = false; break; } }
    if (!ok) continue;
    if (q.length) {
      const texto = ' ' + normBusqueda_(claves.map(function (k) { return c[k] ? c[k][i] : ''; }).join(' ')) + ' ';
      if (!q.every(function (t) { return texto.indexOf(t) >= 0; })) continue;
    }
    const ko = claveOrden_(c.APELLIDOS[i]) + '  ' + claveOrden_(c.NOMBRE[i]);
    const letra = letraIndice_(ko);
    letras[letra] = (letras[letra] || 0) + 1;
    if (d.letra && letra !== d.letra) continue;
    orden[i] = ko;
    idx.push(i);
  }
  const o = d.orden || 'apellidos';
  idx.sort(function (a, b) {
    let r = 0;
    if (o === 'carpeta') r = ordenNatural_(c.CARPETA ? c.CARPETA[a] : '', c.CARPETA ? c.CARPETA[b] : '');
    else if (o === 'curso') r = ordenNatural_(c.CURSO ? c.CURSO[a] : '', c.CURSO ? c.CURSO[b] : '');
    else if (o === 'reciente') r = String(c._MODIFICADO_EN[b]).localeCompare(String(c._MODIFICADO_EN[a]));
    return r || (orden[a] < orden[b] ? -1 : orden[a] > orden[b] ? 1 : 0);
  });
  return { c: c, idx: idx, letras: letras, listado: listado };
}

function consultar_(d, u) {
  const extra = d.orden === 'carpeta' ? ['CARPETA'] : d.orden === 'curso' ? ['CURSO'] : [];
  const f = filtrar_(d, u, extra);
  const tam = Math.min(Math.max(parseInt(d.tam, 10) || 50, 10), 500);
  const paginas = Math.max(1, Math.ceil(f.idx.length / tam));
  const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
  const claves = ['ID', 'APELLIDOS', 'NOMBRE'].concat(f.listado);
  const filas = f.idx.slice((pagina - 1) * tam, pagina * tam).map(function (i) {
    const o = {};
    claves.forEach(function (k) { o[k] = f.c[k] ? f.c[k][i] : ''; });
    return o;
  });
  return { total: f.idx.length, pagina: pagina, paginas: paginas, tam: tam, filas: filas, columnas: f.listado, letras: f.letras };
}

/** Exporta a CSV (separador «;», para Excel en español) los expedientes que cumplen los filtros. */
function exportar_(d, u) {
  const campos = camposActivos_();
  const h = hoja_(HOJA.ALUMNOS);
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
  const h = hoja_(HOJA.ALUMNOS);
  const mapa = mapaColumnas_(h);
  const reg = leerFila_(h, filaDeId_(h, mapa, d.id));
  delete reg._fila;
  let bloqueo = null;
  try {
    const b = CacheService.getScriptCache().get('edit_' + reg.ID);
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
  ['ID', 'APELLIDOS', 'NOMBRE', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PROFESOR', 'ESTADO'].forEach(function (k) {
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
  const h = hoja_(HOJA.ALUMNOS);
  const mapa = mapaColumnas_(h);
  const c = leerColumnas_(h, mapa, ['ID', '_CLAVE', '_FONETICA', '_BORRADO', 'APELLIDOS', 'NOMBRE', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PROFESOR', 'ESTADO']);
  const clave = claveDuplicado_(ap, no), fonAp = fonetica_(ap), fon = fonAp + '|' + fonetica_(no);
  const conNombre = normNombre_(no).length > 0;
  for (let i = 0; i < c._n; i++) {
    if (!c.ID[i] || c.ID[i] === d.id || si_(c._BORRADO[i])) continue;
    // Si la fila se escribió a mano en la hoja, calculamos las claves al vuelo.
    const k = c._CLAVE[i] || claveDuplicado_(c.APELLIDOS[i], c.NOMBRE[i]);
    const f = c._FONETICA[i] || claveFonetica_(c.APELLIDOS[i], c.NOMBRE[i]);
    if (conNombre && k === clave) vacio.exactos.push(resumen_(c, i));
    else if (conNombre && f === fon) vacio.parecidos.push(resumen_(c, i));
    else if (f.split('|')[0] === fonAp) {
      vacio.totalMismos++;
      if (vacio.mismosApellidos.length < 25) vacio.mismosApellidos.push(resumen_(c, i));
    }
  }
  return vacio;
}

function localidadesUsadas_(d) {
  const h = hoja_(HOJA.ALUMNOS);
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
    const h = hoja_(HOJA.ALUMNOS);
    const mapa = asegurarColumnas_(h);
    const idx = leerColumnas_(h, mapa, ['ID', '_CLAVE', '_FONETICA', '_BORRADO', 'APELLIDOS', 'NOMBRE', 'CARPETA', 'CURSO', 'LOCALIDAD', 'PROVINCIA', 'PROFESOR', 'ESTADO']);
    let fila = 0, anterior = null;
    if (d.id) {
      const i = idx.ID.indexOf(String(d.id));
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
      if (!idx.ID[i] || idx.ID[i] === d.id || si_(idx._BORRADO[i])) continue;
      const k = idx._CLAVE[i] || claveDuplicado_(idx.APELLIDOS[i], idx.NOMBRE[i]);
      const f = idx._FONETICA[i] || claveFonetica_(idx.APELLIDOS[i], idx.NOMBRE[i]);
      if (k === clave || f === fon) coincidencias.push(resumen_(idx, i));
    }
    const cambiaNombre = !anterior || claveDuplicado_(anterior.APELLIDOS, anterior.NOMBRE) !== clave;
    if (coincidencias.length && cambiaNombre && !d.confirmarHomonimo) {
      return { duplicado: true, coincidencias: coincidencias.slice(0, 10) };
    }

    const t = ahora_();
    const nuevo = Object.assign({}, anterior || {}, reg, { _CLAVE: clave, _FONETICA: fon, _MODIFICADO_EN: t, _MODIFICADO_POR: u.email });
    let detalle;
    if (anterior) {
      nuevo._VERSION = (parseInt(anterior._VERSION, 10) || 0) + 1;
      detalle = campos.filter(function (c) { return String(anterior[c.clave] || '') !== reg[c.clave]; })
        .map(function (c) { return c.clave + ': «' + (anterior[c.clave] || '') + '» → «' + reg[c.clave] + '»'; }).join(' | ') || 'Sin cambios';
    } else {
      nuevo.ID = nuevoId_(idx.ID);
      nuevo._CREADO_EN = t;
      nuevo._CREADO_POR = u.email;
      nuevo._VERSION = 1;
      nuevo._BORRADO = '';
      fila = h.getLastRow() + 1;
      detalle = reg.APELLIDOS + ', ' + reg.NOMBRE + (reg.CARPETA ? ' · carpeta ' + reg.CARPETA : '');
    }
    if (coincidencias.length && cambiaNombre) {
      detalle += ' | HOMÓNIMO CONFIRMADO frente a ' + coincidencias.map(function (x) { return x.ID; }).join(', ');
    }
    escribirFila_(h, fila, nuevo);
    registrar_(u, anterior ? 'MODIFICAR' : 'CREAR', nuevo.ID, detalle);
    CacheService.getScriptCache().remove('edit_' + nuevo.ID);
    return { id: nuevo.ID, version: String(nuevo._VERSION), creado: !anterior };
  } finally {
    lock.releaseLock();
  }
}

function nuevoId_(ids) {
  const props = PropertiesService.getScriptProperties();
  let n = parseInt(props.getProperty('ULTIMO_NUM') || '0', 10);
  let max = 0;
  ids.forEach(function (id) { const m = /(\d+)$/.exec(id); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  n = Math.max(n, max) + 1;
  props.setProperty('ULTIMO_NUM', String(n));
  const pref = String(ajustes_().PREFIJO_ID || 'EXP').trim().toUpperCase();
  return pref + '-' + ('000000' + n).slice(-6);
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
    const h = hoja_(HOJA.ALUMNOS);
    const mapa = asegurarColumnas_(h);
    const fila = filaDeId_(h, mapa, d.id);
    const reg = leerFila_(h, fila);
    reg._BORRADO = borrar ? 'SÍ' : '';
    reg._MODIFICADO_EN = ahora_();
    reg._MODIFICADO_POR = u.email;
    reg._VERSION = (parseInt(reg._VERSION, 10) || 0) + 1;
    escribirFila_(h, fila, reg);
    registrar_(u, borrar ? 'BORRAR' : 'RESTAURAR', d.id, (reg.APELLIDOS + ', ' + reg.NOMBRE) + (d.motivo ? ' · Motivo: ' + d.motivo : ''));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
//  Carpetas
// ---------------------------------------------------------------------

function carpetasLista_() {
  return tabla_(HOJA.CARPETAS).filter(function (c) { return String(c.NUMERO).trim(); }).map(function (c) {
    return {
      NUMERO: String(c.NUMERO).trim(), DESDE: c.DESDE || '', HASTA: c.HASTA || '',
      ESTADO: c.ESTADO || 'PENDIENTE', ASIGNADA_A: c.ASIGNADA_A || '', NOTAS: c.NOTAS || '', _fila: c._fila
    };
  }).sort(function (a, b) { return ordenNatural_(a.NUMERO, b.NUMERO); });
}

function carpetasConRecuento_(d, u) {
  const h = hoja_(HOJA.ALUMNOS);
  const c = leerColumnas_(h, mapaColumnas_(h), ['ID', 'CARPETA', 'ESTADO', '_BORRADO']);
  const n = {}, t = {};
  for (let i = 0; i < c._n; i++) {
    if (!c.ID[i] || si_(c._BORRADO[i])) continue;
    const k = String(c.CARPETA[i]).trim();
    n[k] = (n[k] || 0) + 1;
    if (c.ESTADO[i] === 'TERMINADO') t[k] = (t[k] || 0) + 1;
  }
  return carpetasLista_().map(function (x) { x.EXPEDIENTES = n[x.NUMERO] || 0; x.TERMINADOS = t[x.NUMERO] || 0; return x; });
}

function buscarCarpeta_(numero) {
  const c = carpetasLista_().find(function (x) { return x.NUMERO === String(numero).trim(); });
  if (!c) throw new Error('No existe la carpeta ' + numero + '.');
  return c;
}

function escribirCarpeta_(c) {
  hoja_(HOJA.CARPETAS).getRange(c._fila, 1, 1, 6)
    .setValues([[c.NUMERO, c.DESDE, c.HASTA, c.ESTADO, c.ASIGNADA_A, c.NOTAS]]);
}

/** Un editor se asigna una carpeta, la libera o la da por terminada (para no trabajar dos en la misma). */
function tomarCarpeta_(d, u) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const c = buscarCarpeta_(d.numero);
    const esMia = c.ASIGNADA_A === u.nombre;
    const admin = u.rol === 'ADMIN';
    if (d.accion === 'asignar') {
      if (c.ASIGNADA_A && !esMia && c.ESTADO !== 'TERMINADA') throw new Error('La carpeta ' + c.NUMERO + ' ya la está trabajando ' + c.ASIGNADA_A + '.');
      c.ASIGNADA_A = u.nombre; c.ESTADO = 'EN CURSO';
    } else if (d.accion === 'liberar') {
      if (!esMia && !admin) throw new Error('Sólo quien tiene asignada la carpeta (o la coordinación) puede liberarla.');
      c.ASIGNADA_A = ''; c.ESTADO = 'PENDIENTE';
    } else if (d.accion === 'terminar') {
      if (!esMia && !admin) throw new Error('Sólo quien tiene asignada la carpeta (o la coordinación) puede darla por terminada.');
      c.ESTADO = 'TERMINADA';
    } else if (d.accion === 'reabrir') {
      if (!esMia && !admin) throw new Error('Sólo quien la terminó (o la coordinación) puede reabrirla.');
      c.ESTADO = c.ASIGNADA_A ? 'EN CURSO' : 'PENDIENTE';
    } else {
      throw new Error('Acción no válida.');
    }
    escribirCarpeta_(c);
    registrar_(u, 'CARPETA', '', 'Carpeta ' + c.NUMERO + ': ' + d.accion + ' → ' + c.ESTADO + (c.ASIGNADA_A ? ' (' + c.ASIGNADA_A + ')' : ''));
    return carpetasLista_();
  } finally {
    lock.releaseLock();
  }
}

function guardarCarpeta_(d, u) {
  const numero = String(d.NUMERO || '').trim();
  if (!numero) throw new Error('Indica el número de carpeta.');
  const lista = carpetasLista_();
  const existente = lista.find(function (x) { return x.NUMERO === numero; });
  const original = d.original ? lista.find(function (x) { return x.NUMERO === String(d.original); }) : null;
  if (existente && (!original || existente._fila !== original._fila)) throw new Error('Ya existe la carpeta ' + numero + '.');
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
  const h = hoja_(HOJA.CARPETAS);
  if (original) {
    c._fila = original._fila;
    escribirCarpeta_(c);
  } else {
    h.appendRow([c.NUMERO, c.DESDE, c.HASTA, c.ESTADO, c.ASIGNADA_A, c.NOTAS]);
  }
  registrar_(u, 'CARPETA', '', 'Carpeta ' + numero + ': ' + (c.DESDE || '…') + ' – ' + (c.HASTA || '…') + ' · ' + c.ESTADO);
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
    const h = hoja_(HOJA.CARPETAS);
    const f = h.getLastRow() + 1;
    if (f + filas.length - 1 > h.getMaxRows()) h.insertRowsAfter(h.getMaxRows(), filas.length + 50);
    h.getRange(f, 1, filas.length, 6).setValues(filas);
    registrar_(u, 'CARPETA', '', 'Creadas ' + filas.length + ' carpetas (' + desde + '–' + hasta + ')');
  }
  return carpetasLista_();
}

function borrarCarpeta_(d, u) {
  const c = buscarCarpeta_(d.numero);
  const usadas = carpetasConRecuento_(d, u).find(function (x) { return x.NUMERO === c.NUMERO; });
  if (usadas && usadas.EXPEDIENTES) throw new Error('No se puede borrar: la carpeta ' + c.NUMERO + ' tiene ' + usadas.EXPEDIENTES + ' expedientes.');
  hoja_(HOJA.CARPETAS).deleteRow(c._fila);
  registrar_(u, 'CARPETA', '', 'Borrada la carpeta ' + c.NUMERO);
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
    delete MEMO.campos;
    asegurarColumnas_(hoja_(HOJA.ALUMNOS));
    registrar_(u, 'CAMPO', '', 'Nuevo campo ' + clave + ' («' + etiqueta + '», ' + tipo + ')');
  }
  delete MEMO.campos;
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
  delete MEMO.campos;
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
  const activo = d.ACTIVO === false || d.ACTIVO === 'NO' ? 'NO' : 'SÍ';
  if (fila && email === u.email && (rol !== 'ADMIN' || activo === 'NO')) {
    throw new Error('No puedes quitarte a ti mismo/a el rol de administración.');
  }
  const valores = [nombre, email, rol, activo, String(d.CODIGO_ACCESO || '').trim(), String(d.NOTAS || '').trim()];
  const h = hoja_(HOJA.PROFESORES);
  if (fila) h.getRange(fila, 1, 1, 6).setValues([valores]);
  else h.appendRow(valores);
  registrar_(u, 'PROFESOR', '', (fila ? 'Modificado: ' : 'Alta: ') + nombre + ' <' + email + '> · ' + rol + (activo === 'NO' ? ' · INACTIVO' : ''));
  delete MEMO.profesores;
  return profesores_();
}

function borrarProfesor_(d, u) {
  const p = profesores_().find(function (x) { return x._fila === parseInt(d._fila, 10); });
  if (!p) throw new Error('No se encuentra.');
  if (p.EMAIL.toLowerCase() === u.email) throw new Error('No puedes borrarte a ti mismo/a.');
  hoja_(HOJA.PROFESORES).deleteRow(p._fila);
  registrar_(u, 'PROFESOR', '', 'Baja: ' + p.NOMBRE + ' <' + p.EMAIL + '>');
  delete MEMO.profesores;
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
  delete MEMO.ajustes;
  if (d.COPIA_AUTOMATICA !== undefined) configurarCopiaAutomatica_(si_(d.COPIA_AUTOMATICA));
  if (cambios.length) registrar_(u, 'AJUSTES', '', cambios.join(' | '));
  return ajustes_();
}

// ---------------------------------------------------------------------
//  Historial
// ---------------------------------------------------------------------

function historial_(d, u) {
  if (!d.id && u.rol !== 'ADMIN') throw new Error('Sólo la coordinación puede ver el historial completo.');
  const h = hoja_(HOJA.HISTORIAL);
  const n = h.getLastRow() - 1;
  if (n < 1) return { filas: [], total: 0, pagina: 1, paginas: 1 };
  let filas = h.getRange(2, 1, n, 6).getDisplayValues().reverse()
    .map(function (r) { return { FECHA: r[0], EMAIL: r[1], USUARIO: r[2], ACCION: r[3], ID: r[4], DETALLE: r[5] }; });
  if (d.id) filas = filas.filter(function (f) { return f.ID === d.id; });
  if (d.q) {
    const q = normBusqueda_(d.q).split(' ').filter(String);
    filas = filas.filter(function (f) {
      const t = normBusqueda_([f.FECHA, f.EMAIL, f.USUARIO, f.ACCION, f.ID, f.DETALLE].join(' '));
      return q.every(function (x) { return t.indexOf(x) >= 0; });
    });
  }
  const tam = 100;
  const paginas = Math.max(1, Math.ceil(filas.length / tam));
  const pagina = Math.min(Math.max(parseInt(d.pagina, 10) || 1, 1), paginas);
  return { filas: filas.slice((pagina - 1) * tam, pagina * tam), total: filas.length, pagina: pagina, paginas: paginas };
}

// ---------------------------------------------------------------------
//  Copias de seguridad
// ---------------------------------------------------------------------

function copiaSeguridadManual() {
  const r = crearCopia_(false);
  try { SpreadsheetApp.getUi().alert('Copia creada: ' + r.nombre + '\n' + r.url); } catch (e) { /* sin interfaz */ }
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
  if (automatica) {
    const conservar = parseInt(ajustes_().COPIAS_A_CONSERVAR, 10) || 12;
    const autos = [];
    const it = carpeta.getFiles();
    while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('[auto] ') === 0) autos.push(f); }
    autos.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    autos.slice(conservar).forEach(function (f) { f.setTrashed(true); });
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

function instalar() {
  const ss = ss_();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  let propietario = '';
  try { propietario = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { /* nada */ }

  // Ajustes
  const hAj = crearHoja_(ss, HOJA.AJUSTES, CABECERAS.Ajustes);
  const ajExist = tabla_(HOJA.AJUSTES).map(function (r) { return r.CLAVE; });
  AJUSTES_INICIALES.forEach(function (a) { if (ajExist.indexOf(a[0]) < 0) hAj.appendRow(a); });
  hAj.setColumnWidth(1, 200); hAj.setColumnWidth(2, 260); hAj.setColumnWidth(3, 560);

  // Campos
  const hCa = crearHoja_(ss, HOJA.CAMPOS, CABECERAS.Campos);
  hCa.getRange(1, 1, hCa.getMaxRows(), CABECERAS.Campos.length).setNumberFormat('@');
  const caExist = tabla_(HOJA.CAMPOS).map(function (r) { return r.CLAVE; });
  CAMPOS_INICIALES.forEach(function (c, i) {
    if (caExist.indexOf(c[0]) >= 0) return;
    hCa.appendRow([c[0], c[1], c[2], c[3], c[4] ? 'SÍ' : 'NO', c[5], String(i + 1), c[6], c[7] ? 'SÍ' : 'NO', 'SÍ', c[8] ? 'SÍ' : 'NO']);
  });
  delete MEMO.campos;

  // Profesores
  const hPr = crearHoja_(ss, HOJA.PROFESORES, CABECERAS.Profesores);
  hPr.getRange(1, 1, hPr.getMaxRows(), 6).setNumberFormat('@');
  delete MEMO.profesores;
  if (propietario && !profesores_().some(function (p) { return p.EMAIL.toLowerCase() === propietario; })) {
    hPr.appendRow([propietario.split('@')[0].toUpperCase(), propietario, 'ADMIN', 'SÍ', '', 'Coordinación (propietaria de la hoja)']);
  }
  validarLista_(hPr, 3, ['ADMIN', 'EDITOR', 'LECTOR']);
  validarLista_(hPr, 4, ['SÍ', 'NO']);

  // Carpetas
  const hCp = crearHoja_(ss, HOJA.CARPETAS, CABECERAS.Carpetas);
  hCp.getRange(1, 1, hCp.getMaxRows(), 6).setNumberFormat('@');
  if (hCp.getLastRow() < 2) {
    const filas = [];
    for (let n = 1; n <= 40; n++) filas.push([String(n), n === 1 ? 'ABADÍA Y CORTINA' : '', n === 1 ? 'ABEIJÓN Y FUERTES' : '', 'PENDIENTE', '', '']);
    hCp.getRange(2, 1, filas.length, 6).setValues(filas);
  }
  validarLista_(hCp, 4, ESTADOS_CARPETA);

  // Historial
  const hHi = crearHoja_(ss, HOJA.HISTORIAL, CABECERAS.Historial);
  hHi.setColumnWidth(1, 150); hHi.setColumnWidth(6, 700);

  // Alumnos (todo en formato texto: las fechas antiguas y los números no se transforman)
  let hAl = ss.getSheetByName(HOJA.ALUMNOS);
  if (!hAl) {
    hAl = ss.insertSheet(HOJA.ALUMNOS, 0);
    hAl.getRange(1, 1, hAl.getMaxRows(), hAl.getMaxColumns()).setNumberFormat('@');
  }
  delete MEMO.mapa;
  asegurarColumnas_(hAl);
  hAl.setFrozenRows(1);
  hAl.setFrozenColumns(1);

  // Hoja vacía por defecto
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    const h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  // Contador de identificadores
  const ids = leerColumnas_(hAl, mapaColumnas_(hAl), ['ID']).ID;
  let max = 0;
  ids.forEach(function (id) { const m = /(\d+)$/.exec(id); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ULTIMO_NUM', String(Math.max(max, parseInt(props.getProperty('ULTIMO_NUM') || '0', 10))));

  try {
    SpreadsheetApp.getUi().alert('Instalación completada.\n\nAhora ve a Implementar > Nueva implementación > Aplicación web.');
  } catch (e) { /* ejecutado sin interfaz */ }
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
