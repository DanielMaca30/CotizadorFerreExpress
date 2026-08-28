/**
 * NavegacionPrincipal.jsx — el mapa del sistema, siempre a la vista
 * ─────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE: hasta ahora cada pantalla inventaba su propia barra
 * de arriba. Medido sobre la aplicación funcionando: desde el listado
 * no había ninguna forma visible de llegar a la Ayuda salvo el botón
 * flotante; desde una cotización, lo único que devolvía al listado era
 * una «×» rotulada «Cerrar Nueva» — que se lee como «botar lo que
 * llevo», no como «volver a casa». Quien entraba a una cotización se
 * quedaba ahí sin saber cómo salir.
 *
 * Esta barra es una sola para toda la aplicación y responde tres
 * preguntas que antes no tenían respuesta en pantalla:
 *
 *   ¿Dónde estoy?    → el destino actual va marcado y con su nombre.
 *   ¿Qué más hay?    → los cuatro destinos están siempre visibles.
 *   ¿Cómo vuelvo?    → tocando «Cotizaciones», que es la casa.
 *
 * HEURÍSTICAS DE NIELSEN QUE ATIENDE
 *   #1 Visibilidad del estado del sistema — el destino activo se ve.
 *   #3 Control y libertad — salida marcada desde cualquier pantalla.
 *   #4 Consistencia — la misma barra, en el mismo sitio, siempre.
 *   #6 Reconocer en vez de recordar — los destinos se ven, no se
 *      memorizan; y cada ícono lleva su nombre escrito al lado.
 *
 * DÓNDE SE COLOCA
 *   Celular  → barra fija abajo, que es donde llega el pulgar.
 *   Computador y tablet → barra arriba, junto al logo.
 */
import { memo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Flex, HStack, Text, Icon, useColorModeValue, useMediaQuery,
} from "@chakra-ui/react";
import { FiFileText, FiPlus, FiUsers, FiHelpCircle, FiSettings } from "react-icons/fi";
import { useCotizaciones, NEW_TAB_ID } from "../hooks/useCotizaciones";
import { TABS_BAR_H } from "./TabsBar";
import AppLogo from "./AppLogo";

const FY = "#F9BF20";
const DARK = "#3A3A38";

/** Alto de la barra de abajo en celular. Las páginas reservan este
 *  espacio al final para que la barra no les tape el contenido. */
export const NAV_MOVIL_H = "60px";

/** Alto de la barra de arriba en computador y tablet. */
export const NAV_ARRIBA_H = 46;

/**
 * A qué altura tiene que pegarse la barra propia de cada pantalla.
 * Encima puede haber dos cosas fijas: la tira de cotizaciones abiertas
 * (solo si hay alguna) y esta navegación (solo en pantalla grande, que
 * en el teléfono va abajo). Sin este cálculo compartido, cada pantalla
 * lo adivinaba por su cuenta y las barras se montaban una encima de
 * otra. Devuelve un valor en px listo para `top`.
 */
export function useOffsetSuperior(hayPestanas) {
  const [esCelular] = useMediaQuery("(max-width: 47.99em)", { ssr: false });
  const pestanas = hayPestanas ? parseInt(TABS_BAR_H, 10) : 0;
  return `${pestanas + (esCelular ? 0 : NAV_ARRIBA_H)}px`;
}

/* Los destinos de trabajo. Son cuatro y no más a propósito: con seis o
   siete, en un teléfono cada uno queda tan angosto que el rótulo se
   corta y hay que adivinar por el dibujo. */
const DESTINOS = [
  { ruta: "/historial", etq: "Cotizaciones", icono: FiFileText,
    activo: (p) => p === "/historial" || p === "/" },
  { ruta: "/cotizador", etq: "Nueva", icono: FiPlus, destacado: true,
    activo: (p) => p.startsWith("/cotizador") },
  { ruta: "/clientes", etq: "Clientes", icono: FiUsers,
    activo: (p) => p === "/clientes" || p.startsWith("/cliente/") },
  { ruta: "/ayuda", etq: "Ayuda", icono: FiHelpCircle,
    activo: (p) => p === "/ayuda" },
];

/* Mi perfil va aparte: son ajustes que se tocan una vez, no un sitio
   donde se trabaja. Pero tiene que estar, porque si no, quien entra ahí
   ve la barra sin nada marcado y no sabe si sigue dentro del sistema.
   En el teléfono es el quinto y más angosto; en computador, a la
   derecha del todo, separado de los demás. */
const PERFIL = { ruta: "/perfil", etq: "Perfil", icono: FiSettings,
  activo: (p) => p === "/perfil" };

