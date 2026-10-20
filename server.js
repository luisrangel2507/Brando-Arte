"use strict";
// Servidor del recorrido: sirve el sitio estático y ofrece una API mínima para
// cobrar con Mercado Pago (checkout + webhook), marcar obras vendidas y contar visitas.
// Sin dependencias. Las llaves se leen de variables de entorno (nunca del código):
//   MP_ACCESS_TOKEN     token de acceso de Mercado Pago (activa el cobro automático)
//   MP_WEBHOOK_SECRET   (opcional) clave secreta del webhook para validar la firma
//   STATS_TOKEN         (opcional) clave para ver /estadisticas?token=...
//   PUBLIC_URL          (opcional) URL pública; por defecto la de Railway o la de la petición
//   DATA_DIR            carpeta donde se guardan ventas y estadísticas (en Railway: un Volume)

const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const RAIZ = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(RAIZ, "data");
const OBRAS_FILE = process.env.OBRAS_FILE || path.join(RAIZ, "obras.js");
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const MP_SECRET = process.env.MP_WEBHOOK_SECRET || "";
const MP_API = (process.env.MP_API_BASE || "https://api.mercadopago.com").replace(/\/$/, "");
const STATS_TOKEN = process.env.STATS_TOKEN || "";

/* ---------- obras.js es la única fuente de verdad ---------- */
let cacheObras = { mtime: 0, datos: null };
function obras() {
  const st = fs.statSync(OBRAS_FILE);
  if (cacheObras.datos && cacheObras.mtime === st.mtimeMs) return cacheObras.datos;
  const caja = { window: {} };
  vm.runInNewContext(fs.readFileSync(OBRAS_FILE, "utf8"), caja, { timeout: 1000 });
  const D = caja.window.RECORRIDO || {};
  const lista = [];
  (D.salas || []).forEach((s) => (s.obras || []).forEach((o) => {
    const n = lista.length;
    lista.push({ id: idDe(o, n), o });
  }));
  cacheObras = { mtime: st.mtimeMs, datos: { D, lista } };
  return cacheObras.datos;
}
// mismo criterio que app.js: id explícito, nombre de la foto, o posición
function idDe(o, n) {
  return o.id || (o.img ? String(o.img).replace(/\.[^.]+$/, "") : "obra-" + (n + 1));
}
const buscar = (id) => obras().lista.find((x) => x.id === id);

/* ---------- almacenamiento en archivos JSON ---------- */
function leer(nombre, def) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, nombre), "utf8")); } catch (e) { return def; }
}
function escribir(nombre, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, nombre + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, path.join(DATA_DIR, nombre));
}
const ventas = leer("ventas.json", {});
const stats = leer("stats.json", {});
let sucio = false;
setInterval(() => { if (sucio) { sucio = false; try { escribir("stats.json", stats); } catch (e) { console.error("stats:", e.message); } } }, 5000).unref();
function salir() { if (sucio) { try { escribir("stats.json", stats); } catch (e) { /* nada */ } } process.exit(0); }
process.on("SIGTERM", salir);
process.on("SIGINT", salir);

