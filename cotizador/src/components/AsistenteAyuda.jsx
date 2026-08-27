/**
 * AsistenteAyuda.jsx — "pregúntale a la app cómo se hace"
 * ─────────────────────────────────────────────────────────────────
 * Funciona como un chat: la persona escribe con sus propias palabras
 * ("cómo cobro el domicilio") y recibe la respuesta.
 *
 * IMPORTANTE, con honestidad: esto NO es un chat con inteligencia
 * artificial. Busca dentro de la guía (src/ayuda/guia.js) y devuelve
 * el tema que mejor coincide. Ventajas frente a una IA de verdad:
 * funciona sin internet, es instantáneo, no cuesta nada y nunca se
 * inventa una respuesta — solo puede decir lo que está escrito en la
 * guía, que fue verificado usando la aplicación.
 *
 * ─── TRES COSAS QUE SE ARREGLARON, PORQUE SE USARON MAL ───
 *
 * 1. LA RESPUESTA DIRECTA VA PRIMERO. Antes, preguntar "cuál es la
 *    clave" devolvía una tarjeta titulada "Entrar a la app" con tres
 *    pasos y tres advertencias, y la palabra ferreexpress escondida en
 *    el paso 2. Ahora lo primero y más grande es la respuesta: «La clave
 *    es ferreexpress». El paso a paso sigue estando, pero plegado: se
 *    abre solo si hace falta.
 *
 * 2. YA NO MANDA PARA ABAJO. Antes la conversación saltaba al final del
 *    último mensaje, así que uno aterrizaba a mitad de la respuesta, por
 *    debajo del título, sin saber dónde estaba parado. Ahora se coloca
 *    el COMIENZO de la respuesta arriba de la vista: se lee de arriba
 *    abajo, como cualquier texto.
 *
 * 3. TODA RESPUESTA TIENE SALIDA. Antes solo los temas con recorrido
 *    ofrecían "Hazlo conmigo". Los demás terminaban en nada. Ahora cada
 *    respuesta ofrece algo que hacer: el recorrido si existe, o
 *    "Llévame ahí" hasta la pantalla donde se hace, o el tema completo.
 */
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Flex, HStack, Stack, Text, Input, IconButton, Button,
  Badge, Icon, useColorModeValue, Wrap, WrapItem, Collapse,
} from "@chakra-ui/react";
import {
  FiSend, FiMessageCircle, FiAlertTriangle, FiCornerDownRight, FiTarget,
  FiChevronDown, FiArrowRight, FiHelpCircle,
} from "react-icons/fi";
import { buscarTemas, PREGUNTAS_SUGERIDAS, DIFICULTAD } from "../ayuda/guia";
import { getRecorrido } from "../ayuda/recorridos";
import { iniciarRecorrido } from "./RecorridoGuiado";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const SALUDO = {
  de: "app",
  texto: "Pregúntame con tus palabras y te respondo directo. Si además quiero mostrártelo, te llevo a la pantalla o te voy señalando cada botón. Por ejemplo: «cuál es la clave», «cómo le cotizo otra vez al mismo cliente», «dónde cambio el logo».",
};

/* Escribe **así** las palabras que hay que resaltar dentro de la
   respuesta directa. Un negrita bien puesto es la diferencia entre
   leer la respuesta y buscarla. */
function ConNegritas({ children, ...rest }) {
  const partes = String(children).split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text {...rest}>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <Text as="strong" key={i} fontWeight="900">{p.slice(2, -2)}</Text>
          : <Text as="span" key={i}>{p}</Text>
      )}
    </Text>
  );
}

