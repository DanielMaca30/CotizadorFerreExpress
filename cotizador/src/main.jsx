import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

/* La fuente DM Sans se carga en index.html (antes se pedía dos veces:
   allí y aquí, con pesos distintos). */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Service worker solo en producción. En desarrollo guardaba en caché los
   archivos del código y se veían cambios viejos al recargar. */
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* opcional */ });
    });
  } else {
    navigator.serviceWorker.getRegistrations?.()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => { /* noop */ });
  }
}
