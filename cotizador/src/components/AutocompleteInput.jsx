/**
 * AutocompleteInput.jsx  v4
 *
 * Comportamiento de teclado (igual a VS Code / Google Sheets):
 *
 * MODO DROPDOWN ABIERTO:
 *   ↑ / ↓     → navegar sugerencias
 *   Enter     → aceptar sugerencia seleccionada (o cerrar si ninguna)
 *   Tab       → aceptar sugerencia seleccionada (o cerrar y navegar tabla)
 *   Escape    → cerrar dropdown, mantener texto, foco sigue en el input
 *   Cualquier otra tecla → fluye normal al input (escribir, borrar, etc.)
 *
 * MODO DROPDOWN CERRADO:
 *   Todas las teclas fluyen al container (tabla) para navegación normal.
 *   El dropdown NO interfiere con nada.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Box, Input, Text, useColorModeValue } from "@chakra-ui/react";

/* ── Dropdown portal ── */
function DropdownPortal({ sugerencias, highlighted, anchorRef, onAccept, onHighlight, bg, hoverBg, textC, subC, borderC, hintBg, FY, query }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 2, left: r.left + window.scrollX, width: Math.max(r.width, 220) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [anchorRef]);

  return createPortal(
    <Box position="absolute" top={`${pos.top}px`} left={`${pos.left}px`} width={`${pos.width}px`}
      zIndex={99999} bg={bg} border="1px solid" borderColor={borderC} rounded="md"
      boxShadow="0 4px 16px rgba(0,0,0,0.12)" overflow="hidden" minW="200px" maxW="320px">
      {sugerencias.map((sug, idx) => (
        <Box key={sug.desc} px={2.5} py={1.5} cursor="pointer"
          bg={idx === highlighted ? hoverBg : "transparent"}
          borderBottom={idx < sugerencias.length - 1 ? "1px solid" : "none"}
          borderColor={borderC}
          onMouseDown={(e) => { e.preventDefault(); onAccept(sug); }}
          onMouseEnter={() => onHighlight(idx)}
          onMouseLeave={() => onHighlight(-1)}>
          <Text fontSize="11px" fontWeight="600" color={textC} noOfLines={1}>
            <HighlightMatch text={sug.desc} query={query} accent={FY} />
          </Text>
          <Text fontSize="9.5px" color={subC}>
            {sug.price ? `$ ${Number(sug.price).toLocaleString("es-CO")}` : "Sin precio"}
            {sug.unit ? ` · ${sug.unit}` : ""}
            {sug.count > 1 && <Text as="span" color={FY} ml={1}>· {sug.count}×</Text>}
          </Text>
        </Box>
      ))}
      <Box px={2.5} py={1} borderTop="1px solid" borderColor={borderC} bg={hintBg}>
        <Text fontSize="8.5px" color={subC} letterSpacing="0.04em">
          ↑↓ navegar · Enter/Tab aceptar · Esc cerrar
        </Text>
      </Box>
    </Box>,
    document.body
  );
}

