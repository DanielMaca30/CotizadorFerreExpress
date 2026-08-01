/**
 * useCotizaciones.js
 * ─────────────────────────────────────────────────────────────────
 * La implementación vive ahora en src/context/ — el provider se monta UNA
 * sola vez en App.jsx y todas las páginas comparten el mismo estado.
 * Este archivo se conserva como puente para no romper los imports
 * existentes: la API es exactamente la misma (más las utilidades de
 * pestañas que añade el provider).
 */
export { useCotizaciones, NEW_TAB_ID, MAX_TABS } from "../context/cotizacionesContext";
