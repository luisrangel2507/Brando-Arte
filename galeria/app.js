(function () {
  const D = window.RECORRIDO;
  const $ = (id) => document.getElementById(id);
  const main = $("main");

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

    cuerpo.append(placa, pared);
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
})();
