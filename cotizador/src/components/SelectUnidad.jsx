/**
 * SelectUnidad.jsx — la lista de unidades, sin cargar con ella
 * ─────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE: cada fila de producto tenía las 17 unidades metidas en
 * la página, aunque nadie las estuviera mirando. En una cotización de 45
 * productos eso son 765 elementos — la cuarta parte de TODO lo que el
 * navegador tiene que construir y maquetar. Se notaba al abrir.
 *
 * Aquí solo vive la unidad elegida. Las demás aparecen en cuanto alguien
 * toca la lista, que es cuando de verdad hacen falta. Para quien la usa
 * no cambia nada: se ve y se comporta igual.
 */
import { useState, memo } from "react";
import { Select } from "@chakra-ui/react";
import { UNITS } from "../utils";

/* Todas las opciones, creadas una sola vez para toda la aplicación */
const TODAS = UNITS.map((u) => <option key={u} value={u}>{u}</option>);

const SelectUnidad = memo(function SelectUnidad({ value, onChange, ...rest }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <Select
      value={value}
      onChange={onChange}
      /* Con cualquiera de estos gestos la lista ya está completa antes de
         desplegarse: el ratón baja el botón antes de abrir, el dedo toca
         antes de soltar, y el teclado enfoca antes de navegar. */
      onMouseDown={() => setAbierta(true)}
      onTouchStart={() => setAbierta(true)}
      onFocus={() => setAbierta(true)}
      onKeyDown={() => setAbierta(true)}
      {...rest}
    >
      {abierta
        ? TODAS
        : <option value={value}>{value}</option>}
    </Select>
  );
});

export default SelectUnidad;
