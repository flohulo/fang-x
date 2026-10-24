import type { Ruleset, XSeesDetectives } from "@fang-x/shared";
import { DEFAULT_RULESET } from "@fang-x/shared";
import { type ReactNode, useEffect, useState } from "react";
import { docsUrl } from "../lib/docs";
import { inviteUrl } from "../lib/invite";

interface LobbyScreenProps {
  code: string;
  players: any[];
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
  const [localRuleset, setLocalRuleset] = useState<Ruleset>(ruleset ?? DEFAULT_RULESET);
  const [copied, setCopied] = useState<null | "link" | "code">(null);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
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
      setStartLocationError("Standortfreigabe wird von diesem Browser nicht unterstützt.");
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
          error.code === error.PERMISSION_DENIED
            ? "Standortzugriff abgelehnt. Erlaube ihn in den Website-Einstellungen."
            : "Standort konnte nicht ermittelt werden. Prüfe GPS und versuche es erneut.",
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
    const text = `Lust auf eine Runde Fang X? 🕵️ Komm mit dem Spiel-Code ${code} dazu!`;
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
  const canStart = hasX;

  return (
    <div className="screen">
      <h1>Spielvorbereitung</h1>

      {!youAreHost && (
        <div className="card lobby-waiting-card">
          <h3>Warte auf den Admin</h3>
          <p>
            Der Admin legt die Spielregeln fest und startet die Runde. Bleib in der Lobby, bis das
            Spiel gestartet wird.
          </p>
          <a href={docsUrl()} target="_blank" rel="noopener noreferrer">
            Spielregeln im Handbuch ansehen ↗
          </a>
        </div>
      )}

      <div className="card">
        <label>Spiel-Code</label>
        <div className="code-display">{code}</div>
        <button onClick={shareInvite} style={{ marginTop: 12 }}>
          {copied === "link" ? "Link kopiert ✓" : "Einladung teilen"}
        </button>
        <button className="secondary" style={{ marginTop: 8 }} onClick={copyCode}>
          {copied === "code" ? "Code kopiert ✓" : "Nur Code kopieren"}
        </button>
      </div>

      <div className="card">
        <h3>Mein Spieler</h3>
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
          Mitspieler
          {others.length > 0 && <span className="count-badge">{others.length}</span>}
        </h3>
        {others.length === 0 ? (
          <p className="empty-hint">
            Noch niemand dabei.
            <span>Teile den Spiel-Code {code}, um Mitspieler einzuladen.</span>
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

      {youAreHost && (
        <div className="card">
          <h3>Spieleinstellungen</h3>
          <div className="config-field">
            <div className="config-label-row">
              <label htmlFor="cfg-ruleset-name">Name der Einstellungen</label>
            </div>
            <input
              id="cfg-ruleset-name"
              type="text"
              maxLength={40}
              placeholder="z. B. Samstagsrunde"
              value={localRuleset.name}
              onChange={(event) => handleConfigure({ name: event.target.value })}
            />
            <p className="config-hint">Erscheint im Dateinamen des Exports nach dem Spiel.</p>
          </div>
          <div className="optional-game-settings">
            <p>Die Rollen ergeben sich direkt aus den Mitspielern in der Lobby.</p>
            <ConfigOptionHelp>
              <label className="objective-option">
                <input
                  type="checkbox"
                  checked={localRuleset.game.detectivesWaitDuringHeadStart}
                  onChange={(event) =>
                    updateNested("game", { detectivesWaitDuringHeadStart: event.target.checked })
                  }
                />
                Detektive warten während des Vorsprungs und senden keinen Standort
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
                Detektive teilen während des Spiels gegenseitig ihren Live-Standort
              </label>
            </ConfigOptionHelp>
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-x-sees-detectives">X sieht Detektive</label>
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
                <option value="ALWAYS">Immer – Live-Standort der Detektive</option>
                <option value="ON_REVEAL">Nur bei jeder Sichtung</option>
                <option value="NEVER">Nie</option>
              </select>
            </div>
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-catch-method">Fangregel</label>
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
                <option value="PHOTO_CONFIRMATION">Foto-Fang: X bestätigt den Fang</option>
                <option value="RADIUS">Automatischer Fang im Fangradius</option>
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
                Notfall-Knopf für X: Spiel aufgeben und Standort teilen
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
                ÖV-Budget aktivieren (pro Haltestelle)
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
                Öffentlichen Verkehr für X erlauben
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
                Öffentlichen Verkehr für Detektive erlauben
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
                Spielfeldrand aktivieren
              </label>
            </ConfigOptionHelp>
            {localRuleset.movement.xTransitBudget.enabled && (
              <div className="config-field">
                <div className="config-grid">
                  <div className="config-field">
                    <div className="config-label-row">
                      <label htmlFor="cfg-bus-stops">Bus-Haltestellen für X</label>
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
                      <label htmlFor="cfg-train-stops">Zug-Haltestellen für X</label>
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
                <label>Startpunkt (optional)</label>
                <WikiInfoLink />
              </div>
              <button className="secondary" type="button" onClick={setStartLocation}>
                {localRuleset.map.startLocation
                  ? "Startpunkt aktualisieren"
                  : "Hier meinen Standort als Startpunkt festlegen"}
              </button>
              {localRuleset.map.startLocation && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => updateNested("map", { startLocation: null })}
                  style={{ marginTop: 8 }}
                >
                  Startpunkt entfernen
                </button>
              )}
              {localRuleset.map.startLocation && (
                <p className="config-hint">Startpunkt wurde festgelegt.</p>
              )}
              {startLocationError && (
                <p className="error" role="alert">
                  {startLocationError}
                </p>
              )}
              <p className="config-hint">
                Stelle dich dafür an den vereinbarten Treffpunkt. Die genaue Position wird nur für
                dieses Spiel gespeichert.
              </p>
            </div>
          </div>
          <div className="config-grid">
            <div className="config-field">
              <div className="config-label-row">
                <label htmlFor="cfg-duration">Spieldauer (Minuten)</label>
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
                <label htmlFor="cfg-headstart">Vorsprung (Minuten)</label>
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
                <label htmlFor="cfg-countdown">Countdown vor dem Start (Sekunden)</label>
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
                <label htmlFor="cfg-first-reveal">Erste Standortmeldung (Minuten)</label>
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
                <label htmlFor="cfg-interval">Reveal-Intervall (Minuten)</label>
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
                <label htmlFor="cfg-revealradius">Sichtradius (Meter)</label>
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
                  <label htmlFor="cfg-catchradius">Fangradius (Meter)</label>
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
                <label htmlFor="cfg-playarea">Spielgebiet (Radius, Meter)</label>
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
                Bonusmission für X aktivieren
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
            <span className="config-wiki-footer-text">💡 Fragen zu Taktiken & Einstellungen?</span>
            <a
              href={docsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="config-wiki-footer-link"
            >
              Handbuch öffnen ↗
            </a>
          </div>

          <button onClick={onStart} disabled={!canStart} style={{ marginTop: 16 }}>
            {!hasX ? "Mindestens 1 X nötig" : "Spiel starten"}
          </button>

          {hasX && !hasDetective && (
            <p className="config-hint">
              Probelauf ohne Detektiv — dich jagt niemand. Für eine echte Runde muss mindestens ein
              Detektiv beitreten (Code <strong>{code}</strong>).
            </p>
          )}
        </div>
      )}

      <button className="secondary lobby-leave-button" onClick={onLeave}>
        Spiel verlassen
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
  player: any;
  isMe: boolean;
  onToggleRole: (wantsX: boolean) => void;
  canToggle?: boolean;
}) {
  if (!player) return null;

  const canEdit = isMe || canToggle;
  const roleText = player.wantsX ? "X" : "Detektiv";

  return (
    <li className={`player-row${isMe ? " is-me" : ""}`}>
      <span className="player-avatar" style={{ background: player.color }} aria-hidden="true">
        {(player.name?.trim()?.[0] ?? "?").toUpperCase()}
      </span>

      <span className="player-name">
        {player.name || "Unbenannt"}
        {isMe && <span className="me-badge">Du</span>}
        {player.connected === false && (
          <span className="offline-badge" title="Verbindung getrennt – Platz bleibt frei">
            getrennt
          </span>
        )}
      </span>

      {canEdit ? (
        <label className="role-toggle" title="Rolle umschalten">
          <input
            type="checkbox"
            checked={!!player.wantsX}
            onChange={(e) => onToggleRole(e.target.checked)}
            aria-label={`${player.name}: Rolle ${roleText}`}
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
  return (
    <a
      href={docsUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="param-info-btn param-info-link"
      aria-label="Diese Einstellung im Handbuch nachlesen"
      title="Im Handbuch nachlesen"
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

interface ParamInfo {
  title: string;
  description: string;
  recommendation: string;
  wikiPage: string;
}

const PARAM_INFOS: Record<string, ParamInfo> = {
  duration: {
    title: "Spieldauer",
    description:
      "Gesamte Spielzeit der Runde. Schaffen die Detektive es innerhalb dieser Zeit nicht, X zu fangen, gewinnt X das Spiel.",
    recommendation: "Standard: 30 Min.",
    wikiPage: "Spieldauer",
  },
  headStart: {
    title: "Vorsprung",
    description:
      "Zeit in Minuten, die X vor Spielbeginn alleine hat, um Distanz aufzubauen. Detektive müssen währenddessen am Startpunkt warten.",
    recommendation: "Standard: 0 Min. (bei grossem Spielgebiet 2–20 Min. empfohlen)",
    wikiPage: "Vorsprung-fuer-X",
  },
  interval: {
    title: "Reveal-Intervall",
    description:
      "Takt in Minuten, in dem der Standort von X automatisch für alle Detektive auf der Karte aufgedeckt wird.",
    recommendation: "Standard: 3 Min. (kürzere Abstände erleichtern Detektiven die Jagd)",
    wikiPage: "Reveal-Intervall",
  },
  firstReveal: {
    title: "Erste Standortmeldung",
    description:
      "Zeit nach dem Ende des Vorsprungs, bis der Standort von X zum ersten Mal gemeldet wird.",
    recommendation: "0 Min. = sofort nach dem Vorsprung; danach gilt das eingestellte Intervall.",
    wikiPage: "Reveal-Intervall",
  },
  revealRadius: {
    title: "Sichtradius",
    description:
      "Unschärfe der Aufdeckung auf der Karte. Detektive sehen keinen exakten Punkt, sondern einen Kreis mit diesem Radius, in dem sich X aufhält.",
    recommendation: "Standard: 5 m (quasi exakter Punkt; 50–100 m für mehr Versteckspiel)",
    wikiPage: "Sichtradius",
  },
  catchRadius: {
    title: "Fangradius",
    description:
      "Maximaler GPS-Abstand zwischen Detektiv und X in Metern, bei dem der Fangversuch erfolgreich ausgelöst werden kann.",
    recommendation: "Standard: 30 m (gleicht normale Smartphone-GPS-Schwankungen aus)",
    wikiPage: "Fangradius",
  },
  playArea: {
    title: "Spielgebiet (Radius)",
    description:
      "Aktionsradius um den gemeinsamen Startpunkt. Verlässt X das Gebiet, wird zur Strafe der exakte Live-Standort übertragen!",
    recommendation: "Standard: 700 m",
    wikiPage: "Spielgebiet",
  },
  objective: {
    title: "Bonusmission für X",
    description:
      "X wählt während der Runde ein sicheres Ziel im Spielgebiet. Erreicht X es, wird die nächste Sichtung einmalig um 2 Minuten verschoben.",
    recommendation: "Optional: Taktisches Zusatzziel für X",
    wikiPage: "Bonusmission-fuer-X",
  },
};

function ParamInfoButton({
  paramKey,
  isOpen,
  onToggle,
}: {
  paramKey: keyof typeof PARAM_INFOS;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const info = PARAM_INFOS[paramKey];
  if (!info) return null;

  return (
    <button
      type="button"
      className={`param-info-btn${isOpen ? " is-active" : ""}`}
      aria-label={`Erklärung zu ${info.title}`}
      aria-expanded={isOpen}
      title={`Info zu ${info.title}`}
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
  paramKey: keyof typeof PARAM_INFOS;
  align?: "left" | "right";
  onClose: () => void;
}) {
  const info = PARAM_INFOS[paramKey];
  if (!info) return null;

  return (
    <div
      className={`param-popover align-${align}`}
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="param-popover-header">
        <span className="param-popover-title">{info.title}</span>
        <button
          type="button"
          className="param-popover-close"
          aria-label="Schliessen"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="param-popover-desc">{info.description}</p>
      <div className="param-popover-badge">{info.recommendation}</div>
      <a
        href={docsUrl(info.wikiPage)}
        target="_blank"
        rel="noopener noreferrer"
        className="param-popover-wiki"
      >
        Im Handbuch nachlesen ↗
      </a>
    </div>
  );
}
