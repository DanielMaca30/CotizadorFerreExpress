/**
 * EscanerCodigo.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Lee códigos de barras de tres formas, según el equipo:
 *
 *  · COMPUTADOR → modo "pistola": una casilla lista para que la
 *    pistola lectora (o la persona) escriba el código y dé Enter.
 *    La cámara web queda como opción secundaria.
 *
 *  · CELULAR MODERNO (Android Chrome, iPhone con iOS 17+) → cámara
 *    con el lector nativo del sistema (BarcodeDetector): rápido y
 *    sin descargar nada.
 *
 *  · CUALQUIER OTRO CELULAR (iPhone con iOS 16 o menos, navegadores
 *    sin lector nativo) → cámara con un lector en JavaScript (ZXing)
 *    que se descarga solo cuando hace falta. Funciona en todos; con
 *    iOS 17+ simplemente es más rápido.
 *
 *  En todos los casos se puede escribir el código a mano.
 *  Al leer un código llama onDetected(codigo) y se cierra.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent,
  Button, Box, Text, HStack, Badge, VStack, Input, IconButton,
} from '@chakra-ui/react';
import { FiCamera, FiX, FiHash } from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

const FY   = '#F9BF20';
const DARK = '#3A3A38';

/* Formatos de código de barras comunes en ferretería */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'code_93', 'itf'];

const esTactil = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(pointer: coarse)').matches;

