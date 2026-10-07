/* ==========================================================
   «Back Again»: reproducción y pulso compartido.
   La canción trae precalculadas 24 bandas de frecuencia y un pulso
   (golpes) por fotograma, así que portada, concierto 3D y botones
   se mueven exactamente con la música, sin analizar audio en directo.
   ========================================================== */
(function () {
  "use strict";

  const song = window.KF_DATA.song;
  const audio = new Audio();
  audio.src = song.src;
  audio.loop = true;
  audio.preload = "auto";

  let BD = null, FX = null, NF = 0;
  const bands = new Float32Array(24);
  const listeners = [];
  let targets = null; // elementos con data-beat reciben --bass y --hit
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const beat = {
    bass: 0, mid: 0, hit: 0, bands, audio,
    get playing() { return !audio.paused; },
    get progress() { return audio.duration ? audio.currentTime / audio.duration : 0; },
    play() { return audio.play().catch(() => {}); },
    pause() { audio.pause(); },
    toggle() { if (audio.paused) beat.play(); else beat.pause(); },
    seek(f) { if (audio.duration) audio.currentTime = f * audio.duration; },
    onChange(fn) { listeners.push(fn); }
  };
  window.KFBeat = beat;

  ["play", "pause", "ended"].forEach((ev) => audio.addEventListener(ev, () => listeners.forEach((fn) => fn(beat))));

  // datos en base64: 24 bytes de bandas por fotograma y 1 byte de golpe
  const decode = (txt) => Uint8Array.from(atob(txt.trim()), (c) => c.charCodeAt(0));
  Promise.all([song.bands, song.hits].map((u) => fetch(u).then((r) => (r.ok ? r.text() : Promise.reject()))))
    .then(([b, f]) => { BD = decode(b); FX = decode(f); NF = FX.length; })
    .catch(() => { /* sin datos de ritmo: se usa un pulso suave */ });

  let t0 = performance.now();
  function tick(now) {
    const t = (now - t0) / 1000;
    if (!audio.paused && BD) {
      const fi = Math.min(NF - 1, (audio.currentTime * song.fps) | 0);
      const o = fi * 24;
      for (let k = 0; k < 24; k++) bands[k] += (BD[o + k] / 255 - bands[k]) * 0.5;
      beat.bass += ((bands[0] + bands[1] + bands[2] + bands[3]) / 4 - beat.bass) * 0.45;
      beat.mid = (bands[8] + bands[10] + bands[12]) / 3;
      beat.hit = Math.max(beat.hit * 0.86, Math.pow(FX[fi] / 255, 1.3));
    } else if (!audio.paused) {
      // sin datos: pulso a 96 bpm
      beat.bass = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 6) * 0.6;
      beat.hit = Math.max(beat.hit * 0.86, beat.bass);
      for (let k = 0; k < 24; k++) bands[k] = beat.bass * (1 - k / 30) * (0.6 + 0.4 * Math.random());
    } else {
      for (let k = 0; k < 24; k++) bands[k] *= 0.9;
      beat.bass = reduce ? 0 : Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 6) * 0.15;
      beat.hit *= 0.9;
    }
    if (!targets) targets = document.querySelectorAll("[data-beat]");
    targets.forEach((el) => {
      el.style.setProperty("--bass", beat.bass.toFixed(3));
      el.style.setProperty("--hit", beat.hit.toFixed(3));
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
