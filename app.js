(function () {
  const D = window.RECORRIDO;
  document.documentElement.classList.add("js");
  const $ = (id) => document.getElementById(id);
  const main = $("main");

  // siempre se abre en la portada, sin recordar posición ni #sala-N de visitas anteriores
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const traiaHash = !!location.hash;
  if (traiaHash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
  if (traiaHash) window.addEventListener("load", () => { window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 60); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) window.scrollTo(0, 0); });

  /* ---------- servidor: ventas, pago y estadísticas (todo opcional: sin servidor el sitio sigue funcionando) ---------- */
  const ventas = new Set();
  let checkoutActivo = false;
  function evento(t, id) {
    try {
      const b = JSON.stringify({ t, id });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/evento", new Blob([b], { type: "application/json" })))) {
        fetch("/api/evento", { method: "POST", body: b, keepalive: true });
      }
    } catch (e) { /* sin estadísticas */ }
  }
  try {
    if (!sessionStorage.getItem("visto")) { sessionStorage.setItem("visto", "1"); evento("visita"); }
  } catch (e) { evento("visita"); }

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

  const estadoDe = (o) => (ventas.has(o._id) ? "vendida" : o.estado || "disponible");
  const textoCartela = (o) => (estadoDe(o) === "vendida" ? "Vendida" : precioTxt(o));
  function refrescarCartela(o) {
    if (!o._cp) return;
    const t = textoCartela(o);
    o._cp.textContent = t || "";
    o._cp.hidden = !t;
  }

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

  const A = D.artista || {};
  const textosArtista = [].concat(A.texto || []).filter(Boolean);
  const hayArtista = textosArtista.length > 0;

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
      o._id = o.id || (o.img ? o.img.replace(/\.[^.]+$/, "") : "obra-" + (idx + 1));
      const b = el("button", "obra");
      b.type = "button";
      b.append(marco(o));
      const c = el("div", "cartela");
      c.append(el("b", null, o.titulo), document.createTextNode(o.anio));
      o._cp = el("span", "cartela__p");
      c.append(o._cp);
      refrescarCartela(o);
      b.append(c);
      b.addEventListener("click", () => abrir(idx));
      pared.appendChild(b);
    });

    const ctl = controles(pared, s.obras.length, primera);
    cuerpo.append(placa, pared, ctl);
    const piso = el("div", "piso");
    const sig = D.salas[si + 1];
    const puerta = el("a", "puerta", sig ? "Pasar a la " + sig.titulo.toLowerCase() : hayArtista ? "Conocer al artista" : "Volver a la entrada");
    puerta.href = sig ? "#sala-" + (si + 1) : hayArtista ? "#artista" : "#entrada";
    piso.appendChild(puerta);
    sec.append(cuerpo, piso);
    main.appendChild(sec);
  });

  if (hayArtista) {
    const link = el("a", null, "El artista");
    link.href = "#artista";
    nav.appendChild(link);
    const sec = el("section", "artista");
    sec.id = "artista";
    const cuerpo = el("div", A.foto ? "artista__cuerpo" : "artista__cuerpo artista__cuerpo--solo");
    if (A.foto) {
      const f = el("figure", "artista__foto");
      const im = new Image();
      im.src = "obras/" + A.foto;
      im.alt = D.pintor;
      im.loading = "lazy";
      f.append(im);
      cuerpo.append(f);
    }
    const tx = el("div", "artista__texto");
    tx.append(el("h2", null, A.titulo || "Sobre el artista"), el("p", "sub", D.pintor));
    textosArtista.forEach((t) => tx.append(el("p", null, t)));
    const datos = [].concat(A.datos || []).filter((d) => d && (d.anio || d.texto));
    if (datos.length) {
      const ul = el("ul", "artista__datos");
      datos.forEach((d) => { const li = el("li"); li.append(el("b", null, d.anio || ""), document.createTextNode(d.texto || "")); ul.append(li); });
      tx.append(ul);
    }
    cuerpo.append(tx);
    const piso = el("div", "piso");
    const pu = el("a", "puerta", "Volver a la entrada");
    pu.href = "#entrada";
    piso.append(pu);
    sec.append(cuerpo, piso);
    main.appendChild(sec);
  }

  // marca la sala visible en la barra
  const links = [...nav.children];
  if (links[0]) links[0].setAttribute("aria-current", "true");
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("viva");
        const n = e.target.id === "artista" ? links.length - 1 : +e.target.id.split("-")[1];
        links.forEach((l, i) => l.setAttribute("aria-current", i === n ? "true" : "false"));
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".sala, .artista").forEach((s) => io.observe(s));

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
    const m = marco(o);
    cont.replaceChildren(m);
    activarZoom(m, cont, o);
    evento("obra", o._id);
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

  // aviso breve; dentro del visor si está abierto (el visor tapa todo lo demás)
  const aviso = el("div", "aviso");
  aviso.setAttribute("role", "status");
  aviso.hidden = true;
  let avisoT = 0;
  function avisar(msg, ms) {
    aviso.textContent = msg;
    (visor.open ? visor : document.body).append(aviso);
    aviso.hidden = false;
    clearTimeout(avisoT);
    avisoT = setTimeout(() => { aviso.hidden = true; }, ms || 5000);
  }

  let pagando = null;
  async function pagar(o, btn) {
    const txt = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Abriendo el pago…";
    evento("compra_click", o._id);
    try {
      const r = await fetch("/api/comprar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o._id }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && /^https:\/\//.test(d.url)) { pagando = { btn, txt }; location.href = d.url; return; }
      if (r.status === 409) { ventas.add(o._id); refrescar(); }
      avisar(d.error || "No pudimos abrir el pago. Intenta de nuevo o pregúntanos por la obra.");
    } catch (e) {
      avisar("No pudimos abrir el pago. Intenta de nuevo o pregúntanos por la obra.");
    }
    btn.disabled = false;
    btn.textContent = txt;
  }
  // al volver con "atrás" desde Mercado Pago, el botón queda como estaba
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && pagando) { pagando.btn.disabled = false; pagando.btn.textContent = pagando.txt; pagando = null; }
  });

  function refrescar() {
    todas.forEach(refrescarCartela);
    if (visor.open) compra(todas[actual]);
  }

  function compra(o) {
    const box = $("v-compra");
    box.replaceChildren();
    const estado = estadoDe(o);
    const fila = el("div", "compra__fila");
    fila.append(
      el("span", "compra__precio", precioTxt(o) || "Precio por consultar"),
      el("span", "chip chip--" + estado, estado === "vendida" ? "Vendida" : estado === "reservada" ? "Reservada" : "Disponible")
    );
    box.append(fila);
    if (estado === "vendida") { box.append(el("p", "compra__nota", "Esta obra ya encontró hogar.")); return; }

    const acc = el("div", "compra__acciones");
    if (checkoutActivo && Number(o.precio) > 0) {
      const a = el("button", "btn btn--chico", "Comprar ahora");
      a.type = "button";
      a.addEventListener("click", () => pagar(o, a));
      acc.append(a);
    } else if (o.pago && /^https:\/\//.test(o.pago)) {
      const a = el("a", "btn btn--chico", "Comprar ahora");
      a.href = o.pago; a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", () => evento("compra_click", o._id));
      acc.append(a);
    }
    const b = el("button", acc.children.length ? "btn btn--linea" : "btn btn--chico", "Preguntar por esta obra");
    b.type = "button";
    b.addEventListener("click", () => { evento("consulta", o._id); consulta(o, box, acc); });
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

  /* ---------- zoom: pellizco, rueda, doble toque/clic y arrastre ---------- */
  function activarZoom(marcoEl, cont, o) {
    const img = marcoEl.querySelector("img");
    if (!img) return;
    const sugerencia = el("p", "zoomhint", matchMedia("(pointer: coarse)").matches ? "Pellizca o toca dos veces para acercar" : "Rueda del mouse o doble clic para acercar");
    cont.append(sugerencia);
    let s = 1, x = 0, y = 0, avisado = false;
    const dedos = new Map();
    let gesto = null, ultimoToque = null, tocoHace = 0;
    const limitar = () => {
      s = Math.min(5, Math.max(1, s));
      const mx = (marcoEl.clientWidth * (s - 1)) / 2, my = (marcoEl.clientHeight * (s - 1)) / 2;
      x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y));
    };
    const aplicar = () => {
      limitar();
      img.style.transform = s > 1.001 ? "translate(" + x + "px," + y + "px) scale(" + s + ")" : "";
      marcoEl.classList.toggle("marco--zoom", s > 1.001);
      if (s > 1.001 && !avisado) { avisado = true; sugerencia.hidden = true; evento("zoom", o._id); }
    };
    // acerca manteniendo bajo el dedo el punto (cx, cy), medido desde el centro del marco
    const zoomEn = (cx, cy, nuevo) => {
      nuevo = Math.min(5, Math.max(1, nuevo));
      const k = nuevo / s;
      x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = nuevo;
      aplicar();
    };
    const centro = (e) => { const r = marcoEl.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
    const medir = () => {
      const p = [...dedos.values()];
      return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2 };
    };

    marcoEl.addEventListener("pointerdown", (e) => {
      marcoEl.setPointerCapture(e.pointerId);
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dedos.size === 2) { const m = medir(); gesto = { d: m.d, s }; }
    });
    marcoEl.addEventListener("pointermove", (e) => {
      const p = dedos.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (dedos.size === 2 && gesto) {
        const m = medir(), r = marcoEl.getBoundingClientRect();
        zoomEn(m.cx - r.left - r.width / 2, m.cy - r.top - r.height / 2, gesto.s * (m.d / gesto.d));
      } else if (dedos.size === 1 && s > 1.001) {
        x += dx; y += dy; aplicar();
      }
    });
    const soltar = (e) => {
      const hubo = dedos.delete(e.pointerId);
      if (dedos.size < 2) gesto = null;
      if (!hubo || e.type === "pointercancel" || e.pointerType !== "touch") return;
      const ahora = Date.now();
      tocoHace = ahora;
      if (ultimoToque && ahora - ultimoToque.t < 380 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 30 && dedos.size === 0) {
        const [cx, cy] = centro(e);
        if (s > 1.001) { s = 1; x = 0; y = 0; aplicar(); } else zoomEn(cx, cy, 2.6);
        ultimoToque = null;
      } else {
        ultimoToque = { t: ahora, x: e.clientX, y: e.clientY };
      }
    };
    marcoEl.addEventListener("pointerup", soltar);
    marcoEl.addEventListener("pointercancel", soltar);
    marcoEl.addEventListener("dblclick", (e) => {
      if (Date.now() - tocoHace < 700) return; // el doble toque ya lo atendió el gesto táctil
      const [cx, cy] = centro(e);
      if (s > 1.001) { s = 1; x = 0; y = 0; aplicar(); } else zoomEn(cx, cy, 2.6);
    });
    marcoEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [cx, cy] = centro(e);
      zoomEn(cx, cy, s * (e.deltaY < 0 ? 1.18 : 1 / 1.18));
    }, { passive: false });
  }

  /* ---------- compartir una obra ---------- */
  $("v-compartir").addEventListener("click", async () => {
    const o = todas[actual];
    const url = location.origin + "/?obra=" + encodeURIComponent(o._id);
    evento("compartir", o._id);
    try {
      if (navigator.share) { await navigator.share({ title: (o.titulo || "Obra") + " · " + D.pintor, text: "Una obra de " + D.pintor, url }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); avisar("Enlace copiado"); }
    catch (e) { window.prompt("Copia este enlace:", url); }
  });

  /* ---------- estado de ventas y cobro desde el servidor ---------- */
  async function cargarConfig() {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      if (!r.ok) return;
      const c = await r.json();
      checkoutActivo = !!c.checkout;
      (c.vendidas || []).forEach((id) => ventas.add(id));
      refrescar();
    } catch (e) { /* sin servidor: se usan los datos de obras.js */ }
  }
  cargarConfig();

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

  /* ---------- flashes de cámaras fotográficas (transición de las salas con transicion: "flash") ---------- */
  // Cámara mirrorless profesional con el flash emergente levantado (sin marcas ni textos).
  // k = sufijo único para los ids de los degradados.
  function camaraSvg(tipo, k) {
    const d = (id) => id + k;
    const estrias = (cx, cy, r, n, largo, ancho, color) => [...Array(n)].map((_, i) => {
      const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      return `<line x1="${(cx + c * (r - largo)).toFixed(2)}" y1="${(cy + s * (r - largo)).toFixed(2)}" x2="${(cx + c * r).toFixed(2)}" y2="${(cy + s * r).toFixed(2)}" stroke="${color}" stroke-width="${ancho}"/>`;
    }).join("");
    return `<svg viewBox="0 0 131 120" aria-hidden="true"><defs>
  <linearGradient id="${d('cu')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3f"/><stop offset=".25" stop-color="#232327"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>
  <linearGradient id="${d('cb')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1a1d"/><stop offset=".5" stop-color="#2f2f34"/><stop offset="1" stop-color="#151518"/></linearGradient>
  <linearGradient id="${d('me')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dce1"/><stop offset=".45" stop-color="#60636a"/><stop offset="1" stop-color="#aeb2b9"/></linearGradient>
  <linearGradient id="${d('ba')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b4d54"/><stop offset=".5" stop-color="#141518"/><stop offset="1" stop-color="#34363b"/></linearGradient>
  <linearGradient id="${d('fl')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f3efe2"/><stop offset="1" stop-color="#cfd3dc"/></linearGradient>
  <radialGradient id="${d('vi')}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0a0604"/><stop offset=".1" stop-color="#e98f3a"/><stop offset=".2" stop-color="#9a5420"/><stop offset=".33" stop-color="#5b2c8f"/><stop offset=".48" stop-color="#2fa36a"/><stop offset=".62" stop-color="#2d5fc0"/><stop offset=".78" stop-color="#101a3a"/><stop offset="1" stop-color="#040508"/></radialGradient>
  <radialGradient id="${d('br')}" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#fff" stop-opacity="0"/><stop offset=".93" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <pattern id="${d('pa')}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="1.3" cy="1.3" r=".62" fill="#000" opacity=".6"/><circle cx="0" cy="0" r=".4" fill="#6d6d74" opacity=".25"/></pattern></defs>
  <!-- flash emergente -->
  <path d="M70 26 72 15h14l2 11z" fill="#141416" stroke="#050506" stroke-width=".6"/>
  <path d="M73 25h12l-1 6H74z" fill="#2b2c31"/>
  <path d="M68 5.2h24.6l2 9.6H66z" fill="#17171a" stroke="#050506" stroke-width=".7"/>
  <rect x="69" y="6.6" width="22.6" height="7.2" rx="1.2" fill="url(#${d('fl')})" stroke="#8f939c" stroke-width=".7"/>
  <g stroke="#b3bccd" stroke-width=".45">${[...Array(16)].map((_, i) => `<line x1="${70.4 + i * 1.35}" y1="7.4" x2="${70.4 + i * 1.35}" y2="13"/>`).join('')}</g>
  <!-- cuerpo -->
  <rect x="3.5" y="30" width="124" height="83" rx="10" fill="url(#${d('cu')})"/>
  <path d="M3.5 48c0-9 6-16 15-16h28v81H14a10.5 10.5 0 0 1-10.5-10.5z" fill="url(#${d('cb')})"/>
  <path d="M3.5 51h42v62H14a10.5 10.5 0 0 1-10.5-10.5z" fill="url(#${d('pa')})"/>
  <path d="M127.5 52v50a11 11 0 0 1-11 11h-6V52z" fill="url(#${d('pa')})" opacity=".8"/>
  <rect x="3.5" y="30" width="124" height="3.2" rx="1.6" fill="#6a6c73" opacity=".55"/>
  <!-- prisma -->
  <path d="M58 46c2-9 6-16 14-18h24c8 2 12 9 14 18z" fill="url(#${d('cu')})" stroke="#060607" stroke-width=".8"/>
  <path d="M63 40c2-6 5-10 10-11.4h22c5 1.4 8 5.4 10 11.4" fill="none" stroke="#5a5c63" stroke-width=".6" opacity=".7"/>
  <!-- dial de modos, pantalla y botón rojo -->
  <ellipse cx="20.5" cy="33" rx="11.5" ry="4.2" fill="#0c0c0e"/>
  <path d="M9.2 31.4v-3.2c0-2.4 5-4.2 11.3-4.2s11.3 1.8 11.3 4.2v3.2c0 2.4-5 4.2-11.3 4.2S9.2 33.8 9.2 31.4z" fill="url(#${d('ba')})" stroke="#050506" stroke-width=".6"/>
  <ellipse cx="20.5" cy="28.2" rx="9.4" ry="3.2" fill="#2a2b30"/>
  <g stroke="#8d9099" stroke-width=".5">${[...Array(14)].map((_, i) => { const a = i / 14 * 6.283; return `<line x1="${(20.5 + Math.cos(a) * 8.2).toFixed(1)}" y1="${(28.2 + Math.sin(a) * 2.7).toFixed(1)}" x2="${(20.5 + Math.cos(a) * 9.4).toFixed(1)}" y2="${(28.2 + Math.sin(a) * 3.2).toFixed(1)}"/>`; }).join('')}</g>
  <rect x="37" y="31.5" width="21" height="6.2" rx=".9" fill="#a9b4bd" stroke="#0a0a0c" stroke-width=".8"/>
  <rect x="38.2" y="32.6" width="18.6" height="4" fill="#c4ced6"/>
  <circle cx="33" cy="36.8" r="2.2" fill="#c0262c" stroke="#3a0e10" stroke-width=".5"/><circle cx="32.3" cy="36.1" r=".7" fill="#ff9a9a" opacity=".7"/>
  <!-- botón de disparo -->
  <circle cx="21.8" cy="46.4" r="6.4" fill="#0a0a0c"/><circle cx="21.8" cy="46.4" r="5.4" fill="url(#${d('ba')})" stroke="#4a4c52" stroke-width=".5"/><ellipse cx="20.4" cy="44.6" rx="2.6" ry="1.5" fill="#fff" opacity=".22"/>
  <circle cx="44.2" cy="43.6" r="2.6" fill="#101012" stroke="#6a6c72" stroke-width=".5"/><circle cx="44.2" cy="43.6" r="1.3" fill="#cfd3da" opacity=".7"/>
  <circle cx="52.4" cy="44.2" r=".9" fill="#050506"/>
  <!-- dial derecho -->
  <ellipse cx="107" cy="34" rx="8.4" ry="3.2" fill="#0c0c0e"/>
  <path d="M98.6 32.6v-3c0-1.8 3.7-3.2 8.4-3.2s8.4 1.4 8.4 3.2v3c0 1.8-3.7 3.2-8.4 3.2s-8.4-1.4-8.4-3.2z" fill="url(#${d('ba')})" stroke="#050506" stroke-width=".5"/>
  <ellipse cx="107" cy="29.5" rx="7" ry="2.5" fill="#2c2d32"/>
  <g stroke="#8d9099" stroke-width=".45">${[...Array(16)].map((_, i) => { const a = i / 16 * 6.283; return `<line x1="${(107 + Math.cos(a) * 6.2).toFixed(1)}" y1="${(29.5 + Math.sin(a) * 2).toFixed(1)}" x2="${(107 + Math.cos(a) * 7).toFixed(1)}" y2="${(29.5 + Math.sin(a) * 2.5).toFixed(1)}"/>`; }).join('')}</g>
  <!-- anillas de correa -->
  <rect x="0" y="52" width="5.4" height="7.4" rx="1.6" fill="url(#${d('me')})"/><rect x="125.6" y="52" width="5.4" height="7.4" rx="1.6" fill="url(#${d('me')})"/>
  <!-- botones traseros visibles de frente -->
  <rect x="112" y="62" width="11" height="13" rx="3.4" fill="#0a0a0c" stroke="#35363b" stroke-width=".6"/>
  <circle cx="116.4" cy="92.6" r="5" fill="#0a0a0c" stroke="#3a3b40" stroke-width=".6"/><circle cx="116.4" cy="92.6" r="3.6" fill="url(#${d('ba')})"/>
  <!-- lente -->
  <circle cx="77" cy="81" r="37.4" fill="#060607"/>
  <circle cx="77" cy="81" r="36.2" fill="url(#${d('ba')})" stroke="#0b0b0d" stroke-width="1"/>
  <circle cx="77" cy="81" r="35" fill="none" stroke="#050506" stroke-width="5" stroke-dasharray="1 1.55" opacity=".75"/>
  <circle cx="77" cy="81" r="31.6" fill="#0b0b0d"/>
  <circle cx="77" cy="81" r="31.2" fill="none" stroke="#d3262e" stroke-width="1.25"/>
  <circle cx="77" cy="81" r="29.4" fill="#0d0d10" stroke="#3b3d43" stroke-width=".8"/>
  <circle cx="77" cy="81" r="27" fill="none" stroke="#1f2024" stroke-width="3"/>
  <circle cx="77" cy="81" r="22.6" fill="#08090b" stroke="#4d5058" stroke-width=".9"/>
  <circle cx="77" cy="81" r="21" fill="url(#${d('vi')})"/>
  <circle cx="77" cy="81" r="16.4" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width=".8"/>
  <circle cx="77" cy="81" r="12.2" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".9"/>
  <circle cx="77" cy="81" r="8.2" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".7"/>
  <circle cx="77" cy="81" r="21" fill="url(#${d('br')})"/>
  <path d="M60.4 70.6a19.6 19.6 0 0 1 14-9" fill="none" stroke="#bfffe0" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>
  <path d="M62 91.4a19.6 19.6 0 0 0 9.6 7.2" fill="none" stroke="#ffd29a" stroke-width="2" stroke-linecap="round" opacity=".4"/>
  <ellipse cx="68" cy="72" rx="7" ry="3.6" transform="rotate(-40 68 72)" fill="#fff" opacity=".5"/>
  <circle cx="77.6" cy="81.4" r="1.2" fill="#fff" opacity=".9"/>
  <circle cx="84" cy="88.4" r="1.7" fill="#fff" opacity=".7"/>
  </svg>`;
  }

  // posición del flash de cada modelo, en % del dibujo
  const FLASH_EN = { pro: [61, 9] };

  /* sonido de obturador: clic del espejo + cortinilla + golpe seco, generado en el navegador */
  let ruidoBuf = null;
  function obturador(ctx, salida, cuando, fuerza) {
    if (!ruidoBuf || ruidoBuf.sampleRate !== ctx.sampleRate) {
      ruidoBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0);
      for (let n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + cuando;
    const golpe = (inicio, dur, freq, q, vol) => {
      const src = ctx.createBufferSource();
      src.buffer = ruidoBuf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq * (0.9 + Math.random() * 0.2);
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, inicio);
      g.gain.linearRampToValueAtTime(vol, inicio + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
      src.connect(f); f.connect(g); g.connect(salida);
      src.start(inicio, Math.random() * 0.4);
      src.stop(inicio + dur + 0.03);
    };
    golpe(t, 0.035, 3300, 1.2, 0.9 * fuerza);          // espejo
    golpe(t + 0.052, 0.055, 2300, 0.9, 0.7 * fuerza);  // cortinilla
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.5 * fuerza, t);
    go.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(go); go.connect(salida);
    o.start(t); o.stop(t + 0.09);
  }


  async function flashes(destino) {
    const raiz = document.documentElement;
    const antes = [raiz.style.scrollBehavior, raiz.style.scrollSnapType];
    raiz.style.scrollBehavior = "auto";
    raiz.style.scrollSnapType = "none";
    const capa = el("div", "camaras");
    capa.setAttribute("aria-hidden", "true");
    const velo = el("div", "camaras__velo");
    const lote = el("div", "camaras__lote");
    capa.append(lote, velo);
    document.body.appendChild(capa);

    // cámaras repartidas por la pantalla (celdas barajadas con un poco de desorden)
    const W = innerWidth, H = innerHeight;
    const cols = W > H ? 4 : 3, filas = W > H ? 3 : 4;
    const celdas = [];
    for (let c = 0; c < cols; c++) for (let f = 0; f < filas; f++) celdas.push([c, f]);
    celdas.sort(() => Math.random() - 0.5);
    const tam = Math.max(80, Math.min(W, H) * 0.26);
    const N = 8, PASO = 85;
    const anims = [];
    // el obturador solo suena si el usuario encendió el sonido
    const conSonido = !!(audio && btnSonido.getAttribute("aria-pressed") === "true" && audio.ctx.state === "running");
    let salida = null;
    if (conSonido) { salida = audio.ctx.createGain(); salida.gain.value = 0.6; salida.connect(audio.ctx.destination); }
    celdas.slice(0, N).forEach(([c, f], i) => {
      const cam = el("div", "camara");
      const modelo = "pro";
      cam.innerHTML = camaraSvg(modelo, i) + '<span class="camara__destello"></span>';
      cam.style.setProperty("--fx", FLASH_EN[modelo][0] + "%");
      cam.style.setProperty("--fy", FLASH_EN[modelo][1] + "%");
      cam.style.width = tam + "px";
      cam.style.left = ((c + 0.15 + Math.random() * 0.45) * W / cols) + "px";
      cam.style.top = ((f + 0.1 + Math.random() * 0.5) * H / filas) + "px";
      const giro = (Math.random() - 0.5) * 30;
      lote.appendChild(cam);
      const t0 = i * PASO;
      if (conSonido) obturador(audio.ctx, salida, (t0 + 130 + Math.random() * 12) / 1000, 0.75 + Math.random() * 0.3);
      anims.push(cam.animate([{ opacity: 0, transform: "rotate(" + giro + "deg) scale(.4)" }, { opacity: 1, transform: "rotate(" + giro + "deg) scale(1)" }], { duration: 150, delay: t0, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "both" }));
      anims.push(cam.querySelector(".camara__destello").animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.2)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: .25 }, { opacity: 0, transform: "translate(-50%,-50%) scale(1.7)" }], { duration: 300, delay: t0 + 130, easing: "ease-out", fill: "both" }));
      anims.push(velo.animate([{ opacity: 0 }, { opacity: .3 }, { opacity: 0 }], { duration: 170, delay: t0 + 140, fill: "both" }));
    });
    const FINAL = N * PASO + 120;
    if (conSonido) obturador(audio.ctx, salida, (FINAL + 10) / 1000, 1.15);
    try {
      // el flash grande tapa la pantalla; ahí se cambia de sala
      await velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, delay: FINAL, easing: "ease-in", fill: "forwards" }).finished;
      anims.forEach((x) => { try { x.cancel(); } catch (e) { /* ya terminó */ } });
      lote.style.visibility = "hidden";
      await saltar(destino);
      await espera(120);
      await saltar(destino);
      await velo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out", fill: "forwards" }).finished;
      await saltar(destino);
    } finally {
      capa.remove();
      raiz.style.scrollBehavior = antes[0];
      raiz.style.scrollSnapType = antes[1];
    }
  }

  /* ---------- chorros de pintura que caen desde arriba (transicion: "pintura") ---------- */
  const PINTURAS = ["#c0262c", "#e6b422", "#1d9a9b", "#7b2a8c", "#d9621e", "#1a1a1d", "#f1ece2"];

  async function pintura(destino, color) {
    const raiz = document.documentElement;
    const antes = [raiz.style.scrollBehavior, raiz.style.scrollSnapType];
    raiz.style.scrollBehavior = "auto";
    raiz.style.scrollSnapType = "none";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "brocha");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs><filter id="pintura-aspera" x="-10%" y="-5%" width="120%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.09 0.11" numOctaves="2" seed="11" result="r"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="r" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs><g filter="url(#pintura-aspera)"></g>';
    document.body.appendChild(svg);
    const g = svg.querySelector("g");
    const azar = (a, b) => a + Math.random() * (b - a);
    const mezcla = (lista) => lista.slice().sort(() => Math.random() - 0.5);
    const chorros = [];
    // capa 1: chorros finos y rápidos de varios colores; capa 2: chorros gruesos; capa 3: el color de la sala que cubre todo
    const capa = (n, ancho, colores, retraso, dur, jitter) => {
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * 100 + azar(-jitter, jitter);
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M " + x.toFixed(1) + " -8 C " + (x + azar(-3, 3)).toFixed(1) + " 30, " + (x + azar(-3, 3)).toFixed(1) + " 70, " + (x + azar(-1.5, 1.5)).toFixed(1) + " 108");
        p.setAttribute("pathLength", "1");
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", colores[i % colores.length]);
        p.setAttribute("stroke-width", String(ancho * azar(0.85, 1.2)));
        p.setAttribute("stroke-linecap", "round");
        p.style.strokeDasharray = "1 1.02";
        p.style.strokeDashoffset = "1";
        g.appendChild(p);
        chorros.push({ p, ret: azar(retraso[0], retraso[1]), dur: azar(dur[0], dur[1]) });
      }
    };
    capa(16, 3.4, mezcla(PINTURAS), [0, 260], [520, 780], 3);
    capa(9, 15, mezcla(PINTURAS), [140, 420], [680, 960], 2.5);
    capa(9, 17, [color || "#17120e"], [420, 600], [560, 720], 1.5);
    const caer = (desde, hasta, extra, curva) => Promise.all(chorros.map(({ p, ret, dur }) =>
      p.animate([{ strokeDashoffset: desde }, { strokeDashoffset: hasta }],
        { duration: extra ? 520 : dur, delay: extra ? azar(0, 220) : ret, easing: curva, fill: "forwards" }).finished));
    try {
      await caer(1, 0, false, "cubic-bezier(.45,.05,.8,.5)");     // la pintura cae y cubre la pantalla
      await saltar(destino);
      await espera(120);
      await saltar(destino);
      await caer(0, -1, true, "cubic-bezier(.5,0,.9,.55)");      // y escurre hacia abajo dejando ver la sala nueva
      await saltar(destino);
    } finally {
      svg.remove();
      raiz.style.scrollBehavior = antes[0];
      raiz.style.scrollSnapType = antes[1];
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
    const a = e.target.closest && e.target.closest('a[href^="#sala-"], a[href="#artista"], a.puerta, #top-name');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const destino = document.querySelector(a.getAttribute("href"));
    if (!destino) return;
    e.preventDefault();
    if (sinMov.matches || !Element.prototype.animate) { destino.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (pintando) return;
    pintando = true;
    const pared = getComputedStyle(destino).getPropertyValue("--pared").trim();
    const salaDe = (nodo) => (nodo && nodo.id && nodo.id.startsWith("sala-") ? D.salas[+nodo.id.split("-")[1]] : null);
    const llegada = salaDe(destino);
    const salida = a.classList.contains("puerta") ? salaDe(a.closest(".sala")) : null;
    // "transicionSalida" de la sala de origen (al tocar su puerta) manda sobre "transicion" de la sala de llegada
    const tipo = (salida && salida.transicionSalida) || (llegada && llegada.transicion) || "brochazo";
    const efectos = { flash: () => flashes(destino), pintura: () => pintura(destino, pared), brochazo: () => brochazo(destino, pared) };
    (efectos[tipo] || efectos.brochazo)().finally(() => { pintando = false; });
  });
  /* ---------- sonido ambiente: sintetizado en el navegador, sin archivos, solo con un toque ---------- */
  const btnSonido = el("button", "sonido");
  btnSonido.type = "button";
  btnSonido.setAttribute("aria-pressed", "false");
  btnSonido.setAttribute("aria-label", "Activar sonido ambiente");
  btnSonido.title = "Sonido ambiente";
  btnSonido.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  barra.appendChild(btnSonido);

  let audio = null;
  function crearAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const maestro = ctx.createGain();
    maestro.gain.value = 0;
    maestro.connect(ctx.destination);
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 700;
    filtro.Q.value = 0.4;
    filtro.connect(maestro);
    // acorde abierto y suave (re, la, re, fa#, la, mi), con voces ligeramente desafinadas que "respiran"
    [73.42, 110, 146.83, 185, 220, 329.63].forEach((f, i) => {
      [-4, 4].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = i < 3 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = i < 3 ? 0.07 : 0.035;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const prof = ctx.createGain();
        prof.gain.value = g.gain.value * 0.6;
        lfo.connect(prof);
        prof.connect(g.gain);
        o.connect(g);
        g.connect(filtro);
        o.start();
        lfo.start();
      });
    });
    const lfoF = ctx.createOscillator();
    lfoF.frequency.value = 0.03;
    const profF = ctx.createGain();
    profF.gain.value = 250;
    lfoF.connect(profF);
    profF.connect(filtro.frequency);
    lfoF.start();
    return { ctx, maestro };
  }
  btnSonido.addEventListener("click", async () => {
    if (!audio) audio = crearAudio();
    if (!audio) { avisar("Tu navegador no permite el sonido ambiente."); return; }
    const { ctx, maestro } = audio;
    const enciende = btnSonido.getAttribute("aria-pressed") !== "true";
    btnSonido.setAttribute("aria-pressed", String(enciende));
    btnSonido.setAttribute("aria-label", enciende ? "Silenciar sonido ambiente" : "Activar sonido ambiente");
    if (enciende) {
      evento("sonido");
      await ctx.resume();
      maestro.gain.cancelScheduledValues(ctx.currentTime);
      maestro.gain.setTargetAtTime(0.35, ctx.currentTime, 1.2);
    } else {
      maestro.gain.cancelScheduledValues(ctx.currentTime);
      maestro.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => { if (btnSonido.getAttribute("aria-pressed") !== "true") ctx.suspend(); }, 2200);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!audio || btnSonido.getAttribute("aria-pressed") !== "true") return;
    if (document.hidden) audio.ctx.suspend(); else audio.ctx.resume();
  });

  /* ---------- enlaces ?obra=ID (compartir) y regreso de Mercado Pago ?pago=... ---------- */
  (async () => {
    const qs = new URLSearchParams(location.search);
    const pedida = qs.get("obra");
    const pago = qs.get("pago");
    if (!pedida && !pago) return;
    history.replaceState(null, "", location.pathname);

    if (pago) {
      const m = {
        ok: "¡Gracias por tu compra! Estamos confirmando tu pago; en unos momentos la obra aparecerá como vendida.",
        pendiente: "Tu pago está pendiente de confirmación.",
        fallo: "El pago no se completó. Puedes intentarlo de nuevo cuando quieras."
      };
      avisar(m[pago] || "", 9000);
      if (pago === "ok") { for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 5000)); await cargarConfig(); } }
      return;
    }

    const i = todas.findIndex((o) => o._id === pedida);
    if (i < 0) return;
    const si = D.salas.findIndex((s) => s.obras.includes(todas[i]));
    const sala = document.getElementById("sala-" + si);
    await saltar(sala);
    const boton = [...sala.querySelectorAll(".obra")][todas.slice(0, i).filter((o) => D.salas[si].obras.includes(o)).length];
    const pared = sala.querySelector(".pared");
    if (boton && pared) pared.scrollLeft = boton.offsetLeft - (pared.clientWidth - boton.offsetWidth) / 2;
    abrir(i);
  })();
  /* ---------- polvo dorado flotando, como brasas en el aire (ambiente) ---------- */
  (function polvo() {
    if (sinMov.matches) return;
    const c = document.createElement("canvas");
    c.className = "polvo";
    c.setAttribute("aria-hidden", "true");
    document.body.prepend(c);
    const x = c.getContext("2d");
    if (!x) { c.remove(); return; }
    let W = 0, H = 0, dpr = 1;
    const N = innerWidth < 700 ? 26 : 44;
    const ps = [];
    const medir = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = c.width = Math.round(innerWidth * dpr); H = c.height = Math.round(innerHeight * dpr); };
    const nueva = (desdeAbajo) => ({
      x: Math.random() * W,
      y: desdeAbajo ? H + Math.random() * 60 * dpr : Math.random() * H,
      r: (0.7 + Math.random() * 1.9) * dpr,
      v: (0.1 + Math.random() * 0.34) * dpr,
      d: Math.random() * 6.28, ds: 0.002 + Math.random() * 0.006,
      a: 0.18 + Math.random() * 0.5,
      t: Math.random() * 6.28, ts: 0.012 + Math.random() * 0.02,
      c: Math.random() < 0.7 ? "255,226,168" : "240,160,90"
    });
    medir();
    for (let i = 0; i < N; i++) ps.push(nueva(false));
    window.addEventListener("resize", medir);
    function cuadro() {
      requestAnimationFrame(cuadro);
      if (document.hidden || visor.open) return;
      x.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y -= p.v; p.d += p.ds; p.t += p.ts;
        p.x += Math.sin(p.d) * 0.35 * dpr;
        if (p.y < -20 * dpr) Object.assign(p, nueva(true));
        const al = p.a * (0.55 + 0.45 * Math.sin(p.t));
        const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, "rgba(" + p.c + "," + al + ")");
        g.addColorStop(0.35, "rgba(" + p.c + "," + al * 0.35 + ")");
        g.addColorStop(1, "rgba(" + p.c + ",0)");
        x.fillStyle = g;
        x.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10);
      }
    }
    cuadro();
  })();
})();
