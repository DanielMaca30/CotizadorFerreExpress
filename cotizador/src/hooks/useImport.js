/**
 * useImport.js — FerreExpress
 * Importa cotizaciones desde PDF, imágenes o CSV.
 *
 * Dependencias (ejecutar una vez):
 *   npm install pdfjs-dist tesseract.js
 *
 * Modos:
 *   PDF  → pdfjs-dist extrae texto posicional → parser inteligente
 *   IMG  → tesseract.js OCR en español → mismo parser
 *   CSV  → parseo directo de columnas
 */

import { useState, useCallback } from 'react';
import { uid, blankRow } from '../utils';

/* ═══════════════════════════════════════════════════════════════
   CARGA DINÁMICA — solo cuando se necesita
═══════════════════════════════════════════════════════════════ */
async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  // Worker desde CDN para evitar problemas de Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

async function loadTesseract() {
  const mod = await import('tesseract.js');
  return mod.createWorker;
}

/* ═══════════════════════════════════════════════════════════════
   EXTRACCIÓN DE TEXTO
═══════════════════════════════════════════════════════════════ */

/**
 * Extrae texto de un PDF manteniendo la estructura de tabla.
 * Agrupa items por posición Y → reconstruye filas separadas por TAB.
 */
async function extractPDFText(file, onProgress) {
  onProgress(5);
  const pdfjsLib = await loadPdfJs();
  onProgress(15);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
  onProgress(20);

  const allRows = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();

    // Agrupar items por fila (coordenada Y redondeada a 3px)
    const rowMap = new Map();
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const yKey = Math.round(item.transform[5] / 3) * 3;
      if (!rowMap.has(yKey)) rowMap.set(yKey, []);
      rowMap.get(yKey).push({ text: item.str, x: item.transform[4] });
    }

    // Ordenar filas de arriba a abajo (Y mayor = más arriba en PDF)
    const sortedRows = [...rowMap.entries()]
      .sort(([ya], [yb]) => yb - ya)
      .map(([, items]) =>
        items.sort((a, b) => a.x - b.x).map(i => i.text.trim()).join('\t')
      );

    allRows.push(...sortedRows);
    onProgress(20 + (p / pdf.numPages) * 60);
  }

  onProgress(85);
  return allRows.join('\n');
}

/**
 * OCR sobre imagen usando Tesseract.js (español + inglés).
 */
async function extractImageText(file, onProgress) {
  onProgress(5);
  const createWorker = await loadTesseract();
  onProgress(10);

  const worker = await createWorker(['spa', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(10 + m.progress * 75);
    },
  });

  const url = URL.createObjectURL(file);
  const { data: { text } } = await worker.recognize(url);
  await worker.terminate();
  URL.revokeObjectURL(url);
  onProgress(90);
  return text;
}

/* ═══════════════════════════════════════════════════════════════
   PARSER INTELIGENTE
═══════════════════════════════════════════════════════════════ */

const MONEY_RE = /\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g;

function parseMoney(str) {
  if (!str) return 0;
  const clean = String(str).replace(/\s/g, '');
  // Colombian format: 1.500.000 or 1,500,000 or 1500000
  const val = clean
    .replace(/[^0-9.,]/g, '')
    .replace(/\.(\d{3})/g, '$1')   // quitar separadores de miles con punto
    .replace(/,(\d{3})/g, '$1')   // quitar separadores de miles con coma
    .replace(',', '.');             // decimal con coma → punto
  return parseFloat(val) || 0;
}

function extractMoneyValues(str) {
  const matches = [];
  const re = /\$?\s*(\d{1,3}(?:\.\d{3})+|\d{4,})/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    matches.push(parseMoney(m[1]));
  }
  return matches;
}

const UNIT_LIST = ['m²','m2','m³','m3','m','kg','lb','l','gal','und','global',
  'caja','bolsa','rollo','par','ml','ton','día','dia','hora'];

