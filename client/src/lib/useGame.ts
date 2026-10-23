import type {
  ChatMessage,
  ClientMessage,
  LatLng,
  ObjectiveState,
  Ruleset,
  ServerMessage,
} from "@fang-x/shared";
import { useEffect, useRef, useState } from "react";
import { clearPlayerId, loadPlayerId, savePlayerId } from "./session";

interface Session {
  code: string;
  name: string;
  wantsX: boolean;
}

/** Reconnect-Versuche mit wachsendem Abstand, aber gedeckelt. */
const MAX_RECONNECT_DELAY_MS = 10_000;
/** Fehler, bei denen ein erneuter Versuch sinnlos ist. */
const FATAL_CODES = new Set(["ROOM_FULL", "NO_GAME"]);

export function useGame() {
  const [phase, setPhase] = useState<string>("LOBBY");
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [playAreaCenter, setPlayAreaCenter] = useState<LatLng | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [youAreHost, setYouAreHost] = useState(false);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [transitStops, setTransitStops] = useState({ bus: 0, train: 0 });
  const [revealTimer, setRevealTimer] = useState<{
    nextRevealAt: number | null;
    intervalStartedAt: number;
    indeterminate: boolean;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [transitNotice, setTransitNotice] = useState<{
    mode: "bus" | "train";
    count: number;
    bus: number;
    train: number;
    at: number;
  } | null>(null);
  const [catchPending, setCatchPending] = useState(false);
  const [reveals, setReveals] = useState<any[]>([]);
  const [lastReveal, setLastReveal] = useState<any>(null);
  const [lastPositionShared, setLastPositionShared] = useState<{
    at: number;
    index: number;
    live: boolean;
  } | null>(null);
  const [objective, setObjective] = useState<ObjectiveState | null>(null);
  const [yourPositionIsShared, setYourPositionIsShared] = useState(false);
  const [gameResult, setGameResult] = useState<{
    winner: string;
    reason: string;
    surrender?: { playerId: string; name: string; pos: LatLng | null; at: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const intentionalRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const connectRef = useRef<(session: Session) => void>(() => {});

  const send = (msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const scheduleReconnect = () => {
    if (intentionalRef.current) return;
    const session = sessionRef.current;
    if (!session || retryTimerRef.current !== null) return;

    attemptRef.current += 1;
    setReconnecting(true);
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, 800 * 2 ** Math.min(attemptRef.current - 1, 4));
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      if (intentionalRef.current) return;
      connectRef.current(session);
    }, delay);
  };

  const connect = (session: Session) => {
    clearRetryTimer();

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/room/${session.code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setConnected(true);
      setReconnecting(false);
      setError(null);
      ws.send(
        JSON.stringify({
          t: "join",
          code: session.code,
          name: session.name,
          wantsX: session.wantsX,
          // Aus einer früheren Verbindung: übernimmt den alten Platz im Raum.
          playerId: loadPlayerId(session.code) ?? undefined,
        } as ClientMessage),
      );
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.t) {
        case "joined":
          setMyId(msg.playerId);
          savePlayerId(session.code, msg.playerId);
          setPhase(msg.phase);
          setPlayers(msg.players);
          setRuleset(msg.ruleset);
          setTransitStops(msg.transitStops);
          setRevealTimer(null);
          setChatMessages(msg.chat ?? []);
          setCatchPending(msg.catchPending);
          setYouAreHost(msg.youAreHost);
          setReconnecting(false);
          break;
        case "players":
          setPlayers((current) =>
            msg.players.map((player) => ({
              ...player,
              position: current.find((existing) => existing.id === player.id)?.position ?? null,
            })),
          );
          break;
        case "phase":
          setPhase(msg.phase);
          // Server-Zeit auf lokale Uhr umrechnen, damit der Countdown auch bei abweichender Geräteuhr stimmt.
          setPhaseEndsAt(
            msg.phaseEndsAt === null ? null : msg.phaseEndsAt - msg.serverTime + Date.now(),
          );
          setPlayAreaCenter(msg.playAreaCenter);
          if (msg.phase !== "RUNNING") setRevealTimer(null);
          if (msg.phase === "LOBBY") {
            setReveals([]);
            setLastReveal(null);
            setLastPositionShared(null);
            setGameResult(null);
            setYourPositionIsShared(false);
            setObjective(null);
            setTransitStops({ bus: 0, train: 0 });
            setTransitNotice(null);
            setChatMessages([]);
            setCatchPending(false);
          } else if (msg.reveals && msg.reveals.length > 0) {
            // Nach Reload/Reconnect: bereits erfolgte Sichtungen nachziehen.
            setReveals(msg.reveals);
            setLastReveal(msg.reveals[msg.reveals.length - 1]);
          }
          break;
        case "config":
          setRuleset(msg.ruleset);
          break;
        case "transitStops":
          setTransitStops({ bus: msg.bus, train: msg.train });
          break;
        case "revealTimer": {
          const receivedAt = Date.now();
          const toLocal = (at: number) => at - msg.serverTime + receivedAt;
          setRevealTimer({
            nextRevealAt: msg.nextRevealAt === null ? null : toLocal(msg.nextRevealAt),
            intervalStartedAt: toLocal(msg.intervalStartedAt),
            indeterminate: msg.indeterminate,
          });
          break;
        }
        case "chat":
          setChatMessages((current) => [...current, msg.message].slice(-100));
          break;
        case "transitNotice":
          setTransitNotice({
            mode: msg.mode,
            count: msg.count,
            bus: msg.bus,
            train: msg.train,
            at: msg.at,
          });
          break;
        case "catchPending":
          setCatchPending(msg.pending);
          break;
        case "playerPosition":
          setPlayers((current) =>
            current.map((player) =>
              player.id === msg.playerId ? { ...player, position: msg.pos } : player,
            ),
          );
          break;
        case "reveal":
          setLastReveal(msg.reveal);
          setReveals((prev) => [...prev, msg.reveal]);
          break;
        case "positionShared":
          setLastPositionShared({ at: msg.at, index: msg.index, live: msg.live });
          break;
        case "objective":
          setObjective(msg.objective);
          break;
        case "yourPositionIsShared":
          setYourPositionIsShared(msg.shared);
          break;
        case "end":
          setGameResult({ winner: msg.winner, reason: msg.reason, surrender: msg.surrender });
          setPlayers(msg.players);
          setRevealTimer(null);
          setChatMessages([]);
          setPhase("ENDED");
          break;
        case "error":
          setError(msg.message);
          if (msg.code && FATAL_CODES.has(msg.code)) {
            intentionalRef.current = true;
            clearRetryTimer();
            setReconnecting(false);
            clearPlayerId(session.code);
            ws.close();
          }
          break;
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setConnected(false);
      if (intentionalRef.current) return;
      // Ungeplant getrennt — Platz bleibt serverseitig frei, wir versuchen es erneut.
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose übernimmt den eigentlichen Reconnect.
      setConnected(false);
    };
  };

  connectRef.current = connect;

  const join = (code: string, name: string, wantsX: boolean) => {
    intentionalRef.current = false;
    attemptRef.current = 0;
    setObjective(null);
    setLastPositionShared(null);
    setTransitStops({ bus: 0, train: 0 });
    setTransitNotice(null);
    setRevealTimer(null);
    setChatMessages([]);
    setCatchPending(false);
    sessionRef.current = { code, name, wantsX };
    wsRef.current?.close();
    connect({ code, name, wantsX });
  };

  const configure = (newRuleset: Ruleset) => {
    send({ t: "configure", ruleset: newRuleset });
  };

  const setRole = (playerId: string, wantsX: boolean) => {
    send({ t: "setRole", playerId, wantsX });
  };

  const start = () => {
    send({ t: "start" });
  };

  const setObjectiveTarget = (target: LatLng) => {
    setError(null);
    send({ t: "setObjective", target });
  };

  const useTransitStop = (mode: "bus" | "train", count: number) => {
    send({ t: "useTransitStop", mode, count });
  };

  const sendChat = (text: string) => {
    send({ t: "chat", text });
  };

  const reportCatch = () => {
    send({ t: "reportCatch" });
  };

  const resolveCatch = (caught: boolean) => {
    send({ t: "resolveCatch", caught });
  };

  const surrender = () => {
    send({ t: "surrender" });
  };

  const sendPosition = (pos: LatLng) => {
    send({ t: "position", pos });
  };

  const leave = () => {
    intentionalRef.current = true;
    clearRetryTimer();
    const code = sessionRef.current?.code;
    send({ t: "leave" });
    wsRef.current?.close();
    wsRef.current = null;
    sessionRef.current = null;
    if (code) clearPlayerId(code);
    setMyId(null);
    setConnected(false);
    setReconnecting(false);
    setObjective(null);
    setRevealTimer(null);
    setChatMessages([]);
  };

  // Beim Verlassen der Seite sauber abschalten, ohne Reconnect zu starten.
  useEffect(() => {
    return () => {
      intentionalRef.current = true;
      clearRetryTimer();
      wsRef.current?.close();
    };
  }, []);

  return {
    phase,
    phaseEndsAt,
    playAreaCenter,
    players,
    myId,
    youAreHost,
    ruleset,
    transitStops,
    transitNotice,
    revealTimer,
    chatMessages,
    catchPending,
    reveals,
    lastReveal,
    lastPositionShared,
    objective,
    yourPositionIsShared,
    gameResult,
    error,
    connected,
    reconnecting,
    join,
    configure,
    setRole,
    start,
    setObjectiveTarget,
    useTransitStop,
    sendChat,
    reportCatch,
    resolveCatch,
    surrender,
    sendPosition,
    leave,
    clearError: () => setError(null),
  };
}
