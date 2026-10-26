import { useEffect, useState } from "react";
import { normalizeCodeInput } from "../lib/invite";

const NAME_STORAGE_KEY = "fangx:name";
const MAX_NAME_LENGTH = 24;

interface HomeScreenProps {
  /** Aus einem Einladungslink (?code=…) übernommener Code */
  initialCode: string;
  /** Fehlermeldung vom Beitrittsversuch */
  notice: string | null;
  busy: boolean;
  onCreateGame: (name: string) => void;
  onJoinGame: (code: string, name: string, wantsX: boolean) => void;
}

function loadStoredName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function HomeScreen({
  initialCode,
  notice,
  busy,
  onCreateGame,
  onJoinGame,
}: HomeScreenProps) {
  const [name, setName] = useState(loadStoredName);
  const [code, setCode] = useState(initialCode);
  const [wantsX, setWantsX] = useState(false);

  // Namen lokal merken – kein Konto, nur damit man ihn nicht erneut tippen muss.
  useEffect(() => {
    try {
      localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
      // Speicher nicht verfügbar (privater Modus) – dann eben nicht.
    }
  }, [name]);

  const canJoin = code.length === 6 && !busy;

  return (
    <div className="screen">
      <h1>Fang X</h1>
      <p className="subtitle">Das GPS-Fangspiel für draussen</p>

      {notice && (
        <div className="error" style={{ maxWidth: 420, width: "100%" }}>
          {notice}
        </div>
      )}

      <div className="card">
        <label htmlFor="player-name">Dein Name</label>
        <input
          id="player-name"
          type="text"
          placeholder="deine Namen im Spiel"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Neues Spiel</h3>
        <p className="card-text">Du legst den Raum an, stellst die Regeln ein.</p>
        <button onClick={() => onCreateGame(name)} disabled={busy}>
          Neues Spiel starten
        </button>
      </div>

      <div className="card">
        <h3>Spiel beitreten</h3>
        <label htmlFor="game-code">Spiel-Code</label>
        <input
          id="game-code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="6 Zeichen"
          value={code}
          maxLength={6}
          style={{ textAlign: "center", letterSpacing: 4, fontFamily: "monospace" }}
          onChange={(e) => setCode(normalizeCodeInput(e.target.value))}
        />

        <div className="form-row">
          <span className="form-row-label">Ich spiele als</span>
          <label className="role-toggle" title="Rolle wählen">
            <input
              type="checkbox"
              checked={wantsX}
              onChange={(e) => setWantsX(e.target.checked)}
              aria-label="Als X spielen"
            />
            <span className="role-label">{wantsX ? "X" : "Detektiv"}</span>
            <span className="role-track" aria-hidden="true">
              <span className="role-knob" />
            </span>
          </label>
        </div>

        <button
          onClick={() => onJoinGame(code, name, wantsX)}
          disabled={!canJoin}
          className="secondary"
          style={{ marginTop: 12 }}
        >
          {busy ? "Prüfe Code …" : "Spiel beitreten"}
        </button>

        {initialCode && (
          <p className="card-text">
            Einladung erkannt — Code <strong>{initialCode}</strong> ist schon eingetragen.
          </p>
        )}
      </div>

      <p className="privacy-note">
        Dein Standort wird nur während eines aktiven Spiels an Mitspieler übertragen. Es werden
        keine Konten, E-Mails oder Standortverläufe gespeichert.
      </p>

      <footer className="legal-links">
        <a href="/impressum">Impressum</a>
        <span aria-hidden="true">·</span>
        <a href="/datenschutz">Datenschutz</a>
      </footer>
      <a className="app-version" href="/changelog">
        Version {__APP_VERSION__}
      </a>
    </div>
  );
}