function guessUnit(parts) {
  for (const p of parts) {
    const lower = p.toLowerCase().trim();
    if (UNIT_LIST.includes(lower)) {
      const map = { m2: 'm²', m3: 'm³', dia: 'día', l: 'L' };
      return map[lower] || (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    }
  }
  return 'Und';
}

/**
 * Intenta parsear una fila de texto como un ítem de cotización.
 * Formato esperado (tab-separado desde PDF):
 *   [#] [ref] [descripción] [qty] [unit] [p_sin_iva] [iva] [p_con_iva] [disc] [total]
 *   ó formatos más genéricos.
 */
function parseProductRow(rowText) {
  const parts = rowText.split('\t').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const moneyVals = extractMoneyValues(rowText);
  if (moneyVals.length === 0) return null;

  // Filtrar partes "vacías" o guiones
  const cleanParts = parts.filter(p => p !== '—' && p !== '-' && p !== '0');

  // Encontrar la descripción (parte más larga que no es número ni moneda)
  const textParts = cleanParts.filter(p => {
    if (/^\d+$/.test(p)) return false;                  // número puro
    if (/^\$/.test(p)) return false;                     // precio
    if (/^\d{1,3}(\.\d{3})+$/.test(p)) return false;   // 1.500.000
    if (UNIT_LIST.includes(p.toLowerCase())) return false;
    return p.length >= 3;
  });

  if (textParts.length === 0) return null;

  // La descripción es la parte de texto más larga (o la concatenación de textos)
  const desc = textParts
    .filter(p => !/^\d+$/.test(p))
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (desc.length < 3) return null;

  // Buscar cantidad: número pequeño (< 100000) antes de la descripción o después
  let qty = 1;
  for (const p of cleanParts) {
    const n = parseFloat(p.replace(',', '.'));
    if (!isNaN(n) && n > 0 && n < 100000 && n === Math.floor(n)) {
      if (p === cleanParts[0] || p === cleanParts[1]) continue; // saltar item#
      qty = n;
      break;
    }
  }

  // Precio: preferir "precio con IVA" si hay ≥3 valores monetarios
  // (formato FerreExpress: sin_iva, iva_unit, con_iva, disc, total)
  let price = 0;
  if (moneyVals.length >= 3) {
    price = moneyVals[2]; // precio con IVA (índice 2)
  } else if (moneyVals.length === 2) {
    price = moneyVals[0]; // primer precio
  } else {
    price = moneyVals[0];
  }

  // Unidad
  const unit = guessUnit(cleanParts);

  // Descartar si el precio parece un total (precio × qty × 10 < valor)
  if (moneyVals.length > 1 && price * qty * 0.5 > moneyVals[moneyVals.length - 1]) {
    price = moneyVals[0];
  }

  if (price <= 0) return null;

  return {
    id: uid(),
    ref: '',
    desc,
    qty: String(qty),
    unit,
    price: String(Math.round(price)),
    disc: 0,
  };
}

/** Headers que marcan el inicio de la tabla de productos */
const TABLE_START_PATTERNS = [
  /ítem/i, /nombre\s*producto/i, /descripci[oó]n/i,
  /código/i, /cantidad/i, /vr\.\s*unit/i,
];

/** Patrones que marcan el fin de la tabla */
const TABLE_END_PATTERNS = [
  /^total\s*bruto/i, /^costo\s*directo/i, /^subtotal/i,
  /^notas/i, /^resumen/i, /^generado/i, /^administraci[oó]n/i,
];

/** Keywords de cliente */
const CLIENT_LABELS = {
  nombre: /se[ñn]ores?|cliente|para:/i,
  nit:    /nit\s*[:/]?\s*([\d\.\-]+)/i,
  tel:    /tel[eé]fono?|tel[.:]?\s*([\+\d\s\-\(\)]{7,20})/i,
  correo: /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/,
  ciudad: /ciudad[:\s]+(\w+)/i,
  contacto: /attn[:\s]+(.+)/i,
};

export function parseQuoteText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const full = rawText;

  const result = {
    cliente: { nombre: '', empresa: '', nit: '', contacto: '', correo: '', tel: '', ciudad: '' },
    cotConfig: {},
    items: [],
    notas: '',
    confidence: 0,
  };

  /* ── Número de cotización ── */
  const numM = full.match(/COT[-\s]?0*(\d{1,4})/i);
  if (numM) {
    result.cotConfig.numero = `COT-${numM[1].padStart(3, '0')}`;
    result.confidence += 20;
  }

  /* ── Tipo de cotización ── */
  if (/obra|aiu|actividades/i.test(full)) {
    result.cotConfig.tipo = 'obra';
  } else {
    result.cotConfig.tipo = 'comercial';
  }

  /* ── Info de cliente ── */
  // Buscar bloque "Señores" (formato FerreExpress)
  const senoresIdx = lines.findIndex(l => /se[ñn]ores?/i.test(l));
  if (senoresIdx >= 0) {
    const block = lines.slice(senoresIdx + 1, senoresIdx + 12);
    // Primera línea no vacía = nombre
    if (block[0] && block[0].length > 1 && !/NIT|Tel|Ciudad|Attn/i.test(block[0])) {
      result.cliente.nombre = block[0];
      result.confidence += 10;
    }
    // Segunda línea de texto = empresa (si no es un número/label)
    if (block[1] && !/^\d|NIT|Tel|Ciudad|Attn/i.test(block[1]) && block[1].length > 2) {
      result.cliente.empresa = block[1];
    }
    for (const line of block) {
      const nitM = line.match(/NIT\s+([\d\.\-]+)/i);
      if (nitM) result.cliente.nit = nitM[1];
      const telM = line.match(/Tel[.:\s]+([\+\d\s\-\(\)]{6,20})/i);
      if (telM) result.cliente.tel = telM[1].trim();
      const emailM = line.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
      if (emailM) result.cliente.correo = emailM[1];
      const attnM = line.match(/Attn[:\s]+(.+)/i);
      if (attnM) result.cliente.contacto = attnM[1].trim();
      const cidM = line.match(/Ciudad[:\s]+(\w[\w\s]+)/i);
      if (cidM) result.cliente.ciudad = cidM[1].trim();
    }
  } else {
    // Buscar por patrones sueltos
    for (const line of lines.slice(0, 30)) {
      const emailM = line.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
      if (emailM && !result.cliente.correo) result.cliente.correo = emailM[1];
      const nitM = line.match(/NIT[:\s]+([\d\.\-]+)/i);
      if (nitM && !result.cliente.nit) result.cliente.nit = nitM[1];
    }
  }

  /* ── Tabla de productos ── */
  let tableStartIdx = -1;
  let tableEndIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    // Detectar encabezado de tabla
    const matchCount = TABLE_START_PATTERNS.filter(re => re.test(lower)).length;
    if (matchCount >= 2 && tableStartIdx < 0) {
      tableStartIdx = i + 1;
      continue;
    }
    // Detectar fin de tabla
    if (tableStartIdx > 0 && TABLE_END_PATTERNS.some(re => re.test(lines[i]))) {
      tableEndIdx = i;
      break;
    }
  }

  if (tableStartIdx >= 0) {
    for (let i = tableStartIdx; i < tableEndIdx; i++) {
      if (!lines[i] || lines[i].length < 4) continue;
      const item = parseProductRow(lines[i]);
      if (item) {
        result.items.push(item);
        result.confidence += 5;
      }
    }
  }

  // Fallback: buscar líneas con patrón de producto en todo el texto
  if (result.items.length === 0) {
    for (const line of lines) {
      if (line.length < 8) continue;
      const hasPrice = /\$?\d{1,3}(\.\d{3})+/.test(line);
      if (hasPrice) {
        const item = parseProductRow(line);
        if (item && !/total|iva|subtotal|bruto|pagar/i.test(item.desc)) {
          result.items.push(item);
        }
      }
    }
  }

  /* ── Notas ── */
  const notasIdx = lines.findIndex(l => /^notas/i.test(l));
  if (notasIdx >= 0) {
    result.notas = lines.slice(notasIdx + 1, notasIdx + 10)
      .filter(l => !/resumen|total|generado/i.test(l))
      .join('\n')
      .trim()
      .slice(0, 800);
  }

  // Garantizar mínimo 2 filas
  while (result.items.length < 2) result.items.push(blankRow());

  return result;
}

