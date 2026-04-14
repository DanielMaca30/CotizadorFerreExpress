/* ─────────────────────────────────────────────────────────────
   src/utils/index.js  —  FerreExpress cotizador

   LÓGICA DE PRECIOS:
   El usuario ingresa el precio CON IVA incluido.

     precioSinIva = precioConIva / (1 + iva/100)
     ivaUnidad    = precioConIva - precioSinIva
     totalLinea   = precioConIva × cantidad

   Resumen:
     Total Bruto  = Σ (precioSinIva × qty)
     IVA total    = Σ (ivaUnidad × qty)
     Total Pagar  = Total Bruto + IVA total
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

/* ── Fechas automáticas ──────────────────────────────────────── */

const todayISO = () => new Date().toISOString().slice(0, 10);

const plusDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ── IDs ─────────────────────────────────────────────────────── */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ── Fila en blanco ──────────────────────────────────────────── */

export const blankRow = () => ({
  id:    uid(),
  ref:   "",
  desc:  "",
  qty:   1,
  unit:  "Und",
  price: "",   // precio CON IVA incluido
  disc:  0,
});

/* ── Cálculos por línea ──────────────────────────────────────── */

/** Precio sin IVA dado un precio que ya incluye IVA */
export const precioBase = (precioConIva, ivaRate) =>
  ivaRate > 0 ? precioConIva / (1 + ivaRate) : precioConIva;

/** IVA en pesos de una unidad */
export const ivaUnidad = (precioConIva, ivaRate) =>
  precioConIva - precioBase(precioConIva, ivaRate);

/** Total de la línea (precio con IVA × cantidad, menos descuento por línea) */
export const calcRow = (r) => {
  const p    = parseFloat(r.price) || 0;
  const qty  = parseFloat(r.qty)   || 1;
  const disc = parseFloat(r.disc)  || 0;
  const raw  = p * qty;
  return raw - raw * (disc / 100);
};

/**
 * Totales del documento.
 * Devuelve `total` como alias de `totalPagar` para compatibilidad
 * con HistorialPage y cualquier código que lea `totals.total`.
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
    total: totalPagar,  // ← alias para compatibilidad con historial y hooks
  };
};

/* ── Constantes de dominio ───────────────────────────────────── */

export const UNITS = [
  "Und", "m", "m²", "m³", "kg", "lb", "L",
  "gal", "Caja", "Bolsa", "Rollo", "Par", "Global",
];

export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Tarjeta"];

export const IVA_OPTS = [0, 5, 8, 10, 16, 19];
export const MONEDAS  = ["COP", "USD", "EUR", "MXN"];
export const ESTADOS  = ["borrador", "enviada", "aceptada", "rechazada"];

export const ESTADO_META = {
  borrador:  { label: "Borrador",  color: "gray"   },
  enviada:   { label: "Enviada",   color: "blue"   },
  aceptada:  { label: "Aceptada", color: "green"  },
  rechazada: { label: "Rechazada",color: "red"    },
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
  vigencia:  plusDaysISO(7),
  formaPago: "Efectivo",
  moneda:    "COP",
  iva:       19,
  estado:    "borrador",
};

export const DEFAULT_NOTAS =
  "• Esta cotización es informativa y no constituye factura de venta.\n" +
  "• Los valores están expresados en pesos colombianos (COP) e incluyen IVA.\n" +
  "• La vigencia está sujeta a disponibilidad de inventario y puede variar si cambian las condiciones del mercado.\n" +
  "• Para confirmar su pedido, comuníquese con nosotros indicando el número de esta cotización.\n\n" +
  "Agradecemos su interés en FerreExpress S.A.S.";

/* ── Persistencia empresa en localStorage ────────────────────── */

const EMPRESA_KEY = "ferreexpress_empresa";

export const saveEmpresaLocal = (empresa) => {
  try {
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
  } catch (_) {}
};

export const loadEmpresaLocal = () => {
  try {
    const raw = localStorage.getItem(EMPRESA_KEY);
    return raw ? { ...DEFAULT_EMPRESA, ...JSON.parse(raw) } : DEFAULT_EMPRESA;
  } catch (_) {
    return DEFAULT_EMPRESA;
  }
};