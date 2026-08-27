/**
 * ListaRapidaProductos.jsx — captura rápida en celular y tablet
 * ─────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE: atendiendo en vitrina no hay tiempo de abrir una
 * tarjeta, llenarla, cerrarla y abrir la siguiente. Aquí todos los
 * renglones están SIEMPRE abiertos y con las tres casillas que de
 * verdad se usan a la vista: qué, cuántos y a cómo.
 *
 * Lo que hace que sea rápido:
 *   · Nada que abrir ni cerrar: se escribe de corrido.
 *   · La casilla de "siguiente" del teclado del celular encadena
 *     producto → cantidad → precio → producto de la fila siguiente.
 *   · Cuando se llena el último renglón aparece otro solo: no hay
 *     que buscar el botón "+" entre producto y producto.
 *   · Cantidad y precio abren el teclado numérico del teléfono.
 *   · Tocar una sugerencia llena descripción, precio y unidad de un
 *     golpe y deja el cursor en la cantidad.
 *
 * Lo que se usa poco (unidad rara, referencia, descuento por línea,
 * transporte sin IVA, duplicar, borrar) vive en el botón "⋯" de cada
 * renglón, para no estorbar.
 */
import { memo, useCallback, useEffect, useRef } from "react";
import {
  Box, Flex, HStack, Text, Input, Select, Icon, IconButton, Button,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider, Badge,
  useColorModeValue, Divider,
} from "@chakra-ui/react";
import {
  FiPlus, FiTruck, FiCopy, FiTrash2, FiMoreVertical, FiTag, FiPercent,
} from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import AutocompleteInput from "./AutocompleteInput";
import SelectUnidad from "./SelectUnidad";
import { money, calcRow, UNITS, formatPriceCO, parsePriceCO } from "../utils";

const FY = "#F9BF20";
const DARK = "#3A3A38";

/** Lleva el cursor a otra casilla de la lista rápida.
    La descripción la dibuja AutocompleteInput y trae sus propios
    atributos (data-row-id / data-field); las demás llevan data-rapida. */
function enfocar(rowId, campo) {
  const sel = campo === "desc"
    ? `[data-row-id="${rowId}"][data-field="desc"]`
    : `[data-rapida="${rowId}-${campo}"]`;
  /* OJO: la app dibuja la misma casilla más de una vez (una para celular
     y otra para tablet), y solo una está a la vista. Hay que quedarse con
     la visible; si se toma la primera del documento, el cursor se va a un
     campo escondido y da la impresión de que el "siguiente" no funciona. */
  const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
  if (!el) return false;
  el.focus();
  try { el.select?.(); } catch { /* algunos campos no lo soportan */ }
  return true;
}

/* ─── Precio con puntos de miles, para dedo y teclado numérico ─── */
const PrecioRapido = memo(function PrecioRapido({ rowId, value, onChange, onSiguiente, inputBg, border, sinIva }) {
  const ref = useRef(null);
  const display = formatPriceCO(value);
  const muted = useColorModeValue("gray.400", "gray.500");
  return (
    <Flex align="center" flex={1} minW={0} bg={inputBg} rounded="lg"
      border="1px solid" borderColor={border} px={2.5} h="44px"
      _focusWithin={{ borderColor: FY, boxShadow: `0 0 0 1px ${FY}` }}>
      <Text fontSize="13px" color={muted} mr={1} flexShrink={0}>$</Text>
      <Input
        ref={ref}
        data-rapida={`${rowId}-price`}
        data-row-id={rowId}
        data-field="price"
        variant="unstyled"
        value={display}
        onChange={(e) => {
          const raw = parsePriceCO(e.target.value);
          if (raw === "" || /^\d+$/.test(raw)) onChange(raw);
        }}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSiguiente(); } }}
        inputMode="numeric"
        enterKeyHint="next"
        placeholder={sinIva ? "Precio sin IVA" : "Precio"}
        fontSize="15px" fontWeight="700" textAlign="right"
        h="44px"
      />
    </Flex>
  );
});

