import type { ChatMessage, LatLng, ObjectiveState, Ruleset } from "@fang-x/shared";
import { distanceMeters } from "@fang-x/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPanel } from "../components/ChatPanel";
import { MapView } from "../components/MapView";
import {
  buildSettingsExport,
  downloadSettingsExport,
  settingsExportFileName,
} from "../lib/settingsExport";
import { useGeolocation } from "../lib/useGeolocation";

interface GameScreenProps {
  code: string;
  phase: string;
  phaseEndsAt: number | null;
  playAreaCenter: LatLng | null;
  players: any[];
  myId: string | null;
  ruleset: Ruleset | null;
  lastReveal: any;
  objective: ObjectiveState | null;
  transitStops: { bus: number; train: number };
  transitNotice: {
    mode: "bus" | "train";
    count: number;
    bus: number;
    train: number;
    at: number;
  } | null;
  revealTimer: {
    nextRevealAt: number | null;
    intervalStartedAt: number;
    indeterminate: boolean;
  } | null;
  chatMessages: ChatMessage[];
  catchPending: boolean;
  serverError: string | null;
  yourPositionIsShared: boolean;
  gameResult: any;
  onPosition: (pos: LatLng) => void;
  onSetObjective: (target: LatLng) => void;
  onUseTransitStop: (mode: "bus" | "train", count: number) => void;
  onSendChat: (text: string) => void;
  onReportCatch: () => void;
  onResolveCatch: (caught: boolean) => void;
  onLeave: () => void;
}

const FALLBACK_CENTER: LatLng = { lat: 47.3769, lng: 8.5417 };

const PHASE_LABEL: Record<string, string> = {
  COUNTDOWN: "Start in",
  HEADSTART: "Vorsprung",
  RUNNING: "Läuft",
  ENDED: "Ende",
};

