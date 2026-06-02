/**
 * useImport.js — FerreExpress v3
 *
 * Extraccion con IA (requiere VITE_MISTRAL_API_KEY en .env):
 *   PDF   → mistral-ocr-latest  extrae texto, luego pixtral analiza
 *   IMG   → pixtral-12b-2409    vision directa sobre la imagen
 *   CSV   → parser local directo
 *
 * Sin clave: OCR local con pdfjs-dist + tesseract.js (fallback)
 *
 * Clave gratuita: https://console.mistral.ai/api-keys
 */

import { useState, useCallback } from "react";
import { uid, blankRow } from "../utils";

const MISTRAL_CHAT = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_OCR  = "https://api.mistral.ai/v1/ocr";

const PROMPT = `Analiza esta cotizacion/presupuesto y extrae la informacion en JSON con esta estructura exacta:

{
  "cliente": {
    "nombre": "nombre del cliente o empresa destinataria",
    "empresa": "empresa si es diferente al nombre",
    "nit": "NIT o cedula",
    "ciudad": "ciudad",
    "correo": "correo electronico",
    "tel": "telefono",
    "contacto": "persona de contacto"
  },
  "cotConfig": {
    "numero": "numero de cotizacion ejemplo COT-031",
    "tipo": "comercial o obra"
  },
  "items": [
    {
      "ref": "codigo o referencia del producto, vacio si no hay",
      "desc": "descripcion completa del producto o servicio",
      "qty": 1,
      "unit": "Und, m, m2, m3, kg, L, Caja, Rollo, Global, etc",
      "price": 0,
      "disc": 0
    }
  ],
  "notas": "notas o condiciones si aparecen"
}

REGLAS:
- price = precio unitario CON IVA incluido. Si el documento muestra precio sin IVA mas IVA separado, sumalos.
- qty = numero.
- disc = descuento por linea en porcentaje, 0 si no hay.
- NO incluyas filas de totales, subtotales, encabezados ni lineas de IVA como items.
- Usa string vacio para campos de texto no encontrados y 0 para numeros.
- Responde UNICAMENTE el JSON, sin markdown, sin texto adicional.`;

/* Convierte File a base64 puro */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* Parsea el JSON que devuelve la IA (puede venir con markdown) */
function parseAIResponse(text) {
  const clean = text
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  return JSON.parse(clean);
}

/* Normaliza los items extraidos por la IA */
function normalizeItems(rawItems) {
  const items = (rawItems || [])
    .map(it => ({
      ...blankRow(),
      ref:   String(it.ref   || ""),
      desc:  String(it.desc  || "").trim(),
      qty:   String(parseFloat(it.qty)   || 1),
      unit:  String(it.unit  || "Und"),
      price: String(Math.round(parseFloat(String(it.price).replace(/[^0-9.]/g, "")) || 0)),
      disc:  parseFloat(it.disc) || 0,
    }))
    .filter(it => it.desc.length > 0);
  while (items.length < 2) items.push(blankRow());
  return items;
}

/* Normaliza resultado completo de la IA */
function normalizeAIResult(parsed) {
  return {
    cliente: {
      nombre:   String(parsed.cliente?.nombre   || ""),
      empresa:  String(parsed.cliente?.empresa  || ""),
      nit:      String(parsed.cliente?.nit      || ""),
      ciudad:   String(parsed.cliente?.ciudad   || ""),
      correo:   String(parsed.cliente?.correo   || ""),
      tel:      String(parsed.cliente?.tel      || ""),
      contacto: String(parsed.cliente?.contacto || ""),
    },
    cotConfig: {
      numero: String(parsed.cotConfig?.numero || ""),
      tipo:   parsed.cotConfig?.tipo === "obra" ? "obra" : "comercial",
    },
    items:      normalizeItems(parsed.items),
    notas:      String(parsed.notas || ""),
    confidence: 90,
  };
}

