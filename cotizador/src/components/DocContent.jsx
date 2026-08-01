/**
 * DocContent.jsx  v3 — Cotización · Remisión
 * ─────────────────────────────────────────────────────────────────
 * El mismo documento sirve de cotización y de remisión de domicilio,
 * así que está pensado para imprimirse y firmarse:
 *
 *   • HOJA CARTA COMPLETA. Altura fija (279 mm) en columna flexible: la
 *     tabla de productos ocupa el centro y se estira, de modo que la hoja
 *     queda llena tanto con 3 productos como con 25. Antes el documento
 *     medía lo que midiera el contenido y quedaba media página en blanco.
 *   • DATOS DE ENTREGA destacados: nombre, dirección y celular. Lo demás
 *     (empresa, NIT, contacto, correo, ciudad) solo se imprime si existe.
 *   • TABLA SIMPLE de seis columnas. El valor unitario es el precio real
 *     del producto, con IVA incluido; el IVA va discriminado en el resumen.
 *   • OBSERVACIONES al pie, con renglones para escribir a mano sobre la
 *     hoja impresa, y bloque de firma de recibido.
 *
 * Dos modos:
 *   tipo = 'comercial' → resumen con IVA discriminado
 *   tipo = 'obra'      → sin discriminar IVA; AIU solo si se configuró
 */

import React from "react";
import { money, fmtDate, calcRow } from "../utils";

const FY    = "#F9BF20";
const DARK  = "#3A3A38";
const LINE  = "#dedbd5";   // filete general
const LINEL = "#efedE8";   // filete suave entre filas
const MUTED = "#8a8884";
const LABEL = "#a09e99";

/* Hoja carta a 96 ppp: 216 × 279 mm */
export const PAGE_W = 816;
export const PAGE_H = 1054;

/* ── Logo: base64 → /logo.jpg → "FE" ── */
function DocLogo({ src }) {
  const [phase, setPhase] = React.useState(src ? 0 : 1);
  React.useEffect(() => setPhase(src ? 0 : 1), [src]);

  const imgSt = { height: 46, maxWidth: 132, objectFit: "contain", display: "block" };
  const boxSt = {
    background: FY, color: DARK, fontWeight: 900, fontSize: 20,
    width: 46, height: 46, display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: 4, flexShrink: 0,
  };

  if (phase === 0 && src)
    return <img src={src} alt="Logo" style={imgSt} onError={() => setPhase(1)} />;
  if (phase === 1)
    return <img src="/logo.jpg" alt="FerreExpress" style={imgSt} onError={() => setPhase(2)} />;
  return <div style={boxSt}>FE</div>;
}

/* Etiqueta pequeña en versalitas */
const Lbl = ({ children, style }) => (
  <div style={{
    fontSize: 7, letterSpacing: 1.6, color: LABEL, fontWeight: 700,
    textTransform: "uppercase", ...style,
  }}>{children}</div>
);

/* Encabezado de columna de la tabla */
const TH_BASE = {
  padding: "7px 4px", textAlign: "left", fontSize: 7.5,
  letterSpacing: 1.1, fontWeight: 700, whiteSpace: "nowrap",
};
const Th = ({ w, align = "left", pad, children }) => (
  <th style={{ ...TH_BASE, width: w, textAlign: align, padding: pad || TH_BASE.padding }}>
    {children}
  </th>
);

