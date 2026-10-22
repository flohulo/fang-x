import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChangelogScreen } from "./changelog";
import type { AlertNotificationPermission } from "./components/AlertSettings";
import { AppMenu } from "./components/AppMenu";
import { LegalScreen } from "./legal";
import { parseInviteCode } from "./lib/invite";
import { clearSession, loadSession, saveSession } from "./lib/session";
import { useGame } from "./lib/useGame";
import { GameScreen } from "./screens/GameScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";

type Screen = "home" | "lobby" | "game";

type LegalPage = "impressum" | "datenschutz" | null;

const ALERTS_STORAGE_KEY = "fangx:live-share-alerts";

function loadAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function playLiveShareAlarm(context: AudioContext) {
  const now = context.currentTime;
  for (let index = 0; index < 3; index++) {
    const startAt = now + index * 0.28;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    volume.gain.setValueAtTime(0.0001, startAt);
    volume.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.21);
  }
}

async function showPositionSharedNotification(at: number, index: number, live: boolean) {
  const options: NotificationOptions = {
    body: live
      ? "Dein Standort wird jetzt live an die Detektive übertragen."
      : "Dein Standort wurde gerade an die Detektive übermittelt.",
    icon: "/icon-192.png",
    tag: `fang-x-position-${index}-${at}`,
  };
  const title = live ? "Achtung: Standort wird geteilt" : "Standort an Detektive übermittelt";
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}

function readLegalPage(): LegalPage {
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/impressum") return "impressum";
  if (path === "/datenschutz") return "datenschutz";
  return null;
}

function isChangelogPage(): boolean {
  return window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/changelog";
}

