/**
 * HistorialPage.jsx
 * Vista de historial de cotizaciones guardadas.
 * Ruta: /historial
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Stack, Text, Icon, Badge, Tag,
  Button, IconButton, Input, InputGroup, InputLeftElement,
  Select, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tooltip, SimpleGrid, Skeleton,
  useColorModeValue, usePrefersReducedMotion, useToast, useDisclosure,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Card, CardBody,
} from "@chakra-ui/react";
import {
  FiPlus, FiTrash2, FiEdit2, FiCopy, FiDownload, FiSearch,
  FiFileText, FiArrowLeft, FiRefreshCw, FiCheckCircle,
  FiClock, FiXCircle, FiSend, FiTrendingUp,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCotizaciones }  from "../hooks/useCotizaciones";
import { usePDF }           from "../hooks/usePDF";
import DocContent            from "../components/DocContent";
import { money, fmtDateShort, calcTotals, ESTADO_META } from "../utils";

const FY   = "#F9BF20";
const DARK = "#1A2B45";

const MotionBox = motion(Box);
const MotionTr  = motion(Tr);

const makeSpring = (r) =>
  r ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32, mass: 0.7 };
const pressable = (r) => ({
  whileHover: r ? {} : { y: -1, scale: 1.01 },
  whileTap:   r ? {} : { scale: 0.985 },
  transition: r ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 30 },
});
const fadeUp = (r) => ({
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: makeSpring(r) },
});
const stagger = (r) => ({
  hidden: {},
  show: { transition: r ? {} : { staggerChildren: 0.05, delayChildren: 0.02 } },
});

/* ── GlassCard ── */
function GlassCard({ children, ...rest }) {
  const bg = useColorModeValue("whiteAlpha.900", "blackAlpha.400");
  const bc = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const sh = useColorModeValue("0 8px 40px rgba(0,0,0,0.07)", "0 8px 40px rgba(0,0,0,0.35)");
  return (
    <Box bg={bg} border="1px solid" borderColor={bc}
      backdropFilter="blur(18px)" boxShadow={sh} {...rest}>
      {children}
    </Box>
  );
}

