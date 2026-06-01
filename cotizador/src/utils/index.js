/* ─────────────────────────────────────────────────────────────
   src/utils/index.js  —  FerreExpress cotizador

   MODO COMERCIAL:
     Precio ingresado CON IVA incluido por producto.
     precioSinIva = precioConIva / (1 + iva/100)
     Total Bruto  = Σ (precioSinIva × qty × factor)
     IVA total    = Σ (ivaUnidad × qty × factor)
     Total Pagar  = Total Bruto + IVA - Descuento global

   MODO OBRA (AIU):
     Precio ingresado como precio BASE (sin IVA).
     Costo Directo = Σ (precio × qty × factor)
     Administración = Costo Directo × admin%
     Imprevistos    = Costo Directo × imprevistos%
     Utilidad       = Costo Directo × utilidad%
     Subtotal AIU   = Costo Directo + Admin + Imprevistos + Utilidad
     IVA Obra       = Utilidad × 19%  (IVA solo sobre utilidad)
     Total a Pagar  = Subtotal AIU + IVA Obra
   ───────────────────────────────────────────────────────────── */

/* ── Formatters ──────────────────────────────────────────────── */

export const money = (n, mon = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: mon,
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtDate = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

export const fmtDateShort = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/* ── Formateo de precios estilo colombiano (1.500.000) ───────── */

/** Formatea un número a "1.500.000" (sin símbolo de moneda) */
export const formatPriceCO = (value) => {
  const num = String(value ?? "").replace(/\D/g, "");
  if (!num) return "";
  return parseInt(num, 10).toLocaleString("es-CO");
};

/** Quita los puntos de formato y devuelve el número como string */
export const parsePriceCO = (formatted) =>
  String(formatted ?? "").replace(/\./g, "").replace(/,/g, "");

/* ── Fechas automáticas ──────────────────────────────────────── */

const todayISO = () => new Date().toISOString().slice(0, 10);

const plusDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ── IDs ─────────────────────────────────────────────────────── */

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

/* ── Fila en blanco ──────────────────────────────────────────── */

export const blankRow = () => ({
  id:    uid(),
  ref:   "",
  desc:  "",
  qty:   1,
  unit:  "Und",
  price: "",
  disc:  0,
});

/* ── Cálculos por línea ──────────────────────────────────────── */

/** Precio sin IVA dado un precio que ya incluye IVA */
export const precioBase = (precioConIva, ivaRate) =>
  ivaRate > 0 ? precioConIva / (1 + ivaRate) : precioConIva;

/** IVA en pesos de una unidad */
export const ivaUnidad = (precioConIva, ivaRate) =>
  precioConIva - precioBase(precioConIva, ivaRate);

/** Total de la línea (precio × cantidad, menos descuento por línea) */
export const calcRow = (r) => {
  const p    = parseFloat(r.price) || 0;
  const qty  = parseFloat(r.qty)   || 1;
  const disc = parseFloat(r.disc)  || 0;
  const raw  = p * qty;
  return raw - raw * (disc / 100);
};

/* ── Totales COMERCIAL ───────────────────────────────────────── */

/**
 * Totales modo comercial (IVA por producto incluido en precio).
 * Devuelve `total` como alias de `totalPagar` para compatibilidad.
 */
export const calcTotals = (items, descG, iva) => {
  const rate = (parseFloat(iva) || 0) / 100;

  let totalBruto = 0;
  let ivaTotal   = 0;

  items.forEach((r) => {
    const p      = parseFloat(r.price) || 0;
    const qty    = parseFloat(r.qty)   || 1;
    const disc   = parseFloat(r.disc)  || 0;
    const factor = 1 - disc / 100;

    totalBruto += precioBase(p, rate) * qty * factor;
    ivaTotal   += ivaUnidad(p, rate)  * qty * factor;
  });

  const totalConIva = totalBruto + ivaTotal;
  const descGAmt    = totalConIva * ((parseFloat(descG) || 0) / 100);
  const totalPagar  = totalConIva - descGAmt;

  return {
    totalBruto,
    ivaTotal,
    descGAmt,
    totalPagar,
    total: totalPagar,
  };
};

/* ── Totales OBRA (AIU) ──────────────────────────────────────── */

/**
 * Totales modo obra.
 * Precios ingresados SIN IVA.
 * IVA del 19% aplica solo sobre el componente de Utilidad.
 */
export const calcTotalsObra = (items, descG, aiu) => {
  const { admin = 0, imprevistos = 0, utilidad = 0 } = aiu || {};

  let costoDirecto = 0;
  items.forEach((r) => {
    const p    = parseFloat(r.price) || 0;
    const qty  = parseFloat(r.qty)   || 1;
    const disc = parseFloat(r.disc)  || 0;
    costoDirecto += p * qty * (1 - disc / 100);
  });

  const descGAmt   = costoDirecto * ((parseFloat(descG) || 0) / 100);
  const costoBase  = costoDirecto - descGAmt;

  const adminAmt   = costoBase * (admin / 100);
  const impAmt     = costoBase * (imprevistos / 100);
  const utilAmt    = costoBase * (utilidad / 100);

  const subtotalAIU = costoBase + adminAmt + impAmt + utilAmt;
  const ivaUtilidad = utilAmt * 0.19;   // IVA 19% solo sobre utilidad
  const totalPagar  = subtotalAIU + ivaUtilidad;

  return {
    costoDirecto,
    descGAmt,
    costoBase,
    adminAmt,
    impAmt,
    utilAmt,
    subtotalAIU,
    ivaUtilidad,
    totalPagar,
    total:      totalPagar,
    totalBruto: costoBase,    // alias compatibilidad
    ivaTotal:   ivaUtilidad,  // alias compatibilidad
  };
};

/* ── Constantes de dominio ───────────────────────────────────── */

export const UNITS = [
  "Und", "m", "m²", "m³", "kg", "lb", "L",
  "gal", "Caja", "Bolsa", "Rollo", "Par", "Global", "ml", "ton", "día", "hora",
];

export const FORMAS_PAGO      = ["Efectivo", "Transferencia", "Tarjeta", "Cheque"];
export const FORMAS_PAGO_OBRA = ["Anticipo + Actas", "Anticipo", "Por Actas", "Crédito"];

export const IVA_OPTS = [0, 5, 8, 10, 16, 19];
export const MONEDAS  = ["COP", "USD", "EUR", "MXN"];
export const ESTADOS  = ["borrador", "enviada", "aceptada", "rechazada"];

export const ESTADO_META = {
  borrador:  { label: "Borrador",  color: "gray"  },
  enviada:   { label: "Enviada",   color: "blue"  },
  aceptada:  { label: "Aceptada", color: "green" },
  rechazada: { label: "Rechazada",color: "red"   },
};

/* ── Valores por defecto ─────────────────────────────────────── */

export const DEFAULT_EMPRESA = {
  nombre:  "FerreExpress S.A.S.",
  nit:     "805.030.111-8",
  dir:     "Calle 16 #76-28, Prados del Limonar",
  ciudad:  "Cali, Colombia",
  tel:     "+57 (302) 804 3116",
  correo:  "ferreexpressltda@hotmail.com",
  logo:    "",
};

export const DEFAULT_CLIENTE = {
  nombre: "", empresa: "", nit: "",
  contacto: "", correo: "", tel: "", ciudad: "",
};

export const DEFAULT_CONFIG = {
  numero:    "",
  fecha:     todayISO(),
  vigencia:  plusDaysISO(30),
  formaPago: "Efectivo",
  moneda:    "COP",
  iva:       19,
  estado:    "borrador",
  tipo:      "comercial",  // 'comercial' | 'obra'
};

export const DEFAULT_AIU = {
  admin:       10,
  imprevistos:  5,
  utilidad:     5,
  anticipo:    30,
};

export const DEFAULT_NOTAS =
  "• Esta cotización es informativa y no constituye factura de venta.\n" +
  "• Los valores están expresados en pesos colombianos (COP) e incluyen IVA.\n" +
  "• La vigencia está sujeta a disponibilidad de inventario y puede variar si cambian las condiciones del mercado.\n" +
  "• Para confirmar su pedido, comuníquese con nosotros indicando el número de esta cotización.\n\n" +
  "Agradecemos su interés en FerreExpress S.A.S.";

export const DEFAULT_NOTAS_OBRA =
  "• Esta cotización es informativa y no constituye factura de venta.\n" +
  "• Valores expresados en pesos colombianos (COP).\n" +
  "• El IVA del 19% aplica únicamente sobre el componente de Utilidad.\n" +
  "• El anticipo acordado deberá consignarse antes del inicio de la obra.\n" +
  "• Los valores están sujetos a variaciones en el costo de materiales y mano de obra.\n" +
  "• Para confirmar la propuesta, comuníquese indicando el número de esta cotización.\n\n" +
  "Agradecemos su interés en FerreExpress S.A.S.";

/* ── Persistencia empresa en localStorage ────────────────────── */

const EMPRESA_KEY = "ferreexpress_empresa";

export const saveEmpresaLocal = (empresa) => {
  try {
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
  } catch {
    // silencioso — localStorage puede estar bloqueado en modo privado
  }
};

export const loadEmpresaLocal = () => {
  try {
    const raw = localStorage.getItem(EMPRESA_KEY);
    if (!raw) return DEFAULT_EMPRESA;
    return { ...DEFAULT_EMPRESA, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EMPRESA;
  }
};