const PHASE_TITLE: Record<string, string> = {
  COUNTDOWN: "Gleich geht's los",
  HEADSTART: "Vorsprung läuft",
  RUNNING: "Spiel läuft",
  ENDED: "Spiel beendet",
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GameScreen({
  code,
  phase,
  phaseEndsAt,
  playAreaCenter,
  players,
  myId,
  ruleset,
  lastReveal,
  objective,
  transitStops,
  transitNotice,
  revealTimer,
  chatMessages,
  catchPending,
  serverError,
  yourPositionIsShared,
  gameResult,
  onPosition,
  onSetObjective,
  onUseTransitStop,
  onSendChat,
  onReportCatch,
  onResolveCatch,
  onLeave,
}: GameScreenProps) {
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSimHint, setShowSimHint] = useState(false);
  const [choosingObjective, setChoosingObjective] = useState(false);
  const [transitDialogOpen, setTransitDialogOpen] = useState(false);
  const [transitMode, setTransitMode] = useState<"bus" | "train">("bus");
  const [transitCount, setTransitCount] = useState(1);
  const [dismissedTransitNoticeAt, setDismissedTransitNoticeAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [satelliteOn, setSatelliteOn] = useState(false);
  const [settingsExported, setSettingsExported] = useState(false);
  const lastSentRef = useRef<number>(0);

  const me = players.find((p) => p.id === myId);
  const isX = me?.role === "X";
  const trackingActive =
    phase === "RUNNING" ||
    (phase === "HEADSTART" && (!ruleset?.game.detectivesWaitDuringHeadStart || isX));

  const playAreaRadius: number = ruleset?.map?.playAreaRadiusMeters ?? 700;

  const handlePosition = useCallback(
    (pos: LatLng) => {
      const now = Date.now();
      const minInterval = (ruleset?.movement?.minUpdateSeconds ?? 15) * 1000;
      if (now - lastSentRef.current >= minInterval) {
        lastSentRef.current = now;
        onPosition(pos);
      }
      if (!mapCenter) setMapCenter(pos);
    },
    [onPosition, mapCenter, ruleset],
  );

  const { position, error, simulated, setSimulatedPosition, enableRealGps } = useGeolocation(
    trackingActive,
    handlePosition,
  );

  // Countdown-Timer (phaseEndsAt kommt bereits auf die lokale Uhr umgerechnet an)
  useEffect(() => {
    if (!phaseEndsAt) {
      setTimeLeft(null);
      return;
    }
    const update = () => setTimeLeft(Math.max(0, phaseEndsAt - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const busStopsLimit = ruleset?.movement.xTransitBudget.busStops ?? 0;
  const trainStopsLimit = ruleset?.movement.xTransitBudget.trainStops ?? 0;
  const busRemaining = Math.max(0, busStopsLimit - transitStops.bus);
  const trainRemaining = Math.max(0, trainStopsLimit - transitStops.train);
  const transitRemaining = transitMode === "bus" ? busRemaining : trainRemaining;
  const visibleTransitNotice =
    transitNotice && transitNotice.at !== dismissedTransitNoticeAt ? transitNotice : null;

  useEffect(() => {
    if (!transitNotice) return;
    const timer = window.setTimeout(() => setDismissedTransitNoticeAt(transitNotice.at), 15_000);
    return () => window.clearTimeout(timer);
  }, [transitNotice]);

  useEffect(() => {
    if (!transitDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTransitDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transitDialogOpen]);

  useEffect(() => {
    if (!revealTimer || phase !== "RUNNING") return;
    const update = () => setClockNow(Date.now());
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [revealTimer, phase]);

  const detectiveCount = players.filter((p) => p.role === "DETECTIVE").length;
  const isSolo = players.length > 0 && detectiveCount === 0 && isX;

  const revealRemainingMs =
    revealTimer?.nextRevealAt != null ? Math.max(0, revealTimer.nextRevealAt - clockNow) : null;
  const revealIntervalMs =
    revealTimer?.nextRevealAt != null
      ? Math.max(1, revealTimer.nextRevealAt - revealTimer.intervalStartedAt)
      : null;
  const revealProgress =
    revealRemainingMs !== null && revealIntervalMs !== null
      ? Math.min(
          100,
          Math.max(0, ((revealIntervalMs - revealRemainingMs) / revealIntervalMs) * 100),
        )
      : 0;
  const showRevealTimer =
    phase === "RUNNING" &&
    revealTimer !== null &&
    (revealTimer.indeterminate || revealTimer.nextRevealAt !== null);

  const center = playAreaCenter ?? mapCenter ?? FALLBACK_CENTER;
  const distanceFromCenter = position ? distanceMeters(position, center) : null;
  const metersToEdge =
    distanceFromCenter === null ? null : Math.round(playAreaRadius - distanceFromCenter);
  const isOutside = metersToEdge !== null && metersToEdge < 0;

  const handleSimMode = () => {
    setShowSimHint(true);
    setSimulatedPosition(mapCenter ?? center);
  };

  const handleMapClick = (pos: LatLng) => {
    if (choosingObjective) {
      onSetObjective(pos);
      setChoosingObjective(false);
      return;
    }
    if (simulated || showSimHint) {
      setSimulatedPosition(pos);
    }
  };

  const playerMarkers = players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    role: p.role,
    pos: p.id === myId ? position : (p.position ?? null),
  }));

  const hint = buildHint({
    phase,
    isX,
    isSolo,
    hasPosition: position !== null,
    simulated,
    lastReveal,
    objective,
    phaseActive: phase === "HEADSTART" || phase === "RUNNING",
  });
  const canChooseObjective =
    phase === "RUNNING" && isX && ruleset?.objective?.enabled && objective?.status === "PENDING";
  const canReportPhotoCatch =
    phase === "RUNNING" && ruleset?.catch.method === "PHOTO_CONFIRMATION" && !isX && !catchPending;
  const canUseTransitBudget = isX && trackingActive;

  const openTransitDialog = () => {
    setTransitMode(busRemaining > 0 ? "bus" : "train");
    setTransitCount(1);
    setTransitDialogOpen(true);
  };

  const chooseTransitMode = (mode: "bus" | "train") => {
    const max = mode === "bus" ? busRemaining : trainRemaining;
    setTransitMode(mode);
    setTransitCount((current) => Math.min(current, Math.max(1, max)));
  };

  const confirmTransitStops = () => {
    if (transitRemaining < 1) return;
    onUseTransitStop(transitMode, Math.min(transitCount, transitRemaining));
    setTransitDialogOpen(false);
    setTransitCount(1);
  };

  const exportSettings = () => {
    if (!ruleset) return;
    const exportedAt = new Date();
    downloadSettingsExport(
      buildSettingsExport(ruleset, code, exportedAt),
      settingsExportFileName(ruleset, code, exportedAt),
    );
    setSettingsExported(true);
  };

  if (gameResult) {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.5rem" }}>
            {gameResult.winner === "X" ? "X gewinnt!" : "Detektive gewinnen!"}
          </h2>
          <p style={{ color: "var(--text-dim)" }}>{gameResult.reason}</p>
          <button onClick={onLeave} style={{ marginTop: 24 }}>
            Zurück zur Startseite
          </button>
          {ruleset && (
            <>
              <button
                className="secondary"
                type="button"
                onClick={exportSettings}
                style={{ marginTop: 8 }}
              >
                {settingsExported
                  ? "Einstellungen exportiert ✓"
                  : "Einstellungen dieser Runde exportieren"}
              </button>
              <p className="config-hint" style={{ marginTop: 12 }}>
                {`Regeln dieser Runde als JSON-Datei (${ruleset.name.trim() || "ohne Namen"}) – ohne Startpunkt.`}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app game-app" style={{ height: "100%" }}>
      <div className="map-container">
        <MapView
          center={center}
          playAreaRadiusMeters={playAreaRadius}
          players={playerMarkers}
          lastReveal={lastReveal}
          objective={isX ? objective : null}
          startPoint={playAreaCenter ?? ruleset?.map?.startLocation ?? null}
          onMapClick={handleMapClick}
          onSatelliteChange={setSatelliteOn}
        />

        <div className="map-overlay">
          <div className="map-overlay-row">
            <span className={`phase-badge phase-${phase}`}>{PHASE_LABEL[phase] ?? phase}</span>
            {timeLeft !== null && <span className="map-timer">{formatDuration(timeLeft)}</span>}
            <span className={`role-chip${isX ? " is-x" : " is-det"}`}>
              {isX ? "Du bist X" : "Du bist Detektiv"}
            </span>
          </div>
        </div>

        {showRevealTimer && (
          <div
            className={`reveal-progress${revealTimer.indeterminate ? " is-indeterminate" : ""}${
              revealRemainingMs !== null && revealRemainingMs <= 10_000 ? " is-imminent" : ""
            }`}
            role="status"
            aria-live="off"
          >
            <div className="reveal-progress-head">
              <span>Nächste Sichtung</span>
              <span>
                {revealTimer.indeterminate ? "bald" : formatDuration(revealRemainingMs ?? 0)}
              </span>
            </div>
            <div
              className="reveal-progress-track"
              role="progressbar"
              aria-label="Nächste Sichtung"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={revealTimer.indeterminate ? undefined : Math.round(revealProgress)}
              aria-valuetext={
                revealTimer.indeterminate
                  ? "Zeitpunkt unbestimmt"
                  : `Noch ${formatDuration(revealRemainingMs ?? 0)}`
              }
            >
              <div
                className="reveal-progress-fill"
                style={revealTimer.indeterminate ? undefined : { width: `${revealProgress}%` }}
              />
            </div>
          </div>
        )}

        {yourPositionIsShared && (
          <div className="alert-banner" style={{ top: 64 }}>
            ⚠️ Du hast das Spielfeld verlassen! Dein Standort wird jetzt geteilt.
          </div>
        )}

        {serverError && (
          <div
            className="alert-banner"
            role="alert"
            style={{ top: yourPositionIsShared ? 112 : 64 }}
          >
            {serverError}
          </div>
        )}

        {visibleTransitNotice && !isX && (
          <div className="transit-notice" role="status">
            <span>
              <strong>ÖV-Meldung:</strong> X hat{" "}
              {visibleTransitNotice.count === 1 ? "eine" : visibleTransitNotice.count}{" "}
              {visibleTransitNotice.mode === "bus" ? "Bus-Haltestelle" : "Zug-Haltestelle"}
              {visibleTransitNotice.count === 1 ? "" : "n"} genutzt.
            </span>
            <button
              type="button"
              className="transit-notice-close"
              aria-label="Hinweis schließen"
              onClick={() => setDismissedTransitNoticeAt(visibleTransitNotice.at)}
            >
              ×
            </button>
          </div>
        )}

        {error && !simulated && (
          <div className="alert-banner" style={{ bottom: 200 }}>
            GPS-Fehler: {error}
          </div>
        )}

        <div className="game-status">
          <div className="game-status-head">
            <span
              className={`area-chip${ruleset?.map?.outOfBoundsEnabled && isOutside ? " is-out" : ""}`}
            >
              {ruleset?.map?.outOfBoundsEnabled
                ? metersToEdge === null
                  ? "Standort unbekannt"
                  : isOutside
                    ? `${Math.abs(metersToEdge)} m außerhalb`
                    : `${metersToEdge} m bis zum Rand`
                : "Kein Spielfeldrand"}
            </span>
            <span className={`gps-chip${position === null ? " is-off" : ""}`}>
              {simulated ? "Simulation" : position ? "GPS aktiv" : "kein GPS"}
            </span>
            {isSolo && <span className="solo-chip">Probelauf · {code}</span>}
          </div>

          <p className="game-hint">
            <strong>{hint.title}</strong> {hint.text}
          </p>
          {isX && ruleset?.movement.xTransitBudget.enabled && (
            <div className="transit-budget">
              <div className="transit-budget-head">
                <span>
                  ÖV-Budget: Bus {transitStops.bus}/{busStopsLimit} · Zug {transitStops.train}/
                  {trainStopsLimit}
                </span>
                {canUseTransitBudget && (
                  <button
                    type="button"
                    className="secondary transit-trigger"
                    disabled={busRemaining + trainRemaining === 0}
                    onClick={openTransitDialog}
                  >
                    Halt melden
                  </button>
                )}
              </div>
              <small>
                {busRemaining + trainRemaining === 0
                  ? "ÖV-Budget aufgebraucht."
                  : "Bei jedem Halt melden – die Detektive werden informiert."}
              </small>
            </div>
          )}
          {ruleset?.catch.method === "PHOTO_CONFIRMATION" && phase === "RUNNING" && (
            <div className="photo-catch">
              {catchPending ? (
                isX ? (
                  <>
                    <strong>Fang gemeldet</strong>
                    <span>Bestätige, wenn die Detektive ein Foto von dir gemacht haben.</span>
                    <div className="transit-budget-actions">
                      <button type="button" onClick={() => onResolveCatch(true)}>
                        Fang bestätigen
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onResolveCatch(false)}
                      >
                        Ablehnen
                      </button>
                    </div>
                  </>
                ) : (
                  <span>Fang gemeldet – warte auf die Bestätigung von X.</span>
                )
              ) : canReportPhotoCatch ? (
                <button type="button" onClick={onReportCatch}>
                  Foto-Fang melden
                </button>
              ) : (
                <span>Die Detektive gewinnen, wenn X ein Fangfoto bestätigt.</span>
              )}
              <small>Fotos werden nicht in die App hochgeladen.</small>
            </div>
          )}

          <p className="map-credit">
            {satelliteOn ? (
              <>
                Satellitenbild: Sentinel-2 cloudless 2025 ©{" "}
                <a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer">
                  EOX IT Services GmbH
                </a>                {" "}
                (
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CC BY-NC-SA 4.0
                </a>
                ) · Beschriftung von{" "}
                <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
                  OpenFreeMap
                </a>{" "}
                · ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OpenStreetMap
                </a>
              </>
            ) : (
              <>
                Karte: ©{" "}
                <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
                  OpenFreeMap
                </a>{" "}
                · © OpenMapTiles · Daten von{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OpenStreetMap
                </a>
              </>
            )}
          </p>
        </div>

        <div className="map-bottom-controls">
          {canChooseObjective && !choosingObjective && (
            <button onClick={() => setChoosingObjective(true)}>Ziel auf Karte wählen</button>
          )}
          {choosingObjective && (
            <button className="secondary" onClick={() => setChoosingObjective(false)}>
              Karte antippen · Abbrechen
            </button>
          )}
          {!choosingObjective && !simulated && (
            <button className="secondary" onClick={handleSimMode}>
              Simulationsmodus
            </button>
          )}
          {!choosingObjective && simulated && (
            <button className="secondary" onClick={enableRealGps}>
              GPS aktivieren
            </button>
          )}
          <button onClick={onLeave}>Verlassen</button>
        </div>

        <ChatPanel messages={chatMessages} myId={myId} onSend={onSendChat} />

        {transitDialogOpen && (
          <div
            className="transit-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setTransitDialogOpen(false);
            }}
          >
            <section
              className="transit-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="transit-dialog-title"
            >
              <h2 id="transit-dialog-title">ÖV-Haltestellen melden</h2>
              <p>
                Wähle Verkehrsmittel und Anzahl der Haltestellen. Die Detektive erhalten eine
                Nachricht.
              </p>

              <div className="transit-mode-toggle" role="group" aria-label="Verkehrsmittel">
                <button
                  type="button"
                  className={transitMode === "bus" ? undefined : "secondary"}
                  aria-pressed={transitMode === "bus"}
                  disabled={busRemaining === 0}
                  onClick={() => chooseTransitMode("bus")}
                >
                  Bus · noch {busRemaining}
                </button>
                <button
                  type="button"
                  className={transitMode === "train" ? undefined : "secondary"}
                  aria-pressed={transitMode === "train"}
                  disabled={trainRemaining === 0}
                  onClick={() => chooseTransitMode("train")}
                >
                  Zug · noch {trainRemaining}
                </button>
              </div>

              <label htmlFor="transit-count">Anzahl Haltestellen</label>
              <select
                id="transit-count"
                value={transitCount}
                onChange={(event) => setTransitCount(Number(event.target.value))}
              >
                {Array.from({ length: Math.max(1, transitRemaining) }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>

              <div className="transit-dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setTransitDialogOpen(false)}
                >
                  Abbrechen
                </button>
                <button type="button" disabled={transitRemaining < 1} onClick={confirmTransitStops}>
                  Melden
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function buildHint({
  phase,
  isX,
  isSolo,
  hasPosition,
  simulated,
  lastReveal,
  objective,
  phaseActive,
}: {
  phase: string;
  isX: boolean;
  isSolo: boolean;
  hasPosition: boolean;
  simulated: boolean;
  lastReveal: any;
  objective: ObjectiveState | null;
  phaseActive: boolean;
}): { title: string; text: string } {
  if (!hasPosition && phaseActive) {
    return {
      title: "Kein Standort.",
      text: simulated
        ? "Tippe auf die Karte, um dich zu bewegen."
        : "Tippe unten auf „Simulationsmodus“ (oder erlaube GPS), damit das Spiel dich sieht.",
    };
  }

  switch (phase) {
    case "COUNTDOWN":
      return isX
        ? {
            title: PHASE_TITLE.COUNTDOWN + ".",
            text: "Prüfe kurz deinen Standort – gleich startet dein Vorsprung.",
          }
        : {
            title: PHASE_TITLE.COUNTDOWN + ".",
            text: "X bekommt gleich Vorsprung. Mach dich bereit.",
          };

    case "HEADSTART":
      return isX
        ? {
            title: PHASE_TITLE.HEADSTART + ".",
            text: isSolo
              ? "Kein Detektiv im Raum – du kannst in Ruhe das Gebiet erkunden."
              : "Bewege dich in Deckung und bleib im Spielgebiet.",
          }
        : {
            title: PHASE_TITLE.HEADSTART + ".",
            text: "X läuft los – warte auf die erste Sichtung.",
          };

    case "RUNNING":
      if (isX) {
        if (objective?.status === "PENDING") {
          return {
            title: "Bonusmission verfügbar.",
            text: "Wähle einen sicheren, öffentlichen Ort im Spielgebiet. Erreichst du ihn, wird deine nächste Sichtung um 2 Minuten verschoben.",
          };
        }
        if (objective?.status === "ACTIVE") {
          return {
            title: "Bonusziel gesetzt.",
            text: `Erreiche die Markierung innerhalb von ${objective.radiusMeters} m, um die nächste Sichtung um 2 Minuten zu verschieben.`,
          };
        }
        if (objective?.status === "COMPLETED") {
          return {
            title: "Bonusmission geschafft!",
            text: "Deine nächste Sichtung kommt 2 Minuten später.",
          };
        }
        return {
          title: isSolo ? "Probelauf ohne Jäger." : "Du wirst gejagt.",
          text: isSolo
            ? "Allein im Raum: Verlässt du den Kreis, wird dein Standort dauerhaft geteilt. Öffne für eine echte Runde einen zweiten Tab und tritt mit dem Code bei."
            : "Bewege dich, bleib im Kreis. Verlässt du ihn, teilt der Server deinen Standort dauerhaft.",
        };
      }
      return lastReveal
        ? {
            title: "Letzte Sichtung.",
            text: `Vor ${Math.max(0, Math.round((Date.now() - lastReveal.at) / 1000))} s im roten Kreis – der Radius zeigt den Suchbereich.`,
          }
        : {
            title: "Noch keine Sichtung.",
            text: "Warte auf den ersten Reveal und halte dich in der Nähe des Gebiets.",
          };

    default:
      return { title: "Spiel läuft.", text: "Halte dich bereit." };
  }
}
