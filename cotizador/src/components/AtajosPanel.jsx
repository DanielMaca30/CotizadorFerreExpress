/**
 * AtajosPanel.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Panel de atajos de teclado (se activa con la tecla "?").
 * Categorizado por sección para que sea rápido encontrarlos.
 * ─────────────────────────────────────────────────────────────
 */
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Box, Grid, GridItem, Text, Kbd, HStack, VStack, useColorModeValue, Badge,
} from "@chakra-ui/react";
import { FiCommand } from "react-icons/fi";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const SECCIONES = [
  {
    titulo: "Tabla de productos",
    color: "blue",
    atajos: [
      { teclas: ["Tab"], desc: "Avanzar al siguiente campo" },
      { teclas: ["Shift", "Tab"], desc: "Retroceder al campo anterior" },
      { teclas: ["↑", "↓"], desc: "Subir / Bajar de fila" },
      { teclas: ["Enter"], desc: "Siguiente campo o nueva fila al final" },
      { teclas: ["Ctrl", "Enter"], desc: "Agregar nueva fila vacía" },
      { teclas: ["Ctrl", "D"], desc: "Duplicar la fila actual" },
      { teclas: ["Supr"], desc: "Eliminar fila vacía" },
      { teclas: ["Ctrl", "V"], desc: "Pegar desde Excel / Google Sheets" },
    ],
  },
  {
    titulo: "Guardar y navegar",
    color: "green",
    atajos: [
      { teclas: ["Ctrl", "S"], desc: "Guardar cotización" },
      { teclas: ["Ctrl", "Z"], desc: "Deshacer último cambio" },
      { teclas: ["Ctrl", "Shift", "Z"], desc: "Rehacer" },
    ],
  },
  {
    titulo: "Desde la lista (historial)",
    color: "purple",
    atajos: [
      { teclas: ["F5"], desc: "Sincronizar con la nube" },
    ],
  },
  {
    titulo: "Global",
    color: "orange",
    atajos: [
      { teclas: ["?"], desc: "Mostrar / ocultar este panel" },
      { teclas: ["Esc"], desc: "Cerrar modal o menú activo" },
    ],
  },
];

function AtajoRow({ teclas, desc }) {
  const textColor = useColorModeValue("gray.700", "gray.200");
  const linea = useColorModeValue("gray.50", "whiteAlpha.50");
  const kbdBg = useColorModeValue("gray.100", "gray.700");
  return (
    <HStack justify="space-between" spacing={3} py={1.5}
      borderBottom="1px solid" borderColor={linea}>
      <Text fontSize="13px" color={textColor} flex="1">{desc}</Text>
      <HStack spacing={1} flexShrink={0}>
        {teclas.map((t, i) => (
          <HStack key={i} spacing={0.5}>
            {i > 0 && <Text fontSize="11px" color="gray.400">+</Text>}
            <Kbd fontSize="11px" bg={kbdBg} rounded="md" px={1.5}>
              {t}
            </Kbd>
          </HStack>
        ))}
      </HStack>
    </HStack>
  );
}

export default function AtajosPanel({ isOpen, onClose }) {
  const bg       = useColorModeValue("white", "gray.800");
  const borde    = useColorModeValue("gray.100", "whiteAlpha.100");
  const consejoBg = useColorModeValue("yellow.50", "yellow.900");
  const headerBg = DARK;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" bg={bg} mx={4} maxH="85vh">
        <Box bg={headerBg} px={6} py={4} roundedTop="2xl">
          <HStack spacing={2}>
            <FiCommand color={FY} size={16} />
            <Text fontWeight="900" fontSize="16px" color="white">Atajos de teclado</Text>
            <Badge bg={FY} color={DARK} rounded="full" px={2} fontSize="10px">?</Badge>
          </HStack>
          <Text fontSize="11px" color="whiteAlpha.600" mt={1}>
            Presiona "?" en cualquier momento para ver este panel
          </Text>
        </Box>
        <ModalCloseButton color="white" top={4} right={4} />

        <ModalBody p={4} overflowY="auto">
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            {SECCIONES.map((sec) => (
              <GridItem key={sec.titulo}>
                <Box
                  border="1px solid"
                  borderColor={borde}
                  rounded="xl" p={3}>
                  <HStack mb={2}>
                    <Badge colorScheme={sec.color} rounded="full" fontSize="9px" px={2}>
                      {sec.titulo}
                    </Badge>
                  </HStack>
                  <VStack spacing={0} align="stretch">
                    {sec.atajos.map((a, i) => (
                      <AtajoRow key={i} teclas={a.teclas} desc={a.desc} />
                    ))}
                  </VStack>
                </Box>
              </GridItem>
            ))}
          </Grid>

          {/* Consejo extra */}
          <Box mt={4} p={3} bg={consejoBg}
            rounded="xl" borderLeft="4px solid" borderColor={FY}>
            <Text fontSize="12px" fontWeight="600">💡 Consejo</Text>
            <Text fontSize="12px" mt={1}>
              Pega directamente desde Excel con <Kbd fontSize="10px">Ctrl+V</Kbd> cuando el cursor
              esté en la tabla — se detectan las columnas automáticamente.
            </Text>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
