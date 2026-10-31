import { useTranslation } from "react-i18next";

export type AlertNotificationPermission = NotificationPermission | "unsupported";

interface AlertSettingsProps {
  enabled: boolean;
  notificationPermission: AlertNotificationPermission;
  onEnable: () => void;
  onDisable: () => void;
}

export function AlertSettings({
  enabled,
  notificationPermission,
  onEnable,
  onDisable,
}: AlertSettingsProps) {
  const { t } = useTranslation();
  if (enabled) {
    return (
      <div className="alert-settings-compact">
        <span aria-hidden="true">🔔</span>
        <span>{t("alerts.activeShort")}</span>
        <button type="button" onClick={onDisable}>
          {t("alerts.disable")}
        </button>
      </div>
    );
  }
  return (
    <section className="card alert-settings">
      <div className="alert-settings-icon" aria-hidden="true">
        🔔
      </div>
      <div className="alert-settings-content">
        <h3>{t("alerts.title")}</h3>
        <p>{t("alerts.description")}</p>
        {enabled && notificationPermission === "denied" && (
          <p className="alert-settings-note">{t("alerts.denied")}</p>
        )}
        {enabled && notificationPermission === "unsupported" && (
          <p className="alert-settings-note">{t("alerts.unsupported")}</p>
        )}
        {enabled && notificationPermission === "granted" && (
          <p className="alert-settings-note">{t("alerts.granted")}</p>
        )}
      </div>
      <button
        className={enabled ? "secondary alert-settings-button" : "alert-settings-button"}
        type="button"
        onClick={enabled ? onDisable : onEnable}
      >
        {enabled ? t("alerts.disable") : t("alerts.enable")}
      </button>
    </section>
  );
}
