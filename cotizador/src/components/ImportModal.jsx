/**
 * ImportModal.jsx — FerreExpress
 * Modal profesional para importar cotizaciones desde PDF, imagen o CSV.
 *
 * Fases:
 *   idle    → Drop zone / selector de archivo
 *   loading → Barra de progreso animada
 *   preview → Tabla de ítems extraídos + info cliente (editable antes de confirmar)
 *   error   → Mensaje + reintentar
 */

import { useRef, useState, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody,
  Box, Flex, HStack, VStack, Stack, Text, Icon,
  Button, IconButton, Input, Select, Progress, Badge, Divider,
  useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import {
  FiUploadCloud, FiFileText, FiImage, FiX, FiCheck,
  FiAlertCircle, FiRefreshCw, FiPlus, FiTrash2,
  FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import { money, formatPriceCO, parsePriceCO, blankRow, UNITS } from '../utils';

const FY   = '#F9BF20';
const DARK = '#3A3A38';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.csv,.txt';
const FILE_ICONS = { pdf: FiFileText, image: FiImage, text: FiFileText };
const FILE_LABELS = { pdf: 'PDF', image: 'Imagen', text: 'CSV / Texto' };

/* ── Fila de ítem editable en la preview ── */
function PreviewRow({ item, index, onChange, onRemove, moneda }) {
  const [priceDisplay, setPriceDisplay] = useState(() => formatPriceCO(item.price));
  const mutedC = useColorModeValue('gray.500', 'gray.400');
  const rowBorder = useColorModeValue('gray.100', 'whiteAlpha.100');

  return (
    <Flex gap={1} align="center" py={1.5}
      borderBottom="1px solid" borderColor={rowBorder}>
      <Text fontSize="10px" color={mutedC} w="18px" flexShrink={0} textAlign="center">{index + 1}</Text>

      <Input size="xs" variant="flushed" flex={1} value={item.desc}
        onChange={e => onChange('desc', e.target.value)}
        placeholder="Descripción" fontWeight="600" fontSize="11px"
        focusBorderColor={FY} />

      <Input size="xs" variant="flushed" w="36px" value={item.qty}
        onChange={e => onChange('qty', e.target.value)}
        textAlign="center" fontSize="11px" focusBorderColor={FY} />

      <Box w="52px" flexShrink={0}>
        <select
          value={item.unit}
          onChange={e => onChange('unit', e.target.value)}
          style={{ width: '100%', fontSize: 10, background: 'transparent', border: 'none',
            outline: 'none', color: 'inherit', cursor: 'pointer' }}>
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
      </Box>

      <Input size="xs" variant="flushed" w="80px" value={priceDisplay}
        onChange={e => {
          const raw = parsePriceCO(e.target.value);
          if (raw === '' || /^\d+$/.test(raw)) {
            setPriceDisplay(formatPriceCO(raw));
            onChange('price', raw);
          }
        }}
        textAlign="right" fontSize="11px" focusBorderColor={FY} />

      <Text fontSize="10px" color="green.500" w="72px" textAlign="right" fontWeight="700">
        {money(
          (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 1),
          moneda
        )}
      </Text>

      <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 size={11} />}
        onClick={onRemove} tabIndex={-1} aria-label="Eliminar" />
    </Flex>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function ImportModal({ isOpen, onClose, importHook, onConfirm }) {
  const { phase, progress, preview, error, fileName, fileType, processFile, reset, usedAI } = importHook;

  const fileRef  = useRef();
  const dropRef  = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [showClient, setShowClient] = useState(true);

  /* Estado editable de la preview */
  const [editItems,  setEditItems]  = useState(null);
  const [editClient, setEditClient] = useState(null);

  // Sincronizar edición al entrar en la fase "preview" (patrón valor-previo-en-estado)
  const [seenPhase, setSeenPhase] = useState('idle');
  if (phase !== seenPhase) {
    setSeenPhase(phase);
    if (phase === 'preview') {
      setEditItems(preview?.items ? preview.items.map(i => ({ ...i })) : []);
      setEditClient(preview?.cliente ? { ...preview.cliente } : {});
    }
  }

  /* Colores (todos hoisteados — nunca condicionales) */
  const bg        = useColorModeValue('white', 'gray.800');
  const border    = useColorModeValue('gray.200', 'whiteAlpha.200');
  const dropBg    = useColorModeValue('gray.50', 'gray.700');
  const dropActive = useColorModeValue('yellow.50', 'yellow.900');
  const mutedC    = useColorModeValue('gray.500', 'gray.400');
  const headerBg  = useColorModeValue('gray.50', 'gray.750');
  const tipBg     = useColorModeValue('blue.50', 'blue.900');
  const tipBorder = useColorModeValue('blue.200', 'blue.700');
  const tipText   = useColorModeValue('blue.700', 'blue.200');
  const trackBg   = useColorModeValue('gray.100', 'gray.700');
  const addHover  = useColorModeValue('yellow.50', 'whiteAlpha.100');

  /* ── Drag & Drop ── */
  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  /* ── Confirmar importación ── */
  const handleConfirm = useCallback(() => {
    if (!editItems) return;
    onConfirm({
      items:     editItems.filter(i => i.desc?.trim()),
      cliente:   editClient || {},
      cotConfig: preview?.cotConfig || {},
      notas:     preview?.notas || '',
    });
    reset();
    onClose();
  }, [editItems, editClient, preview, onConfirm, reset, onClose]);

  /* ── Cerrar y limpiar ── */
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  /* ── Items editables ── */
  const updateItem = (id, key, val) =>
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, [key]: val } : it));
  const removeItem = id =>
    setEditItems(prev => prev.length <= 1 ? prev : prev.filter(it => it.id !== id));
  const addItem = () =>
    setEditItems(prev => [...prev, blankRow()]);

  const totalItems  = editItems?.filter(i => i.desc?.trim()).length ?? 0;
  const totalValor  = editItems?.reduce((s, i) =>
    s + (parseFloat(i.price) || 0) * (parseFloat(i.qty) || 1), 0) ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" overflow="hidden" mx={{ base: 3, md: 6 }}
        maxH={{ base: '95vh', md: '90vh' }} display="flex" flexDirection="column">

        {/* ── Header ── */}
        <Box bg={DARK} px={6} py={4} flexShrink={0}>
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontWeight="900" fontSize="18px" color="white">
                Importar cotización
              </Text>
              <Text fontSize="11px" color="whiteAlpha.500" mt={0.5}>
                PDF · Imagen · CSV — los datos se pueden editar antes de confirmar
              </Text>
            </Box>
            <IconButton variant="ghost" icon={<FiX size={18} />} color="white"
              _hover={{ bg: 'whiteAlpha.200' }} onClick={handleClose}
              aria-label="Cerrar" size="sm" rounded="lg" />
          </Flex>
        </Box>

        <ModalBody p={0} flex={1} overflowY="auto"
          sx={{ '&::-webkit-scrollbar': { w: '4px' }, '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' } }}>

          {/* ════ FASE: IDLE — Drop Zone ════ */}
          {phase === 'idle' && (
            <Box p={{ base: 4, md: 6 }}>
              {/* Drop zone */}
              <Box
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                tabIndex={0}
                role="button"
                aria-label="Seleccionar archivo para importar"
                border="2px dashed"
                borderColor={isDragging ? FY : border}
                rounded="xl"
                bg={isDragging ? dropActive : dropBg}
                p={{ base: 8, md: 12 }}
                textAlign="center"
                cursor="pointer"
                transition="all 0.15s"
                _hover={{ borderColor: FY, bg: dropActive }}
                _focusVisible={{ outline: `2px solid ${FY}`, outlineOffset: '2px' }}>
                <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
                <Icon as={FiUploadCloud} boxSize={{ base: 10, md: 14 }}
                  color={isDragging ? FY : mutedC} mb={3} />
                <Text fontWeight="800" fontSize={{ base: '15px', md: '17px' }} mb={1}>
                  Arrastra el archivo aquí
                </Text>
                <Text fontSize="12px" color={mutedC} mb={4}>
                  o haz clic para seleccionarlo
                </Text>
                <HStack justify="center" spacing={3} flexWrap="wrap">
                  {['PDF', 'PNG / JPG', 'CSV'].map(t => (
                    <Badge key={t} variant="outline" colorScheme="gray"
                      fontSize="10px" rounded="full" px={3} py={1}>
                      {t}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              {/* Tip */}
              <Box mt={4} p={3} rounded="lg" bg={tipBg}
                border="1px solid" borderColor={tipBorder}>
                <Text fontSize="11px" color={tipText}>
                  {import.meta.env.VITE_MISTRAL_API_KEY
                    ? <><strong>Extraccion con IA activa:</strong> Detecta automaticamente productos, precios y datos del cliente desde cualquier cotizacion.</>
                    : <><strong>Tip:</strong> La precision es mayor con cotizaciones en PDF de texto. Para imagenes o PDFs escaneados, los resultados pueden variar — revisa los datos antes de confirmar.</>
                  }
                </Text>
              </Box>
            </Box>
          )}

          {/* ════ FASE: LOADING ════ */}
          {phase === 'loading' && (
            <Box p={8} textAlign="center">
              <VStack spacing={5}>
                <Box position="relative">
                  <Icon as={FILE_ICONS[fileType] || FiFileText}
                    boxSize={16} color={FY} />
                  <Badge position="absolute" bottom={0} right={-2}
                    bg={FY} color={DARK} rounded="full" fontSize="8px" px={1.5}>
                    {FILE_LABELS[fileType] || '...'}
                  </Badge>
                </Box>
                <Box w="full" maxW="360px">
                  <Text fontSize="13px" fontWeight="700" mb={1}>{fileName}</Text>
                  <Progress value={progress} size="sm" rounded="full"
                    sx={{ '& > div': { background: FY } }}
                    bg={trackBg} />
                  <Text fontSize="11px" color={mutedC} mt={1}>
                    {progress < 20 ? 'Iniciando...' :
                     progress < 40 ? (import.meta.env.VITE_MISTRAL_API_KEY ? 'Enviando a Mistral AI...' : fileType === 'image' ? 'Reconociendo texto con OCR...' : 'Extrayendo texto del PDF...') :
                     progress < 90 ? (import.meta.env.VITE_MISTRAL_API_KEY ? 'Analizando con vision IA...' : 'Analizando estructura...') :
                     'Procesando datos...'}
                  </Text>
                </Box>
                <Text fontSize="10px" color={mutedC}>
                  {fileType === 'image' ? 'El OCR puede tardar 15-30 segundos' : 'Unos segundos...'}
                </Text>
              </VStack>
            </Box>
          )}

          {/* ════ FASE: ERROR ════ */}
          {phase === 'error' && (
            <Box p={8} textAlign="center">
              <VStack spacing={4}>
                <Icon as={FiAlertCircle} boxSize={12} color="red.400" />
                <Box>
                  <Text fontWeight="800" fontSize="15px" mb={1}>No se pudo procesar el archivo</Text>
                  <Text fontSize="12px" color={mutedC} maxW="360px">
                    {error?.includes('fetch') || error?.includes('network') || error?.includes('Failed')
                      ? 'Error de conexion. Verifica tu internet e intenta de nuevo.'
                      : error?.includes('JSON') || error?.includes('parse')
                      ? 'No se pudo leer la respuesta de la IA. Intenta con otro archivo.'
                      : error?.includes('401') || error?.includes('403')
                      ? 'API key invalida o sin permisos. Revisa VITE_MISTRAL_API_KEY en .env'
                      : error?.includes('429')
                      ? 'Limite de requests alcanzado. Espera un momento e intenta de nuevo.'
                      : error || 'Error desconocido al procesar el archivo.'}
                  </Text>
                </Box>
                <Button leftIcon={<FiRefreshCw />} onClick={reset} variant="outline" rounded="lg">
                  Intentar con otro archivo
                </Button>
              </VStack>
            </Box>
          )}

          {/* ════ FASE: PREVIEW ════ */}
          {phase === 'preview' && editItems && (
            <Box>
              {/* ── Resumen rápido ── */}
              <Flex bg={headerBg} px={5} py={3} gap={4} align="center" flexWrap="wrap"
                borderBottom="1px solid" borderColor={border}>
                <HStack spacing={2}>
                  <Icon as={FILE_ICONS[fileType] || FiFileText} color={FY} boxSize={4} />
                  <Text fontSize="12px" fontWeight="700" noOfLines={1} maxW="200px">{fileName}</Text>
                </HStack>
                <Flex gap={3} flexWrap="wrap">
                  <Badge colorScheme={totalItems > 0 ? 'green' : 'orange'} rounded="full" px={2}>
                    {totalItems} producto{totalItems !== 1 ? 's' : ''} encontrado{totalItems !== 1 ? 's' : ''}
                  </Badge>
                  {usedAI && (
                    <Badge colorScheme="purple" rounded="full" px={2}>
                      IA Mistral ✓
                    </Badge>
                  )}
                  {!usedAI && preview?.confidence >= 40 && (
                    <Badge colorScheme="blue" rounded="full" px={2}>
                      Formato reconocido ✓
                    </Badge>
                  )}
                  {totalValor > 0 && (
                    <Badge colorScheme="gray" rounded="full" px={2}>
                      Total ≈ {money(totalValor)}
                    </Badge>
                  )}
                </Flex>
                <Box ml="auto">
                  <Button size="xs" variant="ghost" leftIcon={<FiRefreshCw size={11} />}
                    onClick={reset} color={mutedC}>
                    Cambiar archivo
                  </Button>
                </Box>
              </Flex>

              {/* ── Info Cliente (colapsable) ── */}
              <Box borderBottom="1px solid" borderColor={border}>
                <Flex px={5} py={3} align="center" justify="space-between" cursor="pointer"
                  onClick={() => setShowClient(s => !s)}
                  _hover={{ bg: headerBg }}>
                  <HStack>
                    <Text fontSize="11px" fontWeight="700" textTransform="uppercase"
                      letterSpacing="wider" color={mutedC}>
                      Datos del cliente
                    </Text>
                    {editClient?.nombre && (
                      <Badge colorScheme="green" rounded="full" fontSize="9px">
                        {editClient.nombre}
                      </Badge>
                    )}
                  </HStack>
                  <Icon as={showClient ? FiChevronUp : FiChevronDown} color={mutedC} boxSize={4} />
                </Flex>
                {showClient && (
                  <Box px={5} pb={4}>
                    <Flex gap={3} flexWrap="wrap">
                      {[
                        { k: 'nombre',   label: 'Nombre / Razón social', w: '200px' },
                        { k: 'empresa',  label: 'Empresa',               w: '180px' },
                        { k: 'nit',      label: 'NIT / Cédula',          w: '120px' },
                        { k: 'tel',      label: 'Teléfono',              w: '120px' },
                        { k: 'correo',   label: 'Correo',                w: '180px' },
                        { k: 'ciudad',   label: 'Ciudad',                w: '120px' },
                      ].map(({ k, label, w }) => (
                        <Box key={k} w={w} minW="100px" flex="1">
                          <Text fontSize="8px" fontWeight="700" textTransform="uppercase"
                            letterSpacing="wider" color={mutedC} mb="3px">{label}</Text>
                          <Input size="xs" value={editClient?.[k] || ''}
                            onChange={e => setEditClient(p => ({ ...p, [k]: e.target.value }))}
                            rounded="md" focusBorderColor={FY}
                            placeholder={`Ej: ${label}`} />
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>

              {/* ── Tabla de productos ── */}
              <Box px={5} py={3}>
                <Flex align="center" justify="space-between" mb={3}>
                  <Text fontSize="11px" fontWeight="700" textTransform="uppercase"
                    letterSpacing="wider" color={mutedC}>
                    Productos / Actividades
                  </Text>
                  <Text fontSize="10px" color={mutedC}>
                    Edita los valores antes de confirmar
                  </Text>
                </Flex>

                {/* Header columnas */}
                <Flex gap={1} px={0} pb={1}
                  borderBottom="2px solid" borderColor={border} mb={1}>
                  <Text w="18px" />
                  <Text flex={1} fontSize="8px" fontWeight="700" textTransform="uppercase" color={mutedC}>Descripción</Text>
                  <Text w="36px" fontSize="8px" fontWeight="700" textTransform="uppercase" color={mutedC} textAlign="center">Cant.</Text>
                  <Text w="52px" fontSize="8px" fontWeight="700" textTransform="uppercase" color={mutedC}>Unidad</Text>
                  <Text w="80px" fontSize="8px" fontWeight="700" textTransform="uppercase" color={mutedC} textAlign="right">Precio</Text>
                  <Text w="72px" fontSize="8px" fontWeight="700" textTransform="uppercase" color={mutedC} textAlign="right">Total</Text>
                  <Text w="28px" />
                </Flex>

                {/* Filas */}
                {editItems.map((item, i) => (
                  <PreviewRow
                    key={item.id}
                    item={item}
                    index={i}
                    onChange={(k, v) => updateItem(item.id, k, v)}
                    onRemove={() => removeItem(item.id)}
                    moneda="COP"
                  />
                ))}

                {/* Agregar fila */}
                <Button size="xs" variant="ghost" leftIcon={<FiPlus size={11} />}
                  color={FY} mt={2} onClick={addItem}
                  _hover={{ bg: addHover }}>
                  Agregar producto
                </Button>

                {/* Total */}
                <Flex justify="flex-end" mt={3} pt={3}
                  borderTop="2px solid" borderColor={border}>
                  <HStack spacing={4}>
                    <Text fontSize="12px" color={mutedC}>
                      {totalItems} ítem{totalItems !== 1 ? 's' : ''}
                    </Text>
                    <Box textAlign="right">
                      <Text fontSize="8px" color={mutedC} textTransform="uppercase" letterSpacing="wider">
                        Total estimado
                      </Text>
                      <Text fontSize="20px" fontWeight="900" color={FY} lineHeight="1.1">
                        {money(totalValor)}
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
              </Box>
            </Box>
          )}
        </ModalBody>

        {/* ── Footer con acciones ── */}
        {(phase === 'preview' || phase === 'idle' || phase === 'error' || phase === 'loading') && (
          <Box px={{ base: 4, md: 6 }} py={4} borderTop="1px solid" borderColor={border}
            flexShrink={0} bg={bg}>
            <Flex justify="flex-end" gap={3}>
              <Button variant="ghost" rounded="lg" onClick={handleClose}
                isDisabled={phase === 'loading' ? false : false}>
                {phase === 'loading' ? 'Cancelar extraccion' : 'Cancelar'}
              </Button>
              {phase === 'preview' && (
                <Button
                  bg={FY} color={DARK} rounded="lg" fontWeight="800"
                  leftIcon={<FiCheck />}
                  isDisabled={totalItems === 0}
                  onClick={handleConfirm}
                  _hover={{ bg: '#e0b010' }}>
                  Importar {totalItems} producto{totalItems !== 1 ? 's' : ''}
                </Button>
              )}
            </Flex>
          </Box>
        )}
      </ModalContent>
    </Modal>
  );
}
