import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isIos, useInstall } from "../lib/install";

const DISMISS_KEY = "fangx:install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/** Dezenter Hinweis auf Start- und Lobby-Seite, solange die App nicht installiert ist. */
export function InstallBanner() {
  const { t } = useTranslation();
  const { installed, canInstall, install } = useInstall();
  const [dismissed, setDismissed] = useState(recentlyDismissed);

  const ios = isIos();
  if (installed || dismissed || (!canInstall && !ios)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ohne Speicher erscheint der Hinweis beim nächsten Start wieder.
    }
  };

  return (
    <aside className="install-banner" aria-label={t("installBanner.label")}>
      <p>{canInstall ? t("installBanner.text") : t("installBanner.textIos")}</p>
      <div className="install-banner-actions">
        {canInstall && (
          <button type="button" onClick={() => void install()}>
            {t("onboarding.installButton")}
          </button>
        )}
        <button className="secondary" type="button" onClick={dismiss}>
          {t("installBanner.dismiss")}
        </button>
      </div>
    </aside>
  );
}
