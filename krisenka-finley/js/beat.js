/* ==========================================================
   Reproductor y pulso compartido.
   Suena la canción principal o cualquier canción de un disco.
   El pulso (24 bandas de frecuencia + golpes) mueve portada,
   concierto 3D y botones:
   - si la canción trae su ritmo precalculado (bandas/golpes), se usa;
   - si no, se calcula en directo mientras suena.
   ========================================================== */
(function () {
  "use strict";

  const D = window.KF_DATA;
  const audio = new Audio();
  audio.preload = "auto";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bands = new Float32Array(24);
  const listeners = [];
  let targets = null;          // elementos con data-beat reciben --hit
  let lastHit = "";
  let BD = null, FX = null, NF = 0;   // ritmo precalculado de la canción actual
  let ctx = null, analyser = null, freq = null, avgBass = 0;
  let queue = [], qi = 0;

  const main = {
    titulo: D.cancionPrincipal.titulo, archivo: D.cancionPrincipal.archivo, portada: D.cancionPrincipal.portada,
    bandas: D.cancionPrincipal.bandas, golpes: D.cancionPrincipal.golpes, disco: null
  };

  const beat = {
    bass: 0, hit: 0, bands, audio,
    current: main,
    get playing() { return !audio.paused; },
    play() { ensureGraph(); return audio.play().catch(() => {}); },
    pause() { audio.pause(); },
    toggle() { if (audio.paused) beat.play(); else beat.pause(); },
    seek(f) { if (audio.duration) audio.currentTime = f * audio.duration; },
    onChange(fn) { listeners.push(fn); },
    /* reproduce la canción i de un disco y después las siguientes */
    playDisc(disco, i) {
      queue = disco.canciones.map((c, n) => ({ ...c, portada: disco.portada, disco, n })).filter((c) => c.archivo);
      qi = Math.max(0, queue.findIndex((c) => c.n === i));
      load(queue[qi], true);
    },
    playMain() { queue = []; load(main, true); }
  };
  window.KFBeat = beat;

  const emit = () => listeners.forEach((fn) => fn(beat));
  ["play", "pause"].forEach((ev) => audio.addEventListener(ev, emit));
  audio.addEventListener("ended", () => {
    // en un disco, pasa a la siguiente; al acabar, vuelve la canción principal
    if (queue.length && qi < queue.length - 1) load(queue[++qi], true);
    else if (queue.length) { queue = []; load(main, true); }
  });

  function load(song, autoplay) {
    beat.current = song;
    audio.src = song.archivo;
    audio.loop = song === main;
    BD = FX = null; NF = 0;
    if (song.bandas && song.golpes) {
      const decode = (txt) => Uint8Array.from(atob(txt.trim()), (c) => c.charCodeAt(0));
      Promise.all([song.bandas, song.golpes].map((u) => fetch(u).then((r) => (r.ok ? r.text() : Promise.reject()))))
        .then(([b, f]) => { if (beat.current === song) { BD = decode(b); FX = decode(f); NF = FX.length; } })
        .catch(() => {});
    }
    emit();
    if (autoplay) beat.play();
  }

  /* Análisis en directo: solo con archivos de la propia web (con archivos
     de otras webs el navegador silenciaría la canción). */
  function ensureGraph() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      freq = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (e) { ctx = null; analyser = null; }
  }

  load(main, false);

  let t0 = performance.now();
  function tick(now) {
    const t = (now - t0) / 1000;
    if (!audio.paused && BD) {
      const fi = Math.min(NF - 1, (audio.currentTime * 30) | 0);
      const o = fi * 24;
      for (let k = 0; k < 24; k++) bands[k] += (BD[o + k] / 255 - bands[k]) * 0.5;
      beat.bass += ((bands[0] + bands[1] + bands[2] + bands[3]) / 4 - beat.bass) * 0.45;
      beat.hit = Math.max(beat.hit * 0.86, Math.pow(FX[fi] / 255, 1.3));
    } else if (!audio.paused && analyser) {
      analyser.getByteFrequencyData(freq);
      // 24 bandas en escala logarítmica, como el oído
      for (let k = 0; k < 24; k++) {
        const a = Math.floor(Math.pow(k / 24, 1.7) * 100) + 1, b = Math.floor(Math.pow((k + 1) / 24, 1.7) * 100) + 2;
        let m = 0;
        for (let j = a; j < b; j++) m = Math.max(m, freq[j]);
        bands[k] += (m / 255 - bands[k]) * 0.5;
      }
      const bass = (bands[0] + bands[1] + bands[2] + bands[3]) / 4;
      beat.bass += (bass - beat.bass) * 0.45;
      avgBass += (bass - avgBass) * 0.02;
      beat.hit = Math.max(beat.hit * 0.86, Math.min(1, Math.max(0, (bass - avgBass) * 4)));
    } else if (!audio.paused) {
      // sin análisis posible: pulso suave a 96 bpm
      beat.bass = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 6) * 0.6;
      beat.hit = Math.max(beat.hit * 0.86, beat.bass);
      for (let k = 0; k < 24; k++) bands[k] = beat.bass * (1 - k / 30);
    } else {
      for (let k = 0; k < 24; k++) bands[k] *= 0.9;
      beat.bass = reduce ? 0 : Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 6) * 0.15;
      beat.hit *= 0.9;
    }
    // solo se toca el estilo cuando el valor cambia de verdad (menos recálculos)
    const h = beat.hit.toFixed(2);
    if (h !== lastHit) {
      lastHit = h;
      if (!targets) targets = document.querySelectorAll("[data-beat]");
      targets.forEach((el) => el.style.setProperty("--hit", h));
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
