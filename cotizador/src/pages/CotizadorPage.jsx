/**
 * CotizadorPage.jsx  v9
 */
import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Stack, Text, Divider, Icon, Badge, Tag,
  Button, IconButton, Tooltip, Input, Select, Textarea,
  Table, Thead, Tbody, Tr, Th, Td,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useColorModeValue, usePrefersReducedMotion, useToast, useDisclosure,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Kbd,
  Progress,
} from "@chakra-ui/react";
import {
  FiPlus, FiTrash2, FiSave, FiDownload, FiEye,
  FiList, FiCopy, FiHome, FiUser, FiFileText,
  FiPackage, FiUpload, FiAlertCircle, FiRefreshCw,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCotizaciones }       from "../hooks/useCotizaciones";
import { usePDF }                from "../hooks/usePDF";
import { useProductosFrecuentes, aprenderProductos } from "../hooks/useProductosFrecuentes";
import AutocompleteInput          from "../components/AutocompleteInput";
import DocContent                 from "../components/DocContent";
import {
  blankRow, calcRow, calcTotals, money, fmtDate,
  precioBase, ivaUnidad,
  UNITS, FORMAS_PAGO, IVA_OPTS, MONEDAS,
  DEFAULT_CLIENTE, DEFAULT_CONFIG, DEFAULT_NOTAS,
  saveEmpresaLocal, loadEmpresaLocal,
} from "../utils";

const FY   = "#F9BF20";
const DARK = "#3A3A38";
const RED  = "#E21219";
const FIELD_ORDER = ["desc", "qty", "price", "disc"];

const MotionBox = motion(Box);
const MotionTr  = motion(Tr);
const spr = (r) => r ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32, mass: 0.7 };

/* ─── GlassCard ─── */
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

function FL({ children, required }) {
  const c = useColorModeValue("gray.500", "gray.400");
  return (
    <Text fontSize="9px" fontWeight="700" letterSpacing="0.11em"
      textTransform="uppercase" color={c} mb="4px">
      {children}{required && <Text as="span" color="red.400" ml={0.5}>*</Text>}
    </Text>
  );
}

/* ─── Logo con fallback encadenado ─── */
function AppLogo({ src, h = "32px" }) {
  // Inicializar fase directo sin useEffect para evitar setState-in-effect
  const [phase, setPhase] = useState(() => (src ? 0 : 1));
  // Solo actualizar cuando src cambia de undefined/null a un valor o viceversa
  const prevSrcRef = useRef(src);
  if (prevSrcRef.current !== src) {
    prevSrcRef.current = src;
    // Actualización síncrona durante render (permitida en React cuando es condicional a prop)
    const newPhase = src ? 0 : 1;
    if (phase !== newPhase) setPhase(newPhase);
  }
  if (phase === 0 && src)
    return <Box as="img" src={src} h={h} objectFit="contain" onError={() => setPhase(1)} />;
  if (phase === 1)
    return <Box as="img" src="/logo.jpg" h={h} objectFit="contain" onError={() => setPhase(2)} />;
  return (
    <Box bg={FY} rounded="md" px={2} py="3px">
      <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.4">FE</Text>
    </Box>
  );
}

function focusTableInput(containerEl, rowId, field) {
  if (!containerEl) return;
  const el = containerEl.querySelector(`input[data-row-id="${rowId}"][data-field="${field}"]`);
  if (el) { el.focus(); el.select(); }
}

/* ════════════════════════════════════════════════════════
   PANELES — fuera del componente principal para evitar
   que se destruyan en cada render (fix bug inputs)
════════════════════════════════════════════════════════ */
const PanelEmpresa = memo(function PanelEmpresa({ empresa, setEmpresa, border, mutedL, inputBg }) {
  const logoRef = useRef();
  const ip = { size: "sm", rounded: "md", bg: inputBg, focusBorderColor: FY };
  const panelBg = useColorModeValue("gray.50", "blackAlpha.200");

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("El logo no puede superar 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEmpresa((p) => ({ ...p, logo: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const E = (k) => ({
    value: empresa[k] ?? "",
    onChange: (e) => setEmpresa((p) => ({ ...p, [k]: e.target.value })),
  });

  return (
    <Box p={4}>
      <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoFile} />
      <Box border="1.5px dashed" borderColor={border} rounded="lg" p={3} textAlign="center" mb={4} bg={panelBg}>
        <Box display="flex" justifyContent="center" mb={2}>
          <AppLogo src={empresa.logo} h="48px" />
        </Box>
        <Button size="xs" variant="outline" rounded="md" leftIcon={<FiUpload size={11} />}
          onClick={() => logoRef.current?.click()}>
          {empresa.logo ? "Cambiar logo" : "Cargar logo"}
        </Button>
        <Text fontSize="9px" color={mutedL} mt={1}>PNG · JPG · SVG · Máx. 2MB</Text>
      </Box>
      <Stack spacing={3}>
        <Box><FL>Nombre empresa</FL><Input {...ip} {...E("nombre")} placeholder="Ej: Mi Empresa S.A.S." /></Box>
        <Flex gap={2}>
          <Box flex={1}><FL>NIT</FL><Input {...ip} {...E("nit")} placeholder="000.000.000-0" /></Box>
          <Box flex={1}><FL>Ciudad</FL><Input {...ip} {...E("ciudad")} placeholder="Ej: Cali" /></Box>
        </Flex>
        <Box><FL>Dirección</FL><Input {...ip} {...E("dir")} placeholder="Calle, carrera…" /></Box>
        <Flex gap={2}>
          <Box flex={1}><FL>Teléfono</FL><Input {...ip} {...E("tel")} placeholder="+57 3XX…" /></Box>
          <Box flex={1}><FL>Correo</FL><Input {...ip} {...E("correo")} placeholder="correo@empresa.com" type="email" /></Box>
        </Flex>
      </Stack>
    </Box>
  );
});

const PanelCliente = memo(function PanelCliente({ cliente, setCliente, inputBg }) {
  const ip = { size: "sm", rounded: "md", bg: inputBg, focusBorderColor: FY };
  const C = (k) => ({
    value: cliente[k] ?? "",
    onChange: (e) => setCliente((p) => ({ ...p, [k]: e.target.value })),
  });
  return (
    <Stack spacing={3} p={4}>
      <Box><FL required>Nombre / Razón social</FL><Input {...ip} placeholder="Ej: Juan García" {...C("nombre")} /></Box>
      <Box><FL>Empresa</FL><Input {...ip} placeholder="Ej: Constructora XYZ" {...C("empresa")} /></Box>
      <Flex gap={2}>
        <Box flex={1}><FL>NIT / Cédula</FL><Input {...ip} {...C("nit")} /></Box>
        <Box flex={1}><FL>Ciudad</FL><Input {...ip} placeholder="Ej: Cali" {...C("ciudad")} /></Box>
      </Flex>
      <Box><FL>Persona de contacto</FL><Input {...ip} placeholder="Attn: nombre" {...C("contacto")} /></Box>
      <Flex gap={2}>
        <Box flex={1}><FL>Correo</FL><Input {...ip} placeholder="correo@ejemplo.com" {...C("correo")} type="email" /></Box>
        <Box flex={1}><FL>Teléfono</FL><Input {...ip} placeholder="3XX XXX XXXX" {...C("tel")} /></Box>
      </Flex>
    </Stack>
  );
});

