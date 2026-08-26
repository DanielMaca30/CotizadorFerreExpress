/**
 * TourGuiado.jsx — recorrido de primera vez
 * ─────────────────────────────────────────────────────────────────
 * La primera vez que alguien entra, resalta los botones de verdad en
 * la pantalla y explica para qué sirve cada uno. Se puede saltar en
 * cualquier momento y se puede repetir después desde la ayuda.
 *
 * Cómo encuentra los elementos: por el atributo data-tour="..." que
 * está puesto en HistorialPage. Si un elemento no existe (porque la
 * lista está vacía, por ejemplo), ese paso se salta solo — el tour
 * nunca se queda trabado señalando algo que no está.
 */
import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Box, Flex, HStack, Text, Button, IconButton, useColorModeValue,
} from "@chakra-ui/react";
import { FiX, FiArrowRight, FiArrowLeft, FiCheck } from "react-icons/fi";

const FY = "#F9BF20";
const DARK = "#3A3A38";
const VISTO_KEY = "ferreexpress_tour_visto_v1";

/* Pasos del recorrido. `sel` es opcional: sin él, el paso sale centrado. */
const PASOS = [
  {
    sel: null,
    titulo: "Bienvenido al cotizador",
    texto:
      "Te muestro en 6 pasos dónde está lo importante. Toma menos de un minuto y lo puedes repetir cuando quieras desde el botón de ayuda.",
  },
  {
    sel: '[data-tour="nueva"]',
    titulo: "Aquí se empieza todo",
    texto:
      'Este botón crea una cotización nueva. Te va a preguntar si es Comercial (una venta normal) o de Obra (un contrato con AIU).',
  },
  {
    sel: '[data-tour="kpis"]',
    titulo: "Estos recuadros son botones",
    texto:
      "Total, Enviadas y Aceptadas filtran la lista al tocarlos, aunque no parezcan botones. Y sus números siempre corresponden a lo que estás viendo en pantalla.",
  },
  {
    sel: '[data-tour="buscador"]',
    titulo: "El buscador encuentra hasta por producto",
    texto:
      'Escribe un número, un cliente o un producto ("cemento") y filtra solo. Truco: la tecla / te trae aquí desde cualquier parte de esta pantalla.',
  },
  {
    sel: '[data-tour="estado"]',
    titulo: "La etiqueta de color es un menú",
    texto:
      "Esa etiqueta (Borrador, Enviada, Aceptada, Rechazada) se puede tocar para cambiar el estado. Es de las cosas que nadie descubre solo.",
  },
  {
    sel: '[data-tour="acciones"]',
    titulo: "Los tres puntos guardan lo demás",
    texto:
      "Ahí están Editar, Duplicar, Descargar PDF, Convertir a Obra y Eliminar. Duplicar es lo más útil cuando un cliente vuelve a pedir algo parecido.",
  },
  {
    sel: '[data-tour="ayuda"]',
    titulo: "Y este botón es tu salvavidas",
    texto:
      "Está en todas las pantallas. Ahí puedes preguntar con tus palabras cómo se hace cualquier cosa y ver la guía completa. La clave para entrar siempre es ferreexpress.",
  },
];

/** Vuelve a activar el tour (lo llama la ayuda). */
export function reiniciarTour() {
  try { localStorage.removeItem(VISTO_KEY); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent("ferreexpress:tour"));
}

const yaVisto = () => {
  try { return localStorage.getItem(VISTO_KEY) === "1"; } catch { return true; }
};

