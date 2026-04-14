/**
 * DocContent.jsx
 * Réplica fiel de la cotización 002 FerreExpress.
 *
 * Columnas por línea:
 *   Ítem | Código | Nombre Producto | Cantidad | Unidad
 *   | Vr. Unitario (sin IVA) | IVA unidad | Vr. c/IVA | % Desc. | Vr. Total
 *
 * Resumen:
 *   Total Bruto (sin IVA)
 *   IVA 19%
 *   ──────────────────────
 *   Total a Pagar
 *
 * Sin sección de firmas.
 */

import React from "react";
import { money, fmtDate, calcRow, precioBase, ivaUnidad } from "../utils";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

/* ── Logo: base64 → /logo.png → "FE" ── */
function DocLogo({ src }) {
  const [phase, setPhase] = React.useState(src ? 0 : 1);
  React.useEffect(() => setPhase(src ? 0 : 1), [src]);

  const imgSt = { height: 60, maxWidth: 150, objectFit: "contain", display: "block" };
  const boxSt = {
    background: FY, color: DARK, fontWeight: 900, fontSize: 22,
    width: 52, height: 52, display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: 6, flexShrink: 0,
  };

  if (phase === 0 && src)
    return <img src={src} alt="Logo" style={imgSt} onError={() => setPhase(1)} />;
  if (phase === 1)
    return <img src="/logo.png" alt="FerreExpress" style={imgSt} onError={() => setPhase(2)} />;
  return <div style={boxSt}>FE</div>;
}

