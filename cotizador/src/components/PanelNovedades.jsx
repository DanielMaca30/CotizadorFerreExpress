/**
 * PanelNovedades.jsx — "Lo nuevo" después de cada actualización
 * ─────────────────────────────────────────────────────────────────
 * Sale SOLO, una vez por equipo, cuando hay una versión que ese equipo no
 * ha visto (ver src/ayuda/novedades.js). Se cierra con un toque y no
 * vuelve hasta la siguiente actualización. Se puede releer desde Ayuda.
 *
 * Reglas para que no estorbe:
 *  · Quien entra por primera vez no lo ve: le toca el recorrido de
 *    bienvenida, y para esa persona todo es nuevo.
 *  · No se abre encima del cotizador (ahí hay modales y trabajo a medias):
 *    espera a que la persona esté en el listado, clientes, perfil o ayuda.
 *  · En el celular sube desde abajo, al alcance del pulgar; en el
 *    computador va centrado.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Box, Flex, Stack, Text, Button, Icon, Modal, ModalOverlay, ModalContent,
  ModalBody, ModalFooter, ModalCloseButton, useColorModeValue, useMediaQuery,
} from "@chakra-ui/react";
import {
  FiFileText, FiUser, FiCheckCircle, FiSmartphone, FiGrid, FiStar,
  FiZap, FiPrinter, FiSearch, FiShield,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  NOVEDADES, pendientes, marcarVisto, EVENTO_NOVEDADES,
} from "../ayuda/novedades";

const FY = "#F9BF20";
const DARK = "#3A3A38";
const VISTO_TOUR_KEY = "ferreexpress_tour_visto_v1";

/* Nombres cortos para usar en novedades.js */
const ICONOS = {
  factura: FiFileText, cliente: FiUser, guardado: FiCheckCircle,
  celular: FiSmartphone, tabla: FiGrid, nuevo: FiStar, rapido: FiZap,
  imprimir: FiPrinter, buscar: FiSearch, seguridad: FiShield, whatsapp: FaWhatsapp,
};

const tourVisto = () => {
  try { return localStorage.getItem(VISTO_TOUR_KEY) === "1"; } catch { return true; }
};

/* Pantallas donde puede abrirse solo (fuera del cotizador) */
const RUTAS_OK = ["/historial", "/clientes", "/perfil", "/ayuda", "/cliente/"];

function Punto({ p, n }) {
  const cardBg = useColorModeValue("white", "whiteAlpha.50");
  const borde = useColorModeValue("gray.100", "whiteAlpha.100");
  const muted = useColorModeValue("gray.600", "gray.400");
  return (
    <Flex gap={3} bg={cardBg} border="1px solid" borderColor={borde} rounded="xl" p={3.5}
      boxShadow="0 1px 2px rgba(0,0,0,0.04)"
      sx={{ animation: `novEntra .38s ease-out ${0.08 + n * 0.06}s both` }}>
      <Flex bg={FY} rounded="lg" w="38px" h="38px" align="center" justify="center" flexShrink={0}>
        <Icon as={ICONOS[p.icono] || FiStar} color={DARK} boxSize="18px" />
      </Flex>
      <Box minW={0}>
        <Text fontWeight="800" fontSize="14px" lineHeight="1.3">{p.titulo}</Text>
        <Text fontSize="13px" color={muted} mt={1} lineHeight="1.5">{p.texto}</Text>
      </Box>
    </Flex>
  );
}