/* ═══════════════════════════════════════════════════════
   EXTRACCION CON MISTRAL — IMAGEN (pixtral vision)
═══════════════════════════════════════════════════════ */
async function extractImageWithMistral(file, apiKey, onProgress) {
  onProgress(15);
  const base64   = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";
  onProgress(30);

  const res = await fetch(MISTRAL_CHAT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model: "pixtral-12b-2409",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: "text", text: PROMPT },
        ],
      }],
      temperature: 0,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Mistral imagen error ${res.status}`);
  }

  onProgress(80);
  const data  = await res.json();
  const text  = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta vacia de Mistral");

  onProgress(90);
  return normalizeAIResult(parseAIResponse(text));
}

/* ═══════════════════════════════════════════════════════
   EXTRACCION CON MISTRAL — PDF
   Estrategia: extraer texto con mistral OCR, luego analizar
   con mistral-small (mas economico y confiable que vision para texto)
═══════════════════════════════════════════════════════ */
async function extractPDFWithMistral(file, apiKey, onProgress) {
  onProgress(10);
  const base64 = await fileToBase64(file);
  onProgress(20);

  /* Paso 1: OCR del PDF */
  const ocrRes = await fetch(MISTRAL_OCR, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type:      "document_url",
        document_url: `data:application/pdf;base64,${base64}`,
      },
    }),
  });

  if (!ocrRes.ok) {
    const err = await ocrRes.json().catch(() => ({}));
    throw new Error(err?.message || `Mistral OCR error ${ocrRes.status}`);
  }

  onProgress(55);
  const ocrData = await ocrRes.json();

  /* Concatenar texto de todas las paginas */
  const rawText = (ocrData.pages || [])
    .map(p => p.markdown || p.text || "")
    .join("\n")
    .trim();

  if (!rawText) throw new Error("OCR no extrajo texto del PDF");

  onProgress(65);

  /* Paso 2: Analizar el texto con mistral-small */
  const chatRes = await fetch(MISTRAL_CHAT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{
        role: "user",
        content: PROMPT + "\n\nTexto de la cotizacion:\n" + rawText.slice(0, 8000),
      }],
      temperature: 0,
      max_tokens: 2048,
    }),
  });

  if (!chatRes.ok) {
    const err = await chatRes.json().catch(() => ({}));
    throw new Error(err?.message || `Mistral chat error ${chatRes.status}`);
  }

  onProgress(85);
  const chatData = await chatRes.json();
  const text     = chatData?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta vacia de Mistral");

  onProgress(93);
  return normalizeAIResult(parseAIResponse(text));
}

/* ═══════════════════════════════════════════════════════
   OCR LOCAL — fallback sin API
═══════════════════════════════════════════════════════ */
async function loadPdfJs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.mjs`;
  return lib;
}

async function loadTesseract() {
  return (await import("tesseract.js")).createWorker;
}

async function extractPDFTextLocal(file, onProgress) {
  onProgress(5);
  const lib = await loadPdfJs();
  onProgress(15);
  const pdf = await lib.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise;
  onProgress(20);
  const rows = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const map  = new Map();
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!map.has(y)) map.set(y, []);
      map.get(y).push({ text: item.str, x: item.transform[4] });
    }
    [...map.entries()]
      .sort(([a], [b]) => b - a)
      .forEach(([, cells]) =>
        rows.push(cells.sort((a, b) => a.x - b.x).map(c => c.text.trim()).join("\t"))
      );
    onProgress(20 + (p / pdf.numPages) * 60);
  }
  onProgress(85);
  return rows.join("\n");
}

async function extractImageTextLocal(file, onProgress) {
  onProgress(5);
  const createWorker = await loadTesseract();
  const worker = await createWorker(["spa", "eng"], 1, {
    logger: m => { if (m.status === "recognizing text") onProgress(10 + m.progress * 75); },
  });
  const url = URL.createObjectURL(file);
  const { data: { text } } = await worker.recognize(url);
  await worker.terminate();
  URL.revokeObjectURL(url);
  onProgress(90);
  return text;
}

/* ═══════════════════════════════════════════════════════
   PARSER LOCAL — para texto extraido por OCR
═══════════════════════════════════════════════════════ */
function parseMoney(s) {
  if (!s) return 0;
  const v = String(s).replace(/\s/g, "").replace(/[^0-9.,]/g, "")
    .replace(/\.(\d{3})/g, "$1").replace(/,(\d{3})/g, "$1").replace(",", ".");
  return parseFloat(v) || 0;
}

