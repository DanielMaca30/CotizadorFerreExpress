/**
 * RegistroSiigo.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Checklist para que el cajero registre la cotización en Siigo POS
 * sin perderse ningún producto. Cada ítem es una tarjeta grande
 * que se tachea al tocarla. Cuando todo está marcado, confirma
 * y cambia el estado a "Entregada".
 *
 * UX: pantalla completa para que el cajero no tenga que abrir
 * otra app — lo usa en el celular mientras tipea en Siigo.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useMemo } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody,
  Box, Flex, HStack, VStack, Text, Badge, Button, IconButton,
  Progress, Divider, useColorModeValue, Circle,
} from '@chakra-ui/react';
import { FiCheck, FiX, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { calcRow, money } from '../utils';

const FY   = '#F9BF20';
const DARK = '#3A3A38';

function ItemCard({ r, checked, onToggle, moneda }) {
  const total = calcRow(r)?.total || 0;
  const qty   = parseFloat(r.qty) || 1;
  const unit  = r.unit || '';
  const bg        = useColorModeValue(checked ? '#f0fdf4' : 'white', checked ? '#14532d22' : 'gray.800');
  const borderCol = checked ? '#22c55e' : useColorModeValue('gray.200', 'whiteAlpha.200');
  const textCol   = useColorModeValue(checked ? 'gray.400' : 'gray.800', checked ? 'gray.500' : 'gray.100');

  return (
    <Box
      bg={bg} border="2px solid" borderColor={borderCol} rounded="xl"
      px={4} py={3} cursor="pointer" transition="all 0.15s"
      onClick={onToggle}
      _active={{ transform: 'scale(0.98)' }}
      opacity={checked ? 0.7 : 1}>
      <Flex align="center" gap={3}>
        {/* Checkbox visual grande */}
        <Circle size="36px" bg={checked ? '#22c55e' : useColorModeValue('gray.100', 'gray.700')}
          border={checked ? 'none' : '2px solid'} borderColor="gray.300" flexShrink={0}
          transition="all 0.15s">
          {checked && <FiCheck color="white" size={18} />}
        </Circle>

        <Box flex={1} minW={0}>
          <Text
            fontWeight="700" fontSize="15px" color={textCol}
            textDecoration={checked ? 'line-through' : 'none'}
            noOfLines={2}>
            {r.desc}
          </Text>
          <HStack spacing={2} mt={0.5} flexWrap="wrap">
            <Badge colorScheme="gray" rounded="full" fontSize="11px" fontWeight="600">
              {qty === Math.floor(qty) ? qty : qty.toFixed(2)} {unit}
            </Badge>
            {r.ref && (
              <Text fontSize="11px" color="gray.400">Ref: {r.ref}</Text>
            )}
          </HStack>
        </Box>

        {total > 0 && (
          <Text fontWeight="800" fontSize="15px" color={checked ? 'green.400' : FY} flexShrink={0}>
            {money(total, moneda)}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

export default function RegistroSiigo({
  isOpen, onClose,
  items = [],
  cotNumero = '',
  clienteNombre = '',
  moneda = 'COP',
  totalPagar = 0,
  onConfirmar,   // callback cuando todo está marcado → (checkedIds) => void
}) {
  const productosValidos = useMemo(
    () => items.filter(r => r.desc?.trim()),
    [items]
  );
  const [checked, setChecked] = useState(() => new Set());
  const bg    = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const toggle = (id) => setChecked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const limpiar = () => setChecked(new Set());

  const totalMarcados  = checked.size;
  const totalProductos = productosValidos.length;
  const pct = totalProductos ? Math.round((totalMarcados / totalProductos) * 100) : 0;
  const todosLisros = totalMarcados === totalProductos && totalProductos > 0;

  const handleConfirmar = () => {
    onConfirmar?.([...checked]);
    setChecked(new Set());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent bg={bg} rounded="none" m={0} h="100dvh" display="flex" flexDir="column">

        {/* ── Cabecera pegajosa ── */}
        <Box bg={DARK} px={4} pt={4} pb={3} flexShrink={0}>
          <Flex justify="space-between" align="center" mb={2}>
            <VStack spacing={0} align="start">
              <Text color="white" fontWeight="900" fontSize="16px">
                Registrar en Siigo
              </Text>
              <HStack spacing={2}>
                {cotNumero && (
                  <Badge bg={FY} color={DARK} rounded="full" px={2} fontSize="10px" fontWeight="700">
                    {cotNumero}
                  </Badge>
                )}
                {clienteNombre && (
                  <Text color="whiteAlpha.700" fontSize="12px">{clienteNombre}</Text>
                )}
              </HStack>
            </VStack>
            <HStack>
              <IconButton size="sm" variant="ghost" color="whiteAlpha.700"
                _hover={{ color: 'white' }} icon={<FiRefreshCw size={15} />}
                aria-label="Desmarcar todo" onClick={limpiar} />
              <IconButton size="sm" variant="ghost" color="whiteAlpha.700"
                _hover={{ color: 'white' }} icon={<FiX size={18} />}
                aria-label="Cerrar" onClick={onClose} />
            </HStack>
          </Flex>

          {/* Barra de progreso */}
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text color="whiteAlpha.700" fontSize="11px">
                {totalMarcados} de {totalProductos} registrados
              </Text>
              <Text color={todosLisros ? '#22c55e' : FY} fontWeight="700" fontSize="11px">
                {pct}%
              </Text>
            </Flex>
            <Progress
              value={pct} size="sm" rounded="full"
              bg="whiteAlpha.200"
              sx={{ '& > div': { background: todosLisros ? '#22c55e' : FY } }} />
          </Box>
        </Box>

        {/* ── Instrucción ── */}
        <Box bg={useColorModeValue('blue.50', 'blue.900')} px={4} py={2} flexShrink={0}>
          <Text fontSize="12px" color={useColorModeValue('blue.700', 'blue.200')}>
            Toca cada producto a medida que lo registras en Siigo. Cuando termines, confirma abajo.
          </Text>
        </Box>

        {/* ── Lista de productos ── */}
        <Box flex={1} overflowY="auto" px={3} py={3}>
          <VStack spacing={2} align="stretch">
            {productosValidos.map(r => (
              <ItemCard
                key={r.id}
                r={r}
                checked={checked.has(r.id)}
                onToggle={() => toggle(r.id)}
                moneda={moneda}
              />
            ))}
          </VStack>
        </Box>

        {/* ── Pie: total + botón confirmar ── */}
        <Box bg={cardBg} borderTop="1px solid" borderColor={useColorModeValue('gray.200', 'whiteAlpha.200')}
          px={4} py={4} flexShrink={0}>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="600" fontSize="14px">Total cotización</Text>
            <Text fontWeight="900" fontSize="18px" color={FY}>
              {money(totalPagar, moneda)}
            </Text>
          </Flex>
          <Button
            w="full" size="lg" rounded="xl" fontWeight="800"
            bg={todosLisros ? '#22c55e' : 'gray.300'}
            color={todosLisros ? 'white' : 'gray.500'}
            _hover={{ bg: todosLisros ? '#16a34a' : 'gray.300' }}
            isDisabled={!todosLisros}
            leftIcon={<FiCheckCircle size={18} />}
            onClick={handleConfirmar}>
            {todosLisros
              ? 'Confirmar — Todo registrado en Siigo'
              : `Faltan ${totalProductos - totalMarcados} producto${totalProductos - totalMarcados !== 1 ? 's' : ''}`}
          </Button>
          {totalMarcados > 0 && !todosLisros && (
            <Text fontSize="11px" color="gray.400" textAlign="center" mt={2}>
              Registra todos los productos antes de confirmar
            </Text>
          )}
        </Box>
      </ModalContent>
    </Modal>
  );
}
