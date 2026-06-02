/**
 * useImportarCotizacion.js
 *
 * Usa Google Gemini (API gratuita) para extraer datos de una
 * cotización desde imagen o PDF.
 *
 * Requiere: VITE_GEMINI_API_KEY en el archivo .env
 * Consigue tu clave gratis en: https://aistudio.google.com/apikey
 *
 * Modelo: gemini-2.0-flash (gratuito, muy bueno para visión)
 */

import { useState, useCallback } from "react";
import { blankRow } from "../utils";

const MODEL   = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/* Convierte File a base64 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PROMPT = `Analiza esta cotización/presupuesto y extrae la información en JSON exactamente con esta estructura:

{
  "cliente": {
    "nombre": "nombre del cliente o empresa",
    "empresa": "nombre de empresa si aplica",
    "nit": "NIT o cédula si aparece",
    "ciudad": "ciudad",
    "correo": "correo electrónico",
    "tel": "teléfono",
    "contacto": ""
  },
  "items": [
    {
      "ref": "referencia o código del producto si aparece, sino vacío",
      "desc": "descripción del producto o servicio",
      "qty": 1,
      "unit": "unidad (Und, m, m², kg, etc)",
      "price": 0,
      "disc": 0
    }
  ],
  "notas": "notas o condiciones generales si aparecen"
}

REGLAS IMPORTANTES:
- "price" debe ser el precio unitario CON IVA incluido. Si el documento muestra precio sin IVA y luego suma IVA, calcula el precio con IVA. Si no hay IVA mencionado, usa el precio tal como aparece.
- "qty" debe ser un número (cantidad).
- "disc" es descuento por línea en porcentaje (0 si no hay).
- Si no encuentras algún campo, usa string vacío "" para texto o 0 para números.
- Responde ÚNICAMENTE con el JSON, sin texto adicional, sin markdown, sin explicaciones.`;

export function useImportarCotizacion() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [progress, setProgress] = useState("");

  const importar = useCallback(async (file) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError("Falta VITE_GEMINI_API_KEY en el archivo .env — consíguela gratis en aistudio.google.com/apikey");
      return null;
    }

    setLoading(true);
    setError(null);
    setProgress("Leyendo archivo…");

    try {
      const base64    = await fileToBase64(file);
      const mimeType  = file.type || "image/jpeg";

      setProgress("Analizando cotización con IA…");

      // Gemini API — inline data (imagen o PDF)
      const body = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
        },
      };

      const res = await fetch(`${API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Error API: ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Respuesta vacía de Gemini");

      setProgress("Procesando datos…");

      // Limpiar posible markdown code block
      const jsonStr = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(jsonStr);

      // Normalizar items
      const items = (parsed.items || []).map((it) => ({
        ...blankRow(),
        ref:   String(it.ref  || ""),
        desc:  String(it.desc || ""),
        qty:   parseFloat(it.qty)  || 1,
        unit:  String(it.unit || "Und"),
        price: String(parseFloat(it.price) || ""),
        disc:  parseFloat(it.disc) || 0,
      }));

      if (items.length === 0) items.push(blankRow(), blankRow());

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
        items,
        notas: String(parsed.notas || ""),
      };
    } catch (e) {
      setError(e.message || "Error desconocido");
      return null;
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, []);

  return { importar, loading, error, progress };
}
