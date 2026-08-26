/**
 * HistorialPage.jsx  v4
 * FIXES:
 *   ✓ PDF del historial usa loadEmpresaLocal() como fallback si falta empresa en el objeto
 *   ✓ Cambio de estado inline desde la tabla y tarjetas
 *   ✓ Logo fallback logo.jpg
 *   ✓ Título de página dinámico
 * v4 — rendimiento y comodidad:
 *   ✓ Paginación (5 por defecto · 10 · 20 · 50 · todas) en tabla y tarjetas
 *   ✓ Índice de búsqueda incremental — solo recalcula lo que cambió
 *   ✓ Fila y tarjeta memoizadas — editar una no repinta la lista entera
 *   ✓ Convertir Comercial ⇄ Obra desde el menú de cada cotización
 */
import { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Stack, Text, Icon, Badge, Tag,
  Button, IconButton, Input, InputGroup, InputLeftElement,
  Select, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tooltip, SimpleGrid, useColorModeValue,
  useToast, useDisclosure,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Card, CardBody, Menu, MenuButton, MenuList, MenuItem, MenuDivider,
} from "@chakra-ui/react";
import {
  FiPlus, FiTrash2, FiEdit2, FiCopy, FiDownload, FiSearch,
  FiFileText, FiRefreshCw, FiCheckCircle,
  FiSend, FiGrid, FiList, FiMoreVertical,
  FiDollarSign, FiUser, FiCloud, FiTool, FiShoppingCart,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useCotizaciones, NEW_TAB_ID } from "../hooks/useCotizaciones";
import { usePDF }           from "../hooks/usePDF";
import DocContent          from "../components/DocContent";
import { PAGE_W }          from "../lib/hojas";
import Paginacion, { TODAS } from "../components/Paginacion";
import { useListaProgresiva } from "../hooks/useListaProgresiva";
import { TABS_BAR_H }        from "../components/TabsBar";
import ModalConvertirTipo    from "../components/ModalConvertirTipo";
import { money, fmtDateShort, calcTotals, calcTotalsObra, ESTADO_META, ESTADOS, loadEmpresaLocal, DEFAULT_AIU, AVISO_LATERAL } from "../utils";

/* ─── Preferencias de vista (se recuerdan entre sesiones) ─── */
const PREFS_KEY = "ferreexpress_historial_prefs";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; }
  catch { return {}; }
};
const savePrefs = (p) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* noop */ }
};

/** Umbral de fecha a partir de la etiqueta del filtro (0 = sin límite) */
const desdeDe = (v) => {
  if (v === "hoy") { const s = new Date(); s.setHours(0, 0, 0, 0); return s.getTime(); }
  if (v === "7")   return Date.now() - 7  * 86400000;
  if (v === "30")  return Date.now() - 30 * 86400000;
  if (v === "mes") { const s = new Date(); s.setDate(1); s.setHours(0, 0, 0, 0); return s.getTime(); }
  return 0;
};

const FY   = "#F9BF20";
const DARK = "#3A3A38";
const RED  = "#E21219";

const MotionBox = motion(Box);

/* ─── Helpers ─── */
const fmtRelativa = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7)  return `Hace ${dias} días`;
  return fmtDateShort(iso.slice(0, 10));
};

const getTotal   = (cot) => cot.totals?.totalPagar ?? cot.totals?.total ?? 0;
const getNumero  = (cot) => cot.numero || cot.config?.numero || "—";
const getEstado  = (cot) => cot.config?.estado || cot.estado || "borrador";
const getTipo    = (cot) => cot.config?.tipo || "comercial";
const normStr    = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function TipoBadge({ cot, ...rest }) {
  const esObra = getTipo(cot) === "obra";
  return (
    <Badge bg={esObra ? "blue.100" : "green.100"} color={esObra ? "blue.700" : "green.700"}
      fontSize="8px" rounded="full" px={1.5} {...rest}>
      {esObra ? "OBRA" : "COMERCIAL"}
    </Badge>
  );
}

function GlassCard({ children, ...rest }) {
  const bg = useColorModeValue("white", "gray.800");
  const bc = useColorModeValue("gray.200", "whiteAlpha.200");
  return (
    <Box bg={bg} border="1px solid" borderColor={bc}
      boxShadow="0 2px 12px rgba(0,0,0,0.06)" {...rest}>
      {children}
    </Box>
  );
}

function KpiCard({ label, value, sub, icon, accent, onClick, active }) {
  const muted = useColorModeValue("gray.500", "gray.400");
  const bc    = useColorModeValue("gray.100", "whiteAlpha.200");
  return (
    <GlassCard rounded="xl" p={5}
      onClick={onClick}
      cursor={onClick ? "pointer" : "default"}
      boxShadow={active ? `0 0 0 2px ${FY}` : "0 2px 12px rgba(0,0,0,0.06)"}
      _hover={onClick ? { boxShadow: active ? `0 0 0 2px ${FY}` : "0 4px 20px rgba(0,0,0,0.10)", transform: "translateY(-1px)" } : undefined}
      transition="all 0.15s"
      title={onClick ? "Clic para filtrar" : undefined}>
      <Flex justify="space-between" align="flex-start">
        <Box>
          <Text fontSize="9px" fontWeight="700" letterSpacing="0.12em"
            textTransform="uppercase" color={muted} mb={1}>{label}</Text>
          <Text fontSize="2xl" fontWeight="900" lineHeight="1">{value}</Text>
          {sub && <Text fontSize="10px" color={muted} mt={1}>{sub}</Text>}
        </Box>
        <Box bg={bc} rounded="xl" p={2.5}>
          <Icon as={icon} color={accent} boxSize={5} />
        </Box>
      </Flex>
    </GlassCard>
  );
}

