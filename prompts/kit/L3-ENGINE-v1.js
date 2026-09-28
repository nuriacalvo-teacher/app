    /* ===== L3-ENGINE v1 · START (motor común de corrección del Level 3: copiar igual en todas las apps) =====
       Cómo corrige:
       1. Las respuestas aceptadas de cada pregunta (plantillas "pat" + "en" + "alts") se expanden
          UNA vez, la primera vez que se corrige esa pregunta, a un Set de frases canónicas (q.accepted,
          no enumerable: nunca se guarda ni se envía).
       2. La respuesta del alumno se normaliza: mayúsculas, signos (se cambian por espacio), apóstrofos,
          cifras/letras, horas, o'clock y ortografía británica/americana.
       3. Las contracciones del alumno (con o sin apóstrofo) se leen de todas las maneras posibles
          ('s = is / has / posesivo; 'd = would / had; were = were / we are; its = its / it is...).
          Es correcta si ALGUNA lectura coincide EXACTAMENTE, en el mismo orden, con una frase aceptada.
          No hay bolsa de palabras: el orden cuenta. Solo se mueve lo que la plantilla deja mover.
       ======================================================================================= */
    const L3 = (function () {
      const MAX_VARIANTS = 5000;
      const INVALID = "\u0000";
      const cfg = () => (typeof L3_CONFIG !== "undefined" ? L3_CONFIG : { syn: {}, slots: {} });

      /* Grupos de sinónimos comunes a todas las apps (@nombre en las plantillas) */
      const SYN = {
        mobile: "(mobile|mobile phone|phone|cell phone|cellphone|smartphone)",
        mother: "(mother|mum|mummy)",                 // mom / mommy: ya las iguala la ortografía
        father: "(father|dad|daddy)",
        film: "(film|movie)",
        tv: "(television|tv|telly)",
        flat: "(flat|apartment)",
        series: "(series|show|tv series|tv show)",
        dinner: "(dinner|supper)",
        halfhour: "(half an hour|a half hour|thirty minutes)",   // 30 minutes: ya lo igualan los números
        weekends: "(at weekends|on weekends|at the weekend|on the weekend|on the weekends)",
        holiday: "(holiday|holidays|vacation)",
        grandparents: "(grandparents|grandmother and grandfather|grandfather and grandmother|grandma and grandpa|grandpa and grandma)"
      };

      /* Ortografía británica / americana y formas dobles de verbos irregulares:
         cada palabra se reduce a la primera forma del grupo (en los dos lados). */
      const SPELL_GROUPS = [
        ["mum", "mom"], ["mummy", "mommy"], ["maths", "math"], ["grey", "gray"], ["ok", "okay"],
        ["colour", "color"], ["colours", "colors"], ["favourite", "favorite"], ["favourites", "favorites"],
        ["honour", "honor"], ["neighbour", "neighbor"], ["neighbours", "neighbors"], ["flavour", "flavor"],
        ["behaviour", "behavior"], ["humour", "humor"], ["labour", "labor"], ["harbour", "harbor"],
        ["centre", "center"], ["centres", "centers"], ["theatre", "theater"], ["theatres", "theaters"],
        ["metre", "meter"], ["metres", "meters"], ["litre", "liter"], ["litres", "liters"],
        ["kilometre", "kilometer"], ["kilometres", "kilometers"], ["fibre", "fiber"],
        ["programme", "program"], ["programmes", "programs"], ["catalogue", "catalog"], ["dialogue", "dialog"],
        ["cheque", "check"], ["tyre", "tire"], ["tyres", "tires"], ["aeroplane", "airplane"], ["jewellery", "jewelry"],
        ["pyjamas", "pajamas"], ["defence", "defense"], ["licence", "license"], ["practise", "practice"],
        ["practising", "practicing"], ["practised", "practiced"], ["cosy", "cozy"], ["ageing", "aging"],
        ["judgement", "judgment"], ["towards", "toward"], ["whilst", "while"], ["amongst", "among"],
        ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"], ["travellers", "travelers"],
        ["cancelled", "canceled"], ["cancelling", "canceling"], ["modelling", "modeling"], ["labelled", "labeled"],
        ["fuelled", "fueled"], ["counselling", "counseling"], ["enrol", "enroll"], ["fulfil", "fulfill"],
        ["learnt", "learned"], ["dreamt", "dreamed"], ["burnt", "burned"], ["spelt", "spelled"],
        ["smelt", "smelled"], ["leant", "leaned"], ["spoilt", "spoiled"], ["knelt", "kneeled"], ["spilt", "spilled"],
        ["realise", "realize"], ["realised", "realized"], ["realising", "realizing"],
        ["organise", "organize"], ["organised", "organized"], ["organising", "organizing"],
        ["recognise", "recognize"], ["recognised", "recognized"], ["apologise", "apologize"], ["apologised", "apologized"],
        ["specialise", "specialize"], ["memorise", "memorize"], ["analyse", "analyze"], ["analysed", "analyzed"],
        ["criticise", "criticize"], ["summarise", "summarize"], ["emphasise", "emphasize"], ["finalise", "finalize"]
      ];
      const SPELL = {};
      SPELL_GROUPS.forEach(g => g.slice(1).forEach(w => { SPELL[w] = [g[0]]; }));
      SPELL.cannot = ["can", "not"];

      /* ---------- 1. normalizador de texto ---------- */
      function prep(str) {
        let s = String(str == null ? "" : str);
        s = s.replace(/\s*[º°˚]\s*c\b/gi, " degrees celsius ").replace(/[º°˚]/g, " degrees ");
        s = s.replace(/[‘’‛ʼʹ`´′]/g, "'");   // antes de NFKC (NFKC rompe el ´)
        s = s.normalize("NFKC").toLowerCase();
        s = s.replace(/\bo\s*'?\s*clock\b/g, " ");                           // o'clock / oclock / o clock: opcional
        s = s.replace(/\b(\d{1,2})[:.]00\b/g, "$1").replace(/\b(\d{1,2})[:.](\d{2})\b/g, "$1 $2");
        s = s.replace(/\b(\d{1,2})(am|pm)\b/g, "$1 $2");
        s = s.replace(/[^\p{L}\p{N}']+/gu, " ");                             // TODO signo -> espacio
        s = s.replace(/(^|\s)'+/g, "$1").replace(/'+(?=\s|$)/g, "");          // comillas simples sueltas
        return s.replace(/\s+/g, " ").trim();
      }

      /* ---------- 2. números: cifras y letras valen igual ---------- */
      const UNITS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
      const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
      const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
        tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
        seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30 };
      function numWord(w) {
        const u = UNITS.indexOf(w);
        if (u >= 0) return { v: u, k: u < 10 ? "small" : "teen" };
        if (TENS[w] !== undefined) return { v: TENS[w], k: "tens" };
        return null;
      }
      function canonNumbers(toks) {
        const out = [], simple = [];   // simple = número de 10-99 dicho con letras (para años: twenty twenty)
        let i = 0;
        while (i < toks.length) {
          const t = toks[i];
          let m = /^(\d+)(st|nd|rd|th)$/.exec(t);
          if (m) { out.push("#" + parseInt(m[1], 10)); simple.push(false); i++; continue; }
          if (TENS[t] !== undefined && ORD[toks[i + 1]] !== undefined && ORD[toks[i + 1]] < 10) {
            out.push("#" + (TENS[t] + ORD[toks[i + 1]])); simple.push(false); i += 2; continue;
          }
          if (ORD[t] !== undefined) { out.push("#" + ORD[t]); simple.push(false); i++; continue; }
          if (/^\d{1,6}$/.test(t)) { out.push(String(parseInt(t, 10))); simple.push(false); i++; continue; }
          let j = i, total = 0, cur = 0, last = "", used = false, big = false;
          if (toks[j] === "a" && (toks[j + 1] === "hundred" || toks[j + 1] === "thousand")) { j++; last = "a"; }
          while (j < toks.length) {
            const w = toks[j], n = numWord(w);
            if (n) {
              const okPrev = n.k === "small" ? ["", "tens", "hundred", "thousand"] : ["", "hundred", "thousand"];
              if (okPrev.indexOf(last) < 0) break;
              cur += n.v; last = n.k; used = true; j++; continue;
            }
            if (w === "hundred" && (last === "small" || last === "teen" || last === "a")) { cur = (cur || 1) * 100; last = "hundred"; used = big = true; j++; continue; }
            if (w === "thousand" && ["small", "teen", "tens", "hundred", "a"].indexOf(last) >= 0) { total += (cur || 1) * 1000; cur = 0; last = "thousand"; used = big = true; j++; continue; }
            if (w === "and" && (last === "hundred" || last === "thousand") && numWord(toks[j + 1] || "")) { j++; continue; }
            break;
          }
          if (used) {
            const v = total + cur;
            out.push(String(v)); simple.push(!big && v >= 10 && v <= 99); i = j; continue;
          }
          out.push(t); simple.push(false); i++;
        }
        // años dichos por pares: "twenty twenty" = 2020, "nineteen ninety nine" = 1999
        const res = [];
        for (let k = 0; k < out.length; k++) {
          if (simple[k] && simple[k + 1] && (out[k] === "19" || out[k] === "20")) { res.push(String(+out[k] * 100 + +out[k + 1])); k++; }
          else res.push(out[k]);
        }
        return res;
      }

      /* texto -> fichas canónicas (sin resolver aún las contracciones) */
      function baseTokens(str) {
        const s = prep(str);
        if (!s) return [];
        let toks = canonNumbers(s.split(" "));
        const out = [];
        for (let i = 0; i < toks.length; i++) {
          const t = toks[i], prev = out[out.length - 1];
          const isNum = prev !== undefined && /^\d+$/.test(prev);
          if (isNum && (t === "am" || t === "pm")) continue;                                  // 7 am = 7
          if (isNum && (t === "a" || t === "p") && toks[i + 1] === "m") { i++; continue; }    // 7 a.m. = 7
          (SPELL[t] || [t]).forEach(x => out.push(x));
        }
        return out;
      }

      /* ---------- 3. contracciones ---------- */
      const NEG_BASE = { do: "do", does: "does", did: "did", is: "is", are: "are", was: "was", were: "were",
        have: "have", has: "has", had: "had", could: "could", should: "should", would: "would", must: "must",
        need: "need", might: "might", ca: "can", wo: "will", sha: "shall", dare: "dare", ought: "ought" };
      const PRON = new Set(["i", "you", "he", "she", "it", "we", "they", "that", "this", "there", "here", "what",
        "who", "where", "when", "why", "how", "let", "everyone", "everybody", "nobody", "someone", "somebody"]);
      const ADV = new Set(["never", "just", "already", "ever", "always", "still", "not", "recently", "also", "often",
        "only", "really", "finally", "usually", "sometimes", "certainly", "probably", "all"]);
      const PP = new Set(("been got gone done seen eaten taken given written known lost left made had bought found told said " +
        "come become run won begun ridden driven broken spoken forgotten chosen fallen flown grown drawn shown thrown worn " +
        "sung swum drunk heard met sent spent slept kept felt taught thought brought caught fought sold built learnt dreamt " +
        "burnt put cut hit set shut hurt cost understood stood sat held paid meant stolen woken hidden bitten beaten shaken " +
        "frozen forgiven lent lit fed led read rung sunk sworn torn woken wound gotten").split(" "));
      const ED_ADJ = new Set(["tired", "bored", "interested", "excited", "married", "worried", "surprised", "closed",
        "called", "located", "scared", "pleased", "disappointed", "annoyed", "embarrassed", "amazed", "confused", "retired"]);
      function nextWord(rest) { let k = 0; while (k < rest.length && ADV.has(rest[k])) k++; return rest[k] || ""; }
      function looksPP(w) { return w === "better" || PP.has(w) || (/ed$/.test(w) && !ED_ADJ.has(w)); }

      // Formas sin apóstrofo. Las que son palabras inglesas reales llevan primero su lectura literal.
      const NOAPOS = {};
      const addNA = (w, list) => { NOAPOS[w] = list.map(x => x.split(" ")); };
      [["im", "i am"], ["ive", "i have"], ["youre", "you are"], ["youve", "you have"], ["youll", "you will"],
       ["weve", "we have"], ["theyre", "they are"], ["theyve", "they have"], ["theyll", "they will"],
       ["itll", "it will"], ["thatll", "that will"], ["therell", "there will"], ["therere", "there are"],
       ["whatre", "what are"], ["whore", "who are"], ["heres", "here is"], ["whens", "when is"], ["whys", "why is"],
       ["couldve", "could have"], ["shouldve", "should have"], ["wouldve", "would have"], ["mightve", "might have"],
       ["mustve", "must have"], ["whove", "who have"], ["cant", "cant|can not"], ["wont", "wont|will not"],
       ["dont", "do not"], ["doesnt", "does not"], ["didnt", "did not"], ["isnt", "is not"], ["arent", "are not"],
       ["wasnt", "was not"], ["werent", "were not"], ["havent", "have not"], ["hasnt", "has not"], ["hadnt", "had not"],
       ["couldnt", "could not"], ["shouldnt", "should not"], ["wouldnt", "would not"], ["mustnt", "must not"],
       ["neednt", "need not"], ["mightnt", "might not"], ["shant", "shall not"],
       ["ill", "ill|i will"], ["well", "well|we will"], ["hell", "hell|he will"], ["shell", "shell|she will"],
       ["were", "were|we are"], ["its", "its|it is|it has"], ["lets", "lets|let us"],
       ["hes", "he is|he has"], ["shes", "she is|she has"], ["thats", "that is|that has"], ["theres", "there is|there has"],
       ["whats", "what is|what has"], ["whos", "who is|who has"], ["wheres", "where is"], ["hows", "how is"],
       ["id", "id|i would|i had"], ["youd", "you would|you had"], ["hed", "he would|he had"],
       ["shed", "shed|she would|she had"], ["wed", "wed|we would|we had"], ["theyd", "they would|they had"],
       ["itd", "it would|it had"], ["whod", "who would|who had"]
      ].forEach(([w, r]) => addNA(w, r.split("|")));

      // Lecturas posibles de una ficha escrita por el ALUMNO
      function studentReadings(t, next) {
        let r;
        if (t.indexOf("'") >= 0) r = aposReadings(t, true);
        else if (NOAPOS[t]) r = NOAPOS[t];
        else {
          r = [[t]];
          // posesivo o 's sin apóstrofo: "my sisters book", "my brothers living"
          if (t.length >= 4 && /[a-z]s$/.test(t) && !/(ss|us|is)$/.test(t)) {
            const b = t.slice(0, -1);
            r = r.concat([[b + "'s"], [b, "is"], [b, "has"]]);
          }
        }
        // "I'll not" no se acepta (poco natural): se exige "won't / will not"
        if (next === "not") r = r.map(x => (x.length === 2 && x[1] === "will" && t !== "will") ? [INVALID] : x);
        return r;
      }

      function aposReadings(t) {
        let m;
        if (t === "let's") return [["let", "us"]];
        if ((m = /^(.+)n't$/.exec(t))) return NEG_BASE[m[1]] ? [[NEG_BASE[m[1]], "not"]] : [[t]];
        if ((m = /^(.+)'m$/.exec(t))) return [[m[1], "am"]];
        if ((m = /^(.+)'re$/.exec(t))) return [[m[1], "are"]];
        if ((m = /^(.+)'ve$/.exec(t))) return [[m[1], "have"]];
        if ((m = /^(.+)'ll$/.exec(t))) return [[m[1], "will"]];
        if ((m = /^(.+)'d$/.exec(t))) return [[m[1], "would"], [m[1], "had"]];
        if ((m = /^(.+)'s$/.exec(t))) return PRON.has(m[1]) ? [[m[1], "is"], [m[1], "has"]] : [[t], [m[1], "is"], [m[1], "has"]];
        return [[t]];
      }

      // Lecturas de una frase escrita por el PROFESOR: las contracciones se resuelven por contexto
      function modelReadings(str) {
        const toks = baseTokens(str);
        let outs = [[]];
        toks.forEach((t, i) => {
          let opts;
          if (t.indexOf("'") < 0) opts = [[t]];
          else {
            const rest = toks.slice(i + 1), w = nextWord(rest);
            let m;
            if ((m = /^(.+)'s$/.exec(t)) && t !== "let's") {
              const aux = looksPP(w) && w !== "better" ? "has" : "is";
              opts = PRON.has(m[1]) ? [[m[1], aux]] : [[m[1], aux], [t]];
            } else if ((m = /^(.+)'d$/.exec(t))) {
              opts = [[m[1], looksPP(w) ? "had" : "would"]];
            } else opts = [aposReadings(t)[0]];
          }
          const next = [];
          outs.forEach(o => opts.forEach(x => next.push(o.concat(x))));
          outs = next;
        });
        return outs.map(o => o.join(" "));
      }

      /* ---------- 4. plantillas: (a|b) [x] {T:clave} @grupo ; ---------- */
      const parseCache = {};
      function parsePat(src) {
        if (parseCache[src]) return parseCache[src];
        let i = 0;
        function seq(stops) {
          const parts = []; let lit = "";
          const flush = () => { if (lit) { parts.push({ t: "lit", v: lit }); lit = ""; } };
          while (i < src.length) {
            const c = src[i];
            if (stops.indexOf(c) >= 0) break;
            if (c === "(" || c === "[") {
              flush(); i++;
              const close = c === "(" ? ")" : "]";
              const opts = [seq("|" + close)];
              while (src[i] === "|") { i++; opts.push(seq("|" + close)); }
              if (src[i] !== close) throw new Error("L3 pattern: falta '" + close + "' en: " + src);
              i++;
              parts.push({ t: c === "(" ? "alt" : "opt", opts: opts });
            } else if (c === "{") {
              flush();
              const end = src.indexOf("}", i);
              if (end < 0) throw new Error("L3 pattern: falta '}' en: " + src);
              parts.push({ t: "slot", key: src.slice(i + 1, end).replace(/^\s*t\s*:/i, "").trim().toLowerCase() });
              i = end + 1;
            } else if (c === "@") {
              flush();
              const m = /^@([a-z0-9_]+)/i.exec(src.slice(i));
              parts.push({ t: "ref", name: m[1].toLowerCase() });
              i += m[0].length;
            } else { lit += c; i++; }
          }
          flush();
          return parts;
        }
        return (parseCache[src] = seq(""));
      }
      function synOf(name) {
        const s = (cfg().syn || {})[name] || SYN[name];
        if (!s) throw new Error("L3 pattern: grupo @" + name + " no definido");
        return s;
      }
      function slotDef(key) {
        const d = (cfg().slots || {})[key];
        return d ? { forms: d.forms || key, pos: d.pos || ["start", "end"] } : { forms: key, pos: ["start", "end"] };
      }
      const OPEN = "⟦", SEP = "¦", CLOSE = "⟧";
      function expandParts(parts, st) {
        let acc = [""];
        for (const p of parts) {
          let opts;
          if (p.t === "lit") opts = [p.v];
          else if (p.t === "alt") opts = [].concat(...p.opts.map(s => expandParts(s, st)));
          else if (p.t === "opt") opts = [""].concat(...p.opts.map(s => expandParts(s, st)));
          else if (p.t === "ref") opts = expandParts(parsePat(synOf(p.name)), st);
          else opts = expandParts(parsePat(slotDef(p.key).forms), st).map(f => " " + OPEN + p.key + SEP + f.trim() + CLOSE + " ");
          const next = [];
          outer: for (const a of acc) for (const o of opts) {
            if (next.length >= MAX_VARIANTS) { st.over = true; break outer; }
            next.push(a + o);
          }
          acc = next;
        }
        return acc;
      }
      // Mueve cada hueco {T:} al principio y/o al final de SU oración (las oraciones se separan con ;)
      const SLOT_RX = new RegExp(OPEN + "([^" + SEP + "]*)" + SEP + "[^" + CLOSE + "]*" + CLOSE, "g");
      function placeSlots(str) {
        const segs = str.split(";").map(seg => {
          let vars = [seg];
          (seg.match(SLOT_RX) || []).forEach(whole => {
            const key = whole.slice(1, whole.indexOf(SEP)), pos = slotDef(key).pos, more = [];
            vars.forEach(v => {
              const sin = v.replace(whole, " ");
              if (pos.indexOf("start") >= 0) more.push(whole + " " + sin);
              if (pos.indexOf("end") >= 0) more.push(sin + " " + whole);
            });
            vars = vars.concat(more);
          });
          return vars;
        });
        let outs = [""];
        segs.forEach(vs => { const n = []; outs.forEach(o => vs.forEach(v => n.push(o + " " + v))); outs = n; });
        return outs.map(o => o.replace(new RegExp(OPEN + "[^" + SEP + "]*" + SEP, "g"), " ").replace(new RegExp(CLOSE, "g"), " "));
      }
      function expandPattern(pat, st) {
        st = st || {};
        const out = [];
        expandParts(parsePat(pat), st).forEach(s => placeSlots(s).forEach(x => out.push(x.replace(/\s+/g, " ").trim())));
        return out;
      }

      /* ---------- 5. respuestas aceptadas de una pregunta (perezoso, una sola vez) ---------- */
      function prepare(q) {
        if (q._l3trie) return q.accepted;
        const set = new Set(), st = { over: false };
        const add = s => modelReadings(s).forEach(c => {
          if (!c) return;
          if (set.size >= MAX_VARIANTS) st.over = true; else set.add(c);
        });
        (q.pat ? [].concat(q.pat) : []).forEach(p => expandPattern(p, st).forEach(add));
        (q.answers || []).concat(q.alts || []).forEach(add);
        if (st.over) console.warn("[L3] " + (q.qid || "?") + ": more than " + MAX_VARIANTS + " variants; list truncated. Simplify its pattern.");
        const trie = new Map();
        set.forEach(s => {
          let node = trie;
          s.split(" ").forEach(w => { if (!node.has(w)) node.set(w, new Map()); node = node.get(w); });
          node.set("$", true);
        });
        // no enumerables: JSON.stringify, localStorage y Firebase nunca los ven
        Object.defineProperty(q, "accepted", { value: set, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(q, "_l3trie", { value: trie, enumerable: false, configurable: true, writable: true });
        return set;
      }
      function prepareModule(mod) { (mod.questions || []).forEach(q => { if (q.type === "translate") prepare(q); }); }

      /* ---------- 6. corrección ---------- */
      function grade(userValue, q) {
        const toks = baseTokens(userValue);
        if (toks.length < 2) return false;                 // vacía o una sola palabra
        prepare(q);
        const readings = toks.map((t, i) => studentReadings(t, toks[i + 1]));
        const n = readings.length;
        function walk(i, node) {
          if (i === n) return node.has("$");
          for (const r of readings[i]) {
            let nd = node;
            for (const w of r) { nd = nd.get(w); if (!nd) break; }
            if (nd && walk(i + 1, nd)) return true;
          }
          return false;
        }
        return walk(0, q._l3trie);
      }

      return { grade: grade, prepare: prepare, prepareModule: prepareModule, expandPattern: expandPattern,
               prep: prep, baseTokens: baseTokens, modelReadings: modelReadings, studentReadings: studentReadings,
               MAX_VARIANTS: MAX_VARIANTS };
    })();

    function gradeTranslation(userValue, q) { return L3.grade(userValue, q); }
    /* ===== L3-ENGINE v1 · END ===== */
