/**
 * PlantillasModal.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Modal de dos modos:
 *   modo "usar"   → muestra la lista, clic en una la aplica
 *   modo "guardar" → pide nombre y guarda la cotización actual
 * ─────────────────────────────────────────────────────────────
 */
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, VStack, HStack, Text, Box, Badge, IconButton,
  Divider, useColorModeValue, Flex, useToast, Tooltip,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiTrash2, FiBookmark, FiTool, FiShoppingCart, FiEdit2, FiCheck } from "react-icons/fi";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function PlantillaItem({ p, onUsar, onEliminar, onRenombrar }) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre]   = useState(p.nombre);
  const border  = useColorModeValue("gray.200", "whiteAlpha.200");
  const bgHover = useColorModeValue("yellow.50", "whiteAlpha.50");
  const muted   = useColorModeValue("gray.500", "gray.400");

  const confirmarNombre = () => {
    if (nombre.trim()) onRenombrar(p.id, nombre.trim());
    setEditing(false);
  };

  return (
    <Box
      border="1px solid" borderColor={border} rounded="xl" p={3}
      _hover={{ bg: bgHover, borderColor: FY }} transition="all 0.12s">
      <Flex justify="space-between" align="flex-start" gap={2}>
        <Box flex="1" minW={0} cursor="pointer" onClick={() => !editing && onUsar(p)}>
          {editing ? (
            <HStack>
              <Input
                size="sm" value={nombre} autoFocus rounded="md"
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmarNombre(); if (e.key === "Escape") setEditing(false); }}
              />
              <IconButton size="xs" icon={<FiCheck />} onClick={confirmarNombre} colorScheme="green" rounded="md" />
            </HStack>
          ) : (
            <Text fontWeight="700" fontSize="14px" noOfLines={1}>{p.nombre}</Text>
          )}
          <HStack mt={1} spacing={2} flexWrap="wrap">
            <Badge
              fontSize="9px" px={1.5} rounded="full"
              bg={p.tipo === "obra" ? "#1a5276" : FY}
              color={p.tipo === "obra" ? "white" : DARK}>
              {p.tipo === "obra" ? "Obra" : "Comercial"}
            </Badge>
            <Text fontSize="11px" color={muted}>
              {p.items?.length || 0} ítem{p.items?.length !== 1 ? "s" : ""}
            </Text>
            <Text fontSize="10px" color={muted}>{fmtDate(p.creadaEn)}</Text>
          </HStack>
        </Box>
        <HStack spacing={0} flexShrink={0}>
          <Tooltip label="Renombrar" hasArrow>
            <IconButton size="xs" variant="ghost" icon={<FiEdit2 size={12} />}
              rounded="md" onClick={() => setEditing(true)} />
          </Tooltip>
          <Tooltip label="Eliminar plantilla" hasArrow>
            <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 size={12} />}
              rounded="md" onClick={() => onEliminar(p.id)} />
          </Tooltip>
        </HStack>
      </Flex>
    </Box>
  );
}

export default function PlantillasModal({
  isOpen, onClose,
  /* modo "guardar" */
  mode = "usar",
  onGuardar,
  /* modo "usar" */
  plantillas = [],
  onUsar,
  onEliminar,
  onRenombrar,
}) {
  const [nombre, setNombre] = useState("");
  const [buscando, setBuscando] = useState(false);
  const toast = useToast();
  const bg   = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.500", "gray.400");

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast({ title: "Escribe un nombre para la plantilla", status: "warning", duration: 2500 });
      return;
    }
    setBuscando(true);
    try {
      onGuardar(nombre.trim());
      setNombre("");
      onClose();
      toast({ title: "Plantilla guardada ✓", status: "success", duration: 2000 });
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" bg={bg} mx={4} maxH="80vh">
        <Box bg={DARK} px={6} py={4} roundedTop="2xl">
          <HStack spacing={2}>
            <FiBookmark color={FY} size={16} />
            <Text fontWeight="900" fontSize="16px" color="white">
              {mode === "guardar" ? "Guardar como plantilla" : "Mis plantillas"}
            </Text>
          </HStack>
          <Text fontSize="11px" color="whiteAlpha.600" mt={1}>
            {mode === "guardar"
              ? "Guarda esta cotización como base para futuras. Los ítems y la config se conservan; el cliente y el número no."
              : "Selecciona una plantilla para cargarla en la cotización actual."}
          </Text>
        </Box>

        <ModalBody p={4}>
          {mode === "guardar" ? (
            <VStack spacing={3} align="stretch">
              <Text fontSize="13px" fontWeight="600">Nombre de la plantilla</Text>
              <Input
                placeholder="Ej: Kit básico de electricidad, Baño estándar…"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuardar()}
                autoFocus rounded="lg" size="md"
              />
            </VStack>
          ) : (
            <VStack spacing={2} align="stretch">
              {plantillas.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <FiBookmark size={32} color="#ccc" style={{ margin: "0 auto 8px" }} />
                  <Text color={muted} fontSize="14px" fontWeight="500">Sin plantillas guardadas</Text>
                  <Text color={muted} fontSize="12px" mt={1}>
                    Cuando tengas una cotización lista, usa "Guardar como plantilla" para reutilizarla.
                  </Text>
                </Box>
              ) : (
                plantillas.map(p => (
                  <PlantillaItem
                    key={p.id} p={p}
                    onUsar={onUsar}
                    onEliminar={onEliminar}
                    onRenombrar={onRenombrar}
                  />
                ))
              )}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={useColorModeValue("gray.100", "whiteAlpha.100")} gap={2}>
          <Button variant="ghost" colorScheme="gray" onClick={onClose} rounded="lg">Cancelar</Button>
          {mode === "guardar" && (
            <Button
              bg={DARK} color={FY} rounded="lg" fontWeight="700"
              isLoading={buscando} onClick={handleGuardar}
              _hover={{ bg: "#2a2a28" }}>
              Guardar plantilla
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
