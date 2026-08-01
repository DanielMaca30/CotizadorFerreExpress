/**
 * CotizacionesProvider.jsx — estado compartido de la aplicación
 * ─────────────────────────────────────────────────────────────────
 * ANTES: cada página llamaba a useCotizaciones() y cada llamada creaba
 * SU PROPIA copia del estado — su propio parseo de localStorage, su propio
 * intervalo de sincronización y su propia descarga completa de Supabase.
 *
 * AHORA: la lógica vive una sola vez, aquí. Las páginas consumen el mismo
 * estado, así que:
 *   • una sola sincronización con la nube (en vez de una por página);
 *   • el Historial se refresca solo al guardar desde el Cotizador;
 *   • localStorage se escribe con debounce, no en cada tecla.
 *
 * También administra las PESTAÑAS de cotizaciones abiertas.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { uid, convertirTipo, calcTotalsPorTipo } from "../utils";
import {
  nubeActiva, pullCotizaciones, pushCotizacion,
  removeCotizacion, pullBorrados, nextNumeroNube, seedCounterNube,
} from "../lib/nube";
import { CotizacionesCtx, NEW_TAB_ID, MAX_TABS } from "./cotizacionesContext";

const STORAGE_KEY  = "ferreexpress_cotizaciones_v2";
const COUNTER_KEY  = "ferreexpress_cot_counter";
const BORRADOS_KEY = "ferreexpress_borrados";
const TABS_KEY     = "ferreexpress_tabs_v1";
const INIT_COUNTER = 31; // continúa desde COT-031

const SAVE_DEBOUNCE_MS = 400;
const SYNC_INTERVAL_MS = 60000;

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

/* ─── Pestañas abiertas ─── */
const loadTabs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(TABS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch { return []; }
};
const saveTabs = (tabs) => {
  try { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); }
  catch { /* noop */ }
};

const ts = (v) => new Date(v || 0).getTime();

/* Extrae el número entero de "COT-045" → 45 (0 si no hay) */
const numOf = (c) => {
  const m = /(\d+)/.exec(c?.numero || c?.config?.numero || "");
  return m ? parseInt(m[1], 10) : 0;
};

