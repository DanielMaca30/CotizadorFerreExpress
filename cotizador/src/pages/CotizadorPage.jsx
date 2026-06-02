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
import { useParams, useNavigate } from 'react-router-dom';
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
  Kbd, Progress, Collapse,
} from '@chakra-ui/react';
import {
  FiPlus, FiTrash2, FiSave, FiDownload, FiEye,
  FiList, FiCopy, FiHome, FiUser, FiFileText,
  FiPackage, FiUpload, FiAlertCircle, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiTool, FiShoppingCart,
  FiEdit2, FiX, FiMaximize2,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useCotizaciones }       from '../hooks/useCotizaciones';
import { usePDF }                from '../hooks/usePDF';
import { useImport }             from '../hooks/useImport';
import { useProductosFrecuentes, aprenderProductos } from '../hooks/useProductosFrecuentes';
import AutocompleteInput         from '../components/AutocompleteInput';
import DocContent                from '../components/DocContent';
import ImportModal               from '../components/ImportModal';
import {
  blankRow, calcRow, calcTotals, calcTotalsObra, money, fmtDate,
  precioBase, ivaUnidad, formatPriceCO, parsePriceCO,
  UNITS, FORMAS_PAGO, FORMAS_PAGO_OBRA, IVA_OPTS, MONEDAS,
  DEFAULT_CLIENTE, DEFAULT_CONFIG, DEFAULT_NOTAS, DEFAULT_NOTAS_OBRA,
  DEFAULT_AIU, saveEmpresaLocal, loadEmpresaLocal,
} from '../utils';

/* ── Colores de marca ── */
const FY   = '#F9BF20';
const DARK = '#3A3A38';
const RED  = '#E21219';

/* ── Orden de campos en tabla ── */
const FIELD_ORDER = ['desc', 'qty', 'price', 'disc'];

