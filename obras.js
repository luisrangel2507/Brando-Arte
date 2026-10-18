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
  salas: [
    {
      titulo: "Sala 1",
      subtitulo: "Pintura",
      texto: "",
      pared: "#3b5a58",
      obras: [
        { titulo: "Obra 1", anio: "", tecnica: "", ancho: 102, alto: 120, medidas: false, img: "s1-a.jpg", nota: "" },
        { titulo: "Obra 2", anio: "", tecnica: "", ancho: 130, alto: 100, medidas: false, img: "s1-b.jpg", nota: "" },
        { titulo: "Obra 3", anio: "", tecnica: "", ancho: 144, alto: 100, medidas: false, img: "s1-c.jpg", nota: "" }
      ]
    },
    {
      titulo: "Sala 2",
      subtitulo: "Escultura",
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
      texto: "Escribe aquí un párrafo corto sobre esta etapa del pintor.",
      pared: "#2d3850",
      obras: [
        { titulo: "Obra 6", anio: "2024", tecnica: "Óleo sobre tela", ancho: 90, alto: 130, img: "", nota: "" },
        { titulo: "Obra 7", anio: "2025", tecnica: "Óleo sobre tela", ancho: 140, alto: 110, img: "", nota: "" }
      ]
    }
  ]
};
