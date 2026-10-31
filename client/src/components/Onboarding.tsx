import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AlertNotificationPermission } from "./AlertSettings";

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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Das Ereignis feuert oft schon vor dem Rendern, deshalb wird es hier beim Laden des Moduls gemerkt.
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

type LocationState = "unknown" | "granted" | "denied" | "unsupported";

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
  const [location, setLocation] = useState<LocationState>(
    "geolocation" in navigator ? "unknown" : "unsupported",
  );
  const [locationBusy, setLocationBusy] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [canInstall, setCanInstall] = useState(deferredInstallPrompt !== null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!navigator.permissions) return;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state === "granted") setLocation("granted");
        else if (permission.state === "denied") setLocation("denied");
      })
      .catch((error: unknown) => {
        console.warn("Standortberechtigung konnte nicht geprüft werden:", error);
      });
  }, []);

  useEffect(() => {
    const onPrompt = () => setCanInstall(deferredInstallPrompt !== null);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocation("unsupported");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation("granted");
        setLocationBusy(false);
      },
      (error) => {
        setLocationBusy(false);
        // Ohne Signal ist die Berechtigung trotzdem erteilt.
        setLocation(error.code === error.PERMISSION_DENIED ? "denied" : "granted");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  };

  const install = async () => {
    const prompt = deferredInstallPrompt;
    if (!prompt) return;
    deferredInstallPrompt = null;
    setCanInstall(false);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
  };

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
                <p className="alert-settings-note">{t("onboarding.locationDenied")}</p>
              )}
              {location === "unsupported" && (
                <p className="alert-settings-note">{t("onboarding.locationUnsupported")}</p>
              )}
              {(location === "unknown" || location === "denied") && (
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
          {step < STEP_COUNT - 1 && (
            <button className="secondary" type="button" onClick={finish}>
              {t("onboarding.skip")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
