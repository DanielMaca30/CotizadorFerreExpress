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

/* Crear un formateador de Intl cuesta caro (decenas de microsegundos) y
   estas funciones se llaman una vez por producto, por total y por fecha en
   CADA repintado — con una lista larga son miles de llamadas por tecla.
   Se crean una sola vez por formato y se reutilizan. */
const _money = new Map();
const fmtMoney = (mon) => {
  let f = _money.get(mon);
  if (!f) {
    f = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: mon,
      maximumFractionDigits: 0,
    });
    _money.set(mon, f);
  }
  return f;
};

export const money = (n, mon = "COP") => fmtMoney(mon).format(n || 0);

/* Precio unitario: muestra los centavos SOLO si los tiene (1.500,50).
   Con money() a secas un precio de 1.500,50 salía como 1.501. */
const _moneyDec = new Map();
export const moneyUnit = (n, mon = "COP") => {
  const v = Number(n) || 0;
  if (Math.abs(v - Math.round(v)) < 0.005) return money(v, mon);
  let f = _moneyDec.get(mon);
  if (!f) {
    f = new Intl.NumberFormat("es-CO", { style: "currency", currency: mon, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    _moneyDec.set(mon, f);
  }
  return f.format(v);
};

const fLarga = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" });
const fCorta = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export const fmtDate = (iso) =>
  iso ? fLarga.format(new Date(iso + "T12:00:00")) : "—";

export const fmtDateShort = (iso) =>
  iso ? fCorta.format(new Date(iso + "T12:00:00")) : "—";

/* ── Formateo de precios estilo colombiano (1.500.000) ───────── */

/** Formatea un número a "1.500.000" (sin símbolo de moneda) */
const fMiles = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/**
 * Formatea un valor a notación colombiana: "1.500.000" ó "1.500,50".
 * Acepta number o string, incluyendo strings con decimal tipo "1500.5".
 */
export const formatPriceCO = (value) => {
  const s = String(value ?? "");
  if (!s) return "";
  // Separar parte entera y decimal si el string tiene un punto decimal
  // (punto seguido de 1–2 dígitos al final, como en "1500.5" o "1500.50")
  const m = s.match(/^(\d*)\.?(\d{1,2})?$/);
  if (m) {
    const intNum = parseInt(m[1] || "0", 10);
    if (isNaN(intNum)) return "";
    const intFmt = fMiles.format(intNum);
    return m[2] !== undefined ? `${intFmt},${m[2]}` : intFmt;
  }
  // Fallback: solo entero
  const num = s.replace(/\D/g, "");
  if (!num) return "";
  return fMiles.format(parseInt(num, 10));
};

/**
 * Convierte texto en formato colombiano (1.500,50 ó 1500.50) a string numérico
 * que parseFloat() entiende ("1500.5").
 * Reglas:
 *  · Si hay coma → la coma es el decimal; los puntos son miles.
 *  · Si hay un solo punto y ≤2 dígitos detrás → es decimal (iPhone/teclado QWERTY).
 *  · Si hay varios puntos → todos son separadores de miles, sin decimal.
 */
export const parsePriceCO = (formatted) => {
  const s = String(formatted ?? "");
  if (!s) return "";
  // Tiene coma: colombiano estándar  "1.500,50" → "1500.50"
  if (s.includes(",")) {
    return s.replace(/\./g, "").replace(",", ".");
  }
  // Tiene UN solo punto → puede ser decimal o miles
  const dots = s.split(".").length - 1;
  if (dots === 1) {
    const afterDot = s.slice(s.lastIndexOf(".") + 1);
    if (afterDot.length <= 2) {
      // "1500.50" → decimal (teclado QWERTY/iPhone)
      return s;
    }
  }
  // Sin coma y sin punto decimal → solo quitar puntos de miles
  return s.replace(/\./g, "");
};

/* ── Fechas automáticas ──────────────────────────────────────── */

/* Fecha LOCAL (no UTC). Con toISOString() la fecha salía en hora de
   Greenwich: en Colombia (UTC-5), toda cotización hecha después de las
   7 de la noche quedaba con la fecha del día siguiente. */
const isoLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
export const todayISO = () => isoLocal(new Date());

export const plusDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoLocal(d);
};

/* ── Números escritos a la colombiana ────────────────────────
   Una sola regla para precios, cantidades y porcentajes, en celular y
   en computador. Antes cada casilla tenía la suya y fallaban:
     · en el celular "1500,5" quedaba 15.005 (se perdía la coma);
     · en el computador "1.250.000" quedaba 1,25;
     · la cantidad "1,5" quedaba 15.
   Reglas:
     · La coma siempre es decimal; los puntos que la acompañan son miles.
     · Varios puntos → son miles ("1.250.000").
     · Un solo punto: en PRECIOS, si lleva exactamente 3 cifras detrás es
       de miles ("1.250" = 1250); si lleva 1 o 2, es decimal ("1500.5",
       teclado del iPhone). En CANTIDADES un punto solo es decimal.
   Devuelve texto numérico con punto decimal ("1500.5") o "" si no hay número. */
export const parseNumeroCO = (texto, { tipo = "precio", decimales = 2 } = {}) => {
  let s = String(texto ?? "").trim().replace(/[\s$]/g, "");
  if (!s) return "";
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return "";
  let ent, dec;
  if (s.includes(",")) {
    const i = s.lastIndexOf(",");
    ent = s.slice(0, i).replace(/[.,]/g, "");
    dec = s.slice(i + 1).replace(/[.,]/g, "");
  } else {
    const puntos = s.split(".").length - 1;
    if (puntos === 0) { ent = s; dec = undefined; }
    else if (puntos > 1) { ent = s.replace(/\./g, ""); dec = undefined; }
    else {
      const [a, b] = s.split(".");
      if (tipo === "precio" && b.length === 3) { ent = a + b; dec = undefined; }
      else { ent = a; dec = b; }
    }
  }
  ent = ent.replace(/^0+(?=\d)/, "");
  if (dec !== undefined) dec = dec.slice(0, decimales);
  if (!ent && !dec) return "";
  if (dec === undefined || dec === "") return ent || "0";
  return `${ent || "0"}.${dec}`;
};

/** Cantidad para mostrar: 1.5 → "1,5"; 3 → "3" */
export const fmtCantidad = (q) => {
  const n = parseFloat(q);
  if (!Number.isFinite(n)) return String(q ?? "");
  return Number.isInteger(n)
    ? String(n)
    : String(Math.round(n * 1000) / 1000).replace(".", ",");
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
  sinIva: false,        // true = servicio excluido de IVA (transporte)
  sinIvaManual: false,  // true = el usuario lo fijó a mano (no auto-detectar)
});