/* ---------- utilidades ---------- */
const TIPOS = { "html": "text/html; charset=utf-8", "css": "text/css; charset=utf-8", "js": "text/javascript; charset=utf-8", "json": "application/json; charset=utf-8", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif", "ico": "image/x-icon", "webmanifest": "application/manifest+json", "txt": "text/plain; charset=utf-8", "mp3": "audio/mpeg", "ogg": "audio/ogg" };
const PERMITIDOS = /^\/(index\.html|style\.css|app\.js|obras\.js|favicon\.svg|favicon\.ico|apple-touch-icon\.png|icon-192\.png|icon-512\.png|site\.webmanifest|robots\.txt)$|^\/(obras|img|audio)\/[^/]+$/;

function json(res, codigo, obj) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(codigo, { "Content-Type": TIPOS.json, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(cuerpo);
}
function leerCuerpo(req, limite = 20000) {
  return new Promise((ok, mal) => {
    let n = 0; const trozos = [];
    req.on("data", (c) => { n += c.length; if (n > limite) { mal(new Error("cuerpo muy grande")); req.destroy(); } else trozos.push(c); });
    req.on("end", () => ok(Buffer.concat(trozos).toString("utf8")));
    req.on("error", mal);
  });
}
function cuerpoJson(texto) { try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; } }
const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ventanas = new Map(); // límite sencillo por IP
function limitado(req, max = 60) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const ahora = Date.now();
  const lista = (ventanas.get(ip) || []).filter((t) => ahora - t < 60000);
  lista.push(ahora);
  ventanas.set(ip, lista);
  if (ventanas.size > 5000) ventanas.clear();
  return lista.length > max;
}
function base(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return "https://" + process.env.RAILWAY_PUBLIC_DOMAIN;
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0];
  return proto + "://" + (req.headers["x-forwarded-host"] || req.headers.host);
}
const estadoDe = (x) => (ventas[x.id] ? "vendida" : x.o.estado || "disponible");

/* ---------- Mercado Pago ---------- */
async function mp(ruta, opciones = {}) {
  const r = await fetch(MP_API + ruta, {
    ...opciones,
    headers: { Authorization: "Bearer " + MP_TOKEN, "Content-Type": "application/json", ...(opciones.headers || {}) }
  });
  const t = await r.text();
  let datos; try { datos = JSON.parse(t); } catch (e) { datos = { raw: t }; }
  if (!r.ok) { const err = new Error("Mercado Pago " + r.status); err.datos = datos; throw err; }
  return datos;
}

async function comprar(req, res) {
  if (!MP_TOKEN) return json(res, 503, { error: "El cobro en línea no está activado." });
  const { id } = cuerpoJson(await leerCuerpo(req));
  const x = buscar(String(id || ""));
  if (!x) return json(res, 404, { error: "Obra no encontrada." });
  const precio = Number(x.o.precio);
  if (!(precio > 0)) return json(res, 400, { error: "Esta obra no tiene precio." });
  if (estadoDe(x) !== "disponible") return json(res, 409, { error: "Esta obra ya no está disponible." });
  const { D } = obras();
  const b = base(req);
  const pref = await mp("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: x.id, title: x.o.titulo || x.id, quantity: 1, currency_id: x.o.moneda || D.moneda || "MXN", unit_price: precio }],
      external_reference: x.id,
      notification_url: b + "/api/mp/webhook",
      back_urls: { success: b + "/?pago=ok&o=" + x.id, failure: b + "/?pago=fallo&o=" + x.id, pending: b + "/?pago=pendiente&o=" + x.id },
      auto_return: "approved"
    })
  });
  const url = pref.init_point || pref.sandbox_init_point;
  if (!url) return json(res, 502, { error: "Mercado Pago no devolvió el enlace de pago." });
  sumar("compra_iniciada", x.id);
  json(res, 200, { url });
}

// Valida la firma del webhook (https://www.mercadopago.com.mx/developers) cuando hay MP_WEBHOOK_SECRET
function firmaValida(req, dataId) {
  if (!MP_SECRET) return true;
  const partes = Object.fromEntries(String(req.headers["x-signature"] || "").split(",").map((p) => p.trim().split("=")));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = (dataId ? "id:" + String(dataId).toLowerCase() + ";" : "") + (req.headers["x-request-id"] ? "request-id:" + req.headers["x-request-id"] + ";" : "") + "ts:" + partes.ts + ";";
  const esperado = crypto.createHmac("sha256", MP_SECRET).update(manifiesto).digest("hex");
  return iguales(esperado, partes.v1);
}

