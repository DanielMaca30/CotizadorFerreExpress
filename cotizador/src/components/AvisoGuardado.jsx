/**
 * AvisoGuardado.jsx — barra de aviso cuando algo no se pudo guardar
 * ─────────────────────────────────────────────────────────────────
 * Antes, si el almacenamiento del navegador se llenaba o fallaba la subida
 * a la nube, el error solo aparecía en la consola del desarrollador: quien
 * estaba cotizando creía que su trabajo quedó guardado. Un fallo de guardado
 * silencioso es de los peores defectos posibles en una herramienta de
 * captura de datos, así que aquí se muestra en pantalla y no se va solo.
 */
import { Alert, AlertIcon, AlertDescription, Box, CloseButton, Text } from "@chakra-ui/react";
import { useCotizaciones } from "../context/cotizacionesContext";

export default function AvisoGuardado() {
  const { errorGuardado, descartarErrorGuardado } = useCotizaciones();
  if (!errorGuardado) return null;

  return (
    <Alert status="error" variant="solid" py={2} px={4} position="sticky" top={0} zIndex={300}>
      <AlertIcon boxSize={4} />
      <Box flex={1}>
        <AlertDescription fontSize="13px" fontWeight="600">
          {errorGuardado}
        </AlertDescription>
        <Text fontSize="11px" opacity={0.85}>
          Descarga el PDF de lo que estés haciendo antes de cerrar, para no perderlo.
        </Text>
      </Box>
      <CloseButton size="sm" onClick={descartarErrorGuardado} />
    </Alert>
  );
}
