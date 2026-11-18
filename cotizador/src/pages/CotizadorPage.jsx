/**
 * CotizadorPage.jsx  v11
 *
 * Cambios vs v10:
 *  ✦ Importar desde PDF / imagen / CSV (modal profesional)
 *  ✦ Mobile: vista de tarjetas en lugar de tabla (usable en celular)
 *  ✦ Atajos de teclado que FUNCIONAN (Tab, Enter, ↑↓, Ctrl+D, Ctrl+S)
 *  ✦ AutocompleteInput: Enter sin sugerencia avanza al campo qty
 *  ✦ Responsive completo: mobile < 768, tablet 768-1280, desktop > 1280
 *  ✦ Fix scroll desktop: tabla hace scroll interno sin cortar el layout
 */

import {
  useEffect, useState, useCallback, useMemo, useRef, memo,
} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Flex, HStack, VStack, Stack, Text, Divider,
  Icon, Badge, Tag, Button, IconButton, Tooltip,
  Input, Select, Textarea,
  Table, Thead, Tbody, Tr, Th, Td,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useColorModeValue, usePrefersReducedMotion, useToast, useDisclosure,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Kbd, Collapse, useMediaQuery, ButtonGroup, SimpleGrid,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider,
} from '@chakra-ui/react';
import {
  FiPlus, FiTrash2, FiSave, FiDownload, FiEye, FiPrinter, FiGrid, FiBookmark, FiFeather,
  FiCopy, FiHome, FiUser, FiFileText,
  FiPackage, FiUpload, FiAlertCircle, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiChevronDown, FiTool, FiShoppingCart,
  FiTruck, FiMessageSquare,
  FiCornerUpLeft, FiCornerUpRight, FiHelpCircle,
  FiArrowLeft, FiMoreVertical, FiCheckCircle,
} from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useCotizaciones, NEW_TAB_ID } from '../hooks/useCotizaciones';
import { usePDF, compartirArchivo, telWhatsApp } from '../hooks/usePDF';
import { useExcel } from '../hooks/useExcel';
import { usePlantillas } from '../hooks/usePlantillas';
import PlantillasModal from '../components/PlantillasModal';
import FirmaModal from '../components/FirmaModal';
import AtajosPanel from '../components/AtajosPanel';
import RegistroSiigo from '../components/RegistroSiigo';
import { FaWhatsapp } from 'react-icons/fa';
import { useListaProgresiva } from '../hooks/useListaProgresiva';
import { useImport } from '../hooks/useImport';
import { useProductosFrecuentes, aprenderProductos } from '../hooks/useProductosFrecuentes';
import { useClientesFrecuentes, aprenderCliente } from '../hooks/useClientesFrecuentes';
import { useHistorialEdicion } from '../hooks/useHistorialEdicion';
import AutocompleteInput from '../components/AutocompleteInput';
import ClienteAutocomplete from '../components/ClienteAutocomplete';
import DocContent from '../components/DocContent';
import CampoNumero from '../components/CampoNumero';
import { ZonaImpresion } from '../components/ZonaImpresion';
import { useImpresion } from '../hooks/useImpresion';
import { PAGE_W } from '../lib/hojas';
import ImportModal from '../components/ImportModal';
import ListaRapidaProductos from '../components/ListaRapidaProductos';
import ModalConvertirTipo from '../components/ModalConvertirTipo';
import { useOffsetSuperior, NAV_MOVIL_H } from "../lib/disposicion";
import {
  blankRow, calcRow, calcTotals, calcTotalsObra, money, fmtDate,
  precioBase, ivaUnidad, esTransporte,
  UNITS, FORMAS_PAGO, FORMAS_PAGO_OBRA, IVA_OPTS, MONEDAS,
  DEFAULT_CLIENTE, DEFAULT_CONFIG, DEFAULT_NOTAS, DEFAULT_NOTAS_OBRA,
  DEFAULT_AIU, saveEmpresaLocal, loadEmpresaLocal,
  AVISO_LATERAL, TIPOS_DOC, deducirTipoDoc, datosFacturacion,
  ESTADO_META, ESTADOS, parseNumeroCO, fmtCantidad,
} from '../utils';
import { nubeActiva, pullEmpresa } from '../lib/nube';
import AppLogo from '../components/AppLogo';

/* Firma del contenido: sirve para saber si algo cambió DE VERDAD y no
   reguardar (ni reordenar el historial) al saltar entre pestañas. */
/* Los renglones vacíos no cuentan: la lista rápida (celular y tablet)
   agrega uno en blanco sola al final, y eso marcaba «Sin guardar» con
   solo abrir la cotización. */
const soloConDatos = (items = []) => items.filter(r => String(r.desc || '').trim() || String(r.price || '').trim());
const firmaDe = (s) => JSON.stringify({
  cliente: s.cliente, cotConfig: s.cotConfig, items: soloConDatos(s.items),
  descG: s.descG, notas: s.notas, observaciones: s.observaciones, aiuConfig: s.aiuConfig,
  firma: s.firma?.dataURL ? s.firma.fecha + s.firma.dataURL.length : null,
});

/* ── Borrador local (protección contra pérdida de trabajo) ── */
const DRAFT_KEY = 'ferreexpress_borrador_v1';
const saveDraft = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* lleno o bloqueado */ } };
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } };

/* Las 17 opciones de unidad se crean UNA sola vez. Antes se recreaban en
   cada repintado de cada fila: con 45 productos, cientos de elementos
   nuevos por tecla. */
const OPCIONES_UNIDAD = UNITS.map(u => <option key={u} value={u}>{u}</option>);

/* Y no se meten en la página hasta que hagan falta: hasta que alguien toca
   la lista, la fila solo carga con la unidad que tiene puesta. En una
   cotización de 45 productos eso son 720 elementos menos que construir. */
const SelectUnidadSimple = memo(function SelectUnidadSimple({ value, onChange, rowId }) {
  const [abierta, setAbierta] = useState(false);
  const abrir = () => { if (!abierta) setAbierta(true); };
  return (
    <select value={value} onChange={onChange}
      data-row-id={rowId} data-field="unit" tabIndex={-1}
      onMouseDown={abrir} onTouchStart={abrir} onFocus={abrir} onKeyDown={abrir}
      style={{
        background: 'transparent', border: 'none', fontSize: 11, color: '#777',
        width: 58, cursor: 'pointer', outline: 'none', padding: '4px 1px'
      }}>
      {abierta ? OPCIONES_UNIDAD : <option value={value}>{value}</option>}
    </select>
  );
});

/* ── Colores de marca ── */
const FY = '#F9BF20';
const DARK = '#3A3A38';
const RED = '#E21219';

/* ── Orden de campos en tabla ── */
const FIELD_ORDER = ['desc', 'qty', 'unit', 'price', 'disc'];

const MotionBox = motion(Box);

/* ════════════════════════════════════════════════════════════
   UTILIDADES UI
════════════════════════════════════════════════════════════ */
function GlassCard({ children, ...rest }) {
  const bg = useColorModeValue('white', 'gray.800');
  const bc = useColorModeValue('gray.200', 'whiteAlpha.200');
  return (
    <Box bg={bg} border="1px solid" borderColor={bc}
      boxShadow="0 2px 12px rgba(0,0,0,0.06)" {...rest}>
      {children}
    </Box>
  );
}

function FL({ children, required, title }) {
  const c = useColorModeValue('gray.500', 'gray.400');
  return (
    <Text fontSize="9px" fontWeight="700" letterSpacing="0.11em"
      textTransform="uppercase" color={c} mb="4px" title={title}>
      {children}
      {required && <Text as="span" color="red.400" ml={0.5}>*</Text>}
    </Text>
  );
}

/* Logo con fallback */
/* ════════════════════════════════════════════════════════════
   PRICE INPUT — formato 1.500.000 mientras se escribe
════════════════════════════════════════════════════════════ */
function PriceInput({ value, onChange, dataRowId, dataField, inputBg, w = '88px', ...rest }) {
  return (
    <CampoNumero
      tipo="precio"
      variant="unstyled"
      value={value}
      onChange={onChange}
      data-row-id={dataRowId}
      data-field={dataField}
      placeholder="0"
      textAlign="right" fontSize="12px" fontWeight="600"
      px={2} py={1} rounded="md" w={w}
      _hover={{ bg: inputBg }}
      _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }}
      {...rest}
    />
  );
}

/* Un código de barras (EAN-8/13, UPC, ITF-14…) es puro número de 6 a 14 cifras */
const ES_CODIGO_BARRAS = /^\d{6,14}$/;

function focusInput(container, rowId, field, intentos = 6) {
  /* Si hay varias copias del mismo campo en el DOM, se enfoca la que está
     a la vista. Si la fila se acaba de crear y todavía no se ha dibujado,
     se reintenta unos cuadros en vez de rendirse (antes el cursor se
     quedaba en el botón «+ Transporte» o «+ Agregar fila»). */
  const todos = [...document.querySelectorAll(`[data-row-id="${rowId}"][data-field="${field}"]`)];
  const el = todos.find(e => e.offsetParent !== null) || todos[0];
  if (!el) {
    if (intentos > 0) requestAnimationFrame(() => focusInput(container, rowId, field, intentos - 1));
    return;
  }
  el.focus();
  if (el.tagName === 'INPUT') { try { el.select(); } catch { /* algunos input no soportan select */ } }
}

