/**
 * PerfilPage.jsx — Mi perfil
 * ─────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE: los datos de la empresa (nombre, NIT, dirección, logo)
 * vivían dentro del cotizador, en la primera pestaña. Eso tenía dos
 * problemas. Uno de forma: son los mismos siempre, no cambian de una
 * cotización a otra, y ocupaban el primer lugar de un formulario donde lo
 * urgente es el cliente y los productos. Otro de fondo: quien abría el
 * cotizador para atender rápido veía primero el membrete de la ferretería
 * — información que ya conoce — antes que la casilla donde tiene que
 * escribir. Ahora están donde uno los busca: en su perfil, se llenan una
 * vez y se ven en todas las cotizaciones.
 *
 * La vista previa de la derecha no es adorno: es exactamente el encabezado
 * que va a salir impreso. Sin ella hay que guardar, hacer un PDF y abrirlo
 * para saber si el logo quedó bien.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Stack, Text, Icon, Button, IconButton,
  Input, SimpleGrid, useColorModeValue, useToast, Divider, Tag,
} from "@chakra-ui/react";
import {
  FiArrowLeft, FiUpload, FiTrash2, FiCheck, FiHome, FiCloud,
  FiRotateCcw,
} from "react-icons/fi";
import AppLogo from "../components/AppLogo";
import { TABS_BAR_H } from "../components/TabsBar";
import { useCotizaciones } from "../hooks/useCotizaciones";
import {
  loadEmpresaLocal, saveEmpresaLocal, DEFAULT_EMPRESA, AVISO_LATERAL,
} from "../utils";
import { nubeActiva, pullEmpresa, pushEmpresaDebounced } from "../lib/nube";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

/* Los campos, en el orden en que salen impresos en el membrete */
const CAMPOS = {
  nombre: { etq: "Nombre de la empresa", ph: "FerreExpress S.A.S." },
  nit:    { etq: "NIT",                  ph: "805.030.111-8" },
  ciudad: { etq: "Ciudad",               ph: "Cali, Colombia" },
  dir:    { etq: "Dirección",            ph: "Calle 16 #76-28" },
  tel:    { etq: "Teléfono / WhatsApp",  ph: "+57 302 804 3116" },
  correo: { etq: "Correo",               ph: "correo@empresa.com" },
};
const FILAS = [["nombre"], ["nit", "ciudad"], ["dir"], ["tel", "correo"]];

function Etiqueta({ children }) {
  const muted = useColorModeValue("gray.500", "gray.400");
  return (
    <Text fontSize="10px" fontWeight="800" letterSpacing="0.08em"
      textTransform="uppercase" color={muted} mb={1}>{children}</Text>
  );
}