export default function TourGuiado({ activo = true }) {
  const [corriendo, setCorriendo] = useState(false);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState(null);   // recuadro del elemento resaltado

  const cardBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.400");

  /* Arranque: solo si la pantalla lo permite y no se ha visto.
     Se marca como visto al ARRANCAR, no al terminar: así, si alguien
     recarga la página a mitad del recorrido, no le vuelve a salir. */
  useEffect(() => {
    if (!activo) return;
    if (yaVisto()) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
      setI(0);
      setCorriendo(true);
    }, 900);
    return () => clearTimeout(t);
  }, [activo]);

  /* Repetir desde la ayuda */
  useEffect(() => {
    const h = () => {
      try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
      setI(0);
      setCorriendo(true);
    };
    window.addEventListener("ferreexpress:tour", h);
    return () => window.removeEventListener("ferreexpress:tour", h);
  }, []);

  const cerrar = useCallback(() => {
    setCorriendo(false);
    setCaja(null);
    try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
  }, []);

  /* Busca el elemento del paso actual; si no está, salta al siguiente */
  useLayoutEffect(() => {
    if (!corriendo) return;
    const paso = PASOS[i];
    if (!paso) { cerrar(); return; }
    if (!paso.sel) { setCaja(null); return; }

    let cancelado = false;
    const buscar = (intento = 0) => {
      if (cancelado) return;
      const el = document.querySelector(paso.sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (cancelado) return;
          const r = el.getBoundingClientRect();
          setCaja({ top: r.top, left: r.left, w: r.width, h: r.height });
        }, 260);
      } else if (intento < 6) {
        setTimeout(() => buscar(intento + 1), 180);
      } else {
        // el elemento no existe en esta pantalla: seguir de largo
        setCaja(null);
        setI((n) => (n + 1 < PASOS.length ? n + 1 : n));
      }
    };
    buscar();
    return () => { cancelado = true; };
  }, [i, corriendo, cerrar]);

  /* Recalcular el recuadro si cambia el tamaño o se hace scroll */
  useEffect(() => {
    if (!corriendo || !PASOS[i]?.sel) return;
    const recalcular = () => {
      const el = document.querySelector(PASOS[i].sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCaja({ top: r.top, left: r.left, w: r.width, h: r.height });
    };
    window.addEventListener("resize", recalcular);
    window.addEventListener("scroll", recalcular, true);
    return () => {
      window.removeEventListener("resize", recalcular);
      window.removeEventListener("scroll", recalcular, true);
    };
  }, [i, corriendo]);

  /* Teclado: Esc sale, flechas navegan */
  useEffect(() => {
    if (!corriendo) return;
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); cerrar(); }
      if (e.key === "ArrowRight") { e.preventDefault(); setI((n) => Math.min(n + 1, PASOS.length - 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [corriendo, cerrar]);

  if (!corriendo) return null;
  const paso = PASOS[i];
  if (!paso) return null;
  const ultimo = i === PASOS.length - 1;

  /* Dónde poner la tarjeta: debajo del elemento, o encima si no cabe */
  const M = 14;
  const ANCHO = Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 400) - 24);
  let estiloTarjeta = {
    top: "50%", left: "50%", transform: "translate(-50%, -50%)",
  };
  if (caja) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const abajo = caja.top + caja.h + M;
    const cabeAbajo = abajo + 210 < vh;
    const top = cabeAbajo ? abajo : Math.max(M, caja.top - 210 - M);
    let left = caja.left + caja.w / 2 - ANCHO / 2;
    left = Math.max(12, Math.min(left, vw - ANCHO - 12));
    estiloTarjeta = { top: `${top}px`, left: `${left}px`, transform: "none" };
  }

  return createPortal(
    <Box position="fixed" inset={0} zIndex={3000} sx={{ pointerEvents: "none" }}>
      {/* Capa oscura con un hueco encima del elemento */}
      <Box position="absolute" inset={0} sx={{ pointerEvents: "auto" }} onClick={cerrar}
        bg="blackAlpha.600"
        style={
          caja
            ? {
                clipPath: `polygon(
                  0% 0%, 0% 100%, ${caja.left - 6}px 100%,
                  ${caja.left - 6}px ${caja.top - 6}px,
                  ${caja.left + caja.w + 6}px ${caja.top - 6}px,
                  ${caja.left + caja.w + 6}px ${caja.top + caja.h + 6}px,
                  ${caja.left - 6}px ${caja.top + caja.h + 6}px,
                  ${caja.left - 6}px 100%, 100% 100%, 100% 0%
                )`,
              }
            : undefined
        }
      />

      {/* Marco amarillo sobre el elemento */}
      {caja && (
        <Box position="absolute" rounded="lg" border="3px solid" borderColor={FY}
          boxShadow={`0 0 0 4px ${FY}44`}
          top={`${caja.top - 6}px`} left={`${caja.left - 6}px`}
          w={`${caja.w + 12}px`} h={`${caja.h + 12}px`}
          sx={{ pointerEvents: "none", transition: "all 0.25s ease" }} />
      )}

      {/* Tarjeta con la explicación */}
      <Box position="absolute" style={estiloTarjeta} w={`${ANCHO}px`}
        bg={cardBg} rounded="xl" boxShadow="0 12px 40px rgba(0,0,0,0.35)"
        sx={{ pointerEvents: "auto", transition: "top 0.25s ease, left 0.25s ease" }}>
        <Flex align="center" justify="space-between" px={4} pt={3.5} pb={1}>
          <HStack spacing={1}>
            {PASOS.map((_, n) => (
              <Box key={n} w={n === i ? "16px" : "5px"} h="5px" rounded="full"
                bg={n === i ? FY : n < i ? "green.300" : "gray.300"}
                transition="all 0.2s" />
            ))}
          </HStack>
          <IconButton size="xs" variant="ghost" isRound aria-label="Cerrar el tour"
            icon={<FiX />} onClick={cerrar} />
        </Flex>

        <Box px={4} pb={4}>
          <Text fontWeight="900" fontSize="15px" mb={1.5} lineHeight="1.3">{paso.titulo}</Text>
          <Text fontSize="12.5px" color={muted} lineHeight="1.65">{paso.texto}</Text>

          <Flex mt={4} gap={2} align="center">
            <Button size="xs" variant="ghost" color={muted} onClick={cerrar}>
              Saltar
            </Button>
            <Box flex={1} />
            {i > 0 && (
              <Button size="sm" variant="outline" rounded="md" leftIcon={<FiArrowLeft />}
                onClick={() => setI((n) => Math.max(n - 1, 0))}>
                Atrás
              </Button>
            )}
            <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700"
              _hover={{ bg: "#e0b010" }}
              rightIcon={ultimo ? <FiCheck /> : <FiArrowRight />}
              onClick={() => (ultimo ? cerrar() : setI((n) => n + 1))}>
              {ultimo ? "Entendido" : "Siguiente"}
            </Button>
          </Flex>
        </Box>
      </Box>
    </Box>,
    document.body
  );
}
