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
    id: "2026-10-16",
    fecha: "16 de octubre de 2026",
    titulo: "Facturación más clara",
    puntos: [
      {
        icono: "factura",
        titulo: "NIT y cédula se ven de primeras en el documento",
        texto: "Si el cliente pide factura, la razón social o su nombre sale grande y el NIT o la cédula en un recuadro amarillo. Si no la pide, el documento lleva solo su nombre.",
      },
      {
        icono: "cliente",
        titulo: "Nuevo recuadro «Datos para factura»",
        texto: "En Cliente: razón social, tipo de documento (C.C., NIT o C.E.) y correo para la factura electrónica. Abajo te muestra cómo va a salir.",
      },
      {
        icono: "guardado",
        titulo: "Adiós al aviso de «Cambios sin guardar» falso",
        texto: "Abrir una cotización y mirarla ya no la marca como cambiada, ni te pregunta si quieres guardar al salir.",
      },
      {
        icono: "celular",
        titulo: "Vista previa completa en el celular",
        texto: "La hoja se ajusta a la pantalla: ves el total, las condiciones y la firma sin tener que mover la página de lado.",
      },
      {
        icono: "tabla",
        titulo: "Nombres de producto completos en el computador",
        texto: "La tabla de productos le da más espacio a la descripción, así ya no se corta el nombre.",
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
