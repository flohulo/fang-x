import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isIos, useInstall } from "../lib/install";
import { useLocationPermission } from "../lib/useLocationPermission";
import type { AlertNotificationPermission } from "./AlertSettings";
import { LocationGuide } from "./LocationAccess";

export const ONBOARDING_STORAGE_KEY = "fangx:onboarding-done";

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    // Ohne Speicher erscheint die Einführung beim nächsten Start erneut.
  }
}

interface OnboardingProps {
  alertsEnabled: boolean;
  notificationPermission: AlertNotificationPermission;
  onEnableAlerts: () => void;
  onFinish: () => void;
}

const STEP_COUNT = 3;

export function Onboarding({
  alertsEnabled,
  notificationPermission,
  onEnableAlerts,
  onFinish,
}: OnboardingProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { state: location, busy: locationBusy, request: requestLocation } = useLocationPermission();
  const { installed, canInstall, install } = useInstall();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const finish = () => {
    markOnboardingDone();
    onFinish();
  };

  const notificationsDone = alertsEnabled && notificationPermission !== "denied";

  return (
    <div className="pwa-update-backdrop">
      <section
        className="pwa-update-dialog onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <button
          className="onboarding-close"
          type="button"
          aria-label={t("common.close")}
          onClick={finish}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <p className="onboarding-progress">
          {t("onboarding.progress", { step: step + 1, total: STEP_COUNT })}
        </p>

        {step === 0 && (
          <>
            <h2 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              {t("onboarding.welcomeTitle")}
            </h2>
            <p>{t("onboarding.welcomeText")}</p>
            <ul className="onboarding-list">
              <li>{t("onboarding.welcomeCreate")}</li>
              <li>{t("onboarding.welcomeRoles")}</li>
              <li>{t("onboarding.welcomePlay")}</li>
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h2 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              {t("onboarding.permissionsTitle")}
            </h2>
            <p>{t("onboarding.permissionsText")}</p>

            <div className="onboarding-item">
              <h3>{t("onboarding.locationTitle")}</h3>
              <p>{t("onboarding.locationText")}</p>
              {location === "granted" && (
                <p className="onboarding-ok">{t("onboarding.locationGranted")}</p>
              )}
              {location === "denied" && (
                <LocationGuide busy={locationBusy} onRetry={requestLocation} />
              )}
              {location === "unsupported" && (
                <p className="alert-settings-note">{t("onboarding.locationUnsupported")}</p>
              )}
              {location === "unknown" && (
                <button type="button" disabled={locationBusy} onClick={requestLocation}>
                  {t("onboarding.locationAllow")}
                </button>
              )}
            </div>

            <div className="onboarding-item">
              <h3>{t("onboarding.alertsTitle")}</h3>
              <p>{t("onboarding.alertsText")}</p>
              {notificationsDone && notificationPermission === "granted" && (
                <p className="onboarding-ok">{t("onboarding.alertsGranted")}</p>
              )}
              {alertsEnabled && notificationPermission === "denied" && (
                <p className="alert-settings-note">{t("alerts.denied")}</p>
              )}
              {alertsEnabled && notificationPermission === "unsupported" && (
                <p className="alert-settings-note">{t("alerts.unsupported")}</p>
              )}
              {(!alertsEnabled || notificationPermission === "default") && (
                <button type="button" onClick={onEnableAlerts}>
                  {t("onboarding.alertsAllow")}
                </button>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              {t("onboarding.installTitle")}
            </h2>
            <p>{t("onboarding.installText")}</p>
            {installed ? (
              <p className="onboarding-ok">{t("onboarding.installDone")}</p>
            ) : canInstall ? (
              <button type="button" onClick={() => void install()}>
                {t("onboarding.installButton")}
              </button>
            ) : isIos() ? (
              <p className="onboarding-hint">{t("onboarding.installIos")}</p>
            ) : (
              <p className="onboarding-hint">{t("onboarding.installOther")}</p>
            )}
          </>
        )}

        <div className="onboarding-actions">
          {step < STEP_COUNT - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)}>
              {t("onboarding.next")}
            </button>
          ) : (
            <button type="button" onClick={finish}>
              {t("onboarding.finish")}
            </button>
          )}
          {step > 0 && (
            <button className="secondary" type="button" onClick={() => setStep(step - 1)}>
              {t("onboarding.back")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
