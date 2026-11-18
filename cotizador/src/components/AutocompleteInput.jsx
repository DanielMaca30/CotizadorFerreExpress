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

/* ── Dropdown portal ──
   En celular la lista tiene que poder DESLIZARSE con el dedo. Antes cada
   opción se aceptaba en el primer contacto (touchstart): al intentar bajar
   por la lista se escogía lo que estuviera bajo el dedo, o el campo perdía
   el foco y todo se cerraba. Ahora:
   · un TOQUE (dedo que baja y sube sin moverse) escoge la opción;
   · un DESLIZAMIENTO solo desplaza la lista;
   · la lista mide lo que quepa en pantalla (descontando el teclado) y, si
     abajo no hay espacio, se abre hacia arriba. */
const TAP_TOLERANCIA = 10; // px que se puede mover el dedo y seguir contando como toque

function DropdownPortal({ sugerencias, highlighted, anchorRef, dropdownRef, onAccept, onHighlight, onInteract, bg, hoverBg, textC, subC, borderC, hintBg, FY, query }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220, maxH: 320, arriba: false });
  const toqueRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r  = a.getBoundingClientRect();
      const vv = window.visualViewport;
      const vTop = vv ? vv.offsetTop : 0;
      const vH   = vv ? vv.height : window.innerHeight;
      const vW   = vv ? vv.width : window.innerWidth;
      const abajo  = vTop + vH - r.bottom - 10;
      const encima = r.top - vTop - 10;
      const arriba = abajo < 170 && encima > abajo;
      const maxH = Math.max(110, Math.min(arriba ? encima : abajo, 340));
      const width = Math.min(Math.max(r.width, 220), vW - 16);
      const left = Math.max(8, Math.min(r.left, vW - width - 8)) + window.scrollX;
      setPos({
        top: (arriba ? r.top - 2 : r.bottom + 2) + window.scrollY,
        left, width, maxH, arriba,
      });
    };
    update();
    const vv = window.visualViewport;
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [anchorRef, sugerencias.length]);

  /* Con flechas del teclado: que la opción resaltada quede a la vista */
  useEffect(() => {
    if (highlighted < 0) return;
    dropdownRef.current?.querySelector(`[data-sug-idx="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, dropdownRef]);

  /* Toque vs. deslizamiento */
  const onPointerDown = (e, idx) => {
    onInteract();
    toqueRef.current = { x: e.clientX, y: e.clientY, idx, id: e.pointerId, movido: false };
  };
  const onPointerMove = (e) => {
    const t = toqueRef.current;
    if (!t || t.id !== e.pointerId) return;
    if (Math.abs(e.clientX - t.x) > TAP_TOLERANCIA || Math.abs(e.clientY - t.y) > TAP_TOLERANCIA) t.movido = true;
  };
  const onPointerUp = (e, idx) => {
    const t = toqueRef.current;
    toqueRef.current = null;
    if (!t || t.id !== e.pointerId || t.movido || t.idx !== idx) return;
    onAccept(sugerencias[idx]);
  };

  return createPortal(
    <Box ref={dropdownRef}
      position="absolute" top={`${pos.top}px`} left={`${pos.left}px`} width={`${pos.width}px`}
      transform={pos.arriba ? "translateY(-100%)" : undefined}
      zIndex={99999} bg={bg} border="1px solid" borderColor={borderC} rounded={{ base: "xl", md: "md" }}
      boxShadow="0 8px 28px rgba(0,0,0,0.18)" overflow="hidden" minW="200px"
      maxW={{ base: "calc(100vw - 16px)", md: "320px" }}
      display="flex" flexDirection="column" maxH={`${pos.maxH}px`}
      /* En computador: que el clic no le quite el foco al campo */
      onMouseDown={(e) => e.preventDefault()}
      onPointerDownCapture={onInteract}>
      <Box flex="1" minH={0} overflowY="auto"
        sx={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        onPointerMove={onPointerMove}
        onPointerCancel={() => { toqueRef.current = null; }}>
        {sugerencias.map((sug, idx) => (
          /* En celular cada opción va más alta (≥ 48 px): con el dedo, una
             opción baja es imposible de acertar. En computador, compacta. */
          <Box key={sug.desc} px={{ base: 3.5, md: 2.5 }} py={{ base: 3, md: 1.5 }} cursor="pointer"
            role="option" aria-selected={idx === highlighted} data-sug-idx={idx}
            bg={idx === highlighted ? hoverBg : "transparent"}
            _active={{ bg: hoverBg }}
            borderBottom={idx < sugerencias.length - 1 ? "1px solid" : "none"}
            borderColor={borderC}
            style={{ WebkitTapHighlightColor: "transparent", userSelect: "none" }}
            onPointerDown={(e) => onPointerDown(e, idx)}
            onPointerUp={(e) => onPointerUp(e, idx)}
            onMouseEnter={() => onHighlight(idx)}
            onMouseLeave={() => onHighlight(-1)}>
            <Text fontSize={{ base: "15px", md: "11px" }} fontWeight="600" color={textC} noOfLines={1}>
              <HighlightMatch text={sug.desc} query={query} accent={FY} />
            </Text>
            <Text fontSize={{ base: "12px", md: "9.5px" }} color={subC}>
              {sug.price ? `$ ${Number(sug.price).toLocaleString("es-CO")}` : "Sin precio"}
              {sug.unit ? ` · ${sug.unit}` : ""}
              {sug.count > 1 && <Text as="span" color={FY} ml={1}>· {sug.count}×</Text>}
            </Text>
          </Box>
        ))}
      </Box>
      {/* Atajos de teclado: solo tienen sentido en computador */}
      <Box px={2.5} py={1} borderTop="1px solid" borderColor={borderC} bg={hintBg}
        display={{ base: "none", md: "block" }} flexShrink={0}>
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

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);
  const closeTimer  = useRef(null);
  /* true mientras el dedo/ratón está usando la lista: si en ese momento el
     campo pierde el foco (en el celular pasa al tocar la lista), NO se cierra */
  const usandoLista = useRef(false);

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
    usandoLista.current = false;
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
    usandoLista.current = false;
    setHasFocus(true);
    setClosed(false); // al enfocar, permitir que el dropdown se muestre
  }, []);

  const cerrarTodo = useCallback(() => {
    clearTimeout(closeTimer.current);
    usandoLista.current = false;
    setHasFocus(false);
    setClosed(true);
    setHighlighted(-1);
  }, []);

  const handleBlur = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      /* Se fue el foco porque están deslizando/tocando la lista → seguir abierta */
      if (usandoLista.current) return;
      cerrarTodo();
    }, 160);
  }, [cerrarTodo]);

  const marcarUsoLista = useCallback(() => {
    usandoLista.current = true;
    clearTimeout(closeTimer.current);
  }, []);

  /* Con la lista abierta, tocar en cualquier otra parte la cierra */
  const abierta = open && sugerencias.length > 0;
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e) => {
      const t = e.target;
      if (dropdownRef.current?.contains(t) || inputRef.current?.contains(t)) return;
      if (usandoLista.current || document.activeElement !== inputRef.current) cerrarTodo();
    };
    document.addEventListener("pointerdown", fuera, true);
    return () => document.removeEventListener("pointerdown", fuera, true);
  }, [abierta, cerrarTodo]);

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
        /* Estas dos marcas le avisan a la tabla que la lista de sugerencias
           está abierta y si hay una opción resaltada. La tabla escucha las
           teclas ANTES que este campo (captura), así que sin esta señal se
           quedaba con Enter y la sugerencia nunca se aceptaba, aunque el
           pie de la lista prometiera que sí. */
        data-sug-abierta={open && sugerencias.length > 0 ? "1" : undefined}
        data-sug-sel={open && highlighted >= 0 ? "1" : undefined}
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
          anchorRef={inputRef} dropdownRef={dropdownRef} onAccept={aceptar} onHighlight={setHighlighted}
          onInteract={marcarUsoLista}
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
