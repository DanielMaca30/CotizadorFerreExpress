import { useState, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * usePDF
 * Captura un elemento del DOM por su id y lo convierte a PDF A4.
 *
 * @param {string} elementId  — id del nodo DOM a capturar
 * @param {string} filename   — nombre del archivo sin extensión
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
        scale:           2.5,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: "#ffffff",
        logging:         false,
        scrollX:         0,
        scrollY:         0,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf     = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const pW      = pdf.internal.pageSize.getWidth();
      const pH      = pdf.internal.pageSize.getHeight();
      const imgH    = (canvas.height * pW) / canvas.width;

      if (imgH <= pH) {
        pdf.addImage(imgData, "PNG", 0, 0, pW, imgH);
      } else {
        let y = 0;
        while (y < imgH) {
          pdf.addImage(imgData, "PNG", 0, -y, pW, imgH);
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