const MotionBox = motion(Box);
const MotionTr  = motion(Tr);
const spr = (r) => r ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 };

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
function AppLogo({ src, h = '32px' }) {
  const [phase, setPhase] = useState(() => (src ? 0 : 1));
  const prevRef = useRef(src);
  if (prevRef.current !== src) {
    prevRef.current = src;
    if (phase !== (src ? 0 : 1)) setPhase(src ? 0 : 1);
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

/* ════════════════════════════════════════════════════════════
   PRICE INPUT — formato 1.500.000 mientras se escribe
════════════════════════════════════════════════════════════ */
function PriceInput({ value, onChange, dataRowId, dataField, inputBg, w = '88px', ...rest }) {
  const [display, setDisplay] = useState(() => formatPriceCO(value));

  // Sincronizar si value cambia desde afuera
  const lastRaw = useRef(value);
  if (lastRaw.current !== value) {
    lastRaw.current = value;
    const curRaw = parsePriceCO(display);
    if (curRaw !== String(value ?? '')) setDisplay(formatPriceCO(value));
  }

  return (
    <Input
      variant="unstyled"
      value={display}
      onChange={e => {
        const raw = parsePriceCO(e.target.value);
        if (raw === '' || /^\d+$/.test(raw)) {
          setDisplay(formatPriceCO(raw));
          onChange(raw);
        }
      }}
      onFocus={e => e.target.select()}
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

function focusInput(container, rowId, field) {
  const el = container?.querySelector(`input[data-row-id="${rowId}"][data-field="${field}"]`);
  if (el) { el.focus(); el.select(); }
}

/* ════════════════════════════════════════════════════════════
   MODAL SELECTOR DE TIPO
════════════════════════════════════════════════════════════ */
function ModalTipo({ isOpen, onSelect }) {
  const cardHover = useColorModeValue('gray.50', 'gray.700');
  return (
    <Modal isOpen={isOpen} onClose={() => {}} isCentered closeOnOverlayClick={false} size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" overflow="hidden" mx={4}>
        <Box bg={DARK} px={6} py={5}>
          <Text fontWeight="900" fontSize="18px" color="white">Nueva cotización</Text>
          <Text fontSize="12px" color="whiteAlpha.600" mt={1}>¿Qué tipo de cotización necesitas?</Text>
        </Box>
        <ModalBody p={5}>
          <Stack spacing={3}>
            {[
              { tipo: 'comercial', icon: FiShoppingCart, color: FY, textColor: DARK,
                title: 'Cotización Comercial',
                sub: 'Venta directa al cliente. IVA incluido por producto.' },
              { tipo: 'obra', icon: FiTool, color: '#1a5276', textColor: 'white',
                title: 'Cotización de Obra',
                sub: 'Construcción / contrato. AIU + IVA del 19% sobre la utilidad.' },
            ].map(({ tipo, icon, color, textColor, title, sub }) => (
              <Box key={tipo}
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════
   PANELES DE FORMULARIO
════════════════════════════════════════════════════════════ */
const PanelEmpresa = memo(function PanelEmpresa({ empresa, setEmpresa, border, mutedL, inputBg }) {
  const logoRef = useRef();
  const ip = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };
  const E = k => ({ value: empresa[k] ?? '', onChange: e => setEmpresa(p => ({ ...p, [k]: e.target.value })) });
  return (
    <Box p={4}>
      <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) { alert('Máx. 2MB'); return; }
          const reader = new FileReader();
          reader.onload = ev => setEmpresa(p => ({ ...p, logo: ev.target.result }));
          reader.readAsDataURL(file);
          e.target.value = '';
        }} />
      <Box border="1.5px dashed" borderColor={border} rounded="lg" p={3} textAlign="center" mb={4}
        bg={useColorModeValue('gray.50', 'blackAlpha.200')}>
        <Box display="flex" justifyContent="center" mb={2}>
          <AppLogo src={empresa.logo} h="48px" />
        </Box>
        <Button size="xs" variant="outline" rounded="md" leftIcon={<FiUpload size={11} />}
          onClick={() => logoRef.current?.click()}>
          {empresa.logo ? 'Cambiar logo' : 'Cargar logo'}
        </Button>
        <Text fontSize="9px" color={mutedL} mt={1}>PNG · JPG · SVG · Máx. 2MB</Text>
      </Box>
      <Stack spacing={3}>
        <Box><FL>Nombre empresa</FL><Input {...ip} {...E('nombre')} placeholder="Mi Empresa S.A.S." /></Box>
        <Flex gap={2}>
          <Box flex={1}><FL>NIT</FL><Input {...ip} {...E('nit')} placeholder="000.000.000-0" /></Box>
          <Box flex={1}><FL>Ciudad</FL><Input {...ip} {...E('ciudad')} placeholder="Cali" /></Box>
        </Flex>
        <Box><FL>Dirección</FL><Input {...ip} {...E('dir')} placeholder="Calle, carrera…" /></Box>
        <Flex gap={2}>
          <Box flex={1}><FL>Teléfono</FL><Input {...ip} {...E('tel')} placeholder="+57 3XX…" /></Box>
          <Box flex={1}><FL>Correo</FL><Input {...ip} {...E('correo')} type="email" placeholder="correo@empresa.com" /></Box>
        </Flex>
      </Stack>
    </Box>
  );
});

const PanelCliente = memo(function PanelCliente({ cliente, setCliente, inputBg }) {
  const ip = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };
  const C = k => ({ value: cliente[k] ?? '', onChange: e => setCliente(p => ({ ...p, [k]: e.target.value })) });
  return (
    <Stack spacing={3} p={4}>
      <Box><FL required>Nombre / Razón social</FL><Input {...ip} placeholder="Juan García" {...C('nombre')} /></Box>
      <Box><FL>Empresa</FL><Input {...ip} placeholder="Constructora XYZ" {...C('empresa')} /></Box>
      <Flex gap={2}>
        <Box flex={1}><FL>NIT / Cédula</FL><Input {...ip} {...C('nit')} /></Box>
        <Box flex={1}><FL>Ciudad</FL><Input {...ip} placeholder="Cali" {...C('ciudad')} /></Box>
      </Flex>
      <Box><FL>Contacto</FL><Input {...ip} placeholder="Attn: nombre" {...C('contacto')} /></Box>
      <Flex gap={2}>
        <Box flex={1}><FL>Correo</FL><Input {...ip} type="email" placeholder="correo@..." {...C('correo')} /></Box>
        <Box flex={1}><FL>Teléfono</FL><Input {...ip} placeholder="3XX..." {...C('tel')} /></Box>
      </Flex>
    </Stack>
  );
});

const PanelCotizacion = memo(function PanelCotizacion({
  cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas,
  aiuConfig, setAiuConfig, inputBg,
}) {
  const ip  = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };
  const esObra = cotConfig.tipo === 'obra';
  const numBg    = useColorModeValue('gray.100', 'gray.700');
  const numBc    = useColorModeValue('gray.200', 'gray.600');
  const numColor = useColorModeValue('gray.400', 'gray.500');
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
          <FL>Tipo</FL>
          <Box px={2} py="6px" rounded="md" border="1px solid"
            bg={esObra ? 'blue.100' : 'green.100'}
            borderColor={esObra ? 'blue.300' : 'green.300'}>
            <Text fontSize="10px" fontWeight="700" color={esObra ? 'blue.700' : 'green.700'}>
              {esObra ? 'Obra' : 'Comercial'}
            </Text>
          </Box>
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
        <Box bg={useColorModeValue('blue.50','blue.900')} border="1px solid"
          borderColor={useColorModeValue('blue.200','blue.700')} rounded="lg" p={3}>
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
      <Text fontSize="9px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color={FY}>
        Notas
      </Text>
      <Textarea value={notas} onChange={e => setNotas(e.target.value)}
        fontSize="11px" rows={6} rounded="md" focusBorderColor={FY} resize="none" bg={inputBg} />
    </Stack>
  );
});

/* ════════════════════════════════════════════════════════════
   TARJETA PRODUCTO MOBILE
════════════════════════════════════════════════════════════ */
function ProductCardMobile({ r, index, upItem, removeItem, duplicateItem,
  cotConfig, inputBg, border, getSugerencias, handleAcceptSugerencia }) {
  const [expanded, setExpanded] = useState(false);
  const isValid = !!(r.desc || r.price);
  const total = calcRow(r);
  const cardBg = useColorModeValue('white', 'gray.800');
  const hdrBg  = useColorModeValue('gray.50', 'gray.750');
  const mutedC = useColorModeValue('gray.500', 'gray.400');
  const ip = { size: 'sm', rounded: 'md', bg: inputBg, focusBorderColor: FY };

  return (
    <Box bg={cardBg} border="1px solid" borderColor={expanded ? FY : border}
      rounded="xl" mb={2} overflow="hidden" transition="all 0.15s"
      boxShadow={expanded ? `0 0 0 2px ${FY}33` : '0 1px 4px rgba(0,0,0,0.06)'}>

      {/* Cabecera siempre visible */}
      <Flex
        px={3} py={2.5} align="center" gap={2} cursor="pointer"
        bg={expanded ? hdrBg : cardBg}
        onClick={() => setExpanded(e => !e)}>
        <Box
          w="22px" h="22px" rounded="full" flexShrink={0}
          bg={isValid ? FY : 'gray.200'} display="flex" alignItems="center" justifyContent="center">
          <Text fontSize="9px" fontWeight="800" color={isValid ? DARK : 'gray.400'}>{index + 1}</Text>
        </Box>
        <Text flex={1} fontSize="12px" fontWeight={isValid ? '700' : '400'}
          color={isValid ? 'inherit' : mutedC} noOfLines={1}>
          {r.desc || 'Toca para agregar producto'}
        </Text>
        {isValid && !expanded && (
          <Text fontSize="12px" fontWeight="700" color={FY} flexShrink={0}>
            {money(total, cotConfig.moneda)}
          </Text>
        )}
        <Icon as={expanded ? FiX : FiEdit2} boxSize={3.5} color={mutedC} flexShrink={0} />
      </Flex>

      {/* Cuerpo expandido */}
      {expanded && (
        <Box px={3} pb={3}>
          <Divider mb={3} />
          <Stack spacing={3}>
            <Box>
              <FL>Descripción</FL>
              <AutocompleteInput
                value={r.desc}
                onChange={val => upItem(r.id, 'desc', val)}
                onAccept={sug => handleAcceptSugerencia(r.id, sug)}
                getSugerencias={getSugerencias}
                dataRowId={r.id}
                inputBg={inputBg}
                FY={FY}
                bg={inputBg}
                border="1px solid"
                borderColor={border}
                rounded="md"
                px={2} py={1}
                variant="unstyled"
              />
            </Box>
            <Flex gap={2}>
              <Box flex={1}>
                <FL>Cantidad</FL>
                <Input {...ip} type="number" min="1" value={r.qty}
                  onChange={e => upItem(r.id, 'qty', e.target.value)} />
              </Box>
              <Box flex={1}>
                <FL>Unidad</FL>
                <Select {...ip} value={r.unit} onChange={e => upItem(r.id, 'unit', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </Select>
              </Box>
            </Flex>
            <Flex gap={2}>
              <Box flex={1}>
                <FL>Código / Ref.</FL>
                <Input {...ip} value={r.ref}
                  onChange={e => upItem(r.id, 'ref', e.target.value)} placeholder="—" />
              </Box>
              <Box flex={1}>
                <FL>Desc. (%)</FL>
                <Input {...ip} type="number" min="0" max="100" value={r.disc}
                  onChange={e => upItem(r.id, 'disc', e.target.value)} />
              </Box>
            </Flex>
            <Box>
              <FL>Precio (con IVA)</FL>
              <PriceInput
                value={r.price}
                onChange={val => upItem(r.id, 'price', val)}
                dataRowId={r.id} dataField="price"
                inputBg={inputBg}
                w="full" textAlign="left"
                bg={inputBg} border="1px solid" borderColor={border} rounded="md" px={3}
              />
            </Box>
            {(parseFloat(r.price) > 0) && (
              <Flex justify="space-between" align="center"
                bg={DARK} px={3} py={2} rounded="lg">
                <Text fontSize="11px" color="whiteAlpha.600">Total</Text>
                <Text fontSize="16px" fontWeight="900" color={FY}>
                  {money(total, cotConfig.moneda)}
                </Text>
              </Flex>
            )}
            <Flex gap={2}>
              <Button flex={1} size="sm" variant="outline" rounded="lg"
                leftIcon={<FiCopy size={13} />}
                onClick={() => { duplicateItem(r.id); setExpanded(false); }}>
                Duplicar
              </Button>
              <Button flex={1} size="sm" colorScheme="red" variant="ghost" rounded="lg"
                leftIcon={<FiTrash2 size={13} />}
                onClick={() => removeItem(r.id)}>
                Eliminar
              </Button>
            </Flex>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   TABLA DESKTOP (sin cambios estructurales, se arregló scroll)
════════════════════════════════════════════════════════════ */
function ItemRow({ r, i, border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, esObra, cotConfig, rm, upItem, removeItem,
  handleAcceptSugerencia, getSugerencias, itemsLen, duplicateItem, tableRef }) {
  const hoverBg = useColorModeValue('yellow.50', 'whiteAlpha.50');
  const rowBg   = i % 2 === 0 ? tableBg : stripeBg;
  const p       = parseFloat(r.price) || 0;
  const pSin    = precioBase(p, ivaRate);
  const pIva    = ivaUnidad(p, ivaRate);

  return (
    <MotionTr layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={spr(rm)}
      bg={rowBg} _hover={{ bg: hoverBg }} style={{ display: 'table-row' }}>
      <Td borderColor={border} color={mutedL} fontSize="11px" pl={3} w="28px">{i + 1}</Td>
      <Td borderColor={border} p={1} w="56px">
        <Input variant="unstyled" value={r.ref} onChange={e => upItem(r.id, 'ref', e.target.value)}
          data-row-id={r.id} data-field="ref"
          placeholder="—" fontSize="11px" color={mutedL} px={2} py={1} rounded="md"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      <Td borderColor={border} p={1}>
        <AutocompleteInput
          value={r.desc}
          onChange={val => upItem(r.id, 'desc', val)}
          onAccept={sug => handleAcceptSugerencia(r.id, sug)}
          onMoveNext={() => {
            requestAnimationFrame(() => focusInput(tableRef?.current, r.id, 'qty'));
          }}
          getSugerencias={getSugerencias}
          dataRowId={r.id}
          inputBg={inputBg}
          FY={FY}
        />
      </Td>
      <Td borderColor={border} p={1} isNumeric w="52px">
        <Input variant="unstyled" type="number" min="1" value={r.qty}
          onChange={e => upItem(r.id, 'qty', e.target.value)}
          data-row-id={r.id} data-field="qty"
          textAlign="center" fontWeight="700" fontSize="12px" px={1} py={1} rounded="md" w="44px"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      <Td borderColor={border} p={1} w="52px">
        <select value={r.unit} onChange={e => upItem(r.id, 'unit', e.target.value)}
          style={{ background: 'transparent', border: 'none', fontSize: 11, color: '#777',
            width: 50, cursor: 'pointer', outline: 'none', padding: '4px 1px' }}>
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
      </Td>
      {!esObra && (
        <>
          <Td borderColor={border} isNumeric pr={2} w="82px">
            <Text fontSize="11px" color={mutedL}>{p > 0 ? money(pSin, cotConfig.moneda) : '—'}</Text>
          </Td>
          <Td borderColor={border} isNumeric pr={2} w="68px">
            <Text fontSize="11px" color={mutedL}>{p > 0 ? money(pIva, cotConfig.moneda) : '—'}</Text>
          </Td>
        </>
      )}
      <Td borderColor={border} p={1} isNumeric w="94px">
        <PriceInput value={r.price} onChange={val => upItem(r.id, 'price', val)}
          dataRowId={r.id} dataField="price" inputBg={inputBg} w="88px" />
      </Td>
      <Td borderColor={border} p={1} isNumeric w="50px">
        <Input variant="unstyled" type="number" min="0" max="100" value={r.disc}
          onChange={e => upItem(r.id, 'disc', e.target.value)}
          data-row-id={r.id} data-field="disc"
          textAlign="center" fontSize="11px" color={mutedL} px={1} py={1} rounded="md" w="44px"
          _hover={{ bg: inputBg }} _focus={{ bg: inputBg, boxShadow: `0 0 0 1.5px ${FY}55` }} />
      </Td>
      <Td borderColor={border} isNumeric pr={2} w="88px">
        <Text fontWeight="700" fontSize="12px">{money(calcRow(r), cotConfig.moneda)}</Text>
      </Td>
      <Td borderColor={border} p={1} w="52px">
        <HStack spacing={0}>
          <Tooltip label="Duplicar (Ctrl+D)" hasArrow>
            <IconButton size="xs" variant="ghost" rounded="md" aria-label="Duplicar"
              icon={<FiCopy size={11} />} onClick={() => duplicateItem(r.id)} tabIndex={-1} />
          </Tooltip>
          <IconButton size="xs" variant="ghost" colorScheme="red" rounded="md"
            aria-label="Eliminar" icon={<FiTrash2 size={11} />}
            onClick={() => removeItem(r.id)} isDisabled={itemsLen === 1} tabIndex={-1} />
        </HStack>
      </Td>
    </MotionTr>
  );
}

const TablaProductos = memo(function TablaProductos({
  items, tableRef, handleTableKeyDown, esObra,
  border, mutedL, inputBg, tableBg, stripeBg,
  ivaRate, cotConfig, rm, upItem, removeItem,
  handleAcceptSugerencia, getSugerencias, addItem, duplicateItem,
}) {
  const addBtnHover = useColorModeValue('yellow.50', 'whiteAlpha.100');
  const theadBg = '#3A3A38';
  const mutedText = useColorModeValue('gray.400', 'gray.500');

  const cols = esObra
    ? ['#','Ref.','Descripción / Actividad','Cant.','Und.','Vr. Unit.','Desc.%','Total','']
    : ['#','Ref.','Nombre Producto','Cant.','Und.','P. s/IVA','IVA','P. c/IVA','Desc.%','Total',''];

  return (
    <Box ref={tableRef}
      overflowX="auto"
      overflowY="auto"
      flex={1}
      h={0}          /* ← clave: h=0 + flex=1 fuerza scroll interno */
      onKeyDown={handleTableKeyDown}
      sx={{ '&::-webkit-scrollbar': { w: '4px', h: '4px' },
            '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' } }}>
      <Table size="sm" variant="simple">
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr bg={theadBg}>
            {cols.map((h, i) => (
              <Th key={i} color={FY} borderColor="transparent" fontSize="8px"
                letterSpacing="wider" fontWeight="700"
                isNumeric={['Cant.','P. s/IVA','IVA','P. c/IVA','Vr. Unit.','Desc.%','Total'].includes(h)}>
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          <AnimatePresence>
            {items.map((r, i) => (
              <ItemRow key={r.id} r={r} i={i}
                border={border} mutedL={mutedL} inputBg={inputBg}
                tableBg={tableBg} stripeBg={stripeBg}
                ivaRate={ivaRate} esObra={esObra} cotConfig={cotConfig} rm={rm}
                upItem={upItem} removeItem={removeItem} duplicateItem={duplicateItem}
                handleAcceptSugerencia={handleAcceptSugerencia}
                getSugerencias={getSugerencias}
                itemsLen={items.length}
                tableRef={tableRef} />
            ))}
          </AnimatePresence>
          <Tr>
            <Td colSpan={cols.length} borderColor={border} px={3} py={2}>
              <Flex align="center" gap={3}>
                <Button size="xs" variant="ghost" leftIcon={<FiPlus />} onClick={addItem}
                  fontWeight="700" color={FY} tabIndex={-1}
                  _hover={{ bg: addBtnHover }}>
                  + Agregar fila
                </Button>
                <Text fontSize="9px" color={mutedText} display={{ base: 'none', '2xl': 'block' }}>
                  <Kbd fontSize="8px">Tab</Kbd> avanza ·{' '}
                  <Kbd fontSize="8px">Enter</Kbd> nueva fila ·{' '}
                  <Kbd fontSize="8px">↑↓</Kbd> filas ·{' '}
                  <Kbd fontSize="8px">Ctrl+D</Kbd> duplica ·{' '}
                  <Kbd fontSize="8px">Ctrl+S</Kbd> guarda
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
  const fs     = size === 'lg' ? '11px' : '10px';
  const fTotal = size === 'lg' ? '24px' : '18px';
  const aiu    = aiuConfig || DEFAULT_AIU;
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
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.300">Adm. {aiu.admin}% + Imp. {aiu.imprevistos}%</Text>
              <Text fontSize={fs} color="whiteAlpha.500">{money((totals.adminAmt ?? 0) + (totals.impAmt ?? 0), cotConfig.moneda)}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.400">Utilidad {aiu.utilidad}%</Text>
              <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.utilAmt ?? 0, cotConfig.moneda)}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize={fs} color="whiteAlpha.400">IVA 19% s/ utilidad</Text>
              <Text fontSize={fs} color="whiteAlpha.600" fontWeight="500">{money(totals.ivaUtilidad ?? 0, cotConfig.moneda)}</Text>
            </Flex>
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
        <Text fontSize={fTotal} fontWeight="800" color={FY} lineHeight="1" fontVariantNumeric="tabular-nums">
          {money(totals.totalPagar, cotConfig.moneda)}
        </Text>
      </Flex>
    </Box>
  );
}

function ResumenDesktop({ items, cotConfig, totals, descGNum, aiuConfig,
  cliente, rm, safeNavigate, handleSave, isSaving, hasChanges }) {
  const esObra = cotConfig.tipo === 'obra';
  return (
    <Box bg={DARK} rounded="xl" overflow="hidden" display="flex" flexDirection="column"
      border="1px solid" borderColor="whiteAlpha.100" h="full">
      <Box px={5} pt={5} pb={3}>
        <Flex align="center" gap={2}>
          <Text fontWeight="300" fontSize="18px" color="white">Resumen</Text>
          <Badge bg={esObra ? 'blue.700' : 'green.700'} color="white" fontSize="8px" rounded="full" px={2}>
            {esObra ? 'OBRA' : 'COMERCIAL'}
          </Badge>
        </Flex>
        <Text fontSize="9px" color="whiteAlpha.400" letterSpacing="wider" textTransform="uppercase">
          {cotConfig.numero || 'Sin número'} · {fmtDate(cotConfig.fecha)}
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
        sx={{ '&::-webkit-scrollbar': { w: '3px' }, '&::-webkit-scrollbar-thumb': { bg: 'whiteAlpha.200' } }}>
        <AnimatePresence>
          {items.filter(r => r.desc || r.price).length === 0
            ? <Text fontSize="11px" color="whiteAlpha.300" fontStyle="italic">Agrega productos →</Text>
            : items.filter(r => r.desc || r.price).map(r => (
                <MotionBox key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spr(rm)}>
                  <Flex justify="space-between" align="flex-start" py={2}
                    borderBottom="1px solid" borderColor="whiteAlpha.100" gap={2}>
                    <Box flex={1} minW={0}>
                      <Text fontSize="12px" color="whiteAlpha.800" noOfLines={1}>{r.desc || 'Sin nombre'}</Text>
                      <Text fontSize="10px" color="whiteAlpha.400">
                        {r.qty} {r.unit}{parseFloat(r.disc) > 0 ? ` · ${r.disc}% desc.` : ''}
                      </Text>
                    </Box>
                    <Text fontSize="12px" fontWeight="700" color={FY} whiteSpace="nowrap">
                      {money(calcRow(r), cotConfig.moneda)}
                    </Text>
                  </Flex>
                </MotionBox>
              ))
          }
        </AnimatePresence>
      </Box>
      <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} aiuConfig={aiuConfig} size="lg" />
      <Box px={5} py={4}>
        <Button w="full" bg={FY} color={DARK} rounded="lg" fontWeight="700" mb={2}
          onClick={() => safeNavigate('preview')} _hover={{ bg: '#e0b010' }}>
          Ver cotización →
        </Button>
        <Button w="full" bg={hasChanges ? 'whiteAlpha.200' : 'whiteAlpha.100'} color="white"
          rounded="lg" leftIcon={<FiSave />} isLoading={isSaving} onClick={handleSave}
          _hover={{ bg: 'whiteAlpha.300' }}>
          Guardar
        </Button>
      </Box>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   STEPPER MOBILE
════════════════════════════════════════════════════════════ */
const STEPS = ['Empresa', 'Cliente', 'Productos', 'Config'];

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function CotizadorPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const rm       = usePrefersReducedMotion();
  const cancelRef = useRef();
  const tableRef  = useRef(null);
  const saveRef   = useRef(null);

  const { getCotizacion, saveCotizacion, deleteCotizacion, duplicarCotizacion } = useCotizaciones();
  const { downloadPDF, loading: pdfLoading } = usePDF('cotizacion-pdf');
  const { getSugerencias } = useProductosFrecuentes();
  const importHook = useImport();

  /* ── Estado principal ── */
  const [empresa,       setEmpresaState] = useState(() => loadEmpresaLocal());
  const [cliente,       setCliente]      = useState(DEFAULT_CLIENTE);
  const [cotConfig,     setCotConfig]    = useState({ ...DEFAULT_CONFIG });
  const [aiuConfig,     setAiuConfig]    = useState({ ...DEFAULT_AIU });
  const [items,         setItems]        = useState([blankRow(), blankRow()]);
  const [notas,         setNotas]        = useState(DEFAULT_NOTAS);
  const [isSaving,      setIsSaving]     = useState(false);
  const [editingId,     setEditingId]    = useState(null);
  const [isPreview,     setIsPreview]    = useState(false);
  const [hasChanges,    setHasChanges]   = useState(false);
  const [descLocal,     setDescLocal]    = useState('0');
  const [pendingNav,    setPendingNav]   = useState(null);
  const [mobileStep,    setMobileStep]   = useState(0);
  const [showTipoModal, setShowTipoModal]= useState(!id);
  const [showImport,    setShowImport]   = useState(false);

  const { isOpen: isDelOpen,  onOpen: onDelOpen,  onClose: onDelClose  } = useDisclosure();
  const { isOpen: isExitOpen, onOpen: onExitOpen, onClose: onExitClose } = useDisclosure();

  const esObra = cotConfig.tipo === 'obra';

  const setEmpresa = useCallback(updater => {
    setEmpresaState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveEmpresaLocal(next);
      return next;
    });
  }, []);

  useEffect(() => { setHasChanges(true); }, [cliente, cotConfig, items, notas, descLocal, aiuConfig]);

  const stRef = useRef({});
  useEffect(() => {
    stRef.current = { empresa, cliente, cotConfig, items, descG: parseFloat(descLocal) || 0, notas, editingId, aiuConfig };
  });

  /* Título */
  useEffect(() => {
    const num = cotConfig.numero || 'Nueva';
    const cli = cliente.nombre ? ` — ${cliente.nombre}` : '';
    document.title = `${num}${cli} | FerreExpress`;
    return () => { document.title = 'FerreExpress — Cotizador'; };
  }, [cotConfig.numero, cliente.nombre]);

  /* Cargar por ID */
  useEffect(() => {
    if (!id) { setShowTipoModal(true); return; }
    const cot = getCotizacion(id);
    if (!cot) {
      toast({ title: 'Cotización no encontrada', status: 'error', duration: 3000 });
      navigate('/historial');
      return;
    }
    setCliente(cot.cliente || DEFAULT_CLIENTE);
    setCotConfig(cot.config || DEFAULT_CONFIG);
    setDescLocal(String(cot.descG || 0));
    setItems(cot.items?.length ? cot.items : [blankRow(), blankRow()]);
    setNotas(cot.notas || DEFAULT_NOTAS);
    setAiuConfig(cot.aiuConfig || DEFAULT_AIU);
    setEditingId(id);
    setHasChanges(false);
    setShowTipoModal(false);
  }, [id]); // eslint-disable-line

  /* Ctrl+S global */
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveRef.current?.(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const descGNum = useMemo(() => parseFloat(descLocal) || 0, [descLocal]);
  const totals   = useMemo(() =>
    esObra
      ? calcTotalsObra(items, descGNum, aiuConfig)
      : calcTotals(items, descGNum, cotConfig.iva),
    [items, descGNum, cotConfig.iva, esObra, aiuConfig]
  );

  /* ── Operaciones de ítems ── */
  const addItem = useCallback(() => {
    const row = blankRow();
    setItems(p => [...p, row]);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      focusInput(tableRef.current, row.id, 'desc')
    ));
  }, []);

  const removeItem    = useCallback(rid => setItems(p => p.length <= 1 ? p : p.filter(r => r.id !== rid)), []);
  const duplicateItem = useCallback(rid => {
    setItems(p => {
      const idx = p.findIndex(r => r.id === rid);
      if (idx < 0) return p;
      const copy = { ...p[idx], id: crypto.randomUUID?.() || Date.now().toString(36) };
      const next = [...p];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);
  const upItem = useCallback((rid, k, v) => {
    if ((k === 'price' || k === 'disc') && parseFloat(v) < 0) v = '0';
    if (k === 'qty' && parseFloat(v) <= 0) v = '1';
    setItems(p => p.map(r => r.id === rid ? { ...r, [k]: v } : r));
  }, []);

  const handleAcceptSugerencia = useCallback((rowId, { desc, price, unit }) => {
    setItems(p => p.map(r =>
      r.id === rowId ? { ...r, desc, price: price || r.price, unit: unit || r.unit } : r
    ));
    requestAnimationFrame(() => focusInput(tableRef.current, rowId, 'qty'));
  }, []);

  /* ════════════════════════════════════════════════
     ATAJOS DE TECLADO — TABLA DESKTOP
     Tab/Enter: avanza campos
     ↑↓: navega filas en la misma columna
     Ctrl+D: duplica fila
     Delete en fila vacía: elimina
  ════════════════════════════════════════════════ */
  const handleTableKeyDown = useCallback(e => {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT') return;
    const rowId = inp.dataset.rowId;
    const field = inp.dataset.field;
    if (!rowId || !field || field === 'desc') return;

    if (e.key === 'Escape') { inp.blur(); return; }

    /* ↑↓ — mover entre filas */
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setItems(cur => {
        const idx = cur.findIndex(r => r.id === rowId);
        const tgt = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
        if (tgt >= 0 && tgt < cur.length)
          requestAnimationFrame(() => focusInput(tableRef.current, cur[tgt].id, field));
        return cur;
      });
      return;
    }

    /* Ctrl+D — duplicar */
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault(); duplicateItem(rowId); return;
    }

    /* Delete/Backspace en fila vacía — eliminar */
    if ((e.key === 'Delete' || e.key === 'Backspace') && field === 'qty') {
      setItems(cur => {
        const r = cur.find(x => x.id === rowId);
        if (r && !r.desc && !r.price && cur.length > 1) {
          const idx = cur.findIndex(x => x.id === rowId);
          const prev = cur[Math.max(0, idx - 1)];
          requestAnimationFrame(() => focusInput(tableRef.current, prev.id, 'qty'));
          return cur.filter(x => x.id !== rowId);
        }
        return cur;
      });
      return;
    }

    /* Tab / Enter — avanzar campo */
    const isTab   = e.key === 'Tab' && !e.shiftKey;
    const isEnter = e.key === 'Enter';
    if (!isTab && !isEnter) return;

    const fIdx      = FIELD_ORDER.indexOf(field);
    const isLast    = fIdx === FIELD_ORDER.length - 1;

    if (isEnter && !isLast) {
      e.preventDefault();
      focusInput(tableRef.current, rowId, FIELD_ORDER[fIdx + 1]);
      return;
    }

    if ((isTab || isEnter) && isLast) {
      e.preventDefault();
      setItems(cur => {
        const idx  = cur.findIndex(r => r.id === rowId);
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
  }, [duplicateItem]);

  /* ── Guardado ── */
  const autoSave = useCallback(() => {
    const { empresa, cliente, cotConfig, items, descG, notas, editingId, aiuConfig } = stRef.current;
    const cfg = { ...cotConfig, estado: 'borrador' };
    const tot = cfg.tipo === 'obra'
      ? calcTotalsObra(items, descG, aiuConfig)
      : calcTotals(items, descG, cfg.iva);
    try { return saveCotizacion({ id: editingId, empresa, cliente, config: cfg, items, descG, notas, totals: tot, aiuConfig }); }
    catch { return null; }
  }, [saveCotizacion]);

  const handleSave = useCallback(async () => {
    if (!items.some(r => r.desc?.trim())) {
      toast({ title: 'Agrega al menos un producto', status: 'warning', duration: 4000, position: 'top' });
      return;
    }
    setIsSaving(true);
    const descG = parseFloat(descLocal) || 0;
    try {
      const payload = { id: editingId, empresa, cliente, config: cotConfig, items, descG, notas, totals, aiuConfig };
      const savedId = saveCotizacion(payload);
      aprenderProductos(items);
      if (!editingId) {
        await new Promise(r => setTimeout(r, 80));
        const saved = getCotizacion(savedId);
        if (saved?.config) setCotConfig(saved.config);
        setEditingId(savedId);
        navigate(`/cotizador/${savedId}`, { replace: true });
        toast({ title: 'Cotización creada ✓', description: saved?.numero ? `Número: ${saved.numero}` : '',
          status: 'success', duration: 4000, position: 'top-right' });
      } else {
        toast({ title: 'Guardado ✓', status: 'success', duration: 2000, position: 'top-right' });
      }
      setHasChanges(false);
    } catch (e) {
      toast({ title: 'Error al guardar', description: e.message, status: 'error', duration: 4000 });
    } finally { setIsSaving(false); }
  }, [editingId, empresa, cliente, cotConfig, descLocal, items, notas, totals, aiuConfig,
      saveCotizacion, getCotizacion, navigate, toast]);

  useEffect(() => { saveRef.current = handleSave; }, [handleSave]);

  const handleDelete    = useCallback(() => {
    if (!editingId) return;
    deleteCotizacion(editingId);
    toast({ title: 'Cotización eliminada', status: 'info', duration: 2500, position: 'top-right' });
    navigate('/historial');
  }, [editingId, deleteCotizacion, navigate, toast]);

  const handleDuplicate = useCallback(() => {
    if (!editingId) return;
    const newId = duplicarCotizacion(editingId);
    toast({ title: 'Cotización duplicada ✓', status: 'success', duration: 2000, position: 'top-right' });
    navigate(`/cotizador/${newId}`);
  }, [editingId, duplicarCotizacion, navigate, toast]);

  const safeNavigate = useCallback(path => {
    if (hasChanges) { setPendingNav(path); onExitOpen(); }
    else if (path === 'preview') setIsPreview(true);
    else navigate(path);
  }, [hasChanges, navigate, onExitOpen]);

  const confirmExit = useCallback(() => {
    onExitClose(); autoSave(); setHasChanges(false);
    if (pendingNav === 'preview') setIsPreview(true);
    else if (pendingNav) navigate(pendingNav);
    setPendingNav(null);
  }, [pendingNav, autoSave, navigate, onExitClose]);

  const discardAndExit = useCallback(() => {
    onExitClose(); setHasChanges(false);
    if (pendingNav === 'preview') setIsPreview(true);
    else if (pendingNav) navigate(pendingNav);
    setPendingNav(null);
  }, [pendingNav, navigate, onExitClose]);

  const handleClear = useCallback(() => {
    setCliente(DEFAULT_CLIENTE);
    setCotConfig({ ...DEFAULT_CONFIG });
    setAiuConfig({ ...DEFAULT_AIU });
    setItems([blankRow(), blankRow()]);
    setNotas(DEFAULT_NOTAS);
    setDescLocal('0');
    setEditingId(null);
    setHasChanges(false);
    setMobileStep(0);
    setShowTipoModal(true);
    navigate('/cotizador', { replace: true });
  }, [navigate]);

  const handlePDF = useCallback(async () => {
    const ok = await downloadPDF(`${cotConfig.numero || 'cotizacion'}_FerreExpress`);
    if (ok) toast({ title: 'PDF descargado ✓', status: 'success', duration: 2500, position: 'top-right' });
    else    toast({ title: 'Error generando PDF', status: 'error', duration: 4000 });
  }, [cotConfig.numero, downloadPDF, toast]);

  /* ── Confirmar importación ── */
  const handleImportConfirm = useCallback(({ items: imp, cliente: cli, cotConfig: cfg, notas: n }) => {
    if (imp?.length) setItems(imp);
    if (cli?.nombre) setCliente(c => ({ ...c, ...cli }));
    if (cfg?.numero && !cotConfig.numero) setCotConfig(c => ({ ...c, ...cfg }));
    if (n) setNotas(n);
    setHasChanges(true);
    toast({ title: `${imp.filter(i => i.desc).length} productos importados ✓`,
      status: 'success', duration: 3000, position: 'top-right' });
  }, [cotConfig.numero, toast]);

  /* ── Colores ── */
  const bg        = useColorModeValue('gray.50', 'gray.900');
  const border    = useColorModeValue('gray.200', 'whiteAlpha.200');
  const mutedL    = useColorModeValue('gray.400', 'gray.600');
  const inputBg   = useColorModeValue('white', 'gray.700');
  const barBg     = useColorModeValue('white', 'gray.900');
  const tableBg   = useColorModeValue('white', 'gray.800');
  const stripeBg  = useColorModeValue('gray.50', 'gray.750');
  const tabActive = useColorModeValue('gray.800', 'white');
  const totalColor = useColorModeValue('gray.700', 'gray.300');

  const ivaRate  = esObra ? 0 : (parseFloat(cotConfig.iva) || 0) / 100;
  const docProps = { empresa, cot: cotConfig, cli: cliente, items, descG: descGNum, totals, notas, aiu: aiuConfig };
  const tablaProps = {
    items, tableRef, handleTableKeyDown, esObra,
    border, mutedL, inputBg, tableBg, stripeBg,
    ivaRate, cotConfig, rm, upItem, removeItem, duplicateItem,
    handleAcceptSugerencia, getSugerencias, addItem,
  };
  const panelEmpresaProps = { empresa, setEmpresa, border, mutedL, inputBg };
  const panelClienteProps = { cliente, setCliente, inputBg };
  const panelCotizProps   = { cotConfig, setCotConfig, descLocal, setDescLocal, notas, setNotas, aiuConfig, setAiuConfig, inputBg };
  const mobileCardProps   = { upItem, removeItem, duplicateItem, cotConfig, inputBg, border, getSugerencias, handleAcceptSugerencia };

  /* ════════════════════════════════════════════════
     VISTA PREVIA PDF
  ════════════════════════════════════════════════ */
  if (isPreview) return (
    <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px" zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        px={{ base: 3, md: 6 }} py={3} position="sticky" top={0} zIndex={10}>
        <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
          <HStack>
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiEye />}
              onClick={() => setIsPreview(false)}>Volver</Button>
            {cotConfig.numero && <Badge bg={FY} color={DARK} rounded="full" px={3} fontWeight="700">{cotConfig.numero}</Badge>}
            <Badge bg={esObra ? 'blue.100' : 'green.100'} color={esObra ? 'blue.700' : 'green.700'} rounded="full" px={2} fontSize="9px">
              {esObra ? 'Obra' : 'Comercial'}
            </Badge>
          </HStack>
          <HStack>
            <Button size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
              isLoading={pdfLoading} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>PDF</Button>
            <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700" leftIcon={<FiSave />}
              isLoading={isSaving} _hover={{ bg: '#e0b010' }} onClick={handleSave}>
              {editingId ? 'Actualizar' : 'Guardar'}
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
            isLoading={pdfLoading} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>Descargar PDF</Button>
        </Flex>
      </Box>
    </Box>
  );

  /* ════════════════════════════════════════════════
     EDITOR
  ════════════════════════════════════════════════ */
  return (
    <Box minH="100vh" bg={bg}>
      {/* PDF oculto */}
      <Box id="cotizacion-pdf" position="fixed" top="-9999px" left="-9999px" zIndex={-1} w="794px" bg="white">
        <DocContent {...docProps} />
      </Box>

      {/* Modales */}
      <ModalTipo isOpen={showTipoModal} onSelect={tipo => {
        setCotConfig(p => ({ ...p, tipo, formaPago: tipo === 'obra' ? 'Anticipo + Actas' : 'Efectivo' }));
        setNotas(tipo === 'obra' ? DEFAULT_NOTAS_OBRA : DEFAULT_NOTAS);
        setShowTipoModal(false);
      }} />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        importHook={importHook}
        onConfirm={handleImportConfirm}
      />

      {/* ═══ TOPBAR ═══ */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border} position="sticky" top={0} zIndex={100}>
        <Flex maxW="1600px" mx="auto" px={{ base: 3, md: 5 }}
          h={{ base: 'auto', md: '54px' }} py={{ base: 2, md: 0 }}
          align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <HStack spacing={2}>
            <AppLogo src={empresa.logo} h="30px" />
            {cotConfig.numero
              ? <Badge bg={FY} color={DARK} rounded="full" fontSize="10px" px={3} fontWeight="700">{cotConfig.numero}</Badge>
              : <Tag size="sm" colorScheme="gray" rounded="full">Nueva</Tag>}
            <Badge bg={esObra ? 'blue.100' : 'green.100'} color={esObra ? 'blue.700' : 'green.700'}
              rounded="full" fontSize="8px" px={2} display={{ base: 'none', sm: 'block' }}>
              {esObra ? 'OBRA' : 'COMERCIAL'}
            </Badge>
            {hasChanges && (
              <HStack spacing={1}>
                <Icon as={FiAlertCircle} color="orange.400" boxSize={3} />
                <Text fontSize="10px" color="orange.500" fontWeight="600" display={{ base: 'none', md: 'block' }}>Sin guardar</Text>
              </HStack>
            )}
          </HStack>
          <HStack spacing={1} flexWrap="wrap">
            <Text fontSize="12px" fontWeight="700" color={totalColor}
              display={{ base: 'none', lg: 'block' }} mr={1}>
              {money(totals.totalPagar, cotConfig.moneda)}
            </Text>
            {/* Import */}
            <Tooltip label="Importar desde PDF / imagen / CSV" hasArrow>
              <Button size="sm" variant="outline" rounded="md" leftIcon={<FiUpload size={13} />}
                onClick={() => setShowImport(true)}
                display={{ base: 'none', sm: 'flex' }}>
                Importar
              </Button>
            </Tooltip>
            <Tooltip label="Historial" hasArrow>
              <IconButton size="sm" variant="outline" rounded="md" aria-label="Historial"
                icon={<FiList />} onClick={() => safeNavigate('/historial')} />
            </Tooltip>
            {editingId && (
              <Tooltip label="Duplicar cotización" hasArrow>
                <IconButton size="sm" variant="outline" rounded="md" aria-label="Duplicar"
                  icon={<FiCopy />} onClick={handleDuplicate} />
              </Tooltip>
            )}
            <Tooltip label="Nueva cotización" hasArrow>
              <IconButton size="sm" variant="outline" rounded="md" aria-label="Nueva"
                icon={<FiRefreshCw />} onClick={handleClear} />
            </Tooltip>
            {editingId && (
              <Tooltip label="Eliminar" hasArrow>
                <IconButton size="sm" colorScheme="red" variant="ghost" rounded="md"
                  aria-label="Eliminar" icon={<FiTrash2 />} onClick={onDelOpen} />
              </Tooltip>
            )}
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiEye />}
              onClick={() => safeNavigate('preview')}>
              <Text display={{ base: 'none', md: 'block' }}>Vista previa</Text>
              <Text display={{ base: 'block', md: 'none' }}>Ver</Text>
            </Button>
            <Button size="sm" bg={DARK} color={FY} rounded="md" leftIcon={<FiDownload />}
              isLoading={pdfLoading} _hover={{ bg: '#2a2a28' }} onClick={handlePDF}>
              PDF
            </Button>
            <Tooltip label={<HStack><Text>Guardar</Text><Kbd fontSize="10px">Ctrl+S</Kbd></HStack>} hasArrow>
              <Button size="sm" bg={hasChanges ? FY : 'gray.200'} color={hasChanges ? DARK : 'gray.500'}
                rounded="md" fontWeight="700" leftIcon={<FiSave />} isLoading={isSaving}
                _hover={{ bg: hasChanges ? '#e0b010' : 'gray.300' }} onClick={handleSave}>
                {editingId ? 'Actualizar' : 'Guardar'}
              </Button>
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      <Box maxW="1600px" mx="auto" px={{ base: 3, md: 5 }} py={4}>

        {/* ═══ DESKTOP (xl+) ═══ */}
        <Box display={{ base: 'none', xl: 'grid' }}
          gridTemplateColumns="272px 1fr 276px" gap={4}
          h="calc(100vh - 80px)" overflow="hidden">

          {/* Col 1: Formularios */}
          <GlassCard rounded="xl" overflow="hidden" display="flex" flexDirection="column">
            <Tabs variant="unstyled" size="sm" display="flex" flexDirection="column" h="full">
              <TabList borderBottom="1px solid" borderColor={border} px={1} pt={1} gap={0.5}>
                {[{l:'Empresa',i:FiHome},{l:'Cliente',i:FiUser},{l:'Config',i:FiFileText}].map(({l,i:Ic}) => (
                  <Tab key={l} flex={1} fontSize="9px" fontWeight="700" letterSpacing="0.1em"
                    textTransform="uppercase" color={mutedL} pb={2.5}
                    _selected={{ color: tabActive, borderBottom: `2px solid ${FY}`, mb: '-1px' }}>
                    <VStack spacing={1}><Icon as={Ic} boxSize={3.5} /><Text>{l}</Text></VStack>
                  </Tab>
                ))}
              </TabList>
              <TabPanels flex={1} overflow="hidden">
                {[<PanelEmpresa {...panelEmpresaProps} />,
                  <PanelCliente {...panelClienteProps} />,
                  <PanelCotizacion {...panelCotizProps} />].map((panel, i) => (
                  <TabPanel key={i} h="full" overflowY="auto" p={0}
                    sx={{ '&::-webkit-scrollbar': { w: '4px' }, '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' } }}>
                    {panel}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </GlassCard>

          {/* Col 2: Tabla (scroll interno) */}
          <Box display="flex" flexDirection="column" gap={3} minW={0} minH={0} overflow="hidden">
            <Flex align="center" justify="space-between" flexShrink={0}>
              <HStack spacing={2}>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="700" fontSize="15px">
                  {esObra ? 'Actividades / Materiales' : 'Productos y servicios'}
                </Text>
                <Tag size="sm" borderRadius="full" colorScheme="gray">
                  {items.filter(r => r.desc || r.price).length} ítem{items.filter(r => r.desc || r.price).length !== 1 ? 's' : ''}
                </Tag>
              </HStack>
              <Button size="xs" variant="ghost" leftIcon={<FiUpload size={11} />} color={mutedL}
                onClick={() => setShowImport(true)}>
                Importar
              </Button>
            </Flex>
            <GlassCard rounded="xl" flex={1} overflow="hidden" display="flex" flexDirection="column" minH={0}>
              <TablaProductos {...tablaProps} />
            </GlassCard>
          </Box>

          {/* Col 3: Resumen */}
          <ResumenDesktop
            items={items} cotConfig={cotConfig} totals={totals} descGNum={descGNum}
            aiuConfig={aiuConfig} cliente={cliente} rm={rm} safeNavigate={safeNavigate}
            handleSave={handleSave} isSaving={isSaving} hasChanges={hasChanges} />
        </Box>

        {/* ═══ TABLET (md–xl) ═══ */}
        <Box display={{ base: 'none', md: 'flex', xl: 'none' }} flexDirection="column" gap={4}>
          <GlassCard rounded="xl" overflow="hidden">
            <Tabs variant="unstyled" size="sm">
              <TabList borderBottom="1px solid" borderColor={border} px={1} pt={1} gap={0.5}>
                {[{l:'Empresa',i:FiHome},{l:'Cliente',i:FiUser},{l:'Config',i:FiFileText}].map(({l,i:Ic}) => (
                  <Tab key={l} flex={1} fontSize="9px" fontWeight="700" letterSpacing="0.1em"
                    textTransform="uppercase" color={mutedL} pb={2.5}
                    _selected={{ color: tabActive, borderBottom: `2px solid ${FY}`, mb: '-1px' }}>
                    <VStack spacing={1}><Icon as={Ic} boxSize={3.5} /><Text>{l}</Text></VStack>
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
            <Flex align="center" px={4} py={3} justify="space-between" borderBottom="1px solid" borderColor={border}>
              <HStack>
                <Icon as={FiPackage} color={mutedL} boxSize={4} />
                <Text fontWeight="700">{esObra ? 'Actividades' : 'Productos'}</Text>
                <Tag size="sm" colorScheme="gray" rounded="full">{items.filter(r => r.desc || r.price).length}</Tag>
              </HStack>
              <Button size="xs" variant="outline" leftIcon={<FiUpload size={11} />} rounded="md"
                onClick={() => setShowImport(true)}>Importar</Button>
            </Flex>
            <TablaProductos {...tablaProps} />
          </GlassCard>
          <Box bg={DARK} rounded="xl" border="1px solid" borderColor="whiteAlpha.100">
            <ResumenTotales totals={totals} cotConfig={cotConfig} descGNum={descGNum} aiuConfig={aiuConfig} size="md" />
          </Box>
          <Flex gap={2} pb={4}>
            <Button flex={1} bg={FY} color={DARK} rounded="lg" fontWeight="700"
              onClick={() => safeNavigate('preview')} _hover={{ bg: '#e0b010' }}>
              Ver cotización →
            </Button>
            <Button flex={1} bg={DARK} color="white" rounded="lg" leftIcon={<FiSave />}
              isLoading={isSaving} onClick={handleSave} _hover={{ bg: '#2a2a28' }}>
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </Flex>
        </Box>

        {/* ═══ MOBILE (<md) — STEPPER + TARJETAS ═══ */}
        <Box display={{ base: 'flex', md: 'none' }} flexDirection="column" pb="96px">

          {/* Tab bar mobile */}
          <Flex bg={barBg} border="1px solid" borderColor={border}
            rounded="2xl" mb={4} overflow="hidden">
            {STEPS.map((label, idx) => (
              <Box key={label} flex={1} as="button" py={2.5}
                bg={mobileStep === idx ? FY : 'transparent'}
                onClick={() => setMobileStep(idx)}
                transition="all 0.15s">
                <Text fontSize="9px" fontWeight="700" textTransform="uppercase" letterSpacing="wider"
                  color={mobileStep === idx ? DARK : mutedL}>
                  {label}
                </Text>
              </Box>
            ))}
          </Flex>

          <GlassCard rounded="xl" overflow="hidden" mb={3}>
            <AnimatePresence mode="wait">
              <MotionBox key={mobileStep}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                {mobileStep === 0 && <PanelEmpresa {...panelEmpresaProps} />}
                {mobileStep === 1 && <PanelCliente {...panelClienteProps} />}
                {mobileStep === 2 && (
                  <Box>
                    {/* Header productos mobile */}
                    <Flex px={4} py={3} align="center" justify="space-between"
                      borderBottom="1px solid" borderColor={border}>
                      <HStack>
                        <Icon as={FiPackage} color={mutedL} boxSize={4} />
                        <Text fontWeight="700">{esObra ? 'Actividades' : 'Productos'}</Text>
                        <Tag size="sm" colorScheme="gray" rounded="full">
                          {items.filter(r => r.desc || r.price).length}
                        </Tag>
                      </HStack>
                      <Button size="xs" variant="outline" rounded="md" leftIcon={<FiUpload size={11} />}
                        onClick={() => setShowImport(true)}>Importar</Button>
                    </Flex>

                    {/* Tarjetas */}
                    <Box px={3} py={3}>
                      {items.map((r, i) => (
                        <ProductCardMobile key={r.id} r={r} index={i} {...mobileCardProps} />
                      ))}
                      <Button w="full" size="md" variant="dashed" rounded="xl"
                        border="2px dashed" borderColor={border}
                        leftIcon={<FiPlus />} onClick={addItem}
                        color={FY} fontWeight="700" mt={1}
                        _hover={{ borderColor: FY, bg: useColorModeValue('yellow.50', 'whiteAlpha.100') }}>
                        + Agregar producto
                      </Button>
                    </Box>

                    {/* Mini resumen */}
                    <Box bg={DARK} px={4} py={3} mt={2}>
                      <Stack spacing={1}>
                        {esObra ? (
                          <>
                            <Flex justify="space-between">
                              <Text fontSize="10px" color="whiteAlpha.500">Costo Directo</Text>
                              <Text fontSize="11px" color="whiteAlpha.700">{money(totals.costoDirecto ?? 0, cotConfig.moneda)}</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text fontSize="10px" color="whiteAlpha.500">AIU + IVA</Text>
                              <Text fontSize="11px" color="whiteAlpha.700">
                                {money((totals.totalPagar ?? 0) - (totals.costoDirecto ?? 0), cotConfig.moneda)}
                              </Text>
                            </Flex>
                          </>
                        ) : (
                          <>
                            <Flex justify="space-between">
                              <Text fontSize="10px" color="whiteAlpha.500">Subtotal s/IVA</Text>
                              <Text fontSize="11px" color="whiteAlpha.700">{money(totals.totalBruto ?? 0, cotConfig.moneda)}</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text fontSize="10px" color="whiteAlpha.500">IVA {cotConfig.iva}%</Text>
                              <Text fontSize="11px" color="whiteAlpha.700">{money(totals.ivaTotal ?? 0, cotConfig.moneda)}</Text>
                            </Flex>
                          </>
                        )}
                        {descGNum > 0 && (
                          <Flex justify="space-between">
                            <Text fontSize="10px" color="whiteAlpha.500">Desc. {descGNum}%</Text>
                            <Text fontSize="11px" color="red.300">− {money(totals.descGAmt ?? 0, cotConfig.moneda)}</Text>
                          </Flex>
                        )}
                        <Box h="1px" bg={`${FY}33`} my={1} />
                        <Flex justify="space-between" align="center">
                          <Text fontSize="11px" color="whiteAlpha.600">Total</Text>
                          <Text fontSize="20px" fontWeight="900" color={FY}>
                            {money(totals.totalPagar, cotConfig.moneda)}
                          </Text>
                        </Flex>
                      </Stack>
                    </Box>
                  </Box>
                )}
                {mobileStep === 3 && <PanelCotizacion {...panelCotizProps} />}
              </MotionBox>
            </AnimatePresence>
          </GlassCard>

          {/* Navegación pasos */}
          <Flex gap={2}>
            {mobileStep > 0 && (
              <Button flex={1} variant="outline" rounded="xl" leftIcon={<FiChevronLeft />}
                onClick={() => setMobileStep(s => s - 1)}>
                {STEPS[mobileStep - 1]}
              </Button>
            )}
            {mobileStep < STEPS.length - 1 && (
              <Button flex={1} bg={FY} color={DARK} rounded="xl" fontWeight="700"
                rightIcon={<FiChevronRight />}
                onClick={() => setMobileStep(s => s + 1)}>
                {STEPS[mobileStep + 1]}
              </Button>
            )}
          </Flex>
        </Box>
      </Box>

      {/* ═══ BOTTOM BAR MOBILE ═══ */}
      <Box display={{ base: 'flex', md: 'none' }} position="fixed" bottom={0} left={0} right={0}
        bg={barBg} borderTop="1px solid" borderColor={border}
        px={4} py={3} gap={2} zIndex={200} boxShadow="0 -4px 16px rgba(0,0,0,0.08)">
        <Box flex={1}>
          <Text fontSize="9px" color={mutedL} textTransform="uppercase" letterSpacing="wider">Total</Text>
          <Text fontSize="16px" fontWeight="900" color={FY} lineHeight="1.2">
            {money(totals.totalPagar, cotConfig.moneda)}
          </Text>
        </Box>
        <IconButton size="sm" variant="outline" rounded="lg" aria-label="Importar"
          icon={<FiUpload size={14} />} onClick={() => setShowImport(true)} />
        <Button size="sm" variant="outline" rounded="lg" leftIcon={<FiEye size={14} />}
          onClick={() => safeNavigate('preview')}>Ver</Button>
        <Button size="sm" bg={DARK} color={FY} rounded="lg" leftIcon={<FiDownload size={14} />}
          isLoading={pdfLoading} onClick={handlePDF} _hover={{ bg: '#2a2a28' }}>PDF</Button>
        <Button size="sm" bg={hasChanges ? FY : 'gray.200'} color={hasChanges ? DARK : 'gray.500'}
          rounded="lg" fontWeight="700" leftIcon={<FiSave size={14} />}
          isLoading={isSaving} onClick={handleSave}
          _hover={{ bg: hasChanges ? '#e0b010' : 'gray.300' }}>
          {editingId ? 'Actualizar' : 'Guardar'}
        </Button>
      </Box>

      {/* Dialogo eliminar */}
      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl">
            <AlertDialogHeader fontWeight="900">¿Eliminar cotización?</AlertDialogHeader>
            <AlertDialogBody>
              {cliente.nombre
                ? <>Vas a eliminar la cotización de <strong>{cliente.nombre}</strong>. No se puede deshacer.</>
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDelClose} rounded="md">Cancelar</Button>
              <Button bg={RED} color="white" ml={3} rounded="md"
                onClick={() => { onDelClose(); handleDelete(); }}>Eliminar</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Dialogo cambios sin guardar */}
      <AlertDialog isOpen={isExitOpen} leastDestructiveRef={cancelRef} onClose={onExitClose}>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="xl">
            <AlertDialogHeader fontWeight="900">
              <HStack><Icon as={FiAlertCircle} color="orange.400" /><Text>Cambios sin guardar</Text></HStack>
            </AlertDialogHeader>
            <AlertDialogBody>¿Qué deseas hacer con los cambios actuales?</AlertDialogBody>
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
