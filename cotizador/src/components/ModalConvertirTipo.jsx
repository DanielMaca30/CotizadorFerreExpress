/**
 * ModalConvertirTipo.jsx — pasar de Comercial a Obra (y al revés)
 * ─────────────────────────────────────────────────────────────────
 * REGLA: los precios de los productos NO se modifican. El precio digitado
 * siempre lleva el IVA incluido y sigue siendo el mismo número; lo único
 * que cambia es cómo se calcula el total:
 *
 *   Comercial → el IVA se discrimina del precio
 *   Obra      → AIU sobre el costo directo + IVA 19 % solo sobre la utilidad
 *
 * Por eso el modal muestra el total actual contra el resultante: en obra
 * el AIU se suma encima, así que el total sube aunque los precios sean
 * idénticos. Los % de AIU se pueden ajustar aquí mismo (ponerlos en 0
 * deja el total prácticamente igual).
 */
import { useMemo, useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, Text, Box, Flex, HStack, Stack, Icon, Badge,
  Input, Divider, Alert, AlertIcon, useColorModeValue,
} from "@chakra-ui/react";
import { FiArrowRight, FiTool, FiShoppingCart, FiAlertTriangle } from "react-icons/fi";
import {
  money, calcTotalsPorTipo, convertirTipo, notasSonPersonalizadas, DEFAULT_AIU,
} from "../utils";

const FY   = "#F9BF20";
const DARK = "#3A3A38";
const AZUL = "#1a5276";

function Chip({ esObra, children }) {
  return (
    <Badge bg={esObra ? "blue.100" : "green.100"} color={esObra ? "blue.700" : "green.700"}
      rounded="full" px={2.5} py={1} fontSize="10px" fontWeight="800">
      <HStack spacing={1}>
        <Icon as={esObra ? FiTool : FiShoppingCart} boxSize={3} />
        <Text>{children}</Text>
      </HStack>
    </Badge>
  );
}