async function webhook(req, res, url) {
  const cuerpo = cuerpoJson(await leerCuerpo(req));
  const q = url.searchParams;
  const tipo = q.get("type") || q.get("topic") || cuerpo.type || cuerpo.topic;
  const dataId = q.get("data.id") || q.get("id") || (cuerpo.data && cuerpo.data.id);
  if (!firmaValida(req, q.get("data.id") || (cuerpo.data && cuerpo.data.id))) return json(res, 401, { error: "firma inválida" });
  if (tipo !== "payment" || !dataId) return json(res, 200, { ok: true });
  if (!MP_TOKEN) return json(res, 503, { error: "sin token" });
  // no nos fiamos del aviso: consultamos el pago directamente a Mercado Pago
  const pago = await mp("/v1/payments/" + encodeURIComponent(dataId));
  const x = buscar(String(pago.external_reference || ""));
  if (pago.status === "approved" && x && !ventas[x.id]) {
    if (Number(pago.transaction_amount) + 0.001 >= Number(x.o.precio)) {
      ventas[x.id] = { pago: String(pago.id), fecha: new Date().toISOString() };
      escribir("ventas.json", ventas);
      sumar("venta", x.id);
      console.log("Obra vendida:", x.id, "pago", pago.id);
    } else {
      console.warn("Pago", pago.id, "por un monto menor al precio de", x.id);
    }
  }
  json(res, 200, { ok: true });
}

/* ---------- estadísticas (sin cookies ni datos personales) ---------- */
const EVENTOS = new Set(["visita", "obra", "compra_click", "consulta", "compartir", "sonido", "zoom"]);
function sumar(tipo, id) {
  const dia = new Date().toISOString().slice(0, 10);
  const d = (stats[dia] = stats[dia] || { eventos: {}, obras: {} });
  d.eventos[tipo] = (d.eventos[tipo] || 0) + 1;
  if (id) { const o = (d.obras[id] = d.obras[id] || {}); o[tipo] = (o[tipo] || 0) + 1; }
  sucio = true;
}
async function evento(req, res) {
  const { t, id } = cuerpoJson(await leerCuerpo(req, 2000));
  if (!EVENTOS.has(t)) return json(res, 400, { error: "evento no válido" });
  sumar(t, id && buscar(String(id)) ? String(id) : null);
  res.writeHead(204); res.end();
}
function paginaStats(res, url) {
  const dias = Object.keys(stats).sort().reverse().slice(0, 30);
  if (url.searchParams.get("formato") === "json") return json(res, 200, stats);
  const total = {}, porObra = {};
  Object.values(stats).forEach((d) => {
    Object.entries(d.eventos).forEach(([k, v]) => { total[k] = (total[k] || 0) + v; });
    Object.entries(d.obras).forEach(([id, ev]) => { Object.entries(ev).forEach(([k, v]) => { (porObra[id] = porObra[id] || {})[k] = (porObra[id][k] || 0) + v; }); });
  });
  const cols = ["visita", "obra", "compartir", "compra_click", "compra_iniciada", "consulta", "venta"];
  const tabla = (filas) => "<table><tr><th></th>" + cols.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>" +
    filas.map(([n, d]) => "<tr><td>" + esc(n) + "</td>" + cols.map((c) => "<td>" + (d[c] || 0) + "</td>").join("") + "</tr>").join("") + "</table>";
  const html = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Estadísticas</title>" +
    "<style>body{font:15px system-ui;background:#17120e;color:#f3efe7;padding:1rem;max-width:60rem;margin:auto}h1,h2{font-weight:500;color:#c8a45a}table{border-collapse:collapse;width:100%;margin:.5rem 0 1.5rem;display:block;overflow-x:auto}td,th{padding:.35rem .6rem;border-bottom:1px solid #fff2;text-align:right;white-space:nowrap}td:first-child,th:first-child{text-align:left}</style>" +
    "<h1>Estadísticas</h1><h2>Total</h2>" + tabla([["todo", total]]) +
    "<h2>Por obra</h2>" + tabla(Object.entries(porObra).sort((a, b) => (b[1].obra || 0) - (a[1].obra || 0))) +
    "<h2>Últimos 30 días</h2>" + tabla(dias.map((d) => [d, stats[d].eventos]));
  res.writeHead(200, { "Content-Type": TIPOS.html, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  res.end(html);
}

/* ---------- archivos estáticos ---------- */
function estatico(req, res, url) {
  let ruta = url.pathname === "/" ? "/index.html" : url.pathname;
  try { ruta = decodeURIComponent(ruta); } catch (e) { ruta = ""; }
  if (!PERMITIDOS.test(ruta) || ruta.includes("..")) { res.writeHead(404, { "Content-Type": TIPOS.txt }); return res.end("No encontrado"); }
  const archivo = ruta === "/obras.js" ? OBRAS_FILE : path.join(RAIZ, ruta);
  let st;
  try { st = fs.statSync(archivo); if (!st.isFile()) throw new Error(); } catch (e) { res.writeHead(404, { "Content-Type": TIPOS.txt }); return res.end("No encontrado"); }
  const ext = path.extname(archivo).slice(1).toLowerCase();
  const cabeceras = { "Content-Type": TIPOS[ext] || "application/octet-stream", "X-Content-Type-Options": "nosniff" };

  if (ruta === "/index.html") { // la vista previa al compartir cambia según la obra (?obra=ID)
    let html = fs.readFileSync(archivo, "utf8");
    const x = url.searchParams.get("obra") && buscar(url.searchParams.get("obra"));
    if (x) {
      const b = base(req);
      const { D } = obras();
      const titulo = (x.o.titulo || "Obra") + " · " + D.pintor;
      const desc = [x.o.anio, x.o.tecnica].filter(Boolean).join(" · ") || "Obra de " + D.pintor + " en su recorrido virtual.";
      const poner = (prop, val) => { html = html.replace(new RegExp('(<meta property="' + prop + '" content=")[^"]*(")'), "$1" + esc(val) + "$2"); };
      poner("og:title", titulo); poner("og:description", desc);
      if (x.o.img) poner("og:image", b + "/obras/" + x.o.img);
      poner("og:url", b + "/?obra=" + x.id);
    }
    cabeceras["Cache-Control"] = "no-cache";
    res.writeHead(200, cabeceras);
    return res.end(req.method === "HEAD" ? undefined : html);
  }

  const etag = '"' + st.size.toString(16) + "-" + Math.round(st.mtimeMs).toString(16) + '"';
  cabeceras.ETag = etag;
  cabeceras["Cache-Control"] = /^\/(obras|img|audio)\//.test(ruta) ? "public, max-age=3600" : "no-cache";
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, cabeceras); return res.end(); }
  res.writeHead(200, { ...cabeceras, "Content-Length": st.size });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(archivo).pipe(res);
}

