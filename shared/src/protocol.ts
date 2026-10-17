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
    }
  | { t: "configure"; ruleset: Ruleset }
  | { t: "setRole"; playerId: string; wantsX: boolean }
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
  isLive: boolean; // true = LIVE_SHARE (X außerhalb des Gebiets)
}

export type ServerMessage =
  | { t: "joined"; playerId: string; phase: Phase; players: PlayerInfo[]; ruleset: Ruleset; youAreHost: boolean }
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
  | { t: "reveal"; reveal: RevealEvent }
  | { t: "yourPositionIsShared"; shared: boolean }
  | { t: "end"; winner: "X" | "DETECTIVES"; reason: string; players: PlayerInfo[] }
  | { t: "error"; message: string; code?: string }
  | { t: "pong" };