/* ════════════════════════════════════════════════════════════
   MODAL SELECTOR DE TIPO
════════════════════════════════════════════════════════════ */
function ModalTipo({ isOpen, onSelect, onCancel, onIrHistorial, onAyuda }) {
  const cardHover = useColorModeValue('gray.50', 'gray.700');
  return (
    <Modal isOpen={isOpen} onClose={onCancel || (() => { })} isCentered closeOnOverlayClick={!!onCancel} size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" overflow="hidden" mx={4}>
        <Box bg={DARK} px={6} py={5}>
          <Text fontWeight="900" fontSize="18px" color="white">Nueva cotización</Text>
          <Text fontSize="12px" color="whiteAlpha.600" mt={1}>¿Qué tipo de cotización necesitas?</Text>
        </Box>
        <ModalBody p={5}>
          <Stack spacing={3}>
            {[
              {
                tipo: 'comercial', icon: FiShoppingCart, color: FY, textColor: DARK,
                title: 'Cotización Comercial',
                sub: 'La de todos los días. El documento discrimina el IVA.'
              },
              {
                tipo: 'obra', icon: FiTool, color: '#1a5276', textColor: 'white',
                title: 'Cotización de Obra',
                sub: 'Para contratistas y obras. Los mismos precios, sin discriminar IVA (AIU opcional).'
              },
            ].map(({ tipo, icon, color, textColor, title, sub }) => (
              <Box key={tipo} data-tour={`tipo-${tipo}`}
                as="button" w="full" textAlign="left" p={4} rounded="xl"
                border="2px solid" borderColor="gray.200"
                _hover={{ borderColor: color, bg: cardHover }}
                transition="all 0.15s"
                onClick={() => onSelect(tipo)}>
                <HStack spacing={3}>
                  <Box bg={color} p={2.5} rounded="lg" flexShrink={0}>
                    <Icon as={icon} color={textColor} boxSize={5} />
                  </Box>
                  <Box>
                    <Text fontWeight="800" fontSize="15px">{title}</Text>
                    <Text fontSize="11px" color="gray.500" mt={0.5}>{sub}</Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </Stack>

          {(onIrHistorial || onAyuda) && (
            <>
              <Flex align="center" gap={2} my={4}>
                <Box flex={1} h="1px" bg="gray.200" />
                <Text fontSize="10px" color="gray.400" fontWeight="700">O SI PREFIERES</Text>
                <Box flex={1} h="1px" bg="gray.200" />
              </Flex>
              <Stack spacing={2}>
                {onIrHistorial && (
                  <Button variant="outline" size="sm" rounded="lg" leftIcon={<FiHome />}
                    onClick={onIrHistorial}>
                    Volver al listado
                  </Button>
                )}
                {onAyuda && (
                  <Button variant="ghost" size="sm" rounded="lg" leftIcon={<FiHelpCircle />}
                    onClick={onAyuda}>
                    ¿Cuál elijo? Ver la guía
                  </Button>
                )}
              </Stack>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/* ── Documento a escala del ancho disponible ──
   La hoja mide 816 px (carta). En un celular de 390 px antes se veía solo
   la mitad izquierda: ni el valor unitario, ni el total, ni las
   condiciones. Ahora se encoge para caber entero y se puede ampliar con
   los dedos. En pantallas anchas queda a tamaño real. */
function DocEscalado({ children }) {
  const caja = useRef(null);
  const hoja = useRef(null);
  const [esc, setEsc] = useState(1);
  const [alto, setAlto] = useState(null);
  useEffect(() => {
    const medir = () => {
      const w = caja.current?.clientWidth || PAGE_W;
      const k = Math.min(1, w / PAGE_W);
      setEsc(k);
      setAlto((hoja.current?.offsetHeight || 0) * k);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (caja.current) ro.observe(caja.current);
    if (hoja.current) ro.observe(hoja.current);
    return () => ro.disconnect();
  }, []);
  return (
    <Box ref={caja} w="100%" overflow="hidden" h={alto ? `${alto}px` : 'auto'}>
      <Box ref={hoja} w={`${PAGE_W}px`} transform={`scale(${esc})`} transformOrigin="top left">
        {children}
      </Box>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   PANELES DE FORMULARIO
════════════════════════════════════════════════════════════ */
const PanelCliente = memo(function PanelCliente({ cliente, setCliente, inputBg, getClientes, onUsarCliente }) {
  const ip = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };
  const C = k => ({ value: cliente[k] ?? '', onChange: e => setCliente(p => ({ ...p, [k]: e.target.value })) });
  const sinNombre = !String(cliente.nombre ?? '').trim();
  const fact = datosFacturacion(cliente);
  const tipoActual = deducirTipoDoc(cliente);
  const factBg = useColorModeValue('yellow.50', 'whiteAlpha.100');
  const factBc = useColorModeValue('yellow.300', 'whiteAlpha.300');
  const segBg = useColorModeValue('white', 'gray.700');
  const muted = useColorModeValue('gray.500', 'gray.400');
  return (
    <Stack spacing={3} p={4}>
      {/* Los tres datos con los que se entrega un domicilio.
          El envoltorio lleva marca para que el recorrido guiado pueda
          señalarlos como bloque. */}
      <Stack spacing={3} data-tour="cliente-obligatorios">
        <Box>
          <FL required>Nombre del cliente</FL>
          {/* Los ejemplos de antes eran datos de verdad (dirección y celular
              de la ferretería): en gris claro parecían ya llenos. */}
          <ClienteAutocomplete {...ip} data-tour="cliente-nombre" placeholder="Nombre y apellido, o empresa"
            value={cliente.nombre}
            onChange={v => setCliente(p => ({ ...p, nombre: v }))}
            onAccept={onUsarCliente}
            getClientes={getClientes} />
        </Box>
        <Box><FL>Celular</FL><Input {...ip} type="tel" inputMode="tel" placeholder="Para llamarlo o mandarle por WhatsApp" {...C('tel')} /></Box>
        <Box><FL>Dirección de entrega <Text as="span" textTransform="none" letterSpacing="0" fontWeight="500">(si hay domicilio)</Text></FL>
          <Input {...ip} placeholder="Calle, carrera, barrio…" {...C('direccion')} /></Box>

        {sinNombre && (
          <Text fontSize="10.5px" color={muted} mt={-1}>
            Solo el nombre es obligatorio. Celular y dirección, si hay domicilio o se lo vas a mandar.
          </Text>
        )}
      </Stack>

      {/* ── Facturación ──
          Antes eran "opcionales" sueltos y en el documento salían en una
          línea gris diminuta. Ahora se agrupan como lo que son: los datos
          para facturar, y en el documento mandan cuando existen. */}
      <Box border="1px solid" borderColor={factBc} bg={factBg} rounded="lg" p={3} mt={1}>
        <Text fontSize="10px" fontWeight="800" letterSpacing="0.12em" textTransform="uppercase" color={DARK}
          _dark={{ color: FY }}>
          Datos para factura
        </Text>
        <Text fontSize="10.5px" color={muted} mt={0.5} mb={3} lineHeight="1.45">
          Solo si el cliente pide factura. Salen destacados en el documento; si los dejas vacíos, sale solo el nombre.
        </Text>
        <Stack spacing={3}>
          <Box>
            <FL>Razón social <Text as="span" textTransform="none" letterSpacing="0" fontWeight="500">(si es empresa)</Text></FL>
            <Input {...ip} placeholder="Nombre de la empresa" {...C('empresa')} />
          </Box>
          <Box>
            <FL>Documento</FL>
            <Flex gap={2} flexWrap="wrap">
              <HStack spacing={0} border="1px solid" borderColor="gray.200" rounded="md" bg={segBg} p="2px" flexShrink={0}
                role="radiogroup" aria-label="Tipo de documento">
                {TIPOS_DOC.map(t => {
                  const activo = tipoActual === t.v;
                  return (
                    <Button key={t.v} size="xs" h={{ base: '36px', lg: '26px' }} px={{ base: 3, lg: 2 }} rounded="sm" role="radio" aria-checked={activo}
                      title={t.largo}
                      bg={activo ? DARK : 'transparent'} color={activo ? FY : muted}
                      _hover={{ bg: activo ? DARK : 'gray.100' }} fontWeight="800" fontSize="10px"
                      onClick={() => setCliente(p => ({ ...p, tipoDoc: t.v }))}>
                      {t.corto}
                    </Button>
                  );
                })}
              </HStack>
              <Input {...ip} minW="120px" inputMode="numeric" placeholder={tipoActual === 'NIT' ? '900.123.456-7' : 'Número'} {...C('nit')} />
            </Flex>
          </Box>
          <Box>
            <FL>Correo para la factura electrónica</FL>
            <Input {...ip} type="email" inputMode="email" placeholder="correo del cliente" {...C('correo')} />
          </Box>
        </Stack>

        {/* Así queda en el documento — para no tener que abrir la vista previa */}
        <Box mt={3} pt={2.5} borderTop="1px dashed" borderColor={factBc}>
          <Text fontSize="9px" fontWeight="800" letterSpacing="0.12em" textTransform="uppercase" color={muted}>
            Así sale en el documento
          </Text>
          {fact.factura ? (
            <Text fontSize="12px" mt={1} lineHeight="1.4">
              <Text as="span" fontWeight="800">{fact.titular || '—'}</Text>
              {fact.numero && <> · <Text as="span" fontWeight="800">{fact.docCorto} {fact.numero}</Text></>}
              {fact.recibe && <Text as="span" color={muted}> · recibe {fact.recibe}</Text>}
            </Text>
          ) : (
            <Text fontSize="11.5px" mt={1} color={muted}>
              Sin datos de factura: solo el nombre{cliente.nombre ? <> (<strong>{cliente.nombre}</strong>)</> : ''}.
            </Text>
          )}
        </Box>
      </Box>

      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY} pt={1}>
        Otros datos (opcionales)
      </Text>
      <Flex gap={2}>
        <Box flex={1}><FL>Ciudad</FL><Input {...ip} placeholder="Cali" {...C('ciudad')} /></Box>
        <Box flex={1}><FL>Atención / contacto</FL><Input {...ip} placeholder="Nombre" {...C('contacto')} /></Box>
      </Flex>
    </Stack>
  );
});

const PanelCotizacion = memo(function PanelCotizacion({
  cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas,
  observaciones, setObservaciones, aiuConfig, setAiuConfig, inputBg, onChangeTipo,
}) {
  const ip = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };
  const esObra = cotConfig.tipo === 'obra';

  const numBg = useColorModeValue('gray.100', 'gray.700');
  const numBc = useColorModeValue('gray.200', 'gray.600');
  const numColor = useColorModeValue('gray.400', 'gray.500');
  const aiuBg = useColorModeValue('blue.50', 'blue.900');
  const aiuBc = useColorModeValue('blue.200', 'blue.700');
  const Q = k => ({ value: cotConfig[k] ?? '', onChange: e => setCotConfig(p => ({ ...p, [k]: e.target.value })) });
  const A = k => ({
    value: aiuConfig[k] ?? 0,
    onChange: e => setAiuConfig(p => ({ ...p, [k]: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })),
  });
  return (
    <Stack spacing={3} p={4}>
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Identificación
      </Text>
      <Box px={3} py="7px" rounded="md" bg={numBg} border="1px solid" borderColor={numBc}>
        <Text fontSize="sm" fontWeight="700" color={cotConfig.numero ? FY : numColor}>
          {cotConfig.numero || 'Se asigna al guardar'}
        </Text>
      </Box>
      <Flex gap={2}>
        <Box flex={1}>
          <FL>Moneda</FL>
          <Select {...ip} value={cotConfig.moneda} onChange={e => setCotConfig(p => ({ ...p, moneda: e.target.value }))}>
            {MONEDAS.map(m => <option key={m}>{m}</option>)}
          </Select>
        </Box>
        <Box>
          <FL title="Clic para cambiar">Tipo</FL>
          <Tooltip label="Cambiar tipo de cotizacion" hasArrow>
            <Box px={2} py="6px" rounded="md" border="1px solid" cursor="pointer"
              bg={esObra ? 'blue.100' : 'green.100'}
              borderColor={esObra ? 'blue.300' : 'green.300'}
              _hover={{ opacity: 0.75 }}
              onClick={() => onChangeTipo?.()}>
              <Text fontSize="10px" fontWeight="700" color={esObra ? 'blue.700' : 'green.700'}>
                {esObra ? 'Obra ✎' : 'Comercial ✎'}
              </Text>
            </Box>
          </Tooltip>
        </Box>
      </Flex>
      <Flex gap={2}>
        <Box flex={1}><FL>Fecha emisión</FL><Input {...ip} type="date" {...Q('fecha')} /></Box>
        <Box flex={1}><FL>Válida hasta</FL><Input {...ip} type="date" {...Q('vigencia')} /></Box>
      </Flex>
      <Divider />
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Condiciones
      </Text>
      <Box>
        <FL>Forma de pago</FL>
        <Select {...ip} value={cotConfig.formaPago} onChange={e => setCotConfig(p => ({ ...p, formaPago: e.target.value }))}>
          {(esObra ? FORMAS_PAGO_OBRA : FORMAS_PAGO).map(f => <option key={f}>{f}</option>)}
        </Select>
      </Box>
      {!esObra && (
        <Flex gap={2}>
          <Box flex={1}>
            <FL>IVA (%)</FL>
            <Select {...ip} value={cotConfig.iva} onChange={e => setCotConfig(p => ({ ...p, iva: Number(e.target.value) }))}>
              {IVA_OPTS.map(v => <option key={v} value={v}>{v}%</option>)}
            </Select>
          </Box>
          <Box flex={1}>
            <FL>Desc. global (%)</FL>
            <Input {...ip} type="number" min="0" max="100" value={descLocal}
              onChange={e => setDescLocal(String(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))))} />
          </Box>
        </Flex>
      )}
      {esObra && (
        <Box bg={aiuBg} border="1px solid"
          borderColor={aiuBc} rounded="lg" p={3}>
          <Text fontSize="9px" fontWeight="800" letterSpacing="wider" textTransform="uppercase"
            color="blue.600" mb={3}>AIU — Indirectos de Obra</Text>
          <Stack spacing={2}>
            <Flex gap={2}>
              <Box flex={1}><FL title="% sobre costo directo">Administración (%)</FL>
                <Input {...ip} type="number" min="0" max="100" step="0.5" {...A('admin')} /></Box>
              <Box flex={1}><FL title="% sobre costo directo">Imprevistos (%)</FL>
                <Input {...ip} type="number" min="0" max="100" step="0.5" {...A('imprevistos')} /></Box>
            </Flex>
            <Flex gap={2}>
              <Box flex={1}><FL title="IVA 19% aplica sobre este valor">Utilidad (%)</FL>
                <Input {...ip} type="number" min="0" max="100" step="0.5" {...A('utilidad')} /></Box>
              <Box flex={1}><FL title="% del total a pagar como anticipo">Anticipo (%)</FL>
                <Input {...ip} type="number" min="0" max="100" step="5" {...A('anticipo')} /></Box>
            </Flex>
            <Box flex={1}><FL>Desc. global (%)</FL>
              <Input {...ip} type="number" min="0" max="100" value={descLocal}
                onChange={e => setDescLocal(String(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))))} />
            </Box>
            <Text fontSize="9px" color="blue.600" fontWeight="600" textAlign="center" mt={1}>
              IVA = 19% sobre la utilidad
            </Text>
          </Stack>
        </Box>
      )}
      <Divider />
      {/* Observaciones del pedido — distintas de las notas legales.
          Van en el recuadro del pie del documento, junto al total. */}
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Observaciones
      </Text>
      <Textarea value={observaciones ?? ''} onChange={e => setObservaciones(e.target.value)}
        placeholder="Entregar en portería, preguntar por Andrés…"
        fontSize="11px" rows={3} rounded="md" focusBorderColor={FY} resize="none" bg={inputBg} />
      <Text fontSize="10px" color="gray.500" mt={-1}>
        Salen impresas al pie. Debajo quedan renglones para escribir a mano.
      </Text>

      <Divider />
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Notas y condiciones
      </Text>
      <Textarea value={notas} onChange={e => setNotas(e.target.value)}
        fontSize="11px" rows={6} rounded="md" focusBorderColor={FY} resize="none" bg={inputBg} />
    </Stack>
  );
});

/* La tarjeta de producto para celular que había aquí (había que abrirla
   y cerrarla una por una) se reemplazó por ListaRapidaProductos:
   ../components/ListaRapidaProductos.jsx — todos los renglones abiertos
   a la vez, pensado para atender en vitrina. */

/* ════════════════════════════════════════════════════════════
   TABLA DESKTOP (sin cambios estructurales, se arregló scroll)
════════════════════════════════════════════════════════════ */
const ItemRow = memo(function ItemRow({ r, i, border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, esObra, cotConfig, upItem, removeItem, toggleSinIva,
  handleAcceptSugerencia, getSugerencias, puedeBorrar, duplicateItem,
  startRowDrag, dragId, mostrarBase }) {
  const hoverBg = useColorModeValue('yellow.50', 'whiteAlpha.50');
  const dragBg = useColorModeValue('yellow.100', 'whiteAlpha.200');
  const isDragging = dragId === r.id;
  const rowBg = isDragging ? dragBg : (i % 2 === 0 ? tableBg : stripeBg);
  const p = parseFloat(r.price) || 0;
  const pSin = r.sinIva ? p : precioBase(p, ivaRate);
  const pIva = r.sinIva ? 0 : ivaUnidad(p, ivaRate);

  /* Fila SIN animación de layout a propósito.
     Con `layout`, framer-motion medía en el DOM la posición de todas las filas
     en cada render — es decir, un recálculo forzado del navegador por cada
     tecla que escribías. En una tabla de captura de datos, la fluidez al
     teclear vale mucho más que la transición al reordenar. */
  return (
    <Tr
      data-drag-row={r.id}
      bg={rowBg} _hover={{ bg: hoverBg }}
      style={{ position: 'relative', zIndex: isDragging ? 3 : 'auto' }}
      /* El navegador se salta el cálculo de estilo y el dibujo de las filas
         que no están a la vista. En una cotización larga, la mitad del
         tiempo de abrir se iba en maquetar filas que nadie estaba viendo.
         La altura declarada evita que la barra de desplazamiento salte. */
      sx={{ contentVisibility: 'auto', containIntrinsicSize: '0 34px' }}>
      <Td borderColor={border} color={mutedL} fontSize="11px" pl={2} pr={0} w="40px">
        <HStack spacing={0.5}>
          <Box as="span" onPointerDown={e => startRowDrag(e, r.id)}
            title="Arrastrar para reordenar" cursor="grab"
            style={{ touchAction: 'none', display: 'flex', alignItems: 'center' }}
            color="gray.300" _hover={{ color: FY }}>
            <Icon as={MdDragIndicator} boxSize={3.5} />
          </Box>
          <Text>{i + 1}</Text>
        </HStack>
      </Td>
      {/* La cámara que había aquí llamaba a funciones que no existían en
          esta tabla: tocarla tumbaba la aplicación entera. El escáner vive
          en la lista rápida del celular, que es donde hay cámara a mano. */}
      <Td borderColor={border} p={1} w={{ base: '48px', xl: '64px' }}>
        <Input variant="unstyled" value={r.ref} onChange={e => upItem(r.id, 'ref', e.target.value)}
          data-row-id={r.id} data-field="ref" tabIndex={-1} title={r.ref || 'Código o referencia'}
          placeholder="—" fontSize="11px" color={mutedL} px={1} py={1} rounded="md" w={{ base: '42px', xl: '56px' }}
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      {/* La descripción se lleva todo el ancho sobrante: antes la tabla
          repartía el espacio entre columnas de números y el nombre del
          producto quedaba cortado ("Tubo PVC", "Soldadura"). */}
      <Td borderColor={border} p={1} w="100%" minW="150px">
        <AutocompleteInput
          value={r.desc}
          onChange={val => upItem(r.id, 'desc', val)}
          onAccept={sug => handleAcceptSugerencia(r.id, sug)}
          getSugerencias={getSugerencias}
          dataRowId={r.id}
          inputBg={inputBg}
          FY={FY}
          tabIndex={-1}
          title={r.desc || undefined}
        />
      </Td>
      <Td borderColor={border} p={1} isNumeric w="56px">
        <CampoNumero tipo="cantidad" variant="unstyled" value={r.qty}
          onChange={v => upItem(r.id, 'qty', v)}
          onBlur={() => { if (!(parseFloat(r.qty) > 0)) upItem(r.id, 'qty', '1'); }}
          data-row-id={r.id} data-field="qty" tabIndex={-1}
          textAlign="center" fontWeight="700" fontSize="12px" px={1} py={1} rounded="md" w="48px"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      <Td borderColor={border} p={1} w="60px">
        {/* Solo la unidad elegida hasta que alguien toque la lista: las 17
            unidades por fila eran la cuarta parte de toda la página. */}
        <SelectUnidadSimple value={r.unit} onChange={e => upItem(r.id, 'unit', e.target.value)}
          rowId={r.id} />
      </Td>
      {!esObra && mostrarBase && (
        /* Base sin IVA e IVA en una sola columna de dos renglones: son datos
           de consulta, no se escriben, y como dos columnas le quitaban al
           nombre del producto el espacio que necesita para leerse. */
        <Td borderColor={border} isNumeric pr={2} w="86px" lineHeight="1.25" whiteSpace="nowrap">
          {r.sinIva
            ? <Text fontSize="9px" fontWeight="700" color="blue.400" title="Transporte excluido de IVA">SIN IVA</Text>
            : p > 0
              ? <>
                  <Text fontSize="10.5px" color={mutedL} title="Precio sin IVA">{money(pSin, cotConfig.moneda)}</Text>
                  <Text fontSize="9.5px" color={mutedL} title="IVA por unidad">+ {money(pIva, cotConfig.moneda)}</Text>
                </>
              : <Text fontSize="11px" color={mutedL}>—</Text>}
        </Td>
      )}
      <Td borderColor={border} p={1} isNumeric w="94px">
        <PriceInput value={r.price} onChange={val => upItem(r.id, 'price', val)}
          dataRowId={r.id} dataField="price" inputBg={inputBg} w="88px" tabIndex={-1} />
      </Td>
      <Td borderColor={border} p={1} isNumeric w="50px">
        <CampoNumero tipo="porcentaje" max={100} variant="unstyled" value={r.disc}
          onChange={v => upItem(r.id, 'disc', v)}
          data-row-id={r.id} data-field="disc" tabIndex={-1} placeholder="0"
          textAlign="center" fontSize="11px" color={mutedL} px={1} py={1} rounded="md" w="44px"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      <Td borderColor={border} isNumeric pr={2} w="88px">
        <Text fontWeight="700" fontSize="12px">{money(calcRow(r), cotConfig.moneda)}</Text>
      </Td>
      <Td borderColor={border} p={1} w="76px">
        <HStack spacing={0}>
          {/* Aviso nativo del navegador en vez de Tooltip de Chakra: con 45
              productos había casi 200 tooltips vivos y cada uno monta su
              propio posicionador. Se notaba al agregar o borrar una fila. */}
          {!esObra && (
            <IconButton size="xs" variant={r.sinIva ? 'solid' : 'ghost'}
              colorScheme={r.sinIva ? 'blue' : 'gray'} rounded="md" aria-label="Sin IVA"
              title={r.sinIva ? 'Transporte SIN IVA · clic para cobrar IVA' : 'Marcar como transporte (sin IVA)'}
              icon={<FiTruck size={11} />} onClick={() => toggleSinIva(r.id)} tabIndex={-1} />
          )}
          <IconButton size="xs" variant="ghost" rounded="md" aria-label="Duplicar"
            title="Duplicar (Ctrl+D)"
            icon={<FiCopy size={11} />} onClick={() => duplicateItem(r.id)} tabIndex={-1} />
          <IconButton size="xs" variant="ghost" colorScheme="red" rounded="md"
            aria-label="Eliminar" icon={<FiTrash2 size={11} />} title="Eliminar"
            onClick={() => removeItem(r.id)} isDisabled={!puedeBorrar} tabIndex={-1} />
        </HStack>
      </Td>
    </Tr>
  );
});

const TablaProductos = memo(function TablaProductos({
  items, tableRef, handleTableKeyDown, handlePasteExcel, esObra,
  border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, cotConfig, upItem, removeItem, toggleSinIva,
  handleAcceptSugerencia, getSugerencias, addItem, addTransporte, duplicateItem,
  startRowDrag, dragId, alto,
}) {
  /* Con cotizaciones de 40+ productos, montar todas las filas de un golpe
     dejaba la pantalla pegada varios segundos al abrir. Se pintan las
     primeras y el resto entra en tandas: se puede empezar a escribir
     mientras terminan de aparecer. */
  /* La clave incluye solo el tipo de cotización: al cambiar de cotización
     entera cambia también, y así se empieza de nuevo por arriba. Lo que NO
     puede pasar es reiniciarse al escribir — por eso no depende de items. */
  const { visibles: aPintar, faltan: faltanPorPintar } = useListaProgresiva(items, {
    primeros: 12, paso: 20, clave: `${esObra}|${items[0]?.id || ''}`,
  });
  const puedeBorrar = items.length > 1;

  const addBtnHover = useColorModeValue('yellow.50', 'whiteAlpha.100');
  const theadBg = '#3A3A38';
  const mutedText = useColorModeValue('gray.400', 'gray.500');
  /* La columna «Base + IVA» (dato de consulta) solo cuando sobra ancho.
     En pantallas de 1024–1279 le quitaba al nombre del producto el espacio
     para leerse: salía «Tornillo drywall 6x1 caja x1». */
  const [mostrarBase] = useMediaQuery('(min-width: 80em)', { ssr: false });

  const cols = esObra
    ? ['#', 'Ref.', 'Descripción / Actividad', 'Cant.', 'Und.', 'Vr. Unit.', 'Desc.%', 'Total', '']
    : ['#', 'Ref.', 'Producto', 'Cant.', 'Und.', ...(mostrarBase ? ['Base + IVA'] : []), 'P. c/IVA', 'Desc.%', 'Total', ''];

  return (
    <Box ref={tableRef}
      overflowX="auto"
      overflowY="auto"
      /* En el computador ocupa el alto que le deja la tarjeta (flex) y hace
         scroll por dentro; en la tablet se le da un alto fijo. */
      flex={alto ? undefined : 1}
      h={alto || 0}
      minH={alto ? '320px' : undefined}
      onKeyDownCapture={handleTableKeyDown}
      onPaste={handlePasteExcel}
      sx={{
        '&::-webkit-scrollbar': { w: '4px', h: '4px' },
        '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' }
      }}>
      <Table size="sm" variant="simple">
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr bg={theadBg}>
            {cols.map((h, i) => (
              <Th key={i} color={FY} borderColor="transparent" fontSize="8px"
                letterSpacing="wider" fontWeight="700" whiteSpace="nowrap" px={2}
                isNumeric={['Cant.', 'Base + IVA', 'P. c/IVA', 'Vr. Unit.', 'Desc.%', 'Total'].includes(h)}>
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {aPintar.map((r, i) => (
            <ItemRow key={r.id} r={r} i={i}
              border={border} mutedL={mutedL} inputBg={inputBg}
              tableBg={tableBg} stripeBg={stripeBg}
              ivaRate={ivaRate} esObra={esObra} cotConfig={cotConfig}
              upItem={upItem} removeItem={removeItem} duplicateItem={duplicateItem}
              toggleSinIva={toggleSinIva}
              handleAcceptSugerencia={handleAcceptSugerencia}
              getSugerencias={getSugerencias}
              puedeBorrar={puedeBorrar}
              mostrarBase={mostrarBase}
              startRowDrag={startRowDrag} dragId={dragId} />
          ))}
          {faltanPorPintar > 0 && (
            <Tr>
              <Td colSpan={cols.length} borderColor={border} py={2} textAlign="center">
                <Text fontSize="10px" color={mutedL}>
                  Mostrando {aPintar.length} de {items.length} · terminando de pintar el resto…
                </Text>
              </Td>
            </Tr>
          )}
          <Tr>
            <Td colSpan={cols.length} borderColor={border} px={3} py={2}>
              <Flex align="center" gap={3}>
                <Button size="xs" variant="ghost" leftIcon={<FiPlus />} onClick={addItem}
                  fontWeight="700" color={FY} tabIndex={-1}
                  _hover={{ bg: addBtnHover }}>
                  + Agregar fila
                </Button>
                {!esObra && (
                  <Button data-tour="btn-transporte" size="xs" variant="ghost" leftIcon={<FiTruck size={12} />} onClick={addTransporte}
                    fontWeight="700" color="blue.400" tabIndex={-1}
                    _hover={{ bg: addBtnHover }}>
                    + Transporte
                  </Button>
                )}
                <Text fontSize="9px" color={mutedText} display={{ base: 'none', '2xl': 'block' }}>
                  <Kbd fontSize="8px">Tab</Kbd> avanza ·{' '}
                  <Kbd fontSize="8px">Shift+Tab</Kbd> retrocede ·{' '}
                  <Kbd fontSize="8px">← →</Kbd> campos ·{' '}
                  <Kbd fontSize="8px">↑ ↓</Kbd> filas ·{' '}
                  <Kbd fontSize="8px">Enter</Kbd> siguiente/nueva ·{' '}
                  <Kbd fontSize="8px">Ctrl+D</Kbd> duplica ·{' '}
                  <Kbd fontSize="8px">Ctrl+Enter</Kbd> nueva fila ·{' '}
                  <Kbd fontSize="8px">Supr</Kbd> elimina ·{' '}
                  <Kbd fontSize="8px">Ctrl+S</Kbd> guarda ·{' '}
                  <Kbd fontSize="8px">Ctrl+V</Kbd> pega desde Excel
                </Text>
              </Flex>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
});

/* ════════════════════════════════════════════════════════════
   RESUMEN TOTALES
════════════════════════════════════════════════════════════ */
function ResumenTotales({ totals, cotConfig, descGNum, aiuConfig, size = 'md' }) {
  const esObra = cotConfig.tipo === 'obra';
  const fs = size === 'lg' ? '11px' : '10px';
  const fTotal = size === 'lg' ? '24px' : '18px';
  const aiu = aiuConfig || DEFAULT_AIU;
  return (
    <Box bg="blackAlpha.300" px={5} py={size === 'lg' ? 4 : 3}>
      <Stack spacing={1.5}>
        {esObra ? (
          <>
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.400">Costo Directo</Text>
              <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.costoDirecto ?? 0, cotConfig.moneda)}</Text>
            </Flex>
            {descGNum > 0 && (
              <Flex justify="space-between">
                <Text fontSize={fs} color="whiteAlpha.400">Descuento ({descGNum}%)</Text>
                <Text fontSize={fs} color="red.300" fontWeight="500">− {money(totals.descGAmt, cotConfig.moneda)}</Text>
              </Flex>
            )}
            {/* Las líneas del AIU solo aparecen si tienen valor: una obra sin
                AIU se ve limpia — productos y total, sin filas en cero. */}
            {(aiu.admin > 0 || aiu.imprevistos > 0) && (
              <Flex justify="space-between">
                <Text fontSize={fs} color="whiteAlpha.300">Adm. {aiu.admin}% + Imp. {aiu.imprevistos}%</Text>
                <Text fontSize={fs} color="whiteAlpha.500">{money((totals.adminAmt ?? 0) + (totals.impAmt ?? 0), cotConfig.moneda)}</Text>
              </Flex>
            )}
            {aiu.utilidad > 0 && (
              <>
                <Flex justify="space-between">
                  <Text fontSize={fs} color="whiteAlpha.400">Utilidad {aiu.utilidad}%</Text>
                  <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.utilAmt ?? 0, cotConfig.moneda)}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text fontSize={fs} color="whiteAlpha.400">IVA 19% s/ utilidad</Text>
                  <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.ivaUtilidad ?? 0, cotConfig.moneda)}</Text>
                </Flex>
              </>
            )}
            {aiu.anticipo > 0 && (
              <Flex justify="space-between">
                <Text fontSize={fs} color="yellow.400">Anticipo ({aiu.anticipo}%)</Text>
                <Text fontSize={fs} color="yellow.400" fontWeight="600">{money(totals.totalPagar * aiu.anticipo / 100, cotConfig.moneda)}</Text>
              </Flex>
            )}
          </>
        ) : (
          <>
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.400">Subtotal (sin IVA)</Text>
              <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.totalBruto, cotConfig.moneda)}</Text>
            </Flex>
            {(totals.exento || 0) > 0 && (
              <Flex justify="space-between">
                <Text fontSize={fs} color="blue.200">Transporte (sin IVA)</Text>
                <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.exento, cotConfig.moneda)}</Text>
              </Flex>
            )}
            {descGNum > 0 && (
              <Flex justify="space-between">
                <Text fontSize={fs} color="whiteAlpha.400">Descuento ({descGNum}%)</Text>
                <Text fontSize={fs} color="red.300" fontWeight="500">− {money(totals.descGAmt, cotConfig.moneda)}</Text>
              </Flex>
            )}
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.400">IVA {cotConfig.iva}%</Text>
              <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.ivaTotal, cotConfig.moneda)}</Text>
            </Flex>
          </>
        )}
      </Stack>
      <Box h="1px" bg={`${FY}44`} my={3} />
      <Flex justify="space-between" align="flex-end">
        <Text fontSize="11px" color="whiteAlpha.500">Total a Pagar</Text>
        <Text fontSize={fTotal} fontWeight="800" color={FY} lineHeight="1" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {money(totals.totalPagar, cotConfig.moneda)}
        </Text>
      </Flex>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   PIE DE TOTALES (computador)
   Antes había una tercera columna «Resumen» que repetía la lista de
   productos de la tabla y le robaba 276 px al nombre de cada producto.
   Ahora los totales van pegados al pie de la tabla, a la vista siempre,
   con el botón de enviar al lado del total.