function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.warn("Service Worker konnte nicht registriert werden:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pwa-update-backdrop">
      <section
        className="pwa-update-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-description"
      >
        <h2 id="pwa-update-title">Neue Version verfügbar</h2>
        <p id="pwa-update-description">
          Eine neue Version von Fang X ist verfügbar. Lade die Seite neu, um sie zu verwenden.
        </p>
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Jetzt neu laden
        </button>
        <button className="secondary" type="button" onClick={() => setNeedRefresh(false)}>
          Später
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(loadAlertsEnabled);
  const [notificationPermission, setNotificationPermission] = useState<AlertNotificationPermission>(
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
  );
  const legalPage = useMemo(readLegalPage, []);
  const changelogPage = useMemo(isChangelogPage, []);
  const resumedRef = useRef(false);
  const lastAlertedPositionRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const game = useGame();

  const enableAlerts = useCallback(() => {
    setAlertsEnabled(true);
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, "true");
    } catch {
      // Alarm bleibt für diese Sitzung aktiv, auch wenn der Browser Speicher blockiert.
    }

    if (typeof AudioContext !== "undefined") {
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      void context.resume().catch((error: unknown) => {
        console.warn("Alarmton konnte nicht aktiviert werden:", error);
      });
    }

    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    void Notification.requestPermission()
      .then(setNotificationPermission)
      .catch((error: unknown) => {
        console.warn("Benachrichtigungsberechtigung konnte nicht angefragt werden:", error);
      });
  }, []);

  const disableAlerts = useCallback(() => {
    setAlertsEnabled(false);
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, "false");
    } catch {
      // Alarm bleibt für diese Sitzung ausgeschaltet.
    }
  }, []);

  useEffect(() => {
    if (!alertsEnabled) return;
    const unlockAudio = () => {
      if (typeof AudioContext === "undefined") return;
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") {
        void context.resume().catch((error: unknown) => {
          console.warn("Alarmton konnte nicht aktiviert werden:", error);
        });
      }
    };
    document.addEventListener("pointerdown", unlockAudio);
    return () => document.removeEventListener("pointerdown", unlockAudio);
  }, [alertsEnabled]);

  useEffect(() => {
    const shared = game.lastPositionShared;
    if (!shared) return;
    const eventId = `${shared.at}:${shared.index}:${shared.live}`;
    if (lastAlertedPositionRef.current === eventId) return;
    lastAlertedPositionRef.current = eventId;
    if (!alertsEnabled) return;

    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([250, 150, 250, 150, 500]);
    }
    if (notificationPermission === "granted") {
      void showPositionSharedNotification(shared.at, shared.index, shared.live).catch(
        (error: unknown) => {
          console.warn(
            "Standortwarnung konnte nicht als Benachrichtigung angezeigt werden:",
            error,
          );
        },
      );
    }

    const context = audioContextRef.current;
    if (!context) return;
    if (context.state === "running") {
      playLiveShareAlarm(context);
      return;
    }
    void context
      .resume()
      .then(() => playLiveShareAlarm(context))
      .catch((error: unknown) => {
        console.warn("Standortwarnung konnte nicht abgespielt werden:", error);
      });
  }, [alertsEnabled, game.lastPositionShared, notificationPermission]);

  // Einladungslink: /?code=ABC234
  const initialCode = useMemo(() => parseInviteCode(window.location.search), []);

  useEffect(() => {
    if (legalPage || changelogPage || !navigator.permissions) return;

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state === "granted") {
          setLocationReady(true);
        } else if (permission.state === "denied") {
          setLocationError(
            "Der Standortzugriff ist im Browser blockiert. Erlaube den Standortzugriff in den Website-Einstellungen und lade die Seite neu.",
          );
        }
      })
      .catch((error: unknown) => {
        console.warn("Standortberechtigung konnte nicht geprüft werden:", error);
      });
  }, [legalPage, changelogPage]);

  const requestLocationAccess = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Standortfreigabe wird nicht unterstützt. Öffne Fang X über eine sichere HTTPS-Verbindung auf einem Gerät mit GPS.",
      );
      return;
    }

    setRequestingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationReady(true);
        setRequestingLocation(false);
      },
      (error) => {
        setRequestingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Der Standortzugriff wurde abgelehnt. Erlaube ihn in den Browser- oder Website-Einstellungen und versuche es erneut.",
          );
          return;
        }

        // Der Zugriff kann bereits erlaubt sein, auch wenn das Gerät gerade kein GPS-Signal hat.
        setLocationReady(true);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  }, []);

  const createGame = useCallback(
    async (name: string) => {
      setJoinError(null);
      setCheckingCode(true);
      try {
        const res = await fetch("/api/games", { method: "POST" });
        if (res.status === 429) {
          throw new Error("Zu viele Spiele in kurzer Zeit. Bitte kurz warten.");
        }
        if (!res.ok) throw new Error("Spiel konnte nicht erstellt werden.");
        const { code } = await res.json();
        const displayName = name.trim() || "Host";
        saveSession({ code, name: displayName, wantsX: true });
        setGameCode(code);
        game.join(code, displayName, true);
        setScreen("lobby");
      } catch (err: any) {
        setJoinError(err?.message ?? "Unbekannter Fehler.");
      } finally {
        setCheckingCode(false);
      }
    },
    [game],
  );

  const joinGame = useCallback(
    async (code: string, name: string, wantsX: boolean) => {
      setJoinError(null);
      setCheckingCode(true);
      try {
        // Vor dem Beitritt prüfen, ob es den Code gibt – sonst würde ein
        // Tippfehler still einen neuen, leeren Raum erzeugen.
        const res = await fetch(`/api/games/${encodeURIComponent(code)}`);
        if (res.status === 429) {
          throw new Error("Zu viele Versuche. Bitte eine Minute warten.");
        }
        if (!res.ok) throw new Error("Server nicht erreichbar.");
        const { exists } = (await res.json()) as { exists: boolean };
        if (!exists) {
          setJoinError(
            `Kein Spiel mit dem Code ${code}. Prüfe den Code oder starte ein neues Spiel.`,
          );
          return;
        }

        const displayName = name.trim() || "Spieler";
        saveSession({ code, name: displayName, wantsX });
        game.join(code, displayName, wantsX);
        setGameCode(code);
        setScreen("lobby");
      } catch (err: any) {
        setJoinError(err?.message ?? "Unbekannter Fehler.");
      } finally {
        setCheckingCode(false);
      }
    },
    [game],
  );

  const handleLeave = useCallback(() => {
    game.leave();
    clearSession();
    setScreen("home");
    setGameCode(null);
    setJoinError(null);
  }, [game]);

  // Nach einem Reload wieder in das laufende Spiel zurückkehren.
  useEffect(() => {
    if (!locationReady || resumedRef.current) return;
    const saved = loadSession();
    if (!saved) return;
    resumedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(saved.code)}`);
        if (!res.ok) return;
        const { exists } = (await res.json()) as { exists: boolean };
        if (!exists) {
          clearSession();
          return;
        }
        if (cancelled) return;
        setGameCode(saved.code);
        setScreen("lobby");
        game.join(saved.code, saved.name, saved.wantsX);
      } catch {
        // Offline: Startseite bleibt stehen, der Spielstand ist nicht verloren.
      }
    })();

    return () => {
      cancelled = true;
    };
    // absichtlich nur beim ersten Mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady]);

  if (legalPage) {
    return (
      <>
        <LegalScreen page={legalPage} />
        <PwaUpdatePrompt />
      </>
    );
  }

  if (changelogPage) {
    return (
      <>
        <ChangelogScreen />
        <PwaUpdatePrompt />
      </>
    );
  }

  const content =
    screen === "home" || !game.myId ? (
      <HomeScreen
        initialCode={initialCode}
        notice={joinError ?? game.error}
        busy={checkingCode}
        onCreateGame={createGame}
        onJoinGame={joinGame}
      />
    ) : game.phase === "LOBBY" ? (
      <LobbyScreen
        code={gameCode ?? ""}
        players={game.players}
        myId={game.myId}
        youAreHost={game.youAreHost}
        ruleset={game.ruleset}
        onConfigure={game.configure}
        onSetRole={game.setRole}
        onStart={game.start}
        onLeave={handleLeave}
      />
    ) : (
      <GameScreen
        code={gameCode ?? ""}
        phase={game.phase}
        phaseEndsAt={game.phaseEndsAt}
        playAreaCenter={game.playAreaCenter}
        players={game.players}
        myId={game.myId}
        ruleset={game.ruleset}
        lastReveal={game.lastReveal}
        objective={game.objective}
        transitStops={game.transitStops}
        transitNotice={game.transitNotice}
        chatMessages={game.chatMessages}
        catchPending={game.catchPending}
        serverError={game.error}
        yourPositionIsShared={game.yourPositionIsShared}
        gameResult={game.gameResult}
        onPosition={game.sendPosition}
        onSetObjective={game.setObjectiveTarget}
        onUseTransitStop={game.useTransitStop}
        onSendChat={game.sendChat}
        onReportCatch={game.reportCatch}
        onResolveCatch={game.resolveCatch}
        onLeave={handleLeave}
      />
    );

  return (
    <>
      {game.reconnecting && (
        <div className="reconnect-banner" role="status">
          Verbindung verloren – verbinde neu …
        </div>
      )}
      <AppMenu
        alertsEnabled={alertsEnabled}
        notificationPermission={notificationPermission}
        onEnableAlerts={enableAlerts}
        onDisableAlerts={disableAlerts}
        isGame={Boolean(game.myId && game.phase !== "LOBBY")}
      />
      {content}
      <PwaUpdatePrompt />
    </>
  );
}
