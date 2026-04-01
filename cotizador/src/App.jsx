import { ChakraProvider, extendTheme, ColorModeScript } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CotizadorPage from "./pages/CotizadorPage";
import HistorialPage from "./pages/HistorialPage";

/* ── Tema FerreExpress ──────────────────────────────────── */
const theme = extendTheme({
  config: {
    initialColorMode:   "light",
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'DM Sans', sans-serif`,
    body:    `'DM Sans', sans-serif`,
  },
  colors: {
    brand: {
      50:  "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#F9BF20",  /* ferreYellow */
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#1A2B45",  /* ferreDark */
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: "brand" },
    },
    Input: {
      defaultProps: { focusBorderColor: "#F9BF20" },
    },
    Select: {
      defaultProps: { focusBorderColor: "#F9BF20" },
    },
    Textarea: {
      defaultProps: { focusBorderColor: "#F9BF20" },
    },
    NumberInput: {
      defaultProps: { focusBorderColor: "#F9BF20" },
    },
  },
});

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/"              element={<Navigate to="/cotizador" replace />} />
            <Route path="/cotizador"     element={<CotizadorPage />} />
            <Route path="/cotizador/:id" element={<CotizadorPage />} />
            <Route path="/historial"     element={<HistorialPage />} />
            <Route path="*"              element={<Navigate to="/cotizador" replace />} />
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </>
  );
}