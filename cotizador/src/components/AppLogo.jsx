/**
 * AppLogo.jsx — el logo de la ferretería, con red de seguridad
 * ─────────────────────────────────────────────────────────────────
 * DOS FORMAS, PORQUE HAY DOS SITIOS DISTINTOS:
 *
 *   variante "letrero" (por defecto) — el logo completo con el nombre
 *   («FE · Ferre Express S.A.S.» y los renglones de abajo). Va donde
 *   hay ancho: el membrete del documento, la vista previa de Mi perfil.
 *
 *   variante "marca" — solo el recuadro FE, cuadrado. Va en los sitios
 *   apretados: la barra de navegación, la esquina de una barra de
 *   arriba, la ventana de ayuda. El letrero completo ahí saldría de
 *   dos centímetros de ancho e ilegible.
 *
 * En los dos casos es el LOGO DE VERDAD, la imagen. Antes, en esos
 * sitios apretados, había un recuadro amarillo con las letras «FE»
 * escritas con la tipografía de la aplicación: se parecía, pero no era
 * el logo — la F y la E de la marca tienen otra forma, y le faltaba
 * el ®. Un logo aproximado es peor que ninguno.
 *
 * El orden de intentos es el mismo de siempre: primero el logo que
 * subió la persona en Mi perfil, después el que viene con la
 * aplicación, y solo si ninguno de los dos carga, las iniciales. Así
 * nunca se ve el recuadro roto de imagen faltante, ni en pantalla ni
 * en el PDF.
 */
import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";

const FY   = "#F9BF20";
const DARK = "#3A3A38";

/* Los archivos viven en public/ */
const LETRERO = "/logo.jpg";      // el logo largo, con el nombre
const MARCA   = "/fe-marca.jpg";  // solo el recuadro FE, cuadrado

export default function AppLogo({ src, h = "32px", variante = "letrero", ...rest }) {
  const propio = variante === "marca" ? MARCA : LETRERO;

  /* 0 = el logo que subió la persona · 1 = el que trae la app · 2 = iniciales */
  const [fase, setFase] = useState(() => (src ? 0 : 1));
  const [srcPrevio, setSrcPrevio] = useState(src);
  if (srcPrevio !== src) {
    setSrcPrevio(src);
    setFase(src ? 0 : 1);
  }

  const comun = {
    h,
    objectFit: "contain",
    /* La marca es cuadrada: se le fija el ancho para que no baile
       mientras carga y no empuje lo que tiene al lado. */
    ...(variante === "marca" ? { w: h, rounded: "md" } : {}),
    ...rest,
  };

  if (fase === 0 && src)
    return <Box as="img" src={src} alt="Logo de la empresa" {...comun} onError={() => setFase(1)} />;
  if (fase === 1)
    return <Box as="img" src={propio} alt="FerreExpress" {...comun} onError={() => setFase(2)} />;

  /* Último recurso: solo si las dos imágenes fallaron */
  return (
    <Box bg={FY} rounded="md" px={2} py="3px" {...rest}>
      <Text fontWeight="900" color={DARK} fontSize="sm" lineHeight="1.4">FE</Text>
    </Box>
  );
}