const hayCamara = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export default function EscanerCodigo({ isOpen, onClose, onDetected }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);
  const zxingRef    = useRef(null);   // controles del lector ZXing (respaldo)
  const leidoRef    = useRef(false);  // evita leer dos veces el mismo disparo
  const sesionRef   = useRef(0);      // invalida arranques viejos si se cierra rápido

  /* pistola | iniciando | escaneando | error | manual */
  const [estado, setEstado]     = useState('pistola');
  const [motor, setMotor]       = useState('');     // 'nativo' | 'compatible'
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCod, setManualCod] = useState('');

  /* ── Apagar todo lo que use la cámara ── */
  const detener = useCallback(() => {
    sesionRef.current += 1;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    try { zxingRef.current?.stop(); } catch { /* ya estaba detenido */ }
    zxingRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* ── Entregar el código leído ── */
  const entregar = useCallback((cod) => {
    const c = String(cod || '').trim();
    if (!c || leidoRef.current) return;
    leidoRef.current = true;
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    detener();
    onDetected(c);
    setManualCod('');
    onClose();
  }, [detener, onDetected, onClose]);

  /* ── Lector nativo (Android / iOS 17+) ── */
  const usarNativo = useCallback(async (sesion) => {
    if (!('BarcodeDetector' in window)) return false;
    let formatos = FORMATS;
    try {
      const soportados = await window.BarcodeDetector.getSupportedFormats?.();
      if (Array.isArray(soportados)) formatos = FORMATS.filter(f => soportados.includes(f));
    } catch { /* se usan los de la lista */ }
    if (formatos.length === 0) return false;   // existe pero no lee códigos de barras

    let detector;
    try { detector = new window.BarcodeDetector({ formats: formatos }); }
    catch { return false; }                    // lector nativo roto → se usa el compatible
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    if (sesion !== sesionRef.current) { stream.getTracks().forEach(t => t.stop()); return true; }
    streamRef.current = stream;
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();
    setMotor('nativo');
    setEstado('escaneando');

    const ciclo = async () => {
      if (sesion !== sesionRef.current) return;
      if (video.readyState >= 2) {
        try {
          const codigos = await detector.detect(video);
          if (codigos.length > 0 && codigos[0].rawValue) { entregar(codigos[0].rawValue); return; }
        } catch { /* cuadro descartado */ }
      }
      timerRef.current = setTimeout(ciclo, 120);
    };
    ciclo();
    return true;
  }, [entregar]);

  /* ── Lector compatible (ZXing) para el resto de celulares ── */
  const usarCompatible = useCallback(async (sesion) => {
    const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    if (sesion !== sesionRef.current) return;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_93, BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const lector = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

    const controles = await lector.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      videoRef.current,
      (resultado) => { if (resultado) entregar(resultado.getText()); },
    );
    if (sesion !== sesionRef.current) { controles.stop(); return; }
    zxingRef.current = controles;
    setMotor('compatible');
    setEstado('escaneando');
  }, [entregar]);

  /* ── Encender la cámara ── */
  const iniciarCamara = useCallback(async () => {
    detener();
    const sesion = sesionRef.current;
    leidoRef.current = false;
    setErrorMsg('');
    setMotor('');

    if (!hayCamara()) {
      setErrorMsg('Este navegador no deja usar la cámara. Escribe el código abajo.');
      setEstado('error');
      return;
    }
    setEstado('iniciando');
    /* Esperar a que el <video> esté en pantalla */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (sesion !== sesionRef.current || !videoRef.current) return;

    try {
      const ok = await usarNativo(sesion);
      if (!ok) await usarCompatible(sesion);
    } catch (e) {
      if (sesion !== sesionRef.current) return;
      detener();
      const permisos = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError';
      const sinCamara = e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError';
      setErrorMsg(permisos
        ? 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador (Safari/Chrome → Cámara → Permitir) y vuelve a intentar.'
        : sinCamara
          ? 'No se encontró una cámara en este equipo.'
          : 'No se pudo abrir la cámara. Cierra otras apps que la estén usando y vuelve a intentar.');
      setEstado('error');
    }
  }, [detener, usarNativo, usarCompatible]);

  /* ── Al abrir: computador → pistola; celular → cámara ── */
  useEffect(() => {
    if (isOpen) {
      leidoRef.current = false;
      setManualCod('');
      if (esTactil()) iniciarCamara();
      else setEstado('pistola');
    } else {
      detener();
    }
    return () => detener();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarManual = () => entregar(manualCod);
  const cerrar = () => { detener(); onClose(); };
  const irAManual = () => { detener(); setEstado('manual'); };

  const camaraVisible = estado === 'iniciando' || estado === 'escaneando';

  /* Casilla para escribir / disparar la pistola.
     Se llama como función (no como <Componente/>): si fuera un componente
     definido aquí adentro, React lo volvería a crear en cada tecla y la
     casilla perdería el foco a mitad del código. */
  const casillaCodigo = ({ grande = false, autoFocus = false } = {}) => (
    <HStack>
      <Input
        placeholder={grande ? 'Dispara la pistola aquí…' : 'Código de barras…'}
        value={manualCod}
        onChange={e => setManualCod(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarManual(); } }}
        bg="whiteAlpha.100" color="white" border="1px solid" borderColor="whiteAlpha.200"
        focusBorderColor={FY} rounded="lg"
        h={grande ? '56px' : '48px'} fontSize={grande ? '20px' : '16px'} fontWeight="700"
        letterSpacing={grande ? '0.06em' : undefined}
        _placeholder={{ color: 'whiteAlpha.400', fontWeight: 500, letterSpacing: 'normal' }}
        inputMode={grande ? undefined : 'numeric'}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        autoFocus={autoFocus}
      />
      <Button bg={FY} color={DARK} rounded="lg" fontWeight="800"
        h={grande ? '56px' : '48px'} px={5}
        _hover={{ bg: '#e0b010' }}
        isDisabled={!manualCod.trim()}
        onClick={confirmarManual} flexShrink={0}>OK</Button>
    </HStack>
  );

  return (
    <Modal isOpen={isOpen} onClose={cerrar} isCentered size="md" motionPreset="slideInBottom"
      returnFocusOnClose={false}>
      <ModalOverlay backdropFilter="blur(6px)" bg="blackAlpha.700" />
      <ModalContent rounded="2xl" mx={4} overflow="hidden" bg={DARK}>

        {/* ── Cabecera ── */}
        <Box px={5} pt={4} pb={3}>
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              {estado === 'pistola' ? <BiBarcodeReader color={FY} size={18} /> : <FiCamera color={FY} size={16} />}
              <Text color="white" fontWeight="900" fontSize="15px">
                {estado === 'pistola' ? 'Leer código de barras' : 'Escanear código'}
              </Text>
            </HStack>
            <IconButton size="sm" variant="ghost" color="whiteAlpha.700" aria-label="Cerrar"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              onClick={cerrar} rounded="full" icon={<FiX size={18} />} />
          </HStack>
          <Text color="whiteAlpha.600" fontSize="12px" mt={1}>
            {estado === 'pistola'
              ? 'Dispara la pistola lectora o escribe el código y presiona Enter.'
              : estado === 'manual'
                ? 'Escribe los números que aparecen debajo de las barras.'
                : 'Apunta la cámara al código de barras, de lado a lado del marco.'}
          </Text>
        </Box>

        <Box px={4} pb={5}>

          {/* ── PC: pistola ── */}
          {estado === 'pistola' && (
            <VStack spacing={3} align="stretch">
              {casillaCodigo({ grande: true, autoFocus: true })}
              {hayCamara() && (
                <Button variant="ghost" size="sm" color="whiteAlpha.700" rounded="lg"
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  leftIcon={<FiCamera size={14} />} onClick={iniciarCamara}>
                  Usar la cámara web
                </Button>
              )}
            </VStack>
          )}

          {/* ── Cámara ── */}
          {camaraVisible && (
            <>
              <Box position="relative" rounded="xl" overflow="hidden" bg="black"
                h={{ base: '260px', md: '300px' }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  playsInline
                  muted
                  autoPlay
                />
                {estado === 'iniciando' && (
                  <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center"
                    bg="blackAlpha.700">
                    <VStack spacing={2}>
                      <Box w="32px" h="32px" border="3px solid" borderColor={FY}
                        borderTopColor="transparent" rounded="full"
                        style={{ animation: 'fe-spin 0.8s linear infinite' }} />
                      <Text color="whiteAlpha.800" fontSize="12px">Abriendo la cámara…</Text>
                    </VStack>
                  </Box>
                )}
                {estado === 'escaneando' && (
                  <>
                    <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center"
                      pointerEvents="none">
                      <Box w="78%" maxW="280px" h="110px" position="relative">
                        {[
                          { top: 0, left: 0, borderTop: `3px solid ${FY}`, borderLeft: `3px solid ${FY}` },
                          { top: 0, right: 0, borderTop: `3px solid ${FY}`, borderRight: `3px solid ${FY}` },
                          { bottom: 0, left: 0, borderBottom: `3px solid ${FY}`, borderLeft: `3px solid ${FY}` },
                          { bottom: 0, right: 0, borderBottom: `3px solid ${FY}`, borderRight: `3px solid ${FY}` },
                        ].map((s, i) => (
                          <Box key={i} position="absolute" w="22px" h="22px" rounded="sm" {...s} />
                        ))}
                        <Box position="absolute" left="6%" right="6%" top="50%" h="2px" bg="red.400"
                          opacity={0.8} boxShadow="0 0 8px rgba(255,80,80,0.9)" />
                      </Box>
                    </Box>
                    <Box position="absolute" bottom={2} left={0} right={0} textAlign="center">
                      <Badge bg={FY} color={DARK} fontSize="10px" px={3} py={0.5} rounded="full" fontWeight="700">
                        Buscando código…
                      </Badge>
                    </Box>
                  </>
                )}
              </Box>
              {motor === 'compatible' && (
                <Text color="whiteAlpha.500" fontSize="11px" mt={2} textAlign="center">
                  Modo compatible activo. Acerca bien el código y mantén quieto el celular.
                  En iPhone con iOS 17 o superior lee más rápido.
                </Text>
              )}
              <Button mt={3} w="full" h="44px" variant="ghost" color="whiteAlpha.700"
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }} rounded="lg"
                leftIcon={<FiHash size={14} />} onClick={irAManual}>
                ¿No lo lee? Escribir el código
              </Button>
            </>
          )}

          {/* ── Error de cámara ── */}
          {estado === 'error' && (
            <VStack spacing={3} align="stretch">
              <Box bg="red.900" rounded="xl" p={4}>
                <Text color="red.100" fontSize="13px">{errorMsg}</Text>
              </Box>
              {casillaCodigo()}
              {hayCamara() && (
                <Button variant="ghost" size="sm" color="whiteAlpha.700" rounded="lg"
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  leftIcon={<FiCamera size={14} />} onClick={iniciarCamara}>
                  Intentar de nuevo con la cámara
                </Button>
              )}
            </VStack>
          )}

          {/* ── Escribir a mano ── */}
          {estado === 'manual' && (
            <VStack spacing={3} align="stretch">
              {casillaCodigo({ autoFocus: true })}
              {hayCamara() && (
                <Button variant="ghost" size="sm" color="whiteAlpha.700" rounded="lg"
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  leftIcon={<FiCamera size={14} />} onClick={iniciarCamara}>
                  Volver a la cámara
                </Button>
              )}
            </VStack>
          )}
        </Box>
      </ModalContent>

      <style>{`@keyframes fe-spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
