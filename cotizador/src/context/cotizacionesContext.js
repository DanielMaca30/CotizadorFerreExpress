/**
 * cotizacionesContext.js — contexto y constantes compartidas
 * ─────────────────────────────────────────────────────────────────
 * Vive aparte del provider para que el archivo del componente exporte
 * solo componentes (requisito de Fast Refresh en desarrollo).
 */
import { createContext, useContext } from "react";

/** Id reservado para la pestaña de una cotización nueva sin guardar */
export const NEW_TAB_ID = "__nueva__";
/** Tope de pestañas abiertas — evita que la barra se coma la pantalla */
export const MAX_TABS = 12;

export const CotizacionesCtx = createContext(null);

/** Acceso al estado compartido de cotizaciones y pestañas. */
export function useCotizaciones() {
  const ctx = useContext(CotizacionesCtx);
  if (!ctx) throw new Error("useCotizaciones debe usarse dentro de <CotizacionesProvider>");
  return ctx;
}