/* ═══════════ CELULAR: barra fija abajo ═══════════ */
const BarraAbajo = memo(function BarraAbajo({ pathname, ir }) {
  const bg     = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted  = useColorModeValue("gray.500", "gray.400");

  return (
    <Box as="nav" aria-label="Navegación principal"
      position="fixed" bottom={0} left={0} right={0} zIndex={400}
      bg={bg} borderTop="1px solid" borderColor={border}
      /* pb extra por la franja del gesto de inicio en los iPhone */
      pb="env(safe-area-inset-bottom)"
      boxShadow="0 -2px 12px rgba(0,0,0,0.06)"
      sx={{ "@media print": { display: "none" } }}>
      <Flex h={NAV_MOVIL_H} align="stretch">
        {[...DESTINOS, PERFIL].map((d) => {
          const on = d.activo(pathname);
          return (
            <Flex key={d.ruta} as="button" type="button" flex="1"
              direction="column" align="center" justify="center" gap="3px"
              onClick={() => ir(d.ruta)}
              aria-current={on ? "page" : undefined}
              aria-label={d.etq}
              color={on ? DARK : muted}
              position="relative"
              _active={{ bg: useColorModeValue("gray.50", "whiteAlpha.100") }}>
              {/* La marca de «estás aquí»: una barrita arriba del
                  destino activo. Un color distinto solo no basta —
                  quien no distingue bien los colores no lo vería. */}
              <Box position="absolute" top={0} left="18%" right="18%" h="3px"
                bg={on ? FY : "transparent"} roundedBottom="full" />
              <Icon as={d.icono} boxSize={d.destacado ? "22px" : "19px"}
                color={on ? DARK : muted}
                strokeWidth={on ? 2.5 : 2} />
              {/* El rótulo NO se corta ni se abrevia: un ícono sin nombre
                  obliga a adivinar, que es lo que se vino a quitar. */}
              <Text fontSize="9.5px" fontWeight={on ? "800" : "600"} lineHeight="1"
                letterSpacing="-0.01em" whiteSpace="nowrap">
                {d.etq}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
});

/* ═══════════ COMPUTADOR Y TABLET: barra arriba ═══════════ */
const BarraArriba = memo(function BarraArriba({ pathname, ir, topOffset }) {
  const bg     = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted  = useColorModeValue("gray.600", "gray.400");
  const hover  = useColorModeValue("gray.50", "whiteAlpha.100");

  return (
    <Box as="nav" aria-label="Navegación principal"
      bg={bg} borderBottom="1px solid" borderColor={border}
      position="sticky" top={topOffset} zIndex={150}
      sx={{ "@media print": { display: "none" } }}>
      <Flex maxW="1600px" mx="auto" px={{ base: 3, md: 5 }} h="46px" align="center" gap={1}>
        {/* El logo también es el camino a casa: es lo que la gente
            toca por costumbre en cualquier página web. Y es el logo de
            verdad, no las letras dibujadas con la tipografía de la app. */}
        <Box as="button" type="button" onClick={() => ir("/historial")}
          aria-label="FerreExpress — ir a Cotizaciones"
          display="flex" alignItems="center" mr={3} flexShrink={0}
          rounded="md" _hover={{ opacity: 0.85 }}>
          <AppLogo variante="marca" h="30px" />
        </Box>

        {DESTINOS.map((d) => {
          const on = d.activo(pathname);
          return (
            <Flex key={d.ruta} as="button" type="button"
              align="center" gap={2} px={3} h="34px" rounded="md"
              onClick={() => ir(d.ruta)}
              aria-current={on ? "page" : undefined}
              bg={on ? FY : "transparent"}
              color={on ? DARK : muted}
              fontWeight={on ? "800" : "600"}
              _hover={{ bg: on ? "#e0b010" : hover }}
              transition="background .12s">
              <Icon as={d.icono} boxSize={4} />
              <Text fontSize="13px">{d.etq}</Text>
            </Flex>
          );
        })}

        {/* Mi perfil se separa a la derecha: son ajustes que se tocan una
            vez, no un sitio donde se trabaja. Mezclarlo con los cuatro
            destinos le daría el mismo peso que a Cotizaciones. */}
        <Flex as="button" type="button" ml="auto"
          align="center" gap={2} px={3} h="34px" rounded="md"
          onClick={() => ir(PERFIL.ruta)}
          aria-current={PERFIL.activo(pathname) ? "page" : undefined}
          bg={PERFIL.activo(pathname) ? FY : "transparent"}
          color={PERFIL.activo(pathname) ? DARK : muted}
          fontWeight={PERFIL.activo(pathname) ? "800" : "600"}
          _hover={{ bg: PERFIL.activo(pathname) ? "#e0b010" : hover }}>
          <Icon as={PERFIL.icono} boxSize={4} />
          <Text fontSize="13px" display={{ base: "none", lg: "block" }}>Mi perfil</Text>
        </Flex>
      </Flex>
    </Box>
  );
});

/* ═══════════════════════════════════════════════════════════ */
export default function NavegacionPrincipal() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openTab, tabs, flushAutoSave } = useCotizaciones();
  const [esCelular] = useMediaQuery("(max-width: 47.99em)", { ssr: false });
  /* Se pega justo debajo de la tira de cotizaciones abiertas */
  const topOffset = tabs.length ? TABS_BAR_H : 0;

  const ir = useCallback(async (ruta) => {
    if (pathname === ruta) return;

    /* ── SALIR DE UNA COTIZACIÓN NO PUEDE COSTAR TRABAJO ──
       Esta barra empezó llamando a navigate() a secas, y eso se saltaba
       el guardado que hacen los demás caminos de salida: se escribían
       tres productos, se tocaba «Clientes» y se perdían. Ahora se guarda
       antes de irse, igual que al cambiar de pestaña. Se guarda en vez
       de preguntar a propósito: en el mostrador, una ventana de
       «¿seguro?» es una pausa; guardar y seguir, no. */
    if (pathname.startsWith("/cotizador")) await flushAutoSave();

    /* «Nueva» estando ya dentro de una cotización abriría otra encima.
       Se registra la pestaña primero, que es lo que hace el botón
       amarillo del listado, y así queda igual desde los dos sitios. */
    if (ruta === "/cotizador") openTab(NEW_TAB_ID);

    navigate(ruta);
  }, [navigate, openTab, pathname, flushAutoSave]);

  /* En la guía a pantalla completa la barra estorba: esa pantalla es
     para leer, y ya trae su propio «Volver». */
  if (pathname === "/ayuda" && !esCelular) {
    return <BarraArriba pathname={pathname} ir={ir} topOffset={topOffset} />;
  }

  return esCelular
    ? <BarraAbajo pathname={pathname} ir={ir} />
    : <BarraArriba pathname={pathname} ir={ir} topOffset={topOffset} />;
}
