import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/* Fuente DM Sans desde Google Fonts */
const link = document.createElement("link");
link.rel   = "stylesheet";
link.href  = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap";
document.head.appendChild(link);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);