export default function PanelNovedades() {
  const { pathname } = useLocation();
  const [esCelular] = useMediaQuery("(max-width: 47.99em)", { ssr: false });
  const [abierto, setAbierto] = useState(false);
  /* Lo que se muestra: las versiones no vistas, o la última si se abrió a mano */
  const [lista, setLista] = useState([]);
  /* El foco va al botón principal, no a la X (que salía con un recuadro azul) */
  const botonRef = useRef(null);

  const bodyBg = useColorModeValue("gray.50", "gray.800");
  const footBg = useColorModeValue("white", "gray.800");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.500", "gray.400");

  /* Apertura automática: una vez por equipo y por versión */
  useEffect(() => {
    if (abierto) return;
    if (!RUTAS_OK.some((r) => pathname.startsWith(r))) return;
    const faltan = pendientes();
    if (!faltan.length) return;
    /* Equipo nuevo: no hay "novedades" para quien nunca usó la app */
    if (!tourVisto()) { marcarVisto(); return; }
    const t = setTimeout(() => { setLista(faltan); setAbierto(true); }, 900);
    return () => clearTimeout(t);
  }, [pathname, abierto]);

  /* Apertura a mano (botón "Novedades" en Ayuda) */
  useEffect(() => {
    const h = () => { setLista(NOVEDADES.slice(0, 1)); setAbierto(true); };
    window.addEventListener(EVENTO_NOVEDADES, h);
    return () => window.removeEventListener(EVENTO_NOVEDADES, h);
  }, []);

  const cerrar = useCallback(() => { marcarVisto(); setAbierto(false); }, []);

  if (!lista.length) return null;
  const principal = lista[0];
  const totalPuntos = lista.reduce((a, v) => a + v.puntos.length, 0);

  return (
    <Modal isOpen={abierto} onClose={cerrar} size={esCelular ? "full" : "lg"}
      isCentered={!esCelular} scrollBehavior="inside" initialFocusRef={botonRef}
      motionPreset={esCelular ? "slideInBottom" : "scale"}>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
      <ModalContent
        rounded={esCelular ? "0" : "2xl"} roundedTop="2xl" overflow="hidden"
        /* En el celular: hoja que sube desde abajo, sin tapar toda la pantalla */
        {...(esCelular ? { mt: "auto", mb: 0, maxH: "88dvh", minH: "auto", h: "auto" } : { mx: 4 })}
        sx={{
          "@keyframes novEntra": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "none" },
          },
        }}>
        {/* Cabecera */}
        <Box bg={DARK} color="white" px={5} pt={esCelular ? 3 : 6} pb={5} position="relative" flexShrink={0}
          overflow="hidden">
          {esCelular && <Box w="40px" h="4px" bg="whiteAlpha.400" rounded="full" mx="auto" mb={4} />}
          {/* Brillo decorativo */}
          <Box position="absolute" right="-40px" top="-40px" w="160px" h="160px" rounded="full"
            bg={FY} opacity={0.12} />
          <ModalCloseButton color="whiteAlpha.700" top={esCelular ? 4 : 3} aria-label="Cerrar novedades" />
          <Flex align="center" gap={2} mb={2}>
            <Icon as={FiStar} color={FY} boxSize="14px" />
            <Text fontSize="10px" fontWeight="800" letterSpacing="0.16em" textTransform="uppercase" color={FY}>
              Novedades de la app
            </Text>
          </Flex>
          <Text fontSize={esCelular ? "22px" : "24px"} fontWeight="900" lineHeight="1.15" pr={8}>
            {principal.titulo}
          </Text>
          <Text fontSize="12px" color="whiteAlpha.700" mt={1.5}>
            {principal.fecha} · {totalPuntos} {totalPuntos === 1 ? "cambio" : "cambios"} para ti
          </Text>
        </Box>

        <ModalBody bg={bodyBg} px={4} py={4}>
          <Stack spacing={5}>
            {lista.map((v, iv) => (
              <Box key={v.id}>
                {iv > 0 && (
                  <Text fontSize="10px" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase"
                    color={muted} mb={2} px={1}>
                    Antes · {v.fecha} · {v.titulo}
                  </Text>
                )}
                <Stack spacing={2.5}>
                  {v.puntos.map((p, i) => <Punto key={i} p={p} n={i} />)}
                </Stack>
              </Box>
            ))}
          </Stack>
        </ModalBody>

        <ModalFooter bg={footBg} borderTop="1px solid" borderColor={borde} px={4} py={3}
          pb={esCelular ? "calc(12px + env(safe-area-inset-bottom))" : 3} flexDirection="column" gap={1.5}>
          <Button ref={botonRef} w="full" size="lg" bg={FY} _focusVisible={{ boxShadow: "0 0 0 3px rgba(58,58,56,0.25)" }} color={DARK} fontWeight="800" rounded="xl"
            _hover={{ bg: "#e0b010" }} _active={{ bg: "#c99b0c" }} onClick={cerrar}>
            ¡Entendido!
          </Button>
          <Text fontSize="10.5px" color={muted} textAlign="center">
            Puedes volver a verlas en Ayuda → Novedades
          </Text>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