/* ─── Tarjeta con la respuesta de un tema ─── */
function RespuestaTema({ tema, onAbrirTema, onAntesDeGuiar, onIr, yaEstoyAhi, abiertoDeEntrada = false }) {
  const [pasosAbiertos, setPasosAbiertos] = useState(abiertoDeEntrada);
  const rec = tema.recorrido ? getRecorrido(tema.recorrido) : null;
  const cardBg = useColorModeValue("white", "gray.800");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const suave = useColorModeValue("gray.50", "whiteAlpha.100");
  const muted = useColorModeValue("gray.600", "gray.400");
  const respBg = useColorModeValue("#FFFBEB", "whiteAlpha.100");
  const dif = DIFICULTAD[tema.dificultad];

  return (
    /* Las marcas data-resp son para las pruebas automáticas: permiten
       comprobar sin ambigüedad qué respondió el asistente. */
    <Box data-resp="tarjeta" data-tema={tema.id}
      bg={cardBg} border="1px solid" borderColor={borde} rounded="xl" p={4} w="full">
      <HStack justify="space-between" align="start" mb={2.5} spacing={2}>
        <Text data-resp="titulo" fontWeight="800" fontSize="14px" lineHeight="1.3">{tema.titulo}</Text>
        <Badge colorScheme={dif.color} rounded="full" fontSize="9px" flexShrink={0}>
          {dif.texto}
        </Badge>
      </HStack>

      {/* LA RESPUESTA. Lo primero que se lee, sobre fondo amarillo suave
          para que no se confunda con el resto del texto. */}
      {tema.directa ? (
        <Box data-resp="directa" bg={respBg} borderLeft="3px solid" borderColor={FY}
          rounded="md" px={3} py={2.5} mb={3}>
          <ConNegritas fontSize="13.5px" lineHeight="1.55">{tema.directa}</ConNegritas>
        </Box>
      ) : (
        <Text fontSize="12px" color={muted} mb={3}>{tema.resumen}</Text>
      )}

      {/* El paso a paso queda plegado: quien ya entendió con la respuesta
          no tiene que pasar por encima de cinco pasos para llegar al
          botón que le sirve. */}
      <Button size="xs" variant="ghost" colorScheme="gray" rounded="md" px={2}
        rightIcon={<Box as={FiChevronDown} transform={pasosAbiertos ? "rotate(180deg)" : undefined}
          transition="transform .15s" />}
        onClick={() => setPasosAbiertos((v) => !v)}>
        {pasosAbiertos ? "Ocultar el paso a paso" : `Ver el paso a paso (${tema.pasos.length})`}
      </Button>

      <Collapse in={pasosAbiertos} animateOpacity>
        <Stack spacing={1.5} mt={3} mb={tema.ojo?.length ? 3 : 0}>
          {tema.pasos.map((p, i) => (
            <HStack key={i} align="start" spacing={2.5}>
              <Flex flexShrink={0} w="18px" h="18px" rounded="full" bg={FY} align="center" justify="center" mt="1px">
                <Text fontSize="10px" fontWeight="900" color={DARK}>{i + 1}</Text>
              </Flex>
              <Text fontSize="12.5px" lineHeight="1.5">{p}</Text>
            </HStack>
          ))}
        </Stack>

        {tema.ojo?.length > 0 && (
          <Box bg={suave} rounded="lg" p={3}>
            <HStack spacing={1.5} mb={1.5}>
              <Icon as={FiAlertTriangle} boxSize={3} color="orange.400" />
              <Text fontSize="10px" fontWeight="800" color="orange.400" letterSpacing="0.05em">
                OJO CON ESTO
              </Text>
            </HStack>
            <Stack spacing={1.5}>
              {tema.ojo.slice(0, 3).map((o, i) => (
                <Text key={i} fontSize="11.5px" color={muted} lineHeight="1.5">• {o}</Text>
              ))}
            </Stack>
          </Box>
        )}
      </Collapse>

      {/* ── EL SEGUIMIENTO ──
          Ninguna respuesta termina en un punto muerto. Si hay recorrido,
          se lo mostramos sobre la pantalla real; si no, al menos lo
          llevamos hasta donde se hace; y siempre queda el tema completo. */}
      <Stack spacing={2} mt={3}>
        {rec && (
          <Button size="sm" w="full" bg={FY} color={DARK} rounded="lg" fontWeight="700"
            h="42px" leftIcon={<FiTarget />} _hover={{ bg: "#e0b010" }}
            onClick={() => { onAntesDeGuiar?.(); iniciarRecorrido(rec.id); }}>
            Hazlo conmigo en la pantalla
          </Button>
        )}
        {/* ── CUIDADO CON LLEVARSE A LA GENTE DE DONDE ESTÁ ──
            Si alguien pregunta "cómo pongo un descuento" TENIENDO una
            cotización abierta, mandarlo a /cotizador le abriría otra en
            blanco y dejaría la suya a medias. Cuando ya está en la
            pantalla correcta, el botón no navega: cierra la ayuda y lo
            deja donde estaba, que es lo que necesita. */}
        {tema.ir && !rec && (
          <Button size="sm" w="full" variant="outline" colorScheme="gray" rounded="lg"
            fontWeight="700" h="42px"
            rightIcon={yaEstoyAhi(tema.ir) ? undefined : <FiArrowRight />}
            onClick={() => onIr?.(tema.ir)}>
            {yaEstoyAhi(tema.ir) ? "Ya estás en esa pantalla — ciérrame y hazlo" : "Llévame ahí"}
          </Button>
        )}
        {tema.ir && rec && !yaEstoyAhi(tema.ir) && (
          <Button size="xs" variant="ghost" colorScheme="gray" rounded="md"
            rightIcon={<FiArrowRight />} onClick={() => onIr?.(tema.ir)}>
            O llévame ahí y lo hago yo
          </Button>
        )}
        {onAbrirTema && (
          <Button size="xs" variant="ghost" colorScheme="gray" rounded="md"
            rightIcon={<FiCornerDownRight />} onClick={() => onAbrirTema(tema.id)}>
            Ver este tema completo, con todas las advertencias
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default function AsistenteAyuda({ onAbrirTema, onAntesDeGuiar, alto = "380px", autoFocus = false }) {
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const anclaRef = useRef(null);     // el comienzo de la última respuesta
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /* /cotizador y /cotizador/COT-123 son la misma pantalla para esto */
  const yaEstoyAhi = useCallback(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/"),
    [pathname]
  );

  const bg = useColorModeValue("gray.50", "gray.900");
  const burbujaYo = useColorModeValue(DARK, "gray.700");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.400");
  const campoBg = useColorModeValue("white", "gray.800");

  /* ── DÓNDE QUEDA LA VISTA DESPUÉS DE PREGUNTAR ──
     Antes: al final de todo. La respuesta más larga que la pantalla
     dejaba a la persona mirando el último renglón, sin título ni
     contexto — "me manda para abajo y me hace perder".
     Ahora: el comienzo de la respuesta queda arriba de la vista, así
     que lo primero que se ve es la pregunta y debajo, la respuesta.
     useLayoutEffect y no useEffect: se coloca antes de que el navegador
     pinte, para que no se vea el salto. */
  useLayoutEffect(() => {
    const caja = scrollRef.current;
    const ancla = anclaRef.current;
    if (!caja || !ancla) return;
    caja.scrollTop = Math.max(0, ancla.offsetTop - caja.offsetTop - 8);
  }, [mensajes]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const irA = useCallback((ruta) => {
    onAntesDeGuiar?.();                 // cierra la ventana de ayuda
    if (!yaEstoyAhi(ruta)) navigate(ruta);
  }, [navigate, onAntesDeGuiar, yaEstoyAhi]);

  const preguntar = useCallback((pregunta) => {
    const q = String(pregunta || "").trim();
    if (!q) return;
    const encontrados = buscarTemas(q, 3);
    setMensajes((prev) => [
      ...prev,
      { de: "yo", texto: q },
      encontrados.length
        ? { de: "app", temas: encontrados }
        : {
            de: "app",
            texto:
              "No encontré ese tema con esas palabras. Prueba con una palabra suelta: «clave», «domicilio», «PDF», «AIU», «cliente», «logo», «borrar», «importar», «deshacer», «estado». O revisa la guía completa aquí abajo.",
          },
    ]);
    setTexto("");
  }, []);

  /* Índice del último mensaje de la app: es donde se ancla la vista */
  const ultimoDeLaApp = mensajes.length - 1;

  return (
    <Flex direction="column" h={alto} bg={bg} rounded="xl" border="1px solid" borderColor={borde} overflow="hidden">
      {/* Conversación */}
      <Box ref={scrollRef} flex={1} overflowY="auto" p={3} position="relative"
        sx={{
          "&::-webkit-scrollbar": { w: "6px" },
          "&::-webkit-scrollbar-thumb": { bg: "gray.300", borderRadius: "3px" },
        }}>
        <Stack spacing={3}>
          {mensajes.map((m, i) => {
            /* La pregunta que originó la última respuesta: ahí se ancla */
            const esAncla = i === ultimoDeLaApp - 1 && m.de === "yo";
            const ref = esAncla ? anclaRef : undefined;

            return m.de === "yo" ? (
              <Flex key={i} justify="flex-end" ref={ref}>
                <Box bg={burbujaYo} color="white" rounded="xl" px={3.5} py={2} maxW="80%">
                  <Text fontSize="12.5px">{m.texto}</Text>
                </Box>
              </Flex>
            ) : m.temas ? (
              <Stack key={i} spacing={2}>
                <RespuestaTema
                  tema={m.temas[0]}
                  onAbrirTema={onAbrirTema}
                  onAntesDeGuiar={onAntesDeGuiar}
                  onIr={irA}
                  yaEstoyAhi={yaEstoyAhi}
                />
                {/* Las otras coincidencias NO se pintan enteras: eran tres
                    tarjetas largas para una sola pregunta, y encontrar la
                    respuesta entre ellas costaba más que no preguntar.
                    Quedan como sugerencias de una línea. */}
                {m.temas.length > 1 && (
                  <Box>
                    <Text fontSize="10px" color={muted} fontWeight="700" mb={1.5}>
                      ¿O querías saber de esto?
                    </Text>
                    <Wrap spacing={1.5}>
                      {m.temas.slice(1).map((t) => (
                        <WrapItem key={t.id}>
                          <Button size="xs" variant="outline" colorScheme="gray" rounded="full"
                            fontSize="11px" fontWeight="600" whiteSpace="normal" h="auto"
                            py={1.5} px={3} leftIcon={<FiHelpCircle size={11} />}
                            onClick={() => preguntar(t.titulo)}>
                            {t.titulo}
                          </Button>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
              </Stack>
            ) : (
              <HStack key={i} align="start" spacing={2}>
                <Flex flexShrink={0} w="24px" h="24px" rounded="full" bg={FY} align="center" justify="center">
                  <Icon as={FiMessageCircle} boxSize={3} color={DARK} />
                </Flex>
                <Text fontSize="12.5px" color={muted} lineHeight="1.6" pt="2px">{m.texto}</Text>
              </HStack>
            );
          })}

          {/* Preguntas de ejemplo, solo al principio */}
          {mensajes.length === 1 && (
            <Wrap spacing={2} pt={1}>
              {PREGUNTAS_SUGERIDAS.map((p) => (
                <WrapItem key={p}>
                  <Button size="xs" variant="outline" colorScheme="gray" rounded="full" fontWeight="600"
                    fontSize="11px" whiteSpace="normal" h="auto" py={1.5} px={3}
                    onClick={() => preguntar(p)}>
                    {p}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          )}
          {/* Aire al final: sin esto, la última respuesta no puede subir
              hasta arriba de la vista y el anclaje se queda a medias.
              Solo cuando ya hay conversación: al principio dejaría un
              vacío enorme debajo del saludo. */}
          {mensajes.length > 1 && <Box h={alto} flexShrink={0} aria-hidden />}
        </Stack>
      </Box>

      {/* Campo para escribir */}
      <Flex as="form" p={2.5} gap={2} borderTop="1px solid" borderColor={borde}
        onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
        <Input ref={inputRef} size="md" h="42px" rounded="full" bg={campoBg}
          focusBorderColor={FY} value={texto} onChange={(e) => setTexto(e.target.value)}
          fontSize="14px" enterKeyHint="send"
          placeholder="¿Qué necesitas hacer?" />
        <IconButton type="submit" size="md" h="42px" w="42px" minW="42px" isRound bg={FY} color={DARK}
          _hover={{ bg: "#e0b010" }} aria-label="Preguntar" icon={<FiSend size={16} />}
          isDisabled={!texto.trim()} />
      </Flex>
    </Flex>
  );
}
