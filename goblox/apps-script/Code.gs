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
  XP_PER_LEVEL: 200,
  // true: cada alumno tiene que escribir el código de su clase la primera vez que entra.
  // Así solo juegan tus alumnos aunque el enlace llegue a otros alumnos del instituto.
  REQUIRE_CLASS_CODE: true,
  // GOYUX por dificultad (la puntuación se multiplica por este valor)
  DIFFICULTY: { easy: 0.8, normal: 1, hard: 1.25 }
};
// ========================================

const GAMES = { diner: 'Healthy Bites Diner', mall: 'Back to School Rush' };
const GAME_IDS = Object.keys(GAMES);
const SHEETS = {
  students: 'Alumnos',
  runs: 'Partidas',
  goyux: 'GOYUX',
  guests: 'Invitados',
  classes: 'Clases'
};
const RUN_HEAD = ['Fecha', 'Correo', 'Nombre', 'Juego', 'Puntuación', 'Estrellas', 'Presupuesto ($)', 'Dinero restante ($)', 'Inglés %', 'Modales', 'Duración (min)', 'Errores', 'GOYUX ganados', 'Detalles', 'Código partida', 'Dificultad'];
const GOYUX_HEAD = ['Fecha', 'Correo', 'Nombre', 'Cantidad', 'Motivo', 'Profesor'];
// Invitados: personas sin cuenta del instituto que entran con un código que crea el profesor
const GUEST_HEAD = ['Código', 'Nombre', 'Activo', 'Creado', 'Notas', 'Clase'];
// Clases: cada profesor crea las suyas; los alumnos entran con el código de su clase
const CLASS_HEAD = ['Código', 'Clase', 'Profesor', 'Activa', 'Creada'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Columnas de la hoja Alumnos (0 = columna A)
const C = { email: 0, name: 1, klass: 2, level: 3, plays: 4, xp: 5, granted: 6, nation: 7, total: 8, seen: 9, lastRun: 10, avatar: 11, vocab: 12, stars: 13 };
function studentHead_() {
  return ['Correo', 'Nombre', 'Clase (código)', 'Nivel', 'Partidas', 'GOYUX juego', 'GOYUX profesor', 'GOYUX país (impuestos − gastos)', 'GOYUX total', 'Última conexión', 'Última partida', 'Avatar', 'Vocabulario']
    .concat(GAME_IDS.map(id => 'Estrellas · ' + GAMES[id]));
}

/* ---------- web app ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('GOBLOX')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ---------- helpers ---------- */
/* Who is calling? A school account (or a teacher), or a guest with a valid invite code.
   Errors GUEST_REQUIRED / GUEST_INVALID make the game ask for an invite code. */
function user_(guestCode) {
  let email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim(); } catch (e) {}
  const isTeacher = !!email && CONFIG.TEACHERS.some(t => String(t).toLowerCase().trim() === email);
  if (isTeacher || (email && email.endsWith('@' + CONFIG.DOMAIN))) return { email, isTeacher, guest: false };
  const code = String(guestCode || '').trim().toUpperCase();
  if (!code) throw new Error('GUEST_REQUIRED');
  const g = findGuest_(code);
  if (!g || !g.active) throw new Error('GUEST_INVALID');
  return { email: 'invitado:' + code.toLowerCase(), isTeacher: false, guest: true, name: g.name, klass: g.klass };
}
function teacher_() { const u = user_(); if (!u.isTeacher) throw new Error('Esta función es solo para el profesorado.'); return u; }
function findGuest_(code) {
  const sh = sheet_('guests');
  const n = sh.getLastRow() - 1;
  if (n < 1) return null;
  const v = sh.getRange(2, 1, n, GUEST_HEAD.length).getValues().find(r => String(r[0]).trim().toUpperCase() === code);
  return v ? { code, name: String(v[1] || 'Guest'), active: !/^(no|n|false|0)$/i.test(String(v[2]).trim()), klass: String(v[5] || '').toUpperCase() } : null;
}
const active_ = v => !/^(no|n|false|0)$/i.test(String(v).trim());
function allClasses_() {
  const sh = sheet_('classes'); const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, 1, n, CLASS_HEAD.length).getValues().filter(v => v[0])
    .map(v => ({ code: String(v[0]).trim().toUpperCase(), name: String(v[1] || ''), owner: String(v[2] || '').toLowerCase().trim(), active: active_(v[3]) }));
}
function classMap_() { const m = {}; allClasses_().forEach(c => { m[c.code] = c; }); return m; }
/* A teacher sees the students of their own classes, plus students without a class */
function visibleTo_(teacherEmail, klass, classes) { return !klass || !classes[klass] || classes[klass].owner === teacherEmail; }
function randomCode_(n) { let c = ''; for (let i = 0; i < n; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
function sheet_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = SHEETS[key];
  const head = key === 'students' ? studentHead_() : key === 'runs' ? RUN_HEAD : key === 'guests' ? GUEST_HEAD : key === 'classes' ? CLASS_HEAD : GOYUX_HEAD;
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
  sh.getRange(r, C.level + 1).setFormula('=1+INT(F' + r + '/' + CONFIG.XP_PER_LEVEL + ')');
  sh.getRange(r, C.granted + 1).setFormula('=SUMIF(GOYUX!B:B,A' + r + ',GOYUX!D:D)');
  sh.getRange(r, C.total + 1).setFormula('=F' + r + '+G' + r + '+H' + r);
}
function ensureStudent_(email, name, klass) {
  sheet_('goyux');
  const sh = sheet_('students');
  let r = findStudentRow_(sh, email);
  if (r < 0) {
    const row = studentHead_().map(() => '');
    row[C.email] = email; row[C.name] = name || nameFromEmail_(email); row[C.klass] = klass || ''; row[C.plays] = 0; row[C.xp] = 0; row[C.nation] = 0; row[C.avatar] = '{}'; row[C.vocab] = '[]';
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
    email: String(v[C.email]).toLowerCase(), name: String(v[C.name] || ''), klass: String(v[C.klass] || '').toUpperCase(), level: Number(v[C.level]) || 1, plays: Number(v[C.plays]) || 0,
    xp: Number(v[C.xp]) || 0, granted: Number(v[C.granted]) || 0, nation: Number(v[C.nation]) || 0, total: Number(v[C.total]) || 0,
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
/* Students must join a class with its code (unless REQUIRE_CLASS_CODE is false). Error CLASS_REQUIRED makes the game ask for it. */
function needsClass_(u) {
  if (u.isTeacher || u.guest || !CONFIG.REQUIRE_CLASS_CODE) return false;
  const sh = sheet_('students'); const r = findStudentRow_(sh, u.email);
  if (r < 0) return true;
  const k = String(sh.getRange(r, C.klass + 1).getValue() || '').toUpperCase();
  const c = classMap_()[k];
  return !c;
}
function getMe(guestCode) {
  const u = user_(guestCode);
  return withLock_(() => {
    if (needsClass_(u)) throw new Error('CLASS_REQUIRED');
    const { sh, r } = ensureStudent_(u.email, u.name, u.klass);
    sh.getRange(r, C.seen + 1).setValue(new Date());
    const st = readStudent_(sh, r);
    const c = classMap_()[st.klass];
    return {
      email: u.email, isTeacher: u.isTeacher, guest: u.guest, xpPerLevel: CONFIG.XP_PER_LEVEL, className: c ? c.name : '',
      profile: Object.assign({ name: st.name, plays: st.plays, xp: st.xp, granted: st.granted, nationNet: st.nation, best: st.best, vocab: st.vocab }, cleanAvatar_(st.avatar)),
      grants: grantsOf_(u.email, 8)
    };
  });
}
function joinClass(code, guestCode) {
  const u = user_(guestCode);
  code = String(code || '').trim().toUpperCase();
  const c = classMap_()[code];
  if (!c || !c.active) throw new Error('That class code is not valid. Check it with your teacher.');
  return withLock_(() => {
    const { sh, r } = ensureStudent_(u.email, u.name, code);
    sh.getRange(r, C.klass + 1).setValue(code);
    return { className: c.name };
  });
}
function saveProfile(p, guestCode) {
  const u = user_(guestCode);
  const name = String((p && p.name) || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 20);
  return withLock_(() => {
    const { sh, r } = ensureStudent_(u.email, u.name);
    if (name) sh.getRange(r, C.name + 1).setValue(name);
    sh.getRange(r, C.avatar + 1).setValue(JSON.stringify(cleanAvatar_(p)));
    return true;
  });
}
function saveRun(run, guestCode) {
  const u = user_(guestCode);
  if (!run || !GAMES[run.game]) throw new Error('Partida no válida.');
  const cache = CacheService.getScriptCache();
  const key = 'run:' + u.email;
  if (cache.get(key)) throw new Error('Has guardado una partida hace muy poco. Espera un minuto.');
  const score = clamp_(Math.round(Number(run.score) || 0), 0, 100);
  const stars = score >= 85 ? 3 : score >= 65 ? 2 : 1;
  const secs = clamp_(Math.round(Number(run.seconds) || 0), 0, 36000);
  const diff = CONFIG.DIFFICULTY[run.difficulty] ? run.difficulty : 'normal';
  const earned = secs < CONFIG.MIN_SECONDS_FOR_GOYUX ? 0 : Math.round(score * CONFIG.DIFFICULTY[diff]);
  const mistakes = Array.isArray(run.mistakes) ? run.mistakes.slice(0, 10).map(m => ({ said: String(m.said || '').slice(0, 200), tip: String(m.tip || '').slice(0, 300) })) : [];
  return withLock_(() => {
    if (needsClass_(u)) throw new Error('CLASS_REQUIRED');
    const { sh, r } = ensureStudent_(u.email, u.name, u.klass);
    const st = readStudent_(sh, r);
    const runId = randomCode_(5);
    sheet_('runs').appendRow([
      new Date(), u.email, st.name, GAMES[run.game], score, stars, num_(run.budget), num_(run.moneyLeft),
      clamp_(num_(run.english), 0, 100), clamp_(num_(run.manners), 0, 100), Math.round(secs / 6) / 10, mistakes.length, earned,
      JSON.stringify({ metrics: run.metrics || {}, events: run.events || [], mistakes }).slice(0, 40000), runId, diff
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
    return { xp: after.xp, granted: after.granted, plays: after.plays, best: after.best, vocab: after.vocab, earned, runId };
  });
}

function runsOf_(email, limit) {
  const sh = sheet_('runs');
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, RUN_HEAD.length).getValues()
    .filter(v => String(v[1]).toLowerCase().trim() === email)
    .map(v => ({ date: iso_(v[0]), game: String(v[3]), score: Number(v[4]) || 0, stars: Number(v[5]) || 0, budget: Number(v[6]) || 0, moneyLeft: Number(v[7]) || 0, english: Number(v[8]) || 0, manners: Number(v[9]) || 0, minutes: Number(v[10]) || 0, id: String(v[14] || ''), difficulty: String(v[15] || 'normal') }))
    .reverse().slice(0, limit);
}
/* The student's own recent missions, for the progress card */
function myRuns(guestCode) {
  const u = user_(guestCode);
  return runsOf_(u.email, 8);
}

/* ---------- API for teachers ---------- */
/* Several teachers can share one spreadsheet: each one only sees the students of the classes they created. */
function teacherList() {
  const u = teacher_();
  sheet_('goyux');
  const sh = sheet_('students');
  SpreadsheetApp.flush();
  const classes = classMap_();
  const n = sh.getLastRow() - 1;
  const students = n < 1 ? [] : sh.getRange(2, 1, n, studentHead_().length).getValues()
    .filter(v => v[C.email])
    .map(v => { const s = rowToStudent_(v); delete s.vocab; delete s.avatar; return s; })
    .filter(s => visibleTo_(u.email, s.klass, classes));
  const nations = {}, diplo = diploRows_();
  allNations_().forEach(x => { nations[x.email] = x; });
  students.forEach(s => {
    const x = nations[s.email];
    s.className = classes[s.klass] ? classes[s.klass].name : '';
    s.nationName = x ? x.name : ''; s.nationScore = x ? nStats_(x, treatiesFrom_(diplo, x.email).accepted).score : 0;
  });
  students.sort((a, b) => a.className.localeCompare(b.className, 'es') || a.name.localeCompare(b.name, 'es'));
  const mine = Object.values(classes).filter(c => c.owner === u.email)
    .map(c => Object.assign({}, c, { students: students.filter(s => s.klass === c.code).length }));
  return { students, classes: mine, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
}
function checkVisible_(u, emails) {
  const sh = sheet_('students'), classes = classMap_();
  return emails.filter(e => { const r = findStudentRow_(sh, e); return r > 0 && visibleTo_(u.email, String(sh.getRange(r, C.klass + 1).getValue() || '').toUpperCase(), classes); });
}
function teacherGrant(emails, amount, reason) {
  const u = teacher_();
  amount = Math.round(Number(amount));
  if (!amount || Math.abs(amount) > 1000) throw new Error('Cantidad no válida.');
  reason = String(reason || '').trim().slice(0, 120) || 'Buen comportamiento en clase';
  const list = checkVisible_(u, (Array.isArray(emails) ? emails : [emails]).map(e => String(e).toLowerCase().trim()).slice(0, 300));
  withLock_(() => {
    const st = sheet_('students'), g = sheet_('goyux');
    const rows = [];
    list.forEach(e => { const r = findStudentRow_(st, e); if (r > 0) rows.push([new Date(), e, st.getRange(r, C.name + 1).getValue(), amount, reason, u.email]); });
    if (rows.length) g.getRange(g.getLastRow() + 1, 1, rows.length, GOYUX_HEAD.length).setValues(rows);
  });
  return teacherList();
}
function teacherRuns(email) {
  const u = teacher_();
  email = String(email || '').toLowerCase().trim();
  if (!checkVisible_(u, [email]).length) throw new Error('Este alumno no está en tus clases.');
  return { runs: runsOf_(email, 60), grants: grantsOf_(email, 60) };
}
function teacherCreateClass(name) {
  const u = teacher_();
  name = String(name || '').replace(/[^\p{L}\p{N} .ºª'-]/gu, '').trim().slice(0, 30);
  if (!name) throw new Error('Escribe el nombre de la clase (por ejemplo, 3º ESO B).');
  withLock_(() => {
    const sh = sheet_('classes'), have = classMap_();
    const base = name.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'CLASS';
    let code; do { code = base + '-' + randomCode_(4); } while (have[code]);
    sh.appendRow([code, name, u.email, 'SÍ', new Date()]);
  });
  return teacherList();
}
function teacherSetClass(code, active) {
  const u = teacher_();
  code = String(code || '').trim().toUpperCase();
  withLock_(() => {
    const sh = sheet_('classes'); const n = sh.getLastRow() - 1; if (n < 1) return;
    const vals = sh.getRange(2, 1, n, CLASS_HEAD.length).getValues();
    vals.forEach((v, i) => { if (String(v[0]).trim().toUpperCase() === code && String(v[2]).toLowerCase().trim() === u.email) sh.getRange(i + 2, 4).setValue(active ? 'SÍ' : 'NO'); });
  });
  return teacherList();
}
function teacherMoveStudents(emails, code) {
  const u = teacher_();
  code = String(code || '').trim().toUpperCase();
  const c = classMap_()[code];
  if (code && (!c || c.owner !== u.email)) throw new Error('Esa clase no es tuya.');
  const list = checkVisible_(u, (Array.isArray(emails) ? emails : [emails]).map(e => String(e).toLowerCase().trim()));
  withLock_(() => { const sh = sheet_('students'); list.forEach(e => { const r = findStudentRow_(sh, e); if (r > 0) sh.getRange(r, C.klass + 1).setValue(code); }); });
  return teacherList();
}
function teacherGuests() {
  const u = teacher_();
  const sh = sheet_('guests'); const classes = classMap_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, GUEST_HEAD.length).getValues().filter(v => v[0])
    .map(v => ({ code: String(v[0]), name: String(v[1] || ''), active: active_(v[2]), created: iso_(v[3]), klass: String(v[5] || '').toUpperCase() }))
    .filter(g => visibleTo_(u.email, g.klass, classes))
    .map(g => Object.assign(g, { className: classes[g.klass] ? classes[g.klass].name : '' }));
}
function teacherCreateGuest(name, klass) {
  const u = teacher_();
  name = String(name || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 30);
  if (!name) throw new Error('Escribe el nombre del invitado.');
  klass = String(klass || '').trim().toUpperCase();
  const c = classMap_()[klass];
  if (klass && (!c || c.owner !== u.email)) throw new Error('Esa clase no es tuya.');
  withLock_(() => {
    const sh = sheet_('guests');
    let code;
    do { code = (name.split(' ')[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'GUEST') + '-' + randomCode_(4); } while (findGuest_(code));
    sh.appendRow([code, name, 'SÍ', new Date(), '', klass]);
  });
  return teacherGuests();
}
function teacherSetGuest(code, active) {
  teacher_();
  code = String(code || '').trim().toUpperCase();
  withLock_(() => {
    const sh = sheet_('guests');
    const n = sh.getLastRow() - 1;
    if (n < 1) return;
    const vals = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < n; i++) if (String(vals[i][0]).trim().toUpperCase() === code) sh.getRange(i + 2, 3).setValue(active ? 'SÍ' : 'NO');
  });
  return teacherGuests();
}

/* =====================================================================
   MY NATION — every student founds and builds an English-speaking country.
   The rules below must match NATION_RULES in index.html.
   ===================================================================== */
const N_SIZE = 7, N_CAPITAL = 24, N_START = [17, 23, 24, 25, 31];
// id: [cost, population, happiness, economy, security, culture, environment]
const BUILD = {
  cityhall: [0, 0, 5, 5, 5, 0, 0], houses: [12, 40, 2, 0, 0, 0, -2], farm: [15, 10, 2, 6, 0, 0, 2], park: [10, 0, 6, 0, 0, 0, 8],
  market: [25, 5, 5, 9, 0, 0, 0], school: [25, 5, 4, 4, 0, 8, 0], police: [25, 0, 3, 0, 12, 0, 0], factory: [30, 0, -3, 16, 0, 0, -10],
  windfarm: [30, 0, 0, 8, 0, 0, 6], museum: [30, 0, 4, 3, 0, 12, 0], press: [30, 0, 3, 2, 0, 8, 0], embassy: [30, 0, 2, 2, 2, 4, 0],
  hospital: [35, 25, 10, 0, 0, 0, 0], army: [35, 0, -2, 0, 18, 0, -2], parliament: [40, 0, 6, 4, 6, 4, 0], port: [40, 10, 0, 14, 0, 2, -4],
  stadium: [40, 0, 12, 4, 0, 4, -2], airport: [50, 15, 2, 12, 0, 4, -6],
  bigben: [60, 0, 6, 6, 0, 20, 0], castle: [60, 0, 6, 4, 6, 16, 0], cntower: [60, 0, 4, 8, 0, 18, 0], liberty: [70, 0, 8, 6, 0, 22, 0], opera: [70, 0, 8, 6, 0, 22, 0]
};
const UNIQUE = ['cityhall', 'parliament', 'embassy', 'port', 'stadium', 'airport', 'bigben', 'castle', 'cntower', 'liberty', 'opera'];
// treaty type: [population, happiness, economy, security, culture, environment] — max 3 of each type count
const TREATY = { trade: [0, 0, 6, 0, 0, 0], culture: [0, 0, 0, 0, 6, 0], peace: [0, 4, 0, 4, 0, 0] };
const N_KEYS = ['pop', 'happy', 'econ', 'secu', 'cult', 'env'];
function nStats_(n, treaties) {
  const s = { pop: 50, happy: 50, econ: 20, secu: 20, cult: 10, env: 60 };
  Object.values(n.buildings || {}).forEach(id => { const b = BUILD[id]; if (b) N_KEYS.forEach((k, i) => { s[k] += b[i + 1]; }); });
  const per = {};
  (treaties || []).forEach(t => { per[t] = (per[t] || 0) + 1; if (per[t] <= 3 && TREATY[t]) N_KEYS.forEach((k, i) => { s[k] += TREATY[t][i]; }); });
  s.happy = clamp_(s.happy, 0, 100); s.env = clamp_(s.env, 0, 100);
  s.score = Math.round(s.pop / 5 + s.happy + s.econ + s.secu + s.cult + s.env + Object.keys(n.buildings || {}).length * 5);
  return s;
}
const plotPrice_ = owned => 10 + 3 * Math.max(0, owned - N_START.length);
const taxAmount_ = st => Math.min(12, 3 + Math.floor(Math.max(0, st.econ) / 15));
function adjacent_(i, plots) {
  const r = Math.floor(i / N_SIZE), c = i % N_SIZE;
  return plots.some(p => Math.abs(Math.floor(p / N_SIZE) - r) + Math.abs(p % N_SIZE - c) === 1);
}
const NATION_HEAD = ['Correo', 'Presidente', 'País', 'Capital', 'Lema', 'Bandera', 'Terrenos', 'Edificios', 'GOYUX gastados', 'Impuestos cobrados', 'Último impuesto', 'Población', 'Felicidad', 'Economía', 'Seguridad', 'Cultura', 'Medio ambiente', 'Puntuación', 'Actualizado'];
const DIPLO_HEAD = ['ID', 'Fecha', 'De', 'País origen', 'Para', 'País destino', 'Tipo', 'Estado', 'Carta', 'Respuesta', 'Fecha respuesta'];
function nSheet_(which) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = which === 'n' ? 'Países' : 'Diplomacia', head = which === 'n' ? NATION_HEAD : DIPLO_HEAD;
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) { sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1b5e20').setFontColor('#ffffff'); sh.setFrozenRows(1); }
  return sh;
}
function rowToNation_(v) {
  return { email: String(v[0]).toLowerCase(), leader: String(v[1] || ''), name: String(v[2] || ''), capital: String(v[3] || ''), motto: String(v[4] || ''),
    flag: parse_(v[5], {}), plots: parse_(v[6], []), buildings: parse_(v[7], {}), spent: Number(v[8]) || 0, income: Number(v[9]) || 0, lastTax: String(v[10] || '') };
}
function allNations_() {
  const sh = nSheet_('n'); const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, 1, n, NATION_HEAD.length).getValues().filter(v => v[0]).map(rowToNation_);
}
function nationRow_(email) {
  const sh = nSheet_('n'); const n = sh.getLastRow() - 1;
  if (n < 1) return { sh, r: -1 };
  const vals = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(vals[i][0]).toLowerCase().trim() === email) return { sh, r: i + 2 };
  return { sh, r: -1 };
}
function getNation_(email) { const { sh, r } = nationRow_(email); return r < 0 ? null : rowToNation_(sh.getRange(r, 1, 1, NATION_HEAD.length).getValues()[0]); }
function saveNation_(n) {
  const { sh, r } = nationRow_(n.email);
  const st = nStats_(n, treatiesOf_(n.email).accepted);
  const row = [n.email, n.leader, n.name, n.capital, n.motto, JSON.stringify(n.flag), JSON.stringify(n.plots), JSON.stringify(n.buildings), n.spent, n.income, n.lastTax,
    st.pop, st.happy, st.econ, st.secu, st.cult, st.env, st.score, new Date()];
  if (r < 0) sh.appendRow(row); else sh.getRange(r, 1, 1, row.length).setValues([row]);
  const s = ensureStudent_(n.email);
  s.sh.getRange(s.r, C.nation + 1).setValue(n.income - n.spent);
}
function diploRows_() { const sh = nSheet_('d'); const n = sh.getLastRow() - 1; return n < 1 ? [] : sh.getRange(2, 1, n, DIPLO_HEAD.length).getValues(); }
function treatiesOf_(email) { return treatiesFrom_(diploRows_(), email); }
function treatiesFrom_(rows, email) {
  const out = { accepted: [], acceptedList: [], inbox: [], sent: [] };
  rows.forEach(v => {
    const t = { id: String(v[0]), date: iso_(v[1]), from: String(v[2]).toLowerCase(), fromName: String(v[3]), to: String(v[4]).toLowerCase(), toName: String(v[5]), type: String(v[6]), status: String(v[7]), letter: String(v[8] || ''), reply: String(v[9] || '') };
    if (t.from !== email && t.to !== email) return;
    if (t.status === 'accepted') { out.accepted.push(t.type); out.acceptedList.push(t); }
    else if (t.status === 'pending') (t.to === email ? out.inbox : out.sent).push(t);
  });
  return out;
}
function available_(email, n) {
  const { sh, r } = ensureStudent_(email);
  const st = readStudent_(sh, r);
  return st.xp + st.granted + (n ? n.income - n.spent : 0);
}
function today_() { return Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'); }
function nationState_(email) {
  const n = getNation_(email);
  const tr = treatiesOf_(email);
  const stats = n ? nStats_(n, tr.accepted) : null;
  const { sh, r } = ensureStudent_(email);
  const st = readStudent_(sh, r);
  return {
    nation: n, stats, treaties: tr.acceptedList, inbox: tr.inbox, sent: tr.sent,
    goyux: { xp: st.xp, granted: st.granted, nationNet: n ? n.income - n.spent : 0, total: st.xp + st.granted + (n ? n.income - n.spent : 0) },
    taxReady: !!n && n.lastTax !== today_(), taxAmount: stats ? taxAmount_(stats) : 0
  };
}
function cleanText_(t, max) { return String(t || '').replace(/[^\p{L}\p{N} .,'!?&-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max); }

/* nations only meet the nations of their own class (teachers see all their classes) */
function studentClasses_() {
  const sh = sheet_('students'); const n = sh.getLastRow() - 1; const m = {};
  if (n > 0) sh.getRange(2, 1, n, C.klass + 1).getValues().forEach(v => { m[String(v[0]).toLowerCase().trim()] = String(v[C.klass] || '').toUpperCase(); });
  return m;
}
function sameWorld_(u, otherEmail, kl, classes) {
  if (u.isTeacher) return visibleTo_(u.email, kl[otherEmail], classes);
  return (kl[u.email] || '') === (kl[otherEmail] || '');
}
function nationGet(guestCode) { const u = user_(guestCode); return withLock_(() => { if (needsClass_(u)) throw new Error('CLASS_REQUIRED'); ensureStudent_(u.email, u.name, u.klass); return nationState_(u.email); }); }
function nationFound(d, guestCode) {
  const u = user_(guestCode);
  const name = cleanText_(d && d.name, 24), capital = cleanText_(d && d.capital, 24), motto = cleanText_(d && d.motto, 60);
  if (name.length < 2 || capital.length < 2) throw new Error('Your nation and your capital need a name.');
  const ok = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const f = (d && d.flag) || {};
  const flag = { c: (Array.isArray(f.c) ? f.c : []).filter(ok).slice(0, 3), layout: ['h', 'v', 'cross'].includes(f.layout) ? f.layout : 'h' };
  if (flag.c.length < 2) flag.c = ['#1d3fbf', '#ffffff', '#c62828'];
  return withLock_(() => {
    if (needsClass_(u)) throw new Error('CLASS_REQUIRED');
    if (getNation_(u.email)) throw new Error('You have already founded a nation.');
    const es = ensureStudent_(u.email, u.name, u.klass);
    const st = readStudent_(es.sh, es.r);
    saveNation_({ email: u.email, leader: st.name, name, capital, motto, flag, plots: N_START.slice(), buildings: { [N_CAPITAL]: 'cityhall' }, spent: 0, income: 0, lastTax: '' });
    return nationState_(u.email);
  });
}
function nationBuyPlot(i, guestCode) {
  const u = user_(guestCode);
  i = Math.round(Number(i));
  return withLock_(() => {
    const n = getNation_(u.email); if (!n) throw new Error('Found your nation first.');
    if (!(i >= 0 && i < N_SIZE * N_SIZE) || n.plots.includes(i)) throw new Error('You cannot buy that land.');
    if (!adjacent_(i, n.plots)) throw new Error('You can only buy land next to your country.');
    const price = plotPrice_(n.plots.length);
    if (available_(u.email, n) < price) throw new Error('You need ' + price + ' GOYUX to buy this land.');
    n.plots.push(i); n.spent += price; saveNation_(n);
    return nationState_(u.email);
  });
}
function nationBuild(i, id, guestCode) {
  const u = user_(guestCode);
  i = Math.round(Number(i)); id = String(id || '');
  return withLock_(() => {
    const n = getNation_(u.email); if (!n) throw new Error('Found your nation first.');
    const b = BUILD[id];
    if (!b || id === 'cityhall') throw new Error('Unknown building.');
    if (!n.plots.includes(i) || n.buildings[i]) throw new Error('You cannot build there.');
    if (UNIQUE.includes(id) && Object.values(n.buildings).includes(id)) throw new Error('Your nation already has one.');
    if (available_(u.email, n) < b[0]) throw new Error('You need ' + b[0] + ' GOYUX for this building.');
    n.buildings[i] = id; n.spent += b[0]; saveNation_(n);
    return nationState_(u.email);
  });
}
function nationTax(correct, guestCode) {
  const u = user_(guestCode);
  return withLock_(() => {
    const n = getNation_(u.email); if (!n) throw new Error('Found your nation first.');
    if (n.lastTax === today_()) throw new Error('You have already collected taxes today. Come back tomorrow!');
    if (correct === true) { n.income += taxAmount_(nStats_(n, treatiesOf_(u.email).accepted)); n.lastTax = today_(); saveNation_(n); }
    return nationState_(u.email);
  });
}
function nationWorld(guestCode) {
  const u = user_(guestCode);
  const kl = studentClasses_(), classes = classMap_(), diplo = diploRows_();
  return allNations_().filter(n => n.email === u.email || sameWorld_(u, n.email, kl, classes)).map(n => {
    const tr = treatiesFrom_(diplo, n.email).accepted;
    const st = nStats_(n, tr);
    return { email: n.email, leader: n.leader, name: n.name, capital: n.capital, motto: n.motto, flag: n.flag, score: st.score, pop: st.pop, buildings: Object.keys(n.buildings).length, embassy: Object.values(n.buildings).includes('embassy'), me: n.email === u.email };
  }).sort((a, b) => b.score - a.score);
}
function nationVisit(email, guestCode) {
  const u = user_(guestCode);
  const n = getNation_(String(email || '').toLowerCase().trim());
  if (!n || !sameWorld_(u, n.email, studentClasses_(), classMap_())) throw new Error('That nation does not exist.');
  const tr = treatiesOf_(n.email).accepted;
  return { nation: { leader: n.leader, name: n.name, capital: n.capital, motto: n.motto, flag: n.flag, plots: n.plots, buildings: n.buildings }, stats: nStats_(n, tr) };
}
function nationSendTreaty(to, type, letter, guestCode) {
  const u = user_(guestCode);
  to = String(to || '').toLowerCase().trim();
  if (!TREATY[type]) throw new Error('Unknown treaty.');
  return withLock_(() => {
    const me = getNation_(u.email), them = getNation_(to);
    if (!me || !them || to === u.email || !sameWorld_(u, to, studentClasses_(), classMap_())) throw new Error('You cannot send a letter to that nation.');
    if (!Object.values(me.buildings).includes('embassy')) throw new Error('Build an embassy first.');
    const sh = nSheet_('d'); const n = sh.getLastRow() - 1;
    const rows = n < 1 ? [] : sh.getRange(2, 1, n, DIPLO_HEAD.length).getValues();
    const pair = v => ((String(v[2]).toLowerCase() === u.email && String(v[4]).toLowerCase() === to) || (String(v[2]).toLowerCase() === to && String(v[4]).toLowerCase() === u.email)) && String(v[6]) === type;
    if (rows.some(v => pair(v) && ['pending', 'accepted'].includes(String(v[7])))) throw new Error('You already have this kind of treaty (or a letter waiting) with that nation.');
    if (rows.filter(v => String(v[2]).toLowerCase() === u.email && String(v[7]) === 'pending').length >= 5) throw new Error('Wait for answers to your letters before sending more.');
    sh.appendRow([randomCode_(6), new Date(), u.email, me.name, to, them.name, type, 'pending', String(letter || '').slice(0, 1500), '', '']);
    return nationState_(u.email);
  });
}
function nationAnswerTreaty(id, accept, reply, guestCode) {
  const u = user_(guestCode);
  return withLock_(() => {
    const sh = nSheet_('d'); const n = sh.getLastRow() - 1;
    if (n < 1) throw new Error('Letter not found.');
    const vals = sh.getRange(2, 1, n, DIPLO_HEAD.length).getValues();
    const i = vals.findIndex(v => String(v[0]) === String(id));
    if (i < 0 || String(vals[i][4]).toLowerCase() !== u.email || String(vals[i][7]) !== 'pending') throw new Error('Letter not found.');
    sh.getRange(i + 2, 8, 1, 4).setValues([[accept ? 'accepted' : 'declined', vals[i][8], String(reply || '').slice(0, 1500), new Date()]]);
    [u.email, String(vals[i][2]).toLowerCase()].forEach(e => { const nn = getNation_(e); if (nn) saveNation_(nn); });
    return nationState_(u.email);
  });
}
