# Recorrido virtual · Brando Guerrero

Sitio estático (HTML/CSS/JS) servido por un pequeño servidor Node sin dependencias (`server.js`).
Todo el contenido se edita en `obras.js`; las fotos van en `obras/`.

```
npm start        # http://localhost:3000 (usa PORT si existe)
```

## Cobro con Mercado Pago (opcional)

Sin configuración, "Comprar ahora" usa el enlace `pago` de cada obra (si lo tiene) y
"Preguntar por esta obra" prepara el mensaje de WhatsApp. Para cobrar con checkout propio y que la
obra se marque sola como **vendida**:

1. En `obras.js`, pon el `precio` de cada obra (número, en `moneda`).
2. En Railway → servicio → **Variables**:

| Variable | Para qué |
| --- | --- |
| `MP_ACCESS_TOKEN` | Access Token de producción de tu cuenta de Mercado Pago. Activa el cobro. |
| `MP_WEBHOOK_SECRET` | (Recomendado) "Clave secreta" del webhook, para validar la firma de los avisos. |
| `STATS_TOKEN` | Clave para ver `/estadisticas?token=TU_CLAVE`. Sin ella, esa página no existe. |
| `DATA_DIR` | `/data` (ver abajo). |

3. En Railway → servicio → **Settings → Volumes** crea un volumen montado en `/data`.
   Ahí se guardan las obras vendidas y las estadísticas; sin volumen se pierden en cada despliegue.
4. En Mercado Pago → Tus integraciones → tu aplicación → **Webhooks** → modo producción:
   URL `https://TU-DOMINIO/api/mp/webhook`, evento **Pagos**.

Nunca pongas llaves en el código ni en `obras.js`.

## Estadísticas

Cuenta visitas, obras vistas, zooms, compartidos, clics en comprar, consultas, ventas y sonido.
Sin cookies ni datos personales. `/estadisticas?token=...` (o `&formato=json`).

## Sobre el artista

En `obras.js`, `artista.texto` (un párrafo por elemento). La sección y su botón en la barra aparecen
solo cuando hay texto. `artista.foto` y `artista.datos` son opcionales.

## Compartir una obra

El botón "Compartir esta obra" del visor envía `https://TU-DOMINIO/?obra=ID`, que abre esa obra y
muestra su foto y título como vista previa. `ID` es el campo `id` de la obra, o el nombre de su foto
sin extensión (`s1-a`), o `obra-N` si no tiene foto.
