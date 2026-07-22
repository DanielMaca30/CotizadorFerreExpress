/**
 * nube.js — Sincronización en la nube (Supabase) para FerreExpress
 * ─────────────────────────────────────────────────────────────────
 * OBJETIVO: que todas las PC de la empresa vean las mismas cotizaciones,
 * la misma numeración, la misma info de empresa y los mismos productos
 * frecuentes — sin dejar de funcionar si no hay internet o credenciales.
 *
 * DISEÑO:
 *   • localStorage sigue siendo la caché local (rápida y offline).
 *   • Si NO hay credenciales → nubeActiva() = false y todo cae a local.
 *   • Si hay credenciales → se sincroniza contra Supabase.
 *
 * Config (archivo .env, ver README_NUBE.md):
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 *
 * Todas las funciones son defensivas: ante cualquier error devuelven
 * null / [] y registran en consola, nunca lanzan hacia la UI.
 */

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Cliente único (o null si no hay credenciales) */
export const supabase =
  URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

export const nubeActiva = () => !!supabase;

/* Espacio de trabajo compartido: una sola empresa comparte estas filas.
   Si en el futuro se quieren varias empresas aisladas, cambiar este valor
   por PC/empresa (o usar proyectos Supabase distintos). */
const ORG = import.meta.env.VITE_ORG_ID || "ferreexpress";

/* ════════════════════════════════════════════════════════════
   COTIZACIONES
════════════════════════════════════════════════════════════ */

/** Descarga todas las cotizaciones de la nube (array, más recientes primero). */
export async function pullCotizaciones() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("data")
      .eq("org", ORG)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => r.data).filter(Boolean);
  } catch (e) {
    console.error("[nube] pullCotizaciones:", e.message);
    return null;
  }
}

/** Sube (crea o actualiza) una cotización completa. */
export async function pushCotizacion(cot) {
  if (!supabase || !cot?.id) return false;
  try {
    const { error } = await supabase.from("cotizaciones").upsert(
      {
        id: cot.id,
        org: ORG,
        numero: cot.numero || cot.config?.numero || null,
        updated_at: cot.updatedAt || new Date().toISOString(),
        data: cot,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[nube] pushCotizacion:", e.message);
    return false;
  }
}

/** Elimina una cotización de la nube y la registra en la papelera. */
export async function removeCotizacion(id) {
  if (!supabase || !id) return false;
  try {
    // Registrar en papelera primero (así el borrado se propaga aunque el delete falle)
    await supabase.from("borrados").upsert({ org: ORG, id }, { onConflict: "org,id" });
    const { error } = await supabase.from("cotizaciones").delete().eq("id", id).eq("org", ORG);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[nube] removeCotizacion:", e.message);
    return false;
  }
}

/** Descarga los IDs de cotizaciones borradas (papelera). */
export async function pullBorrados() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("borrados").select("id").eq("org", ORG);
    if (error) throw error;
    return (data || []).map((r) => r.id);
  } catch (e) {
    console.error("[nube] pullBorrados:", e.message);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   NUMERACIÓN ATÓMICA (evita choques entre PCs)
════════════════════════════════════════════════════════════ */

/**
 * Pide a la base el siguiente número de forma atómica (RPC).
 * Devuelve el entero siguiente, o null si falla (el llamador cae a local).
 */
export async function nextNumeroNube() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("next_cotizacion_numero", { p_org: ORG });
    if (error) throw error;
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.error("[nube] nextNumeroNube:", e.message);
    return null;
  }
}

/**
 * Asegura que el contador de la nube no quede por debajo de `minN`.
 * Se llama al migrar datos viejos para no repetir números ya usados.
 */
export async function seedCounterNube(minN) {
  if (!supabase || !Number.isFinite(minN)) return null;
  try {
    const { data, error } = await supabase.rpc("ensure_cotizacion_counter", {
      p_org: ORG, p_min: Math.trunc(minN),
    });
    if (error) throw error;
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.error("[nube] seedCounterNube:", e.message);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   CONFIG COMPARTIDA (empresa · productos frecuentes)
   Tabla `config`: (org, key) → value jsonb
════════════════════════════════════════════════════════════ */

async function pullConfig(key) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("config")
      .select("value")
      .eq("org", ORG)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  } catch (e) {
    console.error(`[nube] pullConfig(${key}):`, e.message);
    return null;
  }
}

async function pushConfig(key, value) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("config")
      .upsert({ org: ORG, key, value, updated_at: new Date().toISOString() }, { onConflict: "org,key" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[nube] pushConfig(${key}):`, e.message);
    return false;
  }
}

export const pullEmpresa = () => pullConfig("empresa");
export const pullFrecuentes = () => pullConfig("frecuentes");
export const pushFrecuentes = (obj) => pushConfig("frecuentes", obj);

/* Empresa con debounce: se escribe seguido mientras el usuario teclea */
let empresaTimer = null;
export function pushEmpresaDebounced(obj, ms = 1200) {
  if (!supabase) return;
  clearTimeout(empresaTimer);
  empresaTimer = setTimeout(() => pushConfig("empresa", obj), ms);
}
