/*
 * Simulación mínima de Google Apps Script en el navegador, SÓLO para la demo y las pruebas.
 * Ejecuta Codigo.gs tal cual sobre hojas guardadas en localStorage.
 */
(function () {
  'use strict';
  var CLAVE = 'goya_demo_v1';
  var params = new URLSearchParams(location.search);
  var db;
  try { db = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { db = null; }
  if (!db || params.has('reiniciar')) db = { hojas: {}, orden: [], props: {} };
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(db)); } catch (e) { /* sin almacenamiento */ } }

  // Proxy que acepta cualquier método de formato (setFontWeight, setBackground…) sin hacer nada.
  function encadenable(obj) {
    return new Proxy(obj, {
      get: function (o, p) {
        if (p in o) return o[p];
        if (typeof p === 'symbol') return undefined;
        return function () { return encadenable(o); };
      }
    });
  }

  function Hoja(nombre) { this.nombre = nombre; }
  Hoja.prototype = {
    get d() { return db.hojas[this.nombre]; },
    getName: function () { return this.nombre; },
    getLastRow: function () {
      var f = this.d.filas;
      for (var i = f.length - 1; i >= 0; i--) if (f[i] && f[i].some(function (c) { return c !== '' && c != null; })) return i + 1;
      return 0;
    },
    getLastColumn: function () {
      var m = 0;
      this.d.filas.forEach(function (f) { if (f) for (var j = f.length - 1; j >= 0; j--) if (f[j] !== '' && f[j] != null) { m = Math.max(m, j + 1); break; } });
      return m;
    },
    getMaxRows: function () { return Math.max(this.d.maxF, this.d.filas.length); },
    getMaxColumns: function () { return this.d.maxC; },
    insertRowsAfter: function (r, n) { this.d.maxF = this.getMaxRows() + n; guardar(); },
    insertColumnsAfter: function (c, n) { this.d.maxC += n; guardar(); },
    deleteColumns: function (c, n) { this.d.maxC = Math.max(c - 1, this.d.maxC - n); guardar(); },
    getParent: function () { return libro; },
    deleteRow: function (r) { this.d.filas.splice(r - 1, 1); guardar(); },
    appendRow: function (v) { var r = this.getLastRow() + 1; this.getRange(r, 1, 1, v.length).setValues([v]); return this; },
    getRange: function (r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      if (nr < 1 || nc < 1) throw new Error('El número de filas/columnas debe ser al menos 1');
      if (r + nr - 1 > this.getMaxRows() || c + nc - 1 > this.getMaxColumns()) throw new Error('Rango fuera de la hoja (' + this.nombre + ')');
      return encadenable(new Rango(this, r, c, nr, nc));
    },
    getDataRange: function () { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  };
  ['setFrozenRows', 'setFrozenColumns', 'setColumnWidth', 'hideColumns', 'setRowHeight', 'setTabColor', 'setConditionalFormatRules'].forEach(function (m) { Hoja.prototype[m] = function () { return this; }; });

  function Rango(h, r, c, nr, nc) { this.h = h; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Rango.prototype = {
    getValues: function () {
      var out = [], f = this.h.d.filas;
      for (var i = 0; i < this.nr; i++) {
        var fila = f[this.r - 1 + i] || [], o = [];
        for (var j = 0; j < this.nc; j++) { var v = fila[this.c - 1 + j]; o.push(v == null ? '' : v); }
        out.push(o);
      }
      return out;
    },
    getDisplayValues: function () { return this.getValues().map(function (f) { return f.map(String); }); },
    setValues: function (v) {
      var f = this.h.d.filas;
      for (var i = 0; i < this.nr; i++) {
        var k = this.r - 1 + i;
        while (f.length <= k) f.push([]);
        for (var j = 0; j < this.nc; j++) {
          var x = v[i][j];
          if (typeof x === 'string' && x.charAt(0) === "'") x = x.slice(1);
          f[k][this.c - 1 + j] = x == null ? '' : String(x);
        }
      }
      guardar();
      return this;
    },
    setValue: function (x) { return this.setValues([[x]]); },
    getValue: function () { return this.getValues()[0][0]; },
    sort: function (o) {
      var j = o.column - this.c, v = this.getValues();
      v.sort(function (a, b) { var x = String(a[j]), y = String(b[j]); if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1; return x < y ? -1 : x > y ? 1 : 0; });
      return this.setValues(v);
    }
  };

  var libro = {
    getId: function () { return 'demo'; },
    getName: function () { return 'Archivo IES Goya (demo)'; },
    getUrl: function () { return '#'; },
    getSheetByName: function (n) { return db.hojas[n] ? encadenable(new Hoja(n)) : null; },
    getSheets: function () { return db.orden.map(function (n) { return encadenable(new Hoja(n)); }); },
    insertSheet: function (n, pos) {
      db.hojas[n] = { filas: [], maxF: 1000, maxC: 26 };
      if (pos === 0) db.orden.unshift(n); else db.orden.push(n);
      guardar();
      return encadenable(new Hoja(n));
    },
    deleteSheet: function (h) { delete db.hojas[h.nombre]; db.orden = db.orden.filter(function (x) { return x !== h.nombre; }); guardar(); }
  };

  var email = params.has('anonimo') ? '' : (params.get('usuario') || 'coordinacion@iesgoya.es');
  var cache = {};
  window.SpreadsheetApp = {
    getActive: function () { return libro; },
    openById: function () { return libro; },
    create: function () { throw new Error('En la demo el historial va en la propia hoja'); },
    getUi: function () { throw new Error('Sin interfaz'); },
    newDataValidation: function () { return encadenable({}); },
    newConditionalFormatRule: function () { return encadenable({}); },
    BandingTheme: { LIGHT_GREY: 'LIGHT_GREY' }
  };
  window.Session = {
    getActiveUser: function () { return { getEmail: function () { return email; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return 'coordinacion@iesgoya.es'; } }; },
    getScriptTimeZone: function () { return 'Europe/Madrid'; }
  };
  window.CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) { var e = cache[k]; return e && e.hasta > Date.now() ? e.v : null; },
        put: function (k, v, s) { cache[k] = { v: String(v), hasta: Date.now() + (s || 600) * 1000 }; },
        remove: function (k) { delete cache[k]; }
      };
    }
  };
  window.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  window.PropertiesService = {
    getScriptProperties: function () {
      return { getProperty: function (k) { return db.props[k] == null ? null : db.props[k]; }, setProperty: function (k, v) { db.props[k] = String(v); guardar(); } };
    }
  };
  window.Utilities = {
    getUuid: function () { return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2); },
    formatDate: function (d) {
      var p = function (n) { return ('0' + n).slice(-2); };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }
  };
  window.ScriptApp = {
    getService: function () { return { getUrl: function () { return location.href.split('#')[0]; } }; },
    getProjectTriggers: function () { return []; },
    newTrigger: function () { return encadenable({}); },
    deleteTrigger: function () {},
    WeekDay: { SUNDAY: 'SUNDAY' },
    AuthMode: { FULL: 'FULL' },
    requireAllScopes: function () {}
  };
  window.DriveApp = new Proxy({}, { get: function () { return function () { throw new Error('Las copias en Google Drive no están disponibles en la demo.'); }; } });

  // google.script.run → api() de Codigo.gs (expuesta como __api para no chocar con la api() del cliente), de forma asíncrona como en Apps Script.
  function corredor(ok, mal) {
    return new Proxy({}, {
      get: function (o, p) {
        if (p === 'withSuccessHandler') return function (f) { return corredor(f, mal); };
        if (p === 'withFailureHandler') return function (f) { return corredor(ok, f); };
        return function () {
          var args = arguments;
          setTimeout(function () {
            try {
              Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; });
              var r = (p === 'api' ? window.__api : window[p]).apply(null, args);
              if (ok) ok(r);
            } catch (e) { if (mal) mal(e); else console.error(e); }
          }, 120 + Math.random() * 180);
        };
      }
    });
  }
  window.google = { script: { get run() { return corredor(null, null); } } };

  window.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.className = 'demo-banda';
    b.innerHTML = 'DEMOSTRACIÓN · los datos se guardan sólo en este navegador, no en Google Sheets · <a href="?reiniciar" style="color:inherit">reiniciar demo</a>';
    document.body.insertBefore(b, document.body.firstChild);
  });

  // Primera vez: instalar y cargar unos ejemplos.
  window.__prepararDemo = function () {
    if (db.hojas.Alumnos) return;
    instalar();
    var u = { email: 'coordinacion@iesgoya.es', nombre: 'COORDINACION', rol: 'ADMIN' };
    [['EDITOR', 'MARÍA LÓPEZ (HISTORIA)', 'maria.lopez@iesgoya.es', 'ABC123'], ['EDITOR', 'JAVIER RUIZ (LATÍN)', 'javier.ruiz@gmail.com', 'GOYA2026'], ['LECTOR', 'ANA SANZ (BIBLIOTECA)', 'ana.sanz@iesgoya.es', '']]
      .forEach(function (p) { Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; }); guardarProfesor_({ NOMBRE: p[1], EMAIL: p[2], ROL: p[0], CODIGO_ACCESO: p[3], ACTIVO: 'SÍ' }, u); });
    Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; });
    guardarCarpeta_({ original: '2', NUMERO: '2', DESDE: 'ABELLA Y GARCÍA', HASTA: 'AGUADO Y SANZ', ESTADO: 'EN CURSO', ASIGNADA_A: 'MARÍA LÓPEZ (HISTORIA)' }, u);
    guardarCarpeta_({ original: '3', NUMERO: '3', DESDE: 'AGUARÓN Y PÉREZ', HASTA: 'ALCRUDO Y MARÍN' }, u);
    var ejemplos = [
      ['1', 'ABADÍA Y CORTINA', 'Juan Manuel', 'Zaragoza', 'Borja', '1871', 'TERMINADO', 'NO', 'SÍ'],
      ['1', 'ABADÍA Y LASALA', 'Mariano', 'Huesca', 'Barbastro', '1868', 'TERMINADO', 'NO', 'NO'],
      ['1', 'ABEIJÓN Y FUERTES', 'Pedro', 'Zaragoza', 'Calatayud', '1880', 'EN PROCESO', 'HAY QUE BUSCAR', 'NO'],
      ['2', 'AGUADO Y SANZ', 'Francisco', 'Teruel', 'Alcañiz', '1859', 'TERMINADO', 'SÍ', 'SÍ'],
      ['2', 'ABELLA Y GARCÍA', 'Joaquín', 'Navarra', 'Tudela', '1862', 'EN PROCESO', 'NO', 'NO'],
      ['2', 'ACÍN Y BLASCO', 'Santiago', 'Zaragoza', 'Tarazona', '1875', 'TERMINADO', 'NO', 'NO'],
      ['3', 'ALCRUDO Y MARÍN', 'Vicente', 'Zaragoza', 'Zaragoza', '1849', 'TERMINADO', 'NO', 'SÍ']
    ];
    ejemplos.forEach(function (e, i) {
      Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; });
      guardar_({ registro: { PROFESOR: i < 4 ? 'MARÍA LÓPEZ (HISTORIA)' : 'COORDINACION', CARPETA: e[0], APELLIDOS: e[1], NOMBRE: e[2], PAIS: 'España', PROVINCIA: e[3], LOCALIDAD: e[4], CURSO: e[5], ESTADO: e[6], ILUSTRE: e[7], DIGITALIZADO: e[8] } }, u);
    });
    Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; });
    guardar_({ registro: { PROFESOR: 'JAVIER RUIZ (LATÍN)', CARPETA: '3', APELLIDOS: 'ALBIÑANA Y DUPONT', NOMBRE: 'Louis', PAIS: 'Francia', PROVINCIA: '', LOCALIDAD: 'Pau', CURSO: '1866', ESTADO: 'TERMINADO', ILUSTRE: 'NO', DIGITALIZADO: 'NO' } }, u);
  };
})();
