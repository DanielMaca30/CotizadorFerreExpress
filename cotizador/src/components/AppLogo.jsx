/**
 * AppLogo.jsx — el logo de la ferretería, con red de seguridad
 * ─────────────────────────────────────────────────────────────────
 * Tres intentos, en orden: el logo que subió la persona, el logo.jpg que
 * viene con la aplicación, y si ninguno carga, las iniciales sobre el
 * amarillo de la marca. Nunca se ve el recuadro roto de imagen faltante,
 * ni en pantalla ni en el PDF.
 *
 * Vivía dentro de CotizadorPage. Salió de ahí cuando los datos de la
 * empresa se mudaron a "Mi perfil": las dos pantallas lo necesitan, y
 * tener dos copias del mismo componente es como termina uno arreglando el
 * error en una sola.
 */
import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

export default function AppLogo({ src, h = "32px" }) {
  const [phase, setPhase] = useState(() => (src ? 0 : 1));
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setPhase(src ? 0 : 1);
  }
  if (phase === 0 && src)
    return <Box as="img" src={src} h={h} objectFit="contain" onError={() => setPhase(1)} />;
  if (phase === 1)
    return <Box as="img" src="/logo.jpg" h={h} objectFit="contain" onError={() => setPhase(2)} />;
  return (
    <Box bg={FY} rounded="md" px={2} py="3px">
      <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.4">FE</Text>
    </Box>
  );
}
