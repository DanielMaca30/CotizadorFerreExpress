/**
 * useHistorialEdicion.js — deshacer y rehacer sobre la lista de productos
 * ─────────────────────────────────────────────────────────────────
 * Antes, borrar una fila por error obligaba a redigitarla: no había
 * vuelta atrás en toda la app. Ctrl+Z es lo primero que intenta
 * cualquiera cuando se equivoca, y no responder a eso se siente roto.
 *
 * Cómo funciona: se guarda un historial de versiones de `items`. Los
 * cambios se agrupan por tiempo (500 ms) para que deshacer no vaya
 * letra por letra sino por "lo que acabo de escribir". Las acciones
 * estructurales — borrar, duplicar, reordenar, importar — se marcan
 * como punto de corte para que siempre se puedan deshacer enteras.
 *
 * Uso:
 *   const hist = useHistorialEdicion(items, setItems);
 *   hist.marcar('Fila eliminada');   // antes de una acción estructural
 *   hist.deshacer(); hist.rehacer();
 */
import { useRef, useState, useCallback, useEffect } from "react";

const LIMITE     = 60;    // versiones guardadas
const AGRUPAR_MS = 500;   // escritura seguida = un solo paso

export function useHistorialEdicion(items, setItems) {
  const pilaRef   = useRef([items]);   // versiones, de la más vieja a la más nueva
  const idxRef    = useRef(0);         // posición actual dentro de la pila
  const ultimoRef = useRef(0);         // instante del último cambio registrado
  const cortarRef = useRef(false);     // el próximo cambio abre paso nuevo
  const etiqRef   = useRef(null);      // descripción del paso pendiente
  const aplicando = useRef(false);     // ignora el cambio que provoca deshacer

  const [estado, setEstado] = useState({ puedeDeshacer: false, puedeRehacer: false });

  const refrescar = useCallback(() => {
    setEstado({
      puedeDeshacer: idxRef.current > 0,
      puedeRehacer:  idxRef.current < pilaRef.current.length - 1,
    });
  }, []);

  /** Marca que el siguiente cambio es una acción propia (no escritura). */
  const marcar = useCallback((etiqueta) => {
    cortarRef.current = true;
    etiqRef.current = etiqueta || null;
  }, []);

  /* Registrar cada cambio de items */
  useEffect(() => {
    if (aplicando.current) { aplicando.current = false; return; }

    const pila = pilaRef.current;
    if (pila[idxRef.current] === items) return;   // sin cambio real

    const ahora   = Date.now();
    const agrupar = !cortarRef.current && (ahora - ultimoRef.current) < AGRUPAR_MS;
    ultimoRef.current = ahora;
    cortarRef.current = false;

    if (agrupar && idxRef.current === pila.length - 1 && pila.length > 1) {
      /* Sustituye la última versión: escribir seguido es un solo paso */
      pila[idxRef.current] = items;
    } else {
      /* Al escribir después de deshacer, se descarta lo que había delante */
      pila.splice(idxRef.current + 1);
      pila.push(items);
      if (pila.length > LIMITE) pila.shift();
      idxRef.current = pila.length - 1;
    }
    refrescar();
  }, [items, refrescar]);

  const deshacer = useCallback(() => {
    if (idxRef.current <= 0) return false;
    idxRef.current -= 1;
    aplicando.current = true;
    setItems(pilaRef.current[idxRef.current]);
    refrescar();
    return true;
  }, [setItems, refrescar]);

  const rehacer = useCallback(() => {
    if (idxRef.current >= pilaRef.current.length - 1) return false;
    idxRef.current += 1;
    aplicando.current = true;
    setItems(pilaRef.current[idxRef.current]);
    refrescar();
    return true;
  }, [setItems, refrescar]);

  /** Reinicia el historial (al cargar otra cotización). */
  const reiniciar = useCallback((base) => {
    pilaRef.current = [base];
    idxRef.current  = 0;
    aplicando.current = true;
    refrescar();
  }, [refrescar]);

  return { deshacer, rehacer, marcar, reiniciar, ...estado };
}
