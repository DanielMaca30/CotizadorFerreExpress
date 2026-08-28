/**
 * ClientesPage.jsx — el directorio de clientes
 * ─────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE: la ficha de un cliente (/cliente/:nombre) ya existía,
 * pero solo se llegaba a ella tocando su nombre dentro de una
 * cotización. O sea: para ver a un cliente había que acordarse de en
 * cuál cotización estaba. Eso es pedirle memoria a quien atiende —
 * justo lo contrario de la heurística #6 de Nielsen, «reconocer en vez
 * de recordar». Aquí están todos, se buscan por nombre, y desde cada
 * uno se le empieza una cotización nueva de una vez.
 *
 * No hay base de datos de clientes aparte: la lista se arma con lo que
 * ya está cotizado. Eso tiene una ventaja que no es menor — nunca queda
 * desactualizada ni hay que mantener dos sitios con lo mismo.
 */
import { useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Text, Icon, Input, InputGroup,
  InputLeftElement, IconButton, Button, Tag, Select,
  SimpleGrid, useColorModeValue,
} from "@chakra-ui/react";
import {
  FiSearch, FiUsers, FiPhone, FiFilePlus, FiChevronRight, FiX,
} from "react-icons/fi";
import { useCotizaciones, NEW_TAB_ID } from "../hooks/useCotizaciones";
import { TABS_BAR_H } from "../components/TabsBar";
import AppLogo from "../components/AppLogo";
import { NAV_MOVIL_H, useOffsetSuperior } from "../components/NavegacionPrincipal";
import { useListaProgresiva } from "../hooks/useListaProgresiva";
import { money, fmtDateShort } from "../utils";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const norm = (s) => String(s ?? "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");
const getTotal  = (c) => c.totals?.totalPagar ?? c.totals?.total ?? 0;
const getEstado = (c) => c.config?.estado || c.estado || "borrador";

/* ─── Una tarjeta de cliente ───
   Memoizada: escribir en el buscador no repinta los 80 clientes. */
