/**
 * AutocompleteInput.jsx  v3
 * ─────────────────────────────────────────────────────────────
 * FIX PRINCIPAL: El dropdown se renderiza via createPortal()
 * directamente en document.body, completamente fuera del árbol
 * de la tabla. Ningún overflow:hidden o z-index puede taparlo.
 *
 * La posición se calcula con getBoundingClientRect() del input
 * en cada render y se actualiza con scroll/resize.
 *
 * FIXES anteriores mantenidos:
 *  - Solo abre con foco activo (hasFocus)
 *  - Tab sin highlight → fluye normal entre campos
 *  - Tab con highlight → acepta y mueve foco a Cantidad
 *  - Diseño sutil y compacto
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Input, Text, useColorModeValue } from "@chakra-ui/react";

/* ── Componente del dropdown renderizado en body ── */
function DropdownPortal({
  sugerencias,
  highlighted,
  anchorRef,
  onAccept,
  onHighlight,
  bg,
  hoverBg,
  textC,
  subC,
  borderC,
  hintBg,
  FY,
  query,
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });

  /* Calcular posición relativa al viewport */
  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + window.scrollY + 2,
        left:  rect.left   + window.scrollX,
        width: Math.max(rect.width, 220),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  return createPortal(
    <Box
      position="absolute"
      top={`${pos.top}px`}
      left={`${pos.left}px`}
      width={`${pos.width}px`}
      zIndex={99999}
      bg={bg}
      border="1px solid"
      borderColor={borderC}
      rounded="md"
      boxShadow="0 4px 16px rgba(0,0,0,0.12)"
      overflow="hidden"
      minW="200px"
      maxW="320px"
    >
      {sugerencias.map((sug, idx) => (
        <Box
          key={sug.desc}
          px={2.5}
          py={1.5}
          cursor="pointer"
          bg={idx === highlighted ? hoverBg : "transparent"}
          borderBottom={idx < sugerencias.length - 1 ? "1px solid" : "none"}
          borderColor={borderC}
          onMouseDown={(e) => { e.preventDefault(); onAccept(sug); }}
          onMouseEnter={() => onHighlight(idx)}
          onMouseLeave={() => onHighlight(-1)}
        >
          <Text fontSize="11px" fontWeight="600" color={textC} noOfLines={1}>
            <HighlightMatch text={sug.desc} query={query} accent={FY} />
          </Text>
          <Text fontSize="9.5px" color={subC}>
            {sug.price
              ? `$\u00a0${Number(sug.price).toLocaleString("es-CO")}`
              : "Sin precio"}
            {sug.unit ? ` · ${sug.unit}` : ""}
            {sug.count > 1 && (
              <Text as="span" color={FY} ml={1}>· {sug.count}×</Text>
            )}
          </Text>
        </Box>
      ))}

      {/* Hint minimalista */}
      <Box px={2.5} py={1} borderTop="1px solid" borderColor={borderC} bg={hintBg}>
        <Text fontSize="8.5px" color={subC} letterSpacing="0.04em">
          ↑↓ navegar · Tab/Enter aceptar · Esc cerrar
        </Text>
      </Box>
    </Box>,
    document.body
  );
}

/* ── Componente principal ── */
export default function AutocompleteInput({
  value,
  onChange,
  onAccept,
  getSugerencias,
  dataRowId,
  inputBg,
  FY = "#F9BF20",
  ...rest
}) {
  const [sugerencias, setSugerencias] = useState([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen]               = useState(false);
  const [hasFocus, setHasFocus]       = useState(false);

  const inputRef   = useRef(null);
  const closeTimer = useRef(null);

  /* Colores */
  const bg      = useColorModeValue("white", "#2d3748");
  const hoverBg = useColorModeValue("#fffbeb", "rgba(255,255,255,0.08)");
  const textC   = useColorModeValue("gray.700", "gray.200");
  const subC    = useColorModeValue("gray.400", "gray.500");
  const borderC = useColorModeValue("gray.200", "rgba(255,255,255,0.15)");
  const hintBg  = useColorModeValue("gray.50", "rgba(0,0,0,0.2)");

  /* Actualizar sugerencias — SOLO con foco activo */
  useEffect(() => {
    if (!hasFocus) return;
    const results = getSugerencias(value);
    setSugerencias(results);
    setHighlighted(-1);
    setOpen(results.length > 0 && (value || "").trim().length > 0);
  }, [value, hasFocus, getSugerencias]);

  /* Aceptar sugerencia */
  const aceptar = useCallback((sug) => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    setHighlighted(-1);
    setSugerencias([]);
    onAccept({ desc: sug.desc, price: sug.price, unit: sug.unit });
  }, [onAccept]);

  /* Teclado */
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (!open || sugerencias.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, sugerencias.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Tab") {
      if (highlighted >= 0) {
        e.preventDefault();
        aceptar(sugerencias[highlighted]);
      }
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      if (highlighted >= 0) {
        e.preventDefault();
        aceptar(sugerencias[highlighted]);
      } else {
        setOpen(false);
      }
      return;
    }
  }, [open, sugerencias, highlighted, aceptar]);

  /* Foco */
  const handleFocus = useCallback(() => {
    clearTimeout(closeTimer.current);
    setHasFocus(true);
    if ((value || "").trim().length > 0) {
      const results = getSugerencias(value);
      if (results.length > 0) { setSugerencias(results); setOpen(true); }
    }
  }, [value, getSugerencias]);

  /* Blur — delay para permitir mouseDown en sugerencia */
  const handleBlur = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setHasFocus(false);
      setOpen(false);
      setHighlighted(-1);
    }, 160);
  }, []);

  return (
    <>
      <Input
        ref={inputRef}
        variant="unstyled"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

      {/* Portal: renderiza el dropdown directamente en body */}
      {open && sugerencias.length > 0 && (
        <DropdownPortal
          sugerencias={sugerencias}
          highlighted={highlighted}
          anchorRef={inputRef}
          onAccept={aceptar}
          onHighlight={setHighlighted}
          bg={bg}
          hoverBg={hoverBg}
          textC={textC}
          subC={subC}
          borderC={borderC}
          hintBg={hintBg}
          FY={FY}
          query={value}
        />
      )}
    </>
  );
}

/* Resalta el fragmento que coincide */
function HighlightMatch({ text, query, accent }) {
  if (!query || !query.trim()) return <>{text}</>;
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx  = norm(text).indexOf(norm(query.trim()));
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Text as="span" color={accent} fontWeight="800">
        {text.slice(idx, idx + query.trim().length)}
      </Text>
      {text.slice(idx + query.trim().length)}
    </>
  );
}