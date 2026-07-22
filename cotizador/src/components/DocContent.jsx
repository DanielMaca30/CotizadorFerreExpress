/**
 * DocContent.jsx  v2
 * Soporta dos modos:
 *   tipo = 'comercial'  → IVA por producto (comportamiento anterior)
 *   tipo = 'obra'       → Tabla sin IVA; resumen AIU + IVA sobre utilidad
 */

import React from "react";
import { money, fmtDate, calcRow, precioBase, ivaUnidad } from "../utils";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

/* ── Logo: base64 → /logo.jpg → "FE" ── */
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
    return <img src="/logo.jpg" alt="FerreExpress" style={imgSt} onError={() => setPhase(2)} />;
  return <div style={boxSt}>FE</div>;
}

export default function DocContent({ empresa, cot, cli, items, descG, totals, notas, aiu }) {
  const tipo    = cot?.tipo || "comercial";
  const esObra  = tipo === "obra";
  const filled  = items.filter((r) => r.desc || r.price);
  const ivaRate = (parseFloat(cot.iva) || 0) / 100;
  const aiuData = aiu || { admin: 0, imprevistos: 0, utilidad: 0, anticipo: 0 };

  /* ─── estilos inline ─── */
  const st = {
    page: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 10.5,
      color: "#1a1a1a",
      background: "#fff",
      lineHeight: 1.45,
    },
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
    twoCol:  { display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e8e8e8" },
    col:     { padding: "12px 28px", borderRight: "1px solid #e8e8e8" },
    colLast: { padding: "12px 28px" },
    secLbl:  {
      fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "#aaa",
      borderBottom: "1px solid #e8e8e8",
      paddingBottom: 3, marginBottom: 7, display: "block",
    },
    cliName: { fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2 },
    cliLine: { fontSize: 10, color: "#444", lineHeight: 1.8 },
    fechaRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", background: "#f8f8f8", borderBottom: "2px solid #e0e0e0" },
    fechaCell:  { padding: "9px 28px", borderRight: "1px solid #e8e8e8" },
    fechaCellL: { padding: "9px 28px" },
    fechaLbl:   { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", display: "block", marginBottom: 1 },
    fechaVal:   { fontSize: 11.5, fontWeight: 700, color: "#111" },
    table:   { width: "100%", borderCollapse: "collapse", fontSize: 10 },
    thBase:  { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444", padding: "8px 8px", textAlign: "left",   borderBottom: "2px solid #d0d0d0", background: "#f0f0f0", whiteSpace: "nowrap" },
    thR:     { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444", padding: "8px 8px", textAlign: "right",  borderBottom: "2px solid #d0d0d0", background: "#f0f0f0", whiteSpace: "nowrap" },
    thC:     { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444", padding: "8px 8px", textAlign: "center", borderBottom: "2px solid #d0d0d0", background: "#f0f0f0", whiteSpace: "nowrap" },
    tdBase:  { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#333", fontSize: 10 },
    tdBold:  { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#111", fontWeight: 600, fontSize: 10 },
    tdNum:   { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#111", textAlign: "right",  fontWeight: 600, fontSize: 10 },
    tdC:     { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#555", textAlign: "center", fontSize: 10 },
    tdSm:    { padding: "7px 8px", borderBottom: "1px solid #f0f0f0", color: "#777", fontSize: 9.5 },
    bottom:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28, padding: "18px 28px", borderTop: "1px solid #e8e8e8" },
    notasWrap: { flex: 1, minWidth: 180 },
    notasLbl:  { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", borderBottom: "1px solid #e8e8e8", paddingBottom: 3, marginBottom: 8, display: "block" },
    notasText: { fontSize: 9.5, color: "#666", lineHeight: 1.85, whiteSpace: "pre-line" },
    resBox:    { width: 260, flexShrink: 0, border: "1px solid #e0e0e0", borderRadius: 3, overflow: "hidden" },
    resHdr:    { background: "#f0f0f0", padding: "7px 13px", fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", borderBottom: "1px solid #e0e0e0" },
    resRow:    { display: "flex", justifyContent: "space-between", padding: "6px 13px", borderBottom: "1px solid #f5f5f5", fontSize: 10.5 },
    resRowSub: { display: "flex", justifyContent: "space-between", padding: "5px 13px 5px 20px", borderBottom: "1px solid #f5f5f5", fontSize: 9.5, background: "#fafafa" },
    resLbl:    { color: "#888" },
    resLblSub: { color: "#aaa" },
    resVal:    { fontWeight: 600, color: "#222" },
    resDivider:{ height: 1, background: "#e0e0e0", margin: "0" },
    resTotal:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px", background: DARK },
    resTotalLbl: { fontWeight: 700, fontSize: 11, color: "#fff" },
    resTotalVal: { fontWeight: 900, fontSize: 20, color: FY },
    footer:    { background: DARK, padding: "9px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    footNota:  { fontSize: 8.5, color: "rgba(255,255,255,.28)" },
    footBrand: { fontSize: 10, color: "rgba(249,191,32,.55)", fontStyle: "italic" },
    badge:     { display: "inline-block", background: esObra ? "#1a5276" : "#1a3a1a", color: esObra ? "#aed6f1" : "#abebc6", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 3, marginTop: 4 },
  };

  /* ── Forma de pago con anticipo ── */
  const fmtFormaPago = () => {
    const fp = cot.formaPago || "";
    if (esObra && aiuData.anticipo > 0) {
      return `${fp} — Anticipo ${aiuData.anticipo}%`;
    }
    return fp;
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
          <div style={st.hLabel}>{esObra ? "Cotización de Obra" : "Cotización Comercial"}</div>
          <div style={st.hNum}>{cot.numero || "—"}</div>
          <div style={st.hMeta}>
            Generación: {fmtDate(cot.fecha)}<br />
            Válida hasta: {fmtDate(cot.vigencia)}
          </div>
          {esObra && <div style={st.badge}>AIU</div>}
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
          {cli.nit      && <div style={st.cliLine}>NIT / CC: {cli.nit}</div>}
          {cli.contacto && <div style={st.cliLine}>Attn: {cli.contacto}</div>}
          {cli.tel      && <div style={st.cliLine}>Tel: {cli.tel}</div>}
          {cli.correo   && <div style={st.cliLine}>{cli.correo}</div>}
          {cli.ciudad   && <div style={st.cliLine}>Ciudad: {cli.ciudad}</div>}
        </div>
        <div style={st.colLast}>
          <span style={st.secLbl}>Condiciones</span>
          {[
            ["Moneda",        cot.moneda],
            ["Forma de pago", fmtFormaPago()],
            !esObra && ["IVA", `${cot.iva}%`],
            esObra  && ["Administración", `${aiuData.admin}%`],
            esObra  && ["Imprevistos",    `${aiuData.imprevistos}%`],
            esObra  && ["Utilidad",       `${aiuData.utilidad}%`],
            esObra  && ["IVA (s/ utilidad)", "19%"],
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
          <span style={st.fechaLbl}>Fecha de emisión</span>
          <span style={st.fechaVal}>{fmtDate(cot.fecha)}</span>
        </div>
        <div style={st.fechaCellL}>
          <span style={st.fechaLbl}>N° Cotización</span>
          <span style={st.fechaVal}>{cot.numero || "—"}</span>
        </div>
      </div>

      {/* ═══ TABLA ═══ */}
      {esObra ? (
        /* ── TABLA OBRA: sin columnas de IVA por producto ── */
        <table style={st.table}>
          <thead>
            <tr>
              <th style={{ ...st.thBase, width: 28  }}>Ítem</th>
              <th style={{ ...st.thBase, width: 72  }}>Código</th>
              <th style={st.thBase}>Descripción / Actividad</th>
              <th style={{ ...st.thC,    width: 48 }}>Cantidad</th>
              <th style={{ ...st.thBase, width: 44 }}>Unidad</th>
              <th style={{ ...st.thR,    width: 90 }}>Vr. Unitario</th>
              <th style={{ ...st.thC,    width: 44 }}>% Desc.</th>
              <th style={{ ...st.thR,    width: 90 }}>Vr. Total</th>
            </tr>
          </thead>
          <tbody>
            {filled.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...st.tdBase, textAlign: "center", color: "#bbb", fontStyle: "italic", padding: "24px" }}>
                  Sin actividades / productos
                </td>
              </tr>
            ) : filled.map((r, i) => {
              const p     = parseFloat(r.price) || 0;
              const total = calcRow(r);
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...st.tdSm, textAlign: "center" }}>{i + 1}</td>
                  <td style={st.tdSm}>{r.ref || "—"}</td>
                  <td style={st.tdBold}>{r.desc || "—"}</td>
                  <td style={st.tdC}>{r.qty}</td>
                  <td style={st.tdSm}>{r.unit}</td>
                  <td style={st.tdNum}>{money(p, cot.moneda)}</td>
                  <td style={st.tdC}>{parseFloat(r.disc) > 0 ? `${r.disc} %` : "0 %"}</td>
                  <td style={st.tdNum}>{money(total, cot.moneda)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* ── TABLA COMERCIAL: con IVA por producto ── */
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
              const p     = parseFloat(r.price) || 0;
              const pSin  = r.sinIva ? p : precioBase(p, ivaRate);
              const pIva  = r.sinIva ? 0 : ivaUnidad(p, ivaRate);
              const total = calcRow(r);
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...st.tdSm, textAlign: "center" }}>{i + 1}</td>
                  <td style={st.tdSm}>{r.ref || "—"}</td>
                  <td style={st.tdBold}>{r.desc || "—"}{r.sinIva ? " *" : ""}</td>
                  <td style={st.tdC}>{r.qty}</td>
                  <td style={st.tdSm}>{r.unit}</td>
                  <td style={st.tdNum}>{money(pSin, cot.moneda)}</td>
                  <td style={r.sinIva ? { ...st.tdNum, color: "#999", fontWeight: 400, fontSize: 8.5 } : st.tdNum}>
                    {r.sinIva ? "Excluido" : money(pIva, cot.moneda)}
                  </td>
                  <td style={st.tdNum}>{money(p,    cot.moneda)}</td>
                  <td style={st.tdC}>{parseFloat(r.disc) > 0 ? `${r.disc} %` : "0 %"}</td>
                  <td style={st.tdNum}>{money(total, cot.moneda)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Nota transporte excluido de IVA */}
      {!esObra && filled.some((r) => r.sinIva) && (
        <div style={{ padding: "6px 28px 0", fontSize: 8.5, color: "#888", fontStyle: "italic" }}>
          * Servicio de transporte excluido de IVA (Art. 476 del Estatuto Tributario).
        </div>
      )}

      {/* ═══ NOTAS + RESUMEN ═══ */}
      <div style={st.bottom}>
        <div style={st.notasWrap}>
          <span style={st.notasLbl}>Notas y condiciones</span>
          <div style={st.notasText}>{notas}</div>
        </div>

        <div style={st.resBox}>
          <div style={st.resHdr}>Resumen Económico</div>

          {esObra ? (
            /* ── Resumen Obra (AIU) ── */
            <>
              <div style={st.resRow}>
                <span style={st.resLbl}>Costo Directo</span>
                <span style={st.resVal}>{money(totals.costoDirecto, cot.moneda)}</span>
              </div>
              {parseFloat(descG) > 0 && (
                <div style={st.resRow}>
                  <span style={st.resLbl}>Descuento ({descG}%)</span>
                  <span style={{ ...st.resVal, color: "#b00" }}>− {money(totals.descGAmt, cot.moneda)}</span>
                </div>
              )}
              <div style={st.resRow}>
                <span style={{ ...st.resLbl, fontWeight: 600, color: "#555" }}>Costo Base</span>
                <span style={st.resVal}>{money(totals.costoBase, cot.moneda)}</span>
              </div>
              <div style={st.resDivider} />
              <div style={st.resRowSub}>
                <span style={st.resLblSub}>Administración ({aiuData.admin}%)</span>
                <span style={{ ...st.resVal, fontSize: 9.5 }}>{money(totals.adminAmt, cot.moneda)}</span>
              </div>
              <div style={st.resRowSub}>
                <span style={st.resLblSub}>Imprevistos ({aiuData.imprevistos}%)</span>
                <span style={{ ...st.resVal, fontSize: 9.5 }}>{money(totals.impAmt, cot.moneda)}</span>
              </div>
              <div style={st.resRowSub}>
                <span style={st.resLblSub}>Utilidad ({aiuData.utilidad}%)</span>
                <span style={{ ...st.resVal, fontSize: 9.5 }}>{money(totals.utilAmt, cot.moneda)}</span>
              </div>
              <div style={st.resDivider} />
              <div style={st.resRow}>
                <span style={{ ...st.resLbl, fontWeight: 600, color: "#555" }}>Subtotal AIU</span>
                <span style={st.resVal}>{money(totals.subtotalAIU, cot.moneda)}</span>
              </div>
              <div style={st.resRow}>
                <span style={st.resLbl}>IVA 19% s/ Utilidad</span>
                <span style={st.resVal}>{money(totals.ivaUtilidad, cot.moneda)}</span>
              </div>
              {aiuData.anticipo > 0 && (
                <div style={{ ...st.resRow, background: "#fffde7" }}>
                  <span style={st.resLbl}>Anticipo ({aiuData.anticipo}%)</span>
                  <span style={{ ...st.resVal, color: "#7d6608" }}>{money(totals.totalPagar * aiuData.anticipo / 100, cot.moneda)}</span>
                </div>
              )}
            </>
          ) : (
            /* ── Resumen Comercial ── */
            <>
              <div style={st.resRow}>
                <span style={st.resLbl}>Total Bruto</span>
                <span style={st.resVal}>{money(totals.totalBruto, cot.moneda)}</span>
              </div>
              {(totals.exento || 0) > 0 && (
                <div style={st.resRow}>
                  <span style={st.resLbl}>Transporte (excluido de IVA)</span>
                  <span style={st.resVal}>{money(totals.exento, cot.moneda)}</span>
                </div>
              )}
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
            </>
          )}

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
