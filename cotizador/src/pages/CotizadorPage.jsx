/**
 * CotizadorPage.jsx
 * Página principal de creación / edición de cotizaciones.
 * Ruta: /cotizador (nueva) | /cotizador/:id (edición)
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Flex, Grid, GridItem, HStack, VStack, Stack,
  Text, Heading, Divider, Icon, Badge, Tag,
  Button, IconButton, Tooltip,
  Input, Select, Textarea, NumberInput, NumberInputField,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useColorModeValue, usePrefersReducedMotion, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from "@chakra-ui/react";
import {
  FiPlus, FiTrash2, FiSave, FiDownload, FiEye, FiArrowLeft,
  FiList, FiCopy, FiHome, FiUser, FiFileText,
  FiMapPin, FiPhone, FiMail, FiHash, FiPackage,
  FiDollarSign, FiPercent, FiTag, FiCalendar, FiAlignLeft,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCotizaciones } from "../hooks/useCotizaciones";
import { usePDF }          from "../hooks/usePDF";
import DocContent           from "../components/DocContent";
import {
  blankRow, calcRow, calcTotals, money, fmtDate,
  UNITS, FORMAS_PAGO, IVA_OPTS, MONEDAS,
  DEFAULT_EMPRESA, DEFAULT_CLIENTE, DEFAULT_CONFIG, DEFAULT_NOTAS,
} from "../utils";

const FY   = "#F9BF20";
const DARK = "#1A2B45";

const MotionBox = motion(Box);
const MotionTr  = motion(Tr);

const makeSpring = (r) =>
  r ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32, mass: 0.7 };
const pressable  = (r) => ({
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
  show: { transition: r ? {} : { staggerChildren: 0.06, delayChildren: 0.04 } },
});

/* ── GlassCard ─────────────────────────────────────────── */
function GlassCard({ children, ...rest }) {
  const bg = useColorModeValue("whiteAlpha.900", "blackAlpha.400");
  const bc = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const sh = useColorModeValue(
    "0 8px 40px rgba(0,0,0,0.07)",
    "0 8px 40px rgba(0,0,0,0.35)"
  );
  return (
    <Box bg={bg} border="1px solid" borderColor={bc}
      backdropFilter="blur(18px)" boxShadow={sh} {...rest}>
      {children}
    </Box>
  );
}

