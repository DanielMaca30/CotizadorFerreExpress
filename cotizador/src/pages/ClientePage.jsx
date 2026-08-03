/**
 * ClientePage.jsx — ficha de un cliente
 * ─────────────────────────────────────────────────────────────────
 * Nace de un caso real: había que saber cuántas escaleras se le habían
 * alquilado a un cliente, y la única forma era abrir sus cotizaciones
 * una por una sin poder volver atrás al listado.
 *
 * Aquí, en una sola pantalla:
 *   • los datos de contacto, para llamarlo sin buscarlos en otro lado;
 *   • cuántas cotizaciones tiene, cuánto suman y desde cuándo es cliente;
 *   • el listado completo, y
 *   • un buscador por producto que dice en qué cotizaciones aparece y
 *     cuántas unidades suman en total.
 */
import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Text, Icon, Badge, Button, IconButton, Input,
  InputGroup, InputLeftElement, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Tooltip, Tag, useColorModeValue, Divider,
} from "@chakra-ui/react";
import {
  FiArrowLeft, FiSearch, FiMapPin, FiPhone, FiMail, FiFileText,
  FiDollarSign, FiPackage, FiEdit2, FiCalendar, FiUser, FiExternalLink,
} from "react-icons/fi";
import { useCotizaciones } from "../hooks/useCotizaciones";
import { useClientesFrecuentes } from "../hooks/useClientesFrecuentes";
import { TABS_BAR_H } from "../components/TabsBar";
import { money, fmtDateShort, ESTADO_META } from "../utils";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