export default function ModalConvertirTipo({
  isOpen, onClose, onConfirm,
  cotConfig = {}, aiuConfig, notas = "", items = [], descG = 0,
}) {
  const tipoActual  = cotConfig.tipo === "obra" ? "obra" : "comercial";
  const tipoDestino = tipoActual === "obra" ? "comercial" : "obra";
  const destinoEsObra = tipoDestino === "obra";

  /* AIU editable dentro del modal (solo importa si el destino es obra).
     Arranca en CERO: convertir a obra no debe mover el total — es el mismo
     precio, solo que sin discriminar IVA. Si este trabajo concreto lleva
     administración o utilidad, se escriben aquí y el total lo recoge al vuelo.
     Quien usa el modal lo monta solo al abrirlo, así que el estado nace fresco
     en cada apertura sin necesidad de resetearlo a mano. */
  const [aiu, setAiu] = useState(() => ({ ...DEFAULT_AIU, ...(aiuConfig || {}) }));

  const cardBg    = useColorModeValue("gray.50", "gray.700");
  const border    = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted     = useColorModeValue("gray.600", "gray.400");
  const inputBg   = useColorModeValue("white", "gray.700");
  const destacaBg = useColorModeValue("yellow.50", "whiteAlpha.100");

  const totalActual = useMemo(
    () => calcTotalsPorTipo(tipoActual, items, descG, { iva: cotConfig.iva, aiu: aiuConfig }).totalPagar,
    [tipoActual, items, descG, cotConfig.iva, aiuConfig]
  );

  const totalNuevo = useMemo(
    () => calcTotalsPorTipo(tipoDestino, items, descG, { iva: cotConfig.iva, aiu }).totalPagar,
    [tipoDestino, items, descG, cotConfig.iva, aiu]
  );

  const delta   = totalNuevo - totalActual;
  const pct     = totalActual ? (delta / totalActual) * 100 : 0;
  const notasCustom = notasSonPersonalizadas(notas);
  const moneda  = cotConfig.moneda || "COP";

  const A = (k) => ({
    value: aiu[k] ?? 0,
    onChange: (e) => setAiu((p) => ({
      ...p, [k]: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
    })),
  });

  const confirmar = () => {
    onConfirm(convertirTipo(tipoDestino, {
      config: cotConfig,
      aiuConfig: aiu,
      notas,
      items,
    }));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent rounded="xl">
        <ModalHeader fontSize="16px" fontWeight="900" pb={2}>
          Convertir cotización
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Stack spacing={4}>
            {/* De → a */}
            <Flex align="center" justify="center" gap={3} py={1}>
              <Chip esObra={tipoActual === "obra"}>
                {tipoActual === "obra" ? "OBRA" : "COMERCIAL"}
              </Chip>
              <Icon as={FiArrowRight} color={muted} />
              <Chip esObra={destinoEsObra}>
                {destinoEsObra ? "OBRA" : "COMERCIAL"}
              </Chip>
            </Flex>

            <Alert status="info" rounded="lg" fontSize="12px" py={2}>
              <AlertIcon boxSize={4} />
              <Text>
                Los precios de los productos <strong>no se modifican</strong>. Lo único que
                cambia es el cálculo del total:{" "}
                {destinoEsObra
                  ? "en obra se aplica el AIU y el IVA del 19 % solo sobre la utilidad."
                  : "en comercial el IVA va discriminado dentro del precio."}
              </Text>
            </Alert>

            {/* AIU editable */}
            {destinoEsObra && (
              <Box bg={cardBg} border="1px solid" borderColor={border} rounded="lg" p={3}>
                <Text fontSize="9px" fontWeight="800" letterSpacing="wider"
                  textTransform="uppercase" color={AZUL} mb={2}>
                  AIU — opcional, se suma sobre el costo directo
                </Text>
                <Flex gap={2}>
                  {[["admin", "Admin. %"], ["imprevistos", "Imprev. %"], ["utilidad", "Utilidad %"], ["anticipo", "Anticipo %"]]
                    .map(([k, label]) => (
                      <Box key={k} flex={1}>
                        <Text fontSize="9px" fontWeight="700" color={muted} mb={1}>{label}</Text>
                        <Input size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
                          type="number" min="0" max="100" step="0.5" {...A(k)} />
                      </Box>
                    ))}
                </Flex>
                <Text fontSize="10px" color={muted} mt={2}>
                  En 0 el total no cambia. Lo que pongas aquí se suma y aparece en el PDF.
                </Text>
              </Box>
            )}

            <Divider />

            {/* Comparativa de totales */}
            <Box>
              <Text fontSize="9px" fontWeight="800" letterSpacing="0.12em"
                textTransform="uppercase" color={muted} mb={2}>
                Impacto en el total
              </Text>
              <Flex gap={3}>
                <Box flex={1} bg={cardBg} rounded="lg" p={3} border="1px solid" borderColor={border}>
                  <Text fontSize="9px" color={muted} fontWeight="700" mb={1}>AHORA</Text>
                  <Text fontSize="15px" fontWeight="800" fontVariantNumeric="tabular-nums">
                    {money(totalActual, moneda)}
                  </Text>
                </Box>
                <Flex align="center"><Icon as={FiArrowRight} color={muted} /></Flex>
                <Box flex={1} rounded="lg" p={3} border="2px solid" borderColor={FY} bg={destacaBg}>
                  <Text fontSize="9px" color={muted} fontWeight="700" mb={1}>DESPUÉS</Text>
                  <Text fontSize="15px" fontWeight="900" fontVariantNumeric="tabular-nums">
                    {money(totalNuevo, moneda)}
                  </Text>
                </Box>
              </Flex>
              {Math.abs(delta) >= 1 && (
                <Text fontSize="11px" fontWeight="700" mt={2}
                  color={delta > 0 ? "orange.500" : "green.500"}>
                  {delta > 0 ? "▲ Sube " : "▼ Baja "}
                  {money(Math.abs(delta), moneda)} ({Math.abs(pct).toFixed(1)} %)
                </Text>
              )}
            </Box>

            {notasCustom && (
              <Alert status="warning" rounded="lg" fontSize="12px" py={2}>
                <Icon as={FiAlertTriangle} mr={2} />
                <Text>
                  Tus notas personalizadas <strong>se conservan</strong> tal cual. Si quieres las
                  notas estándar de {destinoEsObra ? "obra" : "comercial"}, edítalas después.
                </Text>
              </Alert>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter gap={2}>
          <Button size="sm" variant="ghost" rounded="md" onClick={onClose}>Cancelar</Button>
          <Button size="sm" rounded="md" fontWeight="700"
            bg={destinoEsObra ? AZUL : FY}
            color={destinoEsObra ? "white" : DARK}
            _hover={{ opacity: 0.85 }}
            onClick={confirmar}>
            Convertir a {destinoEsObra ? "Obra" : "Comercial"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
