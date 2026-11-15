/**
 * ProcesoIndicador.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Muestra el flujo completo de una cotización en 4 pasos:
 *   1. Crear → 2. Completar → 3. Enviar → 4. Seguimiento
 *
 * Se usa en la parte superior del editor para que el vendedor sepa
 * en qué etapa está y qué falta hacer. Los pasos se marcan según
 * el contenido y el estado de la cotización.
 * ─────────────────────────────────────────────────────────────
 */
import {
  HStack, VStack, Box, Text, Circle, Divider, useColorModeValue,
  Flex, Badge, Tooltip,
} from "@chakra-ui/react";
import {
  FiFileText, FiUsers, FiSend, FiCheckCircle,
} from "react-icons/fi";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

const PASOS = [
  {
    id: "crear",
    icono: FiFileText,
    label: "Productos",
    desc: "Agrega al menos un producto",
  },
  {
    id: "cliente",
    icono: FiUsers,
    label: "Cliente",
    desc: "Nombre del cliente listo",
  },
  {
    id: "enviar",
    icono: FiSend,
    label: "Enviar",
    desc: "Envía por WhatsApp o descarga PDF",
  },
  {
    id: "seguimiento",
    icono: FiCheckCircle,
    label: "Seguimiento",
    desc: "Marca el estado: Aceptada o Rechazada",
  },
];

/**
 * Calcula qué pasos están completados:
 *  · crear:       hay al menos 1 producto con descripción
 *  · cliente:     tiene nombre de cliente
 *  · enviar:      estado "enviada", "aceptada" o "rechazada", o hay PDF generado en eventos
 *  · seguimiento: estado "aceptada" o "rechazada"
 */
function calcularPasos({ items = [], cliente = {}, estado = "borrador", eventos = [] }) {
  const tieneProductos = items.some(r => r.desc?.trim());
  const tieneCliente   = !!String(cliente?.nombre || "").trim();
  const fueEnviada     = ["enviada", "aceptada", "rechazada"].includes(estado) ||
    eventos.some(e => ["enviada_whatsapp", "pdf_generado"].includes(e.tipo));
  const fueResuelta    = ["aceptada", "rechazada"].includes(estado) ||
    eventos.some(e => e.tipo === "firmada");

  return {
    crear:       tieneProductos,
    cliente:     tieneCliente,
    enviar:      fueEnviada,
    seguimiento: fueResuelta,
  };
}

function Paso({ paso, hecho, activo, es_ultimo }) {
  const Icono    = paso.icono;
  const circleBg = hecho ? FY : activo ? "white" : useColorModeValue("gray.100", "gray.700");
  const iconColor = hecho ? DARK : activo ? FY : useColorModeValue("gray.400", "gray.500");
  const textColor = hecho || activo
    ? useColorModeValue("gray.800", "gray.100")
    : useColorModeValue("gray.400", "gray.500");
  const lineColor = hecho ? FY : useColorModeValue("gray.200", "gray.600");

  return (
    <Flex align="center" flex={es_ultimo ? "0 0 auto" : "1"} minW={0}>
      <Tooltip label={paso.desc} hasArrow placement="bottom">
        <VStack spacing={1} align="center" flexShrink={0}>
          <Circle
            size="32px"
            bg={circleBg}
            border={activo ? `2px solid ${FY}` : "none"}
            boxShadow={activo ? `0 0 0 3px ${FY}33` : "none"}
            transition="all 0.2s">
            <Icono size={14} color={iconColor} />
          </Circle>
          <Text
            fontSize="10px" fontWeight={hecho || activo ? "700" : "400"}
            color={textColor} whiteSpace="nowrap" lineHeight="1.1" textAlign="center">
            {paso.label}
          </Text>
        </VStack>
      </Tooltip>
      {!es_ultimo && (
        <Box flex="1" h="2px" mx={1} bg={lineColor} transition="background 0.3s" mt="-10px" />
      )}
    </Flex>
  );
}

export default function ProcesoIndicador({ items, cliente, estado, eventos }) {
  const completados = calcularPasos({ items, cliente, estado, eventos });
  const bg = useColorModeValue("white", "gray.800");

  // El paso "activo" es el primero que NO está completado
  const pasoActivo = PASOS.findIndex(p => !completados[p.id]);

  return (
    <Box
      px={4} py={2.5}
      bg={bg}
      borderBottom="1px solid"
      borderColor={useColorModeValue("gray.100", "whiteAlpha.100")}>
      <HStack spacing={0} align="center" justify="center" maxW="480px" mx="auto">
        {PASOS.map((p, i) => (
          <Paso
            key={p.id}
            paso={p}
            hecho={completados[p.id]}
            activo={i === pasoActivo}
            es_ultimo={i === PASOS.length - 1}
          />
        ))}
      </HStack>
    </Box>
  );
}
