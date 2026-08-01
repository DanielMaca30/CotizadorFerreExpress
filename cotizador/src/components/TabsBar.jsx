/**
 * TabsBar.jsx — barra global de cotizaciones abiertas
 * ─────────────────────────────────────────────────────────────────
 * Visible en Historial y Cotizador. Las pestañas se guardan en
 * localStorage, así que sobreviven al cerrar el navegador.
 *
 * • Clic            → abre esa cotización (autoguardando la actual)
 * • ×  / rueda      → cierra la pestaña
 * • Menú ⋮ del final → Cerrar las demás · Cerrar todas
 * • Alt+1 … Alt+9   → saltar a la pestaña N
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Flex, HStack, Text, Icon, Tooltip, CloseButton, IconButton,
  Menu, MenuList, MenuItem, MenuButton, MenuDivider, useColorModeValue,
} from "@chakra-ui/react";
import { FiFileText, FiPlus, FiMoreVertical } from "react-icons/fi";
import { useCotizaciones, NEW_TAB_ID } from "../context/cotizacionesContext";

const FY = "#F9BF20";

/** Alto de la barra — las páginas lo usan para posicionar su topbar sticky */
export const TABS_BAR_H = "36px";

/* ─── Una pestaña ─── */
const Tab = memo(function Tab({ id, label, sub, esObra, esNueva, activa, onSelect, onClose }) {
  const bgOff   = useColorModeValue("gray.100", "gray.800");
  const bgOn    = useColorModeValue("white", "gray.700");
  const border  = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted   = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100");

  const dot = esNueva ? FY : esObra ? "#2b6cb0" : "#2f855a";

  return (
    <Tooltip label={sub ? `${label} · ${sub}` : label} openDelay={600} hasArrow>
      <Flex
        role="tab"
        aria-selected={activa}
        tabIndex={0}
        onClick={() => !activa && onSelect(id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(id); } }}
        /* Clic con la rueda del ratón cierra, como en el navegador */
        onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(id); } }}
        align="center"
        gap={1.5}
        flex="0 0 auto"
        maxW="190px"
        h={TABS_BAR_H}
        px={2.5}
        cursor="pointer"
        bg={activa ? bgOn : bgOff}
        borderRight="1px solid"
        borderColor={border}
        borderTop="2px solid"
        borderTopColor={activa ? FY : "transparent"}
        _hover={{ bg: activa ? bgOn : hoverBg }}
        transition="background 0.12s"
      >
        <Box flex="0 0 auto" w="6px" h="6px" rounded="full" bg={dot} />
        <Box minW={0} flex={1}>
          <Text fontSize="11px" fontWeight={activa ? "800" : "600"} noOfLines={1} lineHeight="1.15">
            {label}
          </Text>
          {sub && <Text fontSize="9px" color={muted} noOfLines={1} lineHeight="1.15">{sub}</Text>}
        </Box>
        <CloseButton
          size="sm" flex="0 0 auto" boxSize="16px" minW="16px" fontSize="7px" color={muted}
          _hover={{ bg: "red.100", color: "red.600" }}
          onClick={(e) => { e.stopPropagation(); onClose(id); }}
          aria-label={`Cerrar ${label}`}
        />
      </Flex>
    </Tooltip>
  );
});

