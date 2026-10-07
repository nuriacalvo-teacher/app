/* ==========================================================
   Efectos de sonido generados en el navegador (Web Audio API):
   guitarra (Karplus-Strong), salpicaduras y campanillas.
   ========================================================== */
(function () {
  "use strict";

  const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = {
    G: [43, 47, 50, 55, 59, 67], D: [50, 57, 62, 66], Em: [40, 47, 52, 55, 59, 64], C: [48, 52, 55, 60, 64]
  };

  let ctx = null, master, reverbIn;
  let enabled = false;
  const pluckCache = new Map();

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    reverbIn = ctx.createGain();
    reverbIn.connect(conv).connect(wet).connect(master);
    return ctx;
  }

  function ready() {
    if (!ensure()) return false;
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function pluckBuffer(midi) {
    if (pluckCache.has(midi)) return pluckCache.get(midi);
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / midiHz(midi)));
    const len = Math.floor(sr * 2.6);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    let last = 0;
    for (let i = 0; i < N; i++) { last = last * 0.45 + (Math.random() * 2 - 1) * 0.55; ring[i] = last; }
    const decay = 0.9968 - Math.max(0, midi - 60) * 0.0004;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const n = (p + 1) % N;
      const v = ring[p];
      d[i] = v;
      ring[p] = decay * 0.5 * (v + ring[n]);
      p = n;
    }
    pluckCache.set(midi, buf);
    return buf;
  }

  function pluck(midi, when, vel) {
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(midi);
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g);
    g.connect(master);
    g.connect(reverbIn);
    src.start(when);
  }

  function tone(type, f0, f1, dur, vol, when) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function noiseHit(freq, dur, vol, when) {
    const len = Math.floor(ctx.sampleRate * (dur + 0.05));
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f).connect(g).connect(master);
    s.start(when);
  }

  window.KFAudio = {
    get enabled() { return enabled; },
    setEnabled(on) { enabled = on; if (on) ready(); },
    // la guitarra suena siempre: es una acción explícita del visitante
    strum(name) {
      if (!ready()) return;
      const t = ctx.currentTime + 0.01;
      (CHORDS[name] || CHORDS.G).forEach((m, i) => pluck(m, t + i * 0.028, 0.34 * (0.8 + Math.random() * 0.3)));
    },
    splash(big) {
      if (!enabled || !ready()) return;
      const t = ctx.currentTime;
      noiseHit(1300, big ? 0.55 : 0.3, big ? 0.35 : 0.18, t);
      tone("sine", 520, 140, 0.22, 0.12, t + 0.03);
    },
    bloop() {
      if (!enabled || !ready()) return;
      tone("sine", 520 + Math.random() * 200, 980, 0.12, 0.08, ctx.currentTime);
    },
    chime() {
      if (!enabled || !ready()) return;
      const t = ctx.currentTime;
      [76, 79, 83, 88, 91].forEach((m, i) => tone("sine", midiHz(m), midiHz(m) * 1.002, 1.2, 0.07, t + i * 0.07));
    }
  };
})();
