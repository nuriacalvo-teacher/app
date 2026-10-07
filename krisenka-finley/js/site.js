/* ==========================================================
   Entrada, reproductor, navegación, discos y recorrido automático
   ========================================================== */
(function () {
  "use strict";

  const D = window.KF_DATA;
  const B = window.KFBeat;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ---------- Entrada ---------- */
  const gate = $("#gate");
  const player = $("#player");

  function enter(withSound) {
    gate.classList.add("is-out");
    document.body.classList.remove("lock");
    document.body.classList.add("go");
    player.hidden = false;
    window.KFAudio.setEnabled(withSound);
    if (withSound) B.play();
    setTimeout(() => window.KFHero && KFHero.tourPan(), 700);
  }
  $$("[data-enter]", gate).forEach((b) => b.addEventListener("click", () => enter(b.dataset.enter === "sound")));
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  $("[data-enter='sound']", gate).focus();

  /* ---------- Reproductor (flotante y del apartado Música) ---------- */
  const ring = $("#ring");
  const deckPlay = $("#deck-play");
  const seek = $("#deck-seek");
  const time = $("#deck-time");
  let seeking = false;

  function toggle() {
    if (!window.KFAudio.enabled) window.KFAudio.setEnabled(true);
    B.toggle();
  }
  player.addEventListener("click", toggle);
  deckPlay.addEventListener("click", toggle);
  document.addEventListener("kf:play", toggle);

  B.onChange(() => {
    const on = B.playing;
    player.classList.toggle("is-on", on);
    deckPlay.textContent = on ? "❚❚" : "▶";
    deckPlay.setAttribute("aria-label", on ? "Pausar Back Again" : "Reproducir Back Again");
    $(".deck").classList.toggle("is-on", on);
  });

  seek.addEventListener("input", () => { seeking = true; B.seek(seek.value / 1000); });
  seek.addEventListener("change", () => { seeking = false; });

  const viz = $("#deck-viz");
  function drawViz() {
    const dpr = window.devicePixelRatio || 1;
    const w = viz.clientWidth, h = viz.clientHeight;
    if (!w) return;
    if (viz.width !== Math.round(w * dpr)) { viz.width = Math.round(w * dpr); viz.height = Math.round(h * dpr); }
    const c = viz.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const n = B.bands.length, bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0.04, B.bands[i]);
      const bh = v * h * 0.95;
      c.fillStyle = `hsl(${350 + i * 4}, 95%, ${55 + v * 20}%)`;
      c.fillRect(i * bw + 1.5, (h - bh) / 2, bw - 3, bh);
    }
  }

  function uiLoop() {
    const a = B.audio;
    if (a.duration) {
      ring.style.strokeDashoffset = (150.8 * (1 - a.currentTime / a.duration)).toFixed(1);
      if (!seeking) seek.value = Math.round((a.currentTime / a.duration) * 1000);
      time.textContent = `${fmt(a.currentTime)} / ${fmt(a.duration)}`;
    }
    drawViz();
    requestAnimationFrame(uiLoop);
  }
  requestAnimationFrame(uiLoop);

  /* ---------- Barra superior ---------- */
  const topbar = $("#topbar");
  const hero = $("#inicio");
  const onScroll = () => topbar.classList.toggle("is-on", window.scrollY > hero.offsetHeight * 0.6);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$(".topbar__nav a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id === "trayectoria" ? "bio" : en.target.id;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));

  /* ---------- Discos: borde con texto que gira y entrada al hacer scroll ---------- */
  $$(".disc").forEach((d, i) => {
    d.setAttribute("data-beat", "");
    const rim = document.createElement("div");
    rim.className = "disc__rim";
    rim.setAttribute("aria-hidden", "true");
    rim.innerHTML = `<svg viewBox="0 0 100 100"><path id="rim${i}" d="M4.5,50 a45.5,45.5 0 1,1 91,0 a45.5,45.5 0 1,1 -91,0" fill="none"/><text><textPath href="#rim${i}" textLength="283" lengthAdjust="spacing">${esc(d.dataset.rim)}</textPath></text></svg>`;
    d.prepend(rim);
    const face = document.createElement("i");
    face.className = "disc__face";
    d.prepend(face);
  });

  const discs = $$(".disc");
  function spin() {
    const vh = window.innerHeight;
    discs.forEach((d) => {
      const r = d.parentElement.getBoundingClientRect();
      const k = (r.top + r.height / 2 - vh / 2) / vh;     // 0 = centrado en pantalla
      const a = Math.min(1.2, Math.abs(k));
      const s = 1 - Math.min(a, 1) * 0.45;
      const o = 1 - Math.max(0, (a - 0.45) / 0.5);
      d.style.transform = `rotate(${(k * -35).toFixed(1)}deg) scale(${s.toFixed(3)})`;
      d.style.opacity = Math.max(0, o).toFixed(3);
      d.querySelector(".disc__copy").style.transform = `rotate(${(k * 35).toFixed(1)}deg)`;
    });
  }
  if (!reduce) {
    let queued = false;
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; spin(); });
    }, { passive: true });
    window.addEventListener("resize", spin);
    spin();
  }

  /* ---------- Vinilos y caja de CD ---------- */
  $("#vinyls").innerHTML = D.albums.map((a, j) => `
    <li><button class="vinyl" type="button" data-beat data-album="${j}" style="--d:${(j * -1.3).toFixed(1)}s" aria-label="Abrir ${esc(a.title)}">
      <span class="vinyl__disc"><span class="vinyl__label" style="background-image:url('${esc(a.cover)}')"></span></span>
      <span class="vinyl__sheen" aria-hidden="true"></span>
    </button><span class="vinyl__name">${esc(a.title)}</span><span class="vinyl__kind">${esc(a.kind)}</span></li>`).join("");

  const dlg = $("#case");
  const box = $("#case-box");
  let openTimer = null;
  function openCase(j, from) {
    const a = D.albums[j];
    $("#case-cover").src = a.cover;
    $("#case-cover").alt = `Portada de «${a.title}»`;
    $("#case-cd").style.setProperty("--cover", `url("${new URL(a.cover, location.href).href}")`);
    $("#case-booklet").textContent = `Krisenka Finley · ${a.title}`;
    $("#case-kind").textContent = a.kind;
    $("#case-title").textContent = a.title;
    $("#case-note").textContent = a.note || "";
    $("#case-note").hidden = !a.note;
    $("#case-link").href = a.url;
    $("#case-link").textContent = a.url.includes("bandcamp") ? "Escuchar en Bandcamp" : "Escuchar";
    // la caja sale desde el vinilo pulsado
    const r = from.getBoundingClientRect();
    box.style.setProperty("--fx", `${r.left + r.width / 2 - window.innerWidth / 2}px`);
    box.style.setProperty("--fy", `${r.top + r.height / 2 - window.innerHeight / 2}px`);
    box.classList.remove("is-open", "is-in");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("is-in")));
    clearTimeout(openTimer);
    openTimer = setTimeout(() => box.classList.add("is-open"), reduce ? 0 : 650);
    window.KFAudio.bloop();
  }
  function closeCase() {
    box.classList.remove("is-open");
    setTimeout(() => { box.classList.remove("is-in"); if (dlg.open) dlg.close(); }, reduce ? 0 : 420);
  }
  $("#vinyls").addEventListener("click", (e) => {
    const v = e.target.closest(".vinyl");
    if (v) openCase(Number(v.dataset.album), v);
  });
  $("#case-close").addEventListener("click", closeCase);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeCase(); });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeCase(); });
  box.addEventListener("click", () => box.classList.toggle("is-open"));

  /* ---------- Conciertos ---------- */
  const now = new Date();
  const gigs = D.gigs.map((g) => ({ ...g, when: new Date(g.date) })).filter((g) => g.when >= now).sort((a, b) => a.when - b.when);
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  $("#gigs").innerHTML = gigs.length
    ? `<h2>En<br><em>directo.</em></h2><ul class="facts">${gigs.slice(0, 4).map((g) => `
        <li><b>${g.when.getDate()} ${MONTHS[g.when.getMonth()]} · ${esc(g.city)}</b><i>${esc(g.venue)}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">Entradas</a>` : ""}</i></li>`).join("")}</ul>`
    : `<div class="soon"><i aria-hidden="true"></i>Cocinando un disco nuevo</div>
       <h2>Nuevas fechas,<br><em>muy pronto.</em></h2>
       <p>Los próximos conciertos se anunciarán aquí. Mientras tanto, sus directos están en YouTube.</p>
       <a class="btn" href="https://www.youtube.com/krisenka" target="_blank" rel="noopener">Ver directos</a>`;

  /* ---------- Enlaces ---------- */
  $("#links").innerHTML = D.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a><i>${esc(l.note)}</i></li>`).join("");

  /* ---------- Recorrido automático (baja solo por la página) ---------- */
  const autoBtn = $("#auto");
  const auto = { on: false, pos: 0, last: 0, wait: 0 };
  function setAuto(on) {
    auto.on = on;
    auto.pos = window.scrollY;
    auto.last = window.scrollY;
    autoBtn.setAttribute("aria-pressed", String(on));
    autoBtn.querySelector("span").textContent = on ? "Parar" : "Recorrido automático";
    if (on && !B.playing && window.KFAudio.enabled) B.play();
  }
  autoBtn.addEventListener("click", () => setAuto(!auto.on));
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, (e) => {
    if (auto.on && !(e.target.closest && e.target.closest("#auto"))) setAuto(false);
  }, { passive: true }));
  let lt = performance.now();
  function autoLoop(now) {
    const dt = Math.min(0.05, (now - lt) / 1000);
    lt = now;
    if (auto.on) {
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      if (Math.abs(window.scrollY - auto.last) > 3) setAuto(false);
      else {
        if (auto.wait > 0) auto.wait -= dt;
        else {
          // más despacio cuando un disco está centrado, para poder leerlo
          const centred = discs.some((d) => { const r = d.parentElement.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - vh / 2) < vh * 0.08; });
          auto.pos += (vh / (centred ? 18 : 6)) * dt;
          if (auto.pos >= max) { auto.pos = 0; auto.wait = 3; }
        }
        window.scrollTo(0, auto.pos);
        auto.last = window.scrollY;
      }
    }
    requestAnimationFrame(autoLoop);
  }
  requestAnimationFrame(autoLoop);
})();
