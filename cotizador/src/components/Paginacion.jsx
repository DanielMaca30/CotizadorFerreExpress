/**
 * Paginacion.jsx — controles de página del historial
 * ─────────────────────────────────────────────────────────────────
 * Con listas largas, pintar todas las cotizaciones de golpe es lo que
 * hacía lenta la vista. Aquí se elige cuántas ver (5 por defecto) y se
 * navega de bloque en bloque.
 */
import { memo } from "react";
import {
  Flex, HStack, Text, Button, IconButton, Select, useColorModeValue,
} from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

const FY = "#F9BF20";
const DARK = "#3A3A38";

const PAGE_SIZES = [5, 10, 20, 50];
export const TODAS = 0; // 0 = sin paginar

/** Números de página a mostrar: 1 … (actual-1) actual (actual+1) … última */
function rango(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out = new Set([1, totalPages, page, page - 1, page + 1]);
  const nums = [...out].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const conGaps = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) conGaps.push("…");
    conGaps.push(n);
  });
  return conGaps;
}

export default memo(function Paginacion({
  page, pageSize, total, onPage, onPageSize, size = "sm",
}) {
  const muted  = useColorModeValue("gray.600", "gray.400");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "gray.700");

  const sinPaginar = pageSize === TODAS;
  const totalPages = sinPaginar ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : sinPaginar ? 1 : (page - 1) * pageSize + 1;
  const hasta = sinPaginar ? total : Math.min(total, page * pageSize);

  const ir = (p) => onPage(Math.min(totalPages, Math.max(1, p)));

  return (
    <Flex px={{ base: 3, md: 4 }} py={3} gap={3} align="center" justify="space-between"
      flexWrap="wrap" borderTop="1px solid" borderColor={border}>

      <HStack spacing={2} flex="0 0 auto">
        <Text fontSize="11px" color={muted} whiteSpace="nowrap">Mostrar</Text>
        <Select size="xs" rounded="md" bg={inputBg} focusBorderColor={FY} w="88px"
          value={pageSize}
          aria-label="Cotizaciones por página"
          onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          <option value={TODAS}>Todas</option>
        </Select>
        <Text fontSize="11px" color={muted} whiteSpace="nowrap" display={{ base: "none", sm: "block" }}>
          por página
        </Text>
      </HStack>

      <Text fontSize="11px" color={muted} whiteSpace="nowrap">
        {total === 0
          ? "Sin resultados"
          : <>Mostrando <strong>{desde}–{hasta}</strong> de <strong>{total}</strong></>}
      </Text>

      {!sinPaginar && totalPages > 1 && (
        <HStack spacing={1} flex="0 0 auto">
          <IconButton size={size} variant="ghost" rounded="md" aria-label="Primera página"
            icon={<FiChevronsLeft size={14} />} isDisabled={page <= 1} onClick={() => ir(1)} />
          <IconButton size={size} variant="ghost" rounded="md" aria-label="Página anterior"
            icon={<FiChevronLeft size={14} />} isDisabled={page <= 1} onClick={() => ir(page - 1)} />

          {rango(page, totalPages).map((n, i) =>
            n === "…" ? (
              <Text key={`gap${i}`} fontSize="11px" color={muted} px={1}>…</Text>
            ) : (
              <Button key={n} size={size} minW="30px" px={2} rounded="md"
                fontSize="11px" fontWeight={n === page ? "800" : "500"}
                bg={n === page ? FY : "transparent"}
                color={n === page ? DARK : muted}
                variant={n === page ? "solid" : "ghost"}
                _hover={{ bg: n === page ? "#e0b010" : undefined }}
                aria-current={n === page ? "page" : undefined}
                onClick={() => ir(n)}>
                {n}
              </Button>
            )
          )}

          <IconButton size={size} variant="ghost" rounded="md" aria-label="Página siguiente"
            icon={<FiChevronRight size={14} />} isDisabled={page >= totalPages} onClick={() => ir(page + 1)} />
          <IconButton size={size} variant="ghost" rounded="md" aria-label="Última página"
            icon={<FiChevronsRight size={14} />} isDisabled={page >= totalPages} onClick={() => ir(totalPages)} />
        </HStack>
      )}
    </Flex>
  );
});
