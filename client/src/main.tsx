import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { i18nReady } from "./i18n";
import "./styles.css";

// Erst rendern, wenn die gewählte Sprache geladen ist – sonst blitzen kurz die Schlüssel auf.
void i18nReady.finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