/* ═══════════════ Un renglón ═══════════════ */
const FilaRapida = memo(function FilaRapida({
  r, index, esObra, cotConfig, inputBg, border, puedeBorrar,
  upItem, removeItem, duplicateItem, toggleSinIva,
  getSugerencias, onAceptarSugerencia, onSiguienteFila,
  startRowDrag, dragId,
}) {
  const arrastrando = dragId === r.id;
  const siguienteDeEsta = useCallback(() => onSiguienteFila(r.id), [onSiguienteFila, r.id]);
  const cambiarPrecio = useCallback((val) => upItem(r.id, "price", val), [upItem, r.id]);
  const conDatos = !!(r.desc || r.price);
  const total = calcRow(r);
  const cardBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.500", "gray.400");
  const totalC = useColorModeValue("gray.700", "whiteAlpha.900");

  return (
    <Box
      data-drag-row={r.id}
      bg={cardBg}
      border="1px solid"
      borderColor={arrastrando ? FY : border}
      rounded="xl"
      px={2.5} py={2.5} mb={2}
      style={{ position: "relative", zIndex: arrastrando ? 3 : "auto" }}
      boxShadow={arrastrando ? "0 8px 22px rgba(0,0,0,0.18)" : "0 1px 3px rgba(0,0,0,0.05)"}
      /* Los renglones que no están a la vista no se maquetan ni se pintan:
         con un pedido largo eso es la mayor parte del trabajo del navegador. */
      sx={{ contentVisibility: "auto", containIntrinsicSize: "0 118px" }}
    >
      {/* Línea 1 — qué es */}
      <Flex align="center" gap={2}>
        <Box
          as="span"
          onPointerDown={(e) => startRowDrag(e, r.id)}
          title="Arrastrar para reordenar"
          flexShrink={0}
          style={{ touchAction: "none", display: "flex", alignItems: "center", padding: "6px 2px" }}
          color={useColorModeValue("gray.300", "gray.600")}
        >
          <Icon as={MdDragIndicator} boxSize={4} />
        </Box>

        <Flex flexShrink={0} w="22px" h="22px" rounded="full" align="center" justify="center"
          bg={conDatos ? FY : "transparent"} border={conDatos ? "none" : "1px solid"} borderColor={border}>
          <Text fontSize="10px" fontWeight="800" color={conDatos ? DARK : muted}>{index + 1}</Text>
        </Flex>

        {/* El manejador de Enter va en la caja de afuera, NO dentro de
            AutocompleteInput: si la lista de sugerencias está abierta,
            ese componente se queda con la tecla (y acepta la sugerencia);
            si está cerrada, la tecla rebota hasta aquí y pasamos a la
            cantidad. Así el "siguiente" del teclado hace lo correcto en
            los dos casos. */}
        <Box flex={1} minW={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); enfocar(r.id, "qty"); }
          }}>
          <AutocompleteInput
            value={r.desc}
            onChange={(val) => upItem(r.id, "desc", val)}
            onAccept={(sug) => onAceptarSugerencia(r.id, sug)}
            getSugerencias={getSugerencias}
            dataRowId={r.id}
            inputBg={inputBg}
            FY={FY}
            data-rapida={`${r.id}-desc`}
            placeholder={esObra ? "Actividad o material…" : "¿Qué producto?"}
            variant="unstyled"
            bg={inputBg}
            border="1px solid"
            borderColor={border}
            rounded="lg"
            px={3}
            h="44px"
            fontSize="15px"
            fontWeight="600"
            enterKeyHint="next"
          />
        </Box>

        {/* BORRAR, A UN SOLO TOQUE.
            Estaba escondido dentro del menú: abrir el menú, buscar
            "Eliminar", tocarlo. Dos toques y una espera para lo que en el
            mostrador se hace todo el tiempo (el cliente cambia de opinión).
            Ahora está en el renglón, y el aviso que sale trae "Deshacer"
            por si el dedo se fue donde no era. */}
        <IconButton variant="ghost" rounded="lg" flexShrink={0}
          h="44px" minW="40px" w="40px" color="red.400"
          _hover={{ bg: "red.50", color: "red.500" }}
          _active={{ bg: "red.100" }}
          aria-label={r.desc ? `Eliminar ${r.desc}` : "Eliminar este renglón"}
          title="Eliminar este renglón"
          isDisabled={!puedeBorrar}
          icon={<FiTrash2 size={17} />}
          onClick={() => removeItem(r.id)} />

        {/* Menú de lo que se usa poco */}
        <Menu isLazy placement="bottom-end">
          <MenuButton as={IconButton} variant="ghost" rounded="lg" flexShrink={0}
            h="44px" minW="40px" w="40px"
            aria-label="Más opciones del producto" icon={<FiMoreVertical />} />
          <MenuList fontSize="14px" minW="220px" zIndex={400}>
            <Box px={3} py={2}>
              <Text fontSize="10px" fontWeight="800" color={muted} letterSpacing="0.06em" mb={1.5}>
                CÓDIGO / REFERENCIA
              </Text>
              <Input size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
                value={r.ref || ""} placeholder="—"
                onChange={(e) => upItem(r.id, "ref", e.target.value)} />
            </Box>
            <Box px={3} pb={2}>
              <Text fontSize="10px" fontWeight="800" color={muted} letterSpacing="0.06em" mb={1.5}>
                DESCUENTO DE ESTE PRODUCTO (%)
              </Text>
              <Input size="sm" rounded="md" bg={inputBg} focusBorderColor={FY}
                type="number" min="0" max="100" inputMode="numeric"
                value={r.disc} onChange={(e) => upItem(r.id, "disc", e.target.value)} />
            </Box>
            <MenuDivider />
            {!esObra && (
              <MenuItem icon={<FiTruck />} onClick={() => toggleSinIva(r.id)}>
                {r.sinIva ? "Cobrarle IVA a este renglón" : "Es transporte (sin IVA)"}
              </MenuItem>
            )}
            <MenuItem icon={<FiCopy />} onClick={() => duplicateItem(r.id)}>
              Duplicar este producto
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* Línea 2 — cuántos y a cómo */}
      <Flex align="center" gap={2} mt={2} pl={{ base: "30px", sm: "30px" }}>
        <Input
          data-rapida={`${r.id}-qty`}
          data-row-id={r.id}
          data-field="qty"
          value={r.qty}
          onChange={(e) => upItem(r.id, "qty", e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enfocar(r.id, "price"); } }}
          type="number" min="1" inputMode="numeric" enterKeyHint="next"
          w="66px" flexShrink={0} h="44px" rounded="lg" bg={inputBg}
          border="1px solid" borderColor={border} focusBorderColor={FY}
          textAlign="center" fontSize="15px" fontWeight="700" px={1}
        />
        <SelectUnidad
          value={r.unit}
          onChange={(e) => upItem(r.id, "unit", e.target.value)}
          w="82px" flexShrink={0} h="44px" rounded="lg" bg={inputBg}
          border="1px solid" borderColor={border} focusBorderColor={FY}
          fontSize="13px"
        />

        <PrecioRapido
          rowId={r.id}
          value={r.price}
          onChange={cambiarPrecio}
          onSiguiente={siguienteDeEsta}
          inputBg={inputBg}
          border={border}
          sinIva={r.sinIva}
        />
      </Flex>

      {/* Línea 3 — el total de este renglón, solo cuando ya hay precio */}
      {(parseFloat(r.price) > 0 || r.sinIva || parseFloat(r.disc) > 0) && (
        <Flex align="center" justify="space-between" mt={2} pl="30px" gap={2}>
          <HStack spacing={1.5} flexWrap="wrap">
            {r.sinIva && !esObra && (
              <Badge colorScheme="blue" rounded="full" fontSize="9px" px={2}>
                <Icon as={FiTruck} boxSize={2.5} mr={1} mb="-1px" />SIN IVA
              </Badge>
            )}
            {parseFloat(r.disc) > 0 && (
              <Badge colorScheme="red" rounded="full" fontSize="9px" px={2}>
                <Icon as={FiPercent} boxSize={2.5} mr={1} mb="-1px" />{r.disc}% desc.
              </Badge>
            )}
            {r.ref && (
              <Badge colorScheme="gray" rounded="full" fontSize="9px" px={2}>
                <Icon as={FiTag} boxSize={2.5} mr={1} mb="-1px" />{r.ref}
              </Badge>
            )}
          </HStack>
          <Text fontSize="14px" fontWeight="800" color={totalC} whiteSpace="nowrap"
            fontVariantNumeric="tabular-nums">
            {money(total, cotConfig.moneda)}
          </Text>
        </Flex>
      )}

    </Box>
  );
});

