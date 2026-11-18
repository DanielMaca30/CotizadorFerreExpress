/**
 * CampoNumero.jsx — casilla de precio, cantidad o porcentaje
 * ─────────────────────────────────────────────────────────────────
 * UNA sola casilla numérica para toda la app (tabla del computador,
 * lista rápida del celular, AIU, descuentos).
 *
 * POR QUÉ: cada casilla tenía su propio arreglo y todas fallaban en
 * algún teclado. Medido en la app:
 *   · celular: escribir 1500,5 dejaba 15.005 (se tragaba la coma);
 *   · computador: escribir 1.250.000 dejaba 1,25;
 *   · cantidad 1,5 quedaba 15 (las casillas type="number" botan la
 *     coma, que es justo lo que trae el teclado del iPhone en español).
 *
 * CÓMO FUNCIONA
 *   · Mientras se escribe, la casilla muestra EXACTAMENTE lo que la
 *     persona tecleó (no se reformatea a media escritura: así el cursor
 *     no salta y la coma no desaparece).
 *   · Cada tecla se traduce con parseNumeroCO y se avisa el valor limpio.
 *   · Al salir de la casilla se muestra con formato: 1.250.000 · 1,5.
 *   · type="text" + inputMode="decimal": teclado numérico con coma en
 *     iPhone y Android, sin las trampas de type="number".
 */
import { forwardRef, useRef, useState } from "react";
import { Input } from "@chakra-ui/react";
import { parseNumeroCO, formatPriceCO, fmtCantidad } from "../utils";

const DECIMALES = { precio: 2, cantidad: 3, porcentaje: 2 };

/* Cómo se ve el valor cuando NO se está escribiendo */
const formatear = (v, tipo) => {
  const s = String(v ?? "");
  if (s === "") return "";
  if (tipo === "precio") return formatPriceCO(s);
  return fmtCantidad(s);
};

/* Cómo se ve al entrar a editar: sin puntos de miles, con coma decimal */
const paraEditar = (v) => {
  const s = String(v ?? "");
  if (s === "") return "";
  return s.replace(".", ",");
};

const CampoNumero = forwardRef(function CampoNumero(
  { value, onChange, tipo = "precio", max, onFocus, onBlur, onKeyDown, ...rest },
  ref
) {
  /* null = no se está editando (se muestra formateado) */
  const [borrador, setBorrador] = useState(null);
  const tecleado = useRef(false);

  /* Si el valor cambia desde afuera mientras se edita (deshacer, aceptar
     una sugerencia), se respeta el nuevo valor. */
  const [ultimo, setUltimo] = useState(value);
  if (ultimo !== value) {
    setUltimo(value);
    if (borrador !== null) {
      const delBorrador = parseNumeroCO(borrador, { tipo, decimales: DECIMALES[tipo] });
      if (parseFloat(delBorrador || 0) !== parseFloat(value || 0)) setBorrador(paraEditar(value));
    }
  }

  const mostrado = borrador !== null ? borrador : formatear(value, tipo);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      value={mostrado}
      onChange={(e) => {
        /* Solo cifras, coma y punto */
        const txt = e.target.value.replace(/[^\d.,]/g, "");
        tecleado.current = true;
        setBorrador(txt);
        let limpio = parseNumeroCO(txt, { tipo, decimales: DECIMALES[tipo] });
        if (max != null && limpio !== "" && parseFloat(limpio) > max) limpio = String(max);
        onChange(limpio);
      }}
      onFocus={(e) => {
        const el = e.target;
        setBorrador(paraEditar(value));
        tecleado.current = false;
        /* Seleccionar todo para sobrescribir de una — pero solo si la
           persona aún no empezó a escribir (si no, se borraba lo tecleado). */
        requestAnimationFrame(() => {
          if (document.activeElement === el && !tecleado.current) {
            try { el.select(); } catch { /* noop */ }
          }
        });
        onFocus?.(e);
      }}
      onBlur={(e) => { setBorrador(null); onBlur?.(e); }}
      /* Se marca «ya escribió» desde la tecla, no desde el cambio: si la
         persona teclea el mismo número que ya había (un 1 sobre el 1),
         React no avisa cambio, y la selección automática se comía las
         cifras siguientes (10 quedaba 0). */
      onKeyDown={(e) => {
        if (e.key && (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete")) tecleado.current = true;
        onKeyDown?.(e);
      }}
      onBeforeInput={() => { tecleado.current = true; }}
      {...rest}
    />
  );
});

export default CampoNumero;
