/**
 * ClienteAutocomplete.jsx — buscador del directorio de clientes
 * ─────────────────────────────────────────────────────────────────
 * Al escribir el nombre aparecen los clientes ya atendidos, con su
 * dirección y celular a la vista para poder distinguirlos antes de
 * elegir. Al aceptar uno se rellena la ficha completa.
 *
 * Teclado: ↑↓ navegar · Enter aceptar · Esc cerrar.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Input, Text, HStack, Icon, useColorModeValue } from "@chakra-ui/react";
import { FiMapPin, FiPhone, FiUser } from "react-icons/fi";

const FY = "#F9BF20";

/* Resalta la parte que coincide con lo escrito */
function Resaltado({ text, query, accent }) {
  const t = String(text || "");
  const q = String(query || "").trim();
  if (!q) return t;
  const i = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .indexOf(q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  if (i < 0) return t;
  return (
    <>
      {t.slice(0, i)}
      <Text as="span" color={accent} fontWeight="800">{t.slice(i, i + q.length)}</Text>
      {t.slice(i + q.length)}
    </>
  );
}

function Lista({ items, highlighted, anchorRef, onAccept, onHighlight, query }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });
  const bg      = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("yellow.50", "whiteAlpha.100");
  const borderC = useColorModeValue("gray.200", "whiteAlpha.300");
  const textC   = useColorModeValue("gray.800", "white");
  const subC    = useColorModeValue("gray.500", "gray.400");
  const hintBg  = useColorModeValue("gray.50", "whiteAlpha.50");

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 2, left: r.left + window.scrollX, width: Math.max(r.width, 240) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [anchorRef]);

  return createPortal(
    <Box position="absolute" top={`${pos.top}px`} left={`${pos.left}px`} width={`${pos.width}px`}
      zIndex={99999} bg={bg} border="1px solid" borderColor={borderC} rounded="md"
      boxShadow="0 4px 16px rgba(0,0,0,0.12)" overflow="hidden" maxW="360px">
      {items.map((c, idx) => (
        <Box key={c.nombre + idx} px={2.5} py={1.5} cursor="pointer"
          bg={idx === highlighted ? hoverBg : "transparent"}
          borderBottom={idx < items.length - 1 ? "1px solid" : "none"} borderColor={borderC}
          onMouseDown={(e) => { e.preventDefault(); onAccept(c); }}
          onMouseEnter={() => onHighlight(idx)}>
          <HStack spacing={1.5} align="baseline">
            <Text fontSize="12px" fontWeight="700" color={textC} noOfLines={1}>
              <Resaltado text={c.nombre} query={query} accent={FY} />
            </Text>
            {c.count > 1 && <Text fontSize="9px" color={FY}>· {c.count}×</Text>}
          </HStack>
          {c.direccion && (
            <HStack spacing={1} mt="1px">
              <Icon as={FiMapPin} boxSize={2.5} color={subC} />
              <Text fontSize="10px" color={subC} noOfLines={1}>{c.direccion}</Text>
            </HStack>
          )}
          {c.tel && (
            <HStack spacing={1}>
              <Icon as={FiPhone} boxSize={2.5} color={subC} />
              <Text fontSize="10px" color={subC}>{c.tel}</Text>
            </HStack>
          )}
        </Box>
      ))}
      <Box px={2.5} py={1} borderTop="1px solid" borderColor={borderC} bg={hintBg}>
        <Text fontSize="8.5px" color={subC}>↑↓ navegar · Enter usar cliente · Esc cerrar</Text>
      </Box>
    </Box>,
    document.body
  );
}

export default function ClienteAutocomplete({ value, onChange, onAccept, getClientes, inputBg, ...rest }) {
  const [abierto, setAbierto] = useState(false);
  const [hi, setHi] = useState(-1);
  const [tocado, setTocado] = useState(false);
  const ref = useRef(null);

  /* Solo se sugiere mientras el usuario escribe, no al cargar una cotización */
  const sugerencias = useMemo(
    () => (tocado && abierto ? getClientes(value) : []),
    [tocado, abierto, value, getClientes]
  );

  const aceptar = useCallback((c) => {
    onAccept(c);
    setAbierto(false);
    setHi(-1);
  }, [onAccept]);

  const onKeyDown = useCallback((e) => {
    if (!sugerencias.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % sugerencias.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h <= 0 ? sugerencias.length - 1 : h - 1)); }
    else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); aceptar(sugerencias[hi]); }
    else if (e.key === "Escape") { e.preventDefault(); setAbierto(false); setHi(-1); }
  }, [sugerencias, hi, aceptar]);

  return (
    <>
      <Input ref={ref} value={value ?? ""} bg={inputBg} autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setTocado(true); setAbierto(true); setHi(-1); }}
        onFocus={() => { if (value) setAbierto(true); }}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onKeyDown={onKeyDown}
        {...rest} />
      {sugerencias.length > 0 && (
        <Lista items={sugerencias} highlighted={hi} anchorRef={ref}
          onAccept={aceptar} onHighlight={setHi} query={value} />
      )}
    </>
  );
}