export default function DocContent({ empresa, cot, cli, items, descG, totals, notas }) {
  const filled  = items.filter((r) => r.desc || r.price);
  const ivaRate = (parseFloat(cot.iva) || 0) / 100;

  /* ─── estilos inline ─── */
  const st = {
    page: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 10.5,
      color: "#1a1a1a",
      background: "#fff",
      lineHeight: 1.45,
    },

    /* HEADER */
    header: {
      background: DARK,
      padding: "20px 28px 18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 20,
    },
    hLeft:   { display: "flex", alignItems: "flex-start", gap: 12 },
    hName:   { fontWeight: 700, fontSize: 13, color: FY, marginBottom: 4, lineHeight: 1.2 },
    hSub:    { fontSize: 9.5, color: "rgba(255,255,255,.58)", lineHeight: 1.9 },
    hRight:  { textAlign: "right", flexShrink: 0 },
    hLabel:  {
      fontSize: 8.5, letterSpacing: "0.15em", textTransform: "uppercase",
      color: "rgba(249,191,32,.65)", fontWeight: 700, marginBottom: 4,
    },
    hNum:    { fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 6 },
    hMeta:   { fontSize: 9.5, color: "rgba(255,255,255,.45)", lineHeight: 1.85 },

    /* CLIENTE / CONDICIONES */
    twoCol: {
      display: "grid", gridTemplateColumns: "1fr 1fr",
      borderBottom: "1px solid #e8e8e8",
    },
    col: {
      padding: "12px 28px",
      borderRight: "1px solid #e8e8e8",
    },
    colLast: { padding: "12px 28px" },
    secLbl: {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "#aaa",
      borderBottom: "1px solid #e8e8e8",
      paddingBottom: 3, marginBottom: 7, display: "block",
    },
    cliName: { fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2 },
    cliLine: { fontSize: 10, color: "#444", lineHeight: 1.8 },

    /* FECHAS */
    fechaRow: {
      display: "grid", gridTemplateColumns: "1fr 1fr",
      background: "#f8f8f8",
      borderBottom: "2px solid #e0e0e0",
    },
    fechaCell: { padding: "9px 28px", borderRight: "1px solid #e8e8e8" },
    fechaCellL: { padding: "9px 28px" },
    fechaLbl:  { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", display: "block", marginBottom: 1 },
    fechaVal:  { fontSize: 11.5, fontWeight: 700, color: "#111" },

    /* TABLA */
    table: { width: "100%", borderCollapse: "collapse", fontSize: 10 },
    thBase: {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      color: "#444", padding: "8px 8px", textAlign: "left",
      borderBottom: "2px solid #d0d0d0", background: "#f0f0f0",
      whiteSpace: "nowrap",
    },
    thR: {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      color: "#444", padding: "8px 8px", textAlign: "right",
      borderBottom: "2px solid #d0d0d0", background: "#f0f0f0",
      whiteSpace: "nowrap",
    },
    thC: {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      color: "#444", padding: "8px 8px", textAlign: "center",
      borderBottom: "2px solid #d0d0d0", background: "#f0f0f0",
      whiteSpace: "nowrap",
    },
    tdBase:  { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#333", fontSize: 10 },
    tdBold:  { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#111", fontWeight: 600, fontSize: 10 },
    tdNum:   { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#111", textAlign: "right", fontWeight: 600, fontSize: 10 },
    tdC:     { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#555", textAlign: "center", fontSize: 10 },
    tdSm:    { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#777", fontSize: 9.5 },

    /* NOTAS + RESUMEN */
    bottom: {
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 28, padding: "18px 28px", borderTop: "1px solid #e8e8e8",
    },
    notasWrap: { flex: 1, minWidth: 180 },
    notasLbl: {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
      color: "#bbb", borderBottom: "1px solid #e8e8e8",
      paddingBottom: 3, marginBottom: 8, display: "block",
    },
    notasText: { fontSize: 9.5, color: "#666", lineHeight: 1.85, whiteSpace: "pre-line" },

    resBox: {
      width: 240, flexShrink: 0,
      border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden",
    },
    resHdr: {
      background: "#f0f0f0", padding: "7px 13px",
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "#888",
      borderBottom: "1px solid #e0e0e0",
    },
    resRow: {
      display: "flex", justifyContent: "space-between",
      padding: "7px 13px", borderBottom: "1px solid #f5f5f5", fontSize: 10.5,
    },
    resLbl:  { color: "#888" },
    resVal:  { fontWeight: 600, color: "#222" },
    resTotal: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 13px", background: DARK,
    },
    resTotalLbl: { fontWeight: 700, fontSize: 11, color: "#fff" },
    resTotalVal: { fontWeight: 900, fontSize: 20, color: FY },

    /* PIE */
    footer: {
      background: DARK, padding: "9px 28px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 0,
    },
    footNota:  { fontSize: 8.5, color: "rgba(255,255,255,.28)" },
    footBrand: { fontSize: 10, color: "rgba(249,191,32,.55)", fontStyle: "italic" },
  };

  return (
    <div style={st.page}>

      {/* ═══ HEADER ═══ */}
      <div style={st.header}>
        <div style={st.hLeft}>
          <DocLogo src={empresa.logo} />
          <div>
            <div style={st.hName}>{empresa.nombre}</div>
            <div style={st.hSub}>
              NIT {empresa.nit}<br />
              {empresa.dir}<br />
              {empresa.ciudad}<br />
              Tel: {empresa.tel}<br />
              {empresa.correo}
            </div>
          </div>
        </div>
        <div style={st.hRight}>
          <div style={st.hLabel}>Cotización Comercial</div>
          <div style={st.hNum}>{cot.numero || "—"}</div>
          <div style={st.hMeta}>Generación: {fmtDate(cot.fecha)}</div>
        </div>
      </div>

      {/* ═══ CLIENTE / CONDICIONES ═══ */}
      <div style={st.twoCol}>
        <div style={st.col}>
          <span style={st.secLbl}>Señores</span>
          {cli.nombre
            ? <div style={st.cliName}>{cli.nombre}</div>
            : <div style={{ ...st.cliLine, color: "#ccc", fontStyle: "italic" }}>Sin datos</div>}
          {cli.empresa  && <div style={st.cliLine}>{cli.empresa}</div>}
          {cli.nit      && <div style={st.cliLine}>NIT {cli.nit}</div>}
          {cli.contacto && <div style={st.cliLine}>Attn: {cli.contacto}</div>}
          {cli.tel      && <div style={st.cliLine}>Teléfono: {cli.tel}</div>}
          {cli.correo   && <div style={st.cliLine}>{cli.correo}</div>}
          {cli.ciudad   && <div style={st.cliLine}>Ciudad: {cli.ciudad}</div>}
        </div>
        <div style={st.colLast}>
          <span style={st.secLbl}>Condiciones</span>
          {[
            ["Moneda",        cot.moneda],
            ["Forma de pago", cot.formaPago],
            ["IVA",           `${cot.iva}%`],
            parseFloat(descG) > 0 && ["Desc. global", `${descG}%`],
          ].filter(Boolean).map(([l, v]) => (
            <div key={l} style={st.cliLine}>
              {l}: <strong style={{ color: "#111" }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FECHAS ═══ */}
      <div style={st.fechaRow}>
        <div style={st.fechaCell}>
          <span style={st.fechaLbl}>Fecha</span>
          <span style={st.fechaVal}>{fmtDate(cot.fecha)}</span>
        </div>
        <div style={st.fechaCellL}>
          <span style={st.fechaLbl}>N° Cotización</span>
          <span style={st.fechaVal}>{cot.numero || "—"}</span>
        </div>
      </div>

      {/* ═══ TABLA ═══ */}
      <table style={st.table}>
        <thead>
          <tr>
            <th style={{ ...st.thBase, width: 28  }}>Ítem</th>
            <th style={{ ...st.thBase, width: 82  }}>Código</th>
            <th style={st.thBase}>Nombre Producto</th>
            <th style={{ ...st.thC,   width: 48  }}>Cantidad</th>
            <th style={{ ...st.thBase,width: 44  }}>Unidad</th>
            <th style={{ ...st.thR,   width: 82  }}>Vr. Unit. s/IVA</th>
            <th style={{ ...st.thR,   width: 72  }}>IVA Unit.</th>
            <th style={{ ...st.thR,   width: 82  }}>Vr. Unit. c/IVA</th>
            <th style={{ ...st.thC,   width: 44  }}>% Desc.</th>
            <th style={{ ...st.thR,   width: 84  }}>Vr. Total</th>
          </tr>
        </thead>
        <tbody>
          {filled.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ ...st.tdBase, textAlign: "center", color: "#bbb", fontStyle: "italic", padding: "24px" }}>
                Sin productos
              </td>
            </tr>
          ) : filled.map((r, i) => {
            const p      = parseFloat(r.price) || 0;
            const pSin   = precioBase(p, ivaRate);
            const pIva   = ivaUnidad(p, ivaRate);
            const total  = calcRow(r);

            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ ...st.tdSm, textAlign: "center" }}>{i + 1}</td>
                <td style={st.tdSm}>{r.ref || "—"}</td>
                <td style={st.tdBold}>{r.desc || "—"}</td>
                <td style={st.tdC}>{r.qty}</td>
                <td style={st.tdSm}>{r.unit}</td>
                <td style={st.tdNum}>{money(pSin, cot.moneda)}</td>
                <td style={st.tdNum}>{money(pIva, cot.moneda)}</td>
                <td style={st.tdNum}>{money(p,    cot.moneda)}</td>
                <td style={st.tdC}>{parseFloat(r.disc) > 0 ? `${r.disc} %` : "0 %"}</td>
                <td style={st.tdNum}>{money(total, cot.moneda)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ═══ NOTAS + RESUMEN ═══ */}
      <div style={st.bottom}>
        <div style={st.notasWrap}>
          <span style={st.notasLbl}>Notas y condiciones</span>
          <div style={st.notasText}>{notas}</div>
        </div>

        <div style={st.resBox}>
          <div style={st.resHdr}>Resumen Económico</div>
          <div style={st.resRow}>
            <span style={st.resLbl}>Total Bruto</span>
            <span style={st.resVal}>{money(totals.totalBruto, cot.moneda)}</span>
          </div>
          {parseFloat(descG) > 0 && (
            <div style={st.resRow}>
              <span style={st.resLbl}>Descuento ({descG}%)</span>
              <span style={{ ...st.resVal, color: "#b00" }}>− {money(totals.descGAmt, cot.moneda)}</span>
            </div>
          )}
          <div style={st.resRow}>
            <span style={st.resLbl}>IVA {cot.iva}%</span>
            <span style={st.resVal}>{money(totals.ivaTotal, cot.moneda)}</span>
          </div>
          <div style={st.resTotal}>
            <span style={st.resTotalLbl}>Total a Pagar</span>
            <span style={st.resTotalVal}>{money(totals.totalPagar, cot.moneda)}</span>
          </div>
        </div>
      </div>

      {/* ═══ PIE ═══ */}
      <div style={st.footer}>
        <span style={st.footNota}>
          Generado el {new Date().toLocaleDateString("es-CO")} — No constituye factura de venta
        </span>
        <span style={st.footBrand}>{empresa.nombre}</span>
      </div>
    </div>
  );
}