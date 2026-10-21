import type { Ruleset } from "@fang-x/shared";
import { DEFAULT_RULESET } from "@fang-x/shared";
import { useEffect, useState } from "react";
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

  const flashCopied = (what: "link" | "code") => {
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const shareInvite = async () => {
    const url = inviteUrl(code, window.location.origin);
    const text = `Fang X – Spiel-Code ${code}`;
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

  return (
    <div className="screen">
      <h1>Spielvorbereitung</h1>

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
                    durationMinutes: parseInt(e.target.value) || 30,
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
                    headStartMinutes: parseInt(e.target.value) || 0,
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
                    intervalMinutes: parseInt(e.target.value) || 3,
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
                    revealRadiusMeters: parseInt(e.target.value) || 5,
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
                    radiusMeters: parseInt(e.target.value) || 30,
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
                    playAreaRadiusMeters: parseInt(e.target.value) || 700,
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
            <p className="config-hint">
              X wählt während der Runde ein sicheres, öffentliches Ziel im Spielgebiet. Erreicht X
              es, wird die nächste Sichtung einmalig um 2 Minuten verschoben.
            </p>
          </div>

          <div className="config-wiki-footer">
            <span className="config-wiki-footer-text">💡 Fragen zu Taktiken & Einstellungen?</span>
            <a
              href={WIKI_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="config-wiki-footer-link"
            >
              Handbuch im Wiki öffnen ↗
            </a>
          </div>

          <button onClick={onStart} disabled={!hasX} style={{ marginTop: 16 }}>
            {hasX ? "Spiel starten" : "Mindestens 1 X nötig"}
          </button>

          {hasX && !hasDetective && (
            <p className="config-hint">
              Probelauf ohne Detektiv — dich jagt niemand. Für eine echte Runde muss mindestens ein
              Detektiv beitreten (Code <strong>{code}</strong>).
            </p>
          )}
        </div>
      )}

      <button className="secondary" onClick={onLeave}>
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

const WIKI_BASE_URL = "https://github.com/flohulo/fang-x/wiki/Spieleinstellungen";

interface ParamInfo {
  title: string;
  description: string;
  recommendation: string;
  wikiAnchor: string;
}

const PARAM_INFOS: Record<string, ParamInfo> = {
  duration: {
    title: "Spieldauer",
    description:
      "Gesamte Spielzeit der Runde. Schaffen die Detektive es innerhalb dieser Zeit nicht, X zu fangen, gewinnt X das Spiel.",
    recommendation: "Standard: 30 Min.",
    wikiAnchor: "spieldauer",
  },
  headStart: {
    title: "Vorsprung für X",
    description:
      "Zeit in Minuten, die X vor Spielbeginn alleine hat, um Distanz aufzubauen. Detektive müssen währenddessen am Startpunkt warten.",
    recommendation: "Standard: 0 Min. (bei großem Spielgebiet 2–5 Min. empfohlen)",
    wikiAnchor: "vorsprung",
  },
  interval: {
    title: "Reveal-Intervall",
    description:
      "Takt in Minuten, in dem der Standort von X automatisch für alle Detektive auf der Karte aufgedeckt wird.",
    recommendation: "Standard: 3 Min. (kürzere Abstände erleichtern Detektiven die Jagd)",
    wikiAnchor: "reveal-intervall",
  },
  revealRadius: {
    title: "Sichtradius",
    description:
      "Unschärfe der Aufdeckung auf der Karte. Detektive sehen keinen exakten Punkt, sondern einen Kreis mit diesem Radius, in dem sich X aufhält.",
    recommendation: "Standard: 5 m (quasi exakter Punkt; 50–100 m für mehr Versteckspiel)",
    wikiAnchor: "sichtradius",
  },
  catchRadius: {
    title: "Fangradius",
    description:
      "Maximaler GPS-Abstand zwischen Detektiv und X in Metern, bei dem der Fangversuch erfolgreich ausgelöst werden kann.",
    recommendation: "Standard: 30 m (gleicht normale Smartphone-GPS-Schwankungen aus)",
    wikiAnchor: "fangradius",
  },
  playArea: {
    title: "Spielgebiet (Radius)",
    description:
      "Aktionsradius um den gemeinsamen Startpunkt. Verlässt X das Gebiet, wird zur Strafe der exakte Live-Standort übertragen!",
    recommendation: "Standard: 700 m",
    wikiAnchor: "spielgebiet",
  },
  objective: {
    title: "Bonusmission für X",
    description:
      "X wählt während der Runde ein sicheres Ziel im Spielgebiet. Erreicht X es, wird die nächste Sichtung einmalig um 2 Minuten verschoben.",
    recommendation: "Optional: Taktisches Zusatzziel für X",
    wikiAnchor: "bonusmission",
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
          aria-label="Schließen"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="param-popover-desc">{info.description}</p>
      <div className="param-popover-badge">{info.recommendation}</div>
      <a
        href={`${WIKI_BASE_URL}#${info.wikiAnchor}`}
        target="_blank"
        rel="noopener noreferrer"
        className="param-popover-wiki"
      >
        Im Wiki nachlesen ↗
      </a>
    </div>
  );
}
