/* ==========================================================
   El concierto (de noche): túnel de neón en 3D con Three.js.
   La cámara avanza con el scroll y todo late con «Back Again».
   ========================================================== */
(function () {
  "use strict";

  const canvas = document.getElementById("concert");
  const hero = document.getElementById("inicio");
  const beat = window.KFBeat;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.THREE) { canvas.remove(); return; }

  let R;
  try {
    R = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  } catch (e) { canvas.remove(); return; }
  // resolución moderada: las líneas de neón y el polvo no necesitan más
  let quality = Math.min(window.devicePixelRatio || 1, 1.25);
  R.setPixelRatio(quality);
  R.setClearColor(0x1b0b2e, 1);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 160);
  scene.fog = new THREE.FogExp2(0x1b0b2e, 0.022);
  scene.add(cam);
  const aniso = R.capabilities.getMaxAnisotropy();
  // los colores de la ilustración
  const PALETTE = [0xff4fa3, 0xff8a1f, 0xffd23f, 0x1fb8c9, 0x8a4bff];

  function tex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = aniso;
    return t;
  }
  const glow = (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "#fff"); g.addColorStop(0.25, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
  };
  const glowT = tex(256, 256, glow);
  const beamT = tex(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const additive = (color, opacity, extra) => new THREE.MeshBasicMaterial(Object.assign({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }, extra || {}));

  // túnel de arcos de neón con los colores de la ilustración
  const rings = [];
  for (let i = 0; i < 80; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(9, 0.045, 6, 96, Math.PI * (1.1 + (i % 3) * 0.35)), additive(PALETTE[i % PALETTE.length], 0.5));
    m.position.z = 12 - i * 1.8;
    m.userData.i = i;
    scene.add(m);
    rings.push(m);
  }

  // polvo en espiral
  const N = 2200, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * 6.283, r = 1.5 + Math.random() * 7.2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = 14 - Math.random() * 160;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowT, color: 0xffb0e0, size: 0.2, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  // focos y luz que siguen a la cámara
  const beams = [-5, 0, 5].map((x, i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 48, 1, true), additive(i === 1 ? 0xffd23f : 0xff4fa3, 0.14, { map: beamT }));
    m.position.set(x, 7, -14);
    m.userData = { x, ph: i * 2 };
    cam.add(m);
    return m;
  });
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd23f, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  lamp.scale.set(5, 5, 1);
  cam.add(lamp);

  // ecualizador: 24 barras con las bandas reales de la canción
  const eq = [];
  const eg = new THREE.BoxGeometry(0.2, 1, 0.05);
  eg.translate(0, 0.5, 0);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(eg, additive(PALETTE[i % PALETTE.length], 0.75));
    cam.add(m);
    eq.push(m);
  }

  let mx = 0, my = 0, smx = 0, smy = 0, p = 0, mobile = false, visible = false;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    R.setSize(w, h, false);
    mobile = w < 700;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();
  window.addEventListener("pointermove", (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; });

  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const clock = new THREE.Clock();
  const Z0 = 8, ZL = 120;

  let last = performance.now(), frames = 0, slow = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    last = now;
    const vh = window.innerHeight;
    const heroH = hero.offsetHeight;
    const fade = sm(0.3, 0.85, window.scrollY / heroH);
    canvas.style.opacity = fade.toFixed(3);
    visible = fade > 0.01;
    if (!visible || document.hidden) return;
    // calidad adaptable, igual que en la portada
    frames++;
    if (raw > 0.026) slow++;
    if (frames >= 90) {
      if (slow > 40 && quality > 0.5) { quality *= 0.75; R.setPixelRatio(quality); resize(); }
      frames = 0; slow = 0;
    }

    const t = reduce ? 0 : clock.getElapsedTime();
    const max = Math.max(1, document.documentElement.scrollHeight - vh - heroH * 0.5);
    const target = Math.min(1, Math.max(0, (window.scrollY - heroH * 0.5) / max));
    p += (target - p) * (reduce ? 1 : 0.06);
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    const bass = beat.bass, hit = beat.hit, bands = beat.bands;

    const cz = Z0 - p * ZL + (1 - fade) * 10;
    const sk = reduce ? 0 : bass * 0.05 + hit * 0.07;
    cam.position.set(Math.sin(p * 18) * 0.45 + smx * 1.4 + (Math.random() - 0.5) * sk, Math.sin(p * 12) * 0.3 - smy * 0.7 + (Math.random() - 0.5) * sk, cz);
    cam.rotation.z = Math.sin(p * 9) * 0.04 - smx * 0.03;
    cam.lookAt(smx * 1.2, -smy * 0.5, cz - 10);
    cam.fov = (mobile ? 70 : 55) + bass * 4 + hit * 7;
    cam.updateProjectionMatrix();

    eq.forEach((m, i) => {
      m.scale.y = 0.04 + bands[i] * (mobile ? 1.7 : 2);
      m.position.set((i - 11.5) * 0.62 * (mobile ? 0.6 : 1), mobile ? -5.8 : -5.2, -11);
    });
    rings.forEach((m) => {
      const i = m.userData.i, pu = 1 + bass * 0.06 * Math.sin(i * 0.5 + t * 4) + hit * 0.05;
      m.rotation.z = i * 0.35 + t * (i % 2 ? 0.25 : -0.2);
      m.scale.set(pu, pu, 1);
      m.material.opacity = 0.22 + bass * 0.6 + hit * 0.35;
    });
    dust.rotation.z = t * 0.04;
    dust.material.size = 0.2 + bass * 0.14 + hit * 0.12;
    lamp.position.set(smx * 8, -smy * 5, -7);
    lamp.material.opacity = 0.3 + bass * 0.4 + hit * 0.4;
    beams.forEach((m) => {
      m.rotation.z = (m.userData.x > 0 ? 1 : -1) * 0.22 + Math.sin(t * 0.6 + m.userData.ph) * 0.2;
      m.rotation.x = Math.cos(t * 0.5 + m.userData.ph) * 0.1;
      m.material.opacity = 0.1 + bass * 0.25;
    });
    R.render(scene, cam);
  }
  requestAnimationFrame(frame);
})();
