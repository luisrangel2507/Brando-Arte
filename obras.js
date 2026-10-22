// ============================================================
//  EDITA ESTE ARCHIVO: aquí vive todo el contenido del recorrido.
//  Las fotos van en la carpeta obras/ y su nombre se escribe en "img".
//  Si "img" está vacío se muestra un marcador de "Foto pendiente".
//  "ancho" y "alto" (cm) fijan la proporción y el tamaño relativo.
//  "medidas: false" oculta las medidas en la ficha hasta tener las reales.
//  Compra: por obra puedes poner "precio" (número), "estado" ("disponible",
//  "reservada" o "vendida") y "pago" (enlace https de Stripe, Mercado Pago, etc.).
//  Sin "pago", el botón lleva a una consulta por WhatsApp (ver "contacto").
//  "objeto: true" muestra la obra como pieza (escultura) y no como cuadro.
//  Cobro automático (Mercado Pago): con "precio" y MP_ACCESS_TOKEN en Railway, "Comprar ahora"
//  abre el checkout y, al aprobarse el pago, la obra se marca sola como vendida.
//  "id" es opcional: por defecto se usa el nombre de la foto (s1-a) o "obra-N".
//  Transición: "transicion" en una sala = efecto al entrar a ella. "transicionSalida" = efecto al
//  tocar su puerta de salida (manda sobre el anterior). Valores: "brochazo" (por defecto),
//  "flash" (cámaras fotográficas) o "pintura" (chorros de pintura que caen desde arriba).
//  "artista": sección "Sobre el artista". Solo aparece cuando "texto" tiene párrafos.
// ============================================================
window.RECORRIDO = {
  pintor: "Brando Guerrero",
  moneda: "MXN",
  contacto: { whatsapp: "", email: "" }, // whatsapp con lada, solo dígitos: 5214431234567
  retrato: "obras/brando.jpg",
  fondo: "obras/fondo.jpg",
  exposicion: "Artista plástico",
  intro: [
    "Brando Guerrero, nacido en Ciudad de México en 1979 y radicado en Morelia, desarrolla una propuesta artística llena de color, expresión y fuerza visual.",
    "Su obra explora la figura humana y las emociones a través de trazos intensos y composiciones llenas de vida.",
    "Conoce más sobre sus obras y adéntrate en su universo creativo a través de este recorrido virtual."
  ],
  artista: {
    titulo: "Sobre el artista",
    foto: "", // nombre de una foto dentro de obras/ (opcional)
    texto: [ // tomado del catálogo Miami River Art Fair 2018
      "Brando Gutiérrez Guerrero, originario de la Ciudad de México pero habitante desde su primer año en la Ciudad de Morelia Michoacán. Desde niño se ha encaminado por las artes visuales, teniendo como don, visualizar y apreciar los contornos surrealistas que nos rodean.",
      "Artista plástico autodidacta y dueño de una empatía natural, Brando ama lo que hace y lo demuestra con su vibrante colorido y riqueza, en las palmarias texturas de su obra, con preferencia por el Novo Arte Latino.",
      "Su nombre lo recibió por el famoso actor rebelde Marlon Brando, por lo sonoro de su nombre; en lo particular lo iguala en el manejo de la libertad que da el entorno social y familiar que le ha permitido crear lo que le nace de acción y pensamiento, sin temor a retar el movimiento actual o status quo.",
      "Se ha distinguido por seguir sus pasiones y sueños, sin perder la alegría y sabor a la vida; por nacimiento se insertó en la Generación X y lo demuestra al ser alguien responsable y comprometido con el entorno, quizá la última generación que pudo jugar en la calle; y ello influye en su obra, cuando también revela una visión, en abstracto, de un mundo cambiante y apresurado que debe ser plasmado en lienzos.",
      "Cada artista se enamora de su obra y esta, contiene un poco de su autor. “Quien posee una obra de este artista, tiene también un visor al espíritu del autor”"
    ], // un párrafo por elemento
    datos: [] // línea de tiempo (opcional), por ejemplo: [{ anio: "2024", texto: "Exposición ..." }]
  },
  salas: [
    {
      titulo: "Sala 1",
      subtitulo: "Pintura",
      texto: "",
      pared: "#3b5a58",
      obras: [
        { titulo: "Obra 1", anio: "", tecnica: "", ancho: 102, alto: 120, medidas: false, img: "s1-a.jpg", nota: "" },
        { titulo: "Cómplices", anio: "2018", tecnica: "Espátula y acrílicos sobre lienzo", ancho: 159.7, alto: 139.8, img: "s1-b.jpg", nota: "" }, // catálogo Miami River Art Fair 2018: 139.8 x 159.7 cm (alto x ancho)
        { titulo: "Obra 3", anio: "", tecnica: "", ancho: 144, alto: 100, medidas: false, img: "s1-c.jpg", nota: "" }
      ]
    },
    {
      titulo: "Sala 2",
      subtitulo: "Escultura",
      transicion: "flash",
      texto: "",
      pared: "#6e2b2a",
      obras: [
        { titulo: "Obra 4", anio: "", tecnica: "", ancho: 127, alto: 100, medidas: false, objeto: true, img: "s2-a.jpg", nota: "" },
        { titulo: "Obra 5", anio: "", tecnica: "", ancho: 103, alto: 120, medidas: false, objeto: true, img: "s2-b.jpg", nota: "" }
      ]
    },
    {
      titulo: "Sala 3",
      subtitulo: "Obra reciente",
      transicion: "pintura",
      texto: "Escribe aquí un párrafo corto sobre esta etapa del pintor.",
      pared: "#2d3850",
      obras: [
        { titulo: "Obra 6", anio: "2024", tecnica: "Óleo sobre tela", ancho: 90, alto: 130, img: "", nota: "" },
        { titulo: "Obra 7", anio: "2025", tecnica: "Óleo sobre tela", ancho: 140, alto: 110, img: "", nota: "" }
      ]
    }
  ]
};
