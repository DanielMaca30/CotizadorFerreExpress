/**
 * novedades.js — lo nuevo de cada actualización, contado a quien usa la app
 * ─────────────────────────────────────────────────────────────────
 * CÓMO AGREGAR UNA ACTUALIZACIÓN:
 *   1. Copia el bloque de la más reciente y ponlo DE PRIMERO en la lista.
 *   2. Cambia `id` por la fecha de hoy (AAAA-MM-DD). Ese id es lo que hace
 *      que el panel vuelva a salir una vez en cada equipo.
 *   3. Escribe solo lo que la persona VE o HACE distinto. Nada de
 *      rendimiento interno, limpieza de código, ni arreglos que nadie notó:
 *      si no le cambia el trabajo a quien cotiza, no va aquí.
 *
 * Frases cortas, en el idioma del mostrador. Máximo 5 puntos por versión.
 * Iconos disponibles: ver ICONOS en src/components/PanelNovedades.jsx.
 */
export const NOVEDADES = [
  {
    id: "2026-11-17",
    fecha: "17 de noviembre de 2026",
    titulo: "Precios bien escritos, imprimir de verdad y pantallas ordenadas",
    puntos: [
      {
        icono: "rapido",
        titulo: "Decimales y miles sin sorpresas",
        texto: "Escribe 1,5 de cantidad o precios como 1.250.000 o 85,50, en el celular o en el computador: quedan tal cual. Antes algunos se cambiaban solos (1,5 quedaba 15).",
      },
      {
        icono: "imprimir",
        titulo: "«Imprimir» ya imprime la cotización",
        texto: "Sale solo el documento, en hoja carta y a color. Está arriba en el computador y en el paso «Enviar» del celular.",
      },
      {
        icono: "celular",
        titulo: "En el celular, una sola barra abajo",
        texto: "Dentro de la cotización ves el total completo, «Enviar» y «Guardar». Mientras escribes se esconde para no tapar la casilla. Para salir, la flecha de arriba.",
      },
      {
        icono: "tabla",
        titulo: "En el computador, la tabla más ancha",
        texto: "Los totales y el botón de WhatsApp quedaron al pie de la tabla, y el nombre de cada producto se lee completo, también en portátiles pequeños y tablets.",
      },
      {
        icono: "nuevo",
        titulo: "La firma del cliente sale en el documento",
        texto: "Captúrala desde el menú ⋮ de la cotización: queda guardada y aparece sobre «Recibí conforme», con el nombre y la fecha.",
      },
    ],
  },
  {
    id: "2026-10-15",
    fecha: "15 de octubre de 2026",
    titulo: "Más rápido de mandar, más claro de leer",
    puntos: [
      {
        icono: "whatsapp",
        titulo: "Botón verde «Enviar»: la cotización directo a WhatsApp",
        texto: "Guarda, arma el PDF y abre WhatsApp con el archivo listo para el cliente. Está en la cotización y en cada tarjeta del listado. Si estaba en borrador, queda como «Enviada».",
      },
      {
        icono: "celular",
        titulo: "En el celular: Cliente · Productos · Enviar",
        texto: "Tres pasos y listo. Solo el nombre es obligatorio; dirección y celular cuando hay domicilio. Las condiciones (fecha, pago, IVA) quedan plegadas en el último paso.",
      },
      {
        icono: "factura",
        titulo: "NIT y cédula se ven de primeras en el documento",
        texto: "Si el cliente pide factura, llena el recuadro amarillo «Datos para factura»: la razón social o el nombre sale grande y el NIT o la cédula resaltados. Si no, sale solo el nombre.",
      },
      {
        icono: "guardado",
        titulo: "Se acabó el «Cambios sin guardar» falso",
        texto: "Abrir y mirar una cotización ya no la marca como cambiada. El botón dice «Guardado» cuando todo está a salvo.",
      },
      {
        icono: "buscar",
        titulo: "Buscar por producto te dice cuál encontró",
        texto: "Si buscas «cemento», cada cotización muestra el producto que coincidió. Y el valor de arriba ya no suma las rechazadas.",
      },
    ],
  },
];

export const ULTIMA_NOVEDAD = NOVEDADES[0]?.id || "";

/* ── Control de "ya lo leyó" ──
   Se guarda en este equipo la última versión vista. Cada equipo (celular,
   computador) la ve una vez; quien entra por primera vez no la ve, porque
   para esa persona todo es nuevo y le toca el recorrido de bienvenida. */
export const NOVEDADES_VISTO_KEY = "ferreexpress_novedades_visto";
export const EVENTO_NOVEDADES = "ferreexpress:novedades";

export const leerVisto = () => {
  try { return localStorage.getItem(NOVEDADES_VISTO_KEY) || ""; } catch { return ULTIMA_NOVEDAD; }
};
export const marcarVisto = () => {
  try { localStorage.setItem(NOVEDADES_VISTO_KEY, ULTIMA_NOVEDAD); } catch { /* noop */ }
};
/** Las versiones que este equipo todavía no ha visto (máximo 3, la más nueva primero) */
export const pendientes = (visto = leerVisto()) =>
  NOVEDADES.filter((n) => n.id > visto).slice(0, 3);

/** Abre el panel a mano desde cualquier parte (p. ej. la página de Ayuda) */
export const abrirNovedades = () => window.dispatchEvent(new CustomEvent(EVENTO_NOVEDADES));
