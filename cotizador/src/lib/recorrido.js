/**
 * recorrido.js — arrancar los recorridos guiados desde cualquier parte
 * (vive aparte de RecorridoGuiado.jsx para que ese archivo exporte solo
 * el componente, requisito de Fast Refresh en desarrollo).
 */
export const VISTO_KEY = "ferreexpress_tour_visto_v1";
export const EVENTO_RECORRIDO = "ferreexpress:recorrido";

/** Arranca un recorrido por su id (ver src/ayuda/recorridos.js) */
export function iniciarRecorrido(id = "inicio") {
  try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(EVENTO_RECORRIDO, { detail: { id } }));
}

/** Compatibilidad con el nombre anterior */
export const reiniciarTour = () => iniciarRecorrido("inicio");
