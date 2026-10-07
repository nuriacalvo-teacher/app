/* ==========================================================
   Portada animada: WebGL (río, flores, nubes, rayos de sol)
   + capa 2D (siluro saltando, salpicaduras, notas, pájaros…)
   Todas las coordenadas están en píxeles de la ilustración 2000×1116.
   ========================================================== */
(function () {
  "use strict";

  const IW = 2000, IH = 1116;
  const hero = document.getElementById("inicio");
  const stage = document.getElementById("stage");
  const plate = document.getElementById("plate");
  const glCanvas = document.getElementById("fx");
  const canvas2d = document.getElementById("fx2d");
  const ctx2d = canvas2d.getContext("2d");
  const panHint = document.getElementById("pan-hint");
  const dusk = document.getElementById("dusk");
  const beat = window.KFBeat;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    t: 0, last: performance.now(), running: true, visible: true,
    mouse: [-9999, -9999], night: 0, quality: 1, slow: 0, frames: 0, wind: 0, windTarget: 0, titleBoost: 0, titleHover: false,
    sunAngle: 0, sunVel: 0, ripples: [], pan: 0, maxPan: 0, scale: 1
  };

  /* ---------- Maquetación: la ilustración "cubre" la portada ---------- */
  function layout() {
    const vw = hero.clientWidth, vh = hero.clientHeight;
    const ar = IW / IH;
    let w, h;
    if (vw / vh > ar) { w = vw; h = vw / ar; } else { h = vh; w = vh * ar; }
    stage.style.width = w + "px";
    stage.style.height = h + "px";
    state.scale = w / IW;
    state.maxPan = Math.max(0, (w - vw) / 2);
    state.offY = (vh - h) * 0.35;
    hero.classList.toggle("can-pan", state.maxPan > 40);
    applyPan();
    resizeCanvases(w, h);
  }

  function applyPan() {
    state.pan = Math.max(-state.maxPan, Math.min(state.maxPan, state.pan));
    const x = (hero.clientWidth - parseFloat(stage.style.width)) / 2 + state.pan;
    stage.style.transform = `translate3d(${x}px, ${state.offY}px, 0)`;
  }

  /* zonas interactivas posicionadas con data-rect="x,y,ancho,alto" */
  function placeHotspots() {
    stage.querySelectorAll("[data-rect]").forEach((el) => {
      const [x, y, w, h] = el.dataset.rect.split(",").map(Number);
      el.style.setProperty("--x", x / IW);
      el.style.setProperty("--y", y / IH);
      el.style.setProperty("--w", w / IW);
      el.style.setProperty("--h", h / IH);
    });
  }

  function toImage(e) {
    const r = stage.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * IW, ((e.clientY - r.top) / r.height) * IH];
  }

  /* ======================================================
     WEBGL
     ====================================================== */
  const VERT = `
    attribute vec2 aPos; varying vec2 vUv;
    void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uImg, uMask, uMask2;
    uniform float uTime, uWind, uTitle, uSun, uNight;
    uniform vec2 uMouse;
    uniform vec4 uRip[4];
    const vec2 SZ = vec2(2000.0, 1116.0);

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
    vec3 hueShift(vec3 c, float a){
      const vec3 k = vec3(0.57735); float ca = cos(a);
      return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
    }

    void main(){
      vec2 P = vUv * SZ; float t = uTime;
      vec3 m = texture2D(uMask, vUv).rgb;
      vec3 m2 = texture2D(uMask2, vUv).rgb;
      vec2 off = vec2(0.0);

      // Flores mecidas por el viento (ráfagas que cruzan de izquierda a derecha)
      float ph = m2.r * 6.2831;
      float gust = 0.65 + 0.35 * sin(t * 0.37 - P.x * 0.002) + uWind * 1.6;
      off.x += m.r * (7.0 * sin(t * 1.4 + ph) + 2.5 * sin(t * 3.1 + ph * 2.0 + P.y * 0.02)) * gust - m.r * uWind * 6.0;
      off.y += m.r * 1.4 * sin(t * 1.4 + ph + 1.57);

      // Nubes que respiran
      off.x += m.b * (3.0 * sin(t * 0.45 + P.y * 0.045) + 3.0 * sin(t * 0.21 + P.x * 0.006));
      off.y += m.b * 1.6 * sin(t * 0.6 + P.x * 0.025);

      // Río: corriente que se aleja hacia el puente (punto de fuga)
      float nearW = smoothstep(0.62, 0.95, m.g);
      float farW = smoothstep(0.25, 0.45, m.g) * (1.0 - nearW);
      vec2 V = vec2(1150.0, 836.0);
      vec2 rel = P - V; float r = max(length(rel), 1.0); float a = atan(rel.y, rel.x);
      vec2 q = vec2(a * 9.0, log(r) * 7.0 + t * 1.1);
      vec2 q2 = vec2(a * 22.0, log(r) * 16.0 + t * 2.1);
      vec2 n = vec2(noise(q), noise(q + vec2(7.3, 2.1))) - 0.5;
      n += 0.25 * (vec2(noise(q2), noise(q2 + vec2(3.1, 9.7))) - 0.5);
      float persp = clamp(r / 260.0, 0.25, 1.3);
      off += nearW * n * 10.0 * persp;
      vec2 qf = vec2(P.x * 0.035, P.y * 0.05 + t * 1.3);
      off += farW * (vec2(noise(qf), noise(qf + 5.0)) - 0.5) * 7.0;

      // Ondas (clics en el agua y saltos del siluro)
      float ripLight = 0.0;
      float water = nearW + farW;
      for (int i = 0; i < 4; i++) {
        vec4 R = uRip[i];
        float age = t - R.z;
        if (R.w > 0.0 && age > 0.0 && age < 4.0) {
          vec2 d = P - R.xy; d.y *= 2.4;
          float dist = length(d);
          float w = exp(-pow((dist - age * 140.0) / 28.0, 2.0)) * exp(-age * 0.9) * R.w;
          float wave = sin(dist * 0.22 - age * 10.0);
          vec2 dir = d / max(dist, 1.0);
          off += water * vec2(dir.x, dir.y / 2.4) * wave * 9.0 * w;
          ripLight += water * w * max(0.0, wave);
        }
      }

      // Sol: su corona de rayos oscila (y gira si lo tocas)
      vec2 S = vec2(1878.0, 98.0);
      vec2 sr = P - S; float sd = length(sr);
      float ring = smoothstep(46.0, 58.0, sd) * (1.0 - smoothstep(96.0, 112.0, sd));
      off += (S + rot(sr, -(0.12 * sin(t * 0.8) + uSun) * ring)) - P;

      vec3 col = texture2D(uImg, (P + off) / SZ).rgb;

      // Destellos en el agua
      float spark = pow(noise(q2 * vec2(1.0, 1.6) + 11.0), 9.0) * nearW * 1.4 + pow(noise(qf * 1.7 + 3.0), 7.0) * farW;
      col += vec3(0.95, 0.97, 1.0) * spark * 0.35 + vec3(0.8, 0.92, 1.0) * ripLight * 0.25;

      // Letras FINLEY: arcoíris que recorre el rótulo
      float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
      float k = m2.g * smoothstep(0.25, 0.45, mx - mn) * smoothstep(0.45, 0.6, mx);
      col = mix(col, clamp(hueShift(col, t * (0.9 + uTitle * 3.0) + P.x * 0.012), 0.0, 1.0), k);

      // Atardecer: al bajar hacia el concierto la escena se vuelve noche
      col = mix(col, col * vec3(0.50, 0.32, 0.72) + vec3(0.06, 0.02, 0.10), uNight * 0.8);

      // Rayos de sol proyectados desde el mandala y desde el sol
      vec2 cr = P - vec2(1000.0, 152.0); float cd = length(cr); float ca = atan(cr.y, cr.x);
      float rays = pow(0.5 + 0.5 * sin(ca * 16.0 + t * 0.22), 5.0) * 0.7 + pow(0.5 + 0.5 * sin(ca * 7.0 - t * 0.13 + 1.0), 6.0) * 0.6;
      float pulse = 0.55 + 0.45 * sin(cd * 0.018 - t * 1.8);
      float L = rays * pulse * exp(-cd / 650.0) * smoothstep(150.0, 260.0, cd) * (1.0 - smoothstep(300.0, 720.0, P.y)) * 0.3;
      float sa = atan(sr.y, sr.x);
      L += pow(0.5 + 0.5 * sin(sa * 12.0 - t * 0.5), 4.0) * (0.6 + 0.4 * sin(sd * 0.03 - t * 2.2)) * exp(-sd / 380.0) * smoothstep(95.0, 140.0, sd) * 0.32;
      L += exp(-sd / 90.0) * 0.14 * (0.8 + 0.2 * sin(t * 2.0));
      L += exp(-length(P - uMouse) / 170.0) * 0.10;
      L *= 1.0 + uNight * 0.6;
      vec3 light = mix(vec3(1.0, 0.86, 0.55), vec3(1.0, 0.31, 0.64), uNight) * L;
      col = 1.0 - (1.0 - col) * (1.0 - light);

      gl_FragColor = vec4(col, 1.0);
    }`;

  let gl = null, prog = null, uni = {};

  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  }

  function initGL() {
    gl = glCanvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return Promise.reject(new Error("Sin WebGL"));
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    ["uImg", "uMask", "uMask2", "uTime", "uWind", "uTitle", "uSun", "uMouse", "uRip", "uNight"].forEach((n) => {
      uni[n] = gl.getUniformLocation(prog, n);
    });

    const plateReady = plate.complete && plate.naturalWidth ? Promise.resolve(plate) : loadImage(plate.src);
    return Promise.all([plateReady, loadImage("assets/fx-mask.png"), loadImage("assets/fx-mask2.png")]).then(([img, m1, m2]) => {
      texture(img, 0, false);
      texture(m1, 1, true);
      texture(m2, 2, true);
      gl.uniform1i(uni.uImg, 0);
      gl.uniform1i(uni.uMask, 1);
      gl.uniform1i(uni.uMask2, 2);
      resizeCanvases(parseFloat(stage.style.width), parseFloat(stage.style.height));
      drawGL();
      stage.classList.add("gl-ready");
    });
  }

  function texture(img, unit, raw) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function resizeCanvases(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // resolución WebGL limitada para que vaya fluido en cualquier equipo
    const budget = window.innerWidth < 700 ? 0.55e6 : 1.1e6;
    const glScale = Math.min(dpr, 1.25, Math.sqrt(budget / (w * h))) * state.quality;
    glCanvas.width = Math.round(w * glScale);
    glCanvas.height = Math.round(h * glScale);
    if (gl) gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    const s2 = Math.min(dpr, 1.25, Math.sqrt(1.2e6 / (w * h)));
    canvas2d.width = Math.round(w * s2);
    canvas2d.height = Math.round(h * s2);
  }

  function addRipple(x, y, strength) {
    state.ripples.push([x, y, state.t, strength]);
    if (state.ripples.length > 4) state.ripples.shift();
    rings.push({ x, y, age: 0, s: strength });
  }

  function drawGL() {
    if (!gl) return;
    gl.uniform1f(uni.uTime, state.t);
    gl.uniform1f(uni.uWind, state.wind);
    gl.uniform1f(uni.uTitle, state.titleBoost);
    gl.uniform1f(uni.uSun, state.sunAngle);
    gl.uniform1f(uni.uNight, state.night);
    gl.uniform2f(uni.uMouse, state.mouse[0], state.mouse[1]);
    const rip = new Float32Array(16);
    state.ripples.forEach((r, i) => rip.set(r, i * 4));
    gl.uniform4fv(uni.uRip, rip);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ======================================================
     CAPA 2D: siluro, salpicaduras, ondas, notas, pájaros, pétalos
     ====================================================== */
  const fishImg = new Image();
  fishImg.src = "assets/siluro.webp";
  const FISH_BOX = [988, 814];          // posición original del recorte
  const PIVOT = [172, 126];             // centro del cuerpo dentro del recorte
  const WATER_Y = 1060;                 // línea del agua donde entra/sale
  const S0 = 0.22;                      // momento del salto que coincide con la ilustración
  const HEIGHT = 120 / (4 * S0 * (1 - S0));
  const SPAN = (HEIGHT * 4 * (1 - 2 * S0)) / Math.tan((54 * Math.PI) / 180);
  const START_X = 1160 + SPAN * S0;
  const FLIGHT = 1.9;                   // segundos de vuelo (de s=0 a s=1)

  const fishPos = (s) => [START_X - SPAN * s, WATER_Y - HEIGHT * 4 * s * (1 - s)];
  const fishVel = (s) => [-SPAN, -HEIGHT * 4 * (1 - 2 * s)];
  const BASE_ANGLE = Math.atan2(fishVel(S0)[1], fishVel(S0)[0]);

  const fish = { phase: "hold", s: S0, timer: 2.6, under: 0, splashedOut: true, splashedIn: false };
  const drops = [], rings = [], notes = [], sparks = [], petals = [], flock = [];
  let noteTimer = 0, birdTimer = 8, gustTimer = 7;

  function splash(x, y, big) {
    const n = big ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = (big ? 260 : 170) * (0.4 + Math.random());
      drops.push({ x: x + (Math.random() - 0.5) * 40, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2.5 + Math.random() * 4.5, floor: y + 6 });
    }
    addRipple(x, y, big ? 1.0 : 0.6);
    if (window.KFAudio) KFAudio.splash(big);
  }

  function jumpNow() {
    if (fish.phase === "under") {
      fish.phase = "fly";
      fish.s = -0.28;
      fish.splashedOut = false;
      fish.splashedIn = false;
    } else if (fish.phase === "hold") {
      fish.phase = "fly";
    }
  }

  function updateFish(dt) {
    if (fish.phase === "hold") {
      fish.timer -= dt;
      if (fish.timer <= 0) fish.phase = "fly";
    } else if (fish.phase === "fly") {
      fish.s += dt / FLIGHT;
      const [x] = fishPos(fish.s);
      if (!fish.splashedOut && fish.s >= 0) { fish.splashedOut = true; splash(x + 20, WATER_Y, true); }
      if (fish.s > 0 && fish.s < 0.9 && Math.random() < dt * 14) {
        const [px, py] = fishPos(fish.s);
        drops.push({ x: px + (Math.random() - 0.5) * 80, y: py + (Math.random() - 0.3) * 60, vx: (Math.random() - 0.5) * 60, vy: -40, r: 2 + Math.random() * 3, floor: WATER_Y + 4 });
      }
      if (!fish.splashedIn && fish.s >= 1) { fish.splashedIn = true; splash(x, WATER_Y, true); }
      if (fish.s >= 1.32) { fish.phase = "under"; fish.under = 0; fish.timer = 3.5 + Math.random() * 3; }
    } else if (fish.phase === "under") {
      fish.under += dt;
      if (fish.under > fish.timer) { fish.phase = "fly"; fish.s = -0.28; fish.splashedOut = false; fish.splashedIn = false; }
    }
  }

  function drawFish(c) {
    if (!fishImg.complete || !fishImg.naturalWidth) return;
    if (fish.phase === "under") {
      // sombra que vuelve nadando bajo el agua
      const k = Math.min(1, fish.under / fish.timer);
      const x = fishPos(1)[0] + (START_X - fishPos(1)[0]) * k;
      const y = WATER_Y + 18 + Math.sin(fish.under * 3) * 4;
      c.save();
      c.globalAlpha = 0.22 * Math.sin(Math.PI * k);
      c.fillStyle = "#1b0b2e";
      c.beginPath();
      c.ellipse(x, y, 90, 16, Math.sin(fish.under * 2) * 0.05, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }
    const s = fish.s;
    const [x, y] = fishPos(s);
    const v = fishVel(s);
    let ang = Math.atan2(v[1], v[0]) - BASE_ANGLE;
    if (fish.phase === "hold") ang = Math.sin(state.t * 2.4) * 0.025;
    c.save();
    c.beginPath();
    c.rect(0, 0, IW, WATER_Y + 2);      // lo que queda bajo la superficie no se ve
    c.clip();
    c.translate(x, y);
    c.rotate(ang);
    c.drawImage(fishImg, -PIVOT[0], -PIVOT[1]);
    c.restore();
  }

  function fishHit(px, py) {
    if (fish.phase === "under") return false;
    const [x, y] = fishPos(fish.s);
    return Math.hypot(px - x, py - y) < 130 && py < WATER_Y;
  }

  function star(c, x, y, r, rotA) {
    c.save();
    c.translate(x, y);
    c.rotate(rotA);
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.38 : r;
      const a = (i * Math.PI) / 4;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.restore();
  }

  const PALETTE = ["#ff4fa3", "#ff8a1f", "#ffd23f", "#3fbf6f", "#1fb8c9", "#8a4bff"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function emitNotes(x, y, n, burst) {
    for (let i = 0; i < n; i++) {
      notes.push({
        x, y, vx: (burst ? (Math.random() - 0.3) * 160 : 30 + Math.random() * 30), vy: burst ? -80 - Math.random() * 120 : -45 - Math.random() * 20,
        life: 0, max: 2.6 + Math.random(), ch: pick(["♪", "♫", "♬", "♩"]), col: pick(PALETTE), size: 26 + Math.random() * 18, w: Math.random() * 6
      });
    }
  }

  function spawnFlock() {
    const n = 3 + Math.floor(Math.random() * 3);
    const y = 230 + Math.random() * 120;
    for (let i = 0; i < n; i++) flock.push({ x: IW + 40 + i * 38, y: y + (i % 2) * 22 + Math.random() * 10, v: 120 + Math.random() * 20, ph: Math.random() * 6 });
  }

  function gust() {
    state.windTarget = 1;
    setTimeout(() => (state.windTarget = 0), 2200);
    const sources = [[275, 262], [372, 303], [565, 388], [1920, 630], [1724, 790], [1784, 655], [1958, 796], [140, 590]];
    for (let i = 0; i < 16; i++) {
      const [sx, sy] = pick(sources);
      petals.push({ x: sx + (Math.random() - 0.5) * 60, y: sy + (Math.random() - 0.5) * 60, vx: 140 + Math.random() * 160, vy: -30 + Math.random() * 40, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, col: pick(PALETTE), life: 0 });
    }
  }

  function update2D(dt) {
    updateFish(dt);

    drops.forEach((d) => { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; });
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].y > drops[i].floor && drops[i].vy > 0) drops.splice(i, 1);

    rings.forEach((r) => (r.age += dt));
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].age > 2.2) rings.splice(i, 1);

    noteTimer -= dt;
    if (noteTimer <= 0) { emitNotes(500, 585, 1, false); noteTimer = (beat && beat.playing ? 0.45 : 1.1) + Math.random() * 0.6; }
    notes.forEach((n) => { n.life += dt; n.x += n.vx * dt + Math.sin(n.life * 3 + n.w) * 0.6; n.y += n.vy * dt; n.vy *= 0.995; });
    for (let i = notes.length - 1; i >= 0; i--) if (notes[i].life > notes[i].max) notes.splice(i, 1);

    sparks.forEach((s) => { s.life += dt; s.y += s.vy * dt; s.x += s.vx * dt; });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life > sparks[i].max) sparks.splice(i, 1);

    birdTimer -= dt;
    if (birdTimer <= 0) { spawnFlock(); birdTimer = 18 + Math.random() * 16; }
    flock.forEach((b) => { b.x -= b.v * dt; b.y += Math.sin(state.t * 0.8 + b.ph) * 0.3; });
    for (let i = flock.length - 1; i >= 0; i--) if (flock[i].x < -60) flock.splice(i, 1);

    gustTimer -= dt;
    if (gustTimer <= 0) { gust(); gustTimer = 11 + Math.random() * 8; }
    petals.forEach((p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(p.life * 4 + p.rot) * 1.2; p.rot += p.vr * dt; p.vy += 12 * dt; });
    for (let i = petals.length - 1; i >= 0; i--) if (petals[i].x > IW + 40 || petals[i].life > 9) petals.splice(i, 1);
  }

  function draw2D() {
    const c = ctx2d;
    const k = canvas2d.width / IW;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas2d.width, canvas2d.height);
    c.setTransform(k, 0, 0, k, 0, 0);

    // pájaros
    c.strokeStyle = "#3a1d5c";
    c.lineWidth = 3;
    c.lineCap = "round";
    flock.forEach((b) => {
      const f = Math.sin(state.t * 9 + b.ph) * 7;
      c.beginPath();
      c.moveTo(b.x - 14, b.y - f);
      c.quadraticCurveTo(b.x - 6, b.y - 6 - f * 0.3, b.x, b.y);
      c.quadraticCurveTo(b.x + 6, b.y - 6 - f * 0.3, b.x + 14, b.y - f);
      c.stroke();
    });

    // ondas en el agua
    rings.forEach((r) => {
      const a = Math.max(0, 1 - r.age / 2.2);
      c.strokeStyle = `rgba(255,255,255,${0.7 * a * r.s})`;
      c.lineWidth = 3 * a + 1;
      for (let j = 0; j < 2; j++) {
        const rad = 20 + r.age * (110 - j * 35);
        c.beginPath();
        c.ellipse(r.x, r.y, rad, rad * 0.32, 0, 0, Math.PI * 2);
        c.stroke();
      }
    });

    drawFish(c);

    // gotas
    drops.forEach((d) => {
      c.fillStyle = "#ffffff";
      c.strokeStyle = "#1fb8c9";
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.25, Math.atan2(d.vy, d.vx) + Math.PI / 2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });

    // pétalos
    petals.forEach((p) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.col;
      c.strokeStyle = "#3a1d5c";
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    });

    // notas musicales
    c.textAlign = "center";
    c.textBaseline = "middle";
    notes.forEach((n) => {
      const a = Math.min(1, n.life * 3) * Math.max(0, 1 - n.life / n.max);
      c.globalAlpha = a;
      c.font = `700 ${n.size}px Fredoka, sans-serif`;
      c.lineWidth = 5;
      c.strokeStyle = "#2a1240";
      c.strokeText(n.ch, n.x, n.y);
      c.fillStyle = n.col;
      c.fillText(n.ch, n.x, n.y);
    });
    c.globalAlpha = 1;

    // estrellitas del cursor
    sparks.forEach((s) => {
      const a = 1 - s.life / s.max;
      c.globalAlpha = a;
      c.fillStyle = s.col;
      star(c, s.x, s.y, s.r * (0.4 + a * 0.6), s.life * 4);
    });
    c.globalAlpha = 1;
  }

  /* ======================================================
     Bucle principal
     ====================================================== */
  function frame(now) {
    const raw = (now - state.last) / 1000;
    const dt = Math.min(0.05, raw);
    state.last = now;
    if (state.running && state.visible) {
      // calidad adaptable: si el equipo no llega a ~40 fps, se baja la resolución
      state.frames++;
      if (raw > 0.021) state.slow++;
      if (state.frames >= 60) {
        if (state.slow > 20 && state.quality > 0.45) {
          state.quality *= 0.75;
          resizeCanvases(parseFloat(stage.style.width), parseFloat(stage.style.height));
        }
        state.frames = 0; state.slow = 0;
      }
      state.t += dt;
      state.wind += (state.windTarget - state.wind) * Math.min(1, dt * 1.6);
      const night = Math.min(1, Math.max(0, KF.y() / Math.max(1, KF.heroH) * 1.4));
      if (night !== state.night) { state.night = night; dusk.style.opacity = night.toFixed(3); }
      state.titleBoost += ((state.titleHover ? 1 : 0) - state.titleBoost) * Math.min(1, dt * 3);
      state.sunVel *= Math.pow(0.35, dt);
      state.sunAngle += state.sunVel * dt;
      if (Math.abs(state.sunVel) < 0.6) {
        const rest = Math.round(state.sunAngle / (Math.PI * 2)) * Math.PI * 2;
        state.sunAngle += (rest - state.sunAngle) * Math.min(1, dt * 2);
      }
      // cuando ya es de noche (la portada está casi tapada) no se dibuja: así
      // la portada y el túnel 3D no compiten por la tarjeta gráfica
      if (state.night < 0.97) {
        drawGL();
        update2D(dt);
        draw2D();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ======================================================
     Interacción
     ====================================================== */
  const CHORD_CYCLE = ["G", "D", "Em", "C"];
  let chordIdx = 0;
  let suppressClick = false;

  function pulse(el) {
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
  }

  function burstSparks(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.7 + Math.random() * 0.5, r: 8 + Math.random() * 10, col: pick(PALETTE) });
    }
  }

  stage.querySelector(".hot--guitar").addEventListener("click", (e) => {
    if (suppressClick) return;
    const chord = CHORD_CYCLE[chordIdx++ % CHORD_CYCLE.length];
    if (window.KFAudio) KFAudio.strum(chord);
    emitNotes(360, 880, 7, true);
    pulse(e.currentTarget);
  });

  stage.querySelector(".hot--sun").addEventListener("click", (e) => {
    if (suppressClick) return;
    state.sunVel += 9;
    if (window.KFAudio) KFAudio.chime();
    burstSparks(1878, 98, 24);
    pulse(e.currentTarget);
  });

  const titleBtn = stage.querySelector(".hot--title");
  titleBtn.addEventListener("pointerenter", () => (state.titleHover = true));
  titleBtn.addEventListener("pointerleave", () => (state.titleHover = false));
  titleBtn.addEventListener("click", () => {
    if (suppressClick) return;
    burstSparks(1000, 560, 40);
    document.dispatchEvent(new CustomEvent("kf:play", { detail: 0 }));
  });

  stage.querySelectorAll(".cloud-btn").forEach((btn) => {
    btn.addEventListener("pointerenter", () => window.KFAudio && KFAudio.bloop());
    btn.addEventListener("click", (e) => {
      if (suppressClick) { e.preventDefault(); return; }
      const [x, y, w, h] = btn.dataset.rect.split(",").map(Number);
      burstSparks(x + w / 2, y + h / 2, 18);
    });
  });

  // clic en el agua → onda; clic en el siluro → salto
  stage.addEventListener("click", (e) => {
    if (suppressClick || e.target.closest("a,button")) return;
    const [x, y] = toImage(e);
    if (fishHit(x, y)) { burstSparks(x, y, 16); if (window.KFAudio) KFAudio.bloop(); return; }
    if (fish.phase === "under" && Math.abs(x - START_X) < 260 && y > 950) { jumpNow(); return; }
    if (y > 830 && x > 700 && x < 1660) { addRipple(x, y, 0.8); if (window.KFAudio) KFAudio.splash(false); }
  });

  let lastSpark = 0;
  hero.addEventListener("pointermove", (e) => {
    const [x, y] = toImage(e);
    state.mouse = [x, y];
    stage.style.cursor = fishHit(x, y) || (y > 830 && x > 700 && x < 1660) ? "pointer" : "";
    if (e.pointerType === "mouse" && performance.now() - lastSpark > 35) {
      lastSpark = performance.now();
      sparks.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 30, life: 0, max: 0.8, r: 6 + Math.random() * 7, col: pick(PALETTE) });
    }
  });
  hero.addEventListener("pointerleave", () => (state.mouse = [-9999, -9999]));

  // arrastrar para explorar la ilustración en pantallas estrechas
  let drag = null;
  hero.addEventListener("pointerdown", (e) => {
    if (state.maxPan < 40) return;
    drag = { x: e.clientX, pan: state.pan, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 8) drag.moved = true;
    if (drag.moved) {
      state.pan = drag.pan + dx;
      applyPan();
      panHint.classList.add("is-hidden");
    }
  });
  window.addEventListener("pointerup", () => {
    if (drag && drag.moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 50);
    }
    drag = null;
  });

  function tourPan() {
    if (fish.phase === "hold") fish.timer = 2.4;   // el salto empieza al entrar
    // en móvil: paseo inicial por la ilustración (cantante → centro)
    if (state.maxPan < 40 || reduceMotion) return;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 5200);
      state.pan = state.maxPan * 0.85 * Math.sin(Math.PI * k);
      applyPan();
      if (k < 1 && !drag) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // pausa cuando la portada no se ve o la pestaña está oculta
  new IntersectionObserver(([en]) => (state.visible = en.isIntersecting)).observe(hero);
  document.addEventListener("visibilitychange", () => {
    state.running = !document.hidden;
    state.last = performance.now();
  });

  window.addEventListener("resize", layout);
  placeHotspots();
  layout();

  window.KFHero = { tourPan, jump: jumpNow, state, fish };

  if (reduceMotion) return; // imagen estática con el siluro original

  stage.classList.add("fish-live");
  fishImg.onerror = () => stage.classList.remove("fish-live");
  initGL().catch((err) => {
    // sin WebGL (o abierto como archivo local): la capa 2D sigue animando
    console.info("Efectos WebGL desactivados:", err && err.message);
    gl = null;
  });
  requestAnimationFrame(frame);
})();
