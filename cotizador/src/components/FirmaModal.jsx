/**
 * FirmaModal.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Modal para capturar la firma del cliente directamente en pantalla.
 * Sin librerías externas: usa canvas nativo con eventos de pointer.
 * El cliente firma en el celular del vendedor (o en tablet).
 * La firma se guarda como PNG en base64 dentro de la cotización.
 * ─────────────────────────────────────────────────────────────
 */
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Box, Text, HStack, VStack, Badge, Flex, useColorModeValue,
} from "@chakra-ui/react";
import { useRef, useState, useCallback } from "react";
import { todayISO } from "../utils";
import { FiRotateCcw, FiCheck, FiX } from "react-icons/fi";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

export default function FirmaModal({ isOpen, onClose, onGuardar, firmante = "", cotNumero = "" }) {
  const canvasRef   = useRef(null);
  const drawingRef  = useRef(false);
  const lastRef     = useRef({ x: 0, y: 0 });
  const [trazos, setTrazos] = useState(0); // cuenta movimientos para detectar si está en blanco
  const bg       = useColorModeValue("white", "gray.800");
  const notaC    = useColorModeValue("gray.400", "gray.500");
  const bordeC   = useColorModeValue("gray.100", "whiteAlpha.100");

  /* Al abrir se empieza en blanco */
  const [abiertoAntes, setAbiertoAntes] = useState(isOpen);
  if (abiertoAntes !== isOpen) {
    setAbiertoAntes(isOpen);
    if (isOpen) setTrazos(0);
  }

  /* El lienzo se prepara apenas aparece en pantalla. Antes se hacía en un
     efecto que a veces corría antes de que la ventana dibujara el lienzo,
     y la firma quedaba sobre fondo transparente. */
  const prepararLienzo = useCallback((canvas) => {
    canvasRef.current = canvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  /* Helpers para obtener coordenadas (mouse y touch) */
  const getXY = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const { x, y } = getXY(e, canvas);
    lastRef.current = { x, y };
    // Punto si no se mueve
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = DARK;
    ctx.fill();
  }, []);

  const draw = useCallback((e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getXY(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastRef.current = { x, y };
    setTrazos(t => t + 1);
  }, []);

  const stopDraw = useCallback(() => { drawingRef.current = false; }, []);

  const limpiar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTrazos(0);
  }, []);

  const confirmar = useCallback(() => {
    if (trazos < 3) return; // canvas vacío
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    onGuardar({ dataURL, firmante, fecha: todayISO() });
    onClose();
  }, [trazos, firmante, onGuardar, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="2xl" bg={bg} mx={4}>
        <Box bg={DARK} px={6} py={4} roundedTop="2xl">
          <Text fontWeight="900" fontSize="16px" color="white">Firma del cliente</Text>
          <Text fontSize="11px" color="whiteAlpha.600" mt={1}>
            {cotNumero && <Badge mr={2} bg={FY} color={DARK} rounded="full" px={2}>{cotNumero}</Badge>}
            {firmante ? `${firmante} · ` : ""}
            Firme con el dedo o con el cursor en el recuadro
          </Text>
        </Box>

        <ModalBody p={4}>
          <VStack spacing={3}>
            {/* Línea guía debajo del canvas */}
            <Box w="full" position="relative">
              <canvas
                ref={prepararLienzo}
                width={560}
                height={200}
                style={{
                  width: "100%",
                  height: "180px",
                  borderRadius: "12px",
                  background: "#ffffff",
                  border: `2px solid ${trazos > 0 ? FY : "#ddd"}`,
                  touchAction: "none",
                  cursor: "crosshair",
                  display: "block",
                }}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={stopDraw}
                onPointerLeave={stopDraw}
              />
              {/* Línea guía */}
              <Box position="absolute" bottom="30px" left="12px" right="12px"
                h="1px" bg="gray.200" pointerEvents="none" />
              {trazos === 0 && (
                <Text position="absolute" top="50%" left="50%" transform="translate(-50%,-50%)"
                  color="gray.300" fontSize="14px" fontWeight="500" pointerEvents="none" userSelect="none">
                  Firme aquí →
                </Text>
              )}
            </Box>
            <Text fontSize="11px" color={notaC} textAlign="center">
              Al firmar, el cliente acepta la cotización {cotNumero} en sus términos.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={bordeC} gap={2} flexWrap="wrap">
          <Button variant="ghost" colorScheme="gray" leftIcon={<FiX />} onClick={onClose} rounded="lg">
            Cancelar
          </Button>
          <Button variant="outline" colorScheme="gray" leftIcon={<FiRotateCcw />}
            onClick={limpiar} rounded="lg" isDisabled={trazos === 0}>
            Borrar
          </Button>
          <Button bg={DARK} color={FY} rounded="lg" fontWeight="700" leftIcon={<FiCheck />}
            isDisabled={trazos < 3} _hover={{ bg: "#2a2a28" }} onClick={confirmar}>
            Confirmar firma
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
