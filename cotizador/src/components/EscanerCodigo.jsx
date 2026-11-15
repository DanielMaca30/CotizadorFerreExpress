/**
 * EscanerCodigo.jsx — FerreExpress
 * ─────────────────────────────────────────────────────────────
 * Escáner de código de barras usando la cámara trasera del
 * celular/tablet. Usa la BarcodeDetector API (nativa en Chrome
 * y Safari iOS 17+). No requiere librerías externas.
 *
 * Al detectar un código llama onDetected(codigo) y cierra el modal.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent,
  Button, Box, Text, HStack, Badge, VStack, Input,
} from '@chakra-ui/react';
import { FiCamera, FiX, FiHash } from 'react-icons/fi';

const FY   = '#F9BF20';
const DARK = '#3A3A38';

/* Formatos de código de barras comunes en ferretería */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'code_93', 'itf'];

export default function EscanerCodigo({ isOpen, onClose, onDetected }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const detectorRef = useRef(null);

  const [estado, setEstado] = useState('idle'); // idle | iniciando | escaneando | error | manual
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCod, setManualCod] = useState('');
  const [ultimoCod, setUltimoCod] = useState('');

  /* ── Detener cámara ── */
  const detener = useCallback(() => {
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    rafRef.current   = null;
    streamRef.current = null;
    setEstado('idle');
  }, []);

  /* ── Loop de detección ── */
  const loopDeteccion = useCallback(async () => {
    const video    = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loopDeteccion);
      return;
    }
    try {
      const codigos = await detector.detect(video);
      if (codigos.length > 0) {
        const cod = codigos[0].rawValue;
        if (cod && cod !== ultimoCod) {
          setUltimoCod(cod);
          if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
          detener();
          onDetected(cod);
          onClose();
          return;
        }
      }
    } catch { /* frame descartado, seguir */ }
    rafRef.current = requestAnimationFrame(loopDeteccion);
  }, [ultimoCod, detener, onDetected, onClose]);

  /* ── Iniciar cámara ── */
  const iniciar = useCallback(async () => {
    setEstado('iniciando');
    setErrorMsg('');
    setUltimoCod('');

    /* Verificar soporte */
    if (!('BarcodeDetector' in window)) {
      setEstado('manual');
      return;
    }

    try {
      /* Verificar qué formatos soporta este dispositivo */
      const soportados = await window.BarcodeDetector.getSupportedFormats?.() ?? FORMATS;
      const formatos   = FORMATS.filter(f => soportados.includes(f));

      detectorRef.current = new window.BarcodeDetector({
        formats: formatos.length > 0 ? formatos : ['ean_13', 'code_128'],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, /* cámara trasera */
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado('escaneando');
      rafRef.current = requestAnimationFrame(loopDeteccion);

    } catch (e) {
      const permisos = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
      setErrorMsg(permisos
        ? 'Sin permiso de cámara. Actívala en la configuración del navegador.'
        : 'No se pudo acceder a la cámara. ¿Estás en una página segura (https)?');
      setEstado('error');
    }
  }, [loopDeteccion]);

  /* Iniciar cuando se abre el modal */
  useEffect(() => {
    if (isOpen) {
      iniciar();
    } else {
      detener();
      setManualCod('');
    }
    return () => detener();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarManual = () => {
    const cod = manualCod.trim();
    if (!cod) return;
    onDetected(cod);
    setManualCod('');
    onClose();
  };

  const cerrar = () => { detener(); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={cerrar} isCentered size="sm" motionPreset="slideInBottom">
      <ModalOverlay backdropFilter="blur(6px)" bg="blackAlpha.700" />
      <ModalContent rounded="2xl" mx={4} overflow="hidden" bg={DARK}>

        {/* ── Cabecera ── */}
        <Box px={5} pt={4} pb={3}>
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              <FiCamera color={FY} size={16} />
              <Text color="white" fontWeight="900" fontSize="15px">Escanear código</Text>
            </HStack>
            <Button size="xs" variant="ghost" color="whiteAlpha.700"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              onClick={cerrar} rounded="full" p={1}>
              <FiX size={16} />
            </Button>
          </HStack>
          <Text color="whiteAlpha.500" fontSize="11px" mt={1}>
            Apunta la cámara al código de barras del producto
          </Text>
        </Box>

        {/* ── Contenido según estado ── */}
        <Box px={4} pb={5}>

          {/* Vista de cámara */}
          {(estado === 'iniciando' || estado === 'escaneando') && (
            <Box position="relative" rounded="xl" overflow="hidden" bg="black"
              minH="200px" display="flex" alignItems="center" justifyContent="center">
              <video
                ref={videoRef}
                style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
                playsInline
                muted
              />
              {estado === 'iniciando' && (
                <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center"
                  bg="blackAlpha.700">
                  <VStack spacing={2}>
                    <Box w="32px" h="32px" border="3px solid" borderColor={FY}
                      borderTopColor="transparent" rounded="full"
                      style={{ animation: 'spin 0.8s linear infinite' }} />
                    <Text color="whiteAlpha.800" fontSize="12px">Iniciando cámara…</Text>
                  </VStack>
                </Box>
              )}
              {estado === 'escaneando' && (
                <>
                  {/* Marco guía */}
                  <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center"
                    pointerEvents="none">
                    <Box w="220px" h="90px" position="relative">
                      {/* Esquinas del marco */}
                      {[
                        { top: 0, left: 0, borderTop: `3px solid ${FY}`, borderLeft: `3px solid ${FY}`, w: '20px', h: '20px' },
                        { top: 0, right: 0, borderTop: `3px solid ${FY}`, borderRight: `3px solid ${FY}`, w: '20px', h: '20px' },
                        { bottom: 0, left: 0, borderBottom: `3px solid ${FY}`, borderLeft: `3px solid ${FY}`, w: '20px', h: '20px' },
                        { bottom: 0, right: 0, borderBottom: `3px solid ${FY}`, borderRight: `3px solid ${FY}`, w: '20px', h: '20px' },
                      ].map((s, i) => (
                        <Box key={i} position="absolute" rounded="sm" {...s} />
                      ))}
                    </Box>
                  </Box>
                  <Box position="absolute" bottom={2} left={0} right={0} textAlign="center">
                    <Badge bg={FY} color={DARK} fontSize="10px" px={3} py={0.5} rounded="full"
                      fontWeight="700">
                      Buscando código…
                    </Badge>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Error de cámara */}
          {estado === 'error' && (
            <VStack spacing={3} align="stretch">
              <Box bg="red.900" rounded="xl" p={4}>
                <Text color="red.200" fontSize="13px">{errorMsg}</Text>
              </Box>
              <Text color="whiteAlpha.600" fontSize="12px" textAlign="center">
                También puedes escribir el código manualmente:
              </Text>
              <HStack>
                <Input
                  placeholder="Escribe el código…"
                  value={manualCod}
                  onChange={e => setManualCod(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmarManual()}
                  bg="whiteAlpha.100" color="white" border="none" rounded="lg"
                  _placeholder={{ color: 'whiteAlpha.400' }}
                  autoFocus
                />
                <Button bg={FY} color={DARK} rounded="lg" fontWeight="700"
                  onClick={confirmarManual} flexShrink={0}>OK</Button>
              </HStack>
            </VStack>
          )}

          {/* Sin BarcodeDetector → entrada manual */}
          {estado === 'manual' && (
            <VStack spacing={3} align="stretch">
              <Box bg="whiteAlpha.100" rounded="xl" p={4}>
                <HStack spacing={2} mb={2}>
                  <FiHash color={FY} size={14} />
                  <Text color="white" fontSize="13px" fontWeight="600">
                    Escáner no disponible en este navegador
                  </Text>
                </HStack>
                <Text color="whiteAlpha.600" fontSize="12px">
                  Usa Chrome en Android o actualiza Safari en iPhone a iOS 17+.
                  Por ahora puedes escribir el código:
                </Text>
              </Box>
              <HStack>
                <Input
                  placeholder="Código de barras…"
                  value={manualCod}
                  onChange={e => setManualCod(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmarManual()}
                  bg="whiteAlpha.100" color="white" border="none" rounded="lg"
                  _placeholder={{ color: 'whiteAlpha.400' }}
                  inputMode="numeric"
                  autoFocus
                />
                <Button bg={FY} color={DARK} rounded="lg" fontWeight="700"
                  onClick={confirmarManual} flexShrink={0}>OK</Button>
              </HStack>
            </VStack>
          )}

          {/* Botón "ingresar manual" cuando la cámara está activa */}
          {estado === 'escaneando' && (
            <Button mt={3} w="full" size="sm" variant="ghost" color="whiteAlpha.600"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }} rounded="lg"
              leftIcon={<FiHash size={13} />}
              onClick={() => { detener(); setEstado('manual'); }}>
              Escribir código manualmente
            </Button>
          )}
        </Box>
      </ModalContent>

      {/* Animación spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
