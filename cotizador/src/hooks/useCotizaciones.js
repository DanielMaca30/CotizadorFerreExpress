import { useState, useEffect, useCallback } from "react";
import { uid } from "../utils";

const STORAGE_KEY  = "ferreexpress_cotizaciones_v2";
const COUNTER_KEY  = "ferreexpress_cot_counter";
const INIT_COUNTER = 31; // continúa desde COT-030

/* ─── Leer localStorage con fallback ─── */
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error al guardar en localStorage:", e);
  }
};

/* ─── Genera próximo número COT-XXX ─── */
const nextNumero = () => {
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || INIT_COUNTER);
  const next    = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return `COT-${String(next).padStart(3, "0")}`;
};

/* ══════════════════════════════════════════════════
   HOOK PRINCIPAL
══════════════════════════════════════════════════ */
export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState(loadFromStorage);

  /* Persistir en localStorage cada vez que cambia el estado */
  useEffect(() => {
    saveToStorage(cotizaciones);
  }, [cotizaciones]);

  /* ── Obtener una cotización por ID ── */
  const getCotizacion = useCallback(
    (id) => cotizaciones.find((c) => c.id === id) || null,
    [cotizaciones]
  );

  /* ── Guardar (crea o actualiza) ── */
  const saveCotizacion = useCallback((payload) => {
    const now = new Date().toISOString();

    if (payload.id) {
      /* ── Actualizar existente ── */
      setCotizaciones((prev) =>
        prev.map((c) =>
          c.id === payload.id ? { ...payload, updatedAt: now } : c
        )
      );
      return payload.id;
    } else {
      /* ── Crear nueva ── */
      const nueva = {
        ...payload,
        id:        uid(),
        numero:    nextNumero(),
        estado:    payload.estado || "borrador",
        createdAt: now,
        updatedAt: now,
      };
      setCotizaciones((prev) => [nueva, ...prev]);
      return nueva.id;
    }
  }, []);

  /* ── Eliminar ── */
  const deleteCotizacion = useCallback((id) => {
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /* ── Duplicar ── */
  const duplicarCotizacion = useCallback(
    (id) => {
      const original = cotizaciones.find((c) => c.id === id);
      if (!original) return null;

      const now = new Date().toISOString();
      const copia = {
        ...original,
        id:        uid(),
        numero:    nextNumero(),
        estado:    "borrador",
        createdAt: now,
        updatedAt: now,
      };
      setCotizaciones((prev) => [copia, ...prev]);
      return copia.id;
    },
    [cotizaciones]
  );

  /* ── Cambiar estado ── */
  const cambiarEstado = useCallback((id, estado) => {
    const now = new Date().toISOString();
    setCotizaciones((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, estado, updatedAt: now } : c
      )
    );
  }, []);

  /* ── Estadísticas rápidas ── */
  const stats = {
    total:      cotizaciones.length,
    borradores: cotizaciones.filter((c) => c.estado === "borrador").length,
    enviadas:   cotizaciones.filter((c) => c.estado === "enviada").length,
    aceptadas:  cotizaciones.filter((c) => c.estado === "aceptada").length,
    valorTotal: cotizaciones.reduce((a, c) => a + (c.totals?.total || 0), 0),
  };

  return {
    cotizaciones,
    getCotizacion,
    saveCotizacion,
    deleteCotizacion,
    duplicarCotizacion,
    cambiarEstado,
    stats,
  };
}