function extractMoneyVals(str) {
  const vals = [];
  const re = /\$?\s*(\d{1,3}(?:\.\d{3})+|\d{4,})/g;
  let m;
  while ((m = re.exec(str)) !== null) vals.push(parseMoney(m[1]));
  return vals;
}

const UNITS_LOW = ["m2","m3","m","kg","lb","l","gal","und","global","caja","bolsa","rollo","par"];

function guessUnit(parts) {
  for (const p of parts) {
    const lo = p.toLowerCase().trim();
    if (UNITS_LOW.includes(lo)) return { m2:"m2", m3:"m3", l:"L" }[lo] || (p[0].toUpperCase() + p.slice(1).toLowerCase());
  }
  return "Und";
}

function parseRow(rowText) {
  const parts = rowText.split("\t").map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const vals = extractMoneyVals(rowText);
  if (!vals.length) return null;
  const text = parts.filter(p =>
    !/^\d+$/.test(p) && !/^\$/.test(p) &&
    !/^\d{1,3}(\.\d{3})+$/.test(p) &&
    !UNITS_LOW.includes(p.toLowerCase()) &&
    p.length >= 3
  );
  if (!text.length) return null;
  const desc = text.filter(p => !/^\d+$/.test(p)).join(" ").trim().replace(/\s+/g, " ");
  if (desc.length < 3) return null;
  let qty = 1;
  for (const p of parts) {
    const n = parseFloat(p.replace(",", "."));
    if (!isNaN(n) && n > 0 && n < 10000 && n === Math.floor(n) && p !== parts[0]) { qty = n; break; }
  }
  const price = vals.length >= 3 ? vals[2] : vals[0];
  if (!price) return null;
  return { id: uid(), ref: "", desc, qty: String(qty), unit: guessUnit(parts), price: String(Math.round(price)), disc: 0 };
}

const T_START = [/descripci/i, /cantidad/i, /precio/i, /vr\.\s*unit/i, /item/i];
const T_END   = [/^total\s*bruto/i, /^subtotal/i, /^notas/i, /^resumen/i];

function parseQuoteText(raw) {
  const lines  = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const result = {
    cliente:   { nombre: "", empresa: "", nit: "", contacto: "", correo: "", tel: "", ciudad: "" },
    cotConfig: {},
    items:     [],
    notas:     "",
    confidence: 0,
  };
  const nm = raw.match(/COT[-\s]?0*(\d{1,4})/i);
  if (nm) { result.cotConfig.numero = `COT-${nm[1].padStart(3, "0")}`; result.confidence += 20; }
  result.cotConfig.tipo = /obra|aiu/i.test(raw) ? "obra" : "comercial";

  const si = lines.findIndex(l => /se[ni]ores?/i.test(l));
  if (si >= 0) {
    const bl = lines.slice(si + 1, si + 10);
    if (bl[0] && !/NIT|Tel|Ciudad/i.test(bl[0])) { result.cliente.nombre = bl[0]; result.confidence += 10; }
    for (const l of bl) {
      const nm2 = l.match(/NIT\s+([\d.\-]+)/i); if (nm2) result.cliente.nit = nm2[1];
      const tm  = l.match(/Tel[.:\s]+([\+\d\s\-()]{6,})/i); if (tm) result.cliente.tel = tm[1].trim();
      const em  = l.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/); if (em) result.cliente.correo = em[1];
    }
  }

  let ts = -1, te = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (T_START.filter(r => r.test(l)).length >= 2 && ts < 0) { ts = i + 1; continue; }
    if (ts > 0 && T_END.some(r => r.test(lines[i]))) { te = i; break; }
  }
  if (ts >= 0) {
    for (let i = ts; i < te; i++) {
      const item = parseRow(lines[i]);
      if (item) { result.items.push(item); result.confidence += 5; }
    }
  }
  if (!result.items.length) {
    for (const l of lines) {
      if (l.length < 8 || !/\$?\d{1,3}(\.\d{3})+/.test(l)) continue;
      const item = parseRow(l);
      if (item && !/total|iva|subtotal|bruto|pagar/i.test(item.desc)) result.items.push(item);
    }
  }
  while (result.items.length < 2) result.items.push(blankRow());
  return result;
}

