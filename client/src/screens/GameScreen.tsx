import type { LatLng, ObjectiveState } from "@fang-x/shared";
import { distanceMeters } from "@fang-x/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapView } from "../components/MapView";
import { useGeolocation } from "../lib/useGeolocation";

interface GameScreenProps {
  code: string;
  phase: string;
  phaseEndsAt: number | null;
  playAreaCenter: LatLng | null;
  players: any[];
  myId: string | null;
  ruleset: any;
  lastReveal: any;
  objective: ObjectiveState | null;
  serverError: string | null;
  yourPositionIsShared: boolean;
  gameResult: any;
  onPosition: (pos: LatLng) => void;
  onSetObjective: (target: LatLng) => void;
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
  serverError,
  yourPositionIsShared,
  gameResult,
  onPosition,
  onSetObjective,
  onLeave,
}: GameScreenProps) {
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSimHint, setShowSimHint] = useState(false);
  const [choosingObjective, setChoosingObjective] = useState(false);
  const lastSentRef = useRef<number>(0);

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
    phase === "HEADSTART" || phase === "RUNNING",
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

  const me = players.find((p) => p.id === myId);
  const isX = me?.role === "X";
  const detectiveCount = players.filter((p) => p.role === "DETECTIVE").length;
  const isSolo = players.length > 0 && detectiveCount === 0 && isX;

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
          onMapClick={handleMapClick}
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

        {error && !simulated && (
          <div className="alert-banner" style={{ bottom: 200 }}>
            GPS-Fehler: {error}
          </div>
        )}

        <div className="game-status">
          <div className="game-status-head">
            <span className={`area-chip${isOutside ? " is-out" : ""}`}>
              {metersToEdge === null
                ? "Standort unbekannt"
                : isOutside
                  ? `${Math.abs(metersToEdge)} m außerhalb`
                  : `${metersToEdge} m bis zum Rand`}
            </span>
            <span className={`gps-chip${position === null ? " is-off" : ""}`}>
              {simulated ? "Simulation" : position ? "GPS aktiv" : "kein GPS"}
            </span>
            {isSolo && <span className="solo-chip">Probelauf · {code}</span>}
          </div>

          <p className="game-hint">
            <strong>{hint.title}</strong> {hint.text}
          </p>

          <p className="map-credit">
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
