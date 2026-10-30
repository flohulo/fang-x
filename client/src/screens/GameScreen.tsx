import type { ChatMessage, LatLng, ObjectiveState, RevealEvent, Ruleset } from "@fang-x/shared";
import { distanceMeters } from "@fang-x/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { Trans, useTranslation } from "react-i18next";
import { ChatPanel } from "../components/ChatPanel";
import { MapView } from "../components/MapView";
import {
  buildSettingsExport,
  downloadSettingsExport,
  settingsExportFileName,
} from "../lib/settingsExport";
import { formatEndReason } from "../lib/serverMessages";
import { useGeolocation } from "../lib/useGeolocation";
import type { GameResult, PlayerView } from "../lib/useGame";

interface GameScreenProps {
  code: string;
  phase: string;
  phaseEndsAt: number | null;
  playAreaCenter: LatLng | null;
  players: PlayerView[];
  myId: string | null;
  ruleset: Ruleset | null;
  lastReveal: RevealEvent | null;
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
  gameResult: GameResult | null;
  onPosition: (pos: LatLng) => void;
  onSetObjective: (target: LatLng) => void;
  onUseTransitStop: (mode: "bus" | "train", count: number) => void;
  onSendChat: (text: string) => void;
  onReportCatch: () => void;
  onResolveCatch: (caught: boolean) => void;
  onSurrender: () => void;
  onLeave: () => void;
}

const FALLBACK_CENTER: LatLng = { lat: 47.3769, lng: 8.5417 };

function externalLink(href: string) {
  // Der Linktext kommt aus der Übersetzung (Trans füllt ihn ein).
  return <a href={href} target="_blank" rel="noopener noreferrer" />;
}

