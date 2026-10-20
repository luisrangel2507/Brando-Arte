(function () {
  const D = window.RECORRIDO;
  const $ = (id) => document.getElementById(id);
  const main = $("main");

  // siempre se abre en la portada, sin recordar posición ni #sala-N de visitas anteriores
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const traiaHash = !!location.hash;
  if (traiaHash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
  if (traiaHash) window.addEventListener("load", () => { window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 60); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) window.scrollTo(0, 0); });

  document.title = D.exposicion + " · " + D.pintor;
  $("top-name").textContent = D.pintor;
  $("h-pintor").textContent = D.pintor;
  $("h-expo").textContent = D.exposicion;
  $("h-intro").replaceChildren(...[].concat(D.intro).map((t) => el("p", null, t)));
  if (D.retrato) {
    const f = $("h-retrato");
    const im = new Image();
    im.src = D.retrato;
    im.alt = D.pintor + " junto a una de sus obras";
    f.append(im);
    f.hidden = false;
  }

  if (D.fondo) $("entrada").style.setProperty("--fondo", 'url("' + D.fondo + '")');

  const moneda = (o) => o.moneda || D.moneda || "MXN";
  const precioTxt = (o) => o.precio
    ? new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda(o), maximumFractionDigits: 0 }).format(o.precio) + " " + moneda(o)
    : null;

  const todas = []; // lista plana para navegar en el visor
  const nav = $("top-rooms");

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function marco(o) {
    const m = el("div", o.objeto ? "marco marco--objeto" : "marco");
    m.style.setProperty("--w", o.ancho);
    m.style.setProperty("--h", o.alto);
    if (o.img) {
      const i = new Image();
      i.src = "obras/" + o.img;
      i.alt = o.titulo + (o.tecnica ? ", " + o.tecnica : "");
      i.loading = "lazy";
      m.appendChild(i);
    } else {
      m.appendChild(el("div", "pendiente", "Foto pendiente"));
    }
    return m;
  }

  // controles de la sala en móvil: flechas, contador, puntos y botón de detalles
  function controles(pared, n, primera) {
    const box = el("div", "ctl");
    const prev = el("button", "ctl__flecha ctl__flecha--prev", "‹");
    const next = el("button", "ctl__flecha ctl__flecha--next", "›");
    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Obra anterior");
    next.setAttribute("aria-label", "Obra siguiente");
    const cuenta = el("p", "ctl__cuenta");
    const puntos = el("div", "ctl__puntos");
    puntos.setAttribute("aria-hidden", "true");
    for (let i = 0; i < n; i++) puntos.appendChild(el("span"));
    const ver = el("button", "ctl__ver", "Ver detalles de la obra ");
    ver.type = "button";
    ver.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>');
    let i = 0;
    const pinta = () => {
      i = Math.min(n - 1, Math.max(0, Math.round(pared.scrollLeft / (pared.clientWidth || 1))));
      cuenta.textContent = "Obra " + (i + 1) + " de " + n;
      [...puntos.children].forEach((p, k) => p.classList.toggle("on", k === i));
      prev.disabled = i === 0;
      next.disabled = i === n - 1;
    };
    const ir = (k) => pared.scrollTo({ left: k * pared.clientWidth, behavior: "smooth" });
    prev.addEventListener("click", () => ir(i - 1));
    next.addEventListener("click", () => ir(i + 1));
    ver.addEventListener("click", () => abrir(primera + i));
    pared.addEventListener("scroll", pinta, { passive: true });
    window.addEventListener("resize", pinta);
    pinta();
    box.append(prev, next, cuenta, puntos, ver);
    return box;
  }

  D.salas.forEach((s, si) => {
    const a = el("a", null, s.titulo);
    a.href = "#sala-" + si;
    nav.appendChild(a);

    const sec = el("section", "sala");
    sec.id = "sala-" + si;
    sec.style.setProperty("--pared", s.pared);

    const cuerpo = el("div", "sala__cuerpo");
    const placa = el("div", "placa");
    placa.append(el("h2", null, s.titulo), el("p", "sub", s.subtitulo), s.texto ? el("p", null, s.texto) : document.createDocumentFragment());

    const pared = el("div", "pared");
    pared.tabIndex = 0;
    pared.setAttribute("aria-label", s.titulo + ": obras");
    const primera = todas.length;
    s.obras.forEach((o) => {
      const idx = todas.push(o) - 1;
      const b = el("button", "obra");
      b.type = "button";
      b.append(marco(o));
      const c = el("div", "cartela");
      c.append(el("b", null, o.titulo), document.createTextNode(o.anio));
      const estadoObra = o.estado || "disponible";
      const pt = estadoObra === "vendida" ? "Vendida" : precioTxt(o);
      if (pt) c.append(el("span", "cartela__p", pt));
      b.append(c);
      b.addEventListener("click", () => abrir(idx));
      pared.appendChild(b);
    });

    const ctl = controles(pared, s.obras.length, primera);
    cuerpo.append(placa, pared, ctl);
    const piso = el("div", "piso");
    const sig = D.salas[si + 1];
    const puerta = el("a", "puerta", sig ? "Pasar a la " + sig.titulo.toLowerCase() : "Volver a la entrada");
    puerta.href = sig ? "#sala-" + (si + 1) : "#entrada";
    piso.appendChild(puerta);
    sec.append(cuerpo, piso);
    main.appendChild(sec);
  });

  // marca la sala visible en la barra
  const links = [...nav.children];
  if (links[0]) links[0].setAttribute("aria-current", "true");
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        const n = +e.target.id.split("-")[1];
        links.forEach((l, i) => l.setAttribute("aria-current", i === n ? "true" : "false"));
      }
    });
  }, { threshold: 0.55 });
  document.querySelectorAll(".sala").forEach((s) => io.observe(s));

  // la barra con las salas no se muestra sobre la portada
  const barra = document.querySelector(".top");
  barra.classList.add("top--oculta");
  new IntersectionObserver((es) => {
    barra.classList.toggle("top--oculta", es[0].isIntersecting);
  }, { threshold: 0.5 }).observe($("entrada"));

  /* ---------- visor ---------- */
  const visor = $("visor");
  let actual = 0;
  function pintar() {
    const o = todas[actual];
    const cont = $("v-img");
    cont.replaceChildren(marco(o));
    $("v-titulo").textContent = o.titulo;
    $("v-meta").textContent = [o.anio, o.tecnica, o.medidas === false ? "" : o.ancho + " × " + o.alto + " cm"].filter(Boolean).join(" · ");
    $("v-nota").textContent = o.nota || "";
    compra(o);
  }
  /* ---------- compra ---------- */
  function copiar(texto, area, btn) {
    const ok = () => { btn.textContent = "Copiado"; };
    try {
      navigator.clipboard.writeText(texto).then(ok, () => { area.select(); });
    } catch (e) { area.select(); }
  }

  function compra(o) {
    const box = $("v-compra");
    box.replaceChildren();
    const estado = o.estado || "disponible";
    const fila = el("div", "compra__fila");
    fila.append(
      el("span", "compra__precio", precioTxt(o) || "Precio por consultar"),
      el("span", "chip chip--" + estado, estado === "vendida" ? "Vendida" : estado === "reservada" ? "Reservada" : "Disponible")
    );
    box.append(fila);
    if (estado === "vendida") { box.append(el("p", "compra__nota", "Esta obra ya encontró hogar.")); return; }

    const acc = el("div", "compra__acciones");
    if (o.pago && /^https:\/\//.test(o.pago)) {
      const a = el("a", "btn btn--chico", "Comprar ahora");
      a.href = o.pago; a.target = "_blank"; a.rel = "noopener";
      acc.append(a);
    }
    const b = el("button", o.pago ? "btn btn--linea" : "btn btn--chico", "Preguntar por esta obra");
    b.type = "button";
    b.addEventListener("click", () => consulta(o, box, acc));
    acc.append(b);
    box.append(acc);
  }

  function consulta(o, box, acc) {
    acc.hidden = true;
    const f = el("form", "consulta");
    const campo = (id, texto, tipo) => {
      const l = el("label", null, texto); l.htmlFor = id;
      const i = tipo === "area" ? document.createElement("textarea") : document.createElement("input");
      i.id = id; i.name = id; if (tipo !== "area") i.type = "text"; if (tipo === "area") i.rows = 4;
      return [l, i];
    };
    const [ln, nombre] = campo("c-nombre", "Tu nombre");
    const [lc, ciudad] = campo("c-ciudad", "Ciudad");
    const [lm, msg] = campo("c-msg", "Mensaje", "area");
    nombre.required = true; nombre.autocomplete = "name";
    msg.value = "Hola " + D.pintor + ", me interesa la obra «" + o.titulo + "»" + (o.anio ? " (" + o.anio + ")" : "") + ". ¿Sigue disponible?";
    const enviar = el("button", "btn btn--chico", "Preparar mensaje");
    enviar.type = "submit";
    f.append(ln, nombre, lc, ciudad, lm, msg, enviar);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const texto = msg.value.trim() + "\n\nNombre: " + nombre.value.trim() + (ciudad.value.trim() ? "\nCiudad: " + ciudad.value.trim() : "");
      f.replaceChildren();
      const ta = el("textarea"); ta.id = "c-final"; ta.readOnly = true; ta.rows = 6; ta.value = texto;
      f.append(el("p", "compra__nota", "Tu mensaje está listo. Envíalo para apartar o comprar la obra."), ta);
      const fila = el("div", "compra__acciones");
      const num = String((D.contacto && D.contacto.whatsapp) || "").replace(/\D/g, "");
      if (num) {
        const a = el("a", "btn btn--chico", "Abrir WhatsApp");
        a.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(texto);
        a.target = "_blank"; a.rel = "noopener";
        fila.append(a);
      }
      const cp = el("button", num ? "btn btn--linea" : "btn btn--chico", "Copiar mensaje");
      cp.type = "button";
      cp.addEventListener("click", () => copiar(texto, ta, cp));
      fila.append(cp);
      f.append(fila);
      const mail = D.contacto && D.contacto.email;
      if (mail) f.append(el("p", "compra__nota", "También puedes escribir a " + mail));
    });
    box.append(f);
  }

  function abrir(i) { actual = i; pintar(); visor.showModal(); }
  function mover(d) { actual = (actual + d + todas.length) % todas.length; pintar(); }
  $("v-cerrar").onclick = () => visor.close();
  $("v-prev").onclick = () => mover(-1);
  $("v-next").onclick = () => mover(1);
  visor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") mover(-1);
    if (e.key === "ArrowRight") mover(1);
  });
  visor.addEventListener("click", (e) => { if (e.target === visor) visor.close(); });

  /* ---------- brochazo al pasar de sala en sala ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const sinMov = matchMedia("(prefers-reduced-motion: reduce)");
  let pintando = false;

  function capaBrocha() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "brocha");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs><filter id="brocha-aspero" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035 0.4" numOctaves="3" seed="7" result="r"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="r" scale="7" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs><g filter="url(#brocha-aspero)"></g>';
    document.body.appendChild(svg);
    return svg;
  }

  // franjas anchas con ondulación; las pares van de izquierda a derecha y las impares al revés
  const FRANJAS = [
    "M -15 10 Q 20 2 50 12 T 115 8",
    "M 115 36 Q 80 28 50 38 T -15 34",
    "M -15 62 Q 25 54 55 64 T 115 60",
    "M 115 88 Q 75 80 45 90 T -15 86"
  ];

  const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const lejos = (destino) => Math.abs(destino.getBoundingClientRect().top) > 2;

  // salto inmediato (sin animación ni imán de scroll); reintenta hasta quedar en la sala destino
  async function saltar(destino) {
    for (let i = 0; i < 4 && lejos(destino); i++) {
      const y = Math.round(destino.getBoundingClientRect().top + window.pageYOffset);
      window.scrollTo(0, y);
      document.scrollingElement.scrollTop = y;
      await cuadro();
      await cuadro();
    }
  }

  async function brochazo(destino, color) {
    const raiz = document.documentElement;
    const antes = [raiz.style.scrollBehavior, raiz.style.scrollSnapType];
    raiz.style.scrollBehavior = "auto";
    raiz.style.scrollSnapType = "none";
    const svg = capaBrocha();
    const g = svg.querySelector("g");
    const trazos = [];
    [["#c8a45a", 0], [color || "#2a2220", 170]].forEach(([c, retraso]) => {
      FRANJAS.forEach((d, i) => {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("pathLength", "1");
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", c);
        p.setAttribute("stroke-width", "34");
        p.setAttribute("stroke-linecap", "round");
        p.style.strokeDasharray = "1 1.01";
        p.style.strokeDashoffset = "1";
        g.appendChild(p);
        trazos.push({ p, i, retraso });
      });
    });
    const correr = (desde, hasta, dur) => Promise.all(trazos.map(({ p, i, retraso }) =>
      p.animate([{ strokeDashoffset: desde }, { strokeDashoffset: hasta }],
        { duration: dur, delay: retraso * (desde === 1 ? 1 : 0.6) + i * 70, easing: "cubic-bezier(.6,.05,.3,1)", fill: "forwards" }).finished));
    try {
      await correr(1, 0, 420);          // cubre la pantalla
      await saltar(destino);
      await espera(120);
      await saltar(destino);            // por si el navegador movió el scroll de vuelta
      await correr(0, -1, 420);         // se va dejando la nueva sala
      await saltar(destino);
      await espera(60);
      await saltar(destino);
    } finally {
      svg.remove();
      raiz.style.scrollBehavior = antes[0];
      raiz.style.scrollSnapType = antes[1];
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#sala-"], a.puerta, #top-name');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const destino = document.querySelector(a.getAttribute("href"));
    if (!destino) return;
    e.preventDefault();
    if (sinMov.matches || !Element.prototype.animate) { destino.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (pintando) return;
    pintando = true;
    const pared = getComputedStyle(destino).getPropertyValue("--pared").trim();
    brochazo(destino, pared).finally(() => { pintando = false; });
  });
})();