/* ═══════════════════════════════════════════════════════════════
   CSV PARSER
═══════════════════════════════════════════════════════════════ */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [blankRow(), blankRow()], confidence: 0 };

  const header = lines[0].toLowerCase().split(/[,;|\t]/);
  const findCol = (...keys) => {
    const idx = header.findIndex(h => keys.some(k => h.includes(k)));
    return idx >= 0 ? idx : null;
  };

  const descIdx  = findCol('desc', 'nombre', 'producto', 'actividad', 'item') ?? 0;
  const qtyIdx   = findCol('cant', 'qty', 'cantidad');
  const unitIdx  = findCol('und', 'unidad', 'unit');
  const priceIdx = findCol('precio', 'price', 'vr', 'valor', 'unit');
  const discIdx  = findCol('desc%', 'desc.', 'descuento');
  const refIdx   = findCol('ref', 'cod', 'código');

  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const items = lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    const price = priceIdx !== null ? parseMoney(cols[priceIdx]) : 0;
    const desc = cols[descIdx] || '';
    if (!desc && !price) return null;
    return {
      id: uid(),
      ref:   refIdx  !== null ? cols[refIdx]  : '',
      desc,
      qty:   qtyIdx  !== null ? cols[qtyIdx]  : '1',
      unit:  unitIdx !== null ? cols[unitIdx] : 'Und',
      price: String(Math.round(price)),
      disc:  discIdx !== null ? parseFloat(cols[discIdx]) || 0 : 0,
    };
  }).filter(Boolean);

  while (items.length < 2) items.push(blankRow());
  return { items, confidence: 70, cliente: {}, cotConfig: {} };
}

