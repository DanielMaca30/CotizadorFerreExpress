/**
 * AsistenteAyuda.jsx — "pregúntale a la app cómo se hace"
 * ─────────────────────────────────────────────────────────────────
 * Funciona como un chat: la persona escribe con sus propias palabras
 * ("cómo cobro el domicilio") y recibe el paso a paso.
 *
 * IMPORTANTE, con honestidad: esto NO es un chat con inteligencia
 * artificial. Busca dentro de la guía (src/ayuda/guia.js) y devuelve
 * el tema que mejor coincide. Ventajas frente a una IA de verdad:
 * funciona sin internet, es instantáneo, no cuesta nada y nunca se
 * inventa una respuesta — solo puede decir lo que está escrito en la
 * guía, que fue verificado usando la aplicación.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box, Flex, HStack, Stack, Text, Input, IconButton, Button,
  Badge, Icon, useColorModeValue, Wrap, WrapItem,
} from "@chakra-ui/react";
import { FiSend, FiMessageCircle, FiAlertTriangle, FiCornerDownRight, FiTarget } from "react-icons/fi";
import { buscarTemas, PREGUNTAS_SUGERIDAS, DIFICULTAD } from "../ayuda/guia";
import { getRecorrido } from "../ayuda/recorridos";
import { iniciarRecorrido } from "./RecorridoGuiado";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const SALUDO = {
  de: "app",
  texto: "Escríbeme con tus palabras qué necesitas hacer y te doy el paso a paso. Y cuando se pueda, te lo muestro sobre la pantalla real con el botón «Hazlo conmigo en la pantalla». Por ejemplo: «cómo hago una cotización» o «qué es el AIU».",
};

/* ─── Tarjeta con la respuesta de un tema ─── */
function RespuestaTema({ tema, onAbrirTema, onAntesDeGuiar }) {
  const rec = tema.recorrido ? getRecorrido(tema.recorrido) : null;
  const cardBg = useColorModeValue("white", "gray.800");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const suave = useColorModeValue("gray.50", "whiteAlpha.100");
  const muted = useColorModeValue("gray.600", "gray.400");
  const dif = DIFICULTAD[tema.dificultad];

  return (
    <Box bg={cardBg} border="1px solid" borderColor={borde} rounded="xl" p={4} w="full">
      <HStack justify="space-between" align="start" mb={2} spacing={2}>
        <Text fontWeight="800" fontSize="14px" lineHeight="1.3">{tema.titulo}</Text>
        <Badge colorScheme={dif.color} rounded="full" fontSize="9px" flexShrink={0}>
          {dif.texto}
        </Badge>
      </HStack>
      <Text fontSize="12px" color={muted} mb={3}>{tema.resumen}</Text>

      <Stack spacing={1.5} mb={tema.ojo?.length ? 3 : 0}>
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

      {/* Lo que pidió el mostrador: además de leerlo, poder HACERLO.
          Si el tema tiene un recorrido, este botón lo lleva por la pantalla
          real, señalando cada botón y esperando a que lo toque. */}
      {rec && (
        <Button size="sm" w="full" mt={3} bg={FY} color={DARK} rounded="lg" fontWeight="700"
          leftIcon={<FiTarget />} _hover={{ bg: "#e0b010" }}
          onClick={() => { onAntesDeGuiar?.(); iniciarRecorrido(rec.id); }}>
          Hazlo conmigo en la pantalla
        </Button>
      )}

      {onAbrirTema && (
        <Button size="xs" variant="ghost" mt={2} rightIcon={<FiCornerDownRight />}
          onClick={() => onAbrirTema(tema.id)}>
          Ver este tema completo
        </Button>
      )}
    </Box>
  );
}

export default function AsistenteAyuda({ onAbrirTema, onAntesDeGuiar, alto = "380px", autoFocus = false }) {
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState("");
  const finRef = useRef(null);
  const inputRef = useRef(null);

  const bg = useColorModeValue("gray.50", "gray.900");
  const burbujaYo = useColorModeValue(DARK, "gray.700");
  const borde = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.400");

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

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
              "No encontré ese tema con esas palabras. Prueba con una palabra suelta: «domicilio», «PDF», «AIU», «cliente», «importar», «deshacer», «estado». O revisa la guía completa aquí abajo.",
          },
    ]);
    setTexto("");
  }, []);

  return (
    <Flex direction="column" h={alto} bg={bg} rounded="xl" border="1px solid" borderColor={borde} overflow="hidden">
      {/* Conversación */}
      <Box flex={1} overflowY="auto" p={3}
        sx={{
          "&::-webkit-scrollbar": { w: "6px" },
          "&::-webkit-scrollbar-thumb": { bg: "gray.300", borderRadius: "3px" },
        }}>
        <Stack spacing={3}>
          {mensajes.map((m, i) =>
            m.de === "yo" ? (
              <Flex key={i} justify="flex-end">
                <Box bg={burbujaYo} color="white" rounded="xl" px={3.5} py={2} maxW="80%">
                  <Text fontSize="12.5px">{m.texto}</Text>
                </Box>
              </Flex>
            ) : m.temas ? (
              <Stack key={i} spacing={2}>
                {m.temas.length > 1 && (
                  <Text fontSize="10px" color={muted} fontWeight="700">
                    ESTO ES LO QUE ENCONTRÉ
                  </Text>
                )}
                {m.temas.map((t) => (
                  <RespuestaTema key={t.id} tema={t} onAbrirTema={onAbrirTema} onAntesDeGuiar={onAntesDeGuiar} />
                ))}
              </Stack>
            ) : (
              <HStack key={i} align="start" spacing={2}>
                <Flex flexShrink={0} w="24px" h="24px" rounded="full" bg={FY} align="center" justify="center">
                  <Icon as={FiMessageCircle} boxSize={3} color={DARK} />
                </Flex>
                <Text fontSize="12.5px" color={muted} lineHeight="1.6" pt="2px">{m.texto}</Text>
              </HStack>
            )
          )}

          {/* Preguntas de ejemplo, solo al principio */}
          {mensajes.length === 1 && (
            <Wrap spacing={2} pt={1}>
              {PREGUNTAS_SUGERIDAS.map((p) => (
                <WrapItem key={p}>
                  <Button size="xs" variant="outline" rounded="full" fontWeight="600"
                    fontSize="11px" whiteSpace="normal" h="auto" py={1.5} px={3}
                    onClick={() => preguntar(p)}>
                    {p}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          )}
          <div ref={finRef} />
        </Stack>
      </Box>

      {/* Campo para escribir */}
      <Flex as="form" p={2.5} gap={2} borderTop="1px solid" borderColor={borde}
        onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
        <Input ref={inputRef} size="sm" rounded="full" bg={useColorModeValue("white", "gray.800")}
          focusBorderColor={FY} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué necesitas hacer?" />
        <IconButton type="submit" size="sm" isRound bg={FY} color={DARK}
          _hover={{ bg: "#e0b010" }} aria-label="Preguntar" icon={<FiSend size={14} />}
          isDisabled={!texto.trim()} />
      </Flex>
    </Flex>
  );
}
