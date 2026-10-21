import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.ready
    .then((registration) => {
      const checkForUpdate = () => {
        void registration.update().catch((error: unknown) => {
          console.warn("PWA-Updateprüfung fehlgeschlagen:", error);
        });
      };

      checkForUpdate();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      });
    })
    .catch((error: unknown) => {
      console.warn("Service Worker konnte nicht bereitgestellt werden:", error);
    });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
