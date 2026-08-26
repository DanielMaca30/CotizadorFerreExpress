/**
 * useListaProgresiva — pintar listas largas sin congelar la pantalla
 * ─────────────────────────────────────────────────────────────────
 * EL PROBLEMA QUE RESUELVE: construir de un solo golpe cientos de filas
 * (el listado con "Todas", o una cotización de 40 productos) dejaba la
 * pantalla pegada varios segundos. Atendiendo a alguien en el mostrador,
 * esos segundos se sienten como si la aplicación se hubiera caído.
 *
 * CÓMO LO RESUELVE: pinta enseguida las primeras filas —las únicas que
 * caben en pantalla— y va agregando el resto en tandas pequeñas entre
 * repintado y repintado. Se ve completa casi igual de rápido, pero se
 * puede tocar y escribir desde el primer instante.
 *
 * OJO CON `clave`: la lista se reinicia SOLO cuando cambia esa clave
 * (otro filtro, otra cotización). No se puede reiniciar cuando cambia
 * la lista en sí, porque en la tabla de productos `items` es un arreglo
 * nuevo con CADA tecla: se volvería a empezar por las primeras filas
 * mientras alguien escribe en la 30.
 */
import { useState, useEffect, useRef } from "react";

export function useListaProgresiva(lista, { primeros = 30, paso = 40, clave = "" } = {}) {
  const total = lista.length;
  const [tope, setTope] = useState(() => Math.min(primeros, total));
  const timer = useRef(null);

  /* Reinicio solo por clave: otro filtro, otra página, otra cotización. */
  useEffect(() => {
    setTope(Math.min(primeros, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, primeros]);

  /* Si la lista se acortó (se borró una fila), el tope se ajusta;
     si creció (se agregó una fila), se incluye de una para que quien
     la acaba de agregar la vea aparecer sin espera. */
  useEffect(() => {
    setTope((t) => (t > total ? total : (t >= total - 1 ? total : t)));
  }, [total]);

  useEffect(() => {
    if (tope >= total) return;
    /* Se espera al siguiente repintado para no competir con él y se
       agrega otra tanda. Entre tanda y tanda el navegador queda libre
       para responder a un toque o a una tecla. */
    let cancelado = false;
    const raf = requestAnimationFrame(() => {
      if (cancelado) return;
      timer.current = setTimeout(() => {
        if (!cancelado) setTope((t) => Math.min(t + paso, total));
      }, 0);
    });
    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer.current);
    };
  }, [tope, total, paso]);

  return {
    visibles: tope >= total ? lista : lista.slice(0, tope),
    faltan: Math.max(0, total - tope),
    completa: tope >= total,
  };
}

export default useListaProgresiva;