/* ═══════════════════════════════════════════════════════════ */
export default function TabsBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    tabs, getCotizacion, closeTab, closeOtherTabs, closeAllTabs, flushAutoSave, openTab,
  } = useCotizaciones();

  const [navegando, setNavegando] = useState(false);
  const scrollRef = useRef(null);

  const bg     = useColorModeValue("gray.100", "gray.900");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted  = useColorModeValue("gray.500", "gray.400");

  /* ¿Cuál está activa? — se deduce de la URL */
  const m = /^\/cotizador\/([^/]+)/.exec(location.pathname);
  const activeId = m ? m[1]
    : location.pathname === "/cotizador" ? NEW_TAB_ID
    : null;

  const rutaDe = (id) => (id === NEW_TAB_ID ? "/cotizador" : `/cotizador/${id}`);

  /* Cambiar de pestaña autoguardando lo que haya sin guardar */
  const irA = useCallback(async (id) => {
    if (id === activeId) return;
    setNavegando(true);
    try {
      if (activeId) await flushAutoSave();   // solo hay algo que guardar si venimos del editor
      navigate(id === NEW_TAB_ID ? "/cotizador" : `/cotizador/${id}`);
    } finally {
      setNavegando(false);
    }
  }, [activeId, flushAutoSave, navigate]);

  const cerrar = useCallback(async (id) => {
    const eraActiva = id === activeId;
    if (eraActiva) await flushAutoSave();
    const siguiente = closeTab(id);
    if (!eraActiva) return;                              // cerró una inactiva: no navegar
    navigate(siguiente ? rutaDe(siguiente) : "/historial");
  }, [activeId, closeTab, flushAutoSave, navigate]);

  const cerrarOtras = useCallback(() => {
    if (!activeId) return;
    closeOtherTabs(activeId);
  }, [closeOtherTabs, activeId]);

  const cerrarTodas = useCallback(async () => {
    if (activeId) await flushAutoSave();
    closeAllTabs();
    navigate("/historial");
  }, [activeId, flushAutoSave, closeAllTabs, navigate]);

  /* Atajos Alt+1 … Alt+9 */
  useEffect(() => {
    const h = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = parseInt(e.key, 10);
      if (!n || n < 1 || n > 9) return;
      const destino = tabs[n - 1];
      if (!destino) return;
      e.preventDefault();
      irA(destino);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tabs, irA]);

  /* Mantener visible la pestaña activa al cambiar de cotización */
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, tabs.length]);

  if (!tabs.length) return null;

  return (
    <Box bg={bg} borderBottom="1px solid" borderColor={border}
      position="sticky" top={0} zIndex={200}
      opacity={navegando ? 0.6 : 1} transition="opacity 0.1s">
      <Flex maxW="1600px" mx="auto" align="center">
        <Box ref={scrollRef} role="tablist" flex={1} minW={0} display="flex" overflowX="auto"
          sx={{
            "&::-webkit-scrollbar": { h: "3px" },
            "&::-webkit-scrollbar-thumb": { bg: "gray.300", borderRadius: "2px" },
            scrollbarWidth: "thin",
          }}>
          {tabs.map((id) => {
            const esNueva = id === NEW_TAB_ID;
            const cot     = esNueva ? null : getCotizacion(id);
            return (
              <Tab
                key={id}
                id={id}
                label={esNueva ? "Nueva" : (cot?.numero || cot?.config?.numero || "Sin número")}
                sub={esNueva ? "sin guardar" : (cot?.cliente?.nombre || "")}
                esNueva={esNueva}
                esObra={(cot?.config?.tipo || "comercial") === "obra"}
                activa={id === activeId}
                onSelect={irA}
                onClose={cerrar}
              />
            );
          })}
        </Box>

        <HStack flex="0 0 auto" px={2} spacing={1}>
          {!tabs.includes(NEW_TAB_ID) && (
            <Tooltip label="Cotización nueva en otra pestaña" hasArrow>
              <IconButton size="xs" variant="ghost" rounded="md" color={muted}
                aria-label="Nueva pestaña" icon={<FiPlus size={13} />}
                _hover={{ color: FY }}
                onClick={() => { openTab(NEW_TAB_ID); irA(NEW_TAB_ID); }} />
            </Tooltip>
          )}
          <Tooltip label="Ir al historial" hasArrow>
            <IconButton size="xs" variant="ghost" rounded="md"
              color={location.pathname === "/historial" ? FY : muted}
              aria-label="Historial" icon={<FiFileText size={13} />}
              onClick={() => navigate("/historial")} />
          </Tooltip>
          <Menu isLazy placement="bottom-end">
            <MenuButton as={IconButton} size="xs" variant="ghost" rounded="md" color={muted}
              aria-label="Opciones de pestañas" icon={<FiMoreVertical size={13} />} />
            <MenuList fontSize="12px" minW="190px" zIndex={400}>
              <MenuItem isDisabled={!activeId || tabs.length < 2} onClick={cerrarOtras}>
                Cerrar las demás
              </MenuItem>
              <MenuDivider />
              <MenuItem color="red.500" onClick={cerrarTodas}>Cerrar todas</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
}
