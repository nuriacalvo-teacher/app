/**
 * GOBLOX — servidor para Google Apps Script.
 *
 * Este script va "pegado" a una hoja de cálculo de Google (Extensiones > Apps Script).
 * Guarda en ella los alumnos, las partidas y los GOYUX que da el profesorado.
 * Instrucciones completas: LEEME.md
 */

// ====== CONFIGURACIÓN: cambia esto ======
const CONFIG = {
  DOMAIN: 'iesgoya.es',
  // Correos del profesorado que puede ver el panel y dar GOYUX
  TEACHERS: ['tu.correo@iesgoya.es'],
  // Segundos mínimos entre dos partidas guardadas por el mismo alumno
  MIN_SECONDS_BETWEEN_RUNS: 60,
  // Una misión hecha en menos tiempo no da GOYUX (evita trampas)
  MIN_SECONDS_FOR_GOYUX: 90,
  // Puntos de experiencia (GOYUX ganados jugando) para subir de nivel
  XP_PER_LEVEL: 200
};
// ========================================

const GAMES = { diner: 'Healthy Bites Diner', mall: 'Back to School Rush' };
const GAME_IDS = Object.keys(GAMES);
const SHEETS = {
  students: 'Alumnos',
  runs: 'Partidas',
  goyux: 'GOYUX'
};
const RUN_HEAD = ['Fecha', 'Correo', 'Nombre', 'Juego', 'Puntuación', 'Estrellas', 'Presupuesto ($)', 'Dinero restante ($)', 'Inglés %', 'Modales', 'Duración (min)', 'Errores', 'GOYUX ganados', 'Detalles'];
const GOYUX_HEAD = ['Fecha', 'Correo', 'Nombre', 'Cantidad', 'Motivo', 'Profesor'];
// Columnas de la hoja Alumnos (0 = columna A)
const C = { email: 0, name: 1, level: 2, plays: 3, xp: 4, granted: 5, total: 6, seen: 7, lastRun: 8, avatar: 9, vocab: 10, stars: 11 };
function studentHead_() {
  return ['Correo', 'Nombre', 'Nivel', 'Partidas', 'GOYUX juego', 'GOYUX profesor', 'GOYUX total', 'Última conexión', 'Última partida', 'Avatar', 'Vocabulario']
    .concat(GAME_IDS.map(id => 'Estrellas · ' + GAMES[id]));
}

