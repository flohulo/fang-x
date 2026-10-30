// WebSocket-Protokoll zwischen Client und Spiel-Server.
// JSON-Nachrichten mit "t"-Feld als Typ-Diskriminator.

import type { LatLng } from "./geo";
import type { Ruleset } from "./ruleset";

export type Phase = "LOBBY" | "COUNTDOWN" | "HEADSTART" | "RUNNING" | "ENDED";

export type Role = "X" | "DETECTIVE" | "HOST";

// --- Client → Server ---

export type ClientMessage =
  | {
      t: "join";
      code: string;
      name: string;
      wantsX: boolean;
      /** Aus einer früheren Sitzung — damit ein Reconnect den Platz übernimmt */
      playerId?: string;
      /** Geheimes Token zur playerId; ohne passendes Token gibt es einen neuen Platz. */
      token?: string;
    }
  | { t: "configure"; ruleset: Ruleset }
  | { t: "setRole"; playerId: string; wantsX: boolean }
  | { t: "setObjective"; target: LatLng }
  | {
      t: "useTransitStop";
      mode: "bus" | "train";
      /** Anzahl der gefahrenen Haltestellen; ältere Clients lassen das Feld weg (= 1). */
      count?: number;
    }
  | { t: "chat"; text: string }
  | { t: "reportCatch" }
  | { t: "resolveCatch"; caught: boolean }
  | { t: "surrender" }
  | { t: "start" }
  | { t: "position"; pos: LatLng }
  | { t: "leave" };

// --- Server → Client ---

export interface PlayerInfo {
  id: string;
  name: string;
  role: Role;
  /** Wurde der Spieler beim Beitritt als X markiert? (für die Lobby-Anzeige) */
  wantsX: boolean;
  /** true, wenn dieser Spieler den Raum erstellt hat und über Start/Konfiguration bestimmt */
  isHost: boolean;
  color: string;
  isReady: boolean;
  /** false, wenn die Verbindung gerade getrennt ist (Platz bleibt für Reconnect frei) */
  connected: boolean;
}

// Eine Sichtung von X (an Detektive gesendet)
export interface RevealEvent {
  pos: LatLng;
  radiusMeters: number;
  at: number; // server timestamp ms
  index: number;
  isLive: boolean; // true = LIVE_SHARE (X ausserhalb des Gebiets)
}

// Eine Chat-Nachricht im Spielraum. Wird nicht persistiert und nach Spielende verworfen.
export interface ChatMessage {
  id: number;
  playerId: string;
  name: string;
  color: string;
  text: string;
  at: number;
}

export interface ObjectiveState {
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  target: LatLng | null;
  radiusMeters: number;
}

export type ServerMessage =
  | {
      t: "joined";
      playerId: string;
      /** Geheimnis für den Reconnect — wird nur an diesen Spieler gesendet. */
      token: string;
      phase: Phase;
      players: PlayerInfo[];
      ruleset: Ruleset;
      transitStops: { bus: number; train: number };
      /** Bisherige Chat-Nachrichten der laufenden Runde (nach Spielende leer). */
      chat: ChatMessage[];
      catchPending: boolean;
      youAreHost: boolean;
    }
  | { t: "players"; players: PlayerInfo[] }
  | {
      t: "phase";
      phase: Phase;
      serverTime: number;
      phaseEndsAt: number | null;
      /** Mittelpunkt des Spielgebiets (Startposition von X), null solange unbekannt */
      playAreaCenter: LatLng | null;
      /** Bereits erfolgte Sichtungen — für den Wiedereinstieg nach Reload/Reconnect */
      reveals?: RevealEvent[];
    }
  | { t: "config"; ruleset: Ruleset }
  | {
      t: "revealTimer";
      serverTime: number;
      /** Nächste Sichtung; null bei Zufallsintervall oder ausserhalb der Laufzeit. */
      nextRevealAt: number | null;
      /** Beginn des aktuellen Intervalls (letzte Sichtung bzw. Laufzeitstart). */
      intervalStartedAt: number;
      /** true, wenn der Zeitpunkt bewusst verborgen bleibt (RANDOM). */
      indeterminate: boolean;
    }
  | { t: "transitStops"; bus: number; train: number }
  | { t: "chat"; message: ChatMessage }
  | {
      t: "transitNotice";
      mode: "bus" | "train";
      count: number;
      bus: number;
      train: number;
      at: number;
    }
  | { t: "catchPending"; pending: boolean }
  | { t: "playerPosition"; playerId: string; pos: LatLng | null }
  | { t: "reveal"; reveal: RevealEvent }
  | { t: "positionShared"; at: number; index: number; live: boolean }
  | {
      t: "objective";
      objective: ObjectiveState | null;
      revealDelayedUntil?: number;
    }
  | { t: "yourPositionIsShared"; shared: boolean }
  | {
      t: "end";
      winner: "X" | "DETECTIVES";
      reason: string;
      players: PlayerInfo[];
      /** X hat aufgegeben und den exakten Standort geteilt. */
      surrender?: {
        playerId: string;
        name: string;
        pos: LatLng | null;
        at: number;
      };
    }
  | { t: "error"; message: string; code?: string }
  | { t: "pong" };
