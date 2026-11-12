import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initErrorReporting } from "./error-reporting";
import { i18nReady } from "./i18n";
import { consumeChangelogAfterUpdate } from "./lib/updateChangelog";
import "./styles.css";

initErrorReporting();

// Nach einem bestätigten App-Update direkt den Versionsverlauf zeigen.
if (consumeChangelogAfterUpdate() && window.location.pathname !== "/changelog") {
  window.history.replaceState(null, "", "/changelog");
}

// Erst rendern, wenn die gewählte Sprache geladen ist – sonst blitzen kurz die Schlüssel auf.
void i18nReady.finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
