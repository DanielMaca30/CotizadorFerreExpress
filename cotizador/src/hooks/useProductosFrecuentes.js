/**
 * useProductosFrecuentes.js
 * ─────────────────────────────────────────────────────────────
 * Aprende productos automáticamente de cada cotización guardada.
 * Provee sugerencias filtradas por texto escrito.
 *
 * Estructura en localStorage (FRECUENTES_KEY):
 * {
 *   "CABLE #12 BLANCO": { desc: "CABLE #12 BLANCO", price: "3500", count: 12, unit: "m" },
 *   "BULTO ARENA":      { desc: "BULTO ARENA",      price: "6000", count: 8,  unit: "Und" },
 *   ...
 * }
 *
 * Al guardar una cotización, cada producto no-vacío se registra/actualiza.
 * count sube con cada aparición — ordena por frecuencia.
 */

import { useState, useCallback, useEffect, useRef } from "react";

const FRECUENTES_KEY = "ferreexpress_productos_frecuentes";
const MAX_SUGERENCIAS = 8; // máximo de items en el dropdown

/* ── Leer del storage ── */
const cargar = () => {
  try {
    const raw = localStorage.getItem(FRECUENTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/* ── Guardar en el storage ── */
const persistir = (data) => {
  try { localStorage.setItem(FRECUENTES_KEY, JSON.stringify(data)); }
  catch (_) {}
};

/* ── Aprender productos de una lista de items ── */
export const aprenderProductos = (items) => {
  const actual = cargar();
  items.forEach((r) => {
    const desc = (r.desc || "").trim();
    if (!desc) return;
    const key = desc.toUpperCase();
    const prev = actual[key] || { desc, price: r.price, unit: r.unit, count: 0 };
    actual[key] = {
      desc,                              // conserva capitalización original
      price: r.price || prev.price,     // actualiza precio al más reciente
      unit:  r.unit  || prev.unit || "Und",
      count: prev.count + 1,
    };
  });
  persistir(actual);
};

/* ── Hook principal ── */
export function useProductosFrecuentes() {
  const [frecuentes, setFrecuentes] = useState(cargar);

  /* Recargar si cambia en otra pestaña */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === FRECUENTES_KEY) setFrecuentes(cargar());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /**
   * Devuelve sugerencias filtradas por `query`, ordenadas por frecuencia.
   * Fuzzy: busca query como substring en desc (case-insensitive, sin tildes).
   */
  const getSugerencias = useCallback((query) => {
    if (!query || query.trim().length < 1) return [];
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = norm(query.trim());
    return Object.values(frecuentes)
      .filter((p) => norm(p.desc).includes(q))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_SUGERENCIAS);
  }, [frecuentes]);

  return { getSugerencias, frecuentes };
}