import { useState, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * usePDF — FerreExpress
 * Captura un elemento DOM y genera un PDF en HOJA CARTA (216 × 279 mm),
 * que es el tamaño estándar en Colombia y el que cargan las impresoras
 * de oficina sin ajustes.
 *
 * El documento (DocContent) tiene la altura exacta de una carta, así que
 * la imagen capturada encaja de borde a borde y la hoja queda llena. Si el
 * contenido creciera más de una página, se reparte en varias.
 *
 * Usa JPEG (calidad 0.82) en lugar de PNG para reducir el peso del archivo.
 */
export function usePDF(elementId = "cotizacion-pdf", filename = "cotizacion") {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const downloadPDF = useCallback(async (customFilename) => {
    const el = document.getElementById(elementId);
    if (!el) {
      setError("Elemento PDF no encontrado en el DOM.");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const canvas = await html2canvas(el, {
        scale:           1.8,        // era 2.5 — menos px = menos peso
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: "#ffffff",
        logging:         false,
        scrollX:         0,
        scrollY:         0,
      });

      // JPEG calidad 0.82 en vez de PNG — reduce ~60-70% de peso
      const imgData = canvas.toDataURL("image/jpeg", 0.82);
      const pdf     = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pW      = pdf.internal.pageSize.getWidth();
      const pH      = pdf.internal.pageSize.getHeight();
      const imgH    = (canvas.height * pW) / canvas.width;

      /* Tolerancia de 1 mm: el documento mide una carta exacta, pero el
         redondeo del navegador puede sobrarle una fracción de milímetro y
         no queremos que eso genere una segunda página en blanco. */
      if (imgH <= pH + 1) {
        pdf.addImage(imgData, "JPEG", 0, 0, pW, Math.min(imgH, pH));
      } else {
        let y = 0;
        while (y < imgH) {
          pdf.addImage(imgData, "JPEG", 0, -y, pW, imgH);
          y += pH;
          if (y < imgH) pdf.addPage();
        }
      }

      pdf.save(`${customFilename || filename}.pdf`);
      return true;
    } catch (e) {
      console.error("[usePDF] Error:", e);
      setError(e.message || "Error desconocido generando el PDF.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [elementId, filename]);

  return { downloadPDF, loading, error };
}
