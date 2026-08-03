/**
 * useClientesFrecuentes.js — directorio de clientes
 * ─────────────────────────────────────────────────────────────────
 * Los productos ya se autocompletaban, pero los clientes no: cada
 * cotización obligaba a redigitar nombre, dirección y celular aunque
 * fuera un cliente de siempre. Eso es trabajo repetido y, sobre todo,
 * fuente de errores — una dirección mal copiada es un domicilio perdido.
 *
 * Aquí cada cliente guardado se recuerda y se ofrece al escribir el
 * nombre. Se comparte con las demás PC igual que el catálogo de
 * productos, y el registro más reciente manda (si a un cliente le
 * cambia el celular, la corrección se propaga).
 *
 * Estructura en localStorage (CLIENTES_KEY):
 * {
 *   "FERRETERIA CENTRAL": {
 *     nombre, direccion, tel, empresa, nit, contacto, correo, ciudad,
 *     count: 7, updatedAt: "2026-08-01T..."
 *   }
 * }
 */

import { useState, useCallback, useEffect } from "react";
import { nubeActiva, pullClientes, pushClientes } from "../lib/nube";

const CLIENTES_KEY   = "ferreexpress_clientes";
const MAX_SUGERENCIAS = 6;

/* Campos que se recuerdan de cada cliente */
const CAMPOS = ["nombre", "direccion", "tel", "empresa", "nit", "contacto", "correo", "ciudad"];

const cargar = () => {
  try {
    const raw = localStorage.getItem(CLIENTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
};

const persistir = (data) => {
  try { localStorage.setItem(CLIENTES_KEY, JSON.stringify(data)); }
  catch { /* localStorage lleno o bloqueado */ }
};

const claveDe = (nombre) => String(nombre || "").trim().toUpperCase();

/** Aprende (o actualiza) un cliente al guardar una cotización. */
export const aprenderCliente = (cliente) => {
  const nombre = String(cliente?.nombre || "").trim();
  if (!nombre) return;

  const actual = cargar();
  const key    = claveDe(nombre);
  const prev   = actual[key] || { count: 0 };

  /* Los datos nuevos mandan, pero un campo vacío no borra lo que ya había:
     si esta vez no escribiste el NIT, se conserva el de la vez pasada. */
  const merged = { count: (prev.count || 0) + 1, updatedAt: new Date().toISOString() };
  CAMPOS.forEach((k) => {
    const nuevo = String(cliente?.[k] ?? "").trim();
    merged[k] = nuevo || prev[k] || "";
  });
  merged.nombre = nombre;   // conserva la capitalización tal como se escribió

  actual[key] = merged;
  persistir(actual);
  pushClientes(actual);     // no-op si no hay credenciales de nube
};

/* Fusiona dos directorios: gana el registro modificado más recientemente */
const fusionar = (a, b) => {
  const out = { ...a };
  Object.entries(b || {}).forEach(([k, v]) => {
    const prev = out[k];
    if (!prev) { out[k] = v; return; }
    const masNuevo = new Date(v?.updatedAt || 0) > new Date(prev?.updatedAt || 0) ? v : prev;
    const otro     = masNuevo === v ? prev : v;
    const merged   = { ...otro, ...masNuevo, count: Math.max(prev.count || 0, v.count || 0) };
    /* Un campo vacío en el más nuevo no debe borrar el dato del otro */
    CAMPOS.forEach((c) => { merged[c] = masNuevo[c] || otro[c] || ""; });
    out[k] = merged;
  });
  return out;
};

const norm = (s) => String(s ?? "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function useClientesFrecuentes() {
  const [clientes, setClientes] = useState(cargar);

  /* Recargar si cambia en otra pestaña del navegador */
  useEffect(() => {
    const handler = (e) => { if (e.key === CLIENTES_KEY) setClientes(cargar()); };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /* Traer el directorio compartido y fusionarlo con el local */
  useEffect(() => {
    if (!nubeActiva()) return;
    pullClientes().then((remote) => {
      if (!remote) return;
      const merged = fusionar(cargar(), remote);
      persistir(merged);
      setClientes(merged);
    }).catch(() => {});
  }, []);

  /**
   * Sugerencias por nombre, empresa o NIT, ordenadas por uso.
   * Busca sin distinguir mayúsculas ni tildes.
   */
  const getClientes = useCallback((query) => {
    const q = norm(query).trim();
    if (q.length < 1) return [];
    return Object.values(clientes)
      .filter((c) => norm(c.nombre).includes(q) || norm(c.empresa).includes(q) || norm(c.nit).includes(q))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, MAX_SUGERENCIAS);
  }, [clientes]);

  return { getClientes, clientes };
}