/* ═══════════════════════════════════════════════════════════════
   HOOK PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export function useImport() {
  const [phase, setPhase]       = useState('idle');   // idle|loading|preview|error
  const [progress, setProgress] = useState(0);
  const [preview, setPreview]   = useState(null);
  const [error, setError]       = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');

  const processFile = useCallback(async (file) => {
    setPhase('loading');
    setProgress(0);
    setError(null);
    setFileName(file.name);

    const ext  = file.name.split('.').pop().toLowerCase();
    const mime = file.type;
    setFileType(mime.startsWith('image/') ? 'image' : ext === 'pdf' ? 'pdf' : 'text');

    try {
      let rawText = '';

      if (mime === 'application/pdf' || ext === 'pdf') {
        rawText = await extractPDFText(file, setProgress);
      } else if (mime.startsWith('image/')) {
        rawText = await extractImageText(file, setProgress);
      } else if (['csv', 'tsv', 'txt'].includes(ext) || mime.includes('text')) {
        rawText = await file.text();
        setProgress(80);
        // CSV path
        if (ext === 'csv' || ext === 'tsv' || rawText.includes(',') || rawText.includes(';')) {
          const data = parseCSV(rawText);
          setProgress(100);
          setPreview(data);
          setPhase('preview');
          return;
        }
      } else {
        throw new Error(`Formato no soportado. Usa PDF, PNG, JPG, o CSV.`);
      }

      setProgress(92);
      const data = parseQuoteText(rawText);
      setProgress(100);
      setPreview(data);
      setPhase('preview');
    } catch (e) {
      console.error('[useImport]', e);
      setError(e.message || 'Error al procesar el archivo.');
      setPhase('error');
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setPreview(null);
    setError(null);
    setFileName('');
    setFileType('');
  }, []);

  return { phase, progress, preview, error, fileName, fileType, processFile, reset };
}
