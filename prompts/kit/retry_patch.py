"""Parche genérico RETRY-WRONG v1: repetir solo las preguntas falladas de un módulo suspendido."""
import sys
P = sys.argv[1]
t = open(P, encoding="utf-8").read()
if "RETRY-WRONG v1" in t:
    print("ya aplicado"); sys.exit(0)

def rep(old, new, count=1):
    global t
    n = t.count(old)
    assert n == count, (n, old[:80])
    t = t.replace(old, new)

# 1. estado de la ronda de repaso
rep("    let attemptLog = [];\n",
    "    let attemptLog = [];\n"
    "    let retryState = null;   // RETRY-WRONG v1: { round, carried } cuando se repiten solo las falladas\n")

# 2. el registro de cada respuesta guarda el qid (para saber cuáles repetir)
rep("""      attemptLog.push({
        type: q.type, prompt: questionPromptText(q), user: values.join(" \\u00b7 "),""",
    """      attemptLog.push({
        qid: q.qid, type: q.type, prompt: questionPromptText(q), user: values.join(" \\u00b7 "),""")

# 3. el progreso guardado en el navegador recuerda la ronda de repaso
rep("""        seconds: quizSeconds,
        log: attemptLog
      }));""",
    """        seconds: quizSeconds,
        log: attemptLog,
        retry: retryState
      }));""")
rep("""          if (p.idx > 0 && p.idx < mod.size &&
              confirm(`You have an unfinished attempt (${p.idx} of ${mod.size} questions done).\\n\\nOK = continue where you stopped\\nCancel = start again from the beginning`)) {""",
    """          const n = (p.order || []).length || mod.size;
          if (p.idx > 0 && p.idx < n &&
              confirm(`You have an unfinished attempt (${p.idx} of ${n} questions done).\\n\\nOK = continue where you stopped\\nCancel = start again from the beginning`)) {""")
rep("""            resumed = currentQuestions.length === mod.size;""",
    """            retryState = p.retry || null;
            resumed = currentQuestions.length === (retryState ? n : mod.size);""")
rep("""      if (!resumed) {
        storageDel(progressKey(mod.id));""",
    """      if (!resumed) {
        retryState = null;
        storageDel(progressKey(mod.id));""")
rep("""      document.getElementById("quizCategoryTitle").innerText = mod.title;""",
    """      document.getElementById("quizCategoryTitle").innerText = mod.title + (retryState ? " \\u00b7 \\ud83c\\udfaf Only your mistakes" : "");""")

# 4. función que lanza la ronda con las falladas
rep("""    function startTimer() {""",
    """    /* ===== RETRY-WRONG v1 · START (igual en todas las apps) =====
       Si el alumno no aprueba, puede repetir SOLO las preguntas que ha fallado.
       Las acertadas se conservan y la nota se calcula siempre sobre el módulo entero. */
    function wrongQuestionsOf(mod, log) {
      return log.filter(a => !a.ok)
        .map(a => mod.questions.find(q => q.qid === a.qid || (!a.qid && questionPromptText(q) === a.prompt)))
        .filter(Boolean);
    }
    function startRetryWrong() {
      const mod = currentModule();
      const qs = wrongQuestionsOf(mod, attemptLog);   // attemptLog = registro completo del intento que acaba de terminar
      if (!qs.length) { startCurrentQuiz(true); return; }
      retryState = { round: (retryState ? retryState.round : 1) + 1, carried: attemptLog.filter(a => a.ok) };
      storageDel(progressKey(mod.id));
      currentQuestions = shuffle(qs);
      currentQuestionIdx = 0;
      currentScore = 0;
      attemptLog = [];                                 // quizSeconds sigue sumando: el tiempo es el de todo el intento
      if (mod.type === "translate" && typeof L3 !== "undefined") setTimeout(() => L3.prepareModule(mod), 50);
      document.getElementById("quizCategoryTitle").innerText = mod.title + " \\u00b7 \\ud83c\\udfaf Only your mistakes";
      showView("viewQuiz");
      window.scrollTo(0, 0);
      startTimer();
      renderQuestion();
    }
    /* ===== RETRY-WRONG v1 · END ===== */

    function startTimer() {""")

# 5. resultado: se suma lo conservado + lo de esta ronda
rep("""      const total = currentQuestions.length;
      const percentage = Math.round((currentScore / total) * 100);""",
    """      if (retryState) attemptLog = retryState.carried.concat(attemptLog);   // RETRY-WRONG: módulo completo
      const retryRound = retryState ? retryState.round : 1;
      const total = attemptLog.length;
      currentScore = attemptLog.filter(a => a.ok).length;
      const percentage = Math.round((currentScore / total) * 100);""")
rep("""        rawScore: `${currentScore}/${total}`,""",
    """        rawScore: `${currentScore}/${total}`,
        retryRound: retryRound,""")
rep("""          ${!passed ? `<button onclick="startCurrentQuiz(true)" class="bg-rose-600 hover:bg-rose-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition order-first">🔁 Try this module again</button>` : ""}""",
    """          ${!passed && total - currentScore > 0 ? `<button onclick="startRetryWrong()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg px-8 py-4 rounded-2xl transition order-first">🎯 Repeat only the ${total - currentScore} I got wrong</button>` : ""}
          ${!passed ? `<button onclick="startCurrentQuiz(true)" class="bg-rose-600 hover:bg-rose-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition">🔁 Try the whole module again</button>` : ""}""")
rep("""            <p class="text-slate-200 text-base md:text-lg">You got <strong>${currentScore} out of ${total}</strong>.""",
    """            <p class="text-slate-200 text-base md:text-lg">You got <strong>${currentScore} out of ${total}</strong>${retryRound > 1 ? ` (round ${retryRound})` : ""}.""")
rep("""            <p class="text-slate-100 text-base md:text-xl">You have passed <strong>${mod.title}</strong>. Well done!</p>""",
    """            <p class="text-slate-100 text-base md:text-xl">You have passed <strong>${mod.title}</strong>${retryRound > 1 ? ` after repeating your mistakes (round ${retryRound})` : ""}. Well done!</p>""")
rep("""            <p class="text-slate-300 text-base md:text-lg">Study""",
    """            <p class="text-amber-200 text-base md:text-lg font-bold">🎯 You do not need to start again: you can repeat <strong>only the ${total - currentScore} question${total - currentScore === 1 ? "" : "s"} you got wrong</strong>. The ones you got right are kept.</p>
            <p class="text-slate-300 text-base md:text-lg">Study""")
open(P, "w", encoding="utf-8").write(t)
print("aplicado")
