import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <p className="subtitle">{t("home.subtitle")}</p>

      {notice && (
        <div className="error" style={{ maxWidth: 420, width: "100%" }}>
          {notice}
        </div>
      )}

      <div className="card">
        <label htmlFor="player-name">{t("home.nameLabel")}</label>
        <input
          id="player-name"
          type="text"
          placeholder={t("home.namePlaceholder")}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>{t("home.newGame.title")}</h3>
        <p className="card-text">{t("home.newGame.text")}</p>
        <button onClick={() => onCreateGame(name)} disabled={busy}>
          {t("home.newGame.button")}
        </button>
      </div>

      <div className="card">
        <h3>{t("home.join.title")}</h3>
        <label htmlFor="game-code">{t("home.join.codeLabel")}</label>
        <input
          id="game-code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t("home.join.codePlaceholder")}
          value={code}
          maxLength={6}
          style={{ textAlign: "center", letterSpacing: 4, fontFamily: "monospace" }}
          onChange={(e) => setCode(normalizeCodeInput(e.target.value))}
        />

        <div className="form-row">
          <span className="form-row-label">{t("home.join.playAs")}</span>
          <label className="role-toggle" title={t("home.join.roleTitle")}>
            <input
              type="checkbox"
              checked={wantsX}
              onChange={(e) => setWantsX(e.target.checked)}
              aria-label={t("home.join.playAsXLabel")}
            />
            <span className="role-label">{wantsX ? t("common.roleX") : t("common.roleDetective")}</span>
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
          {busy ? t("home.join.checking") : t("home.join.button")}
        </button>

        {initialCode && (
          <p className="card-text">
            <Trans
              i18nKey="home.join.invite"
              values={{ code: initialCode }}
              components={{ 1: <strong /> }}
            />
          </p>
        )}
      </div>

      <p className="privacy-note">{t("home.privacyNote")}</p>

      <footer className="legal-links">
        <a href="/impressum">{t("menu.imprint")}</a>
        <span aria-hidden="true">·</span>
        <a href="/datenschutz">{t("menu.privacy")}</a>
      </footer>
      <a className="app-version" href="/changelog">
        {t("home.version", { version: __APP_VERSION__ })}
      </a>
    </div>
  );
}
