/**
 * RecorridoGuiado.jsx — enseñar haciendo, sobre la pantalla real
 * ─────────────────────────────────────────────────────────────────
 * Resalta el botón o la casilla de verdad, explica qué hace, y cuando el
 * paso pide una acción ESPERA a que la persona la haga ella misma. No
 * toca nada por debajo: quien aprende es quien hace.
 *
 * Cómo se usa desde cualquier parte de la app:
 *     import { iniciarRecorrido } from "./RecorridoGuiado";
 *     iniciarRecorrido("cotizacion");
 *
 * Detalles que importan:
 *  · El hueco de la capa oscura deja pasar los toques al elemento que
 *    está debajo (con clip-path el navegador no recibe el clic en la
 *    zona recortada), así que la persona interactúa de verdad.
 *  · Mientras hay un recorrido en marcha la capa NO se cierra al tocar
 *    por fuera: sería fatal perder el hilo por un toque de más.
 *  · Si un elemento no aparece, el paso se salta solo. Nunca deja a
 *    nadie trabado señalando algo que no está en esta pantalla.
 *  · Siempre hay botón "Siguiente": si alguien no encuentra qué tocar,
 *    puede avanzar igual.
 */
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Box, Flex, HStack, Text, Button, IconButton, Badge, Icon, useColorModeValue,
} from "@chakra-ui/react";
import { FiX, FiArrowRight, FiArrowLeft, FiCheck, FiTarget } from "react-icons/fi";
import { getRecorrido } from "../ayuda/recorridos";

const FY = "#F9BF20";
const DARK = "#3A3A38";
const VISTO_KEY = "ferreexpress_tour_visto_v1";
const EVENTO = "ferreexpress:recorrido";

/** Arranca un recorrido por su id (ver src/ayuda/recorridos.js) */
export function iniciarRecorrido(id = "inicio") {
  try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { id } }));
}

/** Compatibilidad con el nombre anterior */
export const reiniciarTour = () => iniciarRecorrido("inicio");

const yaVisto = () => {
  try { return localStorage.getItem(VISTO_KEY) === "1"; } catch { return true; }
};

/** El primer elemento del selector que esté realmente a la vista */
const buscarVisible = (sel) => {
  if (!sel) return null;
  try {
    return [...document.querySelectorAll(sel)].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) || null;
  } catch { return null; }
};

