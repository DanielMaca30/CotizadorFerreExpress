/**
 * useExcel.js — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Genera un archivo .xlsx con la cotización actual.
 * SheetJS (xlsx) se carga dinámicamente en el primer uso para no
 * sumar su peso (~1.3 MB) al bundle inicial.
 * ─────────────────────────────────────────────────────────────
 */
import { useCallback, useState } from "react";
import { money, calcTotals, calcTotalsObra, DEFAULT_AIU } from "../utils";

/* Carga SheetJS una sola vez. Intenta el bundle npm primero;
   si falla (aún no instalado) lo toma del CDN de SheetJS. */
let _XLSX = null;
async function cargarXLSX() {
  if (_XLSX) return _XLSX;
  try {
    _XLSX = await import("xlsx");
    return _XLSX;
  } catch {
    /* Fallback: CDN oficial de SheetJS */
    return new Promise((resolve, reject) => {
      if (typeof window.XLSX !== "undefined") { _XLSX = window.XLSX; return resolve(window.XLSX); }
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      s.onload = () => { _XLSX = window.XLSX; resolve(window.XLSX); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

export function useExcel() {
  const [loading, setLoading] = useState(false);

  /**
   * exportar({ items, cotConfig, cliente, empresa, aiuConfig, notas })
   * Descarga un .xlsx con la tabla de productos y los totales.
   */
  const exportar = useCallback(async ({
    items = [], cotConfig = {}, cliente = {}, empresa = {},
    aiuConfig = DEFAULT_AIU, notas = "",
  }) => {
    setLoading(true);
    try {
      const XLSX = await cargarXLSX();
      const { utils, writeFile } = XLSX;

      const esObra  = cotConfig.tipo === "obra";
      const iva     = parseFloat(cotConfig.iva) || 0;
      const moneda  = cotConfig.moneda || "COP";
      const totals  = esObra
        ? calcTotalsObra(items, cotConfig.descuento || 0, aiuConfig)
        : calcTotals(items, cotConfig.descuento || 0, iva);

      /* ── Encabezado (hoja principal) ── */
      const encabezado = [
        ["FERREEXPRESS S.A.S.", "", "", "", empresa.nit || ""],
        [empresa.dir || "", "", "", "", empresa.tel || ""],
        [],
        ["COTIZACIÓN", cotConfig.numero || "", "", "CLIENTE:", cliente.nombre || ""],
        ["Fecha:",   cotConfig.fecha || "",   "", "Empresa:", cliente.empresa || ""],
        ["Vigencia:", cotConfig.vigencia || "", "", "NIT:",    cliente.nit || ""],
        ["Tipo:",    esObra ? "Obra" : "Comercial", "", "Tel:",   cliente.tel || ""],
        [],
      ];

      /* ── Cabeceras de la tabla ── */
      const headers = esObra
        ? ["#", "Código", "Descripción / Actividad", "Cantidad", "Unidad", "Vr. Unitario", "Desc %", "Vr. Total"]
        : ["#", "Código", "Nombre Producto", "Cantidad", "Unidad", "Vr. s/IVA", "IVA Unit.", "Vr. c/IVA", "Desc %", "Vr. Total"];

      /* ── Filas de productos ── */
      const filas = items
        .filter(r => r.desc || r.price)
        .map((r, i) => {
          const p     = parseFloat(r.price) || 0;
          const qty   = parseFloat(r.qty) || 1;
          const disc  = parseFloat(r.disc) || 0;
          const rate  = iva / 100;
          const pSin  = esObra ? p : p / (1 + rate);
          const pIva  = esObra ? 0 : p - pSin;
          const total = p * qty * (1 - disc / 100);

          return esObra
            ? [i + 1, r.ref || "", r.desc || "", qty, r.unit || "Und", p, disc, total]
            : [i + 1, r.ref || "", r.desc || "", qty, r.unit || "Und", pSin, pIva, p, disc, total];
        });

      /* ── Resumen de totales ── */
      const resumen = esObra ? [
        [],
        ["", "", "", "", "", "", "Costo Directo:", totals.costoDirecto],
        ["", "", "", "", "", "", "Administración:", totals.adminAmt],
        ["", "", "", "", "", "", "Imprevistos:",    totals.impAmt],
        ["", "", "", "", "", "", "Utilidad:",       totals.utilAmt],
        ["", "", "", "", "", "", "Subtotal AIU:",   totals.subtotalAIU],
        ["", "", "", "", "", "", "IVA s/Utilidad:", totals.ivaUtilidad],
        ["", "", "", "", "", "", "TOTAL A PAGAR:",  totals.totalPagar],
      ] : [
        [],
        ["", "", "", "", "", "", "", "", "Total Bruto:", totals.totalBruto],
        ["", "", "", "", "", "", "", "", "IVA:",         totals.ivaTotal],
        ["", "", "", "", "", "", "", "", "TOTAL PAGAR:", totals.totalPagar],
      ];

      /* ── Notas ── */
      const notasRow = notas
        ? [[], ["NOTAS:"], ...(notas.split("\n").map(l => [l]))]
        : [];

      /* ── Armar la hoja ── */
      const wsData = [
        ...encabezado,
        headers,
        ...filas,
        ...resumen,
        ...notasRow,
      ];

      const ws = utils.aoa_to_sheet(wsData);

      /* Anchos de columna aproximados */
      ws["!cols"] = esObra
        ? [{ wch: 4 }, { wch: 12 }, { wch: 45 }, { wch: 9 }, { wch: 7 }, { wch: 15 }, { wch: 7 }, { wch: 15 }]
        : [{ wch: 4 }, { wch: 12 }, { wch: 45 }, { wch: 9 }, { wch: 7 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 7 }, { wch: 15 }];

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Cotización");

      /* Segunda hoja: solo los datos de cabecera para referencia rápida */
      const wsInfo = utils.aoa_to_sheet([
        ["Campo", "Valor"],
        ["Número",    cotConfig.numero || ""],
        ["Fecha",     cotConfig.fecha || ""],
        ["Vigencia",  cotConfig.vigencia || ""],
        ["Tipo",      esObra ? "Obra" : "Comercial"],
        ["Forma pago", cotConfig.formaPago || ""],
        ["Moneda",    moneda],
        [],
        ["Cliente",   cliente.nombre || ""],
        ["Empresa",   cliente.empresa || ""],
        ["NIT/CC",    cliente.nit || ""],
        ["Tel",       cliente.tel || ""],
        ["Correo",    cliente.correo || ""],
        ["Ciudad",    cliente.ciudad || ""],
        [],
        ["Empresa emisora", empresa.nombre || ""],
        ["NIT emisor",      empresa.nit || ""],
      ]);
      utils.book_append_sheet(wb, wsInfo, "Datos");

      const cn = (cliente.nombre || "Cliente").replace(/[^a-zA-Z0-9À-ɏ\s]/g, "").trim().replace(/\s+/g, "_");
      const filename = `${cn}_${cotConfig.numero || "Cotizacion"}.xlsx`;
      writeFile(wb, filename);
      return true;
    } catch (e) {
      console.error("[useExcel] Error:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { exportar, loading };
}