function parseCSV(text) {
  const lines  = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [blankRow(), blankRow()], confidence: 0 };
  const hdr    = lines[0].toLowerCase().split(/[,;|\t]/);
  const col    = (...ks) => { const i = hdr.findIndex(h => ks.some(k => h.includes(k))); return i >= 0 ? i : null; };
  const di = col("desc","nombre","producto") ?? 0;
  const qi = col("cant","qty","cantidad");
  const ui = col("und","unidad","unit");
  const pi = col("precio","price","vr","valor");
  const xi = col("descuento","desc%");
  const ri = col("ref","cod");
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const items = lines.slice(1).map(line => {
    const c = line.split(sep).map(s => s.replace(/^"|"$/g,"").trim());
    const price = pi !== null ? parseMoney(c[pi]) : 0;
    const desc  = c[di] || "";
    if (!desc && !price) return null;
    return { id: uid(), ref: ri!==null?c[ri]:"", desc, qty: qi!==null?c[qi]:"1", unit: ui!==null?c[ui]:"Und", price: String(Math.round(price)), disc: xi!==null?parseFloat(c[xi])||0:0 };
  }).filter(Boolean);
  while (items.length < 2) items.push(blankRow());
  return { items, confidence: 70, cliente: {}, cotConfig: {} };
}

/* ═══════════════════════════════════════════════════════
   HOOK PRINCIPAL
═══════════════════════════════════════════════════════ */
export function useImport() {
  const [phase,    setPhase]    = useState("idle");
  const [progress, setProgress] = useState(0);
  const [preview,  setPreview]  = useState(null);
  const [error,    setError]    = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [usedAI,   setUsedAI]   = useState(false);

  const processFile = useCallback(async (file) => {
    setPhase("loading");
    setProgress(0);
    setError(null);
    setUsedAI(false);
    setFileName(file.name);

    const ext  = file.name.split(".").pop().toLowerCase();
    const mime = file.type || "";
    const isPDF = mime === "application/pdf" || ext === "pdf";
    const isImg = mime.startsWith("image/");
    setFileType(isImg ? "image" : isPDF ? "pdf" : "text");

    const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

    try {
      /* ─── RUTA CON IA ─── */
      if (apiKey && (isPDF || isImg)) {
        try {
          let data;
          if (isPDF) {
            data = await extractPDFWithMistral(file, apiKey, setProgress);
          } else {
            data = await extractImageWithMistral(file, apiKey, setProgress);
          }
          setProgress(100);
          setPreview(data);
          setPhase("preview");
          setUsedAI(true);
          return;
        } catch (aiErr) {
          console.warn("[useImport] IA fallo:", aiErr.message, "— usando OCR local");
          /* continua al fallback */
        }
      }

      /* ─── RUTA OCR LOCAL ─── */
      let rawText = "";
      if (isPDF) {
        rawText = await extractPDFTextLocal(file, setProgress);
      } else if (isImg) {
        rawText = await extractImageTextLocal(file, setProgress);
      } else if (["csv","tsv","txt"].includes(ext) || mime.includes("text")) {
        rawText = await file.text();
        setProgress(80);
        if (ext === "csv" || ext === "tsv" || rawText.includes(",") || rawText.includes(";")) {
          setProgress(100);
          setPreview(parseCSV(rawText));
          setPhase("preview");
          return;
        }
      } else {
        throw new Error("Formato no soportado. Usa PDF, PNG, JPG o CSV.");
      }
      setProgress(92);
      setPreview(parseQuoteText(rawText));
      setProgress(100);
      setPhase("preview");

    } catch (e) {
      console.error("[useImport]", e);
      setError(e.message || "Error al procesar el archivo.");
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle"); setProgress(0); setPreview(null);
    setError(null); setFileName(""); setFileType(""); setUsedAI(false);
  }, []);

  return { phase, progress, preview, error, fileName, fileType, processFile, reset, usedAI };
}
