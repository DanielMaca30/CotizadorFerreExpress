import { ChakraProvider, extendTheme, ColorModeScript, Box } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import CotizadorPage from "./pages/CotizadorPage";
import HistorialPage from "./pages/HistorialPage";
import ClientePage from "./pages/ClientePage";
import TabsBar from "./components/TabsBar";
import AvisoGuardado from "./components/AvisoGuardado";
import PuertaAcceso from "./components/PuertaAcceso";
import { CotizacionesProvider } from "./context/CotizacionesProvider";

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
      50:  "#fff8e1",
      100: "#ffedb3",
      200: "#ffe082",
      300: "#ffd54f",
      400: "#ffca28",
      500: "#F9BF20",  /* ferreYellow */
      600: "#e21219",  /* ferreRed   */
      700: "#3a3a38",  /* ferreDark  */
      800: "#2a2a28",
      900: "#1a1a18",
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

/* ── Layout común ─────────────────────────────────────────
   La barra de pestañas es global: se ve tanto en el historial como
   en el cotizador, así se puede saltar entre cotizaciones abiertas
   desde cualquier punto. Se oculta sola cuando no hay ninguna. */
function Layout() {
  return (
    <Box minH="100vh">
      <AvisoGuardado />
      <TabsBar />
      <Outlet />
    </Box>
  );
}

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        {/* Estado compartido: una sola copia de las cotizaciones y una sola
            sincronización con la nube para toda la aplicación. */}
        <PuertaAcceso>
          <CotizacionesProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/"                 element={<Navigate to="/historial" replace />} />
                  <Route path="/cotizador"        element={<CotizadorPage />} />
                  <Route path="/cotizador/:id"    element={<CotizadorPage />} />
                  <Route path="/historial"        element={<HistorialPage />} />
                  <Route path="/cliente/:nombre"  element={<ClientePage />} />
                  <Route path="*"                 element={<Navigate to="/historial" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CotizacionesProvider>
        </PuertaAcceso>
      </ChakraProvider>
    </>
  );
}