const MAP_CREDIT_LINKS = {
  eox: externalLink("https://cloudless.eox.at"),
  cc: externalLink("https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de"),
  ofm: externalLink("https://openfreemap.org"),
  osm: externalLink("https://www.openstreetmap.org/copyright"),
  swisstopo: externalLink("https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10"),
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
  onSurrender,
  onLeave,
}: GameScreenProps) {
  const { t } = useTranslation();
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSimHint, setShowSimHint] = useState(false);
  const [choosingObjective, setChoosingObjective] = useState(false);
  const [transitDialogOpen, setTransitDialogOpen] = useState(false);
  const [surrenderDialogOpen, setSurrenderDialogOpen] = useState(false);
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
    if (!surrenderDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSurrenderDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [surrenderDialogOpen]);

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

  const hint = buildHint(t, {
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
  const canSurrender =
    isX && !!ruleset?.catch.xCanSurrender && (phase === "HEADSTART" || phase === "RUNNING");
  const surrender = gameResult?.surrender ?? null;

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
        {surrender?.pos && (
          <div className="map-container result-map">
            <MapView
              center={surrender.pos}
              playAreaRadiusMeters={0}
              players={[
                {
                  id: surrender.playerId,
                  name: surrender.name,
                  color: "#ef4444",
                  role: "X",
                  pos: surrender.pos,
                },
              ]}
              lastReveal={{
                pos: surrender.pos,
                radiusMeters: 0,
                at: surrender.at,
                index: 0,
                isLive: true,
              }}
              objective={null}
              startPoint={null}
            />
          </div>
        )}
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.5rem" }}>
            {gameResult.winner === "X" ? t("game.winnerX") : t("game.winnerDetectives")}
          </h2>
          {surrender && (
            <div className="surrender-result" role="status">
              <strong>{t("game.surrendered", { name: surrender.name })}</strong>
              <span>
                {surrender.pos ? t("game.surrenderLive") : t("game.surrenderNoPosition")}
              </span>
              {surrender.pos && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${surrender.pos.lat}&mlon=${surrender.pos.lng}#map=17/${surrender.pos.lat}/${surrender.pos.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("game.openInOsm")}
                </a>
              )}
            </div>
          )}
          <p style={{ color: "var(--text-dim)" }}>
            {formatEndReason(t, {
              reason: gameResult.reason,
              code: gameResult.reasonCode,
              params: gameResult.reasonParams,
            })}
          </p>
          <button onClick={onLeave} style={{ marginTop: 24 }}>
            {t("game.backToStart")}
          </button>
          {ruleset && (
            <>
              <button
                className="secondary"
                type="button"
                onClick={exportSettings}
                style={{ marginTop: 8 }}
              >
                {settingsExported ? t("game.settingsExported") : t("game.exportSettings")}
              </button>
              <p className="config-hint" style={{ marginTop: 12 }}>
                {t("game.exportHint", { name: ruleset.name.trim() || t("game.unnamedRuleset") })}
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
            <span className={`phase-badge phase-${phase}`}>{t(`game.phase.${phase}`, { defaultValue: phase })}</span>
            {timeLeft !== null && <span className="map-timer">{formatDuration(timeLeft)}</span>}
            <span className={`role-chip${isX ? " is-x" : " is-det"}`}>
              {isX ? t("game.youAreX") : t("game.youAreDetective")}
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
              <span>{t("game.nextReveal")}</span>
              <span>
                {revealTimer.indeterminate ? t("game.soon") : formatDuration(revealRemainingMs ?? 0)}
              </span>
            </div>
            <div
              className="reveal-progress-track"
              role="progressbar"
              aria-label={t("game.nextReveal")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={revealTimer.indeterminate ? undefined : Math.round(revealProgress)}
              aria-valuetext={
                revealTimer.indeterminate
                  ? t("game.timeUndetermined")
                  : t("game.timeRemaining", { time: formatDuration(revealRemainingMs ?? 0) })
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
            {t("game.leftArea")}
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
              <strong>{t("game.transitNotice.label")}</strong>{" "}
              {t(`game.transitNotice.${visibleTransitNotice.mode}`, {
                count: visibleTransitNotice.count,
              })}
            </span>
            <button
              type="button"
              className="transit-notice-close"
              aria-label={t("game.transitNotice.dismiss")}
              onClick={() => setDismissedTransitNoticeAt(visibleTransitNotice.at)}
            >
              ×
            </button>
          </div>
        )}

        {error && !simulated && (
          <div className="alert-banner" style={{ bottom: 200 }}>
            {t("game.gpsError", { error })}
          </div>
        )}

        <div className="game-status">
          <div className="game-status-head">
            <span
              className={`area-chip${ruleset?.map?.outOfBoundsEnabled && isOutside ? " is-out" : ""}`}
            >
              {ruleset?.map?.outOfBoundsEnabled
                ? metersToEdge === null
                  ? t("game.area.unknown")
                  : isOutside
                    ? t("game.area.outside", { meters: Math.abs(metersToEdge) })
                    : t("game.area.toEdge", { meters: metersToEdge })
                : t("game.area.none")}
            </span>
            <span className={`gps-chip${position === null ? " is-off" : ""}`}>
              {simulated ? t("game.gps.simulation") : position ? t("game.gps.active") : t("game.gps.off")}
            </span>
            {isSolo && <span className="solo-chip">{t("game.solo", { code })}</span>}
          </div>

          <p className="game-hint">
            <strong>{hint.title}</strong> {hint.text}
          </p>
          {isX && ruleset?.movement.xTransitBudget.enabled && (
            <div className="transit-budget">
              <div className="transit-budget-head">
                <span>
                  {t("game.transitBudget.summary", {
                    busUsed: transitStops.bus,
                    busLimit: busStopsLimit,
                    trainUsed: transitStops.train,
                    trainLimit: trainStopsLimit,
                  })}
                </span>
                {canUseTransitBudget && (
                  <button
                    type="button"
                    className="secondary transit-trigger"
                    disabled={busRemaining + trainRemaining === 0}
                    onClick={openTransitDialog}
                  >
                    {t("game.transitBudget.report")}
                  </button>
                )}
              </div>
              <small>
                {busRemaining + trainRemaining === 0
                  ? t("game.transitBudget.exhausted")
                  : t("game.transitBudget.reportEveryStop")}
              </small>
            </div>
          )}
          {ruleset?.catch.method === "PHOTO_CONFIRMATION" && phase === "RUNNING" && (
            <div className="photo-catch">
              {catchPending ? (
                isX ? (
                  <>
                    <strong>{t("game.photoCatch.reported")}</strong>
                    <span>{t("game.photoCatch.confirmPrompt")}</span>
                    <div className="transit-budget-actions">
                      <button type="button" onClick={() => onResolveCatch(true)}>
                        {t("game.photoCatch.confirm")}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onResolveCatch(false)}
                      >
                        {t("game.photoCatch.reject")}
                      </button>
                    </div>
                  </>
                ) : (
                  <span>{t("game.photoCatch.waiting")}</span>
                )
              ) : canReportPhotoCatch ? (
                <button type="button" onClick={onReportCatch}>
                  {t("game.photoCatch.report")}
                </button>
              ) : (
                <span>{t("game.photoCatch.rule")}</span>
              )}
              <small>{t("game.photoCatch.noUpload")}</small>
            </div>
          )}

          <p className="map-credit">
            <Trans
              i18nKey={satelliteOn ? "game.mapCredit.satellite" : "game.mapCredit.street"}
              components={MAP_CREDIT_LINKS}
            />
          </p>
        </div>

        <div className="map-bottom-controls">
          {canChooseObjective && !choosingObjective && (
            <button onClick={() => setChoosingObjective(true)}>{t("game.chooseObjective")}</button>
          )}
          {choosingObjective && (
            <button className="secondary" onClick={() => setChoosingObjective(false)}>
              {t("game.cancelChoosing")}
            </button>
          )}
          {!choosingObjective && !simulated && (
            <button className="secondary" onClick={handleSimMode}>
              {t("game.simulationMode")}
            </button>
          )}
          {!choosingObjective && simulated && (
            <button className="secondary" onClick={enableRealGps}>
              {t("game.enableGps")}
            </button>
          )}
          {canSurrender && !choosingObjective && (
            <button
              className="danger"
              type="button"
              aria-label={t("game.emergencyLabel")}
              onClick={() => setSurrenderDialogOpen(true)}
            >
              {t("game.emergency")}
            </button>
          )}
          <button onClick={onLeave}>{t("game.leave")}</button>
        </div>

        <ChatPanel messages={chatMessages} myId={myId} onSend={onSendChat} />

        {surrenderDialogOpen && (
          <div
            className="transit-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSurrenderDialogOpen(false);
            }}
          >
            <section
              className="transit-dialog surrender-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="surrender-dialog-title"
              aria-describedby="surrender-dialog-description"
            >
              <h2 id="surrender-dialog-title">{t("game.surrenderDialog.title")}</h2>
              <p id="surrender-dialog-description">{t("game.surrenderDialog.text")}</p>
              <div className="transit-dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSurrenderDialogOpen(false)}
                >
                  {t("game.surrenderDialog.keepPlaying")}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setSurrenderDialogOpen(false);
                    onSurrender();
                  }}
                >
                  {t("game.surrenderDialog.confirm")}
                </button>
              </div>
            </section>
          </div>
        )}

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
              <h2 id="transit-dialog-title">{t("game.transitDialog.title")}</h2>
              <p>{t("game.transitDialog.text")}</p>

              <div className="transit-mode-toggle" role="group" aria-label={t("game.transitDialog.mode")}>
                <button
                  type="button"
                  className={transitMode === "bus" ? undefined : "secondary"}
                  aria-pressed={transitMode === "bus"}
                  disabled={busRemaining === 0}
                  onClick={() => chooseTransitMode("bus")}
                >
                  {t("game.transitDialog.bus", { count: busRemaining })}
                </button>
                <button
                  type="button"
                  className={transitMode === "train" ? undefined : "secondary"}
                  aria-pressed={transitMode === "train"}
                  disabled={trainRemaining === 0}
                  onClick={() => chooseTransitMode("train")}
                >
                  {t("game.transitDialog.train", { count: trainRemaining })}
                </button>
              </div>

              <label htmlFor="transit-count">{t("game.transitDialog.count")}</label>
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
                  {t("common.cancel")}
                </button>
                <button type="button" disabled={transitRemaining < 1} onClick={confirmTransitStops}>
                  {t("game.transitDialog.confirm")}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function buildHint(
  t: TFunction,
  {
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
    lastReveal: RevealEvent | null;
    objective: ObjectiveState | null;
    phaseActive: boolean;
  },
): { title: string; text: string } {
  if (!hasPosition && phaseActive) {
    return {
      title: t("game.hint.noPosition.title"),
      text: simulated ? t("game.hint.noPosition.simulated") : t("game.hint.noPosition.real"),
    };
  }

  switch (phase) {
    case "COUNTDOWN":
      return {
        title: `${t("game.phaseTitle.COUNTDOWN")}.`,
        text: isX ? t("game.hint.countdownX") : t("game.hint.countdownDetective"),
      };

    case "HEADSTART":
      return {
        title: `${t("game.phaseTitle.HEADSTART")}.`,
        text: isX
          ? isSolo
            ? t("game.hint.headstartSolo")
            : t("game.hint.headstartX")
          : t("game.hint.headstartDetective"),
      };

    case "RUNNING":
      if (isX) {
        if (objective?.status === "PENDING") {
          return {
            title: t("game.hint.objectivePendingTitle"),
            text: t("game.hint.objectivePendingText"),
          };
        }
        if (objective?.status === "ACTIVE") {
          return {
            title: t("game.hint.objectiveActiveTitle"),
            text: t("game.hint.objectiveActiveText", { meters: objective.radiusMeters }),
          };
        }
        if (objective?.status === "COMPLETED") {
          return {
            title: t("game.hint.objectiveDoneTitle"),
            text: t("game.hint.objectiveDoneText"),
          };
        }
        return {
          title: isSolo ? t("game.hint.huntedSoloTitle") : t("game.hint.huntedTitle"),
          text: isSolo ? t("game.hint.huntedSoloText") : t("game.hint.huntedText"),
        };
      }
      return lastReveal
        ? {
            title: t("game.hint.lastRevealTitle"),
            text: t("game.hint.lastRevealText", {
              seconds: Math.max(0, Math.round((Date.now() - lastReveal.at) / 1000)),
            }),
          }
        : {
            title: t("game.hint.noRevealTitle"),
            text: t("game.hint.noRevealText"),
          };

    default:
      return { title: t("game.hint.defaultTitle"), text: t("game.hint.defaultText") };
  }
}
