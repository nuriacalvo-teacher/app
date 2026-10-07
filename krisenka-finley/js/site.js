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
    document.body.classList.add("entered");   // aparecen el menú de nubes y las zonas interactivas
    player.hidden = false;
    window.KFAudio.setEnabled(withSound);
    if (withSound) B.play();
    setTimeout(() => window.KFHero && KFHero.tourPan(), 700);
    document.dispatchEvent(new Event("kf:entered"));
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
    const c = B.current;
    deckPlay.setAttribute("aria-label", `${on ? "Pausar" : "Reproducir"} ${c.titulo}`);
    $(".deck").classList.toggle("is-on", on);
    // lo que suena ahora: título y portada (de la canción o de su disco)
    $("#deck-title").textContent = c.titulo;
    $("#player-title").textContent = c.titulo;
    const cover = $("#deck-cover");
    if (c.portada && cover.getAttribute("src") !== c.portada) cover.src = c.portada;
    cover.alt = c.disco ? `Portada de «${c.disco.titulo}»` : "";
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
      c.fillStyle = `hsl(${330 + i * 9}, 95%, ${58 + v * 15}%)`;
      c.fillRect(i * bw + 1.5, (h - bh) / 2, bw - 3, bh);
    }
  }

  // el ecualizador solo se dibuja cuando se ve y suena algo
  let vizVisible = false;
  new IntersectionObserver(([en]) => (vizVisible = en.isIntersecting)).observe(viz);
  let lastText = 0, quiet = 0;
  function uiLoop(now) {
    const a = B.audio;
    if (!a.paused || seeking) {
      quiet = 0;
      if (a.duration && now - lastText > 250) {
        lastText = now;
        ring.style.strokeDashoffset = (150.8 * (1 - a.currentTime / a.duration)).toFixed(1);
        if (!seeking) seek.value = Math.round((a.currentTime / a.duration) * 1000);
        time.textContent = `${fmt(a.currentTime)} / ${fmt(a.duration)}`;
      }
      if (vizVisible) drawViz();
    } else if (quiet < 40) {
      // unos fotogramas más para que las barras bajen suaves al pausar
      quiet++;
      if (vizVisible) drawViz();
    }
    requestAnimationFrame(uiLoop);
  }
  requestAnimationFrame(uiLoop);

  /* ---------- Barra superior ---------- */
  const topbar = $("#topbar");
  const hero = $("#inicio");
  const onScroll = () => topbar.classList.toggle("is-on", window.scrollY > KF.heroH * 0.6);
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

  /* ---------- Discos: borde con texto que gira y rayos detrás ---------- */
  $$(".disc").forEach((d, i) => {
    const rim = document.createElement("div");
    rim.className = "disc__rim";
    rim.setAttribute("aria-hidden", "true");
    rim.innerHTML = `<svg viewBox="0 0 100 100"><path id="rim${i}" d="M4.5,50 a45.5,45.5 0 1,1 91,0 a45.5,45.5 0 1,1 -91,0" fill="none"/><text><textPath href="#rim${i}" textLength="283" lengthAdjust="spacing">${esc(d.dataset.rim)}</textPath></text></svg>`;
    d.prepend(rim);
    const face = document.createElement("i");
    face.className = "disc__face";
    d.prepend(face);
    const burst = document.createElement("i");
    burst.className = "disc__burst";
    d.prepend(burst);
  });

  /* ---------- Viaje por el túnel: cada sección se queda fija mientras su
     disco sale del fondo girando, se para para leerlo y sale volando ---------- */
  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const nights = $$(".night");
  let holding = false;
  let vinylHome = null;           // posición de cada vinilo respecto al centro de la pantalla

  // posición de cada sección, guardada (leerla en cada fotograma frena la página)
  let secBox = [];
  KF.onMeasure(() => {
    secBox = nights.map((sec) => ({ sec, top: sec.offsetTop, h: sec.offsetHeight, disc: $(".disc", sec), music: $(".music", sec), shown: null }));
    vinylHome = null;
  });
  KF.measure();
  // k < 0: llega; 0..1: fijada en pantalla
  function flight(k, inEnd, outStart) {
    if (k < inEnd) {
      // llega desde el fondo: diminuto, lejos y girando
      const u = Math.min(1, (inEnd - k) / (inEnd + 0.4));
      return { s: Math.pow(0.02, u), rot: u * u * 900, o: 1 - sm(0.8, 1, u), hold: false };
    }
    if (k > outStart) {
      const v = Math.min(1, (k - outStart) / (1 - outStart));
      return { s: 1.04 + v * 2.6, rot: -v * v * 600, o: 1 - sm(0, 0.85, v), hold: false };
    }
    return { s: 1 + (k - inEnd) * 0.1, rot: 0, o: 1, hold: true };
  }
  // mientras la sección aún no está fija (o ya se suelta), se compensa su
  // desplazamiento para que todo nazca y se vaya justo en el centro de la pantalla
  function centreShift(box, y, vh) {
    if (y < box.top) return y - box.top;
    const end = box.top + box.h - vh;
    return y > end ? y - end : 0;
  }
  function apply(el, f, spin, dy) {
    el.style.transform = `translateY(${(dy || 0).toFixed(1)}px) ${spin ? `rotate(${f.rot.toFixed(1)}deg) ` : ""}scale(${f.s.toFixed(4)})`;
    el.style.opacity = f.o.toFixed(3);
  }
  function show(box, on) {
    if (box.shown === on) return;
    box.shown = on;
    box.sec.style.visibility = on ? "" : "hidden";
  }

  function measureVinyls() {
    const items = $$(".vinyls li");
    const music = $("#musica .music");
    const keep = music.style.transform;
    music.style.transform = "none";
    items.forEach((li) => (li.style.transform = "none"));
    const pin = $("#musica .pin").getBoundingClientRect();
    vinylHome = items.map((li) => {
      const r = li.getBoundingClientRect();
      const d = li.firstElementChild.getBoundingClientRect();
      return { li, btn: li.firstElementChild, name: li.querySelector(".vinyl__name"), x: d.left + d.width / 2 - (pin.left + pin.width / 2), y: d.top + d.height / 2 - (pin.top + pin.height / 2) };
    });
    music.style.transform = keep;
  }

  function travel() {
    holding = false;
    const y = KF.y(), vh = KF.vh;
    secBox.forEach((box) => {
      const k = (y - box.top) / Math.max(1, box.h - vh);
      if (k < -0.75 || k > 1.1) { show(box, false); return; }
      show(box, true);
      if (box.music) {
        // primero llegan el título y el reproductor; con la sección ya fija,
        // los vinilos salen uno tras otro del centro del túnel, girando
        const f = flight(Math.min(k, 0.99), 0.0, 0.88);
        apply(box.music, f, false, centreShift(box, y, vh));
        if (!vinylHome || !vinylHome.length) measureVinyls();
        const n = vinylHome.length;
        const step = Math.min(0.1, 0.5 / Math.max(1, n));
        vinylHome.forEach((v, j) => {
          const e = sm(0.02 + j * step, 0.24 + j * step, k);
          const p = e * e;                       // perspectiva: lejos se mueve poco, cerca se acelera
          const sc = 0.02 + 0.98 * Math.pow(e, 1.5);
          v.li.style.transform = `translate(${(-v.x * (1 - p)).toFixed(1)}px, ${(-v.y * (1 - p)).toFixed(1)}px) scale(${sc.toFixed(3)})`;
          v.li.style.opacity = sm(0, 0.15, e).toFixed(3);
          v.btn.style.transform = `rotate(${((1 - e) * 900).toFixed(0)}deg)`;   // gira el disco, no su nombre
          v.name.style.opacity = sm(0.75, 1, e).toFixed(3);
        });
        if (k > 0.02 + n * step + 0.2 && k < 0.88) holding = true;
      } else {
        const f = flight(k, 0.28, 0.72);
        apply(box.disc, f, true, centreShift(box, y, vh));
        if (f.hold) holding = true;
      }
    });
  }
  window.KFTravel = () => travel();

  if (!reduce) {
    let queued = false;
    const kick = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; travel(); }); };
    window.addEventListener("scroll", kick, { passive: true });
    KF.onMeasure(kick);
    setTimeout(travel, 0);
  }

  // los enlaces internos llevan al momento en que el disco está quieto y legible
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (!sec) return;
    e.preventDefault();
    const vh = window.innerHeight;
    let top = sec.offsetTop;
    if (sec.classList.contains("night")) top += (sec.offsetHeight - vh) * (sec.id === "musica" ? 0.6 : 0.48);
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- Vinilos y caja de CD ---------- */
  // del más nuevo al más antiguo
  D.discos.sort((x, y) => (y.año || 0) - (x.año || 0));
  // disco sin portada: se le dibuja una de colores con su título
  function makeCover(d) {
    const c = document.createElement("canvas");
    c.width = c.height = 600;
    const g = c.getContext("2d");
    const cols = ["#ff4fa3", "#ff8a1f", "#ffd23f", "#1fb8c9", "#8a4bff"];
    for (let i = 0; i < 36; i++) {
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(300, 300); g.arc(300, 300, 520, (i / 36) * Math.PI * 2, ((i + 1) / 36) * Math.PI * 2); g.fill();
    }
    g.fillStyle = "#2a1240";
    g.beginPath(); g.arc(300, 300, 210, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff3dc"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "900 52px Fraunces, Georgia, serif";
    const words = d.titulo.split(" "), lines = [];
    words.forEach((w) => { const l = lines[lines.length - 1]; if (l && (l + " " + w).length < 14) lines[lines.length - 1] = l + " " + w; else lines.push(w); });
    lines.slice(0, 3).forEach((l, i, arr) => g.fillText(l, 300, 300 + (i - (arr.length - 1) / 2) * 58 - (d.año ? 18 : 0)));
    if (d.año) { g.fillStyle = "#ffd23f"; g.font = "700 34px Fredoka, sans-serif"; g.fillText(String(d.año), 300, 300 + lines.slice(0, 3).length * 29 + 20); }
    return c.toDataURL("image/jpeg", 0.85);
  }
  const meta = (a) => [a.tipo, a.año, a.sello].filter(Boolean).join(" · ");
  function renderVinyls() {
    D.discos.forEach((d) => { if (!d.portada || d._auto) { d.portada = makeCover(d); d._auto = true; } });
    $("#vinyls").style.setProperty("--n", D.discos.length);
    $("#vinyls").innerHTML = D.discos.map((a, j) => `
      <li><button class="vinyl" type="button" data-album="${j}" style="--d:${(j * -1.3).toFixed(1)}s" aria-label="Abrir ${esc(a.titulo)}">
        <span class="vinyl__disc"><span class="vinyl__label" style="background-image:url('${esc(a.portada)}')"></span></span>
        <span class="vinyl__sheen" aria-hidden="true"></span>
      </button><span class="vinyl__name">${esc(a.titulo)}</span><span class="vinyl__kind">${esc([a.tipo, a.año].filter(Boolean).join(" · "))}</span></li>`).join("");
  }
  renderVinyls();
  // las portadas dibujadas usan las fuentes de la web: se repintan cuando llegan
  if (document.fonts && D.discos.some((d) => d._auto)) document.fonts.ready.then(() => { renderVinyls(); vinylHome = null; if (!reduce) travel(); });

  /* ---------- Plataformas de streaming ---------- */
  const ICONS = {
    "Spotify": '<circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.5-1 7-.6 10 1M7.6 12.6c2.8-.8 5.6-.4 8 .9M8.3 15.4c2.1-.5 4.2-.3 6 .7" fill="none" stroke="var(--plum)" stroke-width="1.6" stroke-linecap="round"/>',
    "Apple Music": '<path d="M16 3v11.5a3 3 0 1 1-2-2.8V7l-6 1.5v8a3 3 0 1 1-2-2.8V5.5z"/>',
    "YouTube": '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="var(--plum)"/>',
    "Bandcamp": '<path d="M7 6h15l-5 12H2z"/>',
    "Amazon Music": '<path d="M4 9c0-2 1.5-3.5 4-3.5S12 7 12 9v6H9.5v-1.2C8.8 14.6 7.9 15 6.8 15 5.1 15 4 14 4 12.4 4 10.3 6 9.6 9.4 9.4 9.4 8.3 8.9 7.7 8 7.7c-.9 0-1.4.5-1.5 1.3z"/><path d="M3 17.5c5 3 13 3 18 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    "Deezer": '<rect x="2" y="15" width="4" height="4"/><rect x="7" y="15" width="4" height="4"/><rect x="12" y="15" width="4" height="4"/><rect x="17" y="15" width="4" height="4"/><rect x="12" y="10" width="4" height="4"/><rect x="17" y="10" width="4" height="4"/><rect x="17" y="5" width="4" height="4"/>'
  };
  const platformLinks = (list) => list.map((p) => `<a class="platform" href="${esc(p.url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[p.nombre] || '<circle cx="12" cy="12" r="8"/>'}</svg>${esc(p.nombre)}</a>`).join("");
  $$(".platforms").forEach((el) => (el.innerHTML = platformLinks(D.plataformas || [])));

  const dlg = $("#case");
  let caseDisc = null;
  const caseTracks = $("#case-tracks");
  function renderTracks() {
    const list = (caseDisc && caseDisc.canciones) || [];
    caseTracks.hidden = !list.length;
    caseTracks.innerHTML = list.map((c, i) => {
      const on = B.current.disco === caseDisc && B.current.n === i && B.playing;
      return c.archivo
        ? `<li class="${on ? "is-on" : ""}"><button type="button" data-track="${i}" aria-label="${on ? "Pausar" : "Escuchar"} ${esc(c.titulo)}"><span class="case__num">${on ? "❚❚" : "▶"}</span><span class="case__song">${esc(c.titulo)}</span><span class="case__dur">${esc(c.duracion || "")}</span></button></li>`
        : `<li class="is-off"><span><span class="case__num">${i + 1}</span><span class="case__song">${esc(c.titulo)}</span><span class="case__dur">${esc(c.duracion || "")}</span></span></li>`;
    }).join("");
  }
  caseTracks.addEventListener("click", (e) => {
    const b = e.target.closest("[data-track]");
    if (!b) return;
    e.stopPropagation();
    const i = Number(b.dataset.track);
    if (B.current.disco === caseDisc && B.current.n === i) B.toggle();
    else B.playDisc(caseDisc, i);
  });
  B.onChange(() => { if (dlg.open) renderTracks(); });
  const box = $("#case-box");
  let openTimer = null;
  function openCase(j, from) {
    const a = D.discos[j];
    $("#case-cover").src = a.portada;
    $("#case-cover").alt = `Portada de «${a.titulo}»`;
    $("#case-cd").style.setProperty("--cover", `url("${new URL(a.portada, location.href).href}")`);
    $("#case-booklet").textContent = `Krisenka Finley · ${a.titulo}`;
    $("#case-kind").textContent = meta(a);
    $("#case-title").textContent = a.titulo;
    $("#case-note").textContent = a.nota || "";
    $("#case-note").hidden = !a.nota;
    // botón al disco entero si tiene enlace; si no, las plataformas de la artista
    $("#case-link").hidden = !a.enlace;
    if (a.enlace) {
      $("#case-link").href = a.enlace;
      $("#case-link").textContent = a.enlace.includes("bandcamp") ? "Escuchar en Bandcamp" : "Escuchar entero";
    }
    caseDisc = a;
    renderTracks();
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
  const gigs = D.conciertos.map((g) => ({ city: g.ciudad, venue: g.sala, url: g.entradas, when: new Date(g.fecha) })).filter((g) => g.when >= now).sort((a, b) => a.when - b.when);
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  $("#gigs").innerHTML = gigs.length
    ? `<h2>En<br><em>directo.</em></h2><ul class="facts">${gigs.slice(0, 4).map((g) => `
        <li><b>${g.when.getDate()} ${MONTHS[g.when.getMonth()]} · ${esc(g.city)}</b><i>${esc(g.venue)}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">Entradas</a>` : ""}</i></li>`).join("")}</ul>`
    : `<div class="soon"><i aria-hidden="true"></i>Cocinando un disco nuevo</div>
       <h2>Nuevas fechas,<br><em>muy pronto.</em></h2>
       <p>Los próximos conciertos se anunciarán aquí. Mientras tanto, sus directos están en YouTube.</p>
       <a class="btn" href="https://www.youtube.com/krisenka" target="_blank" rel="noopener">Ver directos</a>`;

  /* ---------- Enlaces ---------- */
  $("#links").innerHTML = (D.enlaces || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.nombre)}</a>`).join(" · ");

  /* ---------- Recorrido automático: empieza solo al entrar y se para en
     cuanto el visitante toca la rueda, la pantalla o el teclado ---------- */
  const autoBtn = $("#auto");
  const auto = { on: false, mode: "down", pos: 0, last: 0, wait: 0, t: 0, from: 0 };
  let autoStart = null;
  function setAuto(on) {
    clearTimeout(autoStart);
    auto.on = on;
    auto.mode = "down";
    auto.wait = 0;
    auto.pos = window.scrollY;
    auto.last = window.scrollY;
    KF.autoY = on ? auto.pos : null;
    autoBtn.setAttribute("aria-pressed", String(on));
    autoBtn.querySelector("span").textContent = on ? "Parar recorrido" : "Recorrido automático";
    if (on && !B.playing && window.KFAudio.enabled) B.play();
  }
  autoBtn.addEventListener("click", () => setAuto(!auto.on));
  let userStopped = false;       // si lo para con el botón, no se reanuda solo
  let idle = null;
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, (e) => {
    if (e.target.closest && e.target.closest("#auto, #gate")) return;
    if (!document.body.classList.contains("entered")) return;
    if (auto.on || autoStart) setAuto(false);
    // tras 12 s sin tocar nada, el recorrido sigue desde donde esté
    clearTimeout(idle);
    if (!userStopped && !reduce) idle = setTimeout(() => setAuto(true), 12000);
  }, { passive: true }));
  autoBtn.addEventListener("click", () => { userStopped = !auto.on; clearTimeout(idle); });
  // al entrar arranca el viaje enseguida
  document.addEventListener("kf:entered", () => { if (!reduce) autoStart = setTimeout(() => setAuto(true), 1200); });

  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  let lt = performance.now();
  function autoLoop(now) {
    const dt = Math.min(0.05, (now - lt) / 1000);
    lt = now;
    if (auto.on && !$("#case").open) {
      const vh = KF.vh, max = KF.docH - vh;
      if (Math.abs(window.scrollY - auto.last) > 3) setAuto(false);
      else {
        if (auto.mode === "down") {
          // más despacio mientras un disco está quieto, para poder leerlo
          auto.pos += (vh / (holding ? 9 : 3.2)) * dt;
          if (auto.pos >= max) { auto.pos = max; auto.mode = "end"; auto.wait = 4; }
        } else if (auto.mode === "end") {
          auto.wait -= dt;
          if (auto.wait <= 0) { auto.mode = "up"; auto.t = 0; auto.from = auto.pos; }
        } else if (auto.mode === "up") {
          // vuelta suave al principio y otra vez hacia abajo
          auto.t += dt;
          const u = Math.min(1, auto.t / 10);
          auto.pos = auto.from * (1 - ease(u));
          if (u >= 1) { auto.mode = "rest"; auto.wait = 4; }
        } else {
          auto.wait -= dt;
          if (auto.wait <= 0) auto.mode = "down";
        }
        // las animaciones siguen la posición exacta (con decimales); la página, la redondeada
        KF.autoY = auto.pos;
        window.scrollTo(0, auto.pos);
        auto.last = window.scrollY;
        if (!reduce) travel();
      }
    }
    requestAnimationFrame(autoLoop);
  }
  requestAnimationFrame(autoLoop);
})();