export default function DocContent({
  empresa, cot, cli, items, descG, totals, notas, observaciones, aiu,
}) {
  const tipo   = cot?.tipo || "comercial";
  const esObra = tipo === "obra";
  const filled = items.filter((r) => r.desc || r.price);
  const aiuData = aiu || { admin: 0, imprevistos: 0, utilidad: 0, anticipo: 0 };

  /* ¿Esta obra lleva AIU? Si no, se imprime simple: productos y total. */
  const hayAIU = esObra &&
    (aiuData.admin > 0 || aiuData.imprevistos > 0 || aiuData.utilidad > 0);

  const hayDesc = filled.some((r) => parseFloat(r.disc) > 0);
  const moneda  = cot.moneda || "COP";

  /* Datos opcionales del cliente: se imprimen solo si están */
  const extras = [cli.empresa, cli.nit && `NIT ${cli.nit}`, cli.ciudad,
    cli.contacto && `Attn: ${cli.contacto}`, cli.correo].filter(Boolean).join("  ·  ");

  const st = {
    page: {
      fontFamily: "Arial, Helvetica, sans-serif",
      color: "#1a1a1a",
      background: "#fff",
      width: PAGE_W,
      height: PAGE_H,
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    },
    td: { padding: "8px 4px", fontSize: 11, verticalAlign: "top" },
    resRow: {
      display: "flex", justifyContent: "space-between",
      padding: "6px 11px", fontSize: 10.5, color: "#555",
    },
    firma: { borderBottom: `1px solid ${DARK}`, height: 30 },
  };

  return (
    <div style={st.page}>

      {/* ═══ ENCABEZADO ═══ */}
      <div style={{
        background: DARK, padding: "16px 26px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flex: "0 0 auto",
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <DocLogo src={empresa?.logo} />
          <div style={{ fontSize: 9, color: "#b8b6b1", lineHeight: 1.65 }}>
            <div style={{ color: FY, fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>
              {empresa?.nombre || "FerreExpress S.A.S."}
            </div>
            {empresa?.nit && `NIT ${empresa.nit}`}
            {empresa?.dir && `  ·  ${empresa.dir}`}
            {empresa?.ciudad && `, ${empresa.ciudad}`}
            <br />
            {empresa?.tel && `Tel ${empresa.tel}`}
            {empresa?.correo && `  ·  ${empresa.correo}`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: FY, fontSize: 8, letterSpacing: 2.2, fontWeight: 700 }}>
            COTIZACIÓN · REMISIÓN
          </div>
          <div style={{ color: "#fff", fontSize: 37, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5 }}>
            {cot.numero || "—"}
          </div>
          {esObra && (
            <div style={{
              display: "inline-block", background: "#1a5276", color: "#d6eaf8",
              fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4,
              padding: "2px 9px", borderRadius: 3, marginTop: 2,
            }}>OBRA</div>
          )}
        </div>
      </div>

      {/* ═══ CLIENTE Y CONDICIONES ═══ */}
      <div style={{ display: "flex", borderBottom: `2px solid ${DARK}`, flex: "0 0 auto" }}>
        <div style={{ flex: 1.75, padding: "13px 26px", borderRight: `1px solid ${LINE}` }}>
          <Lbl style={{ marginBottom: 7 }}>Cliente</Lbl>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 7 }}>
            {cli.nombre || "—"}
          </div>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontSize: 8, color: LABEL, letterSpacing: 0.8, width: 62, padding: "2px 0", verticalAlign: "baseline", fontWeight: 700 }}>
                  DIRECCIÓN
                </td>
                <td style={{ fontSize: 12, fontWeight: 700, padding: "2px 0" }}>
                  {cli.direccion || "—"}
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: 8, color: LABEL, letterSpacing: 0.8, padding: "2px 0", verticalAlign: "baseline", fontWeight: 700 }}>
                  CELULAR
                </td>
                <td style={{ fontSize: 12, fontWeight: 700, padding: "2px 0" }}>
                  {cli.tel || "—"}
                </td>
              </tr>
            </tbody>
          </table>
          {extras && (
            <div style={{ fontSize: 8.5, color: LABEL, marginTop: 6 }}>{extras}</div>
          )}
        </div>

        <div style={{ flex: 1, padding: "13px 26px" }}>
          <Lbl style={{ marginBottom: 7 }}>Condiciones</Lbl>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <tbody>
              {[
                ["Emisión", fmtDate(cot.fecha)],
                ["Válida hasta", fmtDate(cot.vigencia)],
                ["Forma de pago", cot.formaPago],
                [esObra ? "Moneda" : `Moneda · IVA`, esObra ? moneda : `${moneda} · ${cot.iva}%`],
                hayAIU && ["AIU", `${aiuData.admin}% · ${aiuData.imprevistos}% · ${aiuData.utilidad}%`],
                aiuData.anticipo > 0 && ["Anticipo", `${aiuData.anticipo}%`],
                parseFloat(descG) > 0 && ["Descuento", `${descG}%`],
              ].filter(Boolean).map(([l, v]) => (
                <tr key={l}>
                  <td style={{ color: MUTED, padding: "2.5px 0" }}>{l}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, padding: "2.5px 0" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ TABLA DE PRODUCTOS — se estira hasta el pie ═══ */}
      <div style={{
        flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column",
        margin: "0 26px", border: `1px solid ${LINE}`, borderTop: "none",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: DARK, color: FY }}>
              <Th w={30} pad="7px 4px 7px 11px">N°</Th>
              <Th>Descripción</Th>
              <Th w={46} align="center">Cant.</Th>
              <Th w={42} align="center">Und.</Th>
              <Th w={86} align="right">Vr. unitario</Th>
              {hayDesc && <Th w={44} align="right">Desc.</Th>}
              <Th w={92} align="right" pad="7px 11px 7px 4px">Vr. total</Th>
            </tr>
          </thead>
          <tbody>
            {filled.map((r, i) => (
              <tr key={r.id || i} style={{
                borderBottom: `1px solid ${LINEL}`,
                background: i % 2 === 1 ? "#fbfaf8" : "#fff",
              }}>
                <td style={{ ...st.td, padding: "8px 4px 8px 11px", color: "#b5b3ae", fontSize: 9 }}>{i + 1}</td>
                <td style={{ ...st.td, fontWeight: 700 }}>
                  {r.desc || "—"}
                  {r.ref && <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>  ({r.ref})</span>}
                </td>
                <td style={{ ...st.td, textAlign: "center", fontWeight: 700 }}>{r.qty || 1}</td>
                <td style={{ ...st.td, textAlign: "center", color: MUTED, fontSize: 9.5 }}>{r.unit || "Und"}</td>
                <td style={{ ...st.td, textAlign: "right" }}>{money(parseFloat(r.price) || 0, moneda)}</td>
                {hayDesc && (
                  <td style={{ ...st.td, textAlign: "right", color: MUTED, fontSize: 9.5 }}>
                    {parseFloat(r.disc) > 0 ? `${r.disc}%` : "—"}
                  </td>
                )}
                <td style={{ ...st.td, padding: "8px 11px 8px 4px", textAlign: "right", fontWeight: 700 }}>
                  {money(calcRow(r), moneda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Espacio libre: mantiene la hoja llena sin dibujar nada */}
        <div style={{ flex: 1, minHeight: 0 }} />

        <div style={{
          padding: "6px 11px", borderTop: `1px solid ${LINE}`, background: "#fbfaf8",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: MUTED, letterSpacing: 0.4 }}>
            Total ítems: <strong style={{ color: DARK }}>{filled.length}</strong>
          </span>
          <span style={{ fontSize: 9, color: LABEL, fontStyle: "italic" }}>
            {esObra
              ? "Valores en pesos colombianos"
              : "Valores en pesos colombianos con IVA incluido"}
          </span>
        </div>
      </div>

      {/* ═══ OBSERVACIONES + RESUMEN ═══ */}
      <div style={{ display: "flex", gap: 14, padding: "13px 26px 0", flex: "0 0 auto" }}>
        <div style={{ flex: 1.5, display: "flex", flexDirection: "column" }}>
          <Lbl style={{ marginBottom: 5 }}>Observaciones</Lbl>
          <div style={{
            border: `1px solid ${LINE}`, borderRadius: 2, padding: "7px 10px",
            height: 86, display: "flex", flexDirection: "column", boxSizing: "border-box",
          }}>
            {observaciones && (
              <div style={{ fontSize: 10, color: "#333", lineHeight: 1.45, whiteSpace: "pre-wrap", marginBottom: 4 }}>
                {observaciones}
              </div>
            )}
            {/* Renglones para escribir a mano sobre la hoja impresa */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14, paddingBottom: 2 }}>
              <div style={{ borderBottom: `1px solid #eae7e1` }} />
              <div style={{ borderBottom: `1px solid #eae7e1` }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <Lbl style={{ marginBottom: 5 }}>Resumen</Lbl>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 2, overflow: "hidden" }}>
            {esObra ? (
              <>
                <div style={st.resRow}>
                  <span>{hayAIU ? "Costo directo" : "Subtotal"}</span>
                  <strong style={{ color: "#333" }}>{money(totals.costoDirecto, moneda)}</strong>
                </div>
                {parseFloat(descG) > 0 && (
                  <div style={st.resRow}>
                    <span>Descuento ({descG}%)</span>
                    <strong style={{ color: "#b00" }}>− {money(totals.descGAmt, moneda)}</strong>
                  </div>
                )}
                {hayAIU && (
                  <>
                    {aiuData.admin > 0 && (
                      <div style={st.resRow}>
                        <span>Administración ({aiuData.admin}%)</span>
                        <strong style={{ color: "#333" }}>{money(totals.adminAmt, moneda)}</strong>
                      </div>
                    )}
                    {aiuData.imprevistos > 0 && (
                      <div style={st.resRow}>
                        <span>Imprevistos ({aiuData.imprevistos}%)</span>
                        <strong style={{ color: "#333" }}>{money(totals.impAmt, moneda)}</strong>
                      </div>
                    )}
                    {aiuData.utilidad > 0 && (
                      <div style={st.resRow}>
                        <span>Utilidad ({aiuData.utilidad}%)</span>
                        <strong style={{ color: "#333" }}>{money(totals.utilAmt, moneda)}</strong>
                      </div>
                    )}
                  </>
                )}
                {aiuData.utilidad > 0 && (
                  <div style={{ ...st.resRow, borderBottom: `1px solid ${LINEL}` }}>
                    <span>IVA 19% s/ utilidad</span>
                    <strong style={{ color: "#333" }}>{money(totals.ivaUtilidad, moneda)}</strong>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={st.resRow}>
                  <span>Subtotal</span>
                  <strong style={{ color: "#333" }}>{money(totals.totalBruto, moneda)}</strong>
                </div>
                {(totals.exento || 0) > 0 && (
                  <div style={st.resRow}>
                    <span>Transporte (sin IVA)</span>
                    <strong style={{ color: "#333" }}>{money(totals.exento, moneda)}</strong>
                  </div>
                )}
                {parseFloat(descG) > 0 && (
                  <div style={st.resRow}>
                    <span>Descuento ({descG}%)</span>
                    <strong style={{ color: "#b00" }}>− {money(totals.descGAmt, moneda)}</strong>
                  </div>
                )}
                <div style={{ ...st.resRow, borderBottom: `1px solid ${LINEL}` }}>
                  <span>IVA {cot.iva}%</span>
                  <strong style={{ color: "#333" }}>{money(totals.ivaTotal, moneda)}</strong>
                </div>
              </>
            )}

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 11px", background: DARK,
            }}>
              <span style={{ fontSize: 9.5, color: "#fff", fontWeight: 700, letterSpacing: 1.2 }}>
                TOTAL A PAGAR
              </span>
              <span style={{ fontSize: 21, color: FY, fontWeight: 700 }}>
                {money(totals.totalPagar, moneda)}
              </span>
            </div>

            {aiuData.anticipo > 0 && (
              <div style={{ ...st.resRow, background: "#fffde7" }}>
                <span>Anticipo ({aiuData.anticipo}%)</span>
                <strong style={{ color: "#7d6608" }}>
                  {money(totals.totalPagar * aiuData.anticipo / 100, moneda)}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ NOTAS ═══ */}
      {notas && (
        <div style={{ padding: "11px 26px 0", flex: "0 0 auto" }}>
          <div style={{ fontSize: 8.5, color: MUTED, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {notas}
          </div>
        </div>
      )}

      {/* ═══ FIRMA DE RECIBIDO ═══ */}
      <div style={{ display: "flex", gap: 30, padding: "18px 26px 12px", flex: "0 0 auto" }}>
        <div style={{ flex: 1 }}>
          <div style={st.firma} />
          <Lbl style={{ marginTop: 4, fontSize: 7.5 }}>Recibí conforme · firma</Lbl>
        </div>
        <div style={{ flex: 0.9 }}>
          <div style={st.firma} />
          <Lbl style={{ marginTop: 4, fontSize: 7.5 }}>Nombre y C.C.</Lbl>
        </div>
        <div style={{ flex: 0.55 }}>
          <div style={st.firma} />
          <Lbl style={{ marginTop: 4, fontSize: 7.5 }}>Fecha entrega</Lbl>
        </div>
      </div>

      {/* ═══ PIE ═══ */}
      <div style={{
        background: DARK, padding: "7px 26px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flex: "0 0 auto",
      }}>
        <span style={{ fontSize: 8, color: MUTED }}>
          {cot.numero || ""} · Documento informativo, no constituye factura de venta
        </span>
        <span style={{ fontSize: 8.5, color: FY, fontStyle: "italic", fontWeight: 700 }}>
          {empresa?.nombre || "FerreExpress S.A.S."}
        </span>
      </div>

    </div>
  );
}