/* ── KPI Card ── */
function KpiCard({ label, value, icon, color = "yellow" }) {
  const rm   = usePrefersReducedMotion();
  const muted = useColorModeValue("gray.600", "gray.400");
  const bc   = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const ibg  = useColorModeValue("whiteAlpha.800", "blackAlpha.500");
  return (
    <MotionBox variants={fadeUp(rm)}>
      <GlassCard rounded="2xl" overflow="hidden">
        <Card bg="transparent" border="none" shadow="none">
          <CardBody p={5}>
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontSize="xs" color={muted} fontWeight="700"
                  letterSpacing="wide" textTransform="uppercase">{label}</Text>
                <Text mt={1} fontSize="2xl" fontWeight="900" lineHeight="1">{value}</Text>
              </Box>
              <Box border="1px solid" borderColor={bc} bg={ibg} rounded="xl" p={2.5}>
                <Icon as={icon} color={`${color}.400`} />
              </Box>
            </HStack>
          </CardBody>
        </Card>
      </GlassCard>
    </MotionBox>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function HistorialPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const rm        = usePrefersReducedMotion();
  const cancelRef = useRef();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const {
    cotizaciones, deleteCotizacion, duplicarCotizacion, stats,
  } = useCotizaciones();

  const { downloadPDF, loading: pdfLoading } = usePDF("pdf-historial-hidden");

  /* ── Estado de filtros ── */
  const [search,   setSearch]   = useState("");
  const [estado,   setEstado]   = useState("todos");
  const [sortBy,   setSortBy]   = useState("updatedAt");
  const [sortDir,  setSortDir]  = useState("desc");
  const [toDelete, setToDelete] = useState(null);
  const [pdfCot,   setPdfCot]   = useState(null); // cotizacion seleccionada para PDF

  /* ── Colores ── */
  const bg       = useColorModeValue("gray.50",        "blackAlpha.900");
  const border   = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const muted    = useColorModeValue("gray.600",       "gray.400");
  const mutedL   = useColorModeValue("gray.400",       "gray.600");
  const theadBg  = useColorModeValue("gray.800",       "gray.900");
  const theadClr = useColorModeValue("white",          "gray.100");
  const tableBg  = useColorModeValue("white",          "blackAlpha.400");
  const stripeBg = useColorModeValue("gray.50",        "blackAlpha.200");
  const barBg    = useColorModeValue("white",          "gray.900");
  const inputBg  = useColorModeValue("white",          "blackAlpha.500");

  /* ── Filtrado y ordenamiento ── */
  const filtered = useMemo(() => {
    let list = [...cotizaciones];

    if (search.trim()) {
      const term = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter((c) => {
        const hay = [
          c.numero, c.cliente?.nombre, c.cliente?.empresa,
          c.cliente?.ciudad, c.config?.formaPago,
        ].filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return hay.includes(term);
      });
    }

    if (estado !== "todos") {
      list = list.filter((c) => c.config?.estado === estado || c.estado === estado);
    }

    list.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "numero":
          va = a.numero || ""; vb = b.numero || "";
          break;
        case "total":
          va = a.totals?.total || 0; vb = b.totals?.total || 0;
          break;
        case "cliente":
          va = a.cliente?.nombre || ""; vb = b.cliente?.nombre || "";
          break;
        default: // updatedAt / createdAt
          va = a[sortBy] || ""; vb = b[sortBy] || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1  : -1;
      return 0;
    });

    return list;
  }, [cotizaciones, search, estado, sortBy, sortDir]);

  /* ── Toggle sort ── */
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  /* ── Eliminar ── */
  const confirmDelete = useCallback((cot) => {
    setToDelete(cot);
    onDeleteOpen();
  }, [onDeleteOpen]);

  const handleDelete = useCallback(() => {
    if (!toDelete) return;
    deleteCotizacion(toDelete.id);
    toast({ title: "Cotización eliminada", status: "info", duration: 2500, position: "top-right" });
    setToDelete(null);
    onDeleteClose();
  }, [toDelete, deleteCotizacion, toast, onDeleteClose]);

  /* ── Duplicar ── */
  const handleDuplicate = useCallback((id) => {
    const newId = duplicarCotizacion(id);
    toast({ title: "Cotización duplicada ✓", status: "success", duration: 2500, position: "top-right" });
    navigate(`/cotizador/${newId}`);
  }, [duplicarCotizacion, navigate, toast]);

  /* ── PDF ── */
  const handlePDF = useCallback(async (cot) => {
    setPdfCot(cot);
    // Esperar que React monte el nodo oculto
    await new Promise((r) => setTimeout(r, 300));
    const ok = await downloadPDF(`${cot.numero || "cotizacion"}_FerreExpress`);
    if (ok) toast({ title: "PDF descargado ✓", status: "success", duration: 2500, position: "top-right" });
    else    toast({ title: "Error generando PDF", status: "error", duration: 3000 });
    setPdfCot(null);
  }, [downloadPDF, toast]);

  /* ── Helper: estado badge ── */
  const estadoBadge = (cot) => {
    const key  = cot.config?.estado || cot.estado || "borrador";
    const meta = ESTADO_META[key] || ESTADO_META.borrador;
    return <Badge colorScheme={meta.color} rounded="full" variant="subtle" fontSize="10px">{meta.label}</Badge>;
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <Box minH="100vh" bg={bg}>

      {/* Nodo PDF oculto para html2canvas */}
      {pdfCot && (
        <Box id="pdf-historial-hidden"
          position="fixed" top="-9999px" left="-9999px"
          zIndex={-1} w="794px" bg="white">
          <DocContent
            empresa={pdfCot.empresa}
            cot={pdfCot.config || {}}
            cli={pdfCot.cliente || {}}
            items={pdfCot.items || []}
            descG={pdfCot.descG || 0}
            totals={pdfCot.totals || calcTotals(pdfCot.items||[], pdfCot.descG||0, pdfCot.config?.iva||19)}
            notas={pdfCot.notas || ""}
          />
        </Box>
      )}

      {/* ── TOPBAR ── */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={0} zIndex={100} backdropFilter="blur(18px)">
        <Flex maxW="1200px" mx="auto" px={6} h="54px" align="center" justify="space-between">
          <HStack spacing={3}>
            <motion.div {...pressable(rm)}>
              <IconButton size="sm" variant="ghost" rounded="xl"
                aria-label="Volver" icon={<FiArrowLeft />}
                onClick={() => navigate("/cotizador")} />
            </motion.div>
            <Box bg={FY} rounded="lg" px={2} py={1}>
              <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.3">FE</Text>
            </Box>
            <Text fontWeight="800" fontSize="15px">
              FerreExpress{" "}
              <Text as="span" color={mutedL} fontWeight="400">· Historial</Text>
            </Text>
            <Tag size="sm" colorScheme="gray" rounded="full">
              {cotizaciones.length} cotizacion{cotizaciones.length !== 1 ? "es" : ""}
            </Tag>
          </HStack>
          <motion.div {...pressable(rm)}>
            <Button size="sm" colorScheme="yellow" rounded="xl"
              leftIcon={<FiPlus />} onClick={() => navigate("/cotizador")}>
              Nueva cotización
            </Button>
          </motion.div>
        </Flex>
      </Box>

      <Box maxW="1200px" mx="auto" px={6} py={6}>
        <MotionBox initial="hidden" animate="show" variants={stagger(rm)}>

          {/* ── KPIs ── */}
          <SimpleGrid columns={{ base:2, md:4 }} spacing={4} mb={7}>
            <KpiCard label="Total"     value={stats.total}     icon={FiFileText}    color="gray"   />
            <KpiCard label="Enviadas"  value={stats.enviadas}  icon={FiSend}        color="blue"   />
            <KpiCard label="Aceptadas" value={stats.aceptadas} icon={FiCheckCircle} color="green"  />
            <KpiCard label="Valor total" value={money(stats.valorTotal)} icon={FiTrendingUp} color="yellow" />
          </SimpleGrid>

          {/* ── Filtros + Buscador ── */}
          <MotionBox variants={fadeUp(rm)} mb={5}>
            <GlassCard rounded="2xl" px={5} py={4}>
              <Flex gap={3} align="center" flexWrap="wrap">
                {/* Buscador */}
                <InputGroup size="sm" flex={1} minW="200px">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiSearch} color={mutedL} boxSize={4} />
                  </InputLeftElement>
                  <Input rounded="xl" bg={inputBg} focusBorderColor={FY}
                    placeholder="Buscar por N°, cliente, empresa…"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </InputGroup>

                {/* Filtro estado */}
                <Select size="sm" rounded="xl" bg={inputBg} focusBorderColor={FY}
                  w="160px" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="todos">Todos los estados</option>
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                </Select>

                {/* Limpiar filtros */}
                {(search || estado !== "todos") && (
                  <motion.div {...pressable(rm)}>
                    <Button size="sm" variant="ghost" rounded="xl"
                      leftIcon={<FiRefreshCw size={12} />}
                      onClick={() => { setSearch(""); setEstado("todos"); }}>
                      Limpiar
                    </Button>
                  </motion.div>
                )}

                <Text fontSize="11px" color={mutedL} ml="auto" whiteSpace="nowrap">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </Text>
              </Flex>
            </GlassCard>
          </MotionBox>

          {/* ── Tabla ── */}
          <MotionBox variants={fadeUp(rm)}>
            <GlassCard rounded="2xl" overflow="hidden">
              {filtered.length === 0 ? (
                <Flex direction="column" align="center" justify="center" py={16} gap={4}>
                  <Icon as={FiFileText} boxSize={10} color={mutedL} />
                  <Text fontWeight="800" fontSize="lg">
                    {cotizaciones.length === 0 ? "Aún no hay cotizaciones" : "Sin resultados"}
                  </Text>
                  <Text fontSize="sm" color={muted} textAlign="center">
                    {cotizaciones.length === 0
                      ? "Crea tu primera cotización para verla aquí."
                      : "Prueba cambiando los filtros de búsqueda."}
                  </Text>
                  {cotizaciones.length === 0 && (
                    <motion.div {...pressable(rm)}>
                      <Button colorScheme="yellow" rounded="xl" leftIcon={<FiPlus />}
                        onClick={() => navigate("/cotizador")}>
                        Nueva cotización
                      </Button>
                    </motion.div>
                  )}
                </Flex>
              ) : (
                <TableContainer overflowX="auto"
                  sx={{ "&::-webkit-scrollbar":{ h:"4px" }, "&::-webkit-scrollbar-thumb":{ bg:"gray.200", borderRadius:"2px" } }}>
                  <Table size="sm" variant="simple">
                    <Thead position="sticky" top={0} zIndex={1}>
                      <Tr bg={theadBg}>
                        {/* Columna N° — sorteable */}
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" cursor="pointer"
                          onClick={() => toggleSort("numero")} w="110px">
                          <HStack spacing={1}>
                            <Text>N°</Text>
                            {sortBy === "numero" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        {/* Cliente */}
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" cursor="pointer"
                          onClick={() => toggleSort("cliente")}>
                          <HStack spacing={1}>
                            <Text>Cliente</Text>
                            {sortBy === "cliente" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" w="110px">Fecha</Th>
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" w="100px">Vigencia</Th>
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" w="100px">Estado</Th>
                        {/* Total — sorteable */}
                        <Th color={theadClr} borderColor="transparent" fontSize="9px"
                          letterSpacing="wider" isNumeric cursor="pointer" w="140px"
                          onClick={() => toggleSort("total")}>
                          <HStack spacing={1} justify="flex-end">
                            <Text>Total</Text>
                            {sortBy === "total" && <Text opacity={0.6}>{sortDir === "asc" ? "↑" : "↓"}</Text>}
                          </HStack>
                        </Th>
                        <Th color={theadClr} borderColor="transparent" w="150px">Acciones</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <AnimatePresence>
                        {filtered.map((cot, i) => (
                          <MotionTr key={cot.id} layout
                            initial={{ opacity:0, y:4, filter:"blur(4px)" }}
                            animate={{ opacity:1, y:0, filter:"blur(0px)" }}
                            exit={{ opacity:0, y:-4, filter:"blur(4px)" }}
                            transition={makeSpring(rm)}
                            bg={i % 2 === 0 ? tableBg : stripeBg}
                            _hover={{ bg: useColorModeValue("yellow.50","whiteAlpha.50"), cursor:"pointer" }}
                            style={{ display:"table-row" }}
                            onClick={() => navigate(`/cotizador/${cot.id}`)}>

                            {/* N° */}
                            <Td borderColor={border} fontWeight="700" fontSize="13px">
                              {cot.numero || "—"}
                            </Td>

                            {/* Cliente */}
                            <Td borderColor={border}>
                              <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                                {cot.cliente?.nombre || <Text as="span" color={mutedL} fontStyle="italic">Sin cliente</Text>}
                              </Text>
                              {cot.cliente?.empresa && (
                                <Text fontSize="10px" color={muted} noOfLines={1}>{cot.cliente.empresa}</Text>
                              )}
                            </Td>

                            {/* Fecha */}
                            <Td borderColor={border} fontSize="12px" color={muted}>
                              {fmtDateShort(cot.config?.fecha)}
                            </Td>

                            {/* Vigencia */}
                            <Td borderColor={border} fontSize="12px" color={muted}>
                              {cot.config?.vigencia ? fmtDateShort(cot.config.vigencia) : "—"}
                            </Td>

                            {/* Estado */}
                            <Td borderColor={border}>{estadoBadge(cot)}</Td>

                            {/* Total */}
                            <Td borderColor={border} isNumeric>
                              <Text fontWeight="800" fontSize="14px"
                                fontVariantNumeric="tabular-nums">
                                {money(cot.totals?.total || 0, cot.config?.moneda || "COP")}
                              </Text>
                            </Td>

                            {/* Acciones */}
                            <Td borderColor={border}
                              onClick={(e) => e.stopPropagation()}>
                              <HStack spacing={1}>
                                <Tooltip label="Editar" hasArrow>
                                  <motion.div {...pressable(rm)}>
                                    <IconButton size="xs" variant="ghost" rounded="lg"
                                      aria-label="Editar" icon={<FiEdit2 size={13} />}
                                      onClick={() => navigate(`/cotizador/${cot.id}`)} />
                                  </motion.div>
                                </Tooltip>
                                <Tooltip label="Duplicar" hasArrow>
                                  <motion.div {...pressable(rm)}>
                                    <IconButton size="xs" variant="ghost" rounded="lg"
                                      aria-label="Duplicar" icon={<FiCopy size={13} />}
                                      onClick={() => handleDuplicate(cot.id)} />
                                  </motion.div>
                                </Tooltip>
                                <Tooltip label="Descargar PDF" hasArrow>
                                  <motion.div {...pressable(rm)}>
                                    <IconButton size="xs" variant="ghost" rounded="lg"
                                      aria-label="PDF" icon={<FiDownload size={13} />}
                                      isLoading={pdfLoading && pdfCot?.id === cot.id}
                                      onClick={() => handlePDF(cot)} />
                                  </motion.div>
                                </Tooltip>
                                <Tooltip label="Eliminar" hasArrow>
                                  <motion.div {...pressable(rm)}>
                                    <IconButton size="xs" variant="ghost" colorScheme="red"
                                      rounded="lg" aria-label="Eliminar" icon={<FiTrash2 size={13} />}
                                      onClick={() => confirmDelete(cot)} />
                                  </motion.div>
                                </Tooltip>
                              </HStack>
                            </Td>
                          </MotionTr>
                        ))}
                      </AnimatePresence>
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </GlassCard>
          </MotionBox>

        </MotionBox>
      </Box>

      {/* ── AlertDialog: Confirmar eliminación ── */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="2xl">
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              {toDelete && (
                <Text>
                  Vas a eliminar <strong>{toDelete.numero || "esta cotización"}</strong>
                  {toDelete.cliente?.nombre ? ` de ${toDelete.cliente.nombre}` : ""}.
                  Esta acción no se puede deshacer.
                </Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} rounded="xl">Cancelar</Button>
              <Button colorScheme="red" ml={3} rounded="xl" onClick={handleDelete}>
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}