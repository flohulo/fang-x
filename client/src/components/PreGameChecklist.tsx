import { type PreGameCheck } from "@fang-x/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isIos, useInstall } from "../lib/install";
import type { LocationState } from "../lib/useLocationPermission";

type Status = "ok" | "warn" | "info";

interface Item {
  id: string;
  status: Status;
  label: string;
  hint?: string;
}

function readNotificationPermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/** Aktueller Benachrichtigungsstatus; aktualisiert sich, wenn man aus den Einstellungen zurückkommt. */
function useNotificationPermission() {
  const [permission, setPermission] = useState(readNotificationPermission);
  useEffect(() => {
    const refresh = () => setPermission(readNotificationPermission());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return permission;
}

export function PreGameChecklistItems({ items }: { items: Item[] }) {
  const { t } = useTranslation();
  const marks: Record<Status, string> = { ok: "✓", warn: "!", info: "i" };
  return (
    <ul className="checklist">
      {items.map((item) => (
        <li key={item.id} className={`checklist-item checklist-${item.status}`}>
          <span className="checklist-mark" aria-hidden="true">
            {marks[item.status]}
          </span>
          <span>
            <span className="checklist-label">
              <span className="visually-hidden">{t(`lobby.checklist.status.${item.status}`)}</span>
              {item.label}
            </span>
            {item.hint && <span className="checklist-hint">{item.hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface PreGameChecklistProps {
  locationState: LocationState;
  /** Simulationsmodus gewählt: fehlender Standort ist dann kein Problem. */
  locationSkipped: boolean;
  /** Warnungen zu Einstellungen und Gruppe (aus shared). */
  checks: PreGameCheck[];
}

/** Checkliste in der Lobby: Geräte-Check für alle, dazu die Warnungen zu Gruppe und Einstellungen. */
export function PreGameChecklist({
  locationState,
  locationSkipped,
  checks,
}: PreGameChecklistProps) {
  const { t } = useTranslation();
  const notifications = useNotificationPermission();
  const { installed } = useInstall();

  const items: Item[] = [
    {
      id: "location",
      status: locationState === "granted" || locationSkipped ? "ok" : "warn",
      label: t("lobby.checklist.location"),
      hint: locationState === "granted" || locationSkipped ? undefined : t("lobby.locationNeeded"),
    },
    {
      id: "notifications",
      status: notifications === "granted" ? "ok" : "warn",
      label: t("lobby.checklist.notifications"),
      hint: notifications === "granted" ? undefined : t("lobby.checklist.notificationsHint"),
    },
    {
      id: "install",
      status: installed ? "ok" : "warn",
      label: t("lobby.checklist.install"),
      hint: installed
        ? undefined
        : t(isIos() ? "lobby.checklist.installHintIos" : "lobby.checklist.installHint"),
    },
    {
      id: "screen",
      status: "info",
      label: t("lobby.checklist.screen"),
      hint: t("lobby.checklist.screenHint"),
    },
    ...checks.map((check) => ({
      id: check.id,
      status: "warn" as const,
      label: t(`lobby.checklist.checks.${check.id}`, check.params),
    })),
  ];

  return (
    <section className="card">
      <h3>{t("lobby.checklist.title")}</h3>
      <PreGameChecklistItems items={items} />
    </section>
  );
}
