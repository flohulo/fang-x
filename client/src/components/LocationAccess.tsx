import { useTranslation } from "react-i18next";
import { isIos } from "../lib/install";
import type { LocationState } from "../lib/useLocationPermission";

interface LocationGuideProps {
  busy: boolean;
  onRetry: () => void;
}

/** Anleitung, wie ein blockierter Standortzugriff wieder freigegeben wird. */
export function LocationGuide({ busy, onRetry }: LocationGuideProps) {
  const { t } = useTranslation();
  return (
    <div className="location-guide" role="alert">
      <p>{t("locationGuide.intro")}</p>
      <ol>
        {isIos() ? (
          <>
            <li>{t("locationGuide.ios1")}</li>
            <li>{t("locationGuide.ios2")}</li>
          </>
        ) : (
          <>
            <li>{t("locationGuide.android1")}</li>
            <li>{t("locationGuide.android2")}</li>
          </>
        )}
        <li>{t("locationGuide.reload")}</li>
      </ol>
      <button className="secondary" type="button" disabled={busy} onClick={onRetry}>
        {t("locationGuide.retry")}
      </button>
    </div>
  );
}

interface LocationAccessProps {
  state: LocationState;
  busy: boolean;
  onRequest: () => void;
}

/** Karte für die Lobby: Status des Standortzugriffs mit Freigabe-Button. */
export function LocationAccess({ state, busy, onRequest }: LocationAccessProps) {
  const { t } = useTranslation();
  if (state === "granted") return null;
  return (
    <section className="card">
      <h3>{t("onboarding.locationTitle")}</h3>
      <p className="card-text">{t("lobby.locationNeeded")}</p>
      {state === "denied" ? (
        <LocationGuide busy={busy} onRetry={onRequest} />
      ) : state === "unsupported" ? (
        <p className="alert-settings-note">{t("onboarding.locationUnsupported")}</p>
      ) : (
        <button type="button" disabled={busy} onClick={onRequest}>
          {t("onboarding.locationAllow")}
        </button>
      )}
    </section>
  );
}