/* ── Componente principal ── */
export default function AutocompleteInput({ value, onChange, onAccept, getSugerencias, dataRowId, inputBg, FY = "#F9BF20", ...rest }) {
  const [highlighted, setHighlighted] = useState(-1);
  const [closed, setClosed]           = useState(false); // el usuario cerró con Esc/Enter/Tab
  const [hasFocus, setHasFocus]       = useState(false);

  const inputRef   = useRef(null);
  const closeTimer = useRef(null);

  const bg      = useColorModeValue("white", "#2d3748");
  const hoverBg = useColorModeValue("#fffbeb", "rgba(255,255,255,0.08)");
  const textC   = useColorModeValue("gray.700", "gray.200");
  const subC    = useColorModeValue("gray.400", "gray.500");
  const borderC = useColorModeValue("gray.200", "rgba(255,255,255,0.15)");
  const hintBg  = useColorModeValue("gray.50", "rgba(0,0,0,0.2)");

  /* Sugerencias DERIVADAS (sin setState en efecto → un render menos por tecla) */
  const sugerencias = useMemo(
    () => (hasFocus && (value || "").trim().length > 0 ? getSugerencias(value) : []),
    [hasFocus, value, getSugerencias]
  );
  const open = sugerencias.length > 0 && !closed;

  const aceptar = useCallback((sug) => {
    clearTimeout(closeTimer.current);
    setClosed(true);
    setHighlighted(-1);
    onAccept({ desc: sug.desc, price: sug.price, unit: sug.unit });
  }, [onAccept]);

  const handleKeyDown = useCallback((e) => {
    /* ══ DROPDOWN ABIERTO: interceptar solo las teclas de navegación ══ */
    if (open && sugerencias.length > 0) {

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation(); // no navegar fila
        setHighlighted(h => Math.min(h + 1, sugerencias.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation(); // no navegar fila
        setHighlighted(h => Math.max(h - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        if (highlighted >= 0) {
          e.preventDefault();
          e.stopPropagation();
          aceptar(sugerencias[highlighted]);
        } else {
          // Enter sin selección → cerrar dropdown, dejar que container maneje
          clearTimeout(closeTimer.current);
          setClosed(true);
          setHighlighted(-1);
        }
        return;
      }

      if (e.key === "Tab") {
        clearTimeout(closeTimer.current);
        setHasFocus(false);
        setClosed(true);
        if (highlighted >= 0) {
          // Tab con sugerencia → aceptar y NO navegar al siguiente campo
          e.preventDefault();
          e.stopPropagation();
          aceptar(sugerencias[highlighted]);
        }
        // Tab sin sugerencia → fluye al container para navegación
        setHighlighted(-1);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setClosed(true);
        setHighlighted(-1);
        // El foco queda en el input — el usuario puede seguir escribiendo
        return;
      }

      // Cualquier otra tecla con dropdown abierto → fluye normal al input
      // (el usuario escribe, borra, etc. — el dropdown se actualizará solo)
      return;
    }

    /* ══ DROPDOWN CERRADO: solo manejar Escape para limpiar estado ══ */
    if (e.key === "Escape") {
      setClosed(true);
      setHighlighted(-1);
      // NO stopPropagation → dejar que Escape llegue al container si hace falta
    }
    // Todo lo demás (Tab, flechas, Enter, etc.) fluye al container sin tocar
  }, [open, sugerencias, highlighted, aceptar]);

  const handleFocus = useCallback(() => {
    clearTimeout(closeTimer.current);
    setHasFocus(true);
    setClosed(false); // al enfocar, permitir que el dropdown se muestre
  }, []);

  const handleBlur = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setHasFocus(false);
      setClosed(true);
      setHighlighted(-1);
    }, 160);
  }, []);

  return (
    <>
      <Input
        ref={inputRef}
        variant="unstyled"
        value={value}
        onChange={(e) => { setClosed(false); setHighlighted(-1); onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-row-id={dataRowId}
        data-field="desc"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Nombre del producto…"
        fontSize="12px"
        fontWeight="600"
        px={2}
        py={1}
        rounded="md"
        _hover={{ bg: inputBg }}
        _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }}
        {...rest}
      />
      {open && sugerencias.length > 0 && (
        <DropdownPortal
          sugerencias={sugerencias} highlighted={highlighted}
          anchorRef={inputRef} onAccept={aceptar} onHighlight={setHighlighted}
          bg={bg} hoverBg={hoverBg} textC={textC} subC={subC}
          borderC={borderC} hintBg={hintBg} FY={FY} query={value}
        />
      )}
    </>
  );
}

function HighlightMatch({ text, query, accent }) {
  if (!query || !query.trim()) return <>{text}</>;
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const idx  = norm(text).indexOf(norm(query.trim()));
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Text as="span" color={accent} fontWeight="800">{text.slice(idx, idx + query.trim().length)}</Text>
      {text.slice(idx + query.trim().length)}
    </>
  );
}
