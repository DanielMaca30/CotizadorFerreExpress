/**
 * useListaProgresiva — pintar listas largas sin congelar la pantalla
 * ─────────────────────────────────────────────────────────────────
 * EL PROBLEMA QUE RESUELVE: al elegir "Todas" con cientos de cotizaciones,
 * el navegador tenía que construir todas las filas de un solo golpe y la
 * pantalla se quedaba pegada varios segundos. Atendiendo a un cliente en
 * el mostrador, esos segundos se sienten como si la aplicación se hubiera
 * caído.
 *
 * CÓMO LO RESUELVE: pinta enseguida las primeras filas —las únicas que
 * caben en pantalla— y va agregando el resto en tandas pequeñas entre
 * repintado y repintado. La lista se ve completa igual de rápido, pero
 * quien la usa puede buscar, tocar y escribir desde el primer instante.
 *
 * Si la lista es corta no hace nada: devuelve todo de una.
 */
import { useState, useEffect, useRef } from "react";

export function useListaProgresiva(lista, { primeros = 30, paso = 40 } = {}) {
  const total = lista.length;
  const [tope, setTope] = useState(() => Math.min(primeros, total));
  const pendiente = useRef(null);

  /* Al cambiar la lista (otro filtro, otra búsqueda, otra página) se
     empieza de nuevo por las primeras: lo que importa es lo que se ve. */
  useEffect(() => {
    setTope(Math.min(primeros, total));
  }, [lista, primeros, total]);

  useEffect(() => {
    if (tope >= total) return;
    /* Se espera al siguiente repintado para no competir con él, y se
       agrega otra tanda. Así el hilo del navegador queda libre entre
       tanda y tanda para responder a un toque o a una tecla. */
    pendiente.current = requestAnimationFrame(() => {
      pendiente.current = setTimeout(() => {
        setTope((t) => Math.min(t + paso, total));
      }, 0);
    });
    return () => {
      if (pendiente.current) {
        cancelAnimationFrame(pendiente.current);
        clearTimeout(pendiente.current);
      }
    };
  }, [tope, total, paso]);

  return {
    visibles: tope >= total ? lista : lista.slice(0, tope),
    faltan: Math.max(0, total - tope),
    completa: tope >= total,
  };
}

export default useListaProgresiva;
