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
  return (
    <section className="card alert-settings">
      <div className="alert-settings-icon" aria-hidden="true">
        🔔
      </div>
      <div className="alert-settings-content">
        <h3>Alarm bei Standortmeldung</h3>
        <p>
          Wenn dein Standort an die Detektive übermittelt oder live geteilt wird, alarmieren wir
          dich mit Ton und Vibration. Gibt X auf, werden Detektive mit einer Systembenachrichtigung
          informiert. Eine Systembenachrichtigung gibt es, wenn du sie im Browser erlaubst.
        </p>
        {enabled && notificationPermission === "denied" && (
          <p className="alert-settings-note">
            Browser-Benachrichtigungen sind blockiert. Ton und Vibration bleiben aktiv.
          </p>
        )}
        {enabled && notificationPermission === "unsupported" && (
          <p className="alert-settings-note">
            Systembenachrichtigungen werden von diesem Browser nicht unterstützt. Ton und Vibration
            bleiben aktiv.
          </p>
        )}
        {enabled && notificationPermission === "granted" && (
          <p className="alert-settings-note">Alarm und Browser-Benachrichtigungen sind aktiv.</p>
        )}
      </div>
      <button
        className={enabled ? "secondary alert-settings-button" : "alert-settings-button"}
        type="button"
        onClick={enabled ? onDisable : onEnable}
      >
        {enabled ? "Alarm ausschalten" : "Alarm aktivieren"}
      </button>
    </section>
  );
}