export default function PerfilPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const logoRef = useRef();
  const { tabs } = useCotizaciones();
  const topOffset = tabs.length ? TABS_BAR_H : 0;

  const bg      = useColorModeValue("gray.50", "gray.900");
  const barBg   = useColorModeValue("white", "gray.800");
  const cardBg  = useColorModeValue("white", "gray.800");
  const border  = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "whiteAlpha.50");
  const muted   = useColorModeValue("gray.500", "gray.400");
  const zonaBg  = useColorModeValue("gray.50", "blackAlpha.300");

  const [empresa, setEmpresa] = useState(() => loadEmpresaLocal());
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    document.title = "Mi perfil | FerreExpress";
    return () => { document.title = "FerreExpress — Cotizador"; };
  }, []);

  /* Si otra computadora cambió el membrete, traerlo */
  useEffect(() => {
    if (!nubeActiva()) return;
    pullEmpresa().then((remoto) => {
      if (remoto && Object.keys(remoto).length) {
        setEmpresa((prev) => ({ ...prev, ...remoto }));
      }
    }).catch(() => { /* sin conexión: se sigue con lo local */ });
  }, []);

  /* Se guarda solo, con cada tecla. No hay botón "Guardar" porque no hay
     nada que confirmar: son datos propios, y un botón olvidado significa
     una cotización impresa con el membrete viejo. */
  const cambiar = useCallback((k, v) => {
    setEmpresa((prev) => {
      const next = { ...prev, [k]: v };
      saveEmpresaLocal(next);
      pushEmpresaDebounced(next);
      return next;
    });
    setGuardado(true);
  }, []);

  useEffect(() => {
    if (!guardado) return;
    const t = setTimeout(() => setGuardado(false), 1800);
    return () => clearTimeout(t);
  }, [guardado, empresa]);

  const subirLogo = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "El logo pesa demasiado",
        description: "Máximo 2 MB. Puedes reducirlo desde la galería del celular.",
        status: "warning", duration: 4000, ...AVISO_LATERAL,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      cambiar("logo", ev.target.result);
      toast({ title: "Logo actualizado ✓", status: "success", duration: 2000, ...AVISO_LATERAL });
    };
    reader.readAsDataURL(file);
  }, [cambiar, toast]);

  const quitarLogo = useCallback(() => {
    cambiar("logo", "");
    toast({ title: "Logo quitado", status: "info", duration: 2000, ...AVISO_LATERAL });
  }, [cambiar, toast]);

  const restaurar = useCallback(() => {
    setEmpresa(DEFAULT_EMPRESA);
    saveEmpresaLocal(DEFAULT_EMPRESA);
    pushEmpresaDebounced(DEFAULT_EMPRESA);
    toast({ title: "Datos restaurados", status: "info", duration: 2500, ...AVISO_LATERAL });
  }, [toast]);

  return (
    <Box minH="100vh" bg={bg}>
      <input ref={logoRef} type="file" accept="image/*"
        style={{ display: "none" }} onChange={subirLogo} />

      {/* Barra de arriba */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={border}
        position="sticky" top={topOffset} zIndex={100}>
        <Flex maxW="1000px" mx="auto" px={{ base: 3, md: 6 }}
          h={{ base: "52px", md: "54px" }} align="center" justify="space-between" gap={2}>
          <HStack spacing={2} minW={0}>
            <IconButton size="sm" variant="ghost" rounded="md" aria-label="Volver"
              icon={<FiArrowLeft />} onClick={() => navigate(-1)} />
            <Icon as={FiHome} color={FY} boxSize={4} />
            <Text fontWeight="800" fontSize={{ base: "14px", md: "15px" }} noOfLines={1}>
              Mi perfil
            </Text>
          </HStack>
          {guardado && (
            <Tag size="sm" colorScheme="green" rounded="full">
              <Icon as={FiCheck} boxSize={3} mr={1} />Guardado
            </Tag>
          )}
        </Flex>
      </Box>

      <Box maxW="1000px" mx="auto" px={{ base: 3, md: 6 }} py={{ base: 4, md: 6 }}>
        <Text fontSize="13px" color={muted} mb={4}>
          Estos datos salen en el encabezado de todas las cotizaciones. Se
          escriben una sola vez y se guardan solos.
        </Text>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, lg: 5 }} alignItems="start">

          {/* ── Los datos ── */}
          <Box bg={cardBg} border="1px solid" borderColor={border} rounded="xl"
            p={{ base: 4, md: 5 }} boxShadow="0 2px 12px rgba(0,0,0,0.06)">

            {/* Logo */}
            <Box bg={zonaBg} border="1.5px dashed" borderColor={border}
              rounded="lg" p={4} textAlign="center" mb={5}>
              <Flex justify="center" mb={3} minH="56px" align="center">
                <AppLogo src={empresa.logo} h="56px" />
              </Flex>
              <HStack justify="center" spacing={2}>
                <Button size="sm" variant="outline" colorScheme="gray" rounded="md" h="40px"
                  leftIcon={<FiUpload size={13} />} onClick={() => logoRef.current?.click()}>
                  {empresa.logo ? "Cambiar logo" : "Cargar logo"}
                </Button>
                {empresa.logo && (
                  <IconButton size="sm" variant="ghost" rounded="md" h="40px" w="40px"
                    color="red.400" aria-label="Quitar logo"
                    icon={<FiTrash2 size={15} />} onClick={quitarLogo} />
                )}
              </HStack>
              <Text fontSize="10px" color={muted} mt={2}>PNG · JPG · SVG · Máximo 2 MB</Text>
            </Box>

            {/* Las filas van en el mismo orden en que salen impresas, para
                que la vista previa de al lado se lea de arriba abajo igual
                que este formulario. */}
            <Stack spacing={3.5}>
              {FILAS.map((fila, i) => (
                <SimpleGrid key={i} columns={{ base: 1, sm: fila.length }} spacing={3}>
                  {fila.map((k) => {
                    const c = CAMPOS[k];
                    return (
                      <Box key={k}>
                        <Etiqueta>{c.etq}</Etiqueta>
                        <Input size="md" h="44px" rounded="md" bg={inputBg} focusBorderColor={FY}
                          value={empresa[k] ?? ""} placeholder={c.ph}
                          type={k === "correo" ? "email" : "text"}
                          inputMode={k === "tel" ? "tel" : undefined}
                          onChange={(e) => cambiar(k, e.target.value)} />
                      </Box>
                    );
                  })}
                </SimpleGrid>
              ))}
            </Stack>

            <Divider my={5} />
            <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
              {nubeActiva() ? (
                <HStack spacing={1.5}>
                  <Icon as={FiCloud} boxSize={3.5} color="green.400" />
                  <Text fontSize="11px" color={muted}>
                    Se copia a las demás computadoras de la ferretería
                  </Text>
                </HStack>
              ) : <Box />}
              <Button size="xs" variant="ghost" colorScheme="gray" rounded="md" color={muted}
                leftIcon={<FiRotateCcw size={11} />} onClick={restaurar}>
                Restaurar los originales
              </Button>
            </Flex>
          </Box>

          {/* ── Cómo se va a ver ── */}
          <Box position={{ lg: "sticky" }} top={{ lg: "80px" }}>
            <Etiqueta>Así sale en la cotización</Etiqueta>
            <Box bg="white" color="gray.800" border="1px solid" borderColor={border}
              rounded="xl" overflow="hidden" boxShadow="0 4px 20px rgba(0,0,0,0.10)">
              <Box h="6px" bg={FY} />
              <Flex p={5} gap={4} align="flex-start" direction={{ base: "column", sm: "row" }}>
                <Box flexShrink={0}>
                  <AppLogo src={empresa.logo} h="46px" />
                </Box>
                <Box flex={1} minW={0}>
                  <Text fontWeight="900" fontSize="17px" lineHeight="1.2" noOfLines={2}>
                    {empresa.nombre || <Text as="span" color="gray.400">Nombre de la empresa</Text>}
                  </Text>
                  <VStack align="stretch" spacing={0} mt={1.5}>
                    {empresa.nit    && <Text fontSize="11px" color="gray.600">NIT {empresa.nit}</Text>}
                    {empresa.dir    && <Text fontSize="11px" color="gray.600">{empresa.dir}</Text>}
                    {empresa.ciudad && <Text fontSize="11px" color="gray.600">{empresa.ciudad}</Text>}
                    {(empresa.tel || empresa.correo) && (
                      <Text fontSize="11px" color="gray.600" sx={{ wordBreak: "break-word" }}>
                        {[empresa.tel, empresa.correo].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </VStack>
                </Box>
                <Box flexShrink={0} textAlign={{ base: "left", sm: "right" }}
                  display={{ base: "none", sm: "block" }}>
                  <Text fontSize="9px" fontWeight="800" color="gray.400" letterSpacing="0.1em">
                    COTIZACIÓN
                  </Text>
                  <Text fontWeight="900" fontSize="15px" color={DARK}>COT-001</Text>
                </Box>
              </Flex>
              <Box borderTop="1px solid" borderColor="gray.200" px={5} py={3}>
                <Text fontSize="10px" color="gray.400">
                  … aquí siguen el cliente, los productos y el total
                </Text>
              </Box>
            </Box>
            <Text fontSize="11px" color={muted} mt={3}>
              Lo que escribas a la izquierda aparece aquí al instante. Si algo
              se ve mal en esta vista, se verá igual de mal en el PDF.
            </Text>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