/* ---------- ruteo ---------- */
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/healthz") return json(res, 200, { ok: true });
    if (url.pathname.startsWith("/api/")) {
      if (limitado(req, url.pathname === "/api/mp/webhook" ? 600 : 90)) return json(res, 429, { error: "demasiadas peticiones" });
      if (req.method === "GET" && url.pathname === "/api/config") return json(res, 200, { checkout: !!MP_TOKEN, vendidas: Object.keys(ventas) });
      if (req.method === "POST" && url.pathname === "/api/comprar") return await comprar(req, res);
      if (req.method === "POST" && url.pathname === "/api/mp/webhook") return await webhook(req, res, url);
      if (req.method === "POST" && url.pathname === "/api/evento") return await evento(req, res);
      return json(res, 404, { error: "no existe" });
    }
    if (url.pathname === "/estadisticas") {
      if (!STATS_TOKEN || !iguales(url.searchParams.get("token") || "", STATS_TOKEN)) { res.writeHead(404, { "Content-Type": TIPOS.txt }); return res.end("No encontrado"); }
      return paginaStats(res, url);
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    estatico(req, res, url);
  } catch (e) {
    console.error(req.method, url.pathname, e.message, e.datos ? JSON.stringify(e.datos) : "");
    if (!res.headersSent) json(res, 500, { error: "error del servidor" }); else res.end();
  }
});
servidor.listen(PORT, "0.0.0.0", () => console.log("Recorrido virtual en http://0.0.0.0:" + PORT + (MP_TOKEN ? " (cobro en línea activo)" : " (sin cobro en línea)")));