/* ══════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════ */
export function CotizacionesProvider({ children }) {
  const [cotizaciones, setCotizaciones] = useState(loadFromStorage);
  const [syncing, setSyncing] = useState(false);
  const [tabs, setTabs] = useState(loadTabs);

  /* Ref siempre al día — para leer sin re-crear callbacks */
  const listRef = useRef(cotizaciones);
  useEffect(() => { listRef.current = cotizaciones; }, [cotizaciones]);

  /* ── Persistencia con debounce ──
     Escribir el JSON completo en cada pulsación era uno de los motivos
     del arrastre con listas grandes. Ahora se agrupa cada 400 ms y se
     fuerza el volcado al cerrar u ocultar la pestaña, así no se pierde nada. */
  useEffect(() => {
    const t = setTimeout(() => saveToStorage(cotizaciones), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cotizaciones]);

  useEffect(() => {
    const flush = () => saveToStorage(listRef.current);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);

  /* Persistir pestañas */
  useEffect(() => { saveTabs(tabs); }, [tabs]);

  /* ── Sincronización con la nube (a prueba de pérdidas) ──
     UNIÓN: el resultado es (local ∪ nube); NUNCA se descarta una cotización
     local que no esté confirmada en la nube (aunque una subida haya fallado).
     PAPELERA: los borrados se propagan por una lista de IDs (local ∪ nube),
     así el borrado se respeta sin resucitar ni arriesgar datos.
     La primera vez sube lo local que falte y protege la numeración. */
  const migrated = useRef(false);
  const tombRef  = useRef(loadBorrados());
  /* Marca de agua: hasta qué momento ya tenemos datos de la nube.
     null = todavía no se ha hecho la carga completa de esta sesión. */
  const cursorRef = useRef(null);

  const sync = useCallback(async () => {
    if (!nubeActiva()) return;
    setSyncing(true);
    try {
      const completa = !cursorRef.current;
      const [remote, cloudTombs] = await Promise.all([
        pullCotizaciones(completa ? null : cursorRef.current),
        pullBorrados(),
      ]);

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
        /* La base es SIEMPRE lo local: en las sincronizaciones diferenciales
           `remote` solo trae lo que cambió, no la lista completa. */
        const byId = new Map();
        prev.forEach((c) => c?.id && byId.set(c.id, c));

        // Aplicar lo que llegó de la nube cuando es más nuevo que lo local
        (remote || []).forEach((rc) => {
          if (!rc?.id) return;
          const lc = byId.get(rc.id);
          if (!lc || ts(rc.updatedAt) > ts(lc.updatedAt)) byId.set(rc.id, rc);
        });

        /* Reconciliación de subida: solo en la carga completa. Después, cada
           guardado ya sube por su cuenta, así que no hace falta repasarlo todo. */
        if (completa) {
          const remotos = new Map((remote || []).filter(Boolean).map((c) => [c.id, c]));
          prev.forEach((lc) => {
            if (!lc?.id || tombRef.current.has(lc.id)) return;
            const rc = remotos.get(lc.id);
            if (!rc || ts(lc.updatedAt) > ts(rc.updatedAt)) pushCotizacion(lc);
          });
        }

        // Aplicar papelera: quitar lo borrado (local ∪ nube)
        tombRef.current.forEach((id) => byId.delete(id));

        return Array.from(byId.values()).sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
      });

      /* Avanzar la marca de agua usando la hora de los propios datos (no el
         reloj local, que puede ir desfasado entre PCs) y retroceder 5 minutos
         de margen para no perder nada por desajustes de reloj. Cada recarga
         de la página vuelve a hacer una carga completa, que sirve de red. */
      const maxRemoto = (remote || []).reduce((m, c) => Math.max(m, ts(c?.updatedAt)), 0);
      const base = maxRemoto || (completa ? Date.now() : ts(cursorRef.current));
      cursorRef.current = new Date(base - 5 * 60000).toISOString();

      migrated.current = true;
    } finally {
      setSyncing(false);
    }
  }, []);

  /* Al montar: sincroniza; luego cada 60 s (saltando si la pestaña está en
     segundo plano) y al volver el foco. Antes eran 30 s por CADA página montada. */
  useEffect(() => {
    sync();
    if (!nubeActiva()) return;
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, SYNC_INTERVAL_MS);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [sync]);

  /* ── Obtener una cotización por ID ──
     Lee del estado, NO del ref: el ref se actualiza en un efecto del provider
     y los efectos de las páginas hijas corren antes que los del padre. Con el
     ref, el editor podía no encontrar una cotización recién guardada (y mandar
     al historial), y la pestaña recién creada se quedaba sin número. */
  const getCotizacion = useCallback(
    (id) => cotizaciones.find((c) => c.id === id) || null,
    [cotizaciones]
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

  /* ── Pestañas ─────────────────────────────────────────────── */
  const openTab = useCallback((id) => {
    if (!id) return;
    setTabs((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      // Si se pasa del tope, se cierra la más antigua distinta de la que se abre
      if (next.length > MAX_TABS) {
        const sobra = next.find((t) => t !== id);
        return next.filter((t) => t !== sobra);
      }
      return next;
    });
  }, []);

  /** Cierra una pestaña y devuelve la que debería quedar activa (o null). */
  const closeTab = useCallback((id) => {
    const prev = tabs;
    const idx  = prev.indexOf(id);
    const next = prev.filter((t) => t !== id);
    setTabs(next);
    if (!next.length) return null;
    return next[Math.min(idx, next.length - 1)] ?? null;
  }, [tabs]);

  const closeOtherTabs = useCallback((id) => setTabs((prev) => prev.filter((t) => t === id)), []);
  const closeAllTabs   = useCallback(() => setTabs([]), []);

  /** Sustituye una pestaña por otra EN EL MISMO SITIO (Nueva → COT-XXX). */
  const replaceTab = useCallback((oldId, newId) => {
    setTabs((prev) => {
      if (!prev.includes(oldId)) return prev.includes(newId) ? prev : [...prev, newId];
      if (prev.includes(newId)) return prev.filter((t) => t !== oldId);
      return prev.map((t) => (t === oldId ? newId : t));
    });
  }, []);

  /* Limpieza única al arrancar: descarta pestañas de cotizaciones que ya no existen.
     localStorage es la fuente completa al montar, así que es seguro. */
  const tabsCleaned = useRef(false);
  useEffect(() => {
    if (tabsCleaned.current) return;
    tabsCleaned.current = true;
    const ids = new Set(listRef.current.map((c) => c.id));
    setTabs((prev) => prev.filter((t) => t === NEW_TAB_ID || ids.has(t)));
  }, []);

  /* Autoguardado del editor activo — lo registra CotizadorPage para que la
     barra de pestañas pueda guardar antes de cambiar de cotización. */
  const autoSaveRef = useRef(null);
  const registerAutoSave = useCallback((fn) => { autoSaveRef.current = fn; }, []);
  const flushAutoSave = useCallback(async () => {
    try { return await autoSaveRef.current?.(); }
    catch (e) { console.error("[autoSave pestañas]", e); return null; }
  }, []);

  /* ── Eliminar ── */
  const deleteCotizacion = useCallback((id) => {
    tombRef.current.add(id);          // papelera local inmediata (no reaparece)
    saveBorrados(tombRef.current);
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
    setTabs((prev) => prev.filter((t) => t !== id)); // cierra su pestaña
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

  /* ── Convertir Comercial ⇄ Obra (desde el Historial) ──
     Los precios NO se tocan; solo cambia el motor de cálculo del total. */
  const convertirCotizacion = useCallback((id, tipoDestino, aiuOverride) => {
    const cot = listRef.current.find((c) => c.id === id);
    if (!cot) return null;

    const conv = convertirTipo(tipoDestino, {
      config:    cot.config || {},
      aiuConfig: aiuOverride || cot.aiuConfig,
      notas:     cot.notas,
      items:     cot.items || [],
    });

    const totals = calcTotalsPorTipo(tipoDestino, cot.items || [], cot.descG || 0, {
      iva: conv.config.iva,
      aiu: conv.aiuConfig,
    });

    const saved = {
      ...cot,
      config:    conv.config,
      aiuConfig: conv.aiuConfig,
      notas:     conv.notas,
      totals,
      updatedAt: new Date().toISOString(),
    };

    setCotizaciones((prev) => prev.map((c) => (c.id === id ? saved : c)));
    pushCotizacion(saved);
    return saved;
  }, []);

  /* ── Estadísticas rápidas ── */
  const stats = useMemo(() => ({
    total:      cotizaciones.length,
    borradores: cotizaciones.filter((c) => (c.config?.estado || c.estado) === "borrador").length,
    enviadas:   cotizaciones.filter((c) => (c.config?.estado || c.estado) === "enviada").length,
    aceptadas:  cotizaciones.filter((c) => (c.config?.estado || c.estado) === "aceptada").length,
    valorTotal: cotizaciones.reduce(
      (a, c) => a + (c.totals?.totalPagar ?? c.totals?.total ?? 0),
      0
    ),
  }), [cotizaciones]);

  const value = useMemo(() => ({
    cotizaciones,
    syncing,
    nubeActiva: nubeActiva(),
    sync,
    getCotizacion,
    saveCotizacion,
    deleteCotizacion,
    duplicarCotizacion,
    cambiarEstado,
    convertirCotizacion,
    stats,
    /* pestañas */
    tabs,
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    replaceTab,
    registerAutoSave,
    flushAutoSave,
  }), [
    cotizaciones, syncing, sync, getCotizacion, saveCotizacion, deleteCotizacion,
    duplicarCotizacion, cambiarEstado, convertirCotizacion, stats,
    tabs, openTab, closeTab, closeOtherTabs, closeAllTabs, replaceTab,
    registerAutoSave, flushAutoSave,
  ]);

  return <CotizacionesCtx.Provider value={value}>{children}</CotizacionesCtx.Provider>;
}
