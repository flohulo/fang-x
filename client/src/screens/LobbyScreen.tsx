import { LocationAccess } from "../components/LocationAccess";
import { useLocationPermission } from "../lib/useLocationPermission";
import type { Ruleset, XSeesDetectives } from "@fang-x/shared";
import { DEFAULT_RULESET } from "@fang-x/shared";
import { type ReactNode, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { docsUrl } from "../lib/docs";
import { inviteUrl } from "../lib/invite";
import type { PlayerView } from "../lib/useGame";

interface LobbyScreenProps {
  code: string;
  players: PlayerView[];
  myId: string | null;
  youAreHost: boolean;
  ruleset: Ruleset | null;
  onConfigure: (ruleset: Ruleset) => void;
  onSetRole: (playerId: string, wantsX: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
}

export function LobbyScreen({
  code,
  players,
  myId,
  youAreHost,
  ruleset,
  onConfigure,
  onSetRole,
  onStart,
  onLeave,
}: LobbyScreenProps) {
  const { t } = useTranslation();
  const [localRuleset, setLocalRuleset] = useState<Ruleset>(ruleset ?? DEFAULT_RULESET);
  const [copied, setCopied] = useState<null | "link" | "code">(null);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const location = useLocationPermission();
  const [skipLocation, setSkipLocation] = useState(false);
  const [startLocationError, setStartLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeInfoKey) return;
    const handleDocClick = () => setActiveInfoKey(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveInfoKey(null);
    };
    window.addEventListener("click", handleDocClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleDocClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeInfoKey]);

  useEffect(() => {
    if (ruleset) setLocalRuleset(ruleset);
  }, [ruleset]);

  const handleConfigure = (updates: Partial<Ruleset>) => {
    const updated = { ...localRuleset, ...updates };
    setLocalRuleset(updated);
    if (youAreHost) onConfigure(updated);
  };

  const updateNested = (key: string, updates: Record<string, unknown>) => {
    const current = (localRuleset as any)[key] ?? {};
    const updated = { ...localRuleset, [key]: { ...current, ...updates } };
    setLocalRuleset(updated);
    if (youAreHost) onConfigure(updated);
  };

  const setStartLocation = () => {
    setStartLocationError(null);
    if (!navigator.geolocation) {
      setStartLocationError(t("lobby.geoUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateNested("map", {
          startLocation: { lat: coords.latitude, lng: coords.longitude },
        });
      },
      (error) => {
        setStartLocationError(
          error.code === error.PERMISSION_DENIED ? t("lobby.geoDenied") : t("lobby.geoFailed"),
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  };

  const flashCopied = (what: "link" | "code") => {
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const shareInvite = async () => {
    const url = inviteUrl(code, window.location.origin);
    const text = t("lobby.shareText", { code });
    if (navigator.share) {
      try {
        await navigator.share({ title: "Fang X", text, url });
        return;
      } catch {
        // Teilen abgebrochen – dann wenigstens in die Zwischenablage legen.
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      flashCopied("link");
    } catch {
      // Zwischenablage gesperrt – der Code steht ja sichtbar da.
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard?.writeText(code);
      flashCopied("code");
    } catch {
      // ignorieren
    }
  };

  const hasX = players.some((p) => p.wantsX);
  const hasDetective = players.some((p) => !p.wantsX);
  const others = players.filter((p) => p.id !== myId);
  const locationOk = location.state === "granted" || skipLocation;
  const canStart = hasX && locationOk;

  return (
    <div className="screen">
      <h1>{t("lobby.title")}</h1>

      {!youAreHost && (
        <div className="card lobby-waiting-card">
          <h3>{t("lobby.waiting.title")}</h3>
          <p>{t("lobby.waiting.text")}</p>
          <a href={docsUrl()} target="_blank" rel="noopener noreferrer">
            {t("lobby.waiting.docsLink")}
          </a>
        </div>
      )}

      <div className="card">
        <label>{t("lobby.codeLabel")}</label>
        <div className="code-display">{code}</div>
        <button onClick={shareInvite} style={{ marginTop: 12 }}>
          {copied === "link" ? t("lobby.linkCopied") : t("lobby.shareInvite")}
        </button>
        <button className="secondary" style={{ marginTop: 8 }} onClick={copyCode}>
          {copied === "code" ? t("lobby.codeCopied") : t("lobby.copyCode")}
        </button>
      </div>

      <div className="card">
        <h3>{t("lobby.myPlayer")}</h3>
        {myId && (
          <ul className="players-list">
            <PlayerRow
              player={players.find((p) => p.id === myId)}
              isMe={true}
              onToggleRole={(wantsX) => onSetRole(myId, wantsX)}
            />
          </ul>
        )}
      </div>

      <div className="card">
        <h3>
          {t("lobby.otherPlayers")}
          {others.length > 0 && <span className="count-badge">{others.length}</span>}
        </h3>
        {others.length === 0 ? (
          <p className="empty-hint">
            {t("lobby.nobodyYet")}
            <span>{t("lobby.shareCodeHint", { code })}</span>
          </p>
        ) : (
          <ul className="players-list">
            {others.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                isMe={false}
                onToggleRole={(wantsX) => youAreHost && onSetRole(p.id, wantsX)}
                canToggle={youAreHost}
              />
            ))}
          </ul>
        )}
      </div>

      <LocationAccess state={location.state} busy={location.busy} onRequest={location.request} />

      {youAreHost && (
        <div className="card">
          <h3>{t("lobby.settings")}</h3>
          <div className="config-field">
            <div className="config-label-row">
              <label htmlFor="cfg-ruleset-name">{t("lobby.rulesetName")}</label>
            </div>
            <input
              id="cfg-ruleset-name"
              type="text"
              maxLength={40}
              placeholder={t("lobby.rulesetNamePlaceholder")}
              value={localRuleset.name}
              onChange={(event) => handleConfigure({ name: event.target.value })}
            />
            <p className="config-hint">{t("lobby.rulesetNameHint")}</p>
          </div>
          <div className="optional-game-settings">
            <p>{t("lobby.rolesFromLobby")}</p>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.game.detectivesWaitDuringHeadStart}
                  onChange={(event) =>
                    updateNested("game", { detectivesWaitDuringHeadStart: event.target.checked })
                  }
                />
                {t("lobby.detectivesWait")}
              </label>
            </ConfigOptionHelp>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.movement.detectivesShareLiveLocation}
                  onChange={(event) =>
                    updateNested("movement", {
                      detectivesShareLiveLocation: event.target.checked,
                    })
                  }
                />
                {t("lobby.detectivesShareLive")}
              </label>
            </ConfigOptionHelp>
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-x-sees-detectives">{t("lobby.xSeesDetectives")}</label>
                <WikiInfoLink />
              </div>
              <select
                id="cfg-x-sees-detectives"
                value={localRuleset.reveal.xSeesDetectives}
                onChange={(event) =>
                  updateNested("reveal", {
                    xSeesDetectives: event.target.value as XSeesDetectives,
                  })
                }
              >
                <option value="ALWAYS">{t("lobby.xSees.ALWAYS")}</option>
                <option value="ON_REVEAL">{t("lobby.xSees.ON_REVEAL")}</option>
                <option value="NEVER">{t("lobby.xSees.NEVER")}</option>
              </select>
            </div>
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-catch-method">{t("lobby.catchRule")}</label>
                <WikiInfoLink />
              </div>
              <select
                id="cfg-catch-method"
                value={localRuleset.catch.method}
                onChange={(event) =>
                  updateNested("catch", {
                    method:
                      event.target.value === "PHOTO_CONFIRMATION" ? "PHOTO_CONFIRMATION" : "RADIUS",
                  })
                }
              >
                <option value="PHOTO_CONFIRMATION">
                  {t("lobby.catchMethod.PHOTO_CONFIRMATION")}
                </option>
                <option value="RADIUS">{t("lobby.catchMethod.RADIUS")}</option>
              </select>
            </div>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.catch.xCanSurrender}
                  onChange={(event) =>
                    updateNested("catch", { xCanSurrender: event.target.checked })
                  }
                />
                {t("lobby.xCanSurrender")}
              </label>
            </ConfigOptionHelp>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.movement.xTransitBudget.enabled}
                  onChange={(event) =>
                    updateNested("movement", {
                      xTransitBudget: {
                        ...localRuleset.movement.xTransitBudget,
                        enabled: event.target.checked,
                      },
                    })
                  }
                />
                {t("lobby.transitBudget")}
              </label>
            </ConfigOptionHelp>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.movement.xTransportModes.includes("TRANSIT")}
                  onChange={(event) =>
                    updateNested("movement", {
                      xTransportModes: event.target.checked
                        ? [...localRuleset.movement.xTransportModes, "TRANSIT"]
                        : localRuleset.movement.xTransportModes.filter(
                            (mode) => mode !== "TRANSIT",
                          ),
                    })
                  }
                />
                {t("lobby.transitForX")}
              </label>
            </ConfigOptionHelp>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.movement.transportModes.includes("TRANSIT")}
                  onChange={(event) =>
                    updateNested("movement", {
                      transportModes: event.target.checked
                        ? [...localRuleset.movement.transportModes, "TRANSIT"]
                        : localRuleset.movement.transportModes.filter((mode) => mode !== "TRANSIT"),
                    })
                  }
                />
                {t("lobby.transitForDetectives")}
              </label>
            </ConfigOptionHelp>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.map.outOfBoundsEnabled}
                  onChange={(event) =>
                    updateNested("map", { outOfBoundsEnabled: event.target.checked })
                  }
                />
                {t("lobby.outOfBounds")}
              </label>
            </ConfigOptionHelp>
            {localRuleset.movement.xTransitBudget.enabled && (
              <div className="config-field">
                <div className="config-grid">
                  <div className="config-field">
                    <div className="config-label-row">
                      <label htmlFor="cfg-bus-stops">{t("lobby.busStopsForX")}</label>
                      <WikiInfoLink />
                    </div>
                    <input
                      id="cfg-bus-stops"
                      type="number"
                      min="0"
                      value={localRuleset.movement.xTransitBudget.busStops}
                      onChange={(event) =>
                        updateNested("movement", {
                          xTransitBudget: {
                            ...localRuleset.movement.xTransitBudget,
                            busStops: Math.max(0, Number(event.target.value) || 0),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="config-field">
                    <div className="config-label-row">
                      <label htmlFor="cfg-train-stops">{t("lobby.trainStopsForX")}</label>
                      <WikiInfoLink />
                    </div>
                    <input
                      id="cfg-train-stops"
                      type="number"
                      min="0"
                      value={localRuleset.movement.xTransitBudget.trainStops}
                      onChange={(event) =>
                        updateNested("movement", {
                          xTransitBudget: {
                            ...localRuleset.movement.xTransitBudget,
                            trainStops: Math.max(0, Number(event.target.value) || 0),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="config-field">
              <div className="config-label-row">
                <label>{t("lobby.startPoint")}</label>
                <WikiInfoLink />
              </div>
              <button className="secondary" type="button" onClick={setStartLocation}>
                {localRuleset.map.startLocation
                  ? t("lobby.startPointUpdate")
                  : t("lobby.startPointSet")}
              </button>
              {localRuleset.map.startLocation && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => updateNested("map", { startLocation: null })}
                  style={{ marginTop: 8 }}
                >
                  {t("lobby.startPointRemove")}
                </button>
              )}
              {localRuleset.map.startLocation && (
                <p className="config-hint">{t("lobby.startPointDone")}</p>
              )}
              {startLocationError && (
                <p className="error" role="alert">
                  {startLocationError}
                </p>
              )}
              <p className="config-hint">{t("lobby.startPointHint")}</p>
            </div>
          </div>
          <div className="config-grid">
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-duration">{t("lobby.duration")}</label>
                <ParamInfoButton
                  paramKey="duration"
                  isOpen={activeInfoKey === "duration"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "duration" ? null : "duration"))
                  }
                />
              </div>
              <input
                id="cfg-duration"
                type="text"
                inputMode="numeric"
                value={localRuleset.game.durationMinutes}
                onChange={(e) =>
                  updateNested("game", {
                    durationMinutes: parseInt(e.target.value, 10) || 30,
                  })
                }
              />
              {activeInfoKey === "duration" && (
                <ParamPopover
                  paramKey="duration"
                  align="left"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-headstart">{t("lobby.headStart")}</label>
                <ParamInfoButton
                  paramKey="headStart"
                  isOpen={activeInfoKey === "headStart"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "headStart" ? null : "headStart"))
                  }
                />
              </div>
              <input
                id="cfg-headstart"
                type="text"
                inputMode="numeric"
                value={localRuleset.game.headStartMinutes}
                onChange={(e) =>
                  updateNested("game", {
                    headStartMinutes: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              {activeInfoKey === "headStart" && (
                <ParamPopover
                  paramKey="headStart"
                  align="right"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-countdown">{t("lobby.countdown")}</label>
                <WikiInfoLink />
              </div>
              <input
                id="cfg-countdown"
                type="number"
                min="0"
                max="60"
                value={localRuleset.game.countdownSeconds}
                onChange={(event) =>
                  updateNested("game", {
                    countdownSeconds: Math.max(0, Math.min(60, Number(event.target.value) || 0)),
                  })
                }
              />
            </div>

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-first-reveal">{t("lobby.firstReveal")}</label>
                <ParamInfoButton
                  paramKey="firstReveal"
                  isOpen={activeInfoKey === "firstReveal"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "firstReveal" ? null : "firstReveal"))
                  }
                />
              </div>
              <input
                id="cfg-first-reveal"
                type="number"
                min="0"
                step="0.5"
                value={localRuleset.reveal.firstRevealAfterMinutes}
                onChange={(e) =>
                  updateNested("reveal", {
                    firstRevealAfterMinutes: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
              {activeInfoKey === "firstReveal" && (
                <ParamPopover
                  paramKey="firstReveal"
                  align="left"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-interval">{t("lobby.interval")}</label>
                <ParamInfoButton
                  paramKey="interval"
                  isOpen={activeInfoKey === "interval"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "interval" ? null : "interval"))
                  }
                />
              </div>
              <input
                id="cfg-interval"
                type="text"
                inputMode="numeric"
                value={localRuleset.reveal.intervalMinutes}
                onChange={(e) =>
                  updateNested("reveal", {
                    intervalMinutes: parseInt(e.target.value, 10) || 3,
                  })
                }
              />
              {activeInfoKey === "interval" && (
                <ParamPopover
                  paramKey="interval"
                  align="left"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-revealradius">{t("lobby.revealRadius")}</label>
                <ParamInfoButton
                  paramKey="revealRadius"
                  isOpen={activeInfoKey === "revealRadius"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "revealRadius" ? null : "revealRadius"))
                  }
                />
              </div>
              <input
                id="cfg-revealradius"
                type="text"
                inputMode="numeric"
                value={localRuleset.reveal.revealRadiusMeters}
                onChange={(e) =>
                  updateNested("reveal", {
                    revealRadiusMeters: parseInt(e.target.value, 10) || 5,
                  })
                }
              />
              {activeInfoKey === "revealRadius" && (
                <ParamPopover
                  paramKey="revealRadius"
                  align="right"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>

            {localRuleset.catch.method === "RADIUS" && (
              <div className="config-field">
                <div className="config-label-row">
                  <label htmlFor="cfg-catchradius">{t("lobby.catchRadius")}</label>
                  <ParamInfoButton
                    paramKey="catchRadius"
                    isOpen={activeInfoKey === "catchRadius"}
                    onToggle={() =>
                      setActiveInfoKey((prev) => (prev === "catchRadius" ? null : "catchRadius"))
                    }
                  />
                </div>
                <input
                  id="cfg-catchradius"
                  type="text"
                  inputMode="numeric"
                  value={localRuleset.catch.radiusMeters}
                  onChange={(e) =>
                    updateNested("catch", {
                      radiusMeters: parseInt(e.target.value, 10) || 30,
                    })
                  }
                />
                {activeInfoKey === "catchRadius" && (
                  <ParamPopover
                    paramKey="catchRadius"
                    align="left"
                    onClose={() => setActiveInfoKey(null)}
                  />
                )}
              </div>
            )}

            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-playarea">{t("lobby.playArea")}</label>
                <ParamInfoButton
                  paramKey="playArea"
                  isOpen={activeInfoKey === "playArea"}
                  onToggle={() =>
                    setActiveInfoKey((prev) => (prev === "playArea" ? null : "playArea"))
                  }
                />
              </div>
              <input
                id="cfg-playarea"
                type="text"
                inputMode="numeric"
                value={localRuleset.map.playAreaRadiusMeters}
                onChange={(e) =>
                  updateNested("map", {
                    playAreaRadiusMeters: parseInt(e.target.value, 10) || 700,
                  })
                }
              />
              {activeInfoKey === "playArea" && (
                <ParamPopover
                  paramKey="playArea"
                  align="right"
                  onClose={() => setActiveInfoKey(null)}
                />
              )}
            </div>
          </div>

          <div className="objective-field">
            <div className="objective-label-row">
              <label className="objective-option" htmlFor="cfg-objective">
                <input
                  id="cfg-objective"
                  type="checkbox"
                  checked={localRuleset.objective.enabled}
                  onChange={(e) => updateNested("objective", { enabled: e.target.checked })}
                />
                {t("lobby.objective")}
              </label>
              <ParamInfoButton
                paramKey="objective"
                isOpen={activeInfoKey === "objective"}
                onToggle={() =>
                  setActiveInfoKey((prev) => (prev === "objective" ? null : "objective"))
                }
              />
            </div>
            {activeInfoKey === "objective" && (
              <ParamPopover
                paramKey="objective"
                align="right"
                onClose={() => setActiveInfoKey(null)}
              />
            )}
          </div>

          <div className="config-wiki-footer">
            <span className="config-wiki-footer-text">{t("lobby.wikiFooter")}</span>
            <a
              href={docsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="config-wiki-footer-link"
            >
              {t("lobby.wikiFooterLink")}
            </a>
          </div>

          <button onClick={onStart} disabled={!canStart} style={{ marginTop: 16 }}>
            {!hasX ? t("lobby.needX") : !locationOk ? t("lobby.needLocation") : t("lobby.start")}
          </button>
          {hasX && !locationOk && (
            <button className="link-button" type="button" onClick={() => setSkipLocation(true)}>
              {t("lobby.skipLocation")}
            </button>
          )}

          {hasX && !hasDetective && (
            <p className="config-hint">
              <Trans i18nKey="lobby.dryRun" values={{ code }} components={{ 1: <strong /> }} />
            </p>
          )}
        </div>
      )}

      <button className="secondary lobby-leave-button" onClick={onLeave}>
        {t("lobby.leave")}
      </button>
    </div>
  );
}

function PlayerRow({
  player,
  isMe,
  onToggleRole,
  canToggle = true,
}: {
  player: PlayerView | undefined;
  isMe: boolean;
  onToggleRole: (wantsX: boolean) => void;
  canToggle?: boolean;
}) {
  const { t } = useTranslation();
  if (!player) return null;

  const canEdit = isMe || canToggle;
  const roleText = player.wantsX ? t("common.roleX") : t("common.roleDetective");

  return (
    <li className={`player-row${isMe ? " is-me" : ""}`}>
      <span className="player-avatar" style={{ background: player.color }} aria-hidden="true">
        {(player.name?.trim()?.[0] ?? "?").toUpperCase()}
      </span>

      <span className="player-name">
        {player.name || t("common.unnamed")}
        {isMe && <span className="me-badge">{t("lobby.you")}</span>}
        {player.connected === false && (
          <span className="offline-badge" title={t("lobby.disconnectedTitle")}>
            {t("lobby.disconnected")}
          </span>
        )}
      </span>

      {canEdit ? (
        <label className="role-toggle" title={t("lobby.toggleRole")}>
          <input
            type="checkbox"
            checked={!!player.wantsX}
            onChange={(e) => onToggleRole(e.target.checked)}
            aria-label={t("lobby.playerRole", { name: player.name, role: roleText })}
          />
          <span className="role-label">{roleText}</span>
          <span className="role-track" aria-hidden="true">
            <span className="role-knob" />
          </span>
        </label>
      ) : (
        <span className={`role-pill${player.wantsX ? " is-x" : " is-det"}`}>{roleText}</span>
      )}
    </li>
  );
}

function WikiInfoLink() {
  const { t } = useTranslation();
  return (
    <a
      href={docsUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="param-info-btn param-info-link"
      aria-label={t("lobby.wikiLinkLabel")}
      title={t("lobby.wikiLinkTitle")}
    >
      i
    </a>
  );
}

function ConfigOptionHelp({ children }: { children: ReactNode }) {
  return (
    <div className="config-label-row">
      {children}
      <WikiInfoLink />
    </div>
  );
}

/** Handbuchseite je Parameter; Titel, Beschreibung und Empfehlung stehen in den Übersetzungen. */
const PARAM_WIKI_PAGES = {
  duration: "Spieldauer",
  headStart: "Vorsprung-fuer-X",
  interval: "Reveal-Intervall",
  firstReveal: "Reveal-Intervall",
  revealRadius: "Sichtradius",
  catchRadius: "Fangradius",
  playArea: "Spielgebiet",
  objective: "Bonusmission-fuer-X",
} as const;

type ParamKey = keyof typeof PARAM_WIKI_PAGES;

function ParamInfoButton({
  paramKey,
  isOpen,
  onToggle,
}: {
  paramKey: ParamKey;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const title = t(`lobby.params.${paramKey}.title`);

  return (
    <button
      type="button"
      className={`param-info-btn${isOpen ? " is-active" : ""}`}
      aria-label={t("lobby.params.explain", { title })}
      aria-expanded={isOpen}
      title={t("lobby.params.infoTitle", { title })}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      i
    </button>
  );
}

function ParamPopover({
  paramKey,
  align = "left",
  onClose,
}: {
  paramKey: ParamKey;
  align?: "left" | "right";
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`param-popover align-${align}`}
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="param-popover-header">
        <span className="param-popover-title">{t(`lobby.params.${paramKey}.title`)}</span>
        <button
          type="button"
          className="param-popover-close"
          aria-label={t("common.close")}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="param-popover-desc">{t(`lobby.params.${paramKey}.description`)}</p>
      <div className="param-popover-badge">{t(`lobby.params.${paramKey}.recommendation`)}</div>
      <a
        href={docsUrl(PARAM_WIKI_PAGES[paramKey])}
        target="_blank"
        rel="noopener noreferrer"
        className="param-popover-wiki"
      >
        {t("lobby.params.readMore")}
      </a>
    </div>
  );
}
