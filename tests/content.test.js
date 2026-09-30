/* Comprueba el contenido de cada módulo y nivel:
   - 10 ejercicios por nivel, 4 opciones distintas en el nivel 1
   - reparto de tipos de frase en CADA lista de 10:
     5 afirmativas (50 %), 3 preguntas (30 %), 2 negativas (20 %)
   Ejecutar:  node tests/content.test.js */
"use strict";
const { load } = require("./load.js");
const T = load();

function kind(s) {
  s = s.trim();
  if (/\?$/.test(s)) return "Q";
  if (/\b(not|never)\b|n't\b/i.test(s)) return "N";
  return "A";
}
function sentenceOf(q) {
  if (q.type === "mcq") {
    const ans = q.options[0];
    return /_{3,}/.test(q.text) ? q.text.replace(/_{3,}/, ans) : ans;
  }
  if (q.type === "gap") {
    let t = q.text.split("→").pop();
    const sets = Array.isArray(q.answers[0]) ? q.answers : [q.answers];
    let i = 0;
    return t.replace(/_{3,}/g, () => sets[i++][0]);
  }
  return q.answers[0];
}

let fails = 0;
const log = [];
console.log("módulo".padEnd(14) + "| afirm. | preg. | neg.");
T.MODULES.forEach(m => {
  if (m.questions.length !== 10) { fails++; log.push(m.id + ": " + m.questions.length + " ejercicios"); }
  const c = { A: 0, Q: 0, N: 0 };
  m.questions.forEach(q => {
    c[kind(sentenceOf(q))]++;
    if (q.type === "mcq" && (q.options.length !== 4 || new Set(q.options).size !== 4)) { fails++; log.push(q.qid + ": opciones"); }
    if (q.type === "gap") {
      const n = (q.text.match(/_{3,}/g) || []).length;
      const sets = Array.isArray(q.answers[0]) ? q.answers.length : 1;
      if (n !== sets) { fails++; log.push(q.qid + ": huecos " + n + " / respuestas " + sets); }
    }
  });
  console.log(m.id.padEnd(14) + "| " + String(c.A).padEnd(7) + "| " + String(c.Q).padEnd(6) + "| " + c.N);
  if (c.A !== 5 || c.Q !== 3 || c.N !== 2) { fails++; log.push(m.id + ": reparto " + JSON.stringify(c) + " (deben ser 5/3/2)"); }
});
if (fails) { console.log("\n" + fails + " FALLOS:\n  " + log.join("\n  ")); process.exit(1); }
console.log("\nTODO OK ✔  (50 % afirmativas · 30 % preguntas · 20 % negativas en cada lista)");