/* ---------- web app ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('GOBLOX')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ---------- helpers ---------- */
function user_() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) throw new Error('No se ha podido leer tu cuenta. Entra con tu cuenta @' + CONFIG.DOMAIN + '.');
  const isTeacher = CONFIG.TEACHERS.some(t => String(t).toLowerCase().trim() === email);
  if (!isTeacher && !email.endsWith('@' + CONFIG.DOMAIN)) throw new Error('GOBLOX solo está disponible para cuentas @' + CONFIG.DOMAIN + '.');
  return { email, isTeacher };
}
function teacher_() { const u = user_(); if (!u.isTeacher) throw new Error('Esta función es solo para el profesorado.'); return u; }
function sheet_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = SHEETS[key];
  const head = key === 'students' ? studentHead_() : key === 'runs' ? RUN_HEAD : GOYUX_HEAD;
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1d3fbf').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
const clamp_ = (v, a, b) => Math.max(a, Math.min(b, v));
const num_ = v => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const iso_ = v => (v instanceof Date && !isNaN(v)) ? v.toISOString() : null;
function parse_(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function nameFromEmail_(email) {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ').slice(0, 30) || 'Player';
}
function findStudentRow_(sh, email) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const vals = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(vals[i][0]).toLowerCase().trim() === email) return i + 2;
  return -1;
}
function setFormulas_(sh, r) {
  sh.getRange(r, C.level + 1).setFormula('=1+INT(E' + r + '/' + CONFIG.XP_PER_LEVEL + ')');
  sh.getRange(r, C.granted + 1).setFormula('=SUMIF(GOYUX!B:B,A' + r + ',GOYUX!D:D)');
  sh.getRange(r, C.total + 1).setFormula('=E' + r + '+F' + r);
}
function ensureStudent_(email) {
  sheet_('goyux');
  const sh = sheet_('students');
  let r = findStudentRow_(sh, email);
  if (r < 0) {
    const row = studentHead_().map(() => '');
    row[C.email] = email; row[C.name] = nameFromEmail_(email); row[C.plays] = 0; row[C.xp] = 0; row[C.avatar] = '{}'; row[C.vocab] = '[]';
    GAME_IDS.forEach((id, i) => { row[C.stars + i] = 0; });
    sh.appendRow(row);
    r = sh.getLastRow();
    setFormulas_(sh, r);
  }
  return { sh, r };
}
function rowToStudent_(v) {
  const best = {};
  GAME_IDS.forEach((id, i) => { best[id] = Number(v[C.stars + i]) || 0; });
  return {
    email: String(v[C.email]).toLowerCase(), name: String(v[C.name] || ''), level: Number(v[C.level]) || 1, plays: Number(v[C.plays]) || 0,
    xp: Number(v[C.xp]) || 0, granted: Number(v[C.granted]) || 0, total: Number(v[C.total]) || 0,
    lastSeen: iso_(v[C.seen]), lastRun: iso_(v[C.lastRun]), avatar: parse_(v[C.avatar], {}), vocab: parse_(v[C.vocab], []), best
  };
}
function readStudent_(sh, r) {
  SpreadsheetApp.flush();
  return rowToStudent_(sh.getRange(r, 1, 1, studentHead_().length).getValues()[0]);
}
function grantsOf_(email, limit) {
  const sh = sheet_('goyux');
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, GOYUX_HEAD.length).getValues()
    .filter(v => String(v[1]).toLowerCase().trim() === email && Number(v[3]))
    .map(v => ({ date: iso_(v[0]) || new Date().toISOString(), amount: Number(v[3]), reason: String(v[4] || ''), by: String(v[5] || '') }))
    .reverse().slice(0, limit);
}
function cleanAvatar_(a) {
  const ok = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const out = {};
  ['skin', 'shirt', 'pants'].forEach(k => { if (ok(a && a[k])) out[k] = a[k]; });
  return out;
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- API for students ---------- */
function getMe() {
  const u = user_();
  return withLock_(() => {
    const { sh, r } = ensureStudent_(u.email);
    sh.getRange(r, C.seen + 1).setValue(new Date());
    const st = readStudent_(sh, r);
    return {
      email: u.email, isTeacher: u.isTeacher, xpPerLevel: CONFIG.XP_PER_LEVEL,
      profile: Object.assign({ name: st.name, plays: st.plays, xp: st.xp, granted: st.granted, best: st.best, vocab: st.vocab }, cleanAvatar_(st.avatar)),
      grants: grantsOf_(u.email, 8)
    };
  });
}
function saveProfile(p) {
  const u = user_();
  const name = String((p && p.name) || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 20);
  return withLock_(() => {
    const { sh, r } = ensureStudent_(u.email);
    if (name) sh.getRange(r, C.name + 1).setValue(name);
    sh.getRange(r, C.avatar + 1).setValue(JSON.stringify(cleanAvatar_(p)));
    return true;
  });
}
function saveRun(run) {
  const u = user_();
  if (!run || !GAMES[run.game]) throw new Error('Partida no válida.');
  const cache = CacheService.getScriptCache();
  const key = 'run:' + u.email;
  if (cache.get(key)) throw new Error('Has guardado una partida hace muy poco. Espera un minuto.');
  const score = clamp_(Math.round(Number(run.score) || 0), 0, 100);
  const stars = score >= 85 ? 3 : score >= 65 ? 2 : 1;
  const secs = clamp_(Math.round(Number(run.seconds) || 0), 0, 36000);
  const earned = secs < CONFIG.MIN_SECONDS_FOR_GOYUX ? 0 : score;
  const mistakes = Array.isArray(run.mistakes) ? run.mistakes.slice(0, 10).map(m => ({ said: String(m.said || '').slice(0, 200), tip: String(m.tip || '').slice(0, 300) })) : [];
  return withLock_(() => {
    const { sh, r } = ensureStudent_(u.email);
    const st = readStudent_(sh, r);
    sheet_('runs').appendRow([
      new Date(), u.email, st.name, GAMES[run.game], score, stars, num_(run.budget), num_(run.moneyLeft),
      clamp_(num_(run.english), 0, 100), clamp_(num_(run.manners), 0, 100), Math.round(secs / 6) / 10, mistakes.length, earned,
      JSON.stringify({ metrics: run.metrics || {}, events: run.events || [], mistakes }).slice(0, 40000)
    ]);
    sh.getRange(r, C.plays + 1).setValue(st.plays + 1);
    sh.getRange(r, C.xp + 1).setValue(st.xp + earned);
    sh.getRange(r, C.lastRun + 1).setValue(new Date());
    const gi = GAME_IDS.indexOf(run.game);
    sh.getRange(r, C.stars + gi + 1).setValue(Math.max(st.best[run.game] || 0, stars));
    const vocab = st.vocab.slice();
    (Array.isArray(run.vocab) ? run.vocab : []).slice(0, 40).forEach(v => {
      const en = String(v.en || '').slice(0, 120), es = String(v.es || '').slice(0, 120), g = String(v.g || '').slice(0, 60);
      if (en && !vocab.some(x => x.en === en)) vocab.push({ en, es, g });
    });
    sh.getRange(r, C.vocab + 1).setValue(JSON.stringify(vocab.slice(0, 400)));
    cache.put(key, '1', CONFIG.MIN_SECONDS_BETWEEN_RUNS);
    const after = readStudent_(sh, r);
    return { xp: after.xp, granted: after.granted, plays: after.plays, best: after.best, vocab: after.vocab, earned };
  });
}

/* ---------- API for teachers ---------- */
function teacherList() {
  teacher_();
  sheet_('goyux');
  const sh = sheet_('students');
  SpreadsheetApp.flush();
  const n = sh.getLastRow() - 1;
  const students = n < 1 ? [] : sh.getRange(2, 1, n, studentHead_().length).getValues()
    .filter(v => v[C.email])
    .map(v => { const s = rowToStudent_(v); delete s.vocab; delete s.avatar; return s; });
  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { students, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
}
function teacherGrant(emails, amount, reason) {
  const u = teacher_();
  amount = Math.round(Number(amount));
  if (!amount || Math.abs(amount) > 1000) throw new Error('Cantidad no válida.');
  reason = String(reason || '').trim().slice(0, 120) || 'Buen comportamiento en clase';
  const list = (Array.isArray(emails) ? emails : [emails]).map(e => String(e).toLowerCase().trim()).slice(0, 200);
  withLock_(() => {
    const st = sheet_('students'), g = sheet_('goyux');
    const rows = [];
    list.forEach(e => { const r = findStudentRow_(st, e); if (r > 0) rows.push([new Date(), e, st.getRange(r, C.name + 1).getValue(), amount, reason, u.email]); });
    if (rows.length) g.getRange(g.getLastRow() + 1, 1, rows.length, GOYUX_HEAD.length).setValues(rows);
  });
  return teacherList();
}
function teacherRuns(email) {
  teacher_();
  email = String(email || '').toLowerCase().trim();
  const sh = sheet_('runs');
  const n = sh.getLastRow() - 1;
  const runs = n < 1 ? [] : sh.getRange(2, 1, n, RUN_HEAD.length).getValues()
    .filter(v => String(v[1]).toLowerCase().trim() === email)
    .map(v => ({ date: iso_(v[0]), game: String(v[3]), score: Number(v[4]) || 0, stars: Number(v[5]) || 0, budget: Number(v[6]) || 0, moneyLeft: Number(v[7]) || 0, english: Number(v[8]) || 0, manners: Number(v[9]) || 0, minutes: Number(v[10]) || 0 }))
    .reverse().slice(0, 60);
  return { runs, grants: grantsOf_(email, 60) };
}