/* ── Detección de transporte (único servicio excluido de IVA) ── */

const TRANSPORTE_RE = /(transporte|flete|acarreo|env[ií]o|domicilio)/i;

/** ¿La descripción corresponde a transporte? (servicio excluido de IVA) */
export const esTransporte = (desc) => TRANSPORTE_RE.test(String(desc || ""));

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

  let totalBruto = 0; // base gravada (sin IVA) de productos que cobran IVA
  let ivaTotal   = 0;
  let exento     = 0; // servicios excluidos de IVA (transporte) — precio pleno

  items.forEach((r) => {
    const p      = parseFloat(r.price) || 0;
    const qty    = parseFloat(r.qty)   || 1;
    const disc   = parseFloat(r.disc)  || 0;
    const factor = 1 - disc / 100;

    if (r.sinIva) {
      exento += p * qty * factor;
    } else {
      totalBruto += precioBase(p, rate) * qty * factor;
      ivaTotal   += ivaUnidad(p, rate)  * qty * factor;
    }
  });

  const totalConIva = totalBruto + ivaTotal + exento;
  const descGAmt    = totalConIva * ((parseFloat(descG) || 0) / 100);
  const totalPagar  = totalConIva - descGAmt;

  return {
    totalBruto,
    exento,
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

/* ── Totales según el tipo de cotización ─────────────────────── */

/**
 * Atajo: calcula los totales con el motor que corresponda al tipo.
 * @param {'comercial'|'obra'} tipo
 */
export const calcTotalsPorTipo = (tipo, items, descG, { iva = 19, aiu } = {}) =>
  tipo === "obra"
    ? calcTotalsObra(items, descG, aiu || DEFAULT_AIU)
    : calcTotals(items, descG, iva);

/* ── Constantes de dominio ───────────────────────────────────── */

export const UNITS = [
  "Und", "m", "m²", "m³", "kg", "lb", "L",
  "gal", "Caja", "Bolsa", "Rollo", "Par", "Global", "ml", "ton", "día", "hora",
];

export const FORMAS_PAGO      = ["Efectivo", "Transferencia", "Tarjeta", "Cheque"];
export const FORMAS_PAGO_OBRA = ["Anticipo + Actas", "Anticipo", "Por Actas", "Crédito"];

export const IVA_OPTS = [0, 5, 8, 10, 16, 19];
export const MONEDAS  = ["COP", "USD", "EUR", "MXN"];
export const ESTADOS  = ["borrador", "enviada", "aceptada", "entregada", "rechazada"];

/*
  GUÍA DE ESTADOS PARA EL EQUIPO DE FERREEXPRESS
  ─────────────────────────────────────────────────────────────────────────────
  📝 BORRADOR   → La cotización se está armando. No se ha enviado al cliente.
                  Siguiente paso: completar productos y cliente, luego ENVIAR.

  📤 ENVIADA    → Se compartió con el cliente (WhatsApp o PDF).
                  Esperando que confirme o pida cambios.
                  Siguiente paso: marcar ACEPTADA si dice que sí, RECHAZADA si no.

  ✅ ACEPTADA   → El cliente confirmó que va a comprar.
                  Alista el pedido en bodega / mostrador.
                  Siguiente paso: marcar ENTREGADA cuando ya se le dio la mercancía.

  🚚 ENTREGADA  → Mercancía entregada. Cobro recibido (efectivo, transferencia, etc.).
                  Estado final: no necesita más acción.

  ❌ RECHAZADA  → El cliente no compró. Puede ser precio, disponibilidad u otro.
                  Guárdala para referencia; no hace falta borrarla.
  ─────────────────────────────────────────────────────────────────────────────
*/
export const ESTADO_META = {
  borrador:  {
    label: "Borrador",   color: "gray",
    icon: "📝",
    desc: "Se está armando. No enviada aún.",
    hint: "Envíala al cliente para avanzar.",
    siguiente: "enviada",
  },
  enviada:   {
    label: "Enviada",    color: "blue",
    icon: "📤",
    desc: "Enviada al cliente. Esperando respuesta.",
    hint: "¿Dijo que sí? → Aceptada. ¿Que no? → Rechazada.",
    siguiente: "aceptada",
  },
  aceptada:  {
    label: "Aceptada",   color: "green",
    icon: "✅",
    desc: "Cliente confirmó. Alista el pedido.",
    hint: "Cuando entregues la mercancía, cambia a Entregada.",
    siguiente: "entregada",
  },
  entregada: {
    label: "Entregada",  color: "teal",
    icon: "🚚",
    desc: "Mercancía entregada y cobro recibido.",
    hint: "Listo. No necesita más acción.",
    siguiente: null,
  },
  rechazada: {
    label: "Rechazada",  color: "red",
    icon: "❌",
    desc: "El cliente no compró.",
    hint: "Puedes duplicarla y ajustar precio si quieren retomar.",
    siguiente: null,
  },
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

/* Los tres primeros son los que de verdad importan: el documento sirve de
   remisión de domicilio, así que sin dirección y celular no se puede entregar.
   El resto es opcional y solo se imprime si está diligenciado. */
export const DEFAULT_CLIENTE = {
  nombre: "", direccion: "", tel: "",
  empresa: "", nit: "", tipoDoc: "", contacto: "", correo: "", ciudad: "",
};

/* ── Datos de facturación del cliente ─────────────────────────────
   Un solo sitio decide cómo se presenta el cliente en el documento,
   el formulario y la ficha, para que no digan cosas distintas.

   · Con razón social (campo "empresa") → se factura a la empresa, con NIT.
   · Sin razón social pero con documento → se factura a la persona, con
     su cédula (o NIT si es persona natural con NIT).
   · Sin ninguno de los dos → no hay datos de factura: solo el nombre.

   tipoDoc lo elige quien cotiza (CC · NIT · CE). Si lo deja en
   automático se deduce: empresa → NIT; número con dígito de
   verificación (900.123.456-7) o de 9 cifras que empieza por 8 o 9 → NIT;
   cualquier otro → C.C. */
export const TIPOS_DOC = [
  { v: "CC",  corto: "C.C.", largo: "Cédula de ciudadanía" },
  { v: "NIT", corto: "NIT",  largo: "NIT" },
  { v: "CE",  corto: "C.E.", largo: "Cédula de extranjería" },
];

export const deducirTipoDoc = (cli = {}) => {
  if (cli.tipoDoc && TIPOS_DOC.some((t) => t.v === cli.tipoDoc)) return cli.tipoDoc;
  const num = String(cli.nit || "").trim();
  if (String(cli.empresa || "").trim()) return "NIT";
  if (/-\s*\d\s*$/.test(num)) return "NIT";
  const digitos = num.replace(/\D/g, "");
  if (digitos.length === 9 && /^[89]/.test(digitos)) return "NIT";
  return "CC";
};

export const datosFacturacion = (cli = {}) => {
  const limpio = (v) => String(v || "").trim();
  const razon  = limpio(cli.empresa);
  const nombre = limpio(cli.nombre);
  const numero = limpio(cli.nit);
  const tipo   = numero ? deducirTipoDoc(cli) : "";
  const meta   = TIPOS_DOC.find((t) => t.v === tipo);
  return {
    /* ¿Hay datos de factura que destacar? */
    factura: !!(razon || numero),
    /* A nombre de quién se factura */
    titular: razon || nombre,
    esEmpresa: !!razon,
    /* Persona que recibe cuando se factura a una empresa */
    recibe: razon && nombre && nombre.toLowerCase() !== razon.toLowerCase() ? nombre : "",
    tipoDoc: tipo,
    docCorto: meta?.corto || "",
    docLargo: meta?.largo || "",
    numero,
    correo: limpio(cli.correo),
  };
};

export const DEFAULT_CONFIG = {
  numero:    "",
  /* Se recalculan al abrir una cotización nueva (ver configNueva): si la
     app quedaba abierta de un día para otro, salía con la fecha de ayer. */
  get fecha()    { return todayISO(); },
  get vigencia() { return plusDaysISO(30); },
  formaPago: "Efectivo",
  moneda:    "COP",
  iva:       19,
  estado:    "borrador",
  tipo:      "comercial",  // 'comercial' | 'obra'
};

/** Configuración de una cotización nueva, con las fechas de HOY */
export const configNueva = (extra = {}) => ({ ...DEFAULT_CONFIG, ...extra });

/* AIU en cero por defecto.
   Una cotización de obra es, ante todo, los mismos precios sin discriminar IVA:
   el total debe ser la suma de los productos. Si un trabajo concreto necesita
   administración, imprevistos o utilidad, se escriben los porcentajes y el
   total los recoge. Las cotizaciones de obra ya guardadas conservan su propio
   AIU, así que este cambio no las altera. */
export const DEFAULT_AIU = {
  admin:        0,
  imprevistos:  0,
  utilidad:     0,
  anticipo:     0,
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

/* ── Conversión Comercial ⇄ Obra ─────────────────────────────── */

/**
 * ¿Las notas fueron editadas a mano?
 * (si siguen siendo una de las plantillas, se pueden intercambiar sin perder nada)
 */
export const notasSonPersonalizadas = (notas) => {
  const t = String(notas ?? "").trim();
  if (!t) return false;
  return t !== DEFAULT_NOTAS.trim() && t !== DEFAULT_NOTAS_OBRA.trim();
};

/**
 * Convierte una cotización de comercial a obra (o al revés).
 *
 * REGLA DE NEGOCIO: los precios de los productos NO se modifican.
 * El precio digitado siempre se ingresa con IVA incluido y sigue siendo
 * el mismo número; lo único que cambia es el motor de cálculo del total
 * (IVA discriminado en comercial · AIU + IVA sobre utilidad en obra).
 *
 * También se conservan las marcas `sinIva` de transporte, de modo que
 * convertir ida y vuelta devuelve la cotización a su estado original.
 *
 * @param {'comercial'|'obra'} tipoDestino
 * @returns {{config, aiuConfig, notas, items, notasPreservadas, formaPagoCambiada}}
 */
export const convertirTipo = (tipoDestino, source = {}) => {
  const { config = {}, aiuConfig, notas, items = [] } = source;
  const esObra = tipoDestino === "obra";

  const listaPago = esObra ? FORMAS_PAGO_OBRA : FORMAS_PAGO;
  const formaPagoOk = listaPago.includes(config.formaPago);
  const formaPago = formaPagoOk ? config.formaPago : listaPago[0];

  const personalizadas = notasSonPersonalizadas(notas);
  const notasFinal = personalizadas
    ? notas
    : esObra ? DEFAULT_NOTAS_OBRA : DEFAULT_NOTAS;

  return {
    config: { ...config, tipo: tipoDestino, formaPago },
    aiuConfig: { ...DEFAULT_AIU, ...(aiuConfig || {}) },
    notas: notasFinal,
    items,                                  // intactos — el precio es el precio
    notasPreservadas: personalizadas,
    formaPagoCambiada: !formaPagoOk,
  };
};

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

/* ── Dónde salen los avisos ──────────────────────────────────
   Arriba a la derecha NO: ahí están los botones de PDF y Guardar, y el
   aviso los tapaba justo cuando la persona iba a tocarlos. Abajo a la
   izquierda queda libre en las tres disposiciones, y el margen inferior
   lo levanta por encima de la barra fija del celular. */
/* Dónde salen los avisos ("Guardado ✓", "PDF descargado"…).
   En el celular abajo están la barra de Total/Ver/PDF/Guardar y la de
   navegación: el aviso se montaba encima de los botones justo cuando la
   persona iba a tocarlos. Ahí salen arriba. Se decide en el momento de
   mostrar el aviso (getters), así sirve aunque giren el teléfono. */
const esPantallaCelular = () => {
  try { return window.matchMedia("(max-width: 47.99em)").matches; } catch { return false; }
};
export const AVISO_LATERAL = {
  get position() { return esPantallaCelular() ? "top" : "bottom-left"; },
  get containerStyle() {
    return esPantallaCelular()
      ? { marginTop: "10px", maxWidth: "calc(100vw - 24px)" }
      : { marginBottom: "92px", marginLeft: "10px" };
  },
};

/* ── Trazabilidad ────────────────────────────────────────────── */

export const EVENTO_TIPOS = {
  creada:            { label: "Cotización creada",         icon: "✦", color: "green"  },
  modificada:        { label: "Datos actualizados",        icon: "✎", color: "blue"   },
  pdf_generado:      { label: "PDF generado",              icon: "⬇", color: "purple" },
  impresa:           { label: "Enviada a impresora",       icon: "⎙", color: "gray"   },
  enviada_whatsapp:  { label: "Enviada por WhatsApp",      icon: "W", color: "green"  },
  estado_cambiado:   { label: "Estado cambiado",           icon: "↺", color: "orange" },
  excel_exportado:   { label: "Exportada a Excel",         icon: "X", color: "teal"   },
  firmada:           { label: "Firmada por el cliente",    icon: "✍", color: "blue"   },
  vista_previa:      { label: "Vista previa abierta",      icon: "👁", color: "gray"   },
};

/** Crea un objeto evento listo para insertar en cot.eventos */
export const mkEvento = (tipo, detalle = "") => ({
  tipo,
  fecha: new Date().toISOString(),
  detalle,
});

/** Agrega un evento a la lista, evitando duplicados en menos de 5 s */
export const pushEvento = (eventos = [], tipo, detalle = "") => {
  const ultimo = eventos[eventos.length - 1];
  const ahora = Date.now();
  if (ultimo?.tipo === tipo && ahora - new Date(ultimo.fecha).getTime() < 5000) {
    return eventos; // demasiado reciente, no duplicar
  }
  return [...eventos, mkEvento(tipo, detalle)];
};
