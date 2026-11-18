/**
 * ZonaImpresion.jsx — lo único que sale en papel al tocar «Imprimir»
 * ─────────────────────────────────────────────────────────────────
 * ANTES: «Imprimir» llamaba a window.print() sobre la página entera.
 * La hoja de estilos de impresión ni siquiera se cargaba, y el documento
 * vivía DENTRO de la app (que se ocultaba al imprimir, y con ella el
 * documento). Resultado: salía la pantalla de la app o una hoja en blanco.
 *
 * AHORA: el documento se dibuja aparte, colgado directamente del <body>
 * y fuera de la app. En pantalla no se ve; al imprimir se oculta todo lo
 * demás y salen solo las hojas, una por página carta.
 */
import { createPortal } from "react-dom";

export function ZonaImpresion({ activo, children }) {
  if (!activo || typeof document === "undefined") return null;
  return createPortal(<div id="zona-impresion">{children}</div>, document.body);
}
