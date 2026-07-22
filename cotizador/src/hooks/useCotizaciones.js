import { useState, useEffect, useCallback, useRef } from "react";
import { uid } from "../utils";
import {
  nubeActiva, pullCotizaciones, pushCotizacion,
  removeCotizacion, pullBorrados, nextNumeroNube, seedCounterNube,
} from "../lib/nube";

const STORAGE_KEY  = "ferreexpress_cotizaciones_v2";
const COUNTER_KEY  = "ferreexpress_cot_counter";
const BORRADOS_KEY = "ferreexpress_borrados";
const INIT_COUNTER = 31; // continúa desde COT-031

/* ─── Papelera local (IDs borrados) — evita resucitar y perder datos ─── */
const loadBorrados = () => {
  try { return new Set(JSON.parse(localStorage.getItem(BORRADOS_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveBorrados = (set) => {
  try { localStorage.setItem(BORRADOS_KEY, JSON.stringify([...set])); }
  catch { /* localStorage lleno o bloqueado */ }
};

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

const ts = (v) => new Date(v || 0).getTime();

/* Extrae el número entero de "COT-045" → 45 (0 si no hay) */
const numOf = (c) => {
  const m = /(\d+)/.exec(c?.numero || c?.config?.numero || "");
  return m ? parseInt(m[1], 10) : 0;
};

/* ══════════════════════════════════════════════════
   HOOK PRINCIPAL  (localStorage + nube opcional)
══════════════════════════════════════════════════ */
export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState(loadFromStorage);
  const [syncing, setSyncing] = useState(false);

  /* Ref siempre al día — para leer sin re-crear callbacks */
  const listRef = useRef(cotizaciones);
  useEffect(() => { listRef.current = cotizaciones; }, [cotizaciones]);

  /* Persistir en localStorage cada vez que cambia el estado */
  useEffect(() => { saveToStorage(cotizaciones); }, [cotizaciones]);

  /* ── Sincronización con la nube (a prueba de pérdidas) ──
     UNIÓN: el resultado es (local ∪ nube); NUNCA se descarta una cotización
     local que no esté confirmada en la nube (aunque una subida haya fallado).
     PAPELERA: los borrados se propagan por una lista de IDs (local ∪ nube),
     así el borrado se respeta sin resucitar ni arriesgar datos.
     La primera vez sube lo local que falte y protege la numeración. */
  const migrated = useRef(false);
  const tombRef  = useRef(loadBorrados());
  const sync = useCallback(async () => {
    if (!nubeActiva()) return;
    setSyncing(true);
    try {
      const [remote, cloudTombs] = await Promise.all([pullCotizaciones(), pullBorrados()]);

      // Fusionar papelera (local ∪ nube) y persistir
      if (cloudTombs) cloudTombs.forEach((id) => tombRef.current.add(id));
      saveBorrados(tombRef.current);

      if (!remote && !cloudTombs) return; // no se pudo leer nada; no tocar el estado

      // Migración única: proteger la numeración para no repetir COT-XXX ya usados
      if (!migrated.current) {
        const maxNum = Math.max(
          31, ...(listRef.current || []).map(numOf), ...((remote || []).map(numOf))
        );
        seedCounterNube(maxNum);
      }

      setCotizaciones((prev) => {
        const byId = new Map();
        (remote || []).forEach((c) => c?.id && byId.set(c.id, c));

        // UNIÓN: conservar (y subir) lo local que falta o que es más nuevo
        prev.forEach((lc) => {
          if (!lc?.id) return;
          const rc = byId.get(lc.id);
          if (!rc) {
            byId.set(lc.id, lc);
            if (!tombRef.current.has(lc.id)) pushCotizacion(lc);
          } else if (ts(lc.updatedAt) > ts(rc.updatedAt)) {
            byId.set(lc.id, lc);
            if (!tombRef.current.has(lc.id)) pushCotizacion(lc);
          }
        });

        // Aplicar papelera: quitar lo borrado (local ∪ nube)
        tombRef.current.forEach((id) => byId.delete(id));

        return Array.from(byId.values()).sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
      });

      migrated.current = true;
    } finally {
      setSyncing(false);
    }
  }, []);

  /* Al montar: sincroniza; luego cada 30 s y al volver el foco a la pestaña */
  useEffect(() => {
    sync();
    if (!nubeActiva()) return;
    const iv = setInterval(sync, 30000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [sync]);

  /* ── Obtener una cotización por ID ── */
  const getCotizacion = useCallback(
    (id) => listRef.current.find((c) => c.id === id) || null,
    []
  );

  /* ── Próximo número (atómico en nube, con fallback local) ── */
  const nextNumero = useCallback(async () => {
    let n = null;
    if (nubeActiva()) n = await nextNumeroNube();
    if (n == null) {
      const cur = parseInt(localStorage.getItem(COUNTER_KEY) || INIT_COUNTER, 10);
      n = cur + 1;
    }
    // Mantener el contador local al día (para fallback offline)
    const curLocal = parseInt(localStorage.getItem(COUNTER_KEY) || INIT_COUNTER, 10);
    if (n > curLocal) localStorage.setItem(COUNTER_KEY, String(n));
    return n;
  }, []);

  /* ── Guardar (crea o actualiza). Devuelve el registro guardado. ── */
  const saveCotizacion = useCallback(async (payload) => {
    const now = new Date().toISOString();
    let saved;

    if (payload.id) {
      /* Actualizar — preservar número existente */
      const existing = listRef.current.find((c) => c.id === payload.id);
      const numero = existing?.numero || existing?.config?.numero || payload.config?.numero || "";
      saved = {
        ...(existing || {}),
        ...payload,
        numero,
        config: { ...payload.config, numero },
        updatedAt: now,
      };
      setCotizaciones((prev) =>
        prev.some((c) => c.id === payload.id)
          ? prev.map((c) => (c.id === payload.id ? saved : c))
          : [saved, ...prev]
      );
    } else {
      /* Crear — asignar número */
      const n = await nextNumero();
      const numero = `COT-${String(n).padStart(3, "0")}`;
      saved = {
        ...payload,
        id: uid(),
        numero,
        config: { ...payload.config, numero },
        estado: payload.config?.estado || "borrador",
        createdAt: now,
        updatedAt: now,
      };
      setCotizaciones((prev) => [saved, ...prev]);
    }

    pushCotizacion(saved); // sube a la nube (no-op si no hay credenciales)
    return saved;
  }, [nextNumero]);

  /* ── Eliminar ── */
  const deleteCotizacion = useCallback((id) => {
    tombRef.current.add(id);          // papelera local inmediata (no reaparece)
    saveBorrados(tombRef.current);
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
    removeCotizacion(id);             // borra en la nube + registra en papelera nube
  }, []);

  /* ── Duplicar. Devuelve la copia. ── */
  const duplicarCotizacion = useCallback(async (id) => {
    const original = listRef.current.find((c) => c.id === id);
    if (!original) return null;
    const now = new Date().toISOString();
    const n = await nextNumero();
    const numero = `COT-${String(n).padStart(3, "0")}`;
    const copia = {
      ...original,
      id: uid(),
      numero,
      config: { ...original.config, numero, estado: "borrador" },
      estado: "borrador",
      createdAt: now,
      updatedAt: now,
    };
    setCotizaciones((prev) => [copia, ...prev]);
    pushCotizacion(copia);
    return copia;
  }, [nextNumero]);

  /* ── Cambiar estado ── */
  const cambiarEstado = useCallback((id, estado) => {
    const now = new Date().toISOString();
    let saved = null;
    setCotizaciones((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        saved = { ...c, estado, config: { ...c.config, estado }, updatedAt: now };
        return saved;
      })
    );
    if (saved) pushCotizacion(saved);
  }, []);

  /* ── Estadísticas rápidas ── */
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
    syncing,
    nubeActiva: nubeActiva(),
    sync,
    getCotizacion,
    saveCotizacion,
    deleteCotizacion,
    duplicarCotizacion,
    cambiarEstado,
    stats,
  };
}
