/* Prueba la corrección REAL de index.html (script id="core"). Uso: node tests/grading.test.js */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(core + "\nthis.api = { VERBS, TESTS, gradeQuestion, solutionValues };", ctx);
const { VERBS, TESTS, gradeQuestion, solutionValues } = ctx.api;
const v = inf => VERBS.find(x => x.inf === inf);
const ok = (mode, inf, vals) => gradeQuestion(mode, v(inf), vals);

assert.strictEqual(VERBS.length, 41);
assert.strictEqual(TESTS.length, 4);

// La solución modelo siempre es correcta, en los dos modos, y también en mayúsculas
VERBS.forEach(x => ["es2de", "de2es"].forEach(m => {
  const sol = solutionValues(m, x);
  assert.ok(gradeQuestion(m, x, sol).ok, `${m} ${x.inf}: ${sol}`);
  if (!sol.join("").includes("ß")) assert.ok(gradeQuestion(m, x, sol.map(s => s.toUpperCase())).ok, `${m} ${x.inf} mayúsculas`);
}));

// Auxiliar
assert.ok(ok("de2es", "fahren", ["fuhr", "ist", "gefahren", "conducir"]).ok);
assert.ok(ok("de2es", "fahren", ["fuhr", "hat", "gefahren", "conducir"]).ok);
assert.ok(!ok("de2es", "bleiben", ["blieb", "hat", "geblieben", "quedarse"]).ok);
assert.deepStrictEqual(Array.from(ok("de2es", "bleiben", ["blieb", "hat", "geblieben", "quedarse"]).parts), [true, false, true, true]);
assert.ok(ok("de2es", "bleiben", ["er blieb", "ist", "ist geblieben", "Quedarse."]).ok);
// Separables y reflexivos
assert.ok(!ok("es2de", "abheben", ["abheben", "hob", "hat", "abgehoben"]).ok);
assert.ok(ok("es2de", "sich bewerben", ["bewerben", "bewarb", "hat", "beworben"]).ok);
assert.ok(ok("es2de", "sich bewerben", ["sich bewerben", "bewarb sich", "hat sich", "sich beworben"]).ok);
assert.ok(ok("de2es", "(sich) entscheiden", ["entschied sich", "hat", "entschieden", "decidirse"]).ok);
assert.ok(ok("es2de", "stehen bleiben", ["stehenbleiben", "blieb stehen", "ist", "stehengeblieben"]).ok);
// Umlaut / ß obligatorios
assert.ok(!ok("es2de", "essen", ["essen", "ass", "hat", "gegessen"]).ok);
assert.ok(ok("es2de", "essen", ["essen", "aß", "hat", "gegessen"]).ok);
// Sinónimos alemanes con el mismo español
assert.ok(ok("es2de", "beginnen", ["anfangen", "fing an", "hat", "angefangen"]).ok);
assert.ok(!ok("es2de", "beginnen", ["anfangen", "begann", "hat", "begonnen"]).ok);
assert.ok(ok("es2de", "abfahren", ["losfahren", "fuhr los", "ist", "losgefahren"]).ok);
// Español: tildes, varias traducciones, paréntesis
assert.ok(ok("de2es", "anrufen", ["rief an", "hat", "angerufen", "llamar por telefono"]).ok);
assert.ok(ok("de2es", "beweisen", ["bewies", "hat", "bewiesen", "demostrar, probar"]).ok);
assert.ok(ok("de2es", "verbringen", ["verbrachte", "hat", "verbracht", "pasar (tiempo)"]).ok);
assert.ok(ok("de2es", "auffallen", ["fiel auf", "ist", "aufgefallen", "llamar la atención"]).ok);
assert.ok(!ok("de2es", "essen", ["aß", "hat", "gegessen", "comer, beber"]).ok);
assert.ok(!ok("de2es", "essen", ["aß", "hat", "gegessen", ""]).ok);
console.log("OK · todas las pruebas de corrección pasan");
