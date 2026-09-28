/* Solo de referencia: el parche completo (incluye los cambios en finishQuiz, saveProgress...) es retry_patch.py */
    /* ===== RETRY-WRONG v1 · START (igual en todas las apps) =====
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
      document.getElementById("quizCategoryTitle").innerText = mod.title + " \u00b7 \ud83c\udfaf Only your mistakes";
      showView("viewQuiz");
      window.scrollTo(0, 0);
      startTimer();
      renderQuestion();
    }
    /* ===== RETRY-WRONG v1 · END ===== */
