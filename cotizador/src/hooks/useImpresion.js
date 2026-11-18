/**
 * useImpresion — monta el documento en #zona-impresion, espera a que
 * pinte (fuentes y logo) y abre el cuadro de impresión del sistema.
 * Ver ../components/ZonaImpresion.jsx
 */
import { useCallback, useEffect, useRef, useState } from "react";

const esperarImagenes = (raiz, tope = 2000) => {
  const imgs = [...(raiz?.querySelectorAll("img") || [])].filter((i) => !i.complete);
  if (!imgs.length) return Promise.resolve();
  return Promise.race([
    Promise.all(imgs.map((i) => new Promise((ok) => { i.onload = i.onerror = ok; }))),
    new Promise((ok) => setTimeout(ok, tope)),
  ]);
};

/** Monta el documento, espera a que pinte y abre el cuadro de impresión */
export function useImpresion() {
  const [activo, setActivo] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const imprimir = useCallback(async () => {
    setActivo(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { await document.fonts?.ready; } catch { /* noop */ }
    await esperarImagenes(document.getElementById("zona-impresion"));
    const fin = () => {
      window.removeEventListener("afterprint", fin);
      clearTimeout(temporizador.current);
      setActivo(false);
    };
    window.addEventListener("afterprint", fin);
    /* Red de seguridad: hay navegadores de celular que no avisan al cerrar */
    temporizador.current = setTimeout(fin, 60000);
    window.print();
  }, []);

  return { imprimiendo: activo, imprimir };
}
