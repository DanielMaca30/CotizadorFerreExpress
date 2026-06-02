/**
 * ImportarModal.jsx
 * Modal para importar cotizaciones desde PDF o imagen usando Google Gemini (gratis).
 */

import { useRef, useState, useCallback } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  Button, Box, Text, VStack, HStack, Icon, Spinner,
  Alert, AlertIcon, AlertDescription,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiUpload, FiFileText, FiImage, FiCheck } from "react-icons/fi";
import { useImportarCotizacion } from "../hooks/useImportarCotizacion";

const FY   = "#F9BF20";
const DARK = "#3A3A38";
const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,application/pdf";

export default function ImportarModal({ isOpen, onClose, onImport }) {
  const fileRef = useRef();
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);

  const { importar, loading, error, progress } = useImportarCotizacion();

  const dropBg = useColorModeValue("gray.50",  "gray.700");
  const dropBc = useColorModeValue("gray.300", "whiteAlpha.300");
  const mutedC = useColorModeValue("gray.500", "gray.400");
  const textC  = useColorModeValue("gray.700", "gray.200");

  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (!file) return;
    const result = await importar(file);
    if (result) {
      onImport(result);
      onClose();
      setFile(null);
      setPreview(null);
    }
  }, [file, importar, onImport, onClose]);

  const handleClose = () => {
    if (loading) return;
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent rounded="xl" mx={4}>
        <ModalHeader fontWeight="800" fontSize="16px">
          Importar cotizacion
        </ModalHeader>
        <ModalCloseButton isDisabled={loading} />

        <ModalBody pb={4}>
          <VStack spacing={4} align="stretch">

            {!hasKey && (
              <Alert status="warning" rounded="lg" fontSize="12px">
                <AlertIcon />
                <AlertDescription>
                  Agrega VITE_GEMINI_API_KEY en el archivo .env
                  (gratis en aistudio.google.com/apikey)
                </AlertDescription>
              </Alert>
            )}

            <Text fontSize="12px" color={mutedC}>
              Sube una imagen o PDF de cualquier cotizacion. La IA extrae
              productos, cantidades, precios con IVA y datos del cliente.
            </Text>

            <Box
              border="2px dashed"
              borderColor={file ? FY : dropBc}
              rounded="xl"
              p={6}
              bg={dropBg}
              textAlign="center"
              cursor={loading ? "not-allowed" : "pointer"}
              transition="all 0.15s"
              _hover={{ borderColor: FY }}
              onClick={() => { if (!loading) fileRef.current?.click(); }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {loading ? (
                <VStack spacing={2}>
                  <Spinner size="md" color={FY} thickness="3px" />
                  <Text fontSize="13px" fontWeight="600" color={textC}>
                    {progress}
                  </Text>
                </VStack>
              ) : file ? (
                <VStack spacing={2}>
                  <Icon
                    as={file.type === "application/pdf" ? FiFileText : FiImage}
                    boxSize={8}
                    color={FY}
                  />
                  <Text fontSize="13px" fontWeight="700" color={textC} noOfLines={1}>
                    {file.name}
                  </Text>
                  <Text fontSize="11px" color={mutedC}>
                    {(file.size / 1024).toFixed(0)} KB - Clic para cambiar
                  </Text>
                  {preview && (
                    <Box
                      as="img"
                      src={preview}
                      maxH="120px"
                      maxW="100%"
                      rounded="md"
                      objectFit="contain"
                      mt={1}
                    />
                  )}
                </VStack>
              ) : (
                <VStack spacing={2}>
                  <Icon as={FiUpload} boxSize={8} color={mutedC} />
                  <Text fontSize="13px" fontWeight="600" color={textC}>
                    Arrastra aqui o clic para seleccionar
                  </Text>
                  <HStack spacing={3} justify="center">
                    <HStack spacing={1}>
                      <Icon as={FiImage} boxSize={3} color={mutedC} />
                      <Text fontSize="10px" color={mutedC}>JPG / PNG / WEBP</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={FiFileText} boxSize={3} color={mutedC} />
                      <Text fontSize="10px" color={mutedC}>PDF</Text>
                    </HStack>
                  </HStack>
                </VStack>
              )}
            </Box>

            {error && (
              <Alert status="error" rounded="lg" fontSize="12px">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && file && !error && (
              <Alert status="info" rounded="lg" fontSize="11px">
                <AlertIcon boxSize={3} />
                <AlertDescription>
                  Los precios se importan como precio con IVA incluido.
                  Ajusta el porcentaje de IVA en la pestana Config si es necesario.
                </AlertDescription>
              </Alert>
            )}

          </VStack>
        </ModalBody>

        <ModalFooter gap={2}>
          <Button
            size="sm"
            variant="outline"
            rounded="md"
            onClick={handleClose}
            isDisabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            bg={FY}
            color={DARK}
            rounded="md"
            fontWeight="700"
            leftIcon={loading ? <Spinner size="xs" /> : <FiCheck size={14} />}
            onClick={handleImport}
            isDisabled={!file || loading || !hasKey}
            _hover={{ bg: "#e0b010" }}
          >
            {loading ? "Importando..." : "Importar"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
