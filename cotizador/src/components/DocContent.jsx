/**
 * DocContent.jsx
 * Bloque visual del documento de cotización.
 * Se usa en:
 *  1. Vista previa (pantalla)
 *  2. Nodo oculto #cotizacion-pdf para html2canvas
 */

import { money, fmtDate, calcRow } from "../utils";

const FY   = "#F9BF20";
const DARK = "#1A2B45";

const s = {
  wrap:        { fontFamily: "'DM Sans', sans-serif", color: "#1a1208", background: "#fff" },
  head:        { background: DARK, padding: "36px 48px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  logo:        { height: 52, objectFit: "contain", marginBottom: 10, display: "block" },
  empresa:     { fontWeight: 800, fontSize: 19, color: FY, lineHeight: 1.2 },
  empresaSub:  { fontSize: 10.5, color: "rgba(255,255,255,.5)", marginTop: 4, lineHeight: 1.9 },
  rightHead:   { textAlign: "right", flexShrink: 0 },
  cotLbl:      { fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(249,191,32,.6)", marginBottom: 5 },
  cotNum:      { fontWeight: 300, fontSize: 32, color: "#fff", letterSpacing: "0.02em", lineHeight: 1 },
  cotMeta:     { fontSize: 10.5, color: "rgba(255,255,255,.45)", marginTop: 8, lineHeight: 2 },
  vigencia:    { display: "inline-block", marginTop: 6, border: "1px solid rgba(249,191,32,.4)", borderRadius: 999, padding: "3px 12px", fontSize: 10, color: FY },
  stripe:      { height: 3, background: `linear-gradient(90deg, ${FY}, #f0d080, ${FY})` },
  body:        { padding: "32px 48px" },
  metaGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 26 },
  metaH5:      { fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: FY, marginBottom: 7, paddingBottom: 4, borderBottom: "1.5px solid #f0ead8" },
  metaP:       { fontSize: 11.5, color: "#4a3f30", lineHeight: 1.75, marginBottom: 1 },
  metaLbl:     { color: "#999" },
  metaStrong:  { color: "#1a1208", fontWeight: 700 },
  table:       { width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 },
  theadRow:    { background: DARK },
  th:          { color: FY, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 11px", textAlign: "left", fontWeight: 700, border: "none" },
  thR:         { color: FY, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 11px", textAlign: "right", fontWeight: 700, border: "none" },
  tdBase:      { padding: "9px 11px", color: "#1a1208", border: "none", borderBottom: "1px solid #f0ead8" },
  tdR:         { padding: "9px 11px", color: "#1a1208", border: "none", borderBottom: "1px solid #f0ead8", textAlign: "right", fontWeight: 700, fontSize: 13 },
  tdSm:        { padding: "9px 11px", color: "#999", border: "none", borderBottom: "1px solid #f0ead8", fontSize: 10.5 },
  bottom:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  notasWrap:   { flex: 1, minWidth: 220 },
  notasH5:     { fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: FY, marginBottom: 7 },
  notasP:      { fontSize: 11, color: "#6b5e4e", lineHeight: 1.85, whiteSpace: "pre-line" },
  resumen:     { width: 272, flexShrink: 0, border: "1px solid #ede8de", borderRadius: 10, overflow: "hidden" },
  rHeader:     { background: "#f8f5f0", padding: "9px 15px", fontSize: 8.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", borderBottom: "1px solid #ede8de" },
  rRow:        { display: "flex", justifyContent: "space-between", padding: "8px 15px", borderBottom: "1px solid #f5f0e8", fontSize: 11.5 },
  rLbl:        { color: "#888" },
  rVal:        { fontWeight: 600, color: "#1a1208" },
  rValRed:     { fontWeight: 600, color: "#c0392b" },
  rTotal:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", background: DARK },
  rTotalLbl:   { fontWeight: 800, fontSize: 13, color: "#fff" },
  rTotalVal:   { fontWeight: 900, fontSize: 19, color: FY },
  firmaGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, paddingTop: 22, borderTop: "1px solid #f0ead8", marginTop: 4 },
  firmaSlot:   { textAlign: "center" },
  firmaLine:   { borderTop: "1px solid #1A2B45", paddingTop: 8, marginTop: 42, fontSize: 11.5, color: "#6b5e4e" },
  firmaStrong: { display: "block", fontWeight: 700, fontSize: 12.5, color: "#1a1208", marginBottom: 2 },
  foot:        { background: DARK, padding: "11px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  footNote:    { fontSize: 9.5, color: "rgba(255,255,255,.25)", letterSpacing: "0.03em" },
  footBrand:   { fontSize: 12, color: "rgba(249,191,32,.55)", fontStyle: "italic" },
};

export default function DocContent({ empresa, cot, cli, items, descG, totals, notas }) {
  const showDisc = items.some((r) => parseFloat(r.disc) > 0);
  const filled   = items.filter((r) => r.desc || r.price);

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <div style={s.head}>
        <div>
          <img src="/logo.png" style={s.logo} alt="logo"
            onError={(e) => { e.target.style.display = "none"; }} />
          <div style={s.empresa}>{empresa.nombre}</div>
          <div style={s.empresaSub}>
            NIT {empresa.nit}<br />
            {empresa.dir} — {empresa.ciudad}<br />
            {empresa.tel} · {empresa.correo}
          </div>
        </div>
        <div style={s.rightHead}>
          <div style={s.cotLbl}>Cotización comercial</div>
          <div style={s.cotNum}>{cot.numero || "BORRADOR"}</div>
          <div style={s.cotMeta}>
            Fecha de emisión: {fmtDate(cot.fecha)}<br />
            {cot.vigencia && <>Vigente hasta: {fmtDate(cot.vigencia)}</>}
          </div>
          {cot.vigencia && <div style={s.vigencia}>Válida hasta {fmtDate(cot.vigencia)}</div>}
        </div>
      </div>
      <div style={s.stripe} />

      {/* CUERPO */}
      <div style={s.body}>
        {/* Meta 3 columnas */}
        <div style={s.metaGrid}>
          <div>
            <div style={s.metaH5}>Datos del cliente</div>
            {cli.nombre   ? <p style={s.metaP}><strong style={s.metaStrong}>{cli.nombre}</strong></p> : <p style={{...s.metaP, color:"#ccc", fontStyle:"italic"}}>Sin datos</p>}
            {cli.empresa  && <p style={s.metaP}>{cli.empresa}</p>}
            {cli.nit      && <p style={s.metaP}>NIT {cli.nit}</p>}
            {cli.contacto && <p style={s.metaP}>Attn: {cli.contacto}</p>}
            {cli.correo   && <p style={s.metaP}>{cli.correo}</p>}
            {cli.tel      && <p style={s.metaP}>{cli.tel}</p>}
            {cli.ciudad   && <p style={s.metaP}>{cli.ciudad}</p>}
          </div>
          <div>
            <div style={s.metaH5}>Condiciones comerciales</div>
            {[
              ["Moneda",        cot.moneda],
              ["Forma de pago", cot.formaPago],
              cot.entrega && ["Entrega",     cot.entrega],
              ["IVA",           `${cot.iva}%`],
              parseFloat(descG) > 0 && ["Desc. global", `${descG}%`],
            ].filter(Boolean).map(([l, v]) => (
              <p key={l} style={s.metaP}>
                <span style={s.metaLbl}>{l}: </span>
                <strong style={s.metaStrong}>{v}</strong>
              </p>
            ))}
          </div>
          <div>
            <div style={s.metaH5}>Referencia</div>
            {[
              ["N°",          cot.numero || "—"],
              ["Fecha",       fmtDate(cot.fecha)],
              cot.vigencia && ["Válida hasta", fmtDate(cot.vigencia)],
            ].filter(Boolean).map(([l, v]) => (
              <p key={l} style={s.metaP}>
                <span style={s.metaLbl}>{l}: </span>
                <strong style={s.metaStrong}>{v}</strong>
              </p>
            ))}
          </div>
        </div>

        {/* Tabla de productos */}
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              <th style={{...s.th, width:28}}>#</th>
              <th style={{...s.th, width:76}}>Ref.</th>
              <th style={s.th}>Producto / Servicio</th>
              <th style={{...s.thR, width:56}}>Cant.</th>
              <th style={{...s.th,  width:60}}>Unidad</th>
              <th style={{...s.thR, width:130}}>P. Unit. (c/IVA)</th>
              {showDisc && <th style={{...s.thR, width:58}}>Desc.</th>}
              <th style={{...s.thR, width:130}}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filled.length === 0 ? (
              <tr>
                <td colSpan={showDisc ? 8 : 7}
                  style={{...s.tdBase, textAlign:"center", color:"#ccc", fontStyle:"italic", paddingTop:24}}>
                  Sin productos
                </td>
              </tr>
            ) : filled.map((r, i) => (
              <tr key={r.id} style={i % 2 !== 0 ? {background:"#faf8f4"} : {}}>
                <td style={{...s.tdSm, paddingLeft:14}}>{i+1}</td>
                <td style={s.tdSm}>{r.ref || "—"}</td>
                <td style={{...s.tdBase, fontWeight:600}}>{r.desc || "—"}</td>
                <td style={{...s.tdBase, textAlign:"center"}}>{r.qty}</td>
                <td style={s.tdSm}>{r.unit}</td>
                <td style={s.tdR}>{money(parseFloat(r.price)||0, cot.moneda)}</td>
                {showDisc && <td style={{...s.tdSm, textAlign:"right"}}>{r.disc}%</td>}
                <td style={s.tdR}>{money(calcRow(r), cot.moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notas + Resumen */}
        <div style={s.bottom}>
          <div style={s.notasWrap}>
            <div style={s.notasH5}>Notas y condiciones</div>
            <p style={s.notasP}>{notas}</p>
          </div>
          <div style={s.resumen}>
            <div style={s.rHeader}>Resumen económico</div>
            <div style={s.rRow}>
              <span style={s.rLbl}>Base gravable (sin IVA)</span>
              <span style={s.rVal}>{money(totals.base, cot.moneda)}</span>
            </div>
            <div style={s.rRow}>
              <span style={s.rLbl}>IVA ({cot.iva}%)</span>
              <span style={s.rVal}>{money(totals.ivaAmt, cot.moneda)}</span>
            </div>
            {parseFloat(descG) > 0 && (
              <div style={s.rRow}>
                <span style={s.rLbl}>Descuento ({descG}%)</span>
                <span style={s.rValRed}>- {money(totals.descGAmt, cot.moneda)}</span>
              </div>
            )}
            <div style={s.rTotal}>
              <span style={s.rTotalLbl}>Total cotización</span>
              <span style={s.rTotalVal}>{money(totals.total, cot.moneda)}</span>
            </div>
          </div>
        </div>

        {/* Firmas */}
        <div style={s.firmaGrid}>
          {[{n: empresa.nombre, l:"Elaborado por"}, {n: cli.nombre||"Cliente", l:"Aceptación del cliente"}].map(f=>(
            <div key={f.l} style={s.firmaSlot}>
              <div style={s.firmaLine}>
                <strong style={s.firmaStrong}>{f.n}</strong>
                {f.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.stripe} />
      <div style={s.foot}>
        <span style={s.footNote}>
          Generado el {new Date().toLocaleDateString("es-CO")} — No constituye factura de venta
        </span>
        <span style={s.footBrand}>{empresa.nombre}</span>
      </div>
    </div>
  );
}