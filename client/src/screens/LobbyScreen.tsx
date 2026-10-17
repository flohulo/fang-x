import { useEffect, useState } from "react";
import type { Ruleset } from "@fang-x/shared";
import { DEFAULT_RULESET } from "@fang-x/shared";
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
            <div>
              <label>Spieldauer (Minuten)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.game.durationMinutes}
                onChange={(e) =>
                  updateNested("game", {
                    durationMinutes: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
            <div>
              <label>Vorsprung (Minuten)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.game.headStartMinutes}
                onChange={(e) =>
                  updateNested("game", {
                    headStartMinutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label>Reveal-Intervall (Minuten)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.reveal.intervalMinutes}
                onChange={(e) =>
                  updateNested("reveal", {
                    intervalMinutes: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>
            <div>
              <label>Sichtradius (Meter)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.reveal.revealRadiusMeters}
                onChange={(e) =>
                  updateNested("reveal", {
                    revealRadiusMeters: parseInt(e.target.value) || 5,
                  })
                }
              />
            </div>
            <div>
              <label>Fangradius (Meter)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.catch.radiusMeters}
                onChange={(e) =>
                  updateNested("catch", {
                    radiusMeters: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
            <div>
              <label>Spielgebiet (Radius, Meter)</label>
              <input
                type="text"
                inputMode="numeric"
                value={localRuleset.map.playAreaRadiusMeters}
                onChange={(e) =>
                  updateNested("map", {
                    playAreaRadiusMeters: parseInt(e.target.value) || 700,
                  })
                }
              />
            </div>
          </div>

          <button onClick={onStart} disabled={!hasX} style={{ marginTop: 16 }}>
            {hasX ? "Spiel starten" : "Mindestens 1 X nötig"}
          </button>

          {hasX && !hasDetective && (
            <p className="config-hint">
              Probelauf ohne Detektiv — dich jagt niemand. Für eine echte Runde muss
              mindestens ein Detektiv beitreten (Code <strong>{code}</strong>).
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
