import { useState, useEffect, useCallback } from "react";
import { uid } from "../utils";

const STORAGE_KEY  = "ferreexpress_cotizaciones_v2";
const COUNTER_KEY  = "ferreexpress_cot_counter";
const INIT_COUNTER = 31; // continúa desde COT-031

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
        prev.map((c) => {
          if (c.id !== payload.id) return c;
          // Preservar numero si ya existe (no sobreescribir con vacío)
          const numero = c.numero || c.config?.numero || "";
          return {
            ...payload,
            numero,
            config: { ...payload.config, numero },
            updatedAt: now,
          };
        })
      );
      return payload.id;
    } else {
      /* ── Crear nueva — asignar número automático ── */
      const numero = nextNumero();
      const nueva = {
        ...payload,
        id:        uid(),
        numero,                                  // en raíz para historial
        config:    { ...payload.config, numero }, // en config para cotizador
        estado:    payload.config?.estado || "borrador",
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

      const now    = new Date().toISOString();
      const numero = nextNumero();
      const copia  = {
        ...original,
        id:        uid(),
        numero,
        config:    { ...original.config, numero, estado: "borrador" },
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
        c.id === id
          ? { ...c, estado, config: { ...c.config, estado }, updatedAt: now }
          : c
      )
    );
  }, []);

  /* ── Estadísticas rápidas ──
     Usa total (alias de totalPagar) o totalPagar directamente */
  const stats = {
    total:      cotizaciones.length,
    borradores: cotizaciones.filter((c) => (c.config?.estado || c.estado) === "borrador").length,
    enviadas:   cotizaciones.filter((c) => (c.config?.estado || c.estado) === "enviada").length,
    aceptadas:  cotizaciones.filter((c) => (c.config?.estado || c.estado) === "aceptada").length,
    valorTotal: cotizaciones.reduce(
      (a, c) => a + (c.totals?.totalPagar ?? c.totals?.total ?? 0),
      0
    ),
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