/**
 * AyudaPage.jsx — Centro de ayuda (/ayuda)
 * ─────────────────────────────────────────────────────────────────
 * La guía completa de la app, escrita para alguien que nunca la ha
 * usado. Tres formas de encontrar lo que se necesita:
 *   1. El asistente: se pregunta con palabras propias.
 *   2. El buscador: filtra los temas mientras se escribe.
 *   3. El índice por secciones, para leerla de corrido.
 *
 * Todo el contenido vive en src/ayuda/guia.js.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Flex, HStack, VStack, Stack, Text, Icon, Badge, Button, IconButton,
  Input, InputGroup, InputLeftElement, SimpleGrid, Divider, Tooltip,
  useColorModeValue, Collapse, Wrap, WrapItem,
} from "@chakra-ui/react";
import {
  FiSearch, FiArrowLeft, FiFileText, FiPrinter, FiPlay, FiChevronDown,
  FiAlertTriangle, FiHelpCircle, FiLock, FiPlus, FiUser, FiPackage, FiTruck,
  FiPercent, FiSave, FiDownload, FiTool, FiRefreshCw, FiCheckCircle,
  FiMoreVertical, FiUsers, FiLayers, FiUpload, FiRotateCcw, FiCommand,
  FiSmartphone, FiZap,
} from "react-icons/fi";
import { TEMAS, GRUPOS, DIFICULTAD, buscarTemas } from "../ayuda/guia";
import AsistenteAyuda from "../components/AsistenteAyuda";
import { TABS_BAR_H } from "../components/TabsBar";
import { useCotizaciones } from "../hooks/useCotizaciones";
import { reiniciarTour } from "../components/TourGuiado";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const ICONOS = {
  FiLock, FiFileText, FiPlus, FiUser, FiPackage, FiTruck, FiPercent, FiSave,
  FiDownload, FiTool, FiRefreshCw, FiSearch, FiCheckCircle, FiMoreVertical,
  FiUsers, FiLayers, FiUpload, FiRotateCcw, FiCommand, FiAlertTriangle,
  FiSmartphone, FiHelpCircle, FiZap,
};

/* ══════════════ Un tema desplegable ══════════════ */
function Tema({ tema, abierto, onToggle, refTema }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const suave = useColorModeValue("gray.50", "whiteAlpha.100");
  const muted = useColorModeValue("gray.600", "gray.400");
  const hover = useColorModeValue("gray.50", "whiteAlpha.50");
  const dif = DIFICULTAD[tema.dificultad];
  const IconoTema = ICONOS[tema.icono] || FiHelpCircle;

  return (
    <Box ref={refTema} bg={cardBg} border="1px solid"
      borderColor={abierto ? FY : borde} rounded="xl" overflow="hidden"
      transition="border-color 0.15s" scrollMarginTop="120px">
      {/* Cabecera */}
      <Flex as="button" w="full" textAlign="left" align="center" gap={3} p={4}
        _hover={{ bg: hover }} onClick={onToggle} aria-expanded={abierto}>
        <Flex flexShrink={0} w="36px" h="36px" rounded="lg" bg={FY} align="center" justify="center">
          <Icon as={IconoTema} boxSize={4} color={DARK} />
        </Flex>
        <Box flex={1} minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="800" fontSize="14.5px">{tema.titulo}</Text>
            <Badge colorScheme={dif.color} rounded="full" fontSize="9px">{dif.texto}</Badge>
          </HStack>
          <Text fontSize="12px" color={muted} mt={0.5} noOfLines={abierto ? undefined : 1}>
            {tema.resumen}
          </Text>
        </Box>
        <Icon as={FiChevronDown} boxSize={4} color={muted} flexShrink={0}
          transform={abierto ? "rotate(180deg)" : "none"} transition="transform 0.2s" />
      </Flex>

      <Collapse in={abierto} animateOpacity>
        <Box px={4} pb={4}>
          <Divider mb={4} />

          {/* Pasos */}
          <Text fontSize="10px" fontWeight="800" color={muted} letterSpacing="0.08em" mb={2.5}>
            PASO A PASO
          </Text>
          <Stack spacing={2.5} mb={tema.ejemplo || tema.ojo?.length ? 4 : 0}>
            {tema.pasos.map((p, i) => (
              <HStack key={i} align="start" spacing={3}>
                <Flex flexShrink={0} w="22px" h="22px" rounded="full" bg={FY} align="center" justify="center">
                  <Text fontSize="11px" fontWeight="900" color={DARK}>{i + 1}</Text>
                </Flex>
                <Text fontSize="13px" lineHeight="1.6" pt="1px">{p}</Text>
              </HStack>
            ))}
          </Stack>

          {/* Ejemplo numérico */}
          {tema.ejemplo && (
            <Box bg={DARK} rounded="lg" p={4} mb={4}>
              <Text fontSize="10px" fontWeight="800" color={FY} letterSpacing="0.08em" mb={2.5}>
                {tema.ejemplo.titulo.toUpperCase()}
              </Text>
              <Stack spacing={1.5}>
                {tema.ejemplo.lineas.map((l, i) => (
                  <Text key={i} fontSize="12.5px" color="whiteAlpha.900"
                    fontWeight={i === tema.ejemplo.lineas.length - 1 ? "800" : "400"}>
                    {l}
                  </Text>
                ))}
              </Stack>
              {tema.ejemplo.nota && (
                <Text fontSize="11.5px" color="whiteAlpha.700" mt={3} fontStyle="italic">
                  {tema.ejemplo.nota}
                </Text>
              )}
            </Box>
          )}

          {/* Advertencias */}
          {tema.ojo?.length > 0 && (
            <Box bg={suave} rounded="lg" p={3.5}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiAlertTriangle} boxSize={3.5} color="orange.400" />
                <Text fontSize="10px" fontWeight="800" color="orange.400" letterSpacing="0.08em">
                  OJO CON ESTO
                </Text>
              </HStack>
              <Stack spacing={2}>
                {tema.ojo.map((o, i) => (
                  <Text key={i} fontSize="12.5px" color={muted} lineHeight="1.6">• {o}</Text>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

/* ══════════════ Página ══════════════ */
export default function AyudaPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { tabs } = useCotizaciones();
  const topOffset = tabs.length ? TABS_BAR_H : 0;

  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set(params.get("tema") ? [params.get("tema")] : []));
  const refs = useRef({});

  const bg = useColorModeValue("gray.50", "gray.900");
  const barBg = useColorModeValue("white", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.400");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.50");

  useEffect(() => { document.title = "Guía de uso | FerreExpress"; return () => { document.title = "FerreExpress — Cotizador"; }; }, []);

  /* Si llega ?tema=xxx, lo abre y baja hasta él */
  useEffect(() => {
    const id = params.get("tema");
    if (!id) return;
    setAbiertos((prev) => new Set(prev).add(id));
    const t = setTimeout(() => {
      refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [params]);

  const filtrados = useMemo(() => {
    if (!q.trim()) return TEMAS;
    const encontrados = buscarTemas(q, 20);
    return encontrados.length ? encontrados : [];
  }, [q]);

  const porGrupo = useMemo(() => {
    const m = new Map();
    for (const t of filtrados) {
      if (!m.has(t.grupo)) m.set(t.grupo, []);
      m.get(t.grupo).push(t);
    }
    return m;
  }, [filtrados]);

  const toggle = (id) =>
    setAbiertos((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const abrirTema = (id) => {
    setQ("");
    setParams({ tema: id });
  };

  const todosAbiertos = filtrados.length > 0 && filtrados.every((t) => abiertos.has(t.id));
  const toggleTodos = () =>
    setAbiertos(todosAbiertos ? new Set() : new Set(filtrados.map((t) => t.id)));

  return (
    <Box minH="100vh" bg={bg}>
      {/* Barra superior */}
      <Box bg={barBg} borderBottom="1px solid" borderColor={borde}
        position="sticky" top={topOffset} zIndex={100}
        sx={{ "@media print": { display: "none" } }}>
        <Flex maxW="1000px" mx="auto" px={{ base: 3, md: 6 }}
          h={{ base: "auto", md: "54px" }} py={{ base: 2, md: 0 }}
          align="center" justify="space-between" gap={2} flexWrap="wrap">
          <HStack spacing={2}>
            <Tooltip label="Volver" hasArrow>
              <IconButton size="sm" variant="ghost" rounded="md" aria-label="Volver"
                icon={<FiArrowLeft />} onClick={() => navigate(-1)} />
            </Tooltip>
            <Box bg={FY} rounded="md" px={2} py="3px">
              <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.4">FE</Text>
            </Box>
            <Text fontWeight="800" fontSize={{ base: "13px", md: "15px" }}>Guía de uso</Text>
          </HStack>
          <HStack spacing={2}>
            <Tooltip label="Repetir el recorrido guiado por la pantalla" hasArrow>
              <Button size="sm" variant="outline" rounded="md" leftIcon={<FiPlay />}
                onClick={() => { reiniciarTour(); navigate("/historial"); }}>
                Ver el tour
              </Button>
            </Tooltip>
            <Tooltip label="Imprimir la guía completa" hasArrow>
              <IconButton size="sm" variant="outline" rounded="md" aria-label="Imprimir"
                icon={<FiPrinter />}
                onClick={() => { setAbiertos(new Set(TEMAS.map((t) => t.id))); setTimeout(() => window.print(), 300); }} />
            </Tooltip>
            <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700"
              leftIcon={<FiFileText />} _hover={{ bg: "#e0b010" }}
              onClick={() => navigate("/historial")}>
              Ir al listado
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box maxW="1000px" mx="auto" px={{ base: 3, md: 6 }} py={6}>
        {/* Presentación */}
        <Box bg={DARK} rounded="2xl" p={{ base: 5, md: 7 }} mb={5}>
          <Text fontWeight="900" fontSize={{ base: "20px", md: "24px" }} color="white" lineHeight="1.2">
            Todo lo que hace esta app, explicado paso a paso
          </Text>
          <Text fontSize="13px" color="whiteAlpha.700" mt={2} maxW="640px" lineHeight="1.7">
            Escrita para quien nunca la ha usado. Cada tema trae los pasos exactos y las
            advertencias de lo que confunde de verdad. La clave para entrar siempre es{" "}
            <Text as="span" color={FY} fontWeight="800">ferreexpress</Text>.
          </Text>
        </Box>

        {/* Asistente */}
        <Box bg={cardBg} border="1px solid" borderColor={borde} rounded="2xl" p={{ base: 4, md: 5 }} mb={5}
          sx={{ "@media print": { display: "none" } }}>
          <HStack spacing={2} mb={1}>
            <Icon as={FiHelpCircle} boxSize={4} color={FY} />
            <Text fontWeight="800" fontSize="15px">Pregúntame qué necesitas hacer</Text>
          </HStack>
          <Text fontSize="12px" color={muted} mb={3.5}>
            Escribe con tus propias palabras y te muestro los pasos. Funciona sin internet.
          </Text>
          <AsistenteAyuda onAbrirTema={abrirTema} alto="400px" />
        </Box>

        {/* Buscador del índice */}
        <Flex gap={2.5} align="center" mb={4} flexWrap="wrap"
          sx={{ "@media print": { display: "none" } }}>
          <InputGroup size="sm" flex={1} minW="220px">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color={muted} boxSize={4} />
            </InputLeftElement>
            <Input rounded="md" bg={inputBg} focusBorderColor={FY}
              placeholder="Filtrar temas de la guía…"
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }} />
          </InputGroup>
          <Button size="sm" variant="outline" rounded="md" onClick={toggleTodos}>
            {todosAbiertos ? "Cerrar todo" : "Abrir todo"}
          </Button>
          <Text fontSize="11px" color={muted}>
            {filtrados.length} {filtrados.length === 1 ? "tema" : "temas"}
          </Text>
        </Flex>

        {/* Índice rápido */}
        {!q && (
          <Wrap spacing={2} mb={5} sx={{ "@media print": { display: "none" } }}>
            {GRUPOS.map((g) => (
              <WrapItem key={g}>
                <Button size="xs" variant="ghost" rounded="full" fontSize="11px" color={muted}
                  onClick={() => document.getElementById(`grupo-${g}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  {g}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        )}

        {/* Temas */}
        {filtrados.length === 0 ? (
          <Box bg={cardBg} border="1px solid" borderColor={borde} rounded="xl" p={8} textAlign="center">
            <Icon as={FiSearch} boxSize={7} color={muted} mb={3} />
            <Text fontWeight="700" fontSize="15px">Nada con esas palabras</Text>
            <Text fontSize="12.5px" color={muted} mt={1}>
              Prueba con una palabra suelta: domicilio, PDF, AIU, cliente, importar, deshacer.
            </Text>
            <Button size="sm" mt={4} variant="outline" rounded="md" onClick={() => setQ("")}>
              Ver todos los temas
            </Button>
          </Box>
        ) : (
          <Stack spacing={6}>
            {GRUPOS.filter((g) => porGrupo.has(g)).map((g) => (
              <Box key={g} id={`grupo-${g}`} scrollMarginTop="110px">
                <Text fontSize="11px" fontWeight="800" color={muted} letterSpacing="0.1em" mb={2.5}>
                  {g.toUpperCase()}
                </Text>
                <Stack spacing={2.5}>
                  {porGrupo.get(g).map((t) => (
                    <Tema key={t.id} tema={t}
                      abierto={abiertos.has(t.id)}
                      onToggle={() => toggle(t.id)}
                      refTema={(el) => { refs.current[t.id] = el; }} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Cierre */}
        <Box mt={8} p={5} bg={cardBg} border="1px solid" borderColor={borde} rounded="xl"
          sx={{ "@media print": { display: "none" } }}>
          <Text fontWeight="800" fontSize="14px" mb={1}>¿Sigues sin encontrarlo?</Text>
          <Text fontSize="12.5px" color={muted} lineHeight="1.7">
            Pregúntale a quien maneja el sistema en la ferretería. Y si algo de esta guía
            quedó mal explicado o la app cambió, dilo: la guía se corrige en un solo archivo
            y se actualiza para todos.
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2.5} mt={4}>
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiPlay />}
              onClick={() => { reiniciarTour(); navigate("/historial"); }}>
              Ver el tour
            </Button>
            <Button size="sm" variant="outline" rounded="md" leftIcon={<FiPlus />}
              onClick={() => navigate("/cotizador")}>
              Cotización nueva
            </Button>
            <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700"
              _hover={{ bg: "#e0b010" }} leftIcon={<FiFileText />}
              onClick={() => navigate("/historial")}>
              Ir al listado
            </Button>
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
