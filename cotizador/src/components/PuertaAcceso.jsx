/**
 * PuertaAcceso.jsx — clave compartida de la empresa
 * ─────────────────────────────────────────────────────────────────
 * HASTA DÓNDE PROTEGE ESTO, CON HONESTIDAD:
 *
 * Evita que cualquiera que dé con el enlace público vea las cotizaciones
 * de la empresa. Eso ya es una mejora real frente a no tener nada.
 *
 * Lo que NO hace: la comprobación ocurre en el navegador, así que alguien
 * con conocimientos técnicos puede saltársela leyendo el código de la
 * página, y la clave de la base de datos sigue viajando en ese código.
 * Para protección de verdad hace falta Supabase Auth con usuarios y
 * políticas por rol en la base — es un trabajo aparte y más grande.
 *
 * Configuración: variable VITE_APP_PASSWORD en el archivo .env.
 * Si no se define, la puerta queda abierta y no estorba en desarrollo.
 */
import { useState, useCallback } from "react";
import {
  Box, Flex, Stack, Text, Input, Button, Icon, InputGroup,
  InputRightElement, IconButton, useColorModeValue,
} from "@chakra-ui/react";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const FY   = "#F9BF20";
const DARK = "#3A3A38";
const CLAVE = import.meta.env.VITE_APP_PASSWORD || "";
const SESION_KEY = "ferreexpress_acceso";

export default function PuertaAcceso({ children }) {
  const [ok, setOk] = useState(() => {
    if (!CLAVE) return true;                                  // sin clave configurada
    try { return localStorage.getItem(SESION_KEY) === "1"; } catch { return false; }
  });
  const [valor, setValor] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const bg     = useColorModeValue("gray.50", "gray.900");
  const muted  = useColorModeValue("gray.500", "gray.400");
  const borde  = useColorModeValue("gray.200", "whiteAlpha.200");

  const entrar = useCallback((e) => {
    e?.preventDefault();
    if (valor === CLAVE) {
      try { localStorage.setItem(SESION_KEY, "1"); } catch { /* noop */ }
      setOk(true);
    } else {
      setError(true);
      setValor("");
    }
  }, [valor]);

  if (ok) return children;

  return (
    <Flex minH="100vh" bg={bg} align="center" justify="center" px={4}>
      <Box bg={cardBg} rounded="2xl" p={8} maxW="360px" w="full"
        boxShadow="0 8px 40px rgba(0,0,0,0.12)" border="1px solid" borderColor={borde}>
        <Stack spacing={5} as="form" onSubmit={entrar}>
          <Flex align="center" gap={3}>
            <Box bg={FY} rounded="lg" px={3} py={2}>
              <Text fontWeight="900" color={DARK} fontSize="lg" lineHeight="1">FE</Text>
            </Box>
            <Box>
              <Text fontWeight="900" fontSize="lg" lineHeight="1.2">FerreExpress</Text>
              <Text fontSize="11px" color={muted}>Cotizador interno</Text>
            </Box>
          </Flex>

          <Box>
            <Flex align="center" gap={1.5} mb={2}>
              <Icon as={FiLock} boxSize={3} color={muted} />
              <Text fontSize="11px" fontWeight="700" color={muted}>
                Clave de la empresa
              </Text>
            </Flex>
            <InputGroup size="md">
              <Input type={ver ? "text" : "password"} rounded="lg" focusBorderColor={FY}
                autoFocus autoComplete="current-password"
                value={valor} isInvalid={error}
                onChange={(e) => { setValor(e.target.value); setError(false); }} />
              <InputRightElement>
                <IconButton size="sm" variant="ghost" tabIndex={-1}
                  aria-label={ver ? "Ocultar" : "Mostrar"}
                  icon={ver ? <FiEyeOff /> : <FiEye />} onClick={() => setVer((v) => !v)} />
              </InputRightElement>
            </InputGroup>
            {error && (
              <Text fontSize="11px" color="red.500" mt={2} fontWeight="600">
                Clave incorrecta.
              </Text>
            )}
            <Text fontSize="11px" color={muted} mt={2}>
              ¿No la recuerdas? La clave de la empresa siempre es{" "}
              <Text as="span" fontWeight="800" color={DARK}>ferreexpress</Text>.
            </Text>
          </Box>

          <Button type="submit" bg={FY} color={DARK} rounded="lg" fontWeight="700"
            _hover={{ bg: "#e0b010" }} isDisabled={!valor}>
            Entrar
          </Button>

          <Text fontSize="10px" color={muted} textAlign="center" lineHeight="1.5">
            La sesión queda abierta en este equipo hasta que se borren los datos del navegador.
          </Text>
        </Stack>
      </Box>
    </Flex>
  );
}
