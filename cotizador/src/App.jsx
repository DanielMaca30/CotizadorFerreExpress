import { Suspense, lazy } from "react";
import { ChakraProvider, extendTheme, ColorModeScript, Box, Spinner, Flex } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
/* Cada pantalla se descarga cuando se entra a ella, no al abrir la app.
   Quien solo consulta el listado no paga el peso del cotizador completo. */
const CotizadorPage = lazy(() => import("./pages/CotizadorPage"));
const HistorialPage = lazy(() => import("./pages/HistorialPage"));
const ClientePage   = lazy(() => import("./pages/ClientePage"));
import TabsBar from "./components/TabsBar";
import AvisoGuardado from "./components/AvisoGuardado";
import PuertaAcceso from "./components/PuertaAcceso";
import AyudaApp from "./components/AyudaApp";
const AyudaPage = lazy(() => import("./pages/AyudaPage"));
import RecorridoGuiado from "./components/RecorridoGuiado";
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

/* Lo que se ve el instante que tarda en llegar una pantalla */
function Cargando() {
  return (
    <Flex minH="60vh" align="center" justify="center">
      <Spinner size="lg" thickness="3px" color="#F9BF20" emptyColor="gray.200" />
    </Flex>
  );
}

/* ── Layout común ─────────────────────────────────────────
   La barra de pestañas es global: se ve tanto en el historial como
   en el cotizador, así se puede saltar entre cotizaciones abiertas
   desde cualquier punto. Se oculta sola cuando no hay ninguna. */
function Layout() {
  const { pathname } = useLocation();
  return (
    <Box minH="100vh">
      <AvisoGuardado />
      <TabsBar />
      <Suspense fallback={<Cargando />}>
        <Outlet />
      </Suspense>
      <AyudaApp />
      {/* Las guías que se hacen sobre la pantalla. Vive aquí, fuera de las
          rutas, para que un recorrido pueda pasar del listado al cotizador
          sin perder el hilo. La de bienvenida arranca sola en el listado. */}
      <RecorridoGuiado autoIniciar={pathname === "/historial"} />
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
                  <Route path="/ayuda"            element={<AyudaPage />} />
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