export default function RecorridoGuiado({ autoIniciar = false }) {
  const navigate = useNavigate();
  const [recorrido, setRecorrido] = useState(null);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState(null);
  const [hecho, setHecho] = useState(false);      // la acción del paso ya se hizo
  const [terminado, setTerminado] = useState(false);
  const avanzando = useRef(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.400");
  const pistaBg = useColorModeValue("yellow.50", "whiteAlpha.100");

  const paso = recorrido?.pasos?.[i] || null;
  const ultimo = recorrido ? i === recorrido.pasos.length - 1 : false;

  /* ── Arranque automático la primera vez ── */
  useEffect(() => {
    if (!autoIniciar || yaVisto()) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
      setRecorrido(getRecorrido("inicio"));
      setI(0);
      setTerminado(false);
    }, 900);
    return () => clearTimeout(t);
  }, [autoIniciar]);

  /* ── Arranque a pedido (ayuda, asistente, guía) ── */
  useEffect(() => {
    const h = (e) => {
      const r = getRecorrido(e.detail?.id || "inicio");
      if (!r) return;
      setRecorrido(r);
      setI(0);
      setHecho(false);
      setTerminado(false);
    };
    window.addEventListener(EVENTO, h);
    return () => window.removeEventListener(EVENTO, h);
  }, []);

  const cerrar = useCallback(() => {
    setRecorrido(null);
    setCaja(null);
    setTerminado(false);
    try { localStorage.setItem(VISTO_KEY, "1"); } catch { /* noop */ }
  }, []);

  const siguiente = useCallback(() => {
    if (avanzando.current) return;
    avanzando.current = true;
    setHecho(false);
    setI((n) => {
      const total = recorrido?.pasos.length || 0;
      if (n + 1 >= total) { setTerminado(true); return n; }
      return n + 1;
    });
    setTimeout(() => { avanzando.current = false; }, 250);
  }, [recorrido]);

  const atras = useCallback(() => {
    setHecho(false);
    setTerminado(false);
    setI((n) => Math.max(0, n - 1));
  }, []);

  /* ── Navegar si el paso lo pide ── */
  useEffect(() => {
    if (!paso?.ruta) return;
    if (window.location.pathname !== paso.ruta) navigate(paso.ruta);
  }, [paso, navigate]);

  /* ── Encontrar y resaltar el elemento del paso ── */
  useLayoutEffect(() => {
    if (!recorrido || terminado) return;
    if (!paso) return;
    if (!paso.sel) { setCaja(null); return; }

    let vivo = true;
    const buscar = (intento = 0) => {
      if (!vivo) return;
      const el = buscarVisible(paso.sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (!vivo) return;
          const r = el.getBoundingClientRect();
          setCaja({ top: r.top, left: r.left, w: r.width, h: r.height });
        }, 240);
        return;
      }
      if (intento < 12) { setTimeout(() => buscar(intento + 1), 200); return; }
      /* No apareció: si el paso es opcional o pedía una acción, se sigue
         de largo; si no, al menos se muestra el texto sin resaltado. */
      setCaja(null);
      if (paso.opcional) siguiente();
    };
    buscar();
    return () => { vivo = false; };
  }, [paso, recorrido, terminado, siguiente]);

  /* ── Esperar a que la persona HAGA la acción ── */
  useEffect(() => {
    if (!paso?.accion || !paso.sel || terminado) return;
    const el = buscarVisible(paso.sel);
    if (!el) return;

    let vivo = true;
    const listo = () => {
      if (!vivo) return;
      setHecho(true);
      /* Se le da un respiro a la app para que reaccione (abrir un modal,
         cambiar de pestaña) y se comprueba lo que el paso espera ver. */
      setTimeout(() => {
        if (!vivo) return;
        if (paso.espera) {
          let intentos = 0;
          const revisar = () => {
            if (!vivo) return;
            if (buscarVisible(paso.espera) || intentos > 15) { siguiente(); return; }
            intentos++;
            setTimeout(revisar, 200);
          };
          revisar();
        } else {
          siguiente();
        }
      }, paso.accion === "escribir" ? 900 : 420);
    };

    if (paso.accion === "clic") {
      el.addEventListener("click", listo, { once: true });
      return () => { vivo = false; el.removeEventListener("click", listo); };
    }

    if (paso.accion === "escribir") {
      let t = null;
      const alEscribir = (ev) => {
        const v = ev.target?.value ?? "";
        clearTimeout(t);
        if (String(v).trim().length >= 1) t = setTimeout(listo, 700);
      };
      el.addEventListener("input", alEscribir);
      return () => { vivo = false; clearTimeout(t); el.removeEventListener("input", alEscribir); };
    }
    return () => { vivo = false; };
  }, [paso, siguiente, terminado]);

  /* ── Recalcular el recuadro al mover o redimensionar ──
     Dos cuidados que importan para que el recorrido no frene la app:
     · Solo se cambia el estado si el recuadro SE MOVIÓ de verdad. Antes
       se reemplazaba el objeto cada 600 ms aunque estuviera igual, y eso
       repintaba el recorrido entero sin motivo.
     · El desplazamiento se atiende una vez por fotograma, no en cada uno
       de los cientos de eventos que dispara arrastrar una lista larga. */
  useEffect(() => {
    if (!recorrido || !paso?.sel) return;
    let pendiente = false;
    const recalcular = () => {
      const el = buscarVisible(paso.sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCaja((prev) => {
        if (prev
          && Math.abs(prev.top - r.top) < 1 && Math.abs(prev.left - r.left) < 1
          && Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1) {
          return prev;                     // no se movió: no repintar
        }
        return { top: r.top, left: r.left, w: r.width, h: r.height };
      });
    };
    const alMover = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; recalcular(); });
    };
    window.addEventListener("resize", alMover);
    window.addEventListener("scroll", alMover, true);
    const iv = setInterval(recalcular, 700);   // la app se mueve sola al escribir
    return () => {
      window.removeEventListener("resize", alMover);
      window.removeEventListener("scroll", alMover, true);
      clearInterval(iv);
    };
  }, [paso, recorrido]);

  /* ── Teclado ── */
  useEffect(() => {
    if (!recorrido) return;
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [recorrido, cerrar]);

  if (!recorrido) return null;

  /* ── Colocación de la tarjeta ── */
  const M = 14;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const ANCHO = Math.min(370, vw - 24);
  const ALTO_APROX = 235;
  let estilo = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (caja && !terminado) {
    const abajo = caja.top + caja.h + M;
    const cabeAbajo = abajo + ALTO_APROX < vh;
    const top = cabeAbajo ? abajo : Math.max(M, caja.top - ALTO_APROX - M);
    let left = caja.left + caja.w / 2 - ANCHO / 2;
    left = Math.max(12, Math.min(left, vw - ANCHO - 12));
    estilo = { top: `${top}px`, left: `${left}px`, transform: "none" };
  }

  const pideAccion = !!paso?.accion && !hecho && !terminado;

  return createPortal(
    <Box position="fixed" inset={0} zIndex={3000} sx={{ pointerEvents: "none" }}>
      {/* Capa oscura SOLO decorativa: nunca recibe toques.
          Antes tenía pointerEvents "auto" y el recorte dejaba pasar el clic
          únicamente por el hueco. El problema: los pasos que no señalan nada
          (por ejemplo «Los tres datos obligatorios», que pide llenar el
          cliente) no tienen hueco, así que la capa tapaba la pantalla
          entera y no se podía escribir NADA. Con la capa desactivada, la
          aplicación siempre se puede usar mientras el recorrido acompaña. */}
      <Box position="absolute" inset={0} bg="blackAlpha.600"
        sx={{ pointerEvents: "none" }}
        style={
          caja && !terminado
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

      {/* Marco sobre el elemento — late suave cuando falta que lo toquen */}
      {caja && !terminado && (
        <Box position="absolute" rounded="lg" border="3px solid"
          borderColor={hecho ? "green.400" : FY}
          boxShadow={`0 0 0 4px ${hecho ? "#48BB7844" : FY + "44"}`}
          top={`${caja.top - 6}px`} left={`${caja.left - 6}px`}
          w={`${caja.w + 12}px`} h={`${caja.h + 12}px`}
          sx={{
            pointerEvents: "none",
            transition: "all 0.2s ease",
            animation: pideAccion ? "latido 1.6s ease-in-out infinite" : "none",
            "@keyframes latido": {
              "0%, 100%": { boxShadow: `0 0 0 4px ${FY}44` },
              "50%": { boxShadow: `0 0 0 10px ${FY}22` },
            },
          }} />
      )}

      {/* Tarjeta */}
      <Box position="absolute" style={estilo} w={`${ANCHO}px`}
        bg={cardBg} rounded="xl" boxShadow="0 12px 40px rgba(0,0,0,0.35)"
        sx={{ pointerEvents: "auto", transition: "top 0.25s ease, left 0.25s ease" }}>

        <Flex align="center" justify="space-between" px={4} pt={3.5} pb={1} gap={2}>
          <HStack spacing={1} flex={1} minW={0}>
            {recorrido.pasos.map((_, n) => (
              <Box key={n} w={n === i && !terminado ? "16px" : "5px"} h="5px" rounded="full"
                bg={terminado || n < i ? "green.300" : n === i ? FY : "gray.300"}
                transition="all 0.2s" flexShrink={0} />
            ))}
          </HStack>
          <IconButton size="xs" variant="ghost" isRound aria-label="Cerrar la guía"
            icon={<FiX />} onClick={cerrar} />
        </Flex>

        <Box px={4} pb={4}>
          {terminado ? (
            <>
              <Text fontWeight="900" fontSize="15px" mb={1.5}>¡Listo!</Text>
              <Text fontSize="12.5px" color={muted} lineHeight="1.65">
                Terminaste «{recorrido.titulo}». Puedes repetirlo cuando quieras desde el
                botón de ayuda.
              </Text>
              <Flex mt={4} gap={2}>
                {recorrido.siguiente && (
                  <Button size="sm" bg={FY} color={DARK} rounded="md" fontWeight="700" flex={1}
                    _hover={{ bg: "#e0b010" }} rightIcon={<FiArrowRight />}
                    onClick={() => iniciarRecorrido(recorrido.siguiente)}>
                    {recorrido.siguienteTexto || "Continuar"}
                  </Button>
                )}
                <Button size="sm" variant={recorrido.siguiente ? "outline" : "solid"}
                  bg={recorrido.siguiente ? undefined : FY}
                  color={recorrido.siguiente ? undefined : DARK}
                  rounded="md" fontWeight="700" flex={recorrido.siguiente ? undefined : 1}
                  onClick={cerrar}>
                  Cerrar
                </Button>
              </Flex>
            </>
          ) : (
            <>
              <Text fontWeight="900" fontSize="15px" mb={1.5} lineHeight="1.3">
                {paso?.titulo}
              </Text>
              <Text fontSize="12.5px" color={muted} lineHeight="1.65">{paso?.texto}</Text>

              {/* Lo que hay que hacer ahora */}
              {paso?.pista && (
                <Flex align="center" gap={2} mt={3} px={3} py={2} rounded="lg"
                  bg={hecho ? "green.50" : pistaBg}>
                  {hecho ? (
                    <>
                      <Icon as={FiCheck} color="green.500" boxSize={4} flexShrink={0} />
                      <Text fontSize="12px" fontWeight="700" color="green.600">
                        ¡Eso es! Seguimos…
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon as={FiTarget} color="orange.400" boxSize={4} flexShrink={0} />
                      <Text fontSize="12px" fontWeight="700">{paso.pista}</Text>
                    </>
                  )}
                </Flex>
              )}

              <Flex mt={4} gap={2} align="center">
                <Button size="xs" variant="ghost" color={muted} onClick={cerrar}>Salir</Button>
                <Box flex={1} />
                {i > 0 && (
                  <Button size="sm" variant="outline" rounded="md" leftIcon={<FiArrowLeft />}
                    onClick={atras}>
                    Atrás
                  </Button>
                )}
                <Button size="sm" bg={pideAccion ? "transparent" : FY}
                  variant={pideAccion ? "outline" : "solid"}
                  color={pideAccion ? muted : DARK}
                  rounded="md" fontWeight="700"
                  _hover={pideAccion ? {} : { bg: "#e0b010" }}
                  rightIcon={ultimo ? <FiCheck /> : <FiArrowRight />}
                  onClick={siguiente}>
                  {pideAccion ? "Saltar paso" : ultimo ? "Terminar" : "Siguiente"}
                </Button>
              </Flex>
            </>
          )}
        </Box>

        {/* Nombre del recorrido, para no perder el hilo */}
        <Flex px={4} pb={3} pt={0}>
          <Badge colorScheme="gray" rounded="full" fontSize="9px" px={2} textTransform="none">
            {recorrido.titulo}
          </Badge>
        </Flex>
      </Box>
    </Box>,
    document.body
  );
}