const PanelCotizacion = memo(function PanelCotizacion({
  cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas, inputBg,
}) {
  const ip = { size: "sm", rounded: "md", bg: inputBg, focusBorderColor: FY };
  const sp = { size: "sm", rounded: "md", bg: inputBg, focusBorderColor: FY };
  const numBg    = useColorModeValue("gray.100", "gray.700");
  const numBc    = useColorModeValue("gray.200", "gray.600");
  const numColor = useColorModeValue("gray.400", "gray.500");
  const Q = (k) => ({
    value: cotConfig[k] ?? "",
    onChange: (e) => setCotConfig((p) => ({ ...p, [k]: e.target.value })),
  });
  return (
    <Stack spacing={3} p={4}>
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Identificación
      </Text>
      <Box>
        <Box px={3} py="7px" rounded="md" bg={numBg} border="1px solid" borderColor={numBc}>
          <Text fontSize="sm" fontWeight="700" color={cotConfig.numero ? FY : numColor}>
            {cotConfig.numero || "Se asigna al guardar"}
          </Text>
        </Box>
      </Box>
      <Box>
        <FL>Moneda</FL>
        <Select {...sp} value={cotConfig.moneda}
          onChange={(e) => setCotConfig((p) => ({ ...p, moneda: e.target.value }))}>
          {MONEDAS.map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Box>
      <Box><FL>Fecha de emisión</FL><Input {...ip} type="date" {...Q("fecha")} /></Box>
      <Box><FL>Válida hasta</FL><Input {...ip} type="date" {...Q("vigencia")} /></Box>
      <Divider />
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Condiciones
      </Text>
      <Box>
        <FL>Forma de pago</FL>
        <Select {...sp} value={cotConfig.formaPago}
          onChange={(e) => setCotConfig((p) => ({ ...p, formaPago: e.target.value }))}>
          {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
        </Select>
      </Box>
      <Flex gap={2}>
        <Box flex={1}>
          <FL>IVA (%)</FL>
          <Select {...sp} value={cotConfig.iva}
            onChange={(e) => setCotConfig((p) => ({ ...p, iva: Number(e.target.value) }))}>
            {IVA_OPTS.map((v) => <option key={v} value={v}>{v}%</option>)}
          </Select>
        </Box>
        <Box flex={1}>
          <FL>Desc. global (%)</FL>
          <Input {...ip} type="number" min="0" max="100" value={descLocal}
            onChange={(e) => {
              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
              setDescLocal(String(v));
            }} />
        </Box>
      </Flex>
      <Divider />
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Notas
      </Text>
      <Textarea value={notas} onChange={(e) => setNotas(e.target.value)}
        fontSize="11px" rows={6} rounded="md" focusBorderColor={FY} resize="none" bg={inputBg} />
    </Stack>
  );
});

/* ════════════════════════════════════════════════════════
   MOBILE STEPPER
════════════════════════════════════════════════════════ */
const STEPS = ["Empresa", "Cliente", "Productos", "Config"];

const MobileStepper = memo(function MobileStepper({ step, totalSteps, onPrev, onNext, label }) {
  const dotBg   = useColorModeValue("gray.200", "gray.600");
  const barBg   = useColorModeValue("gray.100", "gray.700");
  return (
    <Box px={4} pt={3} pb={2}>
      <Flex align="center" justify="space-between" mb={2}>
        <IconButton size="sm" variant="ghost" rounded="full" icon={<FiChevronLeft />}
          onClick={onPrev} isDisabled={step === 0} aria-label="Paso anterior" />
        <VStack spacing={0}>
          <Text fontSize="11px" fontWeight="700" color={FY} letterSpacing="wider" textTransform="uppercase">
            Paso {step + 1} de {totalSteps}
          </Text>
          <Text fontSize="13px" fontWeight="800">{label}</Text>
        </VStack>
        <IconButton size="sm" variant="ghost" rounded="full" icon={<FiChevronRight />}
          onClick={onNext} isDisabled={step === totalSteps - 1} aria-label="Paso siguiente" />
      </Flex>
      <Progress value={((step + 1) / totalSteps) * 100} size="xs" rounded="full"
        bg={barBg} sx={{ "& > div": { background: FY } }} />
      <Flex justify="center" gap={1.5} mt={2}>
        {STEPS.map((_, i) => (
          <Box key={i} w={i === step ? "18px" : "6px"} h="6px" rounded="full"
            bg={i === step ? FY : dotBg} transition="all 0.2s" />
        ))}
      </Flex>
    </Box>
  );
});

/* ════════════════════════════════════════════════════════
   FILA DE TABLA — componente separado para evitar hooks
   condicionales dentro de .map()
════════════════════════════════════════════════════════ */
function ItemRow({ r, i, showAllCols, border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, cotConfig, rm, upItem, removeItem, handleAcceptSugerencia, getSugerencias, itemsLen }) {
  const hoverBg = useColorModeValue("yellow.50", "whiteAlpha.50");
  const rowBg   = i % 2 === 0 ? tableBg : stripeBg;
  const p       = parseFloat(r.price) || 0;
  const pSin    = precioBase(p, ivaRate);
  const pIva    = ivaUnidad(p, ivaRate);

  return (
    <MotionTr layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={spr(rm)}
      bg={rowBg} _hover={{ bg: hoverBg }} style={{ display: "table-row" }}>

      <Td borderColor={border} color={mutedL} fontSize="11px" pl={3}>{i + 1}</Td>

      {showAllCols && (
        <Td borderColor={border} p={1}>
          <Input variant="unstyled" value={r.ref} onChange={(e) => upItem(r.id, "ref", e.target.value)}
            data-row-id={r.id} data-field="ref"
            placeholder="—" fontSize="11px" color={mutedL} px={2} py={1} rounded="md" w="54px"
            _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
        </Td>
      )}

      <Td borderColor={border} p={1}>
        <AutocompleteInput
          value={r.desc}
          onChange={(val) => upItem(r.id, "desc", val)}
          onAccept={(sug) => handleAcceptSugerencia(r.id, sug)}
          getSugerencias={getSugerencias}
          dataRowId={r.id}
          inputBg={inputBg}
          FY={FY}
        />
      </Td>

      <Td borderColor={border} p={1} isNumeric>
        <Input variant="unstyled" type="number" min="1" value={r.qty}
          onChange={(e) => upItem(r.id, "qty", e.target.value)}
          data-row-id={r.id} data-field="qty"
          textAlign="center" fontWeight="700" fontSize="12px" px={1} py={1} rounded="md" w="44px"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>

      {showAllCols && (
        <Td borderColor={border} p={1}>
          <select value={r.unit} onChange={(e) => upItem(r.id, "unit", e.target.value)}
            style={{ background: "transparent", border: "none", fontSize: 11, color: "#777", width: 50, cursor: "pointer", outline: "none", padding: "4px 1px" }}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Td>
      )}

      {showAllCols && (
        <Td borderColor={border} isNumeric pr={2}>
          <Text fontSize="11px" color={mutedL} tabIndex={-1}>{p > 0 ? money(pSin, cotConfig.moneda) : "—"}</Text>
        </Td>
      )}
      {showAllCols && (
        <Td borderColor={border} isNumeric pr={2}>
          <Text fontSize="11px" color={mutedL} tabIndex={-1}>{p > 0 ? money(pIva, cotConfig.moneda) : "—"}</Text>
        </Td>
      )}

      <Td borderColor={border} p={1} isNumeric>
        <Input variant="unstyled" type="number" min="0" value={r.price}
          onChange={(e) => upItem(r.id, "price", e.target.value)}
          data-row-id={r.id} data-field="price"
          placeholder="0" textAlign="right" fontSize="12px" fontWeight="600"
          px={2} py={1} rounded="md" w={showAllCols ? "78px" : "80px"}
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>

      {showAllCols && (
        <Td borderColor={border} p={1} isNumeric>
          <Input variant="unstyled" type="number" min="0" max="100" value={r.disc}
            onChange={(e) => upItem(r.id, "disc", e.target.value)}
            data-row-id={r.id} data-field="disc"
            textAlign="center" fontSize="11px" color={mutedL} px={1} py={1} rounded="md" w="44px"
            _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
        </Td>
      )}

      <Td borderColor={border} isNumeric pr={2}>
        <Text fontWeight="700" fontSize="12px" tabIndex={-1}>{money(calcRow(r), cotConfig.moneda)}</Text>
      </Td>
      <Td borderColor={border} p={1}>
        <IconButton size="xs" variant="ghost" colorScheme="red" rounded="md"
          aria-label="Eliminar fila" tabIndex={-1}
          icon={<FiTrash2 size={12} />} onClick={() => removeItem(r.id)}
          isDisabled={itemsLen === 1} />
      </Td>
    </MotionTr>
  );
}

/* ════════════════════════════════════════════════════════
   TABLA DE PRODUCTOS — componente propio
════════════════════════════════════════════════════════ */
const TablaProductos = memo(function TablaProductos({
  items, showAllCols, tableRef, handleTableKeyDown,
  border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, cotConfig, rm, upItem, removeItem,
  handleAcceptSugerencia, getSugerencias, addItem,
}) {
  const addBtnHover = useColorModeValue("yellow.50", "whiteAlpha.100");
  const theadBg = "#3A3A38";
  const colsHeader = showAllCols
    ? [{ h: "#", w: "28px" }, { h: "Ref.", w: "60px" }, { h: "Descripción" },
       { h: "Cant.", w: "52px", num: true }, { h: "Und.", w: "54px" },
       { h: "P. s/IVA", w: "82px", num: true }, { h: "IVA", w: "68px", num: true },
       { h: "P. c/IVA", w: "84px", num: true }, { h: "Desc.%", w: "50px", num: true },
       { h: "Total", w: "88px", num: true }, { h: "", w: "28px" }]
    : [{ h: "#", w: "24px" }, { h: "Producto" }, { h: "Cant.", w: "52px", num: true },
       { h: "P. c/IVA", w: "84px", num: true }, { h: "Total", w: "80px", num: true }, { h: "", w: "28px" }];

  const colSpan = colsHeader.length;

  return (
    <Box
      ref={tableRef}
      overflowX="auto"
      overflowY={showAllCols ? "auto" : undefined}
      flex={showAllCols ? 1 : undefined}
      onKeyDown={handleTableKeyDown}
      sx={{ "&::-webkit-scrollbar": { w: "4px", h: "4px" }, "&::-webkit-scrollbar-thumb": { bg: "gray.200", borderRadius: "2px" } }}>
      <Table size="sm" variant="simple">
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr bg={theadBg}>
            {colsHeader.map(({ h, w, num }, i) => (
              <Th key={i} color={FY} borderColor="transparent" fontSize="8px"
                letterSpacing="wider" fontWeight="700" isNumeric={num} w={w}>{h}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          <AnimatePresence>
            {items.map((r, i) => (
              <ItemRow key={r.id} r={r} i={i} showAllCols={showAllCols}
                border={border} mutedL={mutedL} inputBg={inputBg}
                tableBg={tableBg} stripeBg={stripeBg}
                ivaRate={ivaRate} cotConfig={cotConfig} rm={rm}
                upItem={upItem} removeItem={removeItem}
                handleAcceptSugerencia={handleAcceptSugerencia}
                getSugerencias={getSugerencias}
                itemsLen={items.length} />
            ))}
          </AnimatePresence>
          <Tr>
            <Td colSpan={colSpan} borderColor={border} px={3} py={2}>
              <Button size="xs" variant="ghost" leftIcon={<FiPlus />} onClick={addItem}
                fontWeight="700" color={FY} tabIndex={-1} _hover={{ bg: addBtnHover }}>
                + Agregar producto
              </Button>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
});

/* ════════════════════════════════════════════════════════
   RESUMEN (panel derecho)
════════════════════════════════════════════════════════ */
function ResumenDesktop({ items, cotConfig, totals, descGNum, cliente, rm, safeNavigate, handleSave, isSaving, hasChanges }) {
  return (
    <Box bg={DARK} rounded="xl" overflow="hidden" display="flex" flexDirection="column"
      border="1px solid" borderColor="whiteAlpha.100" h="full">
      <Box px={5} pt={5} pb={3}>
        <Text fontWeight="300" fontSize="18px" color="white">Resumen</Text>
        <Text fontSize="9px" color="whiteAlpha.400" letterSpacing="wider" textTransform="uppercase">
          {cotConfig.numero || "Sin número"} · {fmtDate(cotConfig.fecha)}
        </Text>
      </Box>
      <Box h="1px" bg="whiteAlpha.100" mx={5} />
      <Box px={5} py={3}>
        <Text fontSize="9px" color="whiteAlpha.400" letterSpacing="wider" textTransform="uppercase" mb={1}>Para</Text>
        <Text fontSize="14px" color="white" fontWeight="500" noOfLines={1}>
          {cliente.nombre || <Text as="span" color="whiteAlpha.300" fontStyle="italic" fontSize="13px">Sin cliente</Text>}
        </Text>
        {cliente.empresa && <Text fontSize="11px" color="whiteAlpha.500" noOfLines={1}>{cliente.empresa}</Text>}
      </Box>
      <Box h="1px" bg="whiteAlpha.100" mx={5} />
      <Box flex={1} overflowY="auto" px={5} py={3}
        sx={{ "&::-webkit-scrollbar": { w: "3px" }, "&::-webkit-scrollbar-thumb": { bg: "whiteAlpha.200" } }}>
        <AnimatePresence>
          {items.filter((r) => r.desc || r.price).length === 0
            ? <Text fontSize="11px" color="whiteAlpha.300" fontStyle="italic">Agrega productos →</Text>
            : items.filter((r) => r.desc || r.price).map((r) => (
              <MotionBox key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spr(rm)}>
                <Flex justify="space-between" align="flex-start" py={2}
                  borderBottom="1px solid" borderColor="whiteAlpha.100" gap={2}>
                  <Box flex={1} minW={0}>
                    <Text fontSize="12px" color="whiteAlpha.800" noOfLines={1}>{r.desc || "Sin nombre"}</Text>
                    <Text fontSize="10px" color="whiteAlpha.400">
                      {r.qty} {r.unit}{parseFloat(r.disc) > 0 ? ` · ${r.disc}% desc.` : ""}
                    </Text>
                  </Box>
                  <Text fontSize="12px" fontWeight="700" color={FY} whiteSpace="nowrap">
                    {money(calcRow(r), cotConfig.moneda)}
                  </Text>
                </Flex>
              </MotionBox>
            ))}
        </AnimatePresence>
      </Box>
      <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} size="lg" />
      <Box px={5} py={4}>
        <Button w="full" bg={FY} color={DARK} rounded="lg" fontWeight="700" mb={2}
          onClick={() => safeNavigate("preview")} _hover={{ bg: "#e0b010" }}>
          Ver cotización →
        </Button>
        <Button w="full" bg={hasChanges ? "whiteAlpha.200" : "whiteAlpha.100"} color="white"
          rounded="lg" leftIcon={<FiSave />} isLoading={isSaving} onClick={handleSave}
          _hover={{ bg: "whiteAlpha.300" }}>
          Guardar
        </Button>
      </Box>
    </Box>
  );
}

function ResumenTotales({ totals, cotConfig, descGNum, size = "md" }) {
  const fs = size === "lg" ? "11px" : "10px";
  const fv = size === "lg" ? "11px" : "10px";
  const fTotal = size === "lg" ? "24px" : "18px";
  return (
    <Box bg="blackAlpha.300" px={5} py={size === "lg" ? 4 : 3}>
      <Stack spacing={1.5}>
        <Flex justify="space-between">
          <Text fontSize={fs} color="whiteAlpha.400">Total Bruto (sin IVA)</Text>
          <Text fontSize={fv} color="whiteAlpha.600" fontWeight="500">{money(totals.totalBruto, cotConfig.moneda)}</Text>
        </Flex>
        {descGNum > 0 && (
          <Flex justify="space-between">
            <Text fontSize={fs} color="whiteAlpha.400">Descuento ({descGNum}%)</Text>
            <Text fontSize={fv} color="red.300" fontWeight="500">− {money(totals.descGAmt, cotConfig.moneda)}</Text>
          </Flex>
        )}
        <Flex justify="space-between">
          <Text fontSize={fs} color="whiteAlpha.400">IVA {cotConfig.iva}%</Text>
          <Text fontSize={fv} color="whiteAlpha.600" fontWeight="500">{money(totals.ivaTotal, cotConfig.moneda)}</Text>
        </Flex>
      </Stack>
      <Box h="1px" bg={`${FY}44`} my={3} />
      <Flex justify="space-between" align="flex-end">
        <Text fontSize="11px" color="whiteAlpha.500">Total a Pagar</Text>
        <Text fontSize={fTotal} fontWeight="800" color={FY} lineHeight="1" fontVariantNumeric="tabular-nums">
          {money(totals.totalPagar, cotConfig.moneda)}
        </Text>
      </Flex>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════ */
export default function CotizadorPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const rm       = usePrefersReducedMotion();
  const cancelRef = useRef();
  const tableRef  = useRef(null);
  const handleSaveRef = useRef(null); // para Ctrl+S sin closure stale

  const { getCotizacion, saveCotizacion, deleteCotizacion, duplicarCotizacion } = useCotizaciones();
  const { downloadPDF, loading: pdfLoading } = usePDF("cotizacion-pdf");
  const { getSugerencias } = useProductosFrecuentes();

  const [empresa,    setEmpresaState] = useState(() => loadEmpresaLocal());
  const [cliente,    setCliente]      = useState(DEFAULT_CLIENTE);
  const [cotConfig,  setCotConfig]    = useState(DEFAULT_CONFIG);
  const [items,      setItems]        = useState([blankRow(), blankRow()]);
  const [notas,      setNotas]        = useState(DEFAULT_NOTAS);
  const [isSaving,   setIsSaving]     = useState(false);
  const [editingId,  setEditingId]    = useState(null);
  const [isPreview,  setIsPreview]    = useState(false);
  const [hasChanges, setHasChanges]   = useState(false);
  const [descLocal,  setDescLocal]    = useState("0");
  const [pendingNav, setPendingNav]   = useState(null);
  const [mobileStep, setMobileStep]   = useState(0);

  const { isOpen: isDelOpen,  onOpen: onDelOpen,  onClose: onDelClose  } = useDisclosure();
  const { isOpen: isExitOpen, onOpen: onExitOpen, onClose: onExitClose } = useDisclosure();

  const setEmpresa = useCallback((updater) => {
    setEmpresaState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveEmpresaLocal(next);
      return next;
    });
  }, []);

  useEffect(() => { setHasChanges(true); }, [cliente, cotConfig, items, notas, descLocal]);

  const stRef = useRef({});
  useEffect(() => {
    stRef.current = { empresa, cliente, cotConfig, items, descG: parseFloat(descLocal) || 0, notas, editingId };
  });

  /* Título dinámico */
  useEffect(() => {
    const num = cotConfig.numero || "Nueva cotización";
    const cli = cliente.nombre ? ` — ${cliente.nombre}` : "";
    document.title = `${num}${cli} | FerreExpress`;
    return () => { document.title = "FerreExpress — Cotizador"; };
  }, [cotConfig.numero, cliente.nombre]);

  /* Cargar cotización por ID */
  useEffect(() => {
    if (!id) return;
    const cot = getCotizacion(id);
    if (!cot) {
      toast({ title: "Cotización no encontrada", status: "error", duration: 3000 });
      navigate("/historial");
      return;
    }
    setCliente(cot.cliente || DEFAULT_CLIENTE);
    setCotConfig(cot.config || DEFAULT_CONFIG);
    setDescLocal(String(cot.descG || 0));
    setItems(cot.items?.length ? cot.items : [blankRow(), blankRow()]);
    setNotas(cot.notas || DEFAULT_NOTAS);
    setEditingId(id);
    setHasChanges(false);
  }, [id]); // eslint-disable-line

  /* Ctrl+S — siempre usa la versión más reciente de handleSave via ref */
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const descGNum = useMemo(() => parseFloat(descLocal) || 0, [descLocal]);
  const totals   = useMemo(() => calcTotals(items, descGNum, cotConfig.iva), [items, descGNum, cotConfig.iva]);

  const addItem = useCallback(() => {
    const newRow = blankRow();
    setItems((p) => [...p, newRow]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      focusTableInput(tableRef.current, newRow.id, "desc");
    }));
  }, []);

  const removeItem = useCallback((rid) =>
    setItems((p) => p.length <= 1 ? p : p.filter((r) => r.id !== rid)),
  []);

  const upItem = useCallback((rid, k, v) => {
    if ((k === "price" || k === "disc") && parseFloat(v) < 0) v = "0";
    if (k === "qty" && parseFloat(v) <= 0) v = "1";
    setItems((p) => p.map((r) => r.id === rid ? { ...r, [k]: v } : r));
  }, []);

  const handleAcceptSugerencia = useCallback((rowId, { desc, price, unit }) => {
    setItems((p) => p.map((r) =>
      r.id === rowId ? { ...r, desc, price: price || r.price, unit: unit || r.unit } : r
    ));
    requestAnimationFrame(() => focusTableInput(tableRef.current, rowId, "qty"));
  }, []);

  const handleTableKeyDown = useCallback((e) => {
    const input = e.target;
    if (!input || input.tagName !== "INPUT") return;
    const rowId = input.dataset.rowId;
    const field = input.dataset.field;
    if (!rowId || !field || field === "desc") return;
    if (e.key === "Escape") { input.blur(); return; }
    const isTab   = e.key === "Tab" && !e.shiftKey;
    const isEnter = e.key === "Enter";
    if (isTab || isEnter) {
      const fieldIdx    = FIELD_ORDER.indexOf(field);
      const isLastField = fieldIdx === FIELD_ORDER.length - 1;
      if (isEnter && !isLastField) {
        e.preventDefault();
        focusTableInput(tableRef.current, rowId, FIELD_ORDER[fieldIdx + 1]);
        return;
      }
      if ((isTab || isEnter) && isLastField) {
        e.preventDefault();
        setItems((currentItems) => {
          const idx    = currentItems.findIndex((r) => r.id === rowId);
          const nextRow = currentItems[idx + 1];
          if (nextRow) {
            requestAnimationFrame(() => focusTableInput(tableRef.current, nextRow.id, "desc"));
            return currentItems;
          }
          const newRow = blankRow();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            focusTableInput(tableRef.current, newRow.id, "desc");
          }));
          return [...currentItems, newRow];
        });
      }
    }
  }, []);

  const autoSave = useCallback(() => {
    const { empresa, cliente, cotConfig, items, descG, notas, editingId } = stRef.current;
    const cfg = { ...cotConfig, estado: "borrador" };
    const tot = calcTotals(items, descG, cfg.iva);
    try {
      return saveCotizacion({ id: editingId, empresa, cliente, config: cfg, items, descG, notas, totals: tot });
    } catch { return null; }
  }, [saveCotizacion]);

  const handleSave = useCallback(async () => {
    const itemsValidos = items.filter((r) => r.desc?.trim());
    if (itemsValidos.length === 0) {
      toast({
        title: "Agrega al menos un producto",
        description: "Completa la descripción de al menos un producto antes de guardar.",
        status: "warning", duration: 4000, position: "top",
      });
      return;
    }
    setIsSaving(true);
    const descG = parseFloat(descLocal) || 0;
    try {
      const payload = { id: editingId, empresa, cliente, config: cotConfig, items, descG, notas, totals };
      const savedId = saveCotizacion(payload);
      aprenderProductos(items);
      if (!editingId) {
        await new Promise((r) => setTimeout(r, 80));
        const saved = getCotizacion(savedId);
        if (saved?.config) setCotConfig(saved.config);
        setEditingId(savedId);
        navigate(`/cotizador/${savedId}`, { replace: true });
        toast({
          title: "Cotización creada ✓",
          description: saved?.numero ? `Número: ${saved.numero}` : "",
          status: "success", duration: 4000, position: "top-right",
        });
      } else {
        toast({ title: "Guardado ✓", status: "success", duration: 2000, position: "top-right" });
      }
      setHasChanges(false);
    } catch (e) {
      toast({ title: "Error al guardar", description: e.message, status: "error", duration: 4000 });
    } finally {
      setIsSaving(false);
    }
  }, [editingId, empresa, cliente, cotConfig, descLocal, items, notas, totals, saveCotizacion, getCotizacion, navigate, toast]);

  /* Actualizar ref del handleSave para Ctrl+S */
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    deleteCotizacion(editingId);
    toast({ title: "Cotización eliminada", status: "info", duration: 2500, position: "top-right" });
    navigate("/historial");
  }, [editingId, deleteCotizacion, navigate, toast]);

  const handleDuplicate = useCallback(() => {
    if (!editingId) return;
    const newId = duplicarCotizacion(editingId);
    toast({ title: "Cotización duplicada ✓", status: "success", duration: 2000, position: "top-right" });
    navigate(`/cotizador/${newId}`);
  }, [editingId, duplicarCotizacion, navigate, toast]);

  const safeNavigate = useCallback((path) => {
    if (hasChanges) { setPendingNav(path); onExitOpen(); }
    else if (path === "preview") { setIsPreview(true); }
    else { navigate(path); }
  }, [hasChanges, navigate, onExitOpen]);

  const confirmExit = useCallback(() => {
    onExitClose(); autoSave(); setHasChanges(false);
    if (pendingNav === "preview") { setIsPreview(true); }
    else if (pendingNav) { navigate(pendingNav); }
    setPendingNav(null);
  }, [pendingNav, autoSave, navigate, onExitClose]);

  const discardAndExit = useCallback(() => {
    onExitClose(); setHasChanges(false);
    if (pendingNav === "preview") { setIsPreview(true); }
    else if (pendingNav) { navigate(pendingNav); }
    setPendingNav(null);
  }, [pendingNav, navigate, onExitClose]);

  const handleClear = useCallback(() => {
    setCliente(DEFAULT_CLIENTE);
    setCotConfig({ ...DEFAULT_CONFIG });
    setItems([blankRow(), blankRow()]);
    setNotas(DEFAULT_NOTAS);
    setDescLocal("0");
    setEditingId(null);
    setHasChanges(false);
    setMobileStep(0);
    navigate("/cotizador", { replace: true });
    toast({ title: "Formulario limpiado", status: "info", duration: 2000, position: "top-right" });
  }, [navigate, toast]);

  const handlePDF = useCallback(async () => {
    const ok = await downloadPDF(`${cotConfig.numero || "cotizacion"}_FerreExpress`);
    if (ok) toast({ title: "PDF descargado ✓", status: "success", duration: 2500, position: "top-right" });
    else    toast({ title: "Error generando PDF", status: "error", duration: 4000 });
  }, [cotConfig.numero, downloadPDF, toast]);

  /* ─── Colores (nivel raíz del componente) ─── */
  const bg        = useColorModeValue("gray.50", "gray.900");
  const border    = useColorModeValue("gray.200", "whiteAlpha.200");
  const mutedL    = useColorModeValue("gray.400", "gray.600");
  const inputBg   = useColorModeValue("white", "gray.700");
  const barBg     = useColorModeValue("white", "gray.900");
  const tableBg   = useColorModeValue("white", "gray.800");
  const stripeBg  = useColorModeValue("gray.50", "gray.750");
  const tabActive = useColorModeValue("gray.800", "white");
  const mutedText = useColorModeValue("gray.700", "gray.300");
  const totalColor = useColorModeValue("gray.700", "gray.300");

  const ivaRate  = (parseFloat(cotConfig.iva) || 0) / 100;
  const docProps = { empresa, cot: cotConfig, cli: cliente, items, descG: descGNum, totals, notas };

  /* Props compartidos para TablaProductos */
  const tablaProps = {
    items, tableRef, handleTableKeyDown,
    border, mutedL, inputBg, tableBg, stripeBg,
    ivaRate, cotConfig, rm, upItem, removeItem,
    handleAcceptSugerencia, getSugerencias, addItem,
  };

  /* Props compartidos para paneles */
  const panelEmpresaProps  = { empresa, setEmpresa, border, mutedL, inputBg };
  const panelClienteProps  = { cliente, setCliente, inputBg };
  const panelCotizProps    = { cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas, inputBg };

  /* ─── VISTA PREVIA ─── */
  if (isPreview) return (
    <Box minH="100vh" bg={useColorModeValue("gray.100", "gray.900")}>
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px" zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        px={{ base: 3, md: 6 }} py={3} position="sticky" top={0} zIndex={10}>
        <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
          <HStack>
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiEye />}
              onClick={() => setIsPreview(false)}>Volver al editor</Button>
            {cotConfig.numero && (
              <Badge bg={FY} color={DARK} rounded="full" px={3} fontWeight="700">{cotConfig.numero}</Badge>
            )}
          </HStack>
          <HStack>
            <Button size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
              isLoading={pdfLoading} _hover={{ bg: "#2a2a28" }} onClick={handlePDF}>Descargar PDF</Button>
            <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700" leftIcon={<FiSave />}
              isLoading={isSaving} _hover={{ bg: "#e0b010" }} onClick={handleSave}>
              {editingId ? "Actualizar" : "Guardar"}
            </Button>
          </HStack>
        </Flex>
      </Box>
      <Box maxW="900px" mx="auto" py={6} px={{ base: 2, md: 4 }}>
        <GlassCard rounded="lg" overflow="hidden" boxShadow="0 4px 32px rgba(0,0,0,0.12)">
          <DocContent {...docProps} />
        </GlassCard>
        <Flex justify="center" mt={5} pb={8}>
          <Button size="lg" bg={DARK} color={FY} rounded="full" px={10} leftIcon={<FiDownload />}
            isLoading={pdfLoading} _hover={{ bg: "#2a2a28" }} onClick={handlePDF}>Descargar PDF</Button>
        </Flex>
      </Box>
    </Box>
  );

  return (
    <Box minH="100vh" bg={bg}>
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px" zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>

      {/* ═══ TOPBAR ═══ */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border} position="sticky" top={0} zIndex={100}>
        <Flex maxW="1600px" mx="auto" px={{ base: 3, md: 6 }}
          h={{ base: "auto", md: "54px" }} py={{ base: 2, md: 0 }}
          align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <HStack spacing={3}>
            <AppLogo src={empresa.logo} h="30px" />
            {cotConfig.numero
              ? <Badge bg={FY} color={DARK} rounded="full" fontSize="10px" px={3} fontWeight="700">{cotConfig.numero}</Badge>
              : <Tag size="sm" colorScheme="gray" rounded="full">Nueva cotización</Tag>}
            {hasChanges && (
              <HStack spacing={1}>
                <Icon as={FiAlertCircle} color="orange.400" boxSize={3} />
                <Text fontSize="10px" color="orange.500" fontWeight="600"
                  display={{ base: "none", md: "block" }}>Sin guardar</Text>
              </HStack>
            )}
          </HStack>
          <HStack spacing={1} flexWrap="wrap">
            <Text fontSize="12px" fontWeight="700" color={totalColor}
              display={{ base: "none", lg: "block" }} mr={1}>
              {money(totals.totalPagar, cotConfig.moneda)}
            </Text>
            <Tooltip label="Historial de cotizaciones" hasArrow>
              <IconButton size="sm" variant="outline" rounded="md" aria-label="Historial"
                icon={<FiList />} onClick={() => safeNavigate("/historial")} />
            </Tooltip>
            {editingId && (
              <Tooltip label="Duplicar cotización" hasArrow>
                <IconButton size="sm" variant="outline" rounded="md" aria-label="Duplicar"
                  icon={<FiCopy />} onClick={handleDuplicate} />
              </Tooltip>
            )}
            <Tooltip label="Nueva cotización en blanco" hasArrow>
              <IconButton size="sm" variant="outline" rounded="md" aria-label="Nueva"
                icon={<FiRefreshCw />} onClick={handleClear} />
            </Tooltip>
            {editingId && (
              <Tooltip label="Eliminar esta cotización" hasArrow>
                <IconButton size="sm" colorScheme="red" variant="ghost" rounded="md"
                  aria-label="Eliminar" icon={<FiTrash2 />} onClick={onDelOpen} />
              </Tooltip>
            )}
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiEye />}
              onClick={() => safeNavigate("preview")}>
              <Text display={{ base: "none", md: "block" }}>Vista previa</Text>
              <Text display={{ base: "block", md: "none" }}>Ver</Text>
            </Button>
            <Button size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
              isLoading={pdfLoading} _hover={{ bg: "#2a2a28" }} onClick={handlePDF}>PDF</Button>
            <Tooltip label={<HStack><Text>Guardar</Text><Kbd fontSize="10px">Ctrl+S</Kbd></HStack>} hasArrow>
              <Button size="sm" bg={hasChanges ? FY : "gray.200"} color={hasChanges ? DARK : "gray.500"}
                rounded="md" fontWeight="700" leftIcon={<FiSave />} isLoading={isSaving}
                _hover={{ bg: hasChanges ? "#e0b010" : "gray.300" }} onClick={handleSave}>
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      <Box maxW="1600px" mx="auto" px={{ base: 3, md: 6 }} py={4}>

        {/* ═══ DESKTOP (xl+) ═══ */}
        <Box display={{ base: "none", xl: "grid" }}
          gridTemplateColumns="276px 1fr 280px" gap={4}
          h="calc(100vh - 80px)" overflow="hidden">

          {/* Col 1 */}
          <GlassCard rounded="xl" overflow="hidden" display="flex" flexDirection="column">
            <Tabs variant="unstyled" size="sm" display="flex" flexDirection="column" h="full">
              <TabList borderBottom="1px solid" borderColor={border} px={1} pt={1} gap={0.5}>
                {[{ label: "Empresa", icon: FiHome }, { label: "Cliente", icon: FiUser }, { label: "Cotización", icon: FiFileText }]
                  .map(({ label, icon: Ic }) => (
                    <Tab key={label} flex={1} fontSize="9px" fontWeight="700" letterSpacing="0.1em"
                      textTransform="uppercase" color={mutedL} pb={2.5}
                      _selected={{ color: tabActive, borderBottom: `2px solid ${FY}`, mb: "-1px" }}>
                      <VStack spacing={1}><Icon as={Ic} boxSize={3.5} /><Text>{label}</Text></VStack>
                    </Tab>
                  ))}
              </TabList>
              <TabPanels flex={1} overflow="hidden">
                {[
                  <PanelEmpresa {...panelEmpresaProps} />,
                  <PanelCliente {...panelClienteProps} />,
                  <PanelCotizacion {...panelCotizProps} />,
                ].map((panel, i) => (
                  <TabPanel key={i} h="full" overflowY="auto" p={0}
                    sx={{ "&::-webkit-scrollbar": { w: "4px" }, "&::-webkit-scrollbar-thumb": { bg: "gray.200", borderRadius: "2px" } }}>
                    {panel}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </GlassCard>

          {/* Col 2: Tabla */}
          <Box display="flex" flexDirection="column" gap={3} minW={0}>
            <Flex align="center" justify="space-between" flexShrink={0}>
              <HStack spacing={2}>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="700" fontSize="15px">Productos y servicios</Text>
                <Tag size="sm" borderRadius="full" colorScheme="gray">
                  {items.filter((r) => r.desc || r.price).length} ítem{items.filter((r) => r.desc || r.price).length !== 1 ? "s" : ""}
                </Tag>
              </HStack>
              <Text fontSize="10px" color={mutedL} display={{ base: "none", "2xl": "block" }}>
                <Kbd fontSize="9px">Tab</Kbd> avanza · <Kbd fontSize="9px">↑↓</Kbd> sugerencias · <Kbd fontSize="9px">Enter</Kbd> acepta
              </Text>
            </Flex>
            <GlassCard rounded="xl" flex={1} overflow="hidden" display="flex" flexDirection="column" minH={0}>
              <TablaProductos showAllCols={true} {...tablaProps} />
            </GlassCard>
          </Box>

          {/* Col 3: Resumen */}
          <ResumenDesktop
            items={items} cotConfig={cotConfig} totals={totals} descGNum={descGNum}
            cliente={cliente} rm={rm} safeNavigate={safeNavigate}
            handleSave={handleSave} isSaving={isSaving} hasChanges={hasChanges} />
        </Box>

        {/* ═══ TABLET (md–xl) ═══ */}
        <Box display={{ base: "none", md: "flex", xl: "none" }} flexDirection="column" gap={4}>
          <GlassCard rounded="xl" overflow="hidden">
            <Tabs variant="unstyled" size="sm">
              <TabList borderBottom="1px solid" borderColor={border} px={1} pt={1} gap={0.5}>
                {[{ label: "Empresa", icon: FiHome }, { label: "Cliente", icon: FiUser }, { label: "Config", icon: FiFileText }]
                  .map(({ label, icon: Ic }) => (
                    <Tab key={label} flex={1} fontSize="9px" fontWeight="700" letterSpacing="0.1em"
                      textTransform="uppercase" color={mutedL} pb={2.5}
                      _selected={{ color: tabActive, borderBottom: `2px solid ${FY}`, mb: "-1px" }}>
                      <VStack spacing={1}><Icon as={Ic} boxSize={3.5} /><Text>{label}</Text></VStack>
                    </Tab>
                  ))}
              </TabList>
              <TabPanels>
                <TabPanel p={0}><PanelEmpresa {...panelEmpresaProps} /></TabPanel>
                <TabPanel p={0}><PanelCliente {...panelClienteProps} /></TabPanel>
                <TabPanel p={0}><PanelCotizacion {...panelCotizProps} /></TabPanel>
              </TabPanels>
            </Tabs>
          </GlassCard>
          <GlassCard rounded="xl" overflow="hidden">
            <Flex align="center" px={4} py={3} borderBottom="1px solid" borderColor={border}>
              <HStack>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="700">Productos</Text>
                <Tag size="sm" colorScheme="gray" rounded="full">
                  {items.filter((r) => r.desc || r.price).length}
                </Tag>
              </HStack>
            </Flex>
            <TablaProductos showAllCols={true} {...tablaProps} />
          </GlassCard>
          <Box bg={DARK} rounded="xl" border="1px solid" borderColor="whiteAlpha.100">
            <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} size="md" />
          </Box>
          <Flex gap={2} pb={4}>
            <Button flex={1} bg={FY} color={DARK} rounded="lg" fontWeight="700"
              onClick={() => safeNavigate("preview")} _hover={{ bg: "#e0b010" }}>
              Ver cotización →
            </Button>
            <Button flex={1} bg={DARK} color="white" rounded="lg" leftIcon={<FiSave />}
              isLoading={isSaving} onClick={handleSave} _hover={{ bg: "#2a2a28" }}>
              {editingId ? "Actualizar" : "Guardar"}
            </Button>
          </Flex>
        </Box>

        {/* ═══ MOBILE (base–md): STEPPER ═══ */}
        <Box display={{ base: "flex", md: "none" }} flexDirection="column" gap={0} pb="88px">
          <GlassCard rounded="xl" overflow="hidden" mb={4}>
            <MobileStepper
              step={mobileStep} totalSteps={STEPS.length} label={STEPS[mobileStep]}
              onPrev={() => setMobileStep((s) => Math.max(0, s - 1))}
              onNext={() => setMobileStep((s) => Math.min(STEPS.length - 1, s + 1))} />
            <AnimatePresence mode="wait">
              <MotionBox key={mobileStep}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                {mobileStep === 0 && <PanelEmpresa {...panelEmpresaProps} />}
                {mobileStep === 1 && <PanelCliente {...panelClienteProps} />}
                {mobileStep === 2 && (
                  <Box>
                    <Flex align="center" px={4} py={3} borderBottom="1px solid" borderColor={border}>
                      <HStack>
                        <Icon as={FiPackage} color={mutedL} boxSize={4} />
                        <Text fontWeight="700">Productos</Text>
                        <Tag size="sm" colorScheme="gray" rounded="full">
                          {items.filter((r) => r.desc || r.price).length}
                        </Tag>
                      </HStack>
                    </Flex>
                    <TablaProductos showAllCols={false} {...tablaProps} />
                    <Box bg={DARK} px={4} py={3}>
                      <Stack spacing={1}>
                        <Flex justify="space-between">
                          <Text fontSize="10px" color="whiteAlpha.500">Total Bruto</Text>
                          <Text fontSize="11px" color="whiteAlpha.700">{money(totals.totalBruto, cotConfig.moneda)}</Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text fontSize="10px" color="whiteAlpha.500">IVA {cotConfig.iva}%</Text>
                          <Text fontSize="11px" color="whiteAlpha.700">{money(totals.ivaTotal, cotConfig.moneda)}</Text>
                        </Flex>
                        {descGNum > 0 && (
                          <Flex justify="space-between">
                            <Text fontSize="10px" color="whiteAlpha.500">Desc. {descGNum}%</Text>
                            <Text fontSize="11px" color="red.300">− {money(totals.descGAmt, cotConfig.moneda)}</Text>
                          </Flex>
                        )}
                        <Box h="1px" bg={`${FY}33`} my={1} />
                        <Flex justify="space-between" align="center">
                          <Text fontSize="11px" color="whiteAlpha.600">Total</Text>
                          <Text fontSize="18px" fontWeight="900" color={FY}>{money(totals.totalPagar, cotConfig.moneda)}</Text>
                        </Flex>
                      </Stack>
                    </Box>
                  </Box>
                )}
                {mobileStep === 3 && <PanelCotizacion {...panelCotizProps} />}
              </MotionBox>
            </AnimatePresence>
          </GlassCard>
          <Flex gap={2} mb={2}>
            {mobileStep > 0 && (
              <Button flex={1} variant="outline" rounded="lg" leftIcon={<FiChevronLeft />}
                onClick={() => setMobileStep((s) => s - 1)}>
                {STEPS[mobileStep - 1]}
              </Button>
            )}
            {mobileStep < STEPS.length - 1 && (
              <Button flex={1} bg={FY} color={DARK} rounded="lg" fontWeight="700"
                rightIcon={<FiChevronRight />} onClick={() => setMobileStep((s) => s + 1)}>
                {STEPS[mobileStep + 1]}
              </Button>
            )}
          </Flex>
        </Box>
      </Box>

      {/* ═══ BOTTOM BAR MOBILE ═══ */}
      <Box display={{ base: "flex", md: "none" }} position="fixed" bottom={0} left={0} right={0}
        bg={barBg} borderTop="1px solid" borderColor={border}
        px={4} py={3} gap={2} zIndex={200} boxShadow="0 -4px 16px rgba(0,0,0,0.08)">
        <Box flex={1}>
          <Text fontSize="9px" color={mutedL} textTransform="uppercase" letterSpacing="wider">Total</Text>
          <Text fontSize="16px" fontWeight="900" color={FY} lineHeight="1.2">
            {money(totals.totalPagar, cotConfig.moneda)}
          </Text>
        </Box>
        <Button size="sm" variant="outline" rounded="lg" leftIcon={<FiEye size={14} />}
          onClick={() => safeNavigate("preview")}>Ver</Button>
        <Button size="sm" bg={DARK} color={FY} rounded="lg" leftIcon={<FiDownload size={14} />}
          isLoading={pdfLoading} onClick={handlePDF} _hover={{ bg: "#2a2a28" }}>PDF</Button>
        <Button size="sm" bg={hasChanges ? FY : "gray.200"} color={hasChanges ? DARK : "gray.500"}
          rounded="lg" fontWeight="700" leftIcon={<FiSave size={14} />}
          isLoading={isSaving} onClick={handleSave}
          _hover={{ bg: hasChanges ? "#e0b010" : "gray.300" }}>
          {editingId ? "Actualizar" : "Guardar"}
        </Button>
      </Box>

      {/* ─── Dialogo: eliminar ─── */}
      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl">
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              {cliente.nombre
                ? <>Vas a eliminar la cotización de <strong>{cliente.nombre}</strong>. Esta acción no se puede deshacer.</>
                : "Esta acción no se puede deshacer."}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDelClose} rounded="md">Cancelar</Button>
              <Button bg={RED} color="white" ml={3} rounded="md"
                onClick={() => { onDelClose(); handleDelete(); }}>Eliminar</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* ─── Dialogo: cambios sin guardar ─── */}
      <AlertDialog isOpen={isExitOpen} leastDestructiveRef={cancelRef} onClose={onExitClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl">
            <AlertDialogHeader fontWeight="900">
              <HStack><Icon as={FiAlertCircle} color="orange.400" /><Text>Cambios sin guardar</Text></HStack>
            </AlertDialogHeader>
            <AlertDialogBody>Tienes cambios que no has guardado. ¿Qué deseas hacer?</AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={onExitClose} rounded="md" size="sm">Quedarme aquí</Button>
              <Button variant="outline" colorScheme="red" rounded="md" size="sm" onClick={discardAndExit}>
                Salir sin guardar
              </Button>
              <Button bg={FY} color={DARK} rounded="md" size="sm" fontWeight="700" onClick={confirmExit}>
                Guardar y salir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
