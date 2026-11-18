/**
 * disposicion.js — medidas de las barras fijas y a qué altura se pega
 * la barra propia de cada pantalla.
 */
import { useMediaQuery } from "@chakra-ui/react";

/** Alto de la tira de cotizaciones abiertas (solo computador) */
export const TABS_BAR_H = "36px";

/** La tira de pestañas solo se muestra desde 1024 px: en la tablet sus
 *  botones de cerrar (16 px) eran imposibles de acertar con el dedo. */
export const MEDIA_PESTANAS = "(min-width: 64em)";

/** Alto de la barra de abajo en celular */
export const NAV_MOVIL_H = "60px";

/** Alto de la barra de arriba en computador y tablet */
export const NAV_ARRIBA_H = 46;

/**
 * Encima de la barra de cada pantalla puede haber dos cosas fijas: la
 * tira de cotizaciones abiertas (si hay alguna) y la navegación (solo en
 * pantalla grande; en el teléfono va abajo). Devuelve un valor en px
 * listo para `top`.
 */
export function useOffsetSuperior(hayPestanas) {
  const [esCelular] = useMediaQuery("(max-width: 47.99em)", { ssr: false });
  const [conPestanas] = useMediaQuery(MEDIA_PESTANAS, { ssr: false });
  const pestanas = hayPestanas && conPestanas ? parseInt(TABS_BAR_H, 10) : 0;
  return `${pestanas + (esCelular ? 0 : NAV_ARRIBA_H)}px`;
}