/* ─── Selector de estado inline ─── */
function EstadoSelect({ cot, onCambiar }) {
  const estado = getEstado(cot);
  const meta   = ESTADO_META[estado] || ESTADO_META.borrador;

  const colorMap = {
    borrador:  "gray",
    enviada:   "blue",
    aceptada:  "green",
    rechazada: "red",
  };

  return (
    /* isLazy: el menú de estados no se construye hasta que se abre.
       Con 300 cotizaciones en pantalla, construirlos todos costaba más
       que dibujar la lista entera. */
    <Menu isLazy>
      <MenuButton as={Button} size="xs" variant="ghost" px={1} title="Cambiar estado"
        onClick={(e) => e.stopPropagation()}>
        <Badge colorScheme={meta.color} rounded="full" variant="subtle" fontSize="9px" cursor="pointer">
          {meta.label} ▾
        </Badge>
      </MenuButton>
      <MenuList fontSize="12px" minW="140px" onClick={(e) => e.stopPropagation()} zIndex={300}>
        {ESTADOS.map((e) => {
          const m = ESTADO_META[e];
          return (
            <MenuItem key={e} onClick={() => onCambiar(cot.id, e)}
              fontWeight={e === estado ? "700" : "400"}
              color={e === estado ? `${colorMap[e]}.500` : undefined}>
              <Badge colorScheme={m.color} variant="subtle" rounded="full" fontSize="9px" mr={2}>
                {m.label}
              </Badge>
              {e === estado && "✓"}
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
}

/* ─── Menú de acciones (compartido por tabla y tarjetas) ─── */
function AccionesMenu({ cot, onEdit, onDuplicate, onDelete, onPDF, onConvertir, pdfDisabled }) {
  const esObra = getTipo(cot) === "obra";
  return (
    <MenuList fontSize="13px" onClick={(e) => e.stopPropagation()}>
      <MenuItem icon={<FiEdit2 size={13} />} onClick={() => onEdit(cot.id)}>Editar</MenuItem>
      <MenuItem icon={<FiCopy size={13} />}  onClick={() => onDuplicate(cot.id)}>Duplicar</MenuItem>
      <MenuItem icon={<FiDownload size={13} />} onClick={() => onPDF(cot)} isDisabled={pdfDisabled}>
        Descargar PDF
      </MenuItem>
      <MenuDivider />
      <MenuItem icon={esObra ? <FiShoppingCart size={13} /> : <FiTool size={13} />}
        onClick={() => onConvertir(cot)}>
        Convertir a {esObra ? "Comercial" : "Obra"}
      </MenuItem>
      <MenuDivider />
      <MenuItem icon={<FiTrash2 size={13} />} color="red.500" onClick={() => onDelete(cot)}>
        Eliminar
      </MenuItem>
    </MenuList>
  );
}

/* ─── Tarjeta de cotización ───
   Memoizada: cambiar el estado de una no repinta toda la rejilla. */
const CotizacionCard = memo(function CotizacionCard({
  cot, onEdit, onDuplicate, onDelete, onPDF, pdfLoading, pdfCotId, onCambiarEstado,
  onConvertir, onVerCliente,
}) {
  const navigate = useNavigate();
  const estado   = getEstado(cot);
  const border   = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted    = useColorModeValue("gray.500", "gray.400");
  const totalCol = useColorModeValue("gray.800", "white");
  const nItems   = cot.items?.filter((i) => i.desc || i.price).length || 0;

  return (
    <GlassCard rounded="xl" overflow="hidden" cursor="pointer"
      onClick={() => navigate(`/cotizador/${cot.id}`)}
      _hover={{ boxShadow: "0 4px 20px rgba(0,0,0,0.10)", transform: "translateY(-1px)" }}
      transition="all 0.15s">
      <Box h="3px" bg={
        estado === "aceptada"  ? "green.400" :
        estado === "enviada"   ? "blue.400"  :
        estado === "rechazada" ? "red.400"   : "gray.300"
      } />
      <Box p={4}>
        <Flex justify="space-between" align="flex-start" mb={3}>
          <Box>
            <HStack spacing={1.5} align="center">
              <Text fontWeight="800" fontSize="18px" color={FY} lineHeight="1">{getNumero(cot)}</Text>
              <TipoBadge cot={cot} />
            </HStack>
            <Text fontSize="10px" color={muted} mt={0.5}>{fmtRelativa(cot.updatedAt)}</Text>
          </Box>
          <Flex align="center" gap={1}>
            <EstadoSelect cot={cot} onCambiar={onCambiarEstado} />
            <Menu isLazy>
              <MenuButton as={IconButton} size="xs" variant="ghost" rounded="md"
                aria-label="Opciones" icon={<FiMoreVertical size={14} />}
                onClick={(e) => e.stopPropagation()} />
              <AccionesMenu cot={cot} onEdit={onEdit} onDuplicate={onDuplicate}
                onDelete={onDelete} onPDF={onPDF} onConvertir={onConvertir}
                pdfDisabled={pdfLoading && pdfCotId === cot.id} />
            </Menu>
          </Flex>
        </Flex>

        <HStack mb={1} onClick={(e) => e.stopPropagation()}>
          <Icon as={FiUser} boxSize={3.5} color={muted} />
          {cot.cliente?.nombre ? (
            <Text fontSize="13px" fontWeight="600" noOfLines={1} cursor="pointer"
              _hover={{ color: "#B8860B", textDecoration: "underline" }}
              onClick={() => onVerCliente(cot.cliente.nombre)}>
              {cot.cliente.nombre}
            </Text>
          ) : (
            <Text fontSize="13px" color={muted} fontStyle="italic">Sin cliente</Text>
          )}
        </HStack>
        {cot.cliente?.empresa && (
          <Text fontSize="11px" color={muted} noOfLines={1} ml={5}>{cot.cliente.empresa}</Text>
        )}

        <Flex justify="space-between" align="center" mt={3} pt={3}
          borderTop="1px solid" borderColor={border}>
          <Text fontSize="10px" color={muted}>
            {nItems} ítem{nItems !== 1 ? "s" : ""}
          </Text>
          <Text fontWeight="800" fontSize="15px" color={totalCol}>
            {money(getTotal(cot), cot.config?.moneda || "COP")}
          </Text>
        </Flex>
      </Box>
    </GlassCard>
  );
});

/* ─── Fila de la tabla ───
   Memoizada por el mismo motivo: con 50 filas en pantalla, cambiar el
   estado de una sola dejaba de repintar las otras 49. */
const FilaCotizacion = memo(function FilaCotizacion({
  cot, par, onEdit, onDuplicate, onDelete, onPDF, onCambiarEstado, onConvertir, onVerCliente,
  pdfLoading, pdfCotId, tableBg, stripeBg, hoverBg, border, muted, mutedL,
}) {
  const navigate = useNavigate();
  return (
    <Tr bg={par ? tableBg : stripeBg}
      _hover={{ bg: hoverBg, cursor: "pointer" }}
      /* Las filas fuera de la pantalla no se maquetan */
      sx={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      onClick={() => navigate(`/cotizador/${cot.id}`)}>
      <Td borderColor={border} fontWeight="700" fontSize="13px">
        <Text title={`Actualizado: ${fmtDateShort(cot.updatedAt?.slice(0, 10))}`}>{getNumero(cot)}</Text>
        <TipoBadge cot={cot} mt={1} />
      </Td>
      <Td borderColor={border} onClick={(e) => e.stopPropagation()}>
        {cot.cliente?.nombre ? (
          /* Al cliente se llega desde su nombre: es donde uno lo busca */
          <Text fontSize="13px" fontWeight="600" noOfLines={1} cursor="pointer"
            title={`Ver todo de ${cot.cliente.nombre}`}
            _hover={{ color: "#B8860B", textDecoration: "underline" }}
            onClick={() => onVerCliente(cot.cliente.nombre)}>
            {cot.cliente.nombre}
          </Text>
        ) : (
          <Text fontSize="13px" color={mutedL} fontStyle="italic">Sin cliente</Text>
        )}
        {cot.cliente?.empresa && (
          <Text fontSize="10px" color={muted} noOfLines={1}>{cot.cliente.empresa}</Text>
        )}
      </Td>
      <Td borderColor={border} fontSize="12px" color={muted}>
        <Text title={fmtDateShort(cot.updatedAt?.slice(0, 10))}>{fmtRelativa(cot.updatedAt)}</Text>
      </Td>
      {/* Estado editable inline */}
      <Td data-tour="estado" borderColor={border} onClick={(e) => e.stopPropagation()}>
        <EstadoSelect cot={cot} onCambiar={onCambiarEstado} />
      </Td>
      <Td borderColor={border} isNumeric>
        <Text fontWeight="800" fontSize="14px" fontVariantNumeric="tabular-nums">
          {money(getTotal(cot), cot.config?.moneda || "COP")}
        </Text>
      </Td>
      <Td data-tour="acciones" borderColor={border} onClick={(e) => e.stopPropagation()}>
        <HStack spacing={1}>
          <IconButton size="xs" variant="ghost" rounded="md" aria-label="Editar" title="Editar"
            icon={<FiEdit2 size={13} />} onClick={() => navigate(`/cotizador/${cot.id}`)} />
          <IconButton size="xs" variant="ghost" rounded="md" aria-label="PDF" title="Descargar PDF"
            icon={<FiDownload size={13} />}
            isLoading={pdfLoading && pdfCotId === cot.id}
            onClick={() => onPDF(cot)} />
          <Menu isLazy>
            <MenuButton as={IconButton} size="xs" variant="ghost" rounded="md"
              aria-label="Más opciones" icon={<FiMoreVertical size={13} />} />
            <AccionesMenu cot={cot} onEdit={onEdit} onDuplicate={onDuplicate}
              onDelete={onDelete} onPDF={onPDF} onConvertir={onConvertir}
              pdfDisabled={pdfLoading && pdfCotId === cot.id} />
          </Menu>
        </HStack>
      </Td>
    </Tr>
  );
});

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function HistorialPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const cancelRef = useRef();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { cotizaciones, deleteCotizacion, duplicarCotizacion, cambiarEstado, stats,
    convertirCotizacion, openTab, tabs, nubeActiva, syncing, sync } = useCotizaciones();

  /* La barra de pestañas va encima: el topbar se apoya debajo cuando hay alguna */
  const topOffset = tabs.length ? TABS_BAR_H : 0;
  const { downloadPDF, loading: pdfLoading } = usePDF("pdf-historial-hidden");

  const [prefs0] = useState(loadPrefs);   // preferencias guardadas, leídas una sola vez

  /* Los filtros viven en la URL: así el botón atrás del navegador devuelve
     el listado tal como estaba. Antes, entrar a una cotización y volver
     borraba la búsqueda y había que filtrar de nuevo desde cero. */
  const [params, setParams] = useSearchParams();
  const [p0] = useState(() => Object.fromEntries(params));   // leídos una sola vez

  const [search,   setSearch]   = useState(p0.q || "");
  const [debSearch, setDebSearch] = useState(p0.q || "");   // búsqueda con debounce
  const [estado,   setEstado]   = useState(p0.estado || "todos");
  const [tipo,     setTipo]     = useState(p0.tipo || "todos"); // comercial / obra
  const [rango,    setRango]    = useState(p0.fecha || "todos"); // fecha (etiqueta)
  const [rangoDesde, setRangoDesde] = useState(() => desdeDe(p0.fecha));  // 0 = sin límite
  const [sortBy,   setSortBy]   = useState(p0.orden?.split(":")[0] || "updatedAt");
  const [sortDir,  setSortDir]  = useState(p0.orden?.split(":")[1] || "desc");
  const [toDelete, setToDelete] = useState(null);
  const [pdfCot,   setPdfCot]   = useState(null);
  const [viewMode, setViewMode] = useState(prefs0.viewMode || "tabla");
  const [toConvert, setToConvert] = useState(null);   // cotización a convertir
  /* Paginación — 5 por defecto para que la vista abra al instante */
  const [pageSize, setPageSize] = useState(
    Number.isFinite(prefs0.pageSize) ? prefs0.pageSize : 5
  );
  const [page,     setPage]     = useState(Number(p0.pag) > 0 ? Number(p0.pag) : 1);
  const searchRef = useRef();
  const listTopRef = useRef(null);

  /* Recordar tamaño de página y tipo de vista */
  useEffect(() => { savePrefs({ pageSize, viewMode }); }, [pageSize, viewMode]);

  /* Reflejar el estado del listado en la URL (reemplazando, para no llenar
     el historial del navegador con una entrada por cada tecla) */
  useEffect(() => {
    const q = {};
    if (debSearch.trim())   q.q = debSearch.trim();
    if (estado !== "todos") q.estado = estado;
    if (tipo   !== "todos") q.tipo = tipo;
    if (rango  !== "todos") q.fecha = rango;
    if (sortBy !== "updatedAt" || sortDir !== "desc") q.orden = `${sortBy}:${sortDir}`;
    if (page > 1) q.pag = String(page);
    setParams(q, { replace: true });
  }, [debSearch, estado, tipo, rango, sortBy, sortDir, page, setParams]);

  /* ─── Título dinámico ─── */
  useEffect(() => {
    document.title = `Historial (${cotizaciones.length}) | FerreExpress`;
    return () => { document.title = "FerreExpress — Cotizador"; };
  }, [cotizaciones.length]);

  /* ─── Debounce de la búsqueda (no recalcula en cada tecla) ─── */
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 180);
    return () => clearTimeout(t);
  }, [search]);

  /* ─── Atajo "/" para enfocar la búsqueda, Esc para limpiar ─── */
  useEffect(() => {
    const h = (e) => {
      const tag = document.activeElement?.tagName;
      const enCampo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !enCampo) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const bg       = useColorModeValue("gray.50", "gray.900");
  const border   = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted    = useColorModeValue("gray.600", "gray.400");
  const mutedL   = useColorModeValue("gray.400", "gray.600");
  const theadBg  = "#3A3A38";
  const tableBg  = useColorModeValue("white", "gray.800");
  const stripeBg = useColorModeValue("gray.50", "gray.750");
  const barBg    = useColorModeValue("white", "gray.900");
  const inputBg  = useColorModeValue("white", "gray.700");
  const hoverBg  = useColorModeValue("yellow.50", "whiteAlpha.50");

  /* \u00cdndice de b\u00fasqueda INCREMENTAL.
     Antes se reconstru\u00eda entero cada vez que cambiaba cualquier cotizaci\u00f3n
     (recorriendo todos los \u00edtems de todas). Ahora se cachea por id+updatedAt:
     al guardar una, solo se recalcula esa. */
  const [cache] = useState(() => new Map());
  const indexed = useMemo(() => {
    const vivos = new Set();
    const out = cotizaciones.map((c) => {
      const key = `${c.id}|${c.updatedAt || ""}`;
      vivos.add(key);
      const hit = cache.get(key);
      if (hit && hit.c === c) return hit;
      const entry = {
        c,
        hay: normStr([
          getNumero(c), c.cliente?.nombre, c.cliente?.empresa, c.cliente?.ciudad,
          c.cliente?.nit, c.cliente?.contacto,
          ...(c.items || []).map((i) => i.desc),
        ].filter(Boolean).join(" ")),
      };
      cache.set(key, entry);
      return entry;
    });
    // Purgar entradas de cotizaciones borradas o ya actualizadas
    cache.forEach((_, k) => { if (!vivos.has(k)) cache.delete(k); });
    return out;
  }, [cotizaciones, cache]);

  const filtered = useMemo(() => {
    const term = normStr(debSearch.trim());
    const list = indexed.filter(({ c, hay }) => {
      if (term && !hay.includes(term)) return false;
      if (estado !== "todos" && getEstado(c) !== estado) return false;
      if (tipo   !== "todos" && getTipo(c)   !== tipo)   return false;
      if (rangoDesde && new Date(c.updatedAt || c.createdAt || 0).getTime() < rangoDesde) return false;
      return true;
    }).map((x) => x.c);

    list.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "numero":  va = getNumero(a); vb = getNumero(b); break;
        case "total":   va = getTotal(a);  vb = getTotal(b);  break;
        case "cliente": va = a.cliente?.nombre || ""; vb = b.cliente?.nombre || ""; break;
        default:        va = a[sortBy] || ""; vb = b[sortBy] || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [indexed, debSearch, estado, tipo, rangoDesde, sortBy, sortDir]);

  /* ─── Paginación ───
     Aquí está la ganancia gorda: se pintan `pageSize` cotizaciones,
     no las N que haya en el historial. */
  const totalPages = pageSize === TODAS ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));

  /* Página efectiva: se acota al vuelo. Si un filtro reduce los resultados
     y la página guardada ya no existe, se muestra la última válida sin
     necesidad de un efecto que corrija el estado después de pintar. */
  const pageSegura = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (pageSize === TODAS) return filtered;
    const ini = (pageSegura - 1) * pageSize;
    return filtered.slice(ini, ini + pageSize);
  }, [filtered, pageSegura, pageSize]);

  /* Pintado progresivo: las primeras filas salen ya, el resto se va
     agregando entre repintados. Sin esto, elegir "Todas" con cientos de
     cotizaciones dejaba la pantalla pegada varios segundos. */
  const { visibles: aPintar, faltan: faltanPorPintar } = useListaProgresiva(paged, {
    primeros: 25, paso: 40,
    /* Se vuelve a empezar por las primeras cuando cambia lo que se está
       mirando: otro filtro, otra búsqueda, otra página. */
    clave: `${debSearch}|${estado}|${tipo}|${rangoDesde}|${sortBy}|${sortDir}|${pageSegura}|${pageSize}|${viewMode}`,
  });

  /* Cifras de LO QUE SE ESTÁ VIENDO.
     Antes estos cuatro recuadros mostraban siempre el total de todo, así que
     al filtrar por "aceptadas" o buscar un cliente los números no cuadraban
     con la lista de abajo y había que sacar la cuenta a mano. */
  const cifras = useMemo(() => {
    let enviadas = 0, aceptadas = 0, valor = 0;
    for (const c of filtered) {
      const e = getEstado(c);
      if (e === "enviada") enviadas++;
      else if (e === "aceptada") aceptadas++;
      valor += getTotal(c);
    }
    return { total: filtered.length, enviadas, aceptadas, valor };
  }, [filtered]);

  const hayFiltro = !!debSearch.trim() || estado !== "todos" || tipo !== "todos" || !!rangoDesde;

  const irAPagina = useCallback((p) => {
    setPage(p);
    listTopRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  /* Cualquier cambio de filtro, orden o tamaño devuelve a la página 1 —
     se hace en el propio manejador, no en un efecto posterior. */
  const cambiarBusqueda = useCallback((v) => { setSearch(v);   setPage(1); }, []);
  const cambiarTipo     = useCallback((v) => { setTipo(v);     setPage(1); }, []);
  const cambiarEstadoF  = useCallback((v) => { setEstado(v);   setPage(1); }, []);
  const cambiarPageSize = useCallback((v) => { setPageSize(v); setPage(1); }, []);

  /* Fecha: calcula el umbral en el manejador (fuera del render puro) */
  const onRango = useCallback((v) => {
    setRango(v);
    setRangoDesde(desdeDe(v));
    setPage(1);
  }, []);

  const filtrosActivos = !!(search || estado !== "todos" || tipo !== "todos" || rango !== "todos");
  const limpiarFiltros = useCallback(() => {
    setSearch(""); setEstado("todos"); setTipo("todos"); setRango("todos"); setRangoDesde(0);
    setPage(1);
  }, []);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  };
  const ordenValue = `${sortBy}:${sortDir}`;
  const onOrden = (v) => { const [b, d] = v.split(":"); setSortBy(b); setSortDir(d); setPage(1); };

  const confirmDelete  = useCallback((cot) => { setToDelete(cot); onOpen(); }, [onOpen]);

  const handleDelete = useCallback(() => {
    if (!toDelete) return;
    deleteCotizacion(toDelete.id);
    toast({ title: "Cotización eliminada", status: "info", duration: 2500, ...AVISO_LATERAL });
    setToDelete(null);
    onClose();
  }, [toDelete, deleteCotizacion, toast, onClose]);

  const handleDuplicate = useCallback(async (id) => {
    const copia = await duplicarCotizacion(id);
    if (!copia) return;
    toast({ title: "Cotización duplicada ✓", status: "success", duration: 2500, ...AVISO_LATERAL });
    navigate(`/cotizador/${copia.id}`);
  }, [duplicarCotizacion, navigate, toast]);

  const handleCambiarEstado = useCallback((id, nuevoEstado) => {
    cambiarEstado(id, nuevoEstado);
    const meta = ESTADO_META[nuevoEstado];
    toast({ title: `Estado: ${meta?.label}`, status: "success", duration: 1800, ...AVISO_LATERAL });
  }, [cambiarEstado, toast]);

  /* Abrir en pestaña */
  const handleEditar = useCallback((id) => { openTab(id); navigate(`/cotizador/${id}`); }, [openTab, navigate]);
  const handleNueva  = useCallback(() => { openTab(NEW_TAB_ID); navigate("/cotizador"); }, [openTab, navigate]);
  /* Navegación normal (no replace): el atrás devuelve el listado con sus filtros */
  const handleVerCliente = useCallback((n) => navigate(`/cliente/${encodeURIComponent(n)}`), [navigate]);

  /* ─── Convertir Comercial ⇄ Obra ─── */

  const handleConvertir = useCallback((cot) => setToConvert(cot), []);

  const confirmarConversion = useCallback((conv) => {
    if (!toConvert) return;
    const destino = conv.config.tipo;
    convertirCotizacion(toConvert.id, destino, conv.aiuConfig);
    toast({
      title: `Convertida a ${destino === "obra" ? "Obra" : "Comercial"} ✓`,
      description: conv.notasPreservadas ? "Tus notas personalizadas se conservaron." : undefined,
      status: "success", duration: 3000, ...AVISO_LATERAL,
    });
    setToConvert(null);
  }, [toConvert, convertirCotizacion, toast]);

  const handlePDF = useCallback(async (cot) => {
    setPdfCot(cot);
    // Esperar dos frames para que React renderice el DocContent oculto
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 80));
    const cn = ((cot.cliente?.nombre || 'Cliente')).replace(/[^a-zA-Z0-9À-ɏ\s]/g,'').trim().replace(/\s+/g,'_');
    const numero = getNumero(cot) || 'SinNumero';
    const ok = await downloadPDF(`${cn}_${numero}`);
    if (ok) toast({ title: "PDF descargado ✓", status: "success", duration: 2500, ...AVISO_LATERAL });
    else    toast({ title: "Error generando PDF", status: "error", duration: 3000 });
    setPdfCot(null);
  }, [downloadPDF, toast]);

  /* Empresa para el PDF: prioriza la guardada en la cotización, fallback a localStorage */
  const empresaParaPDF = useMemo(() => {
    if (!pdfCot) return {};
    return pdfCot.empresa && Object.keys(pdfCot.empresa).length > 0
      ? pdfCot.empresa
      : loadEmpresaLocal();
  }, [pdfCot]);

  return (
    <Box minH="100vh" bg={bg}>
      {/* PDF oculto para descarga */}
      {pdfCot && (
        <Box id="pdf-historial-hidden" position="fixed" top="-9999px" left="-9999px"
          zIndex={-1} w={`${PAGE_W}px`} bg="white">
          <DocContent
            empresa={empresaParaPDF}
            cot={pdfCot.config || {}}
            cli={pdfCot.cliente || {}}
            items={pdfCot.items || []}
            descG={pdfCot.descG || 0}
            totals={pdfCot.totals || (pdfCot.config?.tipo === 'obra' ? calcTotalsObra(pdfCot.items || [], pdfCot.descG || 0, pdfCot.aiuConfig || DEFAULT_AIU) : calcTotals(pdfCot.items || [], pdfCot.descG || 0, pdfCot.config?.iva || 19))}
            notas={pdfCot.notas || ""}
            observaciones={pdfCot.observaciones || ""}
            aiu={pdfCot.aiuConfig || DEFAULT_AIU}
          />
        </Box>
      )}

      {/* Modal de conversión Comercial ⇄ Obra */}
      {toConvert && (
        <ModalConvertirTipo
          isOpen
          onClose={() => setToConvert(null)}
          onConfirm={confirmarConversion}
          cotConfig={toConvert.config || {}}
          aiuConfig={toConvert.aiuConfig}
          notas={toConvert.notas}
          items={toConvert.items || []}
          descG={toConvert.descG || 0}
        />
      )}

      {/* TOPBAR — se apoya bajo la barra de pestañas cuando hay alguna abierta */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}
          h={{ base: "auto", md: "54px" }} py={{ base: 2, md: 0 }}
          align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <HStack spacing={2}>
            <Box bg={FY} rounded="md" px={2} py="3px">
              <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.4">FE</Text>
            </Box>
            <Text fontWeight="800" fontSize={{ base: "13px", md: "15px" }}>Cotizaciones</Text>
            <Tag size="sm" colorScheme="gray" rounded="full">{cotizaciones.length}</Tag>
            {nubeActiva && (
              <Tooltip label={syncing ? "Sincronizando con la nube…" : "Sincronizado en la nube · clic para actualizar"} hasArrow>
                <Tag size="sm" colorScheme={syncing ? "yellow" : "green"} rounded="full" cursor="pointer"
                  onClick={() => sync()} display={{ base: "none", sm: "flex" }}>
                  <Icon as={FiCloud} boxSize={3} mr={1} />
                  {syncing ? "Sincronizando" : "Nube"}
                </Tag>
              </Tooltip>
            )}
          </HStack>
          <HStack>
            <Tooltip label={viewMode === "tabla" ? "Vista tarjetas" : "Vista tabla"} hasArrow>
              <IconButton size="sm" variant="outline" rounded="md"
                icon={viewMode === "tabla" ? <FiGrid /> : <FiList />}
                aria-label="Cambiar vista"
                onClick={() => setViewMode((v) => v === "tabla" ? "tarjetas" : "tabla")} />
            </Tooltip>
            <Button data-tour="nueva" size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700"
              leftIcon={<FiPlus />} onClick={handleNueva}
              _hover={{ bg: "#e0b010" }}>
              Nueva cotización
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} py={6}>

        {/* KPIs — clic para filtrar por estado */}
        <SimpleGrid data-tour="kpis" columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <KpiCard label={hayFiltro ? "En pantalla" : "Total"} value={cifras.total} icon={FiFileText} accent={mutedL}
            sub={hayFiltro ? `de ${cotizaciones.length} en total` : undefined}
            onClick={() => cambiarEstadoF("todos")} active={estado === "todos"} />
          <KpiCard label="Enviadas" value={cifras.enviadas} icon={FiSend} accent="blue.400"
            onClick={() => cambiarEstadoF("enviada")} active={estado === "enviada"} />
          <KpiCard label="Aceptadas" value={cifras.aceptadas} icon={FiCheckCircle} accent="green.400"
            onClick={() => cambiarEstadoF("aceptada")} active={estado === "aceptada"} />
          <KpiCard label={hayFiltro ? "Valor de lo filtrado" : "Valor total"} value={money(cifras.valor)}
            icon={FiDollarSign} accent={FY}
            sub={`${cifras.total} ${cifras.total === 1 ? "cotización" : "cotizaciones"}`} />
        </SimpleGrid>

        {/* Filtros */}
        <GlassCard rounded="xl" px={{ base: 3, md: 5 }} py={4} mb={5}>
          <Flex gap={2.5} align="center" flexWrap="wrap">
            <InputGroup size="sm" flex={1} minW="200px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color={mutedL} boxSize={4} />
              </InputLeftElement>
              <Input data-tour="buscador" ref={searchRef} rounded="md" bg={inputBg} focusBorderColor={FY}
                placeholder="Buscar por número, cliente, producto…  ( / )"
                value={search}
                onChange={(e) => cambiarBusqueda(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { cambiarBusqueda(""); e.currentTarget.blur(); } }} />
          </InputGroup>
            <Select size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
              w={{ base: "48%", sm: "125px" }} value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
              <option value="todos">Todo tipo</option>
              <option value="comercial">Comercial</option>
              <option value="obra">Obra</option>
            </Select>
            <Select size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
              w={{ base: "48%", sm: "150px" }} value={estado} onChange={(e) => cambiarEstadoF(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
            </Select>
            <Select size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
              w={{ base: "48%", sm: "150px" }} value={rango} onChange={(e) => onRango(e.target.value)}>
              <option value="todos">Cualquier fecha</option>
              <option value="hoy">Hoy</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="mes">Este mes</option>
            </Select>
            <Select size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
              w={{ base: "48%", sm: "160px" }} value={ordenValue} onChange={(e) => onOrden(e.target.value)}>
              <option value="updatedAt:desc">Más recientes</option>
              <option value="updatedAt:asc">Más antiguas</option>
              <option value="total:desc">Mayor valor</option>
              <option value="total:asc">Menor valor</option>
              <option value="numero:desc">N.º (mayor)</option>
              <option value="cliente:asc">Cliente A→Z</option>
            </Select>
            {filtrosActivos && (
              <Button size="sm" variant="ghost" rounded="md" leftIcon={<FiRefreshCw size={12} />}
                onClick={limpiarFiltros}>
                Limpiar
              </Button>
            )}
            <Text fontSize="11px" color={mutedL} ml="auto" whiteSpace="nowrap">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </Text>
          </Flex>
        </GlassCard>

        {/* ─── VISTA TARJETAS ─── */}
        {viewMode === "tarjetas" && (
          filtered.length === 0
            ? <EmptyState cotizaciones={cotizaciones} navigate={navigate} />
            : (
              <Box ref={listTopRef}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {aPintar.map((cot) => (
                    <MotionBox key={cot.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}>
                      <CotizacionCard
                        cot={cot}
                        onEdit={handleEditar}
                        onDuplicate={handleDuplicate}
                        onDelete={confirmDelete}
                        onPDF={handlePDF}
                        pdfLoading={pdfLoading}
                        pdfCotId={pdfCot?.id}
                        onCambiarEstado={handleCambiarEstado}
                        onConvertir={handleConvertir}
                        onVerCliente={handleVerCliente}
                      />
                    </MotionBox>
                  ))}
                </SimpleGrid>
                <GlassCard rounded="xl" mt={4}>
                  <Paginacion page={pageSegura} pageSize={pageSize} total={filtered.length}
                    onPage={irAPagina} onPageSize={cambiarPageSize} />
                </GlassCard>
              </Box>
            )
        )}

        {/* ─── VISTA TABLA ─── */}
        {viewMode === "tabla" && (
          <GlassCard rounded="xl" overflow="hidden">
            <Box ref={listTopRef} />
            {filtered.length === 0
              ? <EmptyState cotizaciones={cotizaciones} navigate={navigate} />
              : (
                <>
                <TableContainer overflowX="auto"
                  sx={{ "&::-webkit-scrollbar": { h: "4px" }, "&::-webkit-scrollbar-thumb": { bg: "gray.200", borderRadius: "2px" } }}>
                  <Table size="sm" variant="simple">
                    <Thead position="sticky" top={0} zIndex={1}>
                      <Tr bg={theadBg}>
                        <Th color={FY} borderColor="transparent" fontSize="9px" letterSpacing="wider"
                          cursor="pointer" w="110px" onClick={() => toggleSort("numero")}>
                          <HStack spacing={1}>
                            <Text>N°</Text>
                            {sortBy === "numero" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={FY} borderColor="transparent" fontSize="9px" letterSpacing="wider"
                          cursor="pointer" onClick={() => toggleSort("cliente")}>
                          <HStack spacing={1}>
                            <Text>Cliente</Text>
                            {sortBy === "cliente" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={FY} borderColor="transparent" fontSize="9px" letterSpacing="wider" w="110px"
                          cursor="pointer" onClick={() => toggleSort("updatedAt")}>
                          <HStack spacing={1}>
                            <Text>Fecha</Text>
                            {sortBy === "updatedAt" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={FY} borderColor="transparent" fontSize="9px" letterSpacing="wider" w="130px">
                          Estado
                        </Th>
                        <Th color={FY} borderColor="transparent" fontSize="9px" letterSpacing="wider" isNumeric
                          cursor="pointer" w="140px" onClick={() => toggleSort("total")}>
                          <HStack spacing={1} justify="flex-end">
                            <Text>Total</Text>
                            {sortBy === "total" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={FY} borderColor="transparent" w="120px">Acciones</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {aPintar.map((cot, i) => (
                        <FilaCotizacion
                          key={cot.id}
                          cot={cot}
                          par={i % 2 === 0}
                          onEdit={handleEditar}
                          onDuplicate={handleDuplicate}
                          onDelete={confirmDelete}
                          onPDF={handlePDF}
                          onCambiarEstado={handleCambiarEstado}
                          onConvertir={handleConvertir}
                          onVerCliente={handleVerCliente}
                          pdfLoading={pdfLoading}
                          pdfCotId={pdfCot?.id}
                          tableBg={tableBg}
                          stripeBg={stripeBg}
                          hoverBg={hoverBg}
                          border={border}
                          muted={muted}
                          mutedL={mutedL}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                {faltanPorPintar > 0 && (
                  <Flex align="center" justify="center" gap={2} py={3} borderTop="1px solid" borderColor={border}>
                    <Box w="12px" h="12px" rounded="full" border="2px solid" borderColor={FY}
                      borderTopColor="transparent" animation="girar 0.7s linear infinite"
                      sx={{ "@keyframes girar": { to: { transform: "rotate(360deg)" } } }} />
                    <Text fontSize="11px" color={mutedL}>
                      Mostrando las primeras · faltan {faltanPorPintar} por pintar
                    </Text>
                  </Flex>
                )}
                <Paginacion page={pageSegura} pageSize={pageSize} total={filtered.length}
                  onPage={irAPagina} onPageSize={cambiarPageSize} />
                </>
              )}
          </GlassCard>
        )}
      </Box>

      {/* ─── Dialogo: eliminar ─── */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl">
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              {toDelete && (
                <Text>
                  Vas a eliminar <strong>{getNumero(toDelete)}</strong>
                  {toDelete.cliente?.nombre ? ` de ${toDelete.cliente.nombre}` : ""}. Esta acción no se puede deshacer.
                </Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} rounded="md">Cancelar</Button>
              <Button bg={RED} color="white" ml={3} rounded="md" onClick={handleDelete}>Eliminar</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

function EmptyState({ cotizaciones, navigate }) {
  const muted = useColorModeValue("gray.500", "gray.400");
  return (
    <Flex direction="column" align="center" justify="center" py={20} gap={4}>
      <Icon as={FiFileText} boxSize={12} color={muted} />
      <Text fontWeight="800" fontSize="lg">
        {cotizaciones.length === 0 ? "Aún no hay cotizaciones" : "Sin resultados"}
      </Text>
      <Text fontSize="sm" color={muted} textAlign="center">
        {cotizaciones.length === 0
          ? "Crea tu primera cotización para comenzar."
          : "Prueba cambiando los filtros de búsqueda."}
      </Text>
      {cotizaciones.length === 0 && (
        <Button bg="#F9BF20" color="#3A3A38" rounded="md" fontWeight="700"
          leftIcon={<FiPlus />} onClick={() => navigate("/cotizador")}
          _hover={{ bg: "#e0b010" }}>
          Nueva cotización
        </Button>
      )}
    </Flex>
  );
}