/* ── Etiqueta de campo ─────────────────────────────────── */
function FieldLabel({ icon, children }) {
  const c = useColorModeValue("gray.500", "gray.400");
  return (
    <HStack spacing={1} mb={1}>
      {icon && <Icon as={icon} boxSize={3} color={c} />}
      <Text fontSize="9px" fontWeight="700" letterSpacing="0.12em"
        textTransform="uppercase" color={c}>{children}</Text>
    </HStack>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function CotizadorPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const rm        = usePrefersReducedMotion();
  const cancelRef = useRef();

  const { getCotizacion, saveCotizacion, deleteCotizacion, duplicarCotizacion } = useCotizaciones();
  const { downloadPDF, loading: pdfLoading } = usePDF("cotizacion-pdf");

  /* ── Estado del formulario ── */
  const [empresa,   setEmpresa]  = useState(DEFAULT_EMPRESA);
  const [cliente,   setCliente]  = useState(DEFAULT_CLIENTE);
  const [cotConfig, setCotConfig] = useState(DEFAULT_CONFIG);
  const [items,     setItems]    = useState([blankRow(), blankRow()]);
  const [descG,     setDescG]    = useState(0);
  const [notas,     setNotas]    = useState(DEFAULT_NOTAS);
  const [isSaving,  setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  /* ── Cargar cotización existente ── */
  useEffect(() => {
    if (id) {
      const cot = getCotizacion(id);
      if (!cot) {
        toast({ title: "Cotización no encontrada", status: "error", duration: 3000 });
        navigate("/historial");
        return;
      }
      setEmpresa(cot.empresa || DEFAULT_EMPRESA);
      setCliente(cot.cliente || DEFAULT_CLIENTE);
      setCotConfig(cot.config || DEFAULT_CONFIG);
      setItems(cot.items?.length ? cot.items : [blankRow(), blankRow()]);
      setDescG(cot.descG || 0);
      setNotas(cot.notas || DEFAULT_NOTAS);
      setEditingId(id);
    }
  }, [id]); // eslint-disable-line

  /* ── Cálculos reactivos ── */
  const totals = useMemo(
    () => calcTotals(items, descG, cotConfig.iva),
    [items, descG, cotConfig.iva]
  );

  /* ── Items CRUD ── */
  const addItem = useCallback(() => {
    setItems((p) => [...p, blankRow()]);
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((p) => {
      if (p.length <= 1) return p; // mínimo 1 fila
      return p.filter((r) => r.id !== itemId);
    });
  }, []);

  const upItem = useCallback((itemId, key, val) => {
    setItems((p) => p.map((r) => (r.id === itemId ? { ...r, [key]: val } : r)));
  }, []);

  /* ── Guardar ── */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        id:       editingId,
        empresa,
        cliente,
        config:   cotConfig,
        items,
        descG,
        notas,
        totals,
      };
      const savedId = saveCotizacion(payload);

      if (!editingId) {
        // Si era nueva, actualizar URL y estado
        const saved = getCotizacion(savedId);
        if (saved) setCotConfig(saved.config);
        setEditingId(savedId);
        navigate(`/cotizador/${savedId}`, { replace: true });
      }

      toast({
        title: editingId ? "Cotización actualizada ✓" : "Cotización guardada ✓",
        description: `${cotConfig.numero || ""}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (e) {
      toast({ title: "Error al guardar", description: e.message, status: "error", duration: 4000 });
    } finally {
      setIsSaving(false);
    }
  }, [editingId, empresa, cliente, cotConfig, items, descG, notas, totals, saveCotizacion, getCotizacion, navigate, toast]);

  /* ── Eliminar ── */
  const handleDelete = useCallback(() => {
    if (!editingId) return;
    deleteCotizacion(editingId);
    toast({ title: "Cotización eliminada", status: "info", duration: 2500, position: "top-right" });
    navigate("/historial");
  }, [editingId, deleteCotizacion, navigate, toast]);

  /* ── Duplicar ── */
  const handleDuplicate = useCallback(() => {
    if (!editingId) return;
    const newId = duplicarCotizacion(editingId);
    toast({ title: "Cotización duplicada", status: "success", duration: 2500, position: "top-right" });
    navigate(`/cotizador/${newId}`);
  }, [editingId, duplicarCotizacion, navigate, toast]);

  /* ── Exportar PDF ── */
  const handlePDF = useCallback(async () => {
    const ok = await downloadPDF(
      `${cotConfig.numero || "cotizacion"}_FerreExpress`
    );
    if (ok) {
      toast({ title: "PDF descargado ✓", status: "success", duration: 2500, position: "top-right" });
    } else {
      toast({ title: "Error generando el PDF", status: "error", duration: 4000 });
    }
  }, [cotConfig.numero, downloadPDF, toast]);

  /* ── Helpers de binding ── */
  const E = (key) => ({
    value: empresa[key],
    onChange: (e) => setEmpresa((p) => ({ ...p, [key]: e.target.value })),
  });
  const C = (key) => ({
    value: cliente[key],
    onChange: (e) => setCliente((p) => ({ ...p, [key]: e.target.value })),
  });
  const Q = (key) => ({
    value: cotConfig[key],
    onChange: (e) => setCotConfig((p) => ({ ...p, [key]: e.target.value })),
  });

  /* ── Colores Chakra ── */
  const bg        = useColorModeValue("gray.50",        "blackAlpha.900");
  const border    = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const muted     = useColorModeValue("gray.600",       "gray.400");
  const mutedL    = useColorModeValue("gray.400",       "gray.600");
  const theadBg   = useColorModeValue("gray.800",       "gray.900");
  const theadClr  = useColorModeValue("white",          "gray.100");
  const tableBg   = useColorModeValue("white",          "blackAlpha.400");
  const stripeBg  = useColorModeValue("gray.50",        "blackAlpha.200");
  const inputBg   = useColorModeValue("white",          "blackAlpha.500");
  const totalBg   = useColorModeValue("gray.900",       "blackAlpha.700");
  const resumeBg  = useColorModeValue("gray.50",        "blackAlpha.400");
  const barBg     = useColorModeValue("white",          "gray.900");

  /* ── Props reutilizables de inputs ── */
  const inputProps = { size: "sm", rounded: "lg", bg: inputBg, focusBorderColor: FY };
  const selectSx   = {
    size: "sm", rounded: "lg", bg: inputBg, focusBorderColor: FY,
    sx: { option: { background: useColorModeValue("white", "#1A202C") } },
  };

  /* ── Documento PDF (siempre en DOM, oculto) ── */
  const docProps = { empresa, cot: cotConfig, cli: cliente, items, descG, totals, notas };

  /* ──────────────────────────────────────────────────────
     PREVIEW MODE
  ────────────────────────────────────────────────────── */
  if (isPreview) return (
    <Box minH="100vh" bg={useColorModeValue("gray.100","blackAlpha.900")}>
      {/* Nodo PDF oculto */}
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px"
        zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>

      {/* Barra */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        px={6} py={3} position="sticky" top={0} zIndex={10}
        backdropFilter="blur(18px)">
        <HStack justify="space-between">
          <HStack>
            <motion.div {...pressable(rm)}>
              <Button size="sm" variant="outline" rounded="xl"
                leftIcon={<FiArrowLeft />} onClick={() => setIsPreview(false)}>
                Volver al editor
              </Button>
            </motion.div>
            {cotConfig.numero && (
              <Badge colorScheme="yellow" rounded="full" px={3}>{cotConfig.numero}</Badge>
            )}
          </HStack>
          <motion.div {...pressable(rm)}>
            <Button size="sm" bg={DARK} color={FY} rounded="xl"
              leftIcon={<FiDownload />} isLoading={pdfLoading}
              loadingText="Generando…" _hover={{ bg: "#0f1a2b" }}
              onClick={handlePDF}>
              Descargar PDF
            </Button>
          </motion.div>
        </HStack>
      </Box>

      {/* Preview visual */}
      <Box maxW="860px" mx="auto" py={8} px={4}>
        <GlassCard rounded="xl" overflow="hidden">
          <DocContent {...docProps} />
        </GlassCard>
        <Flex justify="center" mt={6}>
          <motion.div {...pressable(rm)}>
            <Button size="lg" bg={DARK} color={FY} rounded="full" px={10}
              leftIcon={<FiDownload />} isLoading={pdfLoading}
              _hover={{ bg: "#0f1a2b" }} onClick={handlePDF}>
              Descargar PDF — {cotConfig.numero || "Borrador"}
            </Button>
          </motion.div>
        </Flex>
      </Box>
    </Box>
  );

  /* ──────────────────────────────────────────────────────
     EDITOR
  ────────────────────────────────────────────────────── */
  return (
    <Box minH="100vh" bg={bg} overflow="hidden">
      {/* Nodo PDF oculto */}
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px"
        zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>

      {/* ── TOPBAR ── */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={0} zIndex={100} backdropFilter="blur(18px)">
        <Flex maxW="1400px" mx="auto" px={6} h="54px" align="center" justify="space-between">
          <HStack spacing={3}>
            <Box bg={FY} rounded="lg" px={2} py={1}>
              <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.3">FE</Text>
            </Box>
            <Text fontWeight="800" fontSize="15px" letterSpacing="tight">
              FerreExpress{" "}
              <Text as="span" color={mutedL} fontWeight="400">· Cotizaciones</Text>
            </Text>
            {cotConfig.numero ? (
              <Badge colorScheme="yellow" rounded="full" fontSize="10px" px={3}>
                {cotConfig.numero}
              </Badge>
            ) : (
              <Tag size="sm" colorScheme="gray" rounded="full">Nueva</Tag>
            )}
            {editingId && (
              <Badge colorScheme="gray" variant="subtle" rounded="full" fontSize="9px">
                Editando
              </Badge>
            )}
          </HStack>

          <HStack spacing={2}>
            <Tooltip label="Ver historial" hasArrow>
              <motion.div {...pressable(rm)}>
                <IconButton size="sm" variant="outline" rounded="xl" aria-label="Historial"
                  icon={<FiList />} onClick={() => navigate("/historial")} />
              </motion.div>
            </Tooltip>
            {editingId && (
              <Tooltip label="Duplicar" hasArrow>
                <motion.div {...pressable(rm)}>
                  <IconButton size="sm" variant="outline" rounded="xl" aria-label="Duplicar"
                    icon={<FiCopy />} onClick={handleDuplicate} />
                </motion.div>
              </Tooltip>
            )}
            {editingId && (
              <Tooltip label="Eliminar cotización" hasArrow>
                <motion.div {...pressable(rm)}>
                  <IconButton size="sm" colorScheme="red" variant="ghost" rounded="xl"
                    aria-label="Eliminar" icon={<FiTrash2 />} onClick={onDeleteOpen} />
                </motion.div>
              </Tooltip>
            )}
            <motion.div {...pressable(rm)}>
              <Button size="sm" variant="outline" rounded="xl" leftIcon={<FiEye />}
                onClick={() => setIsPreview(true)}>
                Vista previa
              </Button>
            </motion.div>
            <motion.div {...pressable(rm)}>
              <Button size="sm" bg={DARK} color={FY} rounded="xl"
                leftIcon={<FiDownload />} isLoading={pdfLoading}
                loadingText="PDF…" _hover={{ bg: "#0f1a2b" }}
                onClick={handlePDF}>
                PDF
              </Button>
            </motion.div>
            <motion.div {...pressable(rm)}>
              <Button size="sm" colorScheme="yellow" rounded="xl"
                leftIcon={<FiSave />} isLoading={isSaving}
                loadingText="Guardando…" onClick={handleSave}>
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
            </motion.div>
          </HStack>
        </Flex>
      </Box>

      {/* ── GRID PRINCIPAL ── */}
      <Box maxW="1400px" mx="auto" px={6} py={5}
        h="calc(100vh - 54px)" overflow="hidden">
        <MotionBox
          h="full"
          display="grid"
          gridTemplateColumns="264px 1fr 280px"
          gap={4}
          initial="hidden"
          animate="show"
          variants={stagger(rm)}>

          {/* ══════════ COL 1: DATOS ══════════ */}
          <MotionBox variants={fadeUp(rm)}>
            <GlassCard rounded="2xl" h="full" overflow="hidden"
              display="flex" flexDirection="column">
              <Tabs variant="unstyled" size="sm" display="flex"
                flexDirection="column" h="full">
                <TabList borderBottom="1px solid" borderColor={border}
                  px={1} pt={1} gap={0.5}>
                  {[
                    { label: "Empresa",    icon: FiHome },
                    { label: "Cliente",    icon: FiUser },
                    { label: "Cotización", icon: FiFileText },
                  ].map(({ label, icon: Ic }) => (
                    <Tab key={label} flex={1} fontSize="9px" fontWeight="700"
                      letterSpacing="0.1em" textTransform="uppercase"
                      color={mutedL} pb={2.5}
                      _selected={{ color: useColorModeValue("gray.800","white"), borderBottom: `2px solid ${FY}`, mb: "-1px" }}>
                      <VStack spacing={1}>
                        <Icon as={Ic} boxSize={3.5} />
                        <Text>{label}</Text>
                      </VStack>
                    </Tab>
                  ))}
                </TabList>

                <TabPanels flex={1} overflow="hidden">

                  {/* ── Tab Empresa ── */}
                  <TabPanel h="full" overflowY="auto" p={4}
                    sx={{ "&::-webkit-scrollbar":{ w:"4px" }, "&::-webkit-scrollbar-thumb":{ bg:"gray.200", borderRadius:"2px" } }}>
                    {/* Logo placeholder */}
                    <Box border="1.5px dashed" borderColor={border} rounded="xl"
                      p={3} textAlign="center" mb={4}
                      _hover={{ borderColor: FY, bg: useColorModeValue("yellow.50","whiteAlpha.50") }}
                      transition="all .18s">
                      <Box as="img" src="/logo.jpg" h="38px" objectFit="contain"
                        mx="auto" mb={1}
                        onError={(e) => { e.target.style.display = "none"; }} />
                      <Text fontSize="9px" color={mutedL}>Logo: /public/logo.jpg</Text>
                    </Box>
                    <Stack spacing={3}>
                      <Box><FieldLabel icon={FiHome}>Nombre</FieldLabel><Input {...inputProps} {...E("nombre")} /></Box>
                      <Flex gap={2}>
                        <Box flex={1}><FieldLabel icon={FiHash}>NIT</FieldLabel><Input {...inputProps} {...E("nit")} /></Box>
                        <Box flex={1}><FieldLabel icon={FiMapPin}>Ciudad</FieldLabel><Input {...inputProps} {...E("ciudad")} /></Box>
                      </Flex>
                      <Box><FieldLabel icon={FiMapPin}>Dirección</FieldLabel><Input {...inputProps} {...E("dir")} /></Box>
                      <Flex gap={2}>
                        <Box flex={1}><FieldLabel icon={FiPhone}>Teléfono</FieldLabel><Input {...inputProps} {...E("tel")} /></Box>
                        <Box flex={1}><FieldLabel icon={FiMail}>Correo</FieldLabel><Input {...inputProps} {...E("correo")} /></Box>
                      </Flex>
                    </Stack>
                  </TabPanel>

                  {/* ── Tab Cliente ── */}
                  <TabPanel h="full" overflowY="auto" p={4}
                    sx={{ "&::-webkit-scrollbar":{ w:"4px" }, "&::-webkit-scrollbar-thumb":{ bg:"gray.200", borderRadius:"2px" } }}>
                    <Stack spacing={3}>
                      <Box><FieldLabel icon={FiUser}>Nombre / Razón social</FieldLabel><Input {...inputProps} placeholder="Nombre del cliente" {...C("nombre")} /></Box>
                      <Box><FieldLabel icon={FiHome}>Empresa</FieldLabel><Input {...inputProps} placeholder="Empresa" {...C("empresa")} /></Box>
                      <Flex gap={2}>
                        <Box flex={1}><FieldLabel icon={FiHash}>NIT / Cédula</FieldLabel><Input {...inputProps} {...C("nit")} /></Box>
                        <Box flex={1}><FieldLabel icon={FiMapPin}>Ciudad</FieldLabel><Input {...inputProps} {...C("ciudad")} /></Box>
                      </Flex>
                      <Box><FieldLabel icon={FiUser}>Persona de contacto</FieldLabel><Input {...inputProps} placeholder="Attn:" {...C("contacto")} /></Box>
                      <Flex gap={2}>
                        <Box flex={1}><FieldLabel icon={FiMail}>Correo</FieldLabel><Input {...inputProps} {...C("correo")} /></Box>
                        <Box flex={1}><FieldLabel icon={FiPhone}>Teléfono</FieldLabel><Input {...inputProps} {...C("tel")} /></Box>
                      </Flex>
                    </Stack>
                  </TabPanel>

                  {/* ── Tab Cotización ── */}
                  <TabPanel h="full" overflowY="auto" p={4}
                    sx={{ "&::-webkit-scrollbar":{ w:"4px" }, "&::-webkit-scrollbar-thumb":{ bg:"gray.200", borderRadius:"2px" } }}>
                    <Stack spacing={3}>
                      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em"
                        textTransform="uppercase" color={FY}>Identificación</Text>
                      <Flex gap={2}>
                        <Box flex={1}>
                          <FieldLabel icon={FiHash}>N° Cotización</FieldLabel>
                          <Input {...inputProps}
                            value={cotConfig.numero || ""}
                            placeholder="Se asigna al guardar"
                            onChange={(e) => setCotConfig((p) => ({ ...p, numero: e.target.value }))} />
                        </Box>
                        <Box flex={1}>
                          <FieldLabel icon={FiDollarSign}>Moneda</FieldLabel>
                          <Select {...selectSx}
                            value={cotConfig.moneda}
                            onChange={(e) => setCotConfig((p) => ({ ...p, moneda: e.target.value }))}>
                            {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                          </Select>
                        </Box>
                      </Flex>
                      <Flex gap={2}>
                        <Box flex={1}>
                          <FieldLabel icon={FiCalendar}>Fecha emisión</FieldLabel>
                          <Input {...inputProps} type="date" {...Q("fecha")} />
                        </Box>
                        <Box flex={1}>
                          <FieldLabel icon={FiCalendar}>Válida hasta</FieldLabel>
                          <Input {...inputProps} type="date" {...Q("vigencia")} />
                        </Box>
                      </Flex>

                      <Divider />
                      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em"
                        textTransform="uppercase" color={FY}>Condiciones</Text>

                      <Box>
                        <FieldLabel icon={FiDollarSign}>Forma de pago</FieldLabel>
                        <Select {...selectSx} value={cotConfig.formaPago}
                          onChange={(e) => setCotConfig((p) => ({ ...p, formaPago: e.target.value }))}>
                          {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                        </Select>
                      </Box>
                      <Box>
                        <FieldLabel icon={FiPackage}>Tiempo de entrega</FieldLabel>
                        <Input {...inputProps} placeholder="Ej: 3–5 días hábiles" {...Q("entrega")} />
                      </Box>
                      <Flex gap={2}>
                        <Box flex={1}>
                          <FieldLabel icon={FiPercent}>IVA (%)</FieldLabel>
                          <Select {...selectSx} value={cotConfig.iva}
                            onChange={(e) => setCotConfig((p) => ({ ...p, iva: Number(e.target.value) }))}>
                            {IVA_OPTS.map((v) => <option key={v} value={v}>{v}%</option>)}
                          </Select>
                        </Box>
                        <Box flex={1}>
                          <FieldLabel icon={FiTag}>Desc. global (%)</FieldLabel>
                          <Input {...inputProps} type="number" min="0" max="100"
                            value={descG}
                            onChange={(e) => setDescG(e.target.value)} />
                        </Box>
                      </Flex>

                      <Divider />
                      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em"
                        textTransform="uppercase" color={FY}>Estado</Text>
                      <Select {...selectSx} value={cotConfig.estado}
                        onChange={(e) => setCotConfig((p) => ({ ...p, estado: e.target.value }))}>
                        {[
                          {v:"borrador",  l:"Borrador"},
                          {v:"enviada",   l:"Enviada"},
                          {v:"aceptada",  l:"Aceptada"},
                          {v:"rechazada", l:"Rechazada"},
                        ].map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                      </Select>

                      <Divider />
                      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em"
                        textTransform="uppercase" color={FY}>Notas</Text>
                      <Textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                        fontSize="12px" rows={6} rounded="lg" focusBorderColor={FY}
                        resize="none" bg={inputBg} />
                    </Stack>
                  </TabPanel>

                </TabPanels>
              </Tabs>
            </GlassCard>
          </MotionBox>

          {/* ══════════ COL 2: TABLA DE PRODUCTOS ══════════ */}
          <MotionBox variants={fadeUp(rm)} display="flex" flexDirection="column" gap={3}>
            <Flex align="center" justify="space-between" flexShrink={0}>
              <HStack spacing={2}>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="800" fontSize="15px">Productos y servicios</Text>
                <Tag size="sm" borderRadius="full" variant="subtle" colorScheme="gray">
                  {items.length} ítem{items.length !== 1 ? "s" : ""}
                </Tag>
              </HStack>
              <motion.div {...pressable(rm)}>
                <Button size="sm" variant="outline" rounded="xl" leftIcon={<FiPlus />}
                  borderColor={border} _hover={{ borderColor: FY }}
                  onClick={addItem}>
                  Agregar
                </Button>
              </motion.div>
            </Flex>

            <GlassCard rounded="2xl" flex={1} overflow="hidden"
              display="flex" flexDirection="column">
              <Box overflowX="auto" overflowY="auto" flex={1}
                sx={{ "&::-webkit-scrollbar":{ w:"4px", h:"4px" }, "&::-webkit-scrollbar-thumb":{ bg:"gray.200", borderRadius:"2px" } }}>
                <Table size="sm" variant="simple">
                  <Thead position="sticky" top={0} zIndex={1}>
                    <Tr bg={theadBg}>
                      {[
                        { h:"#",          w:"32px" },
                        { h:"Ref.",        w:"76px" },
                        { h:"Descripción del producto / servicio" },
                        { h:"Cant.",       w:"60px", num:true },
                        { h:"Unidad",      w:"80px" },
                        { h:"P. Unitario", w:"116px",num:true },
                        { h:"Desc.%",      w:"64px", num:true },
                        { h:"Total",       w:"116px",num:true },
                        { h:"",            w:"32px" },
                      ].map(({ h, w, num }, i) => (
                        <Th key={i} color={theadClr} borderColor="transparent"
                          fontSize="9px" letterSpacing="wider" fontWeight="700"
                          isNumeric={num} w={w}>{h}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    <AnimatePresence>
                      {items.map((r, i) => (
                        <MotionTr key={r.id} layout
                          initial={{ opacity: 0, y: 6, filter:"blur(4px)" }}
                          animate={{ opacity: 1, y: 0, filter:"blur(0px)" }}
                          exit={{ opacity: 0, y: -4, filter:"blur(4px)" }}
                          transition={makeSpring(rm)}
                          bg={i % 2 === 0 ? tableBg : stripeBg}
                          _hover={{ bg: useColorModeValue("yellow.50","whiteAlpha.50") }}
                          style={{ display:"table-row" }}>

                          {/* # */}
                          <Td borderColor={border} color={mutedL} fontSize="11px" pl={3}>{i+1}</Td>

                          {/* Ref */}
                          <Td borderColor={border} p={1}>
                            <Input variant="unstyled" value={r.ref}
                              onChange={(e) => upItem(r.id,"ref",e.target.value)}
                              placeholder="—" fontSize="11px" color={mutedL}
                              px={2} py={1} rounded="md" w="68px"
                              _hover={{ bg:inputBg }}
                              _focus={{ bg:inputBg, boxShadow:`0 0 0 1.5px ${FY}44` }} />
                          </Td>

                          {/* Descripción */}
                          <Td borderColor={border} p={1}>
                            <Input variant="unstyled" value={r.desc}
                              onChange={(e) => upItem(r.id,"desc",e.target.value)}
                              placeholder="Nombre del producto o servicio…"
                              fontSize="13px" fontWeight="500"
                              px={2} py={1} rounded="md"
                              _hover={{ bg:inputBg }}
                              _focus={{ bg:inputBg, boxShadow:`0 0 0 1.5px ${FY}44` }} />
                          </Td>

                          {/* Cantidad */}
                          <Td borderColor={border} p={1} isNumeric>
                            <Input variant="unstyled" type="number" min="0.01"
                              value={r.qty}
                              onChange={(e) => upItem(r.id,"qty",e.target.value)}
                              textAlign="center" fontWeight="700" fontSize="13px"
                              px={1} py={1} rounded="md" w="52px"
                              _hover={{ bg:inputBg }}
                              _focus={{ bg:inputBg, boxShadow:`0 0 0 1.5px ${FY}44` }} />
                          </Td>

                          {/* Unidad */}
                          <Td borderColor={border} p={1}>
                            <select value={r.unit}
                              onChange={(e) => upItem(r.id,"unit",e.target.value)}
                              style={{ background:"transparent", border:"none", fontSize:11,
                                color: muted === "gray.600" ? "#555":"#aaa",
                                width:76, cursor:"pointer", outline:"none", padding:"5px 2px" }}>
                              {UNITS.map((u) => <option key={u}>{u}</option>)}
                            </select>
                          </Td>

                          {/* Precio */}
                          <Td borderColor={border} p={1} isNumeric>
                            <Input variant="unstyled" type="number" min="0"
                              value={r.price}
                              onChange={(e) => upItem(r.id,"price",e.target.value)}
                              placeholder="0" textAlign="right" fontSize="13px"
                              px={2} py={1} rounded="md" w="108px"
                              _hover={{ bg:inputBg }}
                              _focus={{ bg:inputBg, boxShadow:`0 0 0 1.5px ${FY}44` }} />
                          </Td>

                          {/* Descuento */}
                          <Td borderColor={border} p={1} isNumeric>
                            <Input variant="unstyled" type="number" min="0" max="100"
                              value={r.disc}
                              onChange={(e) => upItem(r.id,"disc",e.target.value)}
                              textAlign="center" fontSize="12px" color={mutedL}
                              px={1} py={1} rounded="md" w="52px"
                              _hover={{ bg:inputBg }}
                              _focus={{ bg:inputBg, boxShadow:`0 0 0 1.5px ${FY}44` }} />
                          </Td>

                          {/* Total fila */}
                          <Td borderColor={border} isNumeric pr={3}>
                            <Text fontWeight="800" fontSize="14px"
                              fontVariantNumeric="tabular-nums">
                              {money(calcRow(r), cotConfig.moneda)}
                            </Text>
                          </Td>

                          {/* Eliminar */}
                          <Td borderColor={border} p={1}>
                            <Tooltip label="Eliminar ítem" hasArrow>
                              <motion.div {...pressable(rm)} style={{ display:"inline-block" }}>
                                <IconButton size="xs" variant="ghost" colorScheme="red"
                                  rounded="lg" aria-label="Eliminar"
                                  icon={<FiTrash2 size={12} />}
                                  onClick={() => removeItem(r.id)}
                                  isDisabled={items.length === 1} />
                              </motion.div>
                            </Tooltip>
                          </Td>
                        </MotionTr>
                      ))}
                    </AnimatePresence>
                  </Tbody>
                </Table>
              </Box>

              {/* Footer de tabla */}
              <Box borderTop="1px solid" borderColor={border} px={4} py={2} flexShrink={0}>
                <Button size="xs" variant="ghost" colorScheme="yellow"
                  leftIcon={<FiPlus />} onClick={addItem} fontWeight="700">
                  Agregar producto
                </Button>
              </Box>
            </GlassCard>
          </MotionBox>

          {/* ══════════ COL 3: RESUMEN EN VIVO ══════════ */}
          <MotionBox variants={fadeUp(rm)}>
            <Box bg={DARK} rounded="2xl" h="full" display="flex"
              flexDirection="column" overflow="hidden"
              border="1px solid" borderColor="whiteAlpha.100">

              {/* Encabezado */}
              <Box px={5} pt={5} pb={3}>
                <Text fontWeight="300" fontSize="20px" color="white" letterSpacing="0.03em">
                  Resumen
                </Text>
                <Text fontSize="9px" color="whiteAlpha.400" letterSpacing="wider"
                  textTransform="uppercase">
                  {cotConfig.numero || "Sin guardar"} · {fmtDate(cotConfig.fecha)}
                </Text>
              </Box>
              <Box h="1px" bg="whiteAlpha.100" mx={5} />

              {/* Cliente */}
              <Box px={5} py={4}>
                <Text fontSize="9px" color="whiteAlpha.400" letterSpacing="wider"
                  textTransform="uppercase" mb={1}>Para</Text>
                <Text fontSize="17px" color="white" fontWeight="500" lineHeight="1.3">
                  {cliente.nombre || (
                    <Text as="span" color="whiteAlpha.300" fontStyle="italic" fontSize="15px">
                      Sin cliente
                    </Text>
                  )}
                </Text>
                {cliente.empresa && <Text fontSize="11px" color="whiteAlpha.500" mt={0.5}>{cliente.empresa}</Text>}
                {cliente.ciudad  && <Text fontSize="11px" color="whiteAlpha.500">{cliente.ciudad}</Text>}
              </Box>
              <Box h="1px" bg="whiteAlpha.100" mx={5} />

              {/* Lista de ítems */}
              <Box flex={1} overflowY="auto" px={5} py={3}
                sx={{ "&::-webkit-scrollbar":{ w:"3px" }, "&::-webkit-scrollbar-thumb":{ bg:"whiteAlpha.200" } }}>
                <AnimatePresence>
                  {items.filter((r) => r.desc || r.price).length === 0 ? (
                    <Text fontSize="12px" color="whiteAlpha.300" fontStyle="italic">
                      Agrega productos en la tabla…
                    </Text>
                  ) : (
                    items.filter((r) => r.desc || r.price).map((r) => (
                      <MotionBox key={r.id} layout
                        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        transition={makeSpring(rm)}>
                        <Flex justify="space-between" align="flex-start"
                          py={2} borderBottom="1px solid" borderColor="whiteAlpha.60" gap={2}>
                          <Box flex={1} minW={0}>
                            <Text fontSize="12px" color="whiteAlpha.800" noOfLines={1}>
                              {r.desc || "Sin nombre"}
                            </Text>
                            <Text fontSize="10px" color="whiteAlpha.400">
                              {r.qty} {r.unit}{r.disc > 0 ? ` · ${r.disc}% desc.` : ""}
                            </Text>
                          </Box>
                          <Text fontSize="13px" fontWeight="700" color={FY}
                            whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                            {money(calcRow(r), cotConfig.moneda)}
                          </Text>
                        </Flex>
                      </MotionBox>
                    ))
                  )}
                </AnimatePresence>
              </Box>

              {/* Totales */}
              <Box bg="blackAlpha.300" px={5} py={4}>
                <Stack spacing={1.5}>
                  {[
                    { l:"Subtotal",          v: money(totals.subtotal, cotConfig.moneda) },
                    parseFloat(descG) > 0 && { l:`Descuento (${descG}%)`, v:`− ${money(totals.descGAmt, cotConfig.moneda)}`, red:true },
                    { l:"Base gravable",     v: money(totals.base, cotConfig.moneda) },
                    { l:`IVA (${cotConfig.iva}%)`, v: money(totals.ivaAmt, cotConfig.moneda) },
                  ].filter(Boolean).map(({ l, v, red }) => (
                    <Flex key={l} justify="space-between" align="center">
                      <Text fontSize="11px" color="whiteAlpha.500">{l}</Text>
                      <Text fontSize="12px" color={red ? "red.300" : "whiteAlpha.700"}
                        fontWeight="500" fontVariantNumeric="tabular-nums">{v}</Text>
                    </Flex>
                  ))}
                </Stack>
                <Box h="1px" bg={`${FY}44`} my={3} />
                <Flex justify="space-between" align="flex-end">
                  <Text fontSize="14px" color="whiteAlpha.500" fontStyle="italic">Total</Text>
                  <Text fontSize="28px" fontWeight="800" color={FY}
                    lineHeight="1" fontVariantNumeric="tabular-nums">
                    {money(totals.total, cotConfig.moneda)}
                  </Text>
                </Flex>
              </Box>

              {/* Acciones */}
              <Box px={5} py={4}>
                <motion.div {...pressable(rm)}>
                  <Button w="full" bg={FY} color={DARK} rounded="xl"
                    fontWeight="800" fontSize="12px" letterSpacing="wider"
                    textTransform="uppercase" mb={2}
                    onClick={() => setIsPreview(true)}
                    _hover={{ bg:"#e0b310", transform:"translateY(-1px)" }}>
                    Ver cotización →
                  </Button>
                </motion.div>
                <motion.div {...pressable(rm)}>
                  <Button w="full" colorScheme="yellow" variant="solid" rounded="xl"
                    fontSize="11px" leftIcon={<FiSave />}
                    isLoading={isSaving} loadingText="Guardando…"
                    onClick={handleSave}>
                    {editingId ? "Actualizar cotización" : "Guardar cotización"}
                  </Button>
                </motion.div>
              </Box>
            </Box>
          </MotionBox>

        </MotionBox>
      </Box>

      {/* ── AlertDialog: Eliminar ── */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="2xl">
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              Esta acción no se puede deshacer. ¿Estás seguro?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} rounded="xl">Cancelar</Button>
              <Button colorScheme="red" ml={3} rounded="xl" onClick={() => { onDeleteClose(); handleDelete(); }}>
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}