/**
 * TrazabilidadTimeline.jsx
 * ─────────────────────────────────────────────────────────────
 * Muestra el historial completo de acciones sobre una cotización:
 * cuándo se creó, cuándo se guardó, si se imprimió, si se envió
 * por WhatsApp, si el estado cambió, si fue firmada, etc.
 * ─────────────────────────────────────────────────────────────
 */
import {
  Box, VStack, HStack, Text, Badge, Divider, Collapse, Button,
  useColorModeValue, Circle,
} from "@chakra-ui/react";
import { useState } from "react";
import { EVENTO_TIPOS } from "../utils";

/* Colores por tipo de evento */
const COLOR_MAP = {
  green:  { light: "green.500",  dark: "green.300",  bg: "green.50",   dbg: "green.900"  },
  blue:   { light: "blue.500",   dark: "blue.300",   bg: "blue.50",    dbg: "blue.900"   },
  purple: { light: "purple.500", dark: "purple.300", bg: "purple.50",  dbg: "purple.900" },
  gray:   { light: "gray.500",   dark: "gray.400",   bg: "gray.50",    dbg: "gray.800"   },
  orange: { light: "orange.500", dark: "orange.300", bg: "orange.50",  dbg: "orange.900" },
  teal:   { light: "teal.500",   dark: "teal.300",   bg: "teal.50",    dbg: "teal.900"   },
  red:    { light: "red.500",    dark: "red.300",    bg: "red.50",     dbg: "red.900"    },
};

function fmtFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const hoy  = new Date();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const mismoAnio = d.getFullYear() === hoy.getFullYear();

  const hora = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString())  return `Hoy ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;

  return d.toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: mismoAnio ? undefined : "numeric"
  }) + ` ${hora}`;
}

function EventoItem({ evento, isLast }) {
  const info = EVENTO_TIPOS[evento.tipo] || { label: evento.tipo, icon: "•", color: "gray" };
  const cm   = COLOR_MAP[info.color] || COLOR_MAP.gray;

  const dotColor  = useColorModeValue(cm.light, cm.dark);
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const lineColor = useColorModeValue("gray.200", "gray.600");

  return (
    <HStack align="flex-start" spacing={3} w="full">
      {/* Línea vertical + punto */}
      <VStack spacing={0} align="center" flexShrink={0} w="20px">
        <Circle size="20px" bg={dotColor} flexShrink={0}>
          <Text fontSize="9px" color="white" fontWeight="900" lineHeight="1">
            {info.icon}
          </Text>
        </Circle>
        {!isLast && <Box w="1.5px" flex="1" minH="16px" bg={lineColor} />}
      </VStack>

      {/* Contenido */}
      <Box pb={isLast ? 0 : 3} flex="1" minW={0}>
        <Text fontSize="12px" fontWeight="600" color={textColor} lineHeight="1.3">
          {info.label}
        </Text>
        {evento.detalle && (
          <Text fontSize="11px" color={subColor} mt="1px" noOfLines={2}>
            {evento.detalle}
          </Text>
        )}
        <Text fontSize="10px" color={subColor} mt="2px">
          {fmtFecha(evento.fecha)}
        </Text>
      </Box>
    </HStack>
  );
}

export default function TrazabilidadTimeline({ eventos = [], maxVisible = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const headerColor = useColorModeValue("gray.600", "gray.300");

  if (!eventos || eventos.length === 0) {
    return (
      <Box px={3} py={2}>
        <Text fontSize="11px" color={headerColor} fontStyle="italic">
          Sin historial de actividad registrado.
        </Text>
      </Box>
    );
  }

  const ordenados = [...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const visibles  = expanded ? ordenados : ordenados.slice(0, maxVisible);
  const ocultos   = ordenados.length - maxVisible;

  return (
    <Box>
      <VStack align="stretch" spacing={0} px={1}>
        {visibles.map((ev, i) => (
          <EventoItem
            key={`${ev.tipo}-${ev.fecha}-${i}`}
            evento={ev}
            isLast={i === visibles.length - 1}
          />
        ))}
      </VStack>

      {ocultos > 0 && (
        <Button
          variant="ghost" size="xs" mt={1} ml={1}
          color={headerColor}
          onClick={() => setExpanded(!expanded)}
          fontWeight="500" fontSize="11px"
        >
          {expanded ? "Ver menos" : `Ver ${ocultos} evento${ocultos > 1 ? "s" : ""} anterior${ocultos > 1 ? "es" : ""}`}
        </Button>
      )}
    </Box>
  );
}