const TarjetaCliente = memo(function TarjetaCliente({ c, onAbrir, onNueva }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted  = useColorModeValue("gray.500", "gray.400");
  const tel    = (c.tel || "").replace(/[^\d+]/g, "");

  return (
    <Box bg={cardBg} border="1px solid" borderColor={border} rounded="xl"
      overflow="hidden" boxShadow="0 2px 12px rgba(0,0,0,0.06)"
      transition="all .15s"
      _hover={{ boxShadow: "0 4px 20px rgba(0,0,0,0.10)", transform: "translateY(-1px)" }}>
      <Flex as="button" type="button" w="100%" textAlign="left" px={3.5} py={3}
        align="center" gap={3} onClick={() => onAbrir(c.nombre)}
        aria-label={`Ver todo lo de ${c.nombre}`}>
        <Flex flexShrink={0} w="38px" h="38px" rounded="full" bg={FY}
          align="center" justify="center">
          <Text fontWeight="900" fontSize="15px" color={DARK}>
            {c.nombre.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </Flex>
        <Box flex="1" minW={0}>
          <Text fontWeight="700" fontSize="15px" noOfLines={1}>{c.nombre}</Text>
          <Text fontSize="11px" color={muted} noOfLines={1}>
            {c.n} {c.n === 1 ? "cotización" : "cotizaciones"}
            {c.aceptadas > 0 && ` · ${c.aceptadas} aceptada${c.aceptadas !== 1 ? "s" : ""}`}
            {c.ultima && ` · última ${fmtDateShort(c.ultima)}`}
          </Text>
        </Box>
        <Box textAlign="right" flexShrink={0}>
          <Text fontWeight="800" fontSize="14px" whiteSpace="nowrap">{money(c.total)}</Text>
          <Text fontSize="9px" color={muted}>cotizado</Text>
        </Box>
        <Icon as={FiChevronRight} color={muted} boxSize={4} flexShrink={0} />
      </Flex>

      <Flex borderTop="1px solid" borderColor={border} align="stretch">
        {tel && (
          <IconButton as="a" href={`tel:${tel}`} h="42px" flex="1" minW="44px"
            variant="ghost" rounded="none" colorScheme="gray" color="green.500"
            aria-label={`Llamar a ${c.nombre}`} icon={<FiPhone size={16} />} />
        )}
        <Button flex="3" h="42px" variant="ghost" rounded="none" colorScheme="gray"
          fontSize="12px" fontWeight="700" leftIcon={<FiFilePlus size={14} />}
          onClick={() => onNueva(c)}>
          Cotizarle otra vez
        </Button>
      </Flex>
    </Box>
  );
});

export default function ClientesPage() {
  const navigate = useNavigate();
  const { cotizaciones, tabs, openTab } = useCotizaciones();
  /* Debajo de la tira de pestañas Y de la navegación principal */
  const topOffset = useOffsetSuperior(tabs.length > 0);

  const bg      = useColorModeValue("gray.50", "gray.900");
  const barBg   = useColorModeValue("white", "gray.800");
  const border  = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "whiteAlpha.50");
  const muted   = useColorModeValue("gray.500", "gray.400");

  const [buscar, setBuscar] = useState("");
  const [orden, setOrden]   = useState("total");

  /* El directorio sale de las cotizaciones: un cliente existe porque se
     le cotizó, no porque alguien lo dio de alta en una pantalla aparte. */
  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const c of cotizaciones) {
      const nombre = (c.cliente?.nombre || "").trim();
      if (!nombre) continue;                       // mostrador sin nombre: no es un cliente
      const clave = norm(nombre);
      let e = mapa.get(clave);
      if (!e) {
        e = { nombre, tel: "", empresa: "", n: 0, aceptadas: 0, total: 0, ultima: null,
              ficha: c.cliente || { nombre }, tipo: c.config?.tipo || "comercial" };
        mapa.set(clave, e);
      }
      e.n += 1;
      e.total += getTotal(c);
      if (getEstado(c) === "aceptada") e.aceptadas += 1;
      /* El teléfono y la empresa se toman de la cotización más reciente:
         si el cliente cambió de número, el bueno es el último. */
      const fecha = (c.updatedAt || c.createdAt || "").slice(0, 10);
      if (fecha && (!e.ultima || fecha > e.ultima)) {
        e.ultima  = fecha;
        e.tel     = c.cliente?.tel || e.tel;
        e.empresa = c.cliente?.empresa || e.empresa;
        e.ficha   = c.cliente;
        e.tipo    = c.config?.tipo || "comercial";
      }
    }
    return [...mapa.values()];
  }, [cotizaciones]);

  const filtrados = useMemo(() => {
    const q = norm(buscar).trim();
    const lista = q
      ? clientes.filter((c) => norm(c.nombre).includes(q) || norm(c.empresa).includes(q))
      : clientes;
    const copia = [...lista];
    if (orden === "total")   copia.sort((a, b) => b.total - a.total);
    if (orden === "nombre")  copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (orden === "reciente")copia.sort((a, b) => String(b.ultima || "").localeCompare(String(a.ultima || "")));
    if (orden === "cuantas") copia.sort((a, b) => b.n - a.n);
    return copia;
  }, [clientes, buscar, orden]);

  /* Con muchos clientes, pintarlos todos de golpe pega la pantalla */
  const { visibles } = useListaProgresiva(filtrados, {
    primeros: 20, paso: 30, clave: `${buscar}|${orden}`,
  });

  const abrir = useCallback(
    (nombre) => navigate(`/cliente/${encodeURIComponent(nombre)}`), [navigate]);

  /* Exactamente el mismo camino que «Nueva para este cliente» del
     listado — incluido llevarse el tipo. Sin el tipo, entrar por aquí
     volvía a preguntar «¿Comercial u Obra?» y entrando por el listado
     no: la misma acción se comportaba de dos maneras según por dónde se
     llegara, que es justo lo que la heurística 4 pide evitar. */
  const nueva = useCallback((c) => {
    openTab(NEW_TAB_ID);
    navigate("/cotizador", {
      state: {
        clientePrefill: { ...(c.ficha || { nombre: c.nombre }) },
        tipoPrefill: c.tipo || "comercial",
      },
    });
  }, [navigate, openTab]);

  const totalCotizado = useMemo(
    () => filtrados.reduce((a, c) => a + c.total, 0), [filtrados]);

  return (
    <Box minH="100vh" bg={bg}>
      {/* Barra de la pantalla */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}
          h={{ base: "52px", md: "54px" }} align="center" gap={2}>
          <AppLogo variante="marca" h="28px" />
          <Text fontWeight="800" fontSize={{ base: "14px", md: "15px" }}>Clientes</Text>
          <Tag size="sm" colorScheme="gray" rounded="full">{clientes.length}</Tag>
        </Flex>
      </Box>

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}
        pt={{ base: 3, md: 5 }} pb={{ base: NAV_MOVIL_H, md: 8 }}>

        {/* Buscador y orden */}
        <Flex gap={2} mb={4} flexWrap="wrap">
          <InputGroup size="md" flex="1" minW="200px">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color={muted} boxSize={4} />
            </InputLeftElement>
            <Input h="44px" rounded="lg" bg={inputBg} focusBorderColor={FY}
              placeholder="Buscar un cliente…"
              value={buscar} onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBuscar(""); }} />
            {buscar && (
              <Box position="absolute" right="6px" top="6px" zIndex={2}>
                <IconButton size="sm" variant="ghost" colorScheme="gray" rounded="md"
                  aria-label="Borrar la búsqueda" icon={<FiX />}
                  onClick={() => setBuscar("")} />
              </Box>
            )}
          </InputGroup>
          <Select h="44px" w={{ base: "100%", sm: "190px" }} rounded="lg" bg={inputBg}
            focusBorderColor={FY} value={orden} onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar los clientes">
            <option value="total">El que más ha cotizado</option>
            <option value="reciente">El más reciente</option>
            <option value="cuantas">El que más veces</option>
            <option value="nombre">Por nombre (A→Z)</option>
          </Select>
        </Flex>

        {/* Lo que se está viendo, en una línea */}
        <Flex justify="space-between" align="baseline" mb={3} px={1}>
          <Text fontSize="12px" color={muted}>
            {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""}
            {buscar && ` de ${clientes.length}`}
          </Text>
          <Text fontSize="12px" color={muted}>
            {money(totalCotizado)} cotizado
          </Text>
        </Flex>

        {filtrados.length === 0 ? (
          <Box bg={barBg} border="1px solid" borderColor={border} rounded="xl"
            py={12} px={6} textAlign="center">
            <Icon as={FiUsers} boxSize={8} color={muted} mb={3} />
            <Text fontWeight="700" fontSize="15px" mb={1}>
              {buscar ? "Ningún cliente con ese nombre" : "Todavía no hay clientes"}
            </Text>
            <Text fontSize="13px" color={muted} mb={4}>
              {buscar
                ? "Prueba con menos letras, o con el nombre de la empresa."
                : "Los clientes aparecen aquí solos cuando les haces una cotización con su nombre."}
            </Text>
            {buscar
              ? <Button size="sm" variant="outline" colorScheme="gray" rounded="lg"
                  onClick={() => setBuscar("")}>Ver todos</Button>
              : <Button size="sm" bg={FY} color={DARK} rounded="lg" fontWeight="700"
                  _hover={{ bg: "#e0b010" }}
                  onClick={() => { openTab(NEW_TAB_ID); navigate("/cotizador"); }}>
                  Hacer la primera cotización
                </Button>}
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
            {visibles.map((c) => (
              <TarjetaCliente key={c.nombre} c={c} onAbrir={abrir} onNueva={nueva} />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
}
