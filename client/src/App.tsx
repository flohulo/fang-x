import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChangelogScreen } from "./changelog";
import { LegalScreen } from "./legal";
import { parseInviteCode } from "./lib/invite";
import { clearSession, loadSession, saveSession } from "./lib/session";
import { useGame } from "./lib/useGame";
import { GameScreen } from "./screens/GameScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";

type Screen = "home" | "lobby" | "game";

type LegalPage = "impressum" | "datenschutz" | null;

function readLegalPage(): LegalPage {
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/impressum") return "impressum";
  if (path === "/datenschutz") return "datenschutz";
  return null;
}

function isChangelogPage(): boolean {
  return window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/changelog";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const legalPage = useMemo(readLegalPage, []);
  const changelogPage = useMemo(isChangelogPage, []);
  const resumedRef = useRef(false);

  const game = useGame();

  // Einladungslink: /?code=ABC234
  const initialCode = useMemo(() => parseInviteCode(window.location.search), []);

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
    if (resumedRef.current) return;
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
  }, []);

  if (legalPage) {
    return <LegalScreen page={legalPage} />;
  }

  if (changelogPage) {
    return <ChangelogScreen />;
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
        serverError={game.error}
        yourPositionIsShared={game.yourPositionIsShared}
        gameResult={game.gameResult}
        onPosition={game.sendPosition}
        onSetObjective={game.setObjectiveTarget}
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
      {content}
    </>
  );
}