const norm = (s) => String(s ?? "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const getTotal  = (c) => c.totals?.totalPagar ?? c.totals?.total ?? 0;
const getNumero = (c) => c.numero || c.config?.numero || "—";
const getEstado = (c) => c.config?.estado || c.estado || "borrador";

function Kpi({ label, value, sub, icon, accent }) {
  const bg    = useColorModeValue("white", "gray.800");
  const bc    = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.500", "gray.400");
  const iconBg = useColorModeValue("gray.100", "whiteAlpha.200");
  return (
    <Box bg={bg} border="1px solid" borderColor={bc} rounded="xl" p={4}
      boxShadow="0 2px 12px rgba(0,0,0,0.06)">
      <Flex justify="space-between" align="flex-start">
        <Box minW={0}>
          <Text fontSize="9px" fontWeight="700" letterSpacing="0.12em"
            textTransform="uppercase" color={muted} mb={1}>{label}</Text>
          <Text fontSize="xl" fontWeight="900" lineHeight="1.1" noOfLines={1}>{value}</Text>
          {sub && <Text fontSize="10px" color={muted} mt={1} noOfLines={1}>{sub}</Text>}
        </Box>
        <Box bg={iconBg} rounded="lg" p={2} flex="0 0 auto">
          <Icon as={icon} color={accent} boxSize={4} />
        </Box>
      </Flex>
    </Box>
  );
}

export default function ClientePage() {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const { cotizaciones, tabs, openTab } = useCotizaciones();
  const { clientes } = useClientesFrecuentes();
  const [buscar, setBuscar] = useState("");

  const clienteNombre = decodeURIComponent(nombre || "");
  const clave = clienteNombre.trim().toUpperCase();

  const bg       = useColorModeValue("gray.50", "gray.900");
  const cardBg   = useColorModeValue("white", "gray.800");
  const border   = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted    = useColorModeValue("gray.600", "gray.400");
  const mutedL   = useColorModeValue("gray.400", "gray.600");
  const barBg    = useColorModeValue("white", "gray.900");
  const inputBg  = useColorModeValue("white", "gray.700");
  const theadBg  = DARK;
  const hoverBg  = useColorModeValue("yellow.50", "whiteAlpha.50");
  const stripeBg = useColorModeValue("gray.50", "gray.750");
  const topOffset = tabs.length ? TABS_BAR_H : 0;

  /* Cotizaciones de este cliente */
  const suyas = useMemo(
    () => cotizaciones
      .filter((c) => norm(c.cliente?.nombre).trim() === norm(clienteNombre).trim())
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [cotizaciones, clienteNombre]
  );

  /* Datos de contacto: los del directorio, o los de la cotización más reciente */
  const ficha = clientes[clave] || suyas[0]?.cliente || { nombre: clienteNombre };

  const resumen = useMemo(() => {
    const total = suyas.reduce((a, c) => a + getTotal(c), 0);
    const fechas = suyas.map((c) => new Date(c.createdAt || c.updatedAt || 0).getTime())
      .filter(Boolean).sort((a, b) => a - b);
    return {
      total,
      aceptadas: suyas.filter((c) => getEstado(c) === "aceptada").length,
      desde: fechas[0] ? new Date(fechas[0]).toISOString().slice(0, 10) : null,
      ultima: fechas.length ? new Date(fechas[fechas.length - 1]).toISOString().slice(0, 10) : null,
    };
  }, [suyas]);

  /* ─── Buscador de productos dentro de sus cotizaciones ───
     Responde directamente a "¿cuántas escaleras le hemos alquilado?" */
  const hallazgos = useMemo(() => {
    const q = norm(buscar).trim();
    if (q.length < 2) return null;

    const filas = [];
    let unidades = 0, importe = 0;
    suyas.forEach((c) => {
      (c.items || []).forEach((it) => {
        if (!norm(it.desc).includes(q)) return;
        const qty = parseFloat(it.qty) || 0;
        const sub = (parseFloat(it.price) || 0) * qty * (1 - (parseFloat(it.disc) || 0) / 100);
        unidades += qty;
        importe  += sub;
        filas.push({ cot: c, desc: it.desc, qty, unit: it.unit || "Und", sub });
      });
    });
    return { filas, unidades, importe, cotizaciones: new Set(filas.map((f) => f.cot.id)).size };
  }, [buscar, suyas]);

  const abrir = useCallback((id) => { openTab(id); navigate(`/cotizador/${id}`); }, [openTab, navigate]);

  const contacto = [
    ficha.direccion && { icon: FiMapPin, txt: ficha.direccion },
    ficha.tel       && { icon: FiPhone,  txt: ficha.tel },
    ficha.correo    && { icon: FiMail,   txt: ficha.correo },
  ].filter(Boolean);

  return (
    <Box minH="100vh" bg={bg}>
      {/* TOPBAR */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} h="54px" align="center" gap={3}>
          {/* Volver conserva los filtros del historial porque usa el atrás del navegador */}
          <Tooltip label="Volver al listado" hasArrow>
            <IconButton size="sm" variant="ghost" rounded="md" aria-label="Volver"
              icon={<FiArrowLeft />} onClick={() => navigate(-1)} />
          </Tooltip>
          <Icon as={FiUser} color={FY} />
          <Text fontWeight="800" fontSize={{ base: "13px", md: "15px" }} noOfLines={1}>
            {ficha.nombre || clienteNombre}
          </Text>
          <Tag size="sm" colorScheme="gray" rounded="full">{suyas.length}</Tag>
          <Button size="sm" variant="outline" rounded="md" ml="auto"
            as={RouterLink} to="/historial" leftIcon={<FiFileText />}>
            Historial
          </Button>
        </Flex>
      </Box>

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} py={6}>

        {suyas.length === 0 ? (
          <Flex direction="column" align="center" py={20} gap={3}>
            <Icon as={FiUser} boxSize={10} color={mutedL} />
            <Text fontWeight="800">Sin cotizaciones para {clienteNombre}</Text>
            <Button size="sm" onClick={() => navigate("/historial")}>Volver al historial</Button>
          </Flex>
        ) : (
          <>
            {/* Contacto */}
            {contacto.length > 0 && (
              <Box bg={cardBg} border="1px solid" borderColor={border} rounded="xl" p={4} mb={4}
                boxShadow="0 2px 12px rgba(0,0,0,0.06)">
                <Flex gap={5} flexWrap="wrap">
                  {contacto.map(({ icon, txt }, i) => (
                    <HStack key={i} spacing={2}>
                      <Icon as={icon} color={FY} boxSize={3.5} />
                      <Text fontSize="13px" fontWeight="600">{txt}</Text>
                    </HStack>
                  ))}
                  {(ficha.empresa || ficha.nit) && (
                    <Text fontSize="11px" color={mutedL} alignSelf="center">
                      {[ficha.empresa, ficha.nit && `NIT ${ficha.nit}`].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </Flex>
              </Box>
            )}

            {/* KPIs */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={5}>
              <Kpi label="Cotizaciones" value={suyas.length} icon={FiFileText} accent={mutedL}
                sub={`${resumen.aceptadas} aceptada${resumen.aceptadas !== 1 ? "s" : ""}`} />
              <Kpi label="Total cotizado" value={money(resumen.total)} icon={FiDollarSign} accent={FY} />
              <Kpi label="Cliente desde" value={resumen.desde ? fmtDateShort(resumen.desde) : "—"}
                icon={FiCalendar} accent="blue.400" />
              <Kpi label="Última" value={resumen.ultima ? fmtDateShort(resumen.ultima) : "—"}
                icon={FiCalendar} accent="green.400" />
            </SimpleGrid>

            {/* Buscador de productos */}
            <Box bg={cardBg} border="1px solid" borderColor={border} rounded="xl" p={4} mb={5}
              boxShadow="0 2px 12px rgba(0,0,0,0.06)">
              <Text fontSize="9px" fontWeight="800" letterSpacing="0.12em"
                textTransform="uppercase" color={muted} mb={2}>
                Buscar un producto en sus cotizaciones
              </Text>
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiPackage} color={mutedL} boxSize={4} />
                </InputLeftElement>
                <Input rounded="md" bg={inputBg} focusBorderColor={FY}
                  placeholder="escalera, cemento, andamio…"
                  value={buscar} onChange={(e) => setBuscar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setBuscar(""); }} />
              </InputGroup>

              {hallazgos && (
                hallazgos.filas.length === 0 ? (
                  <Text fontSize="12px" color={muted} mt={3}>
                    No aparece «{buscar}» en ninguna de sus cotizaciones.
                  </Text>
                ) : (
                  <Box mt={4}>
                    <HStack spacing={6} mb={3} flexWrap="wrap">
                      <Box>
                        <Text fontSize="9px" color={muted} fontWeight="700">UNIDADES EN TOTAL</Text>
                        <Text fontSize="2xl" fontWeight="900" color={FY} lineHeight="1.1">
                          {hallazgos.unidades.toLocaleString("es-CO")}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="9px" color={muted} fontWeight="700">EN COTIZACIONES</Text>
                        <Text fontSize="2xl" fontWeight="900" lineHeight="1.1">{hallazgos.cotizaciones}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="9px" color={muted} fontWeight="700">IMPORTE</Text>
                        <Text fontSize="2xl" fontWeight="900" lineHeight="1.1">{money(hallazgos.importe)}</Text>
                      </Box>
                    </HStack>
                    <Divider mb={2} />
                    <VStack align="stretch" spacing={0} maxH="230px" overflowY="auto">
                      {hallazgos.filas.map((f, i) => (
                        <Flex key={i} py={2} px={1} gap={3} align="center"
                          borderBottom="1px solid" borderColor={border}
                          _hover={{ bg: hoverBg, cursor: "pointer" }}
                          onClick={() => abrir(f.cot.id)}>
                          <Text fontSize="11px" fontWeight="700" color={FY} w="72px" flex="0 0 auto">
                            {getNumero(f.cot)}
                          </Text>
                          <Text fontSize="12px" flex={1} noOfLines={1}>{f.desc}</Text>
                          <Text fontSize="12px" fontWeight="800" w="70px" textAlign="right" flex="0 0 auto">
                            {f.qty} {f.unit}
                          </Text>
                          <Text fontSize="11px" color={muted} w="90px" textAlign="right" flex="0 0 auto">
                            {money(f.sub)}
                          </Text>
                          <Text fontSize="10px" color={mutedL} w="80px" textAlign="right"
                            flex="0 0 auto" display={{ base: "none", md: "block" }}>
                            {fmtDateShort((f.cot.updatedAt || "").slice(0, 10))}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                )
              )}
            </Box>

            {/* Listado de sus cotizaciones */}
            <Box bg={cardBg} border="1px solid" borderColor={border} rounded="xl" overflow="hidden"
              boxShadow="0 2px 12px rgba(0,0,0,0.06)">
              <TableContainer overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr bg={theadBg}>
                      <Th color={FY} borderColor="transparent" fontSize="9px" w="110px">N°</Th>
                      <Th color={FY} borderColor="transparent" fontSize="9px">Productos</Th>
                      <Th color={FY} borderColor="transparent" fontSize="9px" w="110px">Fecha</Th>
                      <Th color={FY} borderColor="transparent" fontSize="9px" w="110px">Estado</Th>
                      <Th color={FY} borderColor="transparent" fontSize="9px" isNumeric w="130px">Total</Th>
                      <Th color={FY} borderColor="transparent" w="50px" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {suyas.map((c, i) => {
                      const meta = ESTADO_META[getEstado(c)] || ESTADO_META.borrador;
                      const prods = (c.items || []).filter((it) => it.desc).map((it) => it.desc);
                      return (
                        <Tr key={c.id} bg={i % 2 === 0 ? cardBg : stripeBg}
                          _hover={{ bg: hoverBg, cursor: "pointer" }} onClick={() => abrir(c.id)}>
                          <Td borderColor={border} fontWeight="700" fontSize="13px">
                            {getNumero(c)}
                            <Badge ml={1} fontSize="7px" rounded="full"
                              bg={(c.config?.tipo === "obra") ? "blue.100" : "green.100"}
                              color={(c.config?.tipo === "obra") ? "blue.700" : "green.700"}>
                              {(c.config?.tipo === "obra") ? "OBRA" : "COM"}
                            </Badge>
                          </Td>
                          <Td borderColor={border}>
                            <Text fontSize="12px" noOfLines={1}>{prods.join(", ") || "—"}</Text>
                            <Text fontSize="10px" color={mutedL}>{prods.length} ítem{prods.length !== 1 ? "s" : ""}</Text>
                          </Td>
                          <Td borderColor={border} fontSize="12px" color={muted}>
                            {fmtDateShort((c.updatedAt || "").slice(0, 10))}
                          </Td>
                          <Td borderColor={border}>
                            <Badge colorScheme={meta.color} rounded="full" variant="subtle" fontSize="9px">
                              {meta.label}
                            </Badge>
                          </Td>
                          <Td borderColor={border} isNumeric>
                            <Text fontWeight="800" fontSize="13px" fontVariantNumeric="tabular-nums">
                              {money(getTotal(c), c.config?.moneda || "COP")}
                            </Text>
                          </Td>
                          <Td borderColor={border} onClick={(e) => e.stopPropagation()}>
                            <Tooltip label="Abrir" hasArrow>
                              <IconButton size="xs" variant="ghost" rounded="md" aria-label="Abrir"
                                icon={<FiEdit2 size={13} />} onClick={() => abrir(c.id)} />
                            </Tooltip>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
