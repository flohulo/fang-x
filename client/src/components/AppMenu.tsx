import { useEffect, useRef, useState } from "react";
import { type AlertNotificationPermission, AlertSettings } from "./AlertSettings";

interface AppMenuProps {
  alertsEnabled: boolean;
  notificationPermission: AlertNotificationPermission;
  onEnableAlerts: () => void;
  onDisableAlerts: () => void;
  isGame: boolean;
}

export function AppMenu({
  alertsEnabled,
  notificationPermission,
  onEnableAlerts,
  onDisableAlerts,
  isGame,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  return (
    <>
      {!open && (
        <button
          ref={triggerRef}
          className={`app-menu-trigger${isGame ? " is-game" : ""}`}
          type="button"
          aria-label="Menü öffnen"
          aria-expanded={false}
          aria-controls="app-menu-panel"
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {open && (
        <div className="app-menu-backdrop" onClick={() => setOpen(false)}>
          <aside
            id="app-menu-panel"
            className="app-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-menu-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-menu-header">
              <div>
                <span className="app-menu-eyebrow">Fang X</span>
                <h2 id="app-menu-title">Menü</h2>
              </div>
              <button
                ref={closeRef}
                className="app-menu-close"
                type="button"
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <section className="app-menu-section" aria-labelledby="app-menu-settings-title">
              <h3 id="app-menu-settings-title">Einstellungen</h3>
              <AlertSettings
                enabled={alertsEnabled}
                notificationPermission={notificationPermission}
                onEnable={onEnableAlerts}
                onDisable={onDisableAlerts}
              />
            </section>

            <nav className="app-menu-links" aria-label="Weitere Seiten">
              <a
                href="https://github.com/flohulo/fang-x/wiki/Spieleinstellungen"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                <span>Spielregeln im Wiki</span>
                <span aria-hidden="true">↗</span>
              </a>
              <a href="/changelog" onClick={() => setOpen(false)}>
                Changelog
              </a>
              <a href="/datenschutz" onClick={() => setOpen(false)}>
                Datenschutz
              </a>
              <a href="/impressum" onClick={() => setOpen(false)}>
                Impressum
              </a>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
