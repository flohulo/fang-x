import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { docsUrl } from "../lib/docs";
import { type AlertNotificationPermission, AlertSettings } from "./AlertSettings";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Weblate-Projekt, in dem die Übersetzungen gepflegt werden. */
const TRANSLATE_URL = "https://hosted.weblate.org/engage/fang-x/";

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
  const { t } = useTranslation();
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
          aria-label={t("menu.open")}
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
                <h2 id="app-menu-title">{t("menu.title")}</h2>
              </div>
              <button
                ref={closeRef}
                className="app-menu-close"
                type="button"
                aria-label={t("menu.close")}
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <section className="app-menu-section" aria-labelledby="app-menu-settings-title">
              <h3 id="app-menu-settings-title">{t("menu.settings")}</h3>
              <LanguageSwitcher />
              <AlertSettings
                enabled={alertsEnabled}
                notificationPermission={notificationPermission}
                onEnable={onEnableAlerts}
                onDisable={onDisableAlerts}
              />
            </section>

            <nav className="app-menu-links" aria-label={t("menu.moreLinks")}>
              <a
                href={docsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                <span>{t("menu.docs")}</span>
                <span aria-hidden="true">↗</span>
              </a>
              <a href="/changelog" onClick={() => setOpen(false)}>
                {t("menu.changelog")}
              </a>
              <a href="/datenschutz" onClick={() => setOpen(false)}>
                {t("menu.privacy")}
              </a>
              <a href="/impressum" onClick={() => setOpen(false)}>
                {t("menu.imprint")}
              </a>
              <a href={TRANSLATE_URL} target="_blank" rel="noopener noreferrer">
                <span>{t("menu.translate")}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
