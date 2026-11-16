import { useTranslation } from "react-i18next";
import { isIos } from "../lib/install";
import type { MicrophoneState } from "../lib/useMicrophonePermission";

interface MicrophoneGuideProps {
  busy: boolean;
  onRetry: () => void;
}

/** Anleitung, wie ein blockierter Mikrofonzugriff wieder freigegeben wird. */
export function MicrophoneGuide({ busy, onRetry }: MicrophoneGuideProps) {
  const { t } = useTranslation();
  return (
    <div className="location-guide" role="alert">
      <p>{t("microphoneGuide.intro")}</p>
      <ol>
        {isIos() ? (
          <li>{t("microphoneGuide.ios")}</li>
        ) : (
          <>
            <li>{t("microphoneGuide.android1")}</li>
            <li>{t("microphoneGuide.android2")}</li>
          </>
        )}
        <li>{t("microphoneGuide.reload")}</li>
      </ol>
      <button className="secondary" type="button" disabled={busy} onClick={onRetry}>
        {t("microphoneGuide.retry")}
      </button>
    </div>
  );
}

interface MicrophoneAccessProps {
  state: MicrophoneState;
  busy: boolean;
  onRequest: () => void;
}

/** Karte für die Lobby: Mikrofonzugriff für den Sprechfunk, mit Freigabe-Button. */
export function MicrophoneAccess({ state, busy, onRequest }: MicrophoneAccessProps) {
  const { t } = useTranslation();
  if (state === "granted") return null;
  return (
    <section className="card">
      <h3>{t("microphoneAccess.title")}</h3>
      <p className="card-text">{t("microphoneAccess.text")}</p>
      {state === "denied" ? (
        <MicrophoneGuide busy={busy} onRetry={onRequest} />
      ) : state === "unsupported" ? (
        <p className="alert-settings-note">{t("microphoneAccess.unsupported")}</p>
      ) : (
        <button type="button" disabled={busy} onClick={onRequest}>
          {t("microphoneAccess.allow")}
        </button>
      )}
    </section>
  );
}
