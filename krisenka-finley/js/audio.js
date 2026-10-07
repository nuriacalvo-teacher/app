/* ==========================================================
   Audio generado en el navegador (Web Audio API), sin archivos:
   guitarra (Karplus-Strong), preescuchas, ambiente de río y pájaros.
   ========================================================== */
(function () {
  "use strict";

  const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = {
    G: [43, 47, 50, 55, 59, 67], D: [50, 57, 62, 66], Em: [40, 47, 52, 55, 59, 64],
    C: [48, 52, 55, 60, 64], Am: [45, 52, 57, 60, 64], F: [41, 48, 53, 57, 60, 65], A: [45, 52, 57, 61, 64]
  };
  const SCALES = {
    G: [55, 57, 59, 62, 64, 67, 69, 71, 74, 76], A: [57, 60, 62, 64, 67, 69, 72, 74, 76, 79],
    E: [52, 55, 57, 59, 62, 64, 67, 69, 71, 74], C: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81],
    D: [62, 64, 66, 69, 71, 74, 76, 78, 81, 83]
  };
  const PREVIEW_SECONDS = 45;

  let ctx = null, master, reverbIn, analyser, ambientBus;
  let ambienceOn = false, ambience = null;
  const pluckCache = new Map();
  const listeners = [];
  let song = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hashStr = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    master.connect(comp).connect(analyser).connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    reverbIn = ctx.createGain();
    reverbIn.connect(conv).connect(wet).connect(master);

    ambientBus = ctx.createGain();
    ambientBus.gain.value = 0;
    ambientBus.connect(master);
    return ctx;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function impulse(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return b;
  }

  function noiseBuffer(sec, brown) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }

  /* Cuerda pulsada: algoritmo Karplus-Strong precalculado */
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

  function pluck(midi, when, vel, dest) {
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(midi);
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-0.6, Math.min(0.6, (midi - 55) / 30));
      out = g.connect(pan);
    }
    out.connect(dest || master);
    out.connect(reverbIn);
    src.start(when);
  }

  function strumAt(name, when, opts) {
    const notes = CHORDS[name] || CHORDS.G;
    const up = opts && opts.up;
    const seq = up ? [...notes].reverse() : notes;
    const vel = (opts && opts.vel) || 0.32;
    seq.forEach((m, i) => pluck(m, when + i * ((opts && opts.spread) || 0.028), vel * (0.8 + Math.random() * 0.3), opts && opts.dest));
  }

  function tone(type, f0, f1, dur, vol, when, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest || master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function noiseHit(freq, q, dur, vol, when, dest) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(dur + 0.05, false);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f).connect(g).connect(dest || master);
    s.start(when);
  }

  /* ---------- Ambiente: río, viento y pájaros ---------- */
  function startAmbience() {
    if (ambience) return;
    const river = ctx.createBufferSource();
    river.buffer = noiseBuffer(6, true);
    river.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 650;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.12; lfoG.gain.value = 260;
    lfo.connect(lfoG).connect(lp.frequency);
    const rg = ctx.createGain();
    rg.gain.value = 0.22;
    river.connect(lp).connect(rg).connect(ambientBus);

    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer(5, false);
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 400; bp.Q.value = 0.9;
    const wg = ctx.createGain();
    wg.gain.value = 0.0;
    wind.connect(bp).connect(wg).connect(ambientBus);

    river.start(); wind.start(); lfo.start();
    const birdTimer = setInterval(() => { if (Math.random() < 0.55) birds(); }, 5200);
    ambience = { river, wind, lfo, bp, wg, birdTimer };
    ambientBus.gain.cancelScheduledValues(ctx.currentTime);
    ambientBus.gain.setTargetAtTime(song ? 0.12 : 0.5, ctx.currentTime, 0.8);
  }

  function stopAmbience() {
    if (!ambience) return;
    const a = ambience;
    ambience = null;
    clearInterval(a.birdTimer);
    ambientBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => { try { a.river.stop(); a.wind.stop(); a.lfo.stop(); } catch (e) { /* ya parado */ } }, 1500);
  }

  function birds() {
    const t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    for (let i = 0; i < n; i++) tone("sine", base, base * 1.45, 0.09, 0.05, t + i * 0.13, ambientBus);
  }

  /* ---------- Reproductor de preescuchas ---------- */
  function emit() {
    const state = { playing: !!song, index: song ? song.index : -1 };
    listeners.forEach((fn) => fn(state));
  }

  function stopTrack() {
    if (!song) return;
    const s = song;
    song = null;
    clearInterval(s.timer);
    clearTimeout(s.limit);
    if (s.audio) s.audio.pause();
    s.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => s.bus.disconnect(), 1200);
    if (ambience) ambientBus.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    emit();
  }

  function playTrack(track, index) {
    if (!ensure()) return;
    resume();
    stopTrack();
    const bus = ctx.createGain();
    bus.gain.value = 0.95;
    bus.connect(master);
    song = { index, track, bus, step: 0, next: ctx.currentTime + 0.12, lastNote: 4 };
    if (ambience) ambientBus.gain.setTargetAtTime(0.12, ctx.currentTime, 0.5);

    if (track.src) {
      const audio = new Audio(track.src);
      audio.crossOrigin = "anonymous";
      ctx.createMediaElementSource(audio).connect(bus);
      audio.addEventListener("ended", stopTrack);
      audio.play();
      song.audio = audio;
    } else {
      const eighth = 60 / track.bpm / 2;
      const seed = hashStr(track.title);
      song.timer = setInterval(() => {
        if (!song) return;
        while (song.next < ctx.currentTime + 0.15) {
          playStep(song, seed, song.step, song.next);
          song.next += eighth;
          song.step++;
        }
      }, 25);
      song.limit = setTimeout(stopTrack, PREVIEW_SECONDS * 1000);
    }
    emit();
  }

  function playStep(s, seed, step, time) {
    const t = s.track;
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chordName = t.chords[bar % t.chords.length];
    const chord = CHORDS[chordName];
    const rng = mulberry32(seed + (bar % 8) * 977 + beat * 31);

    // Guitarra: arpegio los compases pares, rasgueo los impares
    if (bar % 2 === 0 || bar < 2) {
      const pattern = [0, 2, 1, 3, 2, 4, 3, 2];
      pluck(chord[pattern[beat] % chord.length], time, beat === 0 ? 0.42 : 0.28, s.bus);
    } else if ([0, 3, 4, 6].includes(beat)) {
      strumAt(chordName, time, { up: beat === 3 || beat === 6, vel: beat === 0 ? 0.26 : 0.17, spread: 0.018, dest: s.bus });
    }

    if (bar >= 1) {
      // bombo y maraca
      if (beat === 0 || beat === 4) {
        tone("sine", 140, 42, 0.32, 0.55, time, s.bus);
      }
      noiseHit(7000, 1.2, 0.05, beat % 2 ? 0.07 : 0.035, time, s.bus);
      if (beat === 2 || beat === 6) noiseHit(1800, 0.8, 0.12, 0.12, time, s.bus);
    }

    // Melodía tipo voz (a partir del tercer compás)
    if (bar >= 2 && [0, 2, 3, 5, 6].includes(beat) && rng() < 0.75) {
      const scale = SCALES[t.scale] || SCALES.G;
      s.lastNote = Math.max(0, Math.min(scale.length - 1, s.lastNote + Math.round((rng() - 0.5) * 4)));
      const f = midiHz(scale[s.lastNote]);
      const dur = (60 / t.bpm) * (beat === 6 ? 1.4 : 0.85);
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      o.type = "triangle"; o2.type = "sine";
      o.frequency.value = f; o2.frequency.value = f * 2;
      vib.frequency.value = 5.2; vibG.gain.value = f * 0.012;
      vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
      lp.type = "lowpass"; lp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.16, time + 0.05);
      g.gain.setTargetAtTime(0.0001, time + dur * 0.7, 0.08);
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      o.connect(lp); o2.connect(g2).connect(lp);
      lp.connect(g);
      g.connect(s.bus); g.connect(reverbIn);
      [o, o2, vib].forEach((n) => { n.start(time); n.stop(time + dur + 0.6); });
    }
  }

  /* ---------- API pública ---------- */
  window.KFAudio = {
    get ready() { return !!ctx; },
    get analyser() { return analyser; },
    get ambience() { return ambienceOn; },
    unlock() { if (ensure()) resume(); },
    setAmbience(on) {
      ambienceOn = on;
      if (!ensure()) return;
      resume();
      if (on) startAmbience(); else stopAmbience();
    },
    strum(name) {
      if (!ensure()) return;
      resume();
      strumAt(name, ctx.currentTime + 0.01, { vel: 0.36 });
    },
    splash(big) {
      if (!ctx || !ambienceOn) return;
      const t = ctx.currentTime;
      noiseHit(1300, 0.7, big ? 0.6 : 0.35, big ? 0.5 : 0.25, t);
      tone("sine", 520, 140, 0.22, 0.18, t + 0.03);
    },
    bloop() {
      if (!ctx || !ambienceOn) return;
      tone("sine", 520 + Math.random() * 200, 980, 0.12, 0.12, ctx.currentTime);
    },
    chime() {
      if (!ensure()) return;
      resume();
      const t = ctx.currentTime;
      [76, 79, 83, 88, 91].forEach((m, i) => {
        tone("sine", midiHz(m), midiHz(m) * 1.002, 1.2, 0.09, t + i * 0.07);
        tone("triangle", midiHz(m), midiHz(m), 0.4, 0.03, t + i * 0.07, reverbIn);
      });
    },
    gust(strength) {
      if (!ambience) return;
      const t = ctx.currentTime;
      ambience.wg.gain.cancelScheduledValues(t);
      ambience.wg.gain.setTargetAtTime(0.18 * strength, t, 0.6);
      ambience.wg.gain.setTargetAtTime(0, t + 1.8, 0.9);
      ambience.bp.frequency.setTargetAtTime(700, t, 0.8);
      ambience.bp.frequency.setTargetAtTime(380, t + 1.8, 1.2);
    },
    playTrack,
    stopTrack,
    isPlaying: () => !!song,
    onChange(fn) { listeners.push(fn); }
  };
})();