════════════════════════════════════════════════════════════ */
function Cifra({ label, valor, color = 'whiteAlpha.800', labelColor = 'whiteAlpha.500' }) {
  return (
    <Box minW={0}>
      <Text fontSize="9px" color={labelColor} textTransform="uppercase" letterSpacing="0.08em"
        whiteSpace="nowrap">{label}</Text>
      <Text fontSize="13px" fontWeight="700" color={color} whiteSpace="nowrap"
        sx={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</Text>
    </Box>
  );
}

const PieTotales = memo(function PieTotales({ totals, cotConfig, descGNum, aiuConfig, nItems, onEnviar, onTexto, enviando }) {
  const esObra = cotConfig.tipo === 'obra';
  const mon = cotConfig.moneda;
  const aiu = aiuConfig || DEFAULT_AIU;
  return (
    <Flex bg={DARK} px={4} py={3} gap={4} align="center" flexShrink={0} flexWrap="wrap"
      borderTop="1px solid" borderColor="whiteAlpha.100">
      <Flex gap={{ base: 4, xl: 6 }} flex={1} minW={0} flexWrap="wrap" rowGap={2}>
        <Cifra label="Productos" valor={nItems} />
        {esObra ? (
          <>
            <Cifra label="Costo directo" valor={money(totals.costoDirecto ?? 0, mon)} />
            {descGNum > 0 && <Cifra label={`Desc. ${descGNum}%`} valor={`− ${money(totals.descGAmt, mon)}`} color="red.300" />}
            {(aiu.admin > 0 || aiu.imprevistos > 0) && (
              <Cifra label={`Adm. ${aiu.admin}% + Imp. ${aiu.imprevistos}%`}
                valor={money((totals.adminAmt ?? 0) + (totals.impAmt ?? 0), mon)} />
            )}
            {aiu.utilidad > 0 && <Cifra label={`Utilidad ${aiu.utilidad}%`} valor={money(totals.utilAmt ?? 0, mon)} />}
            {aiu.utilidad > 0 && <Cifra label="IVA s/ utilidad" valor={money(totals.ivaUtilidad ?? 0, mon)} />}
            {aiu.anticipo > 0 && (
              <Cifra label={`Anticipo ${aiu.anticipo}%`} valor={money(totals.totalPagar * aiu.anticipo / 100, mon)}
                color="yellow.300" labelColor="yellow.500" />
            )}
          </>
        ) : (
          <>
            <Cifra label="Subtotal sin IVA" valor={money(totals.totalBruto, mon)} />
            {(totals.exento || 0) > 0 && <Cifra label="Transporte (sin IVA)" valor={money(totals.exento, mon)} labelColor="blue.200" />}
            <Cifra label={`IVA ${cotConfig.iva}%`} valor={money(totals.ivaTotal, mon)} />
            {descGNum > 0 && <Cifra label={`Desc. ${descGNum}%`} valor={`− ${money(totals.descGAmt, mon)}`} color="red.300" />}
          </>
        )}
      </Flex>
      <Flex align="center" gap={4} flexShrink={0} ml="auto">
        <Box textAlign="right">
          <Text fontSize="9px" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.1em">Total a pagar</Text>
          <Text fontSize="24px" fontWeight="900" color={FY} lineHeight="1.1" whiteSpace="nowrap"
            sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {money(totals.totalPagar, mon)}
          </Text>
        </Box>
        <ButtonGroup isAttached>
          <Button bg="#25D366" color="white" rounded="lg" fontWeight="800" h="44px" px={{ base: 3, xl: 5 }}
            leftIcon={<FaWhatsapp size={18} />} isLoading={enviando} loadingText="Preparando…"
            onClick={onEnviar} _hover={{ bg: '#1ebe5b' }}>
            Enviar<Text as="span" display={{ base: 'none', xl: 'inline' }}>&nbsp;por WhatsApp</Text>
          </Button>
          <Menu isLazy placement="top-end">
            <MenuButton as={IconButton} h="44px" minW="36px" bg="#1fb85a" color="white" rounded="lg"
              _hover={{ bg: '#18a84f' }} _active={{ bg: '#18a84f' }} aria-label="Otras formas de enviar"
              icon={<FiChevronDown />} borderLeft="1px solid" borderColor="whiteAlpha.400" />
            <MenuList fontSize="13px" zIndex={400} color="gray.800" _dark={{ color: 'gray.100' }}>
              <MenuItem icon={<FaWhatsapp />} onClick={onEnviar}>Enviar el PDF</MenuItem>
              <MenuItem icon={<FiMessageSquare />} onClick={onTexto} command="sin PDF">
                Enviar la lista como texto
              </MenuItem>
            </MenuList>
          </Menu>
        </ButtonGroup>
      </Flex>
    </Flex>
  );
});

/* ════════════════════════════════════════════════════════════
   STEPPER MOBILE
════════════════════════════════════════════════════════════ */
/* Los datos de la empresa salieron de aquí y se fueron a Mi perfil: son
   siempre los mismos y estaban ocupando el primer paso de un formulario
   donde lo urgente es el cliente. Un paso menos en cada cotización. */
/* Pasos del celular. El último se llamaba «Config» y era un formulario de
   fechas, IVA y notas legales que casi nadie toca; al llegar ahí no había
   botón para terminar. Ahora el último paso es «Enviar»: resumen, mandar
   por WhatsApp, PDF, y las condiciones guardadas en un desplegable. */
const STEPS = ['Cliente', 'Productos', 'Enviar'];

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function CotizadorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  /* Datos que llegan desde el listado con "Nueva para este cliente":
     una cotización en blanco pero con el cliente ya escrito. Se leen una
     sola vez — si la persona luego borra un campo, no vuelven a aparecer. */
  const [prellenado] = useState(() => location.state?.clientePrefill || null);
  const rm = usePrefersReducedMotion();
  const cancelRef = useRef();
  const tableRef = useRef(null);
  const saveRef = useRef(null);
  const sigRef = useRef(null);   // firma del contenido ya guardado
  const histRef = useRef(null);  // historial de deshacer (se llena más abajo)

  const {
    getCotizacion, saveCotizacion, deleteCotizacion, duplicarCotizacion,
    addEvento,
    tabs, openTab, replaceTab, registerAutoSave, closeTab,
  } = useCotizaciones();

  /* La barra de pestañas va encima: el topbar se apoya debajo cuando hay alguna */
  /* Debajo de la tira de pestañas Y de la navegación principal */
  const topOffset = useOffsetSuperior(tabs.length > 0);
  const { downloadPDF, archivoPDF, loading: pdfLoading } = usePDF('cotizacion-pdf');
  const { imprimiendo, imprimir } = useImpresion();
  const { exportar: exportarExcel, loading: xlsxLoading } = useExcel();
  const { plantillas, guardarPlantilla, eliminarPlantilla, renombrarPlantilla } = usePlantillas();
  const { getSugerencias, buscarPorCodigo } = useProductosFrecuentes();
  const { getClientes } = useClientesFrecuentes();
  const importHook = useImport();

  /* ── Estado principal ── */
  const [empresa, setEmpresaState] = useState(() => loadEmpresaLocal());
  const [cliente, setCliente] = useState(
    () => (location.state?.clientePrefill
      ? { ...DEFAULT_CLIENTE, ...location.state.clientePrefill }
      : DEFAULT_CLIENTE)
  );
  const [cotConfig, setCotConfig] = useState(
    () => ({
      ...DEFAULT_CONFIG,
      ...(location.state?.tipoPrefill ? { tipo: location.state.tipoPrefill } : null),
      ...(location.state?.modoExpress ? { iva: 0, formaPago: 'Interno', notas: 'Remisión interna' } : null),
    })
  );
  const [aiuConfig, setAiuConfig] = useState({ ...DEFAULT_AIU });
  const [items, setItems] = useState([blankRow(), blankRow()]);
  const [notas, setNotas] = useState(DEFAULT_NOTAS);
  const [observaciones, setObservaciones] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [descLocal, setDescLocal] = useState('0');
  const [pendingNav, setPendingNav] = useState(null);
  /* Una cotización ya guardada abre en «Productos»: al volver a una, casi
     siempre es para revisar o cambiar lo pedido, no los datos del cliente. */
  const [mobileStep, setMobileStep] = useState(location.state?.modoExpress || id ? 1 : 0);
  /* Al cambiar de paso se vuelve arriba. Antes se conservaba el scroll del
     paso anterior: al tocar «Productos» al final del formulario del
     cliente se aterrizaba en mitad de la lista, sin ver el comienzo. */
  const primerPaso = useRef(true);
  useEffect(() => {
    if (primerPaso.current) { primerPaso.current = false; return; }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [mobileStep]);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const [enviando, setEnviando] = useState(false);
  /* Si se entró con "Nueva para este cliente" ya sabemos el tipo: no tiene
     sentido volver a preguntarlo. Se puede cambiar después en Configuración. */
  const modoExpress = !id && !!location.state?.modoExpress;
  const [showTipoModal, setShowTipoModal] = useState(!id && !location.state?.tipoPrefill && !modoExpress);
  const [showImport, setShowImport] = useState(false);
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [plantillasMode, setPlantillasMode] = useState("usar"); // "usar" | "guardar"
  const [showFirma, setShowFirma] = useState(false);
  const [showSiigo, setShowSiigo]       = useState(false);
  const [firma, setFirma] = useState(null); // { dataURL, firmante, fecha }
  const [expressTrabajador, setExpressTrabajador] = useState('');
  const [showAtajos, setShowAtajos] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);   // monta el PDF oculto solo al exportar
  const [draftFound, setDraftFound] = useState(null); // borrador recuperable
  const [showConvertir, setShowConvertir] = useState(false);
  const [showFaltantes, setShowFaltantes] = useState(false);
  /* Qué pestaña del panel izquierdo está abierta (0 Empresa · 1 Cliente · 2 Config).
     Hacía falta poder moverla desde fuera: el aviso "Faltan datos de entrega"
     ofrecía "Completar datos" y en computador no llevaba a ninguna parte. */
  const [panelTab, setPanelTab] = useState(0);
  /* Tablet: modo rápido (por defecto) o tabla clásica. Se recuerda. */
  const [modoTabla, setModoTablaState] = useState(() => {
    try { return localStorage.getItem('ferreexpress_modo_tabla') === '1'; } catch { return false; }
  });
  const setModoTabla = useCallback(v => {
    setModoTablaState(v);
    try { localStorage.setItem('ferreexpress_modo_tabla', v ? '1' : '0'); } catch { /* noop */ }
  }, []);

  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const { isOpen: isExitOpen, onOpen: onExitOpen, onClose: onExitClose } = useDisclosure();

  const esObra = cotConfig.tipo === 'obra';

  /* ── UNA SOLA DISPOSICIÓN A LA VEZ ──
     Antes las tres versiones (computador, tablet y celular) se dibujaban
     siempre y se escondían con CSS: el navegador mantenía tres copias de
     la tabla de productos y React repintaba las tres con cada tecla.
     Ahora se monta solo la que corresponde. Además de ir más rápido,
     esto elimina de raíz los errores por campos duplicados (el cursor
     saltaba a una casilla invisible). */
  /* Computador desde 1024 px: tabla completa a dos columnas. Antes lo
     era desde 1280, y un portátil con la pantalla al 125 % (1093 px)
     caía en la vista de tablet, con los botones montados encima. */
  const [esEscritorio] = useMediaQuery('(min-width: 64em)', { ssr: false });
  const [esCelular]    = useMediaQuery('(max-width: 47.99em)', { ssr: false });
  /* Celular y tablet trabajan por pasos: Cliente → Productos → Enviar */
  const porPasos = !esEscritorio;

  /* ¿Está abierto el teclado del teléfono? Mientras se escribe, la barra
     fija de abajo se esconde: con el teclado arriba tapaba justo la
     casilla en la que se estaba escribiendo. */
  const [tecleando, setTecleando] = useState(false);
  useEffect(() => {
    if (!porPasos) return;
    const tactil = window.matchMedia?.('(pointer: coarse)').matches;
    if (!tactil) return;
    const esCampo = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
      (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type)));
    let t;
    const alEntrar = (e) => { if (esCampo(e.target)) { clearTimeout(t); setTecleando(true); } };
    const alSalir = () => { clearTimeout(t); t = setTimeout(() => setTecleando(esCampo(document.activeElement)), 120); };
    document.addEventListener('focusin', alEntrar);
    document.addEventListener('focusout', alSalir);
    return () => { clearTimeout(t); document.removeEventListener('focusin', alEntrar); document.removeEventListener('focusout', alSalir); };
  }, [porPasos]);


  /* ¿Hay cambios sin guardar?
     Antes cualquier cambio de estado marcaba "Sin guardar", incluida la
     propia carga de la cotización: al abrir una guardada ya salía el aviso
     naranja y, al tocar "Ver" o salir, preguntaba por cambios que nadie
     hizo. Ahora se compara contra la firma de lo guardado. En una nueva,
     solo cuenta como cambio si ya tiene algo escrito. */
  useEffect(() => {
    if (editingId && sigRef.current) {
      const actual = firmaDe({
        cliente, cotConfig, items, descG: parseFloat(descLocal) || 0,
        notas, observaciones, aiuConfig, firma,
      });
      setHasChanges(actual !== sigRef.current);
    } else {
      setHasChanges(
        items.some(r => String(r.desc || '').trim() || String(r.price || '').trim())
        || !!String(cliente.nombre || '').trim()
      );
    }
  }, [cliente, cotConfig, items, notas, observaciones, descLocal, aiuConfig, firma, editingId]);

  const stRef = useRef({});
  const itemsRef = useRef(items);   // lectura estable para los atajos de teclado
  useEffect(() => {
    stRef.current = { empresa, cliente, cotConfig, items, descG: parseFloat(descLocal) || 0, notas, observaciones, editingId, aiuConfig, firma };
    itemsRef.current = items;
  });

  /* Título */
  useEffect(() => {
    const num = cotConfig.numero || 'Nueva';
    const cli = cliente.nombre ? ` — ${cliente.nombre}` : '';
    document.title = `${num}${cli} | FerreExpress`;
    return () => { document.title = 'FerreExpress — Cotizador'; };
  }, [cotConfig.numero, cliente.nombre]);

  /* Registrar la cotización abierta como pestaña.
     Se hace aquí (y no en cada botón) para cubrir todas las entradas:
     clic en el historial, botón editar, o URL pegada a mano. */
  useEffect(() => { openTab(id || NEW_TAB_ID); }, [id, openTab]);

  /* Cargar por ID */
  useEffect(() => {
    if (!id) { if (!prellenado) setShowTipoModal(true); return; }
    const cot = getCotizacion(id);
    if (!cot) {
      toast({ title: 'Cotización no encontrada', status: 'error', duration: 3000 });
      navigate('/historial');
      return;
    }
    setCliente(cot.cliente || DEFAULT_CLIENTE);
    setCotConfig(cot.config || DEFAULT_CONFIG);
    setDescLocal(String(cot.descG || 0));
    const itemsCargados = cot.items?.length ? cot.items : [blankRow(), blankRow()];
    setItems(itemsCargados);
    histRef.current?.reiniciar(itemsCargados);   // el deshacer no cruza cotizaciones
    setNotas(cot.notas || DEFAULT_NOTAS);
    setObservaciones(cot.observaciones || '');
    setAiuConfig(cot.aiuConfig || DEFAULT_AIU);
    setFirma(cot.firma || null);
    setEditingId(id);
    setHasChanges(false);
    setShowTipoModal(false);
    /* Firma de referencia: si al cambiar de pestaña sigue igual, no se reguarda */
    sigRef.current = firmaDe({
      cliente:   cot.cliente || DEFAULT_CLIENTE,
      cotConfig: cot.config  || DEFAULT_CONFIG,
      items:     cot.items?.length ? cot.items : [],
      descG:     cot.descG || 0,
      notas:     cot.notas || DEFAULT_NOTAS,
      observaciones: cot.observaciones || '',
      aiuConfig: cot.aiuConfig || DEFAULT_AIU,
      firma:     cot.firma || null,
    });
  }, [id]); // eslint-disable-line

  /* Atajos globales: Ctrl+S guardar · Ctrl+Z deshacer · Ctrl+Shift+Z / Ctrl+Y rehacer · ? atajos */
  useEffect(() => {
    const h = e => {
      // "?" abre el panel de atajos (solo si no se está escribiendo en un input)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName;
        if (!['INPUT','TEXTAREA','SELECT'].includes(tag)) {
          e.preventDefault();
          setShowAtajos(v => !v);
          return;
        }
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); saveRef.current?.(); return; }
      /* Se usa la ref y no `hist` directamente: este efecto se declara antes
         que el hook del historial, y leerlo aquí sería usarlo sin inicializar. */
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!histRef.current?.deshacer()) return;
        toast.closeAll();
        toast({ title: 'Deshecho', status: 'info', duration: 1200, ...AVISO_LATERAL });
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        if (!histRef.current?.rehacer()) return;
        toast.closeAll();
        toast({ title: 'Rehecho', status: 'info', duration: 1200, ...AVISO_LATERAL });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toast]);

  /* Aviso antes de cerrar/recargar con cambios sin guardar (solo si hay contenido real) */
  useEffect(() => {
    const h = e => {
      const hayContenido = items.some(r => r.desc?.trim() || String(r.price || '').trim());
      if (hasChanges && (hayContenido || editingId)) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasChanges, items, editingId]);

  /* Autoguardado de BORRADOR local (solo cotizaciones nuevas sin guardar) */
  useEffect(() => {
    if (editingId || !hasChanges) return;
    if (!items.some(r => r.desc?.trim())) return;
    const t = setTimeout(() => {
      saveDraft({ cliente, cotConfig, items, notas, observaciones, descLocal, aiuConfig, savedAt: Date.now() });
    }, 800);
    return () => clearTimeout(t);
  }, [editingId, hasChanges, cliente, cotConfig, items, notas, observaciones, descLocal, aiuConfig]);

  /* Recuperar borrador al abrir el cotizador nuevo */
  useEffect(() => {
    /* Con "Nueva para este cliente" la persona pidió una hoja en blanco:
       ofrecerle recuperar un borrador viejo sería justo lo contrario. */
    if (id || prellenado) return;
    const d = loadDraft();
    if (d && Array.isArray(d.items) && d.items.some(r => r.desc?.trim())) setDraftFound(d);
  }, [id, prellenado]);

  /* Aviso de que el cliente ya venía escrito, y salto directo a Productos:
     los datos del cliente son justo el paso que acabamos de ahorrarle. */
  useEffect(() => {
    if (!prellenado) return;
    setPanelTab(0);     // pestaña Cliente, para verificar de un vistazo
    setMobileStep(1);   // celular: directo a Productos, que es lo que falta
    toast({
      title: `Cotización nueva para ${prellenado.nombre || 'el cliente'}`,
      description: 'Los datos del cliente ya están puestos. Solo faltan los productos.',
      status: 'success', duration: 4000, ...AVISO_LATERAL,
    });
  }, [prellenado, toast]);

  /* Traer datos de empresa desde la nube (mismo membrete en toda PC) */
  useEffect(() => {
    if (!nubeActiva()) return;
    pullEmpresa().then(remote => {
      if (remote && Object.keys(remote).length) {
        setEmpresaState(prev => ({ ...prev, ...remote }));
        saveEmpresaLocal({ ...loadEmpresaLocal(), ...remote });
      }
    }).catch(() => {});
  }, []);

  const recuperarBorrador = useCallback(() => {
    const d = draftFound;
    if (!d) return;
    setCliente(d.cliente || DEFAULT_CLIENTE);
    setCotConfig(d.cotConfig || { ...DEFAULT_CONFIG });
    setItems(d.items?.length ? d.items : [blankRow(), blankRow()]);
    setNotas(d.notas ?? DEFAULT_NOTAS);
    setObservaciones(d.observaciones ?? '');
    setDescLocal(String(d.descLocal ?? '0'));
    setAiuConfig(d.aiuConfig || { ...DEFAULT_AIU });
    setShowTipoModal(false);
    setDraftFound(null);
    setHasChanges(true);
  }, [draftFound]);

  const descartarBorrador = useCallback(() => { clearDraft(); setDraftFound(null); }, []);

  const descGNum = useMemo(() => parseFloat(descLocal) || 0, [descLocal]);
  const totals = useMemo(() =>
    esObra
      ? calcTotalsObra(items, descGNum, aiuConfig)
      : calcTotals(items, descGNum, cotConfig.iva),
    [items, descGNum, cotConfig.iva, esObra, aiuConfig]
  );

  /* ── Deshacer / rehacer sobre la tabla de productos ──
     Se expone por ref porque el efecto que carga una cotización está
     declarado más arriba y necesita reiniciar el historial. */
  const hist = useHistorialEdicion(items, setItems);
  /* Se toma la función suelta, no el objeto: `marcar` es estable y así
     las acciones de la tabla (agregar, borrar, duplicar) no se recrean
     en cada repintado — que es lo que rompía la memoización de las filas. */
  const { marcar: marcarHist } = hist;
  useEffect(() => { histRef.current = hist; }, [hist]);

  /* ── Operaciones de ítems ── */
  const addItem = useCallback(() => {
    marcarHist('Fila agregada');
    const row = blankRow();
    setItems(p => [...p, row]);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      focusInput(tableRef.current, row.id, 'desc')
    ));
  }, [marcarHist]);

  /* Igual que addItem pero SIN mover el cursor: lo usa la lista rápida
     de celular/tablet para dejar siempre un renglón vacío esperando
     abajo, sin arrancarle el teclado de las manos a quien escribe. */
  const addItemSilencioso = useCallback(() => {
    setItems(p => {
      const ult = p[p.length - 1];
      // si el último ya está vacío no hace falta otro
      if (ult && !ult.desc?.trim() && !(parseFloat(ult.price) > 0)) return p;
      return [...p, blankRow()];
    });
  }, []);

  /* Eliminar avisa con opción de deshacer: borrar sin red es la queja
     clásica de estas tablas, y el producto ya digitado se pierde entero. */
  /* Borrar un producto.
     EL AVISO LLEVA SU PROPIO "DESHACER": decía "Ctrl+Z para deshacer", que
     en un celular no existe. Quien borra sin querer en el mostrador
     necesita un botón que se pueda tocar, y ahí mismo. */
  const removeItem = useCallback(rid => {
    let borrada = null;
    marcarHist('Fila eliminada');
    setItems(p => {
      if (p.length <= 1) return p;
      borrada = p.find(r => r.id === rid);
      return p.filter(r => r.id !== rid);
    });
    if (!borrada) return;
    const nombre = borrada.desc?.trim();
    toast.closeAll();
    toast({
      duration: 5000,
      ...AVISO_LATERAL,
      render: ({ onClose }) => (
        <Flex align="center" gap={3} bg="gray.700" color="white"
          rounded="lg" px={4} py={3} boxShadow="0 6px 20px rgba(0,0,0,.3)">
          <Text fontSize="14px" fontWeight="600" noOfLines={1}>
            {nombre ? `"${nombre}" eliminado` : 'Producto eliminado'}
          </Text>
          <Button size="sm" variant="solid" bg={FY} color={DARK} rounded="md"
            _hover={{ bg: '#e0b010' }} minH="36px" px={4} flexShrink={0}
            onClick={() => { histRef.current?.deshacer(); onClose(); }}>
            Deshacer
          </Button>
        </Flex>
      ),
    });
  }, [marcarHist, toast]);

  const duplicateItem = useCallback(rid => {
    marcarHist('Fila duplicada');
    setItems(p => {
      const idx = p.findIndex(r => r.id === rid);
      if (idx < 0) return p;
      const copy = { ...p[idx], id: crypto.randomUUID?.() || Date.now().toString(36) };
      const next = [...p];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, [marcarHist]);
  const upItem = useCallback((rid, k, v) => {
    if ((k === 'price' || k === 'disc') && parseFloat(v) < 0) v = '0';
    if (k === 'disc' && parseFloat(v) > 100) v = '100';
    /* La cantidad puede quedar vacía o en 0 MIENTRAS se escribe ("0,5"):
       forzarla a 1 en cada tecla convertía 0,5 en 1,5. Al salir de la
       casilla se corrige si quedó vacía (ver la casilla de cantidad). */
    setItems(p => p.map(r => {
      if (r.id !== rid) return r;
      const next = { ...r, [k]: v };
      // Auto-detección de transporte (único servicio sin IVA) mientras no se fije a mano
      if (k === 'desc' && !next.sinIvaManual) next.sinIva = esTransporte(v);
      return next;
    }));
  }, []);

  /* Alternar "sin IVA" a mano (transporte). Marca sinIvaManual para no auto-cambiar. */
  const toggleSinIva = useCallback(rid => {
    setItems(p => p.map(r => r.id === rid ? { ...r, sinIva: !r.sinIva, sinIvaManual: true } : r));
  }, []);

  /* Agregar fila de transporte lista (sin IVA) */
  const addTransporte = useCallback(() => {
    const row = { ...blankRow(), desc: 'Transporte', unit: 'Global', sinIva: true, sinIvaManual: true };
    setItems(p => [...p, row]);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      focusInput(tableRef.current, row.id, 'price')
    ));
  }, []);

  /* ── Reordenar filas arrastrando verticalmente (drag & drop) ── */
  const [dragId, setDragId] = useState(null);
  const startRowDrag = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDragId(id);
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      const y = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (y == null) return;
      // Índice destino = cuántos puntos medios de filas visibles quedan por encima del cursor
      let target = 0;
      document.querySelectorAll('[data-drag-row]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0) return;               // omitir filas ocultas (otra vista)
        if (y > rect.top + rect.height / 2) target++;
      });
      setItems((prev) => {
        const from = prev.findIndex((r) => r.id === id);
        if (from < 0) return prev;
        const to = Math.min(Math.max(target, 0), prev.length - 1);
        if (to === from) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    };
    const onUp = () => {
      setDragId(null);
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const handleAcceptSugerencia = useCallback((rowId, { desc, price, unit }) => {
    setItems(p => p.map(r =>
      r.id === rowId
        ? { ...r, desc, price: price || r.price, unit: unit || r.unit,
            sinIva: r.sinIvaManual ? r.sinIva : esTransporte(desc) }
        : r
    ));
    requestAnimationFrame(() => focusInput(tableRef.current, rowId, 'qty'));
  }, []);

  /* ════════════════════════════════════════════════
     ATAJOS DE TECLADO — TABLA
     Tab / Shift+Tab : avanza / retrocede campos
     Enter           : nueva fila desde desc, o avanza campo
     ↑ / ↓           : sube / baja fila (mismo campo)
     Ctrl+D          : duplica fila actual
     Ctrl+Enter      : agrega fila nueva al final
     Delete (vacía)  : elimina fila vacía
     Escape          : quita el foco
  ════════════════════════════════════════════════ */

  /* ── Pegar desde Excel / Google Sheets / cualquier tabla ──────
     Cuando el usuario tiene el foco en la tabla y pega (Ctrl+V),
     si el portapapeles tiene datos tabulares los convierte en filas
     de la cotización. Columnas detectadas por cabecera o por posición:
       desc | qty | unit | price | disc
     Si la hoja tiene una sola columna se toma como descripción.
  ══════════════════════════════════════════════════════════════ */
  const handlePasteExcel = useCallback((e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return;

    // Detectar si la primera línea es una cabecera de Excel (no tiene números en cols numéricas)
    const rows = lines.map(l => l.split("\t"));
    const maxCols = Math.max(...rows.map(r => r.length));

    // Si solo hay una columna y solo texto, podría ser accidental — no interceptar
    if (maxCols === 1 && lines.length === 1) return;

    // Detectar cabeceras conocidas
    const HEADER_PATTERNS = [/^(ítem|item|#|num|n[°º])/i, /desc/i, /cant/i, /unid/i, /prec/i, /val/i, /desc.*%/i];
    const firstRow = rows[0].map(c => c.trim().toLowerCase());
    const isHeader = firstRow.some(c => HEADER_PATTERNS.some(p => p.test(c)));
    const dataRows = isHeader ? rows.slice(1) : rows;

    if (dataRows.length === 0) return;

    // Mapeo de columnas: buscar por nombre o usar posición por defecto
    let colMap = { desc: 1, qty: 2, unit: 3, price: 4, disc: 5 }; // 1-based, 0 = ignorar
    if (isHeader) {
      const ci = firstRow;
      colMap = {
        desc:  ci.findIndex(c => /desc|nombre|product|actividad|concepto/i.test(c)) + 1 || 1,
        qty:   ci.findIndex(c => /cant|qty|quantity/i.test(c)) + 1 || 2,
        unit:  ci.findIndex(c => /unid|unit/i.test(c)) + 1 || 3,
        price: ci.findIndex(c => /prec|val|price|vr\.?\s*unit/i.test(c)) + 1 || 4,
        disc:  ci.findIndex(c => /desc.*%|disc|%desc/i.test(c)) + 1 || 0,
      };
    }

    const get = (row, col) => col > 0 ? (row[col - 1] || "").trim() : "";
    /* Antes se quitaban todos los puntos: "2.5" de cantidad quedaba 25 */
    const toNum = (s, tipo = "precio") => parseFloat(parseNumeroCO(s, { tipo, decimales: tipo === "cantidad" ? 3 : 2 })) || 0;

    const nuevas = dataRows
      .filter(row => row.some(c => c.trim()))
      .map(row => ({
        ...blankRow(),
        desc:  get(row, colMap.desc),
        qty:   String(toNum(get(row, colMap.qty), "cantidad") || 1),
        unit:  get(row, colMap.unit) || "Und",
        price: String(toNum(get(row, colMap.price)) || ""),
        disc:  Math.min(100, toNum(get(row, colMap.disc), "porcentaje")),
      }))
      .filter(r => r.desc || r.price);

    if (nuevas.length === 0) return;

    e.preventDefault();
    setItems(prev => {
      // Si la última fila está vacía, reemplazarla; si no, agregar
      const ultimaVacia = prev.length > 0 && !prev[prev.length - 1].desc && !prev[prev.length - 1].price;
      return ultimaVacia ? [...prev.slice(0, -1), ...nuevas] : [...prev, ...nuevas];
    });
    setHasChanges(true);
    toast({
      title: `${nuevas.length} fila${nuevas.length > 1 ? "s" : ""} pegada${nuevas.length > 1 ? "s" : ""} desde Excel ✓`,
      status: "success", duration: 3000, ...AVISO_LATERAL,
    });
  }, [toast]);

  /* ── CÓDIGO DE BARRAS → PRODUCTO ──
     Un solo punto de entrada para todo lo que trae un código: la cámara
     del celular, la pistola lectora del computador (que "escribe" el
     código y da Enter) o alguien que lo digita a mano.
     · Si el código ya está en el catálogo aprendido → llena nombre,
       precio y unidad, y el cursor queda en la cantidad.
     · Si no → guarda el código en la referencia y pide el nombre. Al
       guardar la cotización el catálogo lo aprende: la próxima vez que
       se escanee, sale solo.
     rowIdDestino: fila a llenar. Sin él se usa la última fila si está
     vacía, o se crea una nueva. */
  const agregarPorCodigo = useCallback((codigoCrudo, rowIdDestino = null) => {
    const codigo = String(codigoCrudo || '').trim();
    if (!codigo) return;
    const prod = buscarPorCodigo(codigo);
    const datos = prod
      ? { ref: codigo, desc: prod.desc, price: prod.price || '', unit: prod.unit || 'Und',
          sinIva: esTransporte(prod.desc) }
      : { ref: codigo };

    marcarHist(prod ? 'Producto escaneado' : 'Código escaneado');
    const lista = itemsRef.current;
    let destino = rowIdDestino && lista.some(r => r.id === rowIdDestino) ? rowIdDestino : null;
    if (!destino) {
      const ult = lista[lista.length - 1];
      if (ult && !ult.desc?.trim() && !(parseFloat(ult.price) > 0) && !String(ult.ref || '').trim()) destino = ult.id;
    }
    if (destino) {
      const id = destino;
      setItems(p => p.map(r => {
        if (r.id !== id) return r;
        /* Si el código quedó escrito en el nombre (pistola con el cursor
           ahí), ese "7702…" no es un nombre: se reemplaza o se limpia. */
        const descEraCodigo = String(r.desc || '').trim() === codigo;
        return { ...r, ...datos, ...(!prod && descEraCodigo ? { desc: '' } : null) };
      }));
    } else {
      const row = { ...blankRow(), ...datos };
      destino = row.id;
      setItems(p => [...p, row]);
    }
    const campo = prod ? 'qty' : 'desc';
    const id = destino;
    /* Ya mismo (pistola) y otra vez cuando cierre la ventana del escáner */
    requestAnimationFrame(() => focusInput(tableRef.current, id, campo));
    setTimeout(() => focusInput(tableRef.current, id, campo), 320);
    toast(prod
      ? { title: prod.desc, description: `Código ${codigo} · escribe la cantidad`, status: 'success', duration: 1800, ...AVISO_LATERAL }
      : { title: `Código ${codigo}`, description: 'Producto nuevo: escribe el nombre. Al guardar, la próxima vez saldrá solo.', status: 'info', duration: 3500, ...AVISO_LATERAL });
  }, [buscarPorCodigo, marcarHist, toast]);

  /* ── Pistola lectora en el computador, sin hacer clic en ninguna casilla ──
     La pistola se comporta como un teclado que escribe MUY rápido y
     termina con Enter. Si el cursor no está en ninguna casilla esas
     teclas se perderían; aquí se recogen y el producto se agrega solo.
     Una persona no teclea 4+ caracteres con menos de 60 ms entre cada
     uno, así que no se confunde con alguien escribiendo. */
  useEffect(() => {
    if (esCelular || isPreview) return;
    let buf = '';
    let ultima = 0;
    const onKey = (e) => {
      const t = e.target;
      const editable = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (editable || e.ctrlKey || e.metaKey || e.altKey) { buf = ''; return; }
      const ahora = performance.now();
      if (ahora - ultima > 60) buf = '';
      ultima = ahora;
      if (e.key === 'Enter') {
        if (buf.length >= 4) { e.preventDefault(); agregarPorCodigo(buf); }
        buf = '';
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [esCelular, isPreview, agregarPorCodigo]);

  const handleTableKeyDown = useCallback(e => {
    const el = e.target;
    if (!el) return;
    const rowId = el.dataset?.rowId;
    const field = el.dataset?.field;
    if (!rowId || !field) return;

    const ORDER = ['desc', 'qty', 'unit', 'price', 'disc'];
    const fIdx = ORDER.indexOf(field);

    /* ── La lista de sugerencias manda mientras esté abierta ──
       Esta tabla escucha las teclas en fase de captura, o sea antes que el
       campo. Sin esta salida se quedaba con Enter y con Tab, y la sugerencia
       resaltada nunca se aceptaba — aunque el pie de la lista dijera
       "Enter/Tab aceptar". Aquí se le devuelven las teclas que le tocan. */
    const sugAbierta = el.dataset?.sugAbierta === '1';
    const haySeleccion = el.dataset?.sugSel === '1';
    if (sugAbierta) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape') return;
      if ((e.key === 'Enter' || e.key === 'Tab') && haySeleccion) return;
    }

    /* ── Código de barras con la pistola (o digitado) ──
       La pistola "escribe" el código donde esté el cursor y da Enter. En
       la referencia vale cualquier código; en el nombre, solo si es puro
       número de 6 a 14 cifras (un nombre de producto nunca es eso). */
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey &&
        (field === 'ref' || field === 'desc')) {
      const v = String(el.value || '').trim();
      if (field === 'ref' ? v.length >= 3 : ES_CODIGO_BARRAS.test(v)) {
        e.preventDefault();
        e.stopPropagation();
        agregarPorCodigo(v, rowId);
        return;
      }
    }

    /* Escape — quitar foco */
    if (e.key === 'Escape') {
      e.preventDefault();
      el.blur();
      return;
    }

    /* Ctrl+S — guardar (ya manejado globalmente, solo prevenir default aquí) */
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return;
    }

    /* Ctrl+D — duplicar fila */
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      e.stopPropagation();
      duplicateItem(rowId);
      return;
    }

    /* Ctrl+Enter — agregar fila nueva al final */
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const nr = blankRow();
      setItems(cur => [...cur, nr]);
      requestAnimationFrame(() => requestAnimationFrame(() =>
        focusInput(tableRef.current, nr.id, 'desc')
      ));
      return;
    }

    /* Delete / Suprimir en cualquier campo — eliminar fila si está vacía,
       o limpiar el campo actual si tiene contenido */
    if (e.key === 'Delete') {
      const lista = itemsRef.current;
      const row = lista.find(r => r.id === rowId);
      if (!row) return;
      const isEmpty = !row.desc?.trim() && !String(row.price || '').trim() && String(row.qty) === '1';
      if (isEmpty && lista.length > 1) {
        // Fila vacía → eliminarla
        e.preventDefault();
        e.stopPropagation();
        setItems(cur => {
          const idx = cur.findIndex(r => r.id === rowId);
          const target = cur[Math.max(0, idx - 1)];
          requestAnimationFrame(() => focusInput(tableRef.current, target.id, field));
          return cur.filter(r => r.id !== rowId);
        });
      } else {
        // Fila con contenido → limpiar solo ese campo
        e.preventDefault();
        e.stopPropagation();
        upItem(rowId, field, field === 'qty' ? '1' : field === 'disc' ? '0' : '');
      }
      return;
    }

    /* ── Helpers para decidir si el cursor está al borde del texto ── */
    const isInput = el.tagName === 'INPUT';
    const selStart = isInput ? el.selectionStart : 0;
    const selEnd = isInput ? el.selectionEnd : 0;
    const valLen = isInput ? (el.value || '').length : 0;
    const atStart = selStart === 0 && selEnd === 0;
    const atEnd = selStart === valLen && selEnd === valLen;
    const hasSelect = selStart !== selEnd;
    // En campos numéricos o select, las flechas siempre navegan
    const isNumericField = field === 'qty' || field === 'price' || field === 'disc';
    const isSelectEl = el.tagName === 'SELECT';

    /* ↑ — subir fila: siempre en campos numéricos/select,
       en desc solo si el cursor está en posición 0 sin selección */
    if (e.key === 'ArrowUp') {
      const shouldNav = isSelectEl || isNumericField || (atStart && !hasSelect);
      if (shouldNav) {
        e.preventDefault();
        e.stopPropagation();
        setItems(cur => {
          const idx = cur.findIndex(r => r.id === rowId);
          if (idx > 0) focusInput(tableRef.current, cur[idx - 1].id, field);
          return cur;
        });
        return;
      }
    }

    /* ↓ — bajar fila: siempre en campos numéricos/select,
       en desc solo si el cursor está al final sin selección */
    if (e.key === 'ArrowDown') {
      const shouldNav = isSelectEl || isNumericField || (atEnd && !hasSelect);
      if (shouldNav) {
        e.preventDefault();
        e.stopPropagation();
        setItems(cur => {
          const idx = cur.findIndex(r => r.id === rowId);
          if (idx < cur.length - 1) {
            focusInput(tableRef.current, cur[idx + 1].id, field);
          } else {
            const nr = blankRow();
            requestAnimationFrame(() => requestAnimationFrame(() =>
              focusInput(tableRef.current, nr.id, field)
            ));
            return [...cur, nr];
          }
          return cur;
        });
        return;
      }
    }

    /* ← — campo anterior: solo si el cursor está al inicio sin selección */
    if (e.key === 'ArrowLeft' && fIdx > 0) {
      const shouldNav = isSelectEl || isNumericField || (atStart && !hasSelect);
      if (shouldNav) {
        e.preventDefault();
        e.stopPropagation();
        focusInput(tableRef.current, rowId, ORDER[fIdx - 1]);
        return;
      }
    }

    /* → — campo siguiente: solo si el cursor está al final sin selección */
    if (e.key === 'ArrowRight' && fIdx >= 0 && fIdx < ORDER.length - 1) {
      const shouldNav = isSelectEl || isNumericField || (atEnd && !hasSelect);
      if (shouldNav) {
        e.preventDefault();
        e.stopPropagation();
        focusInput(tableRef.current, rowId, ORDER[fIdx + 1]);
        return;
      }
    }

    /* Enter en desc — avanzar a qty SOLO si el autocomplete no está abierto
       (el autocomplete maneja su propio Enter internamente) */
    if (e.key === 'Enter' && field === 'desc') {
      e.preventDefault();
      e.stopPropagation();
      focusInput(tableRef.current, rowId, 'qty');
      return;
    }

    /* Enter en último campo (disc) — nueva fila */
    if (e.key === 'Enter' && field === 'disc') {
      e.preventDefault();
      e.stopPropagation();
      setItems(cur => {
        const idx = cur.findIndex(r => r.id === rowId);
        const next = cur[idx + 1];
        if (next) {
          requestAnimationFrame(() => focusInput(tableRef.current, next.id, 'desc'));
          return cur;
        }
        const nr = blankRow();
        requestAnimationFrame(() => requestAnimationFrame(() =>
          focusInput(tableRef.current, nr.id, 'desc')
        ));
        return [...cur, nr];
      });
      return;
    }

    /* Enter en campos intermedios — avanzar al siguiente */
    if (e.key === 'Enter' && fIdx >= 0 && fIdx < ORDER.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      focusInput(tableRef.current, rowId, ORDER[fIdx + 1]);
      return;
    }

    /* Tab — navegar campos en orden */
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.shiftKey) {
        if (fIdx >= 0 && fIdx < ORDER.length - 1) {
          focusInput(tableRef.current, rowId, ORDER[fIdx + 1]);
        } else {
          setItems(cur => {
            const idx = cur.findIndex(r => r.id === rowId);
            const next = cur[idx + 1];
            if (next) {
              requestAnimationFrame(() => focusInput(tableRef.current, next.id, 'desc'));
              return cur;
            }
            const nr = blankRow();
            requestAnimationFrame(() => requestAnimationFrame(() =>
              focusInput(tableRef.current, nr.id, 'desc')
            ));
            return [...cur, nr];
          });
        }
      } else {
        if (fIdx > 0) {
          focusInput(tableRef.current, rowId, ORDER[fIdx - 1]);
        } else {
          setItems(cur => {
            const idx = cur.findIndex(r => r.id === rowId);
            const prev = cur[idx - 1];
            if (prev) requestAnimationFrame(() => focusInput(tableRef.current, prev.id, 'disc'));
            return cur;
          });
        }
      }
    }
    /* Sin `items` en las dependencias a propósito: se lee de itemsRef.
       Si dependiera de items, este manejador se recrearía en cada tecla y
       anularía la memoización de toda la tabla de productos. */
  }, [duplicateItem, upItem, agregarPorCodigo]);

  /* ── Guardado ── */
  const autoSave = useCallback(async () => {
    const { empresa, cliente, cotConfig, items, descG, notas, observaciones, editingId, aiuConfig, firma } = stRef.current;
    if (!items.some(r => r.desc?.trim())) return null;
    /* Sin cambios reales no se reguarda: así saltar entre pestañas no
       reordena el historial ni genera escrituras en la nube. */
    const sig = firmaDe(stRef.current);
    if (editingId && sig === sigRef.current) return null;
    /* Al actualizar una existente se respeta su estado; solo las nuevas nacen como borrador */
    const cfg = editingId ? { ...cotConfig } : { ...cotConfig, estado: 'borrador' };
    const tot = cfg.tipo === 'obra'
      ? calcTotalsObra(items, descG, aiuConfig)
      : calcTotals(items, descG, cfg.iva);
    try {
      const saved = await saveCotizacion({ id: editingId, empresa, cliente, config: cfg, items, descG, notas, observaciones, totals: tot, aiuConfig, firma });
      clearDraft();
      sigRef.current = sig;
      /* Si era la pestaña "Nueva", pasa a ser su COT-XXX sin moverse de sitio */
      if (!editingId && saved?.id) replaceTab(NEW_TAB_ID, saved.id);
      return saved;
    }
    catch (err) { console.error('[autoSave]', err); return null; }
  }, [saveCotizacion, replaceTab]);

  /* La barra de pestañas usa esto para guardar antes de cambiar de cotización.
     Se limpia al desmontar para que no quede apuntando a un editor cerrado. */
  useEffect(() => {
    registerAutoSave(autoSave);
    return () => registerAutoSave(null);
  }, [registerAutoSave, autoSave]);

  const handleSave = useCallback(async (extraCfg) => {
    /* Puede llegar el evento del clic: solo se toma si es un objeto de config */
    const extra = extraCfg && typeof extraCfg === 'object' && !('nativeEvent' in extraCfg) && !('target' in extraCfg)
      ? extraCfg : null;
    if (!items.some(r => r.desc?.trim())) {
      toast({ title: 'Agrega al menos un producto', status: 'warning', duration: 4000, ...AVISO_LATERAL });
      return null;
    }
    setIsSaving(true);
    const descG = parseFloat(descLocal) || 0;
    try {
      const cfgGuardar = extra ? { ...cotConfig, ...extra } : cotConfig;
      const payload = { id: editingId, empresa, cliente, config: cfgGuardar, items, descG, notas, observaciones, totals, aiuConfig, firma };
      const saved = await saveCotizacion(payload);
      if (extra && editingId) setCotConfig(cfgGuardar);
      aprenderProductos(items);
      aprenderCliente(cliente);   // alimenta el directorio para la próxima vez
      clearDraft();
      /* Queda como referencia de "ya guardado". En una nueva, el número
         recién asignado entra en la configuración: se firma con él para
         que el aviso no vuelva a "Sin guardar" justo después de crearla. */
      sigRef.current = firmaDe({
        ...stRef.current,
        cotConfig: (saved?.config && (!editingId || extra)) ? saved.config : stRef.current.cotConfig,
      });
      if (!editingId) {
        if (saved?.config) setCotConfig(saved.config);
        setEditingId(saved.id);
        replaceTab(NEW_TAB_ID, saved.id);   // la pestaña "Nueva" pasa a ser COT-XXX
        navigate(`/cotizador/${saved.id}`, { replace: true });
        toast({
          title: 'Cotización creada ✓', description: saved?.numero ? `Número: ${saved.numero}` : '',
          status: 'success', duration: 4000, ...AVISO_LATERAL
        });
      } else {
        toast({ title: 'Guardado ✓', status: 'success', duration: 2000, ...AVISO_LATERAL });
      }
      setHasChanges(false);
      return saved;
    } catch (e) {
      toast({ title: 'Error al guardar', description: e.message, status: 'error', duration: 4000 });
      return null;
    } finally { setIsSaving(false); }
  }, [editingId, empresa, cliente, cotConfig, descLocal, items, notas, observaciones, totals, aiuConfig, firma,
    saveCotizacion, navigate, toast, replaceTab]);

  useEffect(() => { saveRef.current = handleSave; }, [handleSave]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    deleteCotizacion(editingId);
    toast({ title: 'Cotización eliminada', status: 'info', duration: 2500, ...AVISO_LATERAL });
    navigate('/historial');
  }, [editingId, deleteCotizacion, navigate, toast]);

  const handleDuplicate = useCallback(async () => {
    if (!editingId) return;
    const copia = await duplicarCotizacion(editingId);
    if (!copia) return;
    toast({ title: 'Cotización duplicada ✓', status: 'success', duration: 2000, ...AVISO_LATERAL });
    navigate(`/cotizador/${copia.id}`);
  }, [editingId, duplicarCotizacion, navigate, toast]);

  const safeNavigate = useCallback(path => {
    if (hasChanges) { setPendingNav(path); onExitOpen(); }
    else if (path === 'preview') setIsPreview(true);
    else navigate(path);
  }, [hasChanges, navigate, onExitOpen]);

    const doClear = useCallback(() => {
    setCliente(DEFAULT_CLIENTE);
    setCotConfig({ ...DEFAULT_CONFIG });
    setAiuConfig({ ...DEFAULT_AIU });
    setItems([blankRow(), blankRow()]);
    setNotas(DEFAULT_NOTAS);
    setObservaciones('');
    setDescLocal('0');
    setFirma(null);
    setEditingId(null);
    setHasChanges(false);
    setMobileStep(0);
    setShowTipoModal(true);
    clearDraft();
    navigate('/cotizador', { replace: true });
  }, [navigate]);

  const confirmExit = useCallback(() => {
    onExitClose(); autoSave(); setHasChanges(false);
    if (pendingNav === '__clear__') { doClear(); }
    else if (pendingNav === 'preview') setIsPreview(true);
    else if (pendingNav) navigate(pendingNav);
    setPendingNav(null);
  }, [pendingNav, autoSave, navigate, onExitClose, doClear]);

  const discardAndExit = useCallback(() => {
    onExitClose(); setHasChanges(false);
    if (pendingNav === '__clear__') { doClear(); }
    else if (pendingNav === 'preview') setIsPreview(true);
    else if (pendingNav) navigate(pendingNav);
    setPendingNav(null);
  }, [pendingNav, navigate, onExitClose, doClear]);

  const handleClear = useCallback(() => {
    if (hasChanges) { setPendingNav('__clear__'); onExitOpen(); }
    else doClear();
  }, [hasChanges, doClear, onExitOpen]);

  /* Genera el PDF de verdad, ya sin comprobaciones */
  const generarPDF = useCallback(async () => {
    // PDF en un clic: si es nueva o hay cambios, guarda primero (asigna numero)
    let numero = cotConfig.numero;
    if (!editingId || hasChanges) {
      const saved = await handleSave();
      if (!saved) return;
      numero = saved.numero || saved.config?.numero || numero;
    }
    // Montar el PDF oculto solo ahora y esperar a que pinte (fluidez)
    setPdfReady(true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 60));
    const cn = (cliente.nombre || 'Cliente').replace(/[^a-zA-Z0-9\u00C0-\u024F\u00f1\u00d1\s]/g, '').trim().replace(/\s+/g, '_');
    const ok = await downloadPDF(`${cn}_${numero || 'SinNumero'}`);
    setPdfReady(false);
    if (ok) {
      toast({ title: 'PDF descargado ✓', status: 'success', duration: 2500, ...AVISO_LATERAL });
      if (editingId) addEvento(editingId, 'pdf_generado', `${cn}_${numero || 'SinNumero'}.pdf`);
    } else toast({ title: 'Error generando PDF', status: 'error', duration: 4000 });
  }, [editingId, hasChanges, cotConfig.numero, cliente.nombre, handleSave, downloadPDF, addEvento, toast]);

  /* Comprobaciones antes de descargar.
     El documento sirve de remisi\u00f3n de domicilio: si sale sin direcci\u00f3n o sin
     celular, el mensajero se queda sin saber a d\u00f3nde va. Mejor avisar aqu\u00ed
     que imprimir guiones y descubrirlo en la calle. */
  /* Solo el nombre es indispensable. Dirección y celular hacen falta
     cuando hay domicilio (un renglón de transporte): ahí el documento
     sirve de remisión. En una venta de mostrador no se pregunta nada —
     antes salía este aviso cada vez que alguien sacaba un PDF. */
  const hayDomicilio = useMemo(() => items.some(r => r.sinIva || esTransporte(r.desc)), [items]);
  const faltantesCliente = useMemo(() => {
    const f = [];
    if (!String(cliente.nombre ?? '').trim())    f.push('nombre');
    if (hayDomicilio && !String(cliente.direccion ?? '').trim()) f.push('direcci\u00f3n');
    if (hayDomicilio && !String(cliente.tel ?? '').trim())       f.push('celular');
    return f;
  }, [cliente.nombre, cliente.direccion, cliente.tel, hayDomicilio]);

  const handlePDF = useCallback(async () => {
    if (!items.some(r => r.desc?.trim())) {
      toast({ title: 'Agrega al menos un producto', status: 'warning', duration: 3500, ...AVISO_LATERAL });
      return;
    }
    if (faltantesCliente.length) { setShowFaltantes(true); return; }
    await generarPDF();
  }, [items, faltantesCliente, generarPDF, toast]);

  /* ── Enviar al cliente (WhatsApp / compartir) ──
     Guarda, arma el PDF y abre el menú de compartir con el archivo ya
     adjunto. Si estaba en borrador, queda como «enviada»: es lo que pasó. */
  const enviarCliente = useCallback(async () => {
    if (!items.some(r => r.desc?.trim())) {
      toast({ title: 'Agrega al menos un producto', status: 'warning', duration: 3500, ...AVISO_LATERAL });
      return;
    }
    if (faltantesCliente.length) { setShowFaltantes(true); return; }
    setEnviando(true);
    try {
      let numero = cotConfig.numero;
      let idActual = editingId;
      const marcar = (cotConfig.estado || 'borrador') === 'borrador' ? { estado: 'enviada' } : null;
      if (!editingId || hasChanges || marcar) {
        const saved = await handleSave(marcar || undefined);
        if (!saved) return;
        numero = saved.numero || saved.config?.numero || numero;
        idActual = saved.id || idActual;
      }
      setPdfReady(true);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 60));
      const cn = (cliente.nombre || 'Cliente').replace(/[^a-zA-Z0-9\u00C0-\u024F\u00f1\u00d1\s]/g, '').trim().replace(/\s+/g, '_');
      const file = await archivoPDF(`${cn}_${numero || 'SinNumero'}`);
      setPdfReady(false);
      if (!file) { toast({ title: 'No se pudo armar el PDF', status: 'error', duration: 4000 }); return; }
      const nombre1 = String(cliente.nombre || '').trim().split(/\s+/)[0];
      const texto = `Hola${nombre1 ? ' ' + nombre1 : ''}, te comparto la cotización ${numero || ''} de ${empresa?.nombre || 'FerreExpress'} por ${money(totals.totalPagar, cotConfig.moneda)}. Quedamos atentos.`;
      const r = await compartirArchivo(file, { texto, tel: cliente.tel });
      if (r === 'sin-gesto') {
        /* Armar el PDF tardó y el teléfono ya no deja compartir sin otro toque */
        toast({
          duration: 20000, ...AVISO_LATERAL,
          render: ({ onClose }) => (
            <Flex bg={DARK} color="white" rounded="lg" p={3} gap={3} align="center" boxShadow="lg">
              <Text fontSize="13px" flex={1}>El PDF está listo.</Text>
              <Button size="sm" bg="#25D366" color="white" leftIcon={<FaWhatsapp />}
                _hover={{ bg: '#1ebe5b' }}
                onClick={() => { onClose(); compartirArchivo(file, { texto, tel: cliente.tel }); }}>
                Enviar ahora
              </Button>
            </Flex>
          ),
        });
      } else if (r === 'descargado') {
        toast({ title: 'PDF descargado', description: 'Se abrió WhatsApp con el mensaje: adjunta el PDF desde Descargas.', status: 'info', duration: 6000, ...AVISO_LATERAL });
      } else if (r === 'compartido' && marcar) {
        toast({ title: 'Enviada ✓', description: 'La marqué como «Enviada» en el listado.', status: 'success', duration: 3000, ...AVISO_LATERAL });
      }
      // Trazabilidad: registrar envío por WhatsApp
      if ((r === 'compartido' || r === 'descargado') && idActual) {
        addEvento(idActual, 'enviada_whatsapp', cliente.nombre || 'cliente');
      }
    } finally {
      setEnviando(false);
      setPdfReady(false);
    }
  }, [items, faltantesCliente, cotConfig, editingId, hasChanges, handleSave, archivoPDF, addEvento, cliente.nombre, cliente.tel, empresa, totals.totalPagar, toast]);

  /* ── Enviar como TEXTO por WhatsApp (sin generar PDF) ──────────
     Mucho más rápido que el PDF. Ideal para:
     · El cajero que necesita la lista en WhatsApp para registrar en Siigo
     · Clientes que ven mejor el texto que un PDF
     Se abre WhatsApp directamente con el mensaje pre-escrito. */
  const enviarComoTexto = useCallback(() => {
    const lineas = items
      .filter(r => r.desc?.trim())
      .map(r => {
        const qtyStr = fmtCantidad(parseFloat(r.qty) || 1);
        const unit  = r.unit && r.unit !== 'Und' ? ` ${r.unit}` : '';
        /* calcRow devuelve un número; antes se leía «.total» de ese número
           y el mensaje salía SIN ningún precio por producto. */
        const total = calcRow(r);
        const precio = total > 0 ? ` ━ ${money(total, cotConfig.moneda)}` : '';
        const disc  = parseFloat(r.disc) > 0 ? ` (-${r.disc}%)` : '';
        return `• ${qtyStr}${unit}  ${r.desc.trim()}${disc}${precio}`;
      });

    const partes = [
      `📋 *${empresa?.nombre || 'FerreExpress'}*${cotConfig.numero ? ` — ${cotConfig.numero}` : ''}`,
      cliente?.nombre ? `👤 ${cliente.nombre}` : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...lineas,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *TOTAL: ${money(totals.totalPagar, cotConfig.moneda)}*`,
      cotConfig.formaPago ? `💳 ${cotConfig.formaPago}` : '',
      notas?.trim() ? `📝 _${notas.trim()}_` : '',
      empresa?.tel ? `\n📞 ${empresa.tel}` : '',
    ].filter(Boolean).join('\n');

    /* Express → siempre al número de la ferre; normal → al del cliente */
    const NUM_FERRE = '3028043116';
    /* telWhatsApp deja el número listo (57 + 10 cifras). Antes se le
       pegaba un 57 a ciegas: si el cliente estaba guardado con +57, el
       número quedaba 5757… y WhatsApp no lo encontraba. */
    const telDestino = telWhatsApp(modoExpress ? NUM_FERRE : cliente?.tel);

    const url = telDestino
      ? `https://wa.me/${telDestino}?text=${encodeURIComponent(partes)}`
      : `https://wa.me/?text=${encodeURIComponent(partes)}`;

    window.open(url, '_blank', 'noopener');
    if (editingId) addEvento(editingId, 'enviada_whatsapp', modoExpress ? 'remisión interna → ferre' : 'texto directo');
  }, [items, cotConfig, empresa, totals, cliente, notas, editingId, addEvento, modoExpress]);

  /* ── Convertir Comercial ⇄ Obra ──
     Los precios NO se tocan; cambia el motor de cálculo, la forma de pago
     (si la actual no aplica) y las notas (solo si siguen siendo las de fábrica).
     `abrirConvertir` es un callback estable: como arrow suelto se recreaba en
     cada tecla y tumbaba la memoización del panel de configuración. */
  const abrirConvertir = useCallback(() => setShowConvertir(true), []);

  /* Elegir un cliente del directorio rellena su ficha completa */
  const handleUsarCliente = useCallback((c) => {
    setCliente({
      nombre: c.nombre || '', direccion: c.direccion || '', tel: c.tel || '',
      empresa: c.empresa || '', nit: c.nit || '', tipoDoc: c.tipoDoc || '', contacto: c.contacto || '',
      correo: c.correo || '', ciudad: c.ciudad || '',
    });
    toast({
      title: `Cliente cargado: ${c.nombre}`,
      description: c.direccion || undefined,
      status: 'success', duration: 2200, ...AVISO_LATERAL,
    });
  }, [toast]);

  const handleConvertirConfirm = useCallback((conv) => {
    setCotConfig(conv.config);
    setAiuConfig(conv.aiuConfig);
    setNotas(conv.notas);
    setHasChanges(true);
    const esObraDest = conv.config.tipo === 'obra';
    toast({
      title: `Ahora es ${esObraDest ? 'Obra' : 'Comercial'} ✓`,
      description: conv.notasPreservadas
        ? 'Tus notas personalizadas se conservaron.'
        : 'Recuerda guardar para aplicar el cambio.',
      status: 'success', duration: 3500, ...AVISO_LATERAL,
    });
  }, [toast]);

  /* ── Confirmar importación ── */
  const handleImportConfirm = useCallback(({ items: imp, cliente: cli, cotConfig: cfg, notas: n }) => {
    if (imp?.length) setItems(imp.map(r => (
      r.sinIvaManual ? r : { ...r, sinIva: esTransporte(r.desc) }
    )));
    if (cli?.nombre) setCliente(c => ({ ...c, ...cli }));
    if (cfg?.numero && !cotConfig.numero) setCotConfig(c => ({ ...c, ...cfg }));
    if (n) setNotas(n);
    setHasChanges(true);
    toast({
      title: `${imp.filter(i => i.desc).length} productos importados ✓`,
      status: 'success', duration: 3000, ...AVISO_LATERAL
    });
  }, [cotConfig.numero, toast]);

  /* Imprimir: se dibuja el documento fuera de la app y se abre el cuadro
     de impresión (ver ZonaImpresion). */
  const imprimirDoc = useCallback(() => {
    imprimir();
    if (editingId) addEvento(editingId, 'impresa');
  }, [imprimir, editingId, addEvento]);

  const exportarExcelDoc = useCallback(async () => {
    const ok = await exportarExcel({ items, cotConfig, cliente, empresa, aiuConfig, notas, descG: descGNum });
    if (ok && editingId) addEvento(editingId, 'excel_exportado');
    if (!ok) toast({ title: 'Error generando Excel', status: 'error', duration: 3000 });
  }, [exportarExcel, items, cotConfig, cliente, empresa, aiuConfig, notas, descGNum, editingId, addEvento, toast]);


  /* ── Colores ── */
  const bg = useColorModeValue('gray.50', 'gray.900');
  const border = useColorModeValue('gray.200', 'whiteAlpha.200');
  const mutedL = useColorModeValue('gray.400', 'gray.600');
  const inputBg = useColorModeValue('white', 'gray.700');
  const barBg = useColorModeValue('white', 'gray.900');
  const tableBg = useColorModeValue('white', 'gray.800');
  const stripeBg = useColorModeValue('gray.50', 'gray.750');
  const tabActive = useColorModeValue('gray.800', 'white');
  const totalColor = useColorModeValue('gray.800', FY);
  const previewBg = useColorModeValue('gray.100', 'gray.900');

  const ivaRate = esObra ? 0 : (parseFloat(cotConfig.iva) || 0) / 100;
  const docProps = { empresa, cot: cotConfig, cli: cliente, items, descG: descGNum, totals, notas, observaciones, aiu: aiuConfig, firma };
  const tablaProps = {
    items, tableRef, handleTableKeyDown, handlePasteExcel, esObra,
    border, mutedL, inputBg, tableBg, stripeBg,
    ivaRate, cotConfig, upItem, removeItem, duplicateItem, toggleSinIva,
    handleAcceptSugerencia, getSugerencias, addItem, addTransporte,
    startRowDrag, dragId,
  };
  const panelClienteProps = { cliente, setCliente, inputBg, getClientes, onUsarCliente: handleUsarCliente };
  const panelCotizProps = { cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas, observaciones, setObservaciones, aiuConfig, setAiuConfig, inputBg, onChangeTipo: abrirConvertir };
  /* Captura rápida (celular y tablet): todos los renglones abiertos a la vez */
  const listaRapidaProps = {
    items, esObra, cotConfig, inputBg, border,
    upItem, removeItem, duplicateItem, toggleSinIva,
    addItem, addItemSilencioso, addTransporte,
    getSugerencias, handleAcceptSugerencia, startRowDrag, dragId,
    onCodigoEscaneado: agregarPorCodigo,
  };
  const nItems = items.filter(r => r.desc || r.price).length;
  const textoGuardar = hasChanges || !editingId ? 'Guardar' : 'Guardado';

  /* Documento oculto para el PDF y la impresión. El del PDF se monta solo
     al exportar: dibujarlo en cada tecla frenaba la escritura. */
  const docOculto = (
    <>
      {(pdfReady || isPreview) && (
        <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px" zIndex={-1} w={`${PAGE_W}px`} bg="white"
          aria-hidden="true">
          <DocContent {...docProps} />
        </Box>
      )}
      <ZonaImpresion activo={imprimiendo}><DocContent {...docProps} /></ZonaImpresion>
    </>
  );

  /* Botón partido de WhatsApp: el envío normal (con el PDF) y, al lado,
     la flecha con la alternativa rápida (solo texto). */
  const botonWhatsApp = ({ h = '32px', size = 'sm', texto = 'Enviar' } = {}) => (
    <ButtonGroup isAttached size={size}>
      <Button data-tour="enviar" bg="#25D366" color="white" h={h} rounded="md" fontWeight="800"
        leftIcon={<FaWhatsapp size={16} />} isLoading={enviando} loadingText="Preparando…"
        _hover={{ bg: '#1ebe5b' }} onClick={enviarCliente}>
        {texto}
      </Button>
      <Menu isLazy placement="top-end">
        <MenuButton as={IconButton} h={h} minW="32px" bg="#1fb85a" color="white" rounded="md"
          _hover={{ bg: '#18a84f' }} _active={{ bg: '#18a84f' }}
          aria-label="Otras formas de enviar" icon={<FiChevronDown />}
          borderLeft="1px solid" borderColor="whiteAlpha.400" />
        <MenuList fontSize="13px" zIndex={400}>
          <MenuItem icon={<FaWhatsapp />} onClick={enviarCliente}>
            Enviar el PDF
          </MenuItem>
          <MenuItem icon={<FiMessageSquare />} onClick={enviarComoTexto}
            command="sin PDF">
            Enviar la lista como texto
          </MenuItem>
        </MenuList>
      </Menu>
    </ButtonGroup>
  );

  /* ════════════════════════════════════════════════
     VISTA PREVIA DEL DOCUMENTO
  ════════════════════════════════════════════════ */
  if (isPreview) return (
    <Box minH="100vh" bg={previewBg}
      pb={{ base: 'calc(76px + env(safe-area-inset-bottom))', md: 0 }}>
      {docOculto}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1100px" mx="auto" px={{ base: 3, md: 5 }} h="56px" align="center" gap={2}>
          <Button size="sm" h="38px" variant="outline" colorScheme="gray" rounded="md" leftIcon={<FiArrowLeft />}
            onClick={() => setIsPreview(false)} flexShrink={0}>
            Volver<Text as="span" display={{ base: 'none', md: 'inline' }}>&nbsp;a editar</Text>
          </Button>
          {cotConfig.numero
            ? <Badge bg={FY} color={DARK} rounded="full" px={3} fontWeight="700" flexShrink={0}>{cotConfig.numero}</Badge>
            : <Tag size="sm" rounded="full" flexShrink={0}>Sin número</Tag>}
          <Badge bg={esObra ? 'blue.100' : 'green.100'} color={esObra ? 'blue.700' : 'green.700'} rounded="full"
            px={2} fontSize="9px" display={{ base: 'none', sm: 'inline-block' }}>
            {esObra ? 'Obra' : 'Comercial'}
          </Badge>
          <Box flex={1} />
          {esCelular ? (
            <Menu isLazy placement="bottom-end">
              <MenuButton as={IconButton} size="sm" h="38px" w="38px" variant="outline" rounded="md"
                aria-label="Más opciones" icon={<FiMoreVertical />} />
              <MenuList fontSize="14px" zIndex={400}>
                <MenuItem icon={<FiSave />} onClick={handleSave}>{textoGuardar}</MenuItem>
                <MenuItem icon={<FiGrid />} onClick={exportarExcelDoc}>Exportar a Excel</MenuItem>
                <MenuItem icon={<FiMessageSquare />} onClick={enviarComoTexto}>Enviar lista como texto</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack spacing={2} flexShrink={0}>
              <Button size="sm" variant="outline" colorScheme="gray" rounded="md" leftIcon={<FiPrinter />}
                onClick={imprimirDoc} title="Imprimir sin descargar el PDF">Imprimir</Button>
              <Button size="sm" variant="outline" colorScheme="gray" rounded="md" leftIcon={<FiGrid />}
                isLoading={xlsxLoading} onClick={exportarExcelDoc} title="Exportar la tabla de productos a Excel"
                display={{ base: 'none', lg: 'inline-flex' }}>Excel</Button>
              <Button size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
                isLoading={pdfLoading && !enviando} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>Descargar PDF</Button>
              {botonWhatsApp()}
              <Button size="sm" bg={hasChanges || !editingId ? FY : 'gray.200'} color={hasChanges || !editingId ? DARK : 'gray.600'}
                rounded="md" fontWeight="700" leftIcon={<FiSave />}
                isLoading={isSaving} _hover={{ bg: hasChanges || !editingId ? '#e0b010' : 'gray.300' }} onClick={handleSave}>
                {textoGuardar}
              </Button>
            </HStack>
          )}
        </Flex>
      </Box>
      <Box maxW="900px" mx="auto" py={{ base: 3, md: 6 }} px={{ base: 2, md: 4 }}>
        <GlassCard rounded="lg" overflow="hidden" boxShadow="0 4px 32px rgba(0,0,0,0.12)">
          <DocEscalado><DocContent {...docProps} /></DocEscalado>
        </GlassCard>
        {esCelular && (
          <Text fontSize="11px" color={mutedL} textAlign="center" mt={2}>
            Junta dos dedos sobre la hoja para ampliarla.
          </Text>
        )}
      </Box>
      {esCelular && (
        <Box position="fixed" bottom={0} left={0} right={0} zIndex={200} bg={barBg}
          borderTop="1px solid" borderColor={border} boxShadow="0 -4px 16px rgba(0,0,0,0.08)"
          pb="env(safe-area-inset-bottom)">
          <Flex px={3} py={2.5} gap={2}>
            <Button flex={1} h="46px" variant="outline" rounded="xl" leftIcon={<FiPrinter />} onClick={imprimirDoc}>
              Imprimir
            </Button>
            <Button flex={1} h="46px" bg={DARK} color={FY} rounded="xl" leftIcon={<FiDownload />}
              isLoading={pdfLoading && !enviando} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>
              PDF
            </Button>
            <Button flex={1.3} h="46px" bg="#25D366" color="white" rounded="xl" fontWeight="800"
              leftIcon={<FaWhatsapp size={18} />} isLoading={enviando} _hover={{ bg: '#1ebe5b' }}
              onClick={enviarCliente}>
              Enviar
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );

  /* ════════════════════════════════════════════════
     EDITOR
  ════════════════════════════════════════════════ */
  const panelIzquierdo = (
    <Tabs variant="unstyled" size="sm" isLazy
      index={panelTab} onChange={setPanelTab}
      display="flex" flexDirection="column" h="full">
      <TabList borderBottom="1px solid" borderColor={border} px={1} pt={1} gap={0.5} flexShrink={0}>
        {[{ l: 'Cliente', i: FiUser, t: 'cliente' }, { l: 'Condiciones', i: FiFileText, t: 'config' }].map(({ l, i: Ic, t }) => (
          <Tab key={l} data-tour={`tab-${t}`} flex={1} fontSize="10px" fontWeight="700" letterSpacing="0.1em"
            textTransform="uppercase" color={mutedL} pb={2.5}
            _selected={{ color: tabActive, borderBottom: `2px solid ${FY}`, mb: '-1px' }}>
            <VStack spacing={1}><Icon as={Ic} boxSize={3.5} /><Text>{l}</Text></VStack>
          </Tab>
        ))}
      </TabList>
      <TabPanels flex={1} minH={0} overflow="hidden">
        {[<PanelCliente key="c" {...panelClienteProps} />,
          <PanelCotizacion key="q" {...panelCotizProps} />].map((panel, i) => (
          <TabPanel key={i} h="full" overflowY="auto" p={0}
            sx={{ '&::-webkit-scrollbar': { w: '4px' }, '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' } }}>
            {panel}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );

  return (
    <Box minH="100vh" bg={bg}>
      {docOculto}

      {/* Modales */}
      <ModalTipo isOpen={showTipoModal && !draftFound} onCancel={editingId ? () => setShowTipoModal(false) : undefined} onSelect={tipo => {
        setCotConfig(p => ({ ...p, tipo, formaPago: tipo === 'obra' ? 'Anticipo + Actas' : 'Efectivo' }));
        setNotas(tipo === 'obra' ? DEFAULT_NOTAS_OBRA : DEFAULT_NOTAS);
        setShowTipoModal(false);
      }}
        onIrHistorial={() => {
          if (!editingId) closeTab(id || NEW_TAB_ID);
          navigate('/historial');
        }}
        onAyuda={() => navigate('/ayuda?tema=nueva')}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        importHook={importHook}
        onConfirm={handleImportConfirm}
      />

      <FirmaModal
        isOpen={showFirma}
        onClose={() => setShowFirma(false)}
        firmante={cliente.nombre}
        cotNumero={cotConfig.numero}
        onGuardar={(f) => {
          setFirma(f);
          setHasChanges(true);
          if (editingId) addEvento(editingId, 'firmada', `Firmado por ${f.firmante || 'cliente'}`);
          toast({ title: 'Firma registrada ✓', status: 'success', duration: 2500, ...AVISO_LATERAL });
        }}
      />

      <PlantillasModal
        isOpen={showPlantillas}
        onClose={() => setShowPlantillas(false)}
        mode={plantillasMode}
        plantillas={plantillas}
        onGuardar={(nombre) => guardarPlantilla({ nombre, items, cotConfig, notas, aiuConfig })}
        onUsar={(p) => {
          // Cargar plantilla: items + config base (no sobreescribe cliente ni número)
          marcarHist('Plantilla cargada');
          const newItems = (p.items || []).map(r => ({ ...r, id: blankRow().id }));
          setItems(newItems.length > 0 ? newItems : items);
          if (p.config) {
            setCotConfig(prev => ({ ...prev, tipo: p.config.tipo, iva: p.config.iva, moneda: p.config.moneda, formaPago: p.config.formaPago }));
          }
          if (p.aiuConfig) setAiuConfig(p.aiuConfig);
          if (p.notas) setNotas(p.notas);
          setHasChanges(true);
          setShowPlantillas(false);
          toast({ title: `Plantilla "${p.nombre}" cargada ✓`, status: 'success', duration: 2500, ...AVISO_LATERAL });
        }}
        onEliminar={eliminarPlantilla}
        onRenombrar={renombrarPlantilla}
      />

      <AtajosPanel isOpen={showAtajos} onClose={() => setShowAtajos(false)} />

      <RegistroSiigo
        isOpen={showSiigo}
        onClose={() => setShowSiigo(false)}
        items={items}
        cotNumero={cotConfig.numero}
        clienteNombre={cliente.nombre}
        moneda={cotConfig.moneda}
        totalPagar={totals.totalPagar}
        onConfirmar={() => {
          setCotConfig(p => ({ ...p, estado: 'entregada' }));
          setHasChanges(true);
          if (editingId) addEvento(editingId, 'estado_cambiado', 'aceptada → entregada');
          toast({ title: '¡Registrado en Siigo! Estado → Entregada ✓', status: 'success', duration: 3000, ...AVISO_LATERAL });
          handleSave({ estado: 'entregada' });
        }}
      />

      {/* Aviso: faltan datos de entrega */}
      <AlertDialog isOpen={showFaltantes} leastDestructiveRef={cancelRef}
        onClose={() => setShowFaltantes(false)} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl" mx={4}>
            <AlertDialogHeader fontWeight="900" fontSize="16px">
              Faltan datos de entrega
            </AlertDialogHeader>
            <AlertDialogBody fontSize="14px">
              <Text mb={3}>
                Esta cotización no tiene{' '}
                <strong>{faltantesCliente.join(', ').replace(/, ([^,]*)$/, ' ni $1')}</strong>.
              </Text>
              <Text fontSize="13px" color="gray.500">
                El documento también sirve de remisión cuando entregas a domicilio,
                y sin esos datos saldría impreso con guiones.
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} size="sm" rounded="md"
                onClick={() => {
                  setShowFaltantes(false);
                  setIsPreview(false);
                  setMobileStep(0);   // celular y tablet: paso "Cliente"
                  setPanelTab(0);     // computador: pestaña "CLIENTE"
                }}>
                Completar datos
              </Button>
              <Button size="sm" rounded="md" variant="ghost" color="gray.500"
                onClick={async () => { setShowFaltantes(false); await generarPDF(); }}>
                Descargar así
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {showConvertir && (
        <ModalConvertirTipo
          isOpen
          onClose={() => setShowConvertir(false)}
          onConfirm={handleConvertirConfirm}
          cotConfig={cotConfig}
          aiuConfig={aiuConfig}
          notas={notas}
          items={items}
          descG={descGNum}
        />
      )}

      {/* ═══ BARRA DE LA COTIZACIÓN ═══
          Una sola fila que NUNCA se parte en dos. Antes, entre 768 y 1279 px
          los botones bajaban a una segunda línea y quedaban montados encima
          del contenido. Ahora, cuando falta ancho, los rótulos se recogen
          y lo que se usa poco se va al menú ⋮. */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1600px" mx="auto" px={{ base: 2, sm: 3, md: 5 }}
          h={{ base: '52px', md: '54px' }} align="center" gap={2}>

          {/* ── IZQUIERDA: dónde estoy y cómo salgo ── */}
          <HStack spacing={{ base: 1.5, md: 2 }} minW={0} flex="1 1 auto" overflow="hidden">
            {/* En el celular no hay barra de navegación arriba: el logo va aquí */}
            {esCelular && <AppLogo variante="marca" h="24px" flexShrink={0} />}
            <Tooltip label="Volver al listado de cotizaciones (se guarda lo que llevas)" hasArrow openDelay={500}>
              <Button size="sm" variant="ghost" colorScheme="gray" rounded="md" flexShrink={0}
                h={{ base: '40px', md: '34px' }} minW={{ base: '40px', md: '34px' }} px={{ base: 0, lg: 2 }}
                leftIcon={<FiArrowLeft />} iconSpacing={{ base: 0, lg: 2 }}
                onClick={() => safeNavigate('/historial')}
                aria-label="Volver a cotizaciones">
                <Text as="span" fontSize="13px" display={{ base: 'none', lg: 'inline' }}>Cotizaciones</Text>
              </Button>
            </Tooltip>
            <Box h="20px" w="1px" bg={border} display={{ base: 'none', lg: 'block' }} flexShrink={0} />
            {cotConfig.numero
              ? <Badge bg={FY} color={DARK} rounded="full" fontSize="11px" px={2.5} fontWeight="800" flexShrink={0}>{cotConfig.numero}</Badge>
              : <Tag size="sm" colorScheme="gray" rounded="full" flexShrink={0}>Nueva</Tag>}
            <Tooltip label={`Convertir a ${esObra ? 'Comercial' : 'Obra'}`} hasArrow>
              <Badge as="button" type="button" bg={esObra ? 'blue.100' : 'green.100'} color={esObra ? 'blue.700' : 'green.700'}
                rounded="full" fontSize="9px" px={2} py={{ base: '6px', lg: '2px' }} cursor="pointer" flexShrink={0}
                _hover={{ opacity: 0.75 }} onClick={() => setShowConvertir(true)}
                display={{ base: 'none', sm: 'inline-block' }}>
                {esObra ? 'OBRA' : 'COMERCIAL'} ⇄
              </Badge>
            </Tooltip>
            {/* ── ESTADO: se cambia sin ir al listado ── */}
            {editingId && (() => {
              const estadoActual = cotConfig.estado || 'borrador';
              const meta = ESTADO_META[estadoActual] || ESTADO_META.borrador;
              return (
                <Box display={{ base: 'none', md: 'block' }} flexShrink={0}>
                  <Menu isLazy placement="bottom-start">
                    <MenuButton as={Button} size="xs" h={{ base: '32px', lg: '24px' }} variant="solid" colorScheme={meta.color}
                      rounded="full" px={2.5} fontSize="10px" fontWeight="700" title={`Estado: ${meta.desc}`}
                      rightIcon={<FiChevronDown size={11} />}>
                      {meta.icon} {meta.label}
                    </MenuButton>
                    <MenuList fontSize="13px" zIndex={300} minW="230px">
                      {ESTADOS.map(e => {
                        const m = ESTADO_META[e];
                        const activo = e === estadoActual;
                        return (
                          <MenuItem key={e}
                            isDisabled={activo}
                            icon={<Text fontSize="14px">{m.icon}</Text>}
                            onClick={() => {
                              const prev = cotConfig.estado || 'borrador';
                              setCotConfig(p => ({ ...p, estado: e }));
                              setHasChanges(true);
                              if (editingId) addEvento(editingId, 'estado_cambiado', `${prev} → ${e}`);
                            }}>
                            <Box>
                              <Text fontWeight={activo ? '700' : '500'}>{m.label}{activo ? ' ← actual' : ''}</Text>
                              <Text fontSize="11px" color="gray.500" mt={0.5}>{m.hint}</Text>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </MenuList>
                  </Menu>
                </Box>
              );
            })()}

            {/* Estado de guardado, SIEMPRE visible */}
            {hasChanges ? (
              <HStack spacing={1} title="Hay cambios sin guardar" flexShrink={0}>
                <Icon as={FiAlertCircle} color="orange.400" boxSize={3.5} />
                <Text fontSize="11px" color="orange.500" fontWeight="700" whiteSpace="nowrap">Sin guardar</Text>
              </HStack>
            ) : (editingId && (
              <HStack spacing={1} title="Todo lo que hiciste está guardado" flexShrink={0}>
                <Icon as={FiCheckCircle} color="green.400" boxSize={3.5} />
                <Text fontSize="11px" color="green.500" fontWeight="700" whiteSpace="nowrap">Guardado</Text>
              </HStack>
            ))}
          </HStack>

          {/* ── DERECHA: deshacer, menú y acciones ── */}
          <HStack spacing={{ base: 1, md: 1.5 }} flexShrink={0}>
            <HStack spacing={0} border="1px solid" borderColor={border} rounded="md" overflow="hidden">
              <Tooltip label={<HStack><Text>Deshacer</Text><Kbd fontSize="10px">Ctrl+Z</Kbd></HStack>} hasArrow>
                <IconButton size="sm" h={{ base: '38px', md: '32px' }} variant="ghost" colorScheme="gray" rounded="none"
                  aria-label="Deshacer el último cambio"
                  icon={<FiCornerUpLeft />} isDisabled={!hist.puedeDeshacer}
                  onClick={() => hist.deshacer()} />
              </Tooltip>
              <Box w="1px" h="20px" bg={border} />
              <Tooltip label={<HStack><Text>Rehacer</Text><Kbd fontSize="10px">Ctrl+Shift+Z</Kbd></HStack>} hasArrow>
                <IconButton size="sm" h={{ base: '38px', md: '32px' }} variant="ghost" colorScheme="gray" rounded="none"
                  aria-label="Rehacer el cambio deshecho"
                  icon={<FiCornerUpRight />} isDisabled={!hist.puedeRehacer}
                  onClick={() => hist.rehacer()} />
              </Tooltip>
            </HStack>

            {/* Todo lo demás, cada cosa con su nombre escrito */}
            <Menu isLazy placement="bottom-end">
              <MenuButton as={IconButton} size="sm" h={{ base: '38px', md: '32px' }} w={{ base: '38px', md: '32px' }}
                variant="outline" colorScheme="gray" rounded="md" aria-label="Más acciones de esta cotización"
                title="Más acciones" icon={<FiMoreVertical />} />
              <MenuList fontSize="13px" zIndex={300} maxH="75vh" overflowY="auto">
                {porPasos && (<>
                  <MenuItem icon={<FiEye size={13} />} onClick={() => safeNavigate('preview')}>
                    Ver el documento
                  </MenuItem>
                  <MenuItem icon={<FiPrinter size={13} />} onClick={imprimirDoc}>
                    Imprimir
                  </MenuItem>
                  <MenuItem icon={<FiDownload size={13} />} onClick={handlePDF}>
                    Descargar PDF
                  </MenuItem>
                  <MenuItem icon={<FiMessageSquare size={13} />} onClick={enviarComoTexto} command="sin PDF">
                    Enviar lista como texto
                  </MenuItem>
                  <MenuDivider />
                </>)}
                <MenuItem icon={<FiUpload size={13} />} onClick={() => setShowImport(true)}
                  command="PDF · foto · Excel">
                  Importar productos
                </MenuItem>
                <MenuItem icon={<FiBookmark size={13} />}
                  onClick={() => { setPlantillasMode("usar"); setShowPlantillas(true); }}
                  command={`${plantillas.length} guardadas`}>
                  Usar plantilla
                </MenuItem>
                <MenuItem icon={<FiBookmark size={13} />}
                  onClick={() => { setPlantillasMode("guardar"); setShowPlantillas(true); }}>
                  Guardar como plantilla
                </MenuItem>
                <MenuItem icon={<FiGrid size={13} />} onClick={exportarExcelDoc}>
                  Exportar a Excel
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={esObra ? <FiShoppingCart size={13} /> : <FiTool size={13} />}
                  onClick={() => setShowConvertir(true)}>
                  Convertir a {esObra ? 'Comercial' : 'Obra'}
                </MenuItem>
                {editingId && (
                  <MenuItem icon={<FiCopy size={13} />} onClick={handleDuplicate}
                    command="con productos">
                    Duplicar esta cotización
                  </MenuItem>
                )}
                <MenuItem icon={<FiFeather size={13} />}
                  onClick={() => setShowFirma(true)}>
                  Capturar firma del cliente
                  {firma && <Badge ml={2} colorScheme="green" fontSize="9px">Firmada</Badge>}
                </MenuItem>
                {editingId && (
                  <MenuItem icon={<Text fontSize="13px">🖥️</Text>}
                    onClick={() => setShowSiigo(true)}>
                    Registrar en Siigo POS
                    <Badge ml={2} colorScheme="teal" fontSize="9px">Cajero</Badge>
                  </MenuItem>
                )}
                {esEscritorio && (
                  <MenuItem icon={<FiHelpCircle size={13} />} onClick={() => setShowAtajos(true)} command="?">
                    Atajos de teclado
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuItem icon={<FiRefreshCw size={13} />} onClick={handleClear}>
                  Vaciar y empezar otra en blanco
                </MenuItem>
                {editingId && (
                  <MenuItem icon={<FiTrash2 size={13} />} color="red.500" onClick={onDelOpen}>
                    Eliminar esta cotización
                  </MenuItem>
                )}
              </MenuList>
            </Menu>

            {/* En celular y tablet estas acciones van abajo, donde llega el pulgar */}
            {esEscritorio && (<>
              <Tooltip label="Ver el documento como va a salir" hasArrow openDelay={400}>
                <Button data-tour="vista-previa" size="sm" variant="outline" colorScheme="gray"
                  rounded="md" leftIcon={<FiEye />} iconSpacing={{ base: 0, xl: 2 }} px={{ base: 2.5, xl: 3 }}
                  aria-label="Vista previa" onClick={() => safeNavigate('preview')}>
                  <Text as="span" display={{ base: 'none', xl: 'inline' }}>Vista previa</Text>
                </Button>
              </Tooltip>
              <Tooltip label="Imprimir directamente, sin descargar el PDF" hasArrow openDelay={400}>
                <IconButton size="sm" variant="outline" colorScheme="gray" rounded="md"
                  aria-label="Imprimir cotización" icon={<FiPrinter />} onClick={imprimirDoc} />
              </Tooltip>
              <Button data-tour="pdf" size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
                isLoading={pdfLoading && !enviando} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>
                PDF
              </Button>
              <Tooltip label={<HStack><Text>Guardar</Text><Kbd fontSize="10px">Ctrl+S</Kbd></HStack>} hasArrow>
                <Button data-tour="guardar" size="sm" minW="104px"
                  bg={hasChanges || !editingId ? FY : 'gray.200'} color={hasChanges || !editingId ? DARK : 'gray.600'}
                  rounded="md" fontWeight="700" leftIcon={hasChanges || !editingId ? <FiSave /> : <FiCheckCircle />}
                  isLoading={isSaving}
                  _hover={{ bg: hasChanges || !editingId ? '#e0b010' : 'gray.300' }} onClick={handleSave}>
                  {textoGuardar}
                </Button>
              </Tooltip>
            </>)}
          </HStack>
        </Flex>
      </Box>

      {/* ═══ COMPUTADOR (desde 1024 px): datos a la izquierda, productos y
          totales a la derecha, todo en el alto de la pantalla ═══ */}
      {esEscritorio && (
        <Box maxW="1600px" mx="auto" px={5} py={4}
          h={`calc(100vh - ${topOffset} - 54px)`} minH="480px"
          display="grid" gridTemplateColumns={{ base: '248px minmax(0, 1fr)', xl: '300px minmax(0, 1fr)' }}
          gap={4}>
          <GlassCard rounded="xl" overflow="hidden" display="flex" flexDirection="column" minH={0}>
            {panelIzquierdo}
          </GlassCard>

          <GlassCard rounded="xl" overflow="hidden" display="flex" flexDirection="column" minH={0}>
            <Flex align="center" justify="space-between" px={4} py={2.5} flexShrink={0}
              borderBottom="1px solid" borderColor={border} gap={2}>
              <HStack spacing={2} minW={0}>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="800" fontSize="15px" noOfLines={1}>
                  {esObra ? 'Actividades / Materiales' : 'Productos y servicios'}
                </Text>
                <Tag size="sm" borderRadius="full" colorScheme="gray">
                  {nItems} ítem{nItems !== 1 ? 's' : ''}
                </Tag>
              </HStack>
              <HStack spacing={1}>
                <Button size="xs" variant="ghost" leftIcon={<FiPlus size={12} />} color="gray.600" fontWeight="700"
                  onClick={addItem}>
                  Producto
                </Button>
                <Button size="xs" variant="ghost" leftIcon={<FiBookmark size={11} />} color="gray.500"
                  onClick={() => { setPlantillasMode("usar"); setShowPlantillas(true); }}>
                  Plantillas
                </Button>
                <Button size="xs" variant="ghost" leftIcon={<FiUpload size={11} />} color="gray.500"
                  onClick={() => setShowImport(true)}>
                  Importar
                </Button>
              </HStack>
            </Flex>
            <TablaProductos {...tablaProps} />
            <PieTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} aiuConfig={aiuConfig}
              nItems={nItems} onEnviar={enviarCliente} onTexto={enviarComoTexto} enviando={enviando} />
          </GlassCard>
        </Box>
      )}

      {/* ═══ CELULAR Y TABLET — POR PASOS ═══ */}
      {porPasos && (
        <Box maxW={{ base: '100%', md: '760px' }} mx="auto" px={{ base: 3, md: 5 }} pt={3}
          pb="calc(96px + env(safe-area-inset-bottom))">

          {/* Pasos — en Express solo la franja naranja */}
          {modoExpress ? (
            <Flex bg="orange.100" _dark={{ bg: 'orange.900', borderColor: 'orange.600' }} border="1px solid" borderColor="orange.300"
              rounded="2xl" mb={3} px={4} py={2.5} align="center" justify="space-between">
              <HStack spacing={2}>
                <Text fontSize="16px">⚡</Text>
                <Text fontWeight="900" fontSize="13px" color="orange.700" _dark={{ color: 'orange.200' }}>
                  Despacho Express
                </Text>
              </HStack>
              <Badge colorScheme="orange" rounded="full" fontSize="9px" fontWeight="800">Remisión interna</Badge>
            </Flex>
          ) : (
            <Flex bg={barBg} border="1px solid" borderColor={border} rounded="2xl" mb={3} overflow="hidden" p="3px" gap="3px"
              role="tablist" aria-label="Pasos de la cotización">
              {STEPS.map((label, idx) => {
                const activo = mobileStep === idx;
                return (
                  <Box key={label} data-tour={`paso-${label.toLowerCase()}`} flex={1} as="button" type="button"
                    role="tab" aria-selected={activo}
                    minH="44px" display="flex" alignItems="center" justifyContent="center" gap={1.5}
                    rounded="xl" bg={activo ? FY : 'transparent'}
                    onClick={() => setMobileStep(idx)} transition="background 0.15s">
                    <Flex w="18px" h="18px" rounded="full" align="center" justify="center" fontSize="10px" fontWeight="800"
                      bg={activo ? DARK : 'transparent'} color={activo ? FY : mutedL}
                      border={activo ? 'none' : '1px solid'} borderColor={border}>
                      {idx + 1}
                    </Flex>
                    <Text fontSize="12px" fontWeight="800" color={activo ? DARK : mutedL}>
                      {label}
                    </Text>
                  </Box>
                );
              })}
            </Flex>
          )}

          <GlassCard rounded="xl" overflow="hidden" mb={3}>
            <AnimatePresence mode="wait" initial={false}>
              <MotionBox key={mobileStep}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: rm ? 0 : 0.14 }}>
                {mobileStep === 0 && <PanelCliente {...panelClienteProps} />}
                {mobileStep === 1 && (
                  <Box>
                    {modoExpress ? (
                      /* Express: quién saca la mercancía */
                      <Box px={4} pt={3} pb={3} bg="orange.50" borderBottom="2px solid" borderColor="orange.300"
                        _dark={{ bg: 'orange.900', borderColor: 'orange.600' }}>
                        <HStack spacing={2} mb={2.5}>
                          <Text fontWeight="900" fontSize="14px" color="orange.700" _dark={{ color: 'orange.200' }}>
                            ¿Quién saca la mercancía?
                          </Text>
                          <Tag size="sm" colorScheme="orange" rounded="full">{nItems} prod.</Tag>
                        </HStack>
                        <Input
                          placeholder="Nombre del trabajador"
                          value={expressTrabajador}
                          onChange={e => {
                            setExpressTrabajador(e.target.value);
                            setCliente(p => ({ ...p, nombre: e.target.value }));
                          }}
                          rounded="lg" fontWeight="600" fontSize="16px" h="44px"
                          bg="white" _dark={{ bg: 'gray.700' }}
                          borderColor="orange.300" focusBorderColor="orange.500"
                        />
                      </Box>
                    ) : (
                      <Flex px={4} py={3} align="center" justify="space-between" gap={2}
                        borderBottom="1px solid" borderColor={border}>
                        <HStack minW={0}>
                          <Icon as={FiPackage} color={mutedL} boxSize={4} />
                          <Text fontWeight="800">{esObra ? 'Actividades' : 'Productos'}</Text>
                          <Tag size="sm" colorScheme="gray" rounded="full">{nItems}</Tag>
                        </HStack>
                        <HStack spacing={2}>
                          {/* En tablet se puede pasar a la tabla clásica (se recuerda) */}
                          {!esCelular && (
                            <Flex rounded="md" border="1px solid" borderColor={border} overflow="hidden">
                              {[{ k: false, txt: 'Rápido' }, { k: true, txt: 'Tabla' }].map(({ k, txt }) => (
                                <Box key={txt} as="button" type="button" px={3} h="32px" fontSize="12px" fontWeight="700"
                                  bg={modoTabla === k ? FY : 'transparent'}
                                  color={modoTabla === k ? DARK : mutedL}
                                  onClick={() => setModoTabla(k)}>
                                  {txt}
                                </Box>
                              ))}
                            </Flex>
                          )}
                          <Button size="sm" h="32px" variant="outline" rounded="md" leftIcon={<FiUpload size={12} />}
                            onClick={() => setShowImport(true)}>Importar</Button>
                        </HStack>
                      </Flex>
                    )}

                    {modoTabla && !esCelular
                      ? <TablaProductos {...tablaProps} alto="calc(100vh - 330px)" />
                      : <ListaRapidaProductos {...listaRapidaProps} />}

                    {/* Resumen de cuentas */}
                    <Box bg={DARK} mt={1}>
                      <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} aiuConfig={aiuConfig} />
                    </Box>
                  </Box>
                )}
                {mobileStep === 2 && (
                  <Box p={4}>
                    {/* Lo que se va a mandar */}
                    <Text fontSize="10px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={mutedL}>
                      Para
                    </Text>
                    <Text fontSize="18px" fontWeight="800" lineHeight="1.2" mt={0.5}>
                      {cliente.nombre?.trim() || <Text as="span" color="orange.500">Falta el nombre del cliente</Text>}
                    </Text>
                    {(cliente.empresa || cliente.nit) && (
                      <Text fontSize="12px" color={mutedL} mt={0.5}>
                        {[cliente.empresa, cliente.nit].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                    <Box mt={3} rounded="lg" overflow="hidden" bg={DARK}>
                      <Flex px={5} pt={3} justify="space-between" fontSize="11px" color="whiteAlpha.700">
                        <Text>{nItems} producto{nItems !== 1 ? 's' : ''} · {esObra ? 'Obra' : 'Comercial'}</Text>
                        <Text>{cotConfig.numero || 'Se numera al guardar'}</Text>
                      </Flex>
                      <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} aiuConfig={aiuConfig} size="lg" />
                    </Box>

                    {nItems === 0 && (
                      <Button mt={3} w="full" size="sm" variant="outline" onClick={() => setMobileStep(1)}>
                        Todavía no hay productos — agregar
                      </Button>
                    )}

                    {/* Las acciones, de la más usada a la menos */}
                    <Stack spacing={2.5} mt={4}>
                      <Button h="52px" bg="#25D366" color="white" rounded="xl" fontSize="16px" fontWeight="800"
                        leftIcon={<FaWhatsapp size={22} />} _hover={{ bg: '#1ebe5b' }} _active={{ bg: '#18a84f' }}
                        isLoading={enviando} loadingText="Preparando PDF…" onClick={enviarCliente}>
                        Enviar por WhatsApp
                      </Button>
                      <SimpleGrid columns={2} spacing={2.5}>
                        <Button h="46px" bg={DARK} color={FY} rounded="xl" leftIcon={<FiDownload />}
                          _hover={{ bg: '#2a2a28' }} isLoading={pdfLoading && !enviando} onClick={handlePDF}>
                          Descargar PDF
                        </Button>
                        <Button h="46px" variant="outline" rounded="xl" leftIcon={<FiEye />}
                          onClick={() => safeNavigate('preview')}>
                          Ver documento
                        </Button>
                        <Button h="46px" variant="outline" rounded="xl" leftIcon={<FiPrinter />}
                          onClick={imprimirDoc}>
                          Imprimir
                        </Button>
                        <Button h="46px" variant="outline" colorScheme="whatsapp" rounded="xl" leftIcon={<FiMessageSquare />}
                          onClick={enviarComoTexto}>
                          Solo texto
                        </Button>
                      </SimpleGrid>
                      <Text fontSize="11px" color={mutedL} textAlign="center">
                        Al enviar o descargar se guarda sola.
                      </Text>
                    </Stack>

                    {/* Lo que casi nunca se toca, plegado */}
                    <Box mt={4} border="1px solid" borderColor={border} rounded="xl" overflow="hidden">
                      <Flex as="button" type="button" w="full" px={4} py={3} align="center" justify="space-between"
                        onClick={() => setVerCondiciones(v => !v)} aria-expanded={verCondiciones}>
                        <Box textAlign="left" minW={0}>
                          <Text fontSize="14px" fontWeight="700">Condiciones del documento</Text>
                          <Text fontSize="11px" color={mutedL}>
                            {cotConfig.formaPago} · {esObra ? 'sin discriminar IVA' : `IVA ${cotConfig.iva}%`}
                            {descGNum > 0 ? ` · desc. ${descGNum}%` : ''} · vence {fmtDate(cotConfig.vigencia)}
                          </Text>
                        </Box>
                        <Icon as={FiChevronRight} transform={verCondiciones ? 'rotate(90deg)' : 'none'} transition="transform .15s" color={mutedL} />
                      </Flex>
                      <Collapse in={verCondiciones} animateOpacity>
                        <Box borderTop="1px solid" borderColor={border}>
                          <PanelCotizacion {...panelCotizProps} />
                        </Box>
                      </Collapse>
                    </Box>
                  </Box>
                )}
              </MotionBox>
            </AnimatePresence>
          </GlassCard>

          {/* Anterior / siguiente */}
          {!modoExpress && (
            <Flex gap={2}>
              {mobileStep > 0 && (
                <Button flex={1} h="46px" variant="outline" rounded="xl" leftIcon={<FiChevronLeft />}
                  onClick={() => setMobileStep(s => s - 1)}>
                  {STEPS[mobileStep - 1]}
                </Button>
              )}
              {mobileStep < STEPS.length - 1 && (
                <Button flex={1} h="46px" bg={FY} color={DARK} rounded="xl" fontWeight="800"
                  rightIcon={<FiChevronRight />} _hover={{ bg: '#e0b010' }}
                  onClick={() => setMobileStep(s => s + 1)}>
                  {mobileStep === 1 ? 'Revisar y enviar' : STEPS[mobileStep + 1]}
                </Button>
              )}
            </Flex>
          )}
        </Box>
      )}

      {/* ═══ BARRA FIJA DE ABAJO (celular y tablet) ═══
          Una sola barra: en el editor del celular la navegación general se
          oculta (aquí se trabaja; para salir está la flecha de arriba).
          Antes eran dos barras apiladas que se comían un cuarto de pantalla
          y el total salía cortado («$ 3.85…»). Mientras el teclado está
          abierto se esconde, para no tapar la casilla que se escribe. */}
      {porPasos && !tecleando && (
        <Box position="fixed" bottom={0} left={0} right={0} zIndex={200}
          bg={barBg} borderTop="1px solid" borderColor={border} boxShadow="0 -4px 16px rgba(0,0,0,0.08)"
          pb="env(safe-area-inset-bottom)" sx={{ '@media print': { display: 'none' } }}>
          <Flex maxW={{ base: '100%', md: '760px' }} mx="auto" px={3} py={2} gap={2} align="center">
            <Box flex="1 1 auto" minW={0}>
              <Text fontSize="10px" color={mutedL} textTransform="uppercase" letterSpacing="wider" lineHeight="1.2">
                Total{nItems ? ` · ${nItems} prod.` : ''}
              </Text>
              <Text fontSize={{ base: '18px', md: '20px' }} fontWeight="900" color={totalColor} lineHeight="1.2"
                whiteSpace="nowrap" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(totals.totalPagar, cotConfig.moneda)}
              </Text>
            </Box>
            {modoExpress ? (
              <Button h="46px" bg="orange.400" color="white" rounded="xl" fontWeight="800" px={4}
                leftIcon={<FaWhatsapp size={17} />} isLoading={isSaving}
                onClick={async () => { const ok = await handleSave(); if (ok) enviarComoTexto(); }}
                _hover={{ bg: 'orange.500' }}>
                {hasChanges || !editingId ? 'Enviar a la ferre' : '✓ Enviada'}
              </Button>
            ) : (
              <>
                <IconButton data-tour="vista-previa" h="46px" w="46px" variant="outline" colorScheme="gray" rounded="xl"
                  display={{ base: 'none', sm: 'inline-flex' }}
                  aria-label="Ver el documento" icon={<FiEye size={18} />}
                  onClick={() => safeNavigate('preview')} />
                <Button data-tour="pdf" h="46px" px={4} bg="#25D366" color="white" rounded="xl" fontWeight="800"
                  leftIcon={<FaWhatsapp size={18} />}
                  isLoading={enviando} onClick={enviarCliente} _hover={{ bg: '#1ebe5b' }}>Enviar</Button>
                <Button data-tour="guardar" h="46px" px={4} rounded="xl" fontWeight="800"
                  bg={hasChanges || !editingId ? FY : 'gray.100'} color={hasChanges || !editingId ? DARK : 'gray.600'}
                  leftIcon={hasChanges || !editingId ? <FiSave size={16} /> : <FiCheckCircle size={16} />}
                  isLoading={isSaving} onClick={handleSave}
                  _hover={{ bg: hasChanges || !editingId ? '#e0b010' : 'gray.200' }}>
                  {textoGuardar}
                </Button>
              </>
            )}
          </Flex>
        </Box>
      )}

      {/* Diálogo: recuperar borrador */}
      <AlertDialog isOpen={!!draftFound} leastDestructiveRef={cancelRef} onClose={descartarBorrador} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl" mx={4}>
            <AlertDialogHeader fontWeight="900">
              <HStack><Icon as={FiRefreshCw} color={FY} /><Text>Recuperar trabajo sin guardar</Text></HStack>
            </AlertDialogHeader>
            <AlertDialogBody>
              Encontramos una cotización que quedó a medias
              {draftFound?.items ? <> con <strong>{draftFound.items.filter(r => r.desc?.trim()).length} producto(s)</strong></> : ''}.
              ¿Quieres continuar donde la dejaste?
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={descartarBorrador} rounded="md" size="sm" variant="outline">
                Empezar de cero
              </Button>
              <Button bg={FY} color={DARK} rounded="md" size="sm" fontWeight="700" onClick={recuperarBorrador}>
                Recuperar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Diálogo: eliminar */}
      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl" mx={4}>
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              {cliente.nombre
                ? <>Vas a eliminar la cotización de <strong>{cliente.nombre}</strong>. No se puede deshacer.</>
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDelClose} rounded="md">Cancelar</Button>
              <Button bg={RED} color="white" ml={3} rounded="md" _hover={{ bg: '#c00f15' }}
                onClick={() => { onDelClose(); handleDelete(); }}>Eliminar</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Diálogo: cambios sin guardar. En celular los botones se apilan,
          con la acción recomendada (guardar) arriba y a lo ancho. */}
      <AlertDialog isOpen={isExitOpen} leastDestructiveRef={cancelRef} onClose={onExitClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl" mx={4}>
            <AlertDialogHeader fontWeight="900">
              <HStack><Icon as={FiAlertCircle} color="orange.400" /><Text>Cambios sin guardar</Text></HStack>
            </AlertDialogHeader>
            <AlertDialogBody>¿Qué deseas hacer con los cambios actuales?</AlertDialogBody>
            <AlertDialogFooter gap={2} flexDirection={{ base: 'column-reverse', sm: 'row' }} alignItems="stretch">
              <Button ref={cancelRef} onClick={onExitClose} rounded="md" size="sm" variant="ghost" colorScheme="gray">
                Quedarme aquí
              </Button>
              <Button variant="outline" colorScheme="red" rounded="md" size="sm" onClick={discardAndExit}>
                Salir sin guardar
              </Button>
              <Button bg={FY} color={DARK} rounded="md" size="sm" fontWeight="700" onClick={confirmExit}
                _hover={{ bg: '#e0b010' }}>
                Guardar y salir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
