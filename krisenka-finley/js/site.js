/* ==========================================================
   Lógica del sitio: entrada, navegación, música, gira y contacto
   ========================================================== */
(function () {
  "use strict";

  const D = window.KF_DATA;
  const A = window.KFAudio;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------- Entrada ---------- */
  const intro = $("#intro");
  const soundBtn = $("#sound-toggle");

  function setSound(on) {
    A.setAmbience(on);
    soundBtn.setAttribute("aria-pressed", String(on));
    store.set("kf-sound", on ? "1" : "0");
  }

  function enter(withSound) {
    intro.classList.add("is-gone");
    if (withSound) setSound(true);
    try { sessionStorage.setItem("kf-entered", "1"); } catch (e) { /* nada */ }
    setTimeout(() => window.KFHero && KFHero.tourPan(), 700);
  }

  $$("[data-enter]", intro).forEach((b) => b.addEventListener("click", () => enter(b.dataset.enter === "sound")));
  let entered = false;
  try { entered = sessionStorage.getItem("kf-entered") === "1"; } catch (e) { /* nada */ }
  if (entered) {
    intro.classList.add("is-gone");
  } else {
    $("[data-enter='sound']", intro).focus();
  }
  soundBtn.addEventListener("click", () => setSound(soundBtn.getAttribute("aria-pressed") !== "true"));

  /* ---------- Barra superior y enlace activo ---------- */
  const topbar = $("#topbar");
  const hero = $("#inicio");
  const onScroll = () => {
    const narrow = window.innerWidth < 900;
    topbar.classList.toggle("is-on", narrow || window.scrollY > hero.offsetHeight * 0.55);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  const navLinks = $$(".topbar__nav a");
  const sectionSpy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => sectionSpy.observe(s));

  /* ---------- Revelado al hacer scroll ---------- */
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); revealer.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => revealer.observe(el));

  /* ---------- Música ---------- */
  const list = $("#tracks");
  list.innerHTML = D.tracks.map((t, i) => `
    <li class="track" data-i="${i}">
      <button class="track__btn" aria-label="Reproducir ${esc(t.title)}">▶</button>
      <span class="track__name">${esc(t.title)}${t.note ? `<small>${esc(t.note)}</small>` : ""}</span>
      <span class="track__time">${esc(t.time)}</span>
    </li>`).join("");

  const vinyl = $("#vinyl");
  const mini = $("#mini");
  const miniPlay = $("#mini-play");
  let lastIndex = 0;

  function toggleTrack(i) {
    if (A.isPlaying() && lastIndex === i) A.stopTrack();
    else { lastIndex = i; A.playTrack(D.tracks[i], i); }
  }

  list.addEventListener("click", (e) => {
    const li = e.target.closest(".track");
    if (li) toggleTrack(Number(li.dataset.i));
  });
  miniPlay.addEventListener("click", () => toggleTrack(lastIndex));
  document.addEventListener("kf:play", (e) => toggleTrack(e.detail || 0));

  A.onChange(({ playing, index }) => {
    $$(".track", list).forEach((li) => {
      const on = playing && Number(li.dataset.i) === index;
      li.classList.toggle("is-playing", on);
      const b = $(".track__btn", li);
      b.textContent = on ? "❚❚" : "▶";
      b.setAttribute("aria-label", (on ? "Pausar " : "Reproducir ") + D.tracks[Number(li.dataset.i)].title);
    });
    vinyl.classList.toggle("is-spinning", playing);
    vinyl.classList.toggle("is-out", playing);
    if (playing || !mini.hidden) {
      mini.hidden = false;
      $("#mini-title").textContent = D.tracks[lastIndex].title;
      miniPlay.textContent = playing ? "❚❚" : "▶";
      miniPlay.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
    }
    if (playing) startViz();
  });

  /* visualizadores de frecuencias */
  const viz = $("#viz"), miniViz = $("#mini-viz");
  let vizOn = false;
  function startViz() {
    if (vizOn) return;
    vizOn = true;
    const data = new Uint8Array(128);
    const draw = () => {
      const an = A.analyser;
      if (!an) { vizOn = false; return; }
      an.getByteFrequencyData(data);
      paintBars(viz, data, 48);
      paintBars(miniViz, data, 16);
      if (A.isPlaying()) requestAnimationFrame(draw);
      else { vizOn = false; clearCanvas(viz); clearCanvas(miniViz); }
    };
    requestAnimationFrame(draw);
  }
  function clearCanvas(cv) { cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
  function paintBars(cv, data, n) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = data[Math.floor((i / n) * 80)] / 255;
      const bh = Math.max(2, v * h * 0.95);
      c.fillStyle = `hsl(${(i / n) * 300 + performance.now() / 30}, 90%, 62%)`;
      c.beginPath();
      if (c.roundRect) c.roundRect(i * bw + 2, h - bh, bw - 4, bh, 4); else c.rect(i * bw + 2, h - bh, bw - 4, bh);
      c.fill();
    }
  }

  /* ---------- Gira ---------- */
  const tour = $("#tour");
  const now = new Date();
  const gigs = D.gigs.map((g) => ({ ...g, when: new Date(g.date) }));
  const COLORS = ["#ff4fa3", "#ff8a1f", "#ffd23f", "#1fb8c9", "#8a4bff", "#3fbf6f"];
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const STATUS = {
    tickets: () => `<a class="btn btn--small" href="${esc(D.ticketsUrl)}" rel="noopener">Entradas</a>`,
    last: () => `<a class="btn btn--small" href="${esc(D.ticketsUrl)}" rel="noopener">Entradas</a><span class="tag tag--last">¡Últimas!</span>`,
    sold: () => `<span class="tag tag--sold">Agotado</span>`,
    free: () => `<span class="tag tag--free">Gratis</span>`,
    past: () => ""
  };

  function renderTour(filter) {
    const sel = gigs.filter((g) => (filter === "past" ? g.when < now : g.when >= now));
    if (filter === "past") sel.reverse();
    tour.innerHTML = sel.map((g, i) => {
      const past = g.when < now;
      const idx = gigs.indexOf(g);
      return `<li class="gig reveal in ${past ? "gig--past" : ""}" style="--c:${COLORS[i % COLORS.length]}">
        <div class="gig__date"><b>${g.when.getDate()}</b><span>${MONTHS[g.when.getMonth()]} ${String(g.when.getFullYear()).slice(2)}</span></div>
        <div><p class="gig__city">${esc(g.city)}</p><p class="gig__venue">${esc(g.venue)} · ${g.when.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} h</p></div>
        <div class="gig__actions">${past ? "" : (STATUS[g.status] || STATUS.tickets)()}${past ? "" : `<button class="ics" data-gig="${idx}">+ Calendario</button>`}</div>
      </li>`;
    }).join("") || `<li class="gig"><p>Pronto anunciaremos nuevas fechas ✿</p></li>`;
  }

  $$(".tour-filter button").forEach((b) => b.addEventListener("click", () => {
    $$(".tour-filter button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    renderTour(b.dataset.filter);
  }));
  renderTour("next");

  tour.addEventListener("click", (e) => {
    const b = e.target.closest(".ics");
    if (b) downloadICS(gigs[Number(b.dataset.gig)]);
  });

  function downloadICS(g) {
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const end = new Date(g.when.getTime() + 2 * 3600 * 1000);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Krisenka Finley//Gira//ES", "BEGIN:VEVENT",
      `UID:${fmt(g.when)}-${g.city.replace(/\W/g, "")}@krisenkafinley`,
      `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(g.when)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:Krisenka Finley en ${g.city}`, `LOCATION:${g.venue}\\, ${g.city}`,
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `krisenka-finley-${g.city.toLowerCase().replace(/\W+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // cuenta atrás al próximo concierto
  const cd = $("#countdown");
  const next = gigs.find((g) => g.when >= now);
  function tick() {
    if (!next) { cd.hidden = true; return; }
    const ms = Math.max(0, next.when - new Date());
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    cd.innerHTML = `<p class="countdown__label">Próximo concierto: <b>${esc(next.city)}</b> · ${esc(next.venue)}</p>` +
      [[d, "días"], [h, "horas"], [m, "min"], [s, "seg"]].map(([v, l]) => `<div class="countdown__cell"><b>${String(v).padStart(2, "0")}</b><span>${l}</span></div>`).join("");
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Contacto (abre el correo del visitante) ---------- */
  const form = $("#contact-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $(".form__status", form);
    if (!form.checkValidity()) { status.textContent = "Rellena nombre, un email válido y el mensaje."; form.reportValidity(); return; }
    const f = new FormData(form);
    const subject = `[${f.get("motivo")}] Mensaje de ${f.get("nombre")}`;
    const body = `${f.get("mensaje")}\n\n— ${f.get("nombre")} (${f.get("email")})`;
    window.location.href = `mailto:${D.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = "¡Gracias! Se abrirá tu programa de correo para enviarlo ✿";
  });

  const news = $("#news-form");
  const newsOk = $(".news__ok");
  if (store.get("kf-news")) newsOk.textContent = "Ya estás en la lista ✿";
  news.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#news-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { newsOk.textContent = "Ese email no parece válido."; return; }
    // Conectar aquí con el servicio de boletines (Mailchimp, Brevo…)
    store.set("kf-news", email);
    newsOk.textContent = "¡Bienvenida/o a la familia psicodélica! ✿";
    news.reset();
    A.chime();
  });
})();
