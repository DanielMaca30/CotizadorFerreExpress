/**
 * usePlantillas.js — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Gestiona plantillas de cotización guardadas en localStorage.
 * Una plantilla guarda: nombre, tipo, items, configuración base,
 * notas y AIU (para obra). NO guarda cliente ni número.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from "react";
import { uid } from "../utils";

const STORAGE_KEY = "ferreexpress_plantillas_v1";

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function guardar(lista) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch { /* silencioso */ }
}

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState(cargar);

  /** Guarda la cotización actual como plantilla */
  const guardarPlantilla = useCallback(({ nombre, items, cotConfig, notas, aiuConfig }) => {
    const nueva = {
      id:        uid(),
      nombre:    nombre || "Plantilla sin nombre",
      tipo:      cotConfig?.tipo || "comercial",
      creadaEn:  new Date().toISOString(),
      items:     (items || []).map(r => ({
        ref:   r.ref   || "",
        desc:  r.desc  || "",
        qty:   r.qty   || 1,
        unit:  r.unit  || "Und",
        price: r.price || "",
        disc:  r.disc  || 0,
      })),
      /* Config sin número, estado ni fechas — esos se asignan al crear */
      config: {
        tipo:      cotConfig?.tipo      || "comercial",
        iva:       cotConfig?.iva       ?? 19,
        moneda:    cotConfig?.moneda    || "COP",
        formaPago: cotConfig?.formaPago || "Efectivo",
      },
      notas:    notas     || "",
      aiuConfig: aiuConfig || null,
    };
    setPlantillas(prev => {
      const actualizada = [nueva, ...prev];
      guardar(actualizada);
      return actualizada;
    });
    return nueva;
  }, []);

  /** Elimina una plantilla */
  const eliminarPlantilla = useCallback((id) => {
    setPlantillas(prev => {
      const filtrada = prev.filter(p => p.id !== id);
      guardar(filtrada);
      return filtrada;
    });
  }, []);

  /** Renombra una plantilla */
  const renombrarPlantilla = useCallback((id, nuevoNombre) => {
    setPlantillas(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, nombre: nuevoNombre } : p);
      guardar(updated);
      return updated;
    });
  }, []);

  return { plantillas, guardarPlantilla, eliminarPlantilla, renombrarPlantilla };
}
