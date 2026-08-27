/**
 * AyudaApp.jsx — botón de ayuda flotante, siempre visible
 * ─────────────────────────────────────────────────────────────────
 * Dos niveles, según lo que la persona necesite en ese momento:
 *   · Lo esencial en 10 segundos (4 pasos y la clave de la empresa).
 *   · Preguntar con sus palabras, o abrir la guía completa en /ayuda.
 *
 * El contenido sale de src/ayuda/guia.js — aquí no se escribe texto
 * de la guía, para que no queden dos versiones distintas.
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Flex, HStack, Stack, Text, Icon, IconButton, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton,
  Button, useDisclosure, useColorModeValue, useMediaQuery, Tabs, TabList, TabPanels,
  Tab, TabPanel, Badge,
} from "@chakra-ui/react";
import {
  FiHelpCircle, FiLock, FiPlus, FiFileText, FiSave, FiShoppingCart,
  FiTool, FiBookOpen, FiPlay, FiMessageCircle,
} from "react-icons/fi";
import AsistenteAyuda from "./AsistenteAyuda";
import { iniciarRecorrido } from "./RecorridoGuiado";

const FY = "#F9BF20";
const DARK = "#3A3A38";

function Paso({ icon, titulo, children }) {
  const cardBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const muted = useColorModeValue("gray.600", "gray.400");
  return (
    <HStack align="start" spacing={3} bg={cardBg} rounded="lg" p={3}>
      <Box bg={FY} rounded="md" p={2} flexShrink={0}>
        <Icon as={icon} color={DARK} boxSize={4} />
      </Box>
      <Box>
        <Text fontWeight="800" fontSize="13px">{titulo}</Text>
        <Text fontSize="12px" color={muted} mt={0.5} lineHeight="1.55">{children}</Text>
      </Box>
    </HStack>
  );
}

export default function AyudaApp() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [esCelular] = useMediaQuery("(max-width: 47.99em)", { ssr: false });
  const [tab, setTab] = useState(0);
  /* En el celular, mientras alguien escribe, el botón flotante estorba:
     se le monta encima a los botones de la lista de productos. Se quita
     solo mientras hay una casilla activa y vuelve al terminar. */
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    const esCampo = (el) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    const entra = (e) => { if (esCampo(e.target)) setEscribiendo(true); };
    const sale = () => setTimeout(() => {
      setEscribiendo(esCampo(document.activeElement));
    }, 80);
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", sale);
    return () => {
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", sale);
    };
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const cardBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.400");

  // En la propia guía el botón sobra
  if (location.pathname === "/ayuda") return null;
  const enCotizador = location.pathname.startsWith("/cotizador");

  const irA = (ruta) => { onClose(); navigate(ruta); };

  return (
    <>
      <Tooltip label="¿Cómo uso esto?" hasArrow placement="left">
        <IconButton
          data-tour="ayuda"
          aria-label="Ayuda: cómo usar la app"
          icon={<FiHelpCircle size={22} />}
          onClick={onOpen}
          position="fixed"
          /* En el celular el cotizador tiene una barra fija abajo (Total,
             Ver, PDF, Guardar). Sin esto, el botón de ayuda se le monta
             encima justo al botón de Guardar. */
          bottom={{ base: enCotizador ? "104px" : 4, md: 6 }}
          right={{ base: 4, md: 6 }}
          display={{ base: escribiendo && !isOpen ? "none" : "inline-flex", md: "inline-flex" }}
          zIndex={500}
          size="lg"
          isRound
          bg={FY}
          color={DARK}
          boxShadow="0 4px 20px rgba(0,0,0,0.25)"
          _hover={{ bg: "#e0b010", transform: "scale(1.05)" }}
          _active={{ bg: "#c99b0c" }}
          sx={{ "@media print": { display: "none" } }}
        />
      </Tooltip>

      {/* En el celular la ventana llega casi de arriba abajo: antes iba
          centrada, con márgenes y encabezado grande, y al chat le
          quedaban 280px — la respuesta salía cortada por la mitad y
          había que rodar dentro de una caja pequeña metida en otra. */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered={!esCelular}
        size={esCelular ? "full" : "lg"} scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent rounded={{ base: 0, md: "2xl" }} overflow="hidden"
          mx={{ base: 0, md: 4 }} my={{ base: 0, md: undefined }}
          h={{ base: "100dvh", md: "auto" }} maxH={{ base: "100dvh", md: "85vh" }}
          display="flex" flexDirection="column">
          <Box bg={DARK} px={{ base: 4, md: 6 }} py={{ base: 3, md: 5 }} flexShrink={0}>
            <Flex align="center" gap={3}>
              <Box bg={FY} rounded="lg" px={3} py={2}>
                <Text fontWeight="900" color={DARK} fontSize="lg" lineHeight="1">FE</Text>
              </Box>
              <Box>
                <Text fontWeight="900" fontSize={{ base: "16px", md: "18px" }} color="white">¿Cómo uso esto?</Text>
                <Text fontSize="12px" color="whiteAlpha.700">
                  Lo esencial, o pregúntame lo que necesites
                </Text>
              </Box>
            </Flex>
          </Box>
          <ModalCloseButton color="white" top={4} />

          <ModalBody bg={cardBg} p={0} flex="1" minH={0} display="flex" flexDirection="column">
            <Tabs index={tab} onChange={setTab} variant="line" colorScheme="yellow" isLazy
              display="flex" flexDirection="column" flex="1" minH={0}>
              <TabList px={5} pt={2} flexShrink={0}>
                <Tab fontSize="13px" fontWeight="700">Lo esencial</Tab>
                <Tab fontSize="13px" fontWeight="700">
                  <HStack spacing={1.5}>
                    <Icon as={FiMessageCircle} boxSize={3.5} />
                    <Text>Preguntar</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels flex="1" minH={0} overflowY="auto">
                {/* ── Lo esencial ── */}
                <TabPanel px={{ base: 4, md: 5 }} py={4}>
                  <Stack spacing={2.5}>
                    <Paso icon={FiLock} titulo="Entrar a la app">
                      Cuando pida una clave, escribe siempre: <b>ferreexpress</b>. Solo se pide
                      una vez por computador.
                    </Paso>
                    <Paso icon={FiFileText} titulo="Ver las cotizaciones">
                      Al abrir la app caes directo en el listado. Ahí se ven, se buscan y se
                      filtran todas. El buscador también encuentra por producto.
                    </Paso>
                    <Paso icon={FiPlus} titulo="Hacer una cotización nueva">
                      Botón amarillo <b>“Nueva cotización”</b>. Va a preguntar si es{" "}
                      <Icon as={FiShoppingCart} boxSize={3} mx="1px" /> <b>Comercial</b> (venta
                      normal) o <Icon as={FiTool} boxSize={3} mx="1px" /> <b>de Obra</b>{" "}
                      (contrato con AIU). Ante la duda: si es una venta de productos, es Comercial.
                    </Paso>
                    <Paso icon={FiSave} titulo="Guardar y sacar el PDF">
                      El botón <b>Guardar</b> le pone el número (COT-032). El botón <b>PDF</b>{" "}
                      descarga el documento — y guarda la cotización de una vez.
                    </Paso>
                  </Stack>

                  <Box bg={useColorModeValue("orange.50", "whiteAlpha.100")} rounded="lg" p={3} mt={3}>
                    <Text fontSize="11.5px" color={muted} lineHeight="1.6">
                      <b>Lo que más confunde:</b> la lista de productos dice “Enter aceptar”, pero
                      en el computador hay que hacerle <b>clic</b> a la sugerencia. Y la etiqueta
                      de color de cada cotización (Borrador, Enviada…) <b>es un menú</b>: se toca
                      para cambiar el estado.
                    </Text>
                  </Box>

                  <Stack spacing={2} mt={4}>
                    <Button w="full" bg={FY} color={DARK} rounded="lg" fontWeight="700"
                      leftIcon={<FiBookOpen />} _hover={{ bg: "#e0b010" }}
                      onClick={() => irA("/ayuda")}>
                      Ver la guía completa paso a paso
                    </Button>
                    <HStack spacing={2}>
                      <Button flex={1} size="sm" variant="outline" colorScheme="gray" rounded="lg"
                        h="42px" leftIcon={<FiPlay />}
                        onClick={() => { onClose(); iniciarRecorrido("inicio"); }}>
                        Ver el tour
                      </Button>
                      <Button flex={1} size="sm" variant="outline" colorScheme="gray" rounded="lg"
                        h="42px" leftIcon={<FiFileText />}
                        onClick={() => irA("/historial")}>
                        Ir al listado
                      </Button>
                    </HStack>
                  </Stack>
                </TabPanel>

                {/* ── Preguntar ── */}
                <TabPanel px={{ base: 3, md: 5 }} py={{ base: 3, md: 4 }}
                  h="full" display="flex" flexDirection="column">
                  <HStack spacing={2} mb={2} flexShrink={0}>
                    <Text fontSize="12px" color={muted}>
                      Escribe con tus palabras qué necesitas hacer.
                    </Text>
                    <Badge colorScheme="green" rounded="full" fontSize="9px">SIN INTERNET</Badge>
                  </HStack>
                  <AsistenteAyuda
                    alto={esCelular ? "calc(100dvh - 230px)" : "360px"}
                    autoFocus
                    onAbrirTema={(id) => { onClose(); navigate(`/ayuda?tema=${id}`); }}
                    onAntesDeGuiar={onClose}
                  />
                  <Button w="full" mt={3} size="sm" variant="outline" colorScheme="gray"
                    rounded="lg" h="42px" flexShrink={0}
                    leftIcon={<FiBookOpen />} onClick={() => irA("/ayuda")}>
                    Abrir la guía completa
                  </Button>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
