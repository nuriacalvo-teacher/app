/* ==========================================================
   Reproductor y pulso compartido.
   Suena la canción principal o cualquier canción de un disco.
   Solo el ecualizador sigue a la música (24 bandas de frecuencia
   calculadas en directo); el resto de animaciones van solas.
   ========================================================== */
(function () {
  "use strict";

  const D = window.KF_DATA;
  const audio = new Audio();
  audio.preload = "none";   // la canción solo se descarga al darle a escuchar
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bands = new Float32Array(24);
  const listeners = [];
  let ctx = null, analyser = null, freq = null;
  let queue = [], qi = 0;

  const main = {
    titulo: D.cancionPrincipal.titulo, archivo: D.cancionPrincipal.archivo, portada: D.cancionPrincipal.portada, disco: null
  };

  const beat = {
    bands, audio,
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
    if (!audio.paused && analyser) {
      analyser.getByteFrequencyData(freq);
      // 24 bandas en escala logarítmica, como el oído
      for (let k = 0; k < 24; k++) {
        const a = Math.floor(Math.pow(k / 24, 1.7) * 100) + 1, b = Math.floor(Math.pow((k + 1) / 24, 1.7) * 100) + 2;
        let m = 0;
        for (let j = a; j < b; j++) m = Math.max(m, freq[j]);
        bands[k] += (m / 255 - bands[k]) * 0.5;
      }
    } else if (!audio.paused) {
      // sin análisis posible: ondas suaves
      for (let k = 0; k < 24; k++) bands[k] = 0.35 + 0.3 * Math.sin(t * 6 + k * 0.7) * Math.sin(t * 2.3 + k);
    } else {
      for (let k = 0; k < 24; k++) bands[k] *= 0.9;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
