/* ─── Formatters ─────────────────────────────────────────── */

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

/* ─── IDs ─────────────────────────────────────────────────── */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ─── Filas de producto ──────────────────────────────────── */

export const blankRow = () => ({
  id: uid(),
  ref: "",
  desc: "",
  qty: 1,
  unit: "Und",
  price: "",
  disc: 0,
});

/* ─── Cálculos ───────────────────────────────────────────── */

export const calcRow = (r) => {
  const base = (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0);
  return base - base * ((parseFloat(r.disc) || 0) / 100);
};

export const calcTotals = (items, descG, iva) => {
  const subtotal  = items.reduce((a, r) => a + calcRow(r), 0);
  const descGAmt  = subtotal * ((parseFloat(descG) || 0) / 100);
  const base      = subtotal - descGAmt;
  const ivaAmt    = base * ((parseFloat(iva) || 0) / 100);
  const total     = base + ivaAmt;
  return { subtotal, descGAmt, base, ivaAmt, total };
};

/* ─── Constantes de dominio ──────────────────────────────── */

export const UNITS = [
  "Und", "m", "m²", "m³", "kg", "lb", "L",
  "gal", "Caja", "Bolsa", "Rollo", "Par", "Global",
];

export const FORMAS_PAGO = [
  "Contado",
  "Crédito 15 días",
  "Crédito 30 días",
  "Crédito 60 días",
  "50% anticipo / 50% entrega",
];

export const IVA_OPTS  = [0, 5, 8, 10, 16, 19];
export const MONEDAS   = ["COP", "USD", "EUR", "MXN"];
export const ESTADOS   = ["borrador", "enviada", "aceptada", "rechazada"];

export const ESTADO_META = {
  borrador:   { label: "Borrador",   color: "gray"   },
  enviada:    { label: "Enviada",    color: "blue"   },
  aceptada:   { label: "Aceptada",  color: "green"  },
  rechazada:  { label: "Rechazada", color: "red"    },
};

/* ─── Valores por defecto ────────────────────────────────── */

export const DEFAULT_EMPRESA = {
  nombre:  "FerreExpress S.A.S.",
  nit:     "805.030.111-8",
  dir:     "Calle 16 #76-28, Prados del Limonar",
  ciudad:  "Cali, Colombia",
  tel:     "+57 (302) 804 3116",
  correo:  "expressraquel@gmail.com",
};

export const DEFAULT_CLIENTE = {
  nombre: "", empresa: "", nit: "",
  contacto: "", correo: "", tel: "", ciudad: "",
};

export const DEFAULT_CONFIG = {
  numero:     "",         // se asigna al guardar
  fecha:      new Date().toISOString().slice(0, 10),
  vigencia:   "",
  formaPago:  "Contado",
  entrega:    "",
  moneda:     "COP",
  iva:        19,
  estado:     "borrador",
};

export const DEFAULT_NOTAS =
  "• Esta cotización es informativa y no constituye factura de venta.\n" +
  "• Los valores están expresados en pesos colombianos (COP) e incluyen IVA.\n" +
  "• La vigencia está sujeta a disponibilidad de inventario y puede variar si cambian las condiciones del mercado.\n" +
  "• Para confirmar su pedido, comuníquese con nosotros indicando el número de esta cotización.\n\n" +
  "Agradecemos su interés en FerreExpress S.A.S.";