/* ═══════════════ La lista ═══════════════ */
export default function ListaRapidaProductos({
  items, esObra, cotConfig, inputBg, border,
  upItem, removeItem, duplicateItem, toggleSinIva,
  addItem, addItemSilencioso, addTransporte, getSugerencias, handleAcceptSugerencia,
  startRowDrag, dragId,
}) {
  const muted = useColorModeValue("gray.500", "gray.400");

  /* Enter en el precio: pasa al producto siguiente y, si era el
     último, crea uno nuevo y salta a él. Es el gesto que encadena
     todo el pedido sin levantar la mano del teclado. */
  /* La lista viva se lee de una referencia, NO de la dependencia.
     Si esta función dependiera de `items` se recrearía con cada tecla, y
     como va a parar a cada renglón, rompería su memoización: escribir una
     letra repintaría los 45 productos en vez de uno. */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onSiguienteFila = useCallback((rowId) => {
    const lista = itemsRef.current;
    const idx = lista.findIndex((r) => r.id === rowId);
    const siguiente = lista[idx + 1];
    if (siguiente) {
      enfocar(siguiente.id, "desc");
    } else {
      addItem();   // addItem ya deja el cursor en la descripción de la fila nueva
    }
  }, [addItem]);

  /* Renglón nuevo automático: si el último ya tiene datos, se agrega
     otro sin que nadie lo pida. Así no hay que buscar el botón "+"
     entre producto y producto.
     Ojo: addItemSilencioso NO mueve el cursor — el dedo sigue donde
     estaba y el renglón nuevo solo queda esperando abajo. */
  const ultimo = items[items.length - 1];
  const ultimoLleno = !!(ultimo && (ultimo.desc?.trim() || parseFloat(ultimo.price) > 0));
  useEffect(() => {
    if (ultimoLleno) addItemSilencioso();
  }, [ultimoLleno, addItemSilencioso]);

  const conDatos = items.filter((r) => r.desc || r.price).length;

  return (
    <Box>
      <Box px={2.5} pt={2.5}>
        {items.map((r, i) => (
          <FilaRapida
            key={r.id}
            r={r}
            index={i}
            esObra={esObra}
            cotConfig={cotConfig}
            inputBg={inputBg}
            border={border}
            puedeBorrar={items.length > 1}
            upItem={upItem}
            removeItem={removeItem}
            duplicateItem={duplicateItem}
            toggleSinIva={toggleSinIva}
            getSugerencias={getSugerencias}
            onAceptarSugerencia={handleAcceptSugerencia}
            onSiguienteFila={onSiguienteFila}
            startRowDrag={startRowDrag}
            dragId={dragId}
          />
        ))}
      </Box>

      <Divider my={1} />

      {/* Espacio a la derecha en celular: ahí flota el botón de ayuda y
          si no se reserva, le tapa la esquina al botón de Domicilio. */}
      <Flex px={2.5} py={2.5} gap={2} align="center" pr={{ base: "62px", md: 2.5 }}>
        <Button flex={1} size="md" h="44px" variant="outline" rounded="xl"
          leftIcon={<FiPlus />} onClick={addItem} fontWeight="700" fontSize="14px">
          Producto
        </Button>
        {!esObra && (
          <Button flex={1} size="md" h="44px" variant="outline" rounded="xl"
            data-tour="btn-transporte"
            colorScheme="blue" leftIcon={<FiTruck />} onClick={addTransporte}
            fontWeight="700" fontSize="14px">
            Domicilio
          </Button>
        )}
      </Flex>

      <Text fontSize="10.5px" color={muted} px={4} pb={3} textAlign="center">
        {conDatos === 0
          ? "Escribe el producto y sigue con la cantidad y el precio."
          : `${conDatos} ${conDatos === 1 ? "producto" : "productos"} · usa “siguiente” del teclado para encadenar`}
      </Text>
    </Box>
  );
}
