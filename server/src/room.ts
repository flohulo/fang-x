// GameRoom — die Spiel-Engine als Cloudflare Durable Object.
// Ein Objekt pro Spielraum (identifiziert über den 6-buchstabigen Code).
//
// Verantwortlich für:
// - Spieler-Beitritt, Rollenvergabe (X / Detektiv / Host), Reconnect
// - Phasen-Maschine: LOBBY → COUNTDOWN → HEADSTART → RUNNING → ENDED
// - periodische Standort-Updates von X (Reveal) an die Detektive
// - LIVE_SHARE: X verlässt das Gebiet → Live-Standort wird permanent geteilt
// - serverseitige Fang-Erkennung (autoritativ, manipulationsicher)
//
// Robustheit: Phasen, Regeln, Spieler und Zeitpunkte liegen in `state.storage`,
// alle zeitgesteuerten Schritte laufen über Durable-Object-Alarms. Ein Neustart
// oder eine Eviction der Instanz beendet das Spiel damit nicht mehr.
// Standortverläufe werden bewusst NICHT gespeichert. Der einmalige Spielmittelpunkt
// wird für die laufende Runde persistiert und bei Spielende aus dem Zustand gelöscht.

import {
  type ChatMessage,
  type ClientMessage,
  DEFAULT_RULESET,
  distanceMeters,
  jitterPoint,
  type LatLng,
  mergeRuleset,
  type ObjectiveState,
  type PlayerInfo,
  type RevealEvent,
  type Role,
  type Ruleset,
  type ServerMessage,
} from "@fang-x/shared";

const PLAYER_COLORS = [
  "#2ecc71", // grün
  "#3498db", // blau
  "#e67e22", // orange
  "#9b59b6", // lila
  "#e74c3c", // rot
  "#1abc9c", // türkis
  "#f1c40f", // gelb
  "#e84393", // pink
];

/** Obergrenze pro Raum — schützt vor Missbrauch über geteilte Codes. */
const MAX_PLAYERS = 24;

/** Wie lange eine getrennte Verbindung den Platz freihält. */
const GRACE_LOBBY_MS = 30_000;
const GRACE_COUNTDOWN_MS = 90_000;
const GRACE_RUNNING_X_MS = 120_000;
const GRACE_RUNNING_DETECTIVE_MS = 300_000;
const GRACE_ENDED_MS = 30 * 60_000;

/** Leere Räume und beendete Spiele werden irgendwann vergessen. */
const EMPTY_LOBBY_TTL_MS = 6 * 60 * 60_000;
const ENDED_TTL_MS = 30 * 60_000;
const OBJECTIVE_RADIUS_METERS = 50;
const OBJECTIVE_MIN_DISTANCE_METERS = 100;
const OBJECTIVE_REVEAL_DELAY_MS = 2 * 60_000;

/** Chat: nur die letzten Nachrichten der laufenden Runde, nie persistiert. */
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_TEXT_LENGTH = 300;

const STATE_KEY = "room";

interface Player {
  id: string;
  name: string;
  role: Role;
  /** true für den Spieler, der den Raum erstellt hat (Rechte: configure/start) */
  isHost: boolean;
  wantsX: boolean;
  color: string;
  ws: WebSocket | null;
  connected: boolean;
  disconnectedAt: number | null;
  position: LatLng | null;
  lastPositionAt: number;
}

type Phase = "LOBBY" | "COUNTDOWN" | "HEADSTART" | "RUNNING" | "ENDED";

// Gespeicherter Zustand ohne Standortverläufe; playAreaCenter ist der einmalige Startpunkt.
interface RoomSnapshot {
  version: 1;
  created: boolean;
  phase: Phase;
  players: Array<{
    id: string;
    name: string;
    role: Role;
    isHost: boolean;
    wantsX: boolean;
    color: string;
  }>;
  ruleset: Ruleset;
  phaseEndsAt: number | null;
  gameStartedAt: number | null;
  nextRevealAt: number | null;
  lastRevealIndex: number;
  lastRevealAt: number;
  playAreaCenter: LatLng | null;
  xCurrentlyOutOfBounds: boolean;
  objective: ObjectiveState | null;
  winner: "X" | "DETECTIVES" | null;
  endReason: string | null;
  transitStops?: { bus: number; train: number };
  catchPending?: boolean;
  nextPlayerId: number;
  updatedAt: number;
}

export class GameRoom {
  private state: DurableObjectState;
  private players = new Map<string, Player>();
  private ruleset: Ruleset = DEFAULT_RULESET;
  private phase: Phase = "LOBBY";
  private phaseEndsAt: number | null = null;
  private gameStartedAt: number | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastRevealIndex = 0;
  private lastRevealAt = 0;
  private nextRevealAt: number | null = null;
  /** Verlauf der Reveals (nur im Speicher, nicht persistiert) */
  private xPositions: Array<{ pos: LatLng; at: number; radius: number }> = [];
  private xCurrentlyOutOfBounds = false;
  private objective: ObjectiveState | null = null;
  /** Einmalig festgelegter Mittelpunkt des Spielgebiets (Startposition von X) */
  private playAreaCenter: LatLng | null = null;
  private winner: "X" | "DETECTIVES" | null = null;
  private endReason: string | null = null;
  private transitStops = { bus: 0, train: 0 };
  private chatMessages: ChatMessage[] = [];
  private nextChatMessageId = 1;
  private catchPending = false;
  private nextPlayerId = 1;
  /** Wurde dieser Raum über das Matchmaking angelegt? */
  private created = false;
  private lastActiveAt = Date.now();

  constructor(state: DurableObjectState) {
    this.state = state;
    // Vor dem ersten Request laden, damit kein halber Zustand bedient wird.
    this.state.blockConcurrencyWhile(async () => {
      await this.load();
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Interne Prüfung, ob dieser Code schon vergeben ist.
    // Ein reservierter Code gilt auch ohne Spieler als vergeben, damit ein
    // Tippfehler beim Beitreten keinen neuen Raum anlegt.
    if (url.pathname === "/exists") {
      return Response.json({ exists: this.created || this.players.size > 0 });
    }

    // Code reservieren (Matchmaking ruft das nach erfolgreicher Prüfung auf)
    if (url.pathname === "/create") {
      this.created = true;
      this.lastActiveAt = Date.now();
      this.persist();
      return Response.json({ ok: true });
    }

    // WebSocket-Upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      await this.handleSession(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Nicht gefunden", { status: 404 });
  }

  // --- Persistenz ---------------------------------------------------------

  private snapshot(): RoomSnapshot {
    return {
      version: 1,
      created: this.created,
      phase: this.phase,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isHost: p.isHost,
        wantsX: p.wantsX,
        color: p.color,
      })),
      ruleset: this.ruleset,
      phaseEndsAt: this.phaseEndsAt,
      gameStartedAt: this.gameStartedAt,
      nextRevealAt: this.nextRevealAt,
      lastRevealIndex: this.lastRevealIndex,
      lastRevealAt: this.lastRevealAt,
      playAreaCenter: this.playAreaCenter,
      xCurrentlyOutOfBounds: this.xCurrentlyOutOfBounds,
      objective: this.objective
        ? {
            ...this.objective,
            status: this.objective.status === "ACTIVE" ? "PENDING" : this.objective.status,
            target: null,
          }
        : null,
      winner: this.winner,
      endReason: this.endReason,
      transitStops: this.transitStops,
      catchPending: this.catchPending,
      nextPlayerId: this.nextPlayerId,
      updatedAt: Date.now(),
    };
  }

  /** Zustand sichern — bewusst ohne await, damit Spiellogik nicht blockiert. */
  private persist() {
    try {
      void this.state.storage.put(STATE_KEY, this.snapshot()).catch(() => {
        // Speicherfehler dürfen das laufende Spiel nicht abbrechen.
      });
    } catch {
      // Ignorieren (z. B. wenn Storage während des Abbaus nicht verfügbar ist)
    }
  }

  private async load() {
    let snap: RoomSnapshot | null = null;
    try {
      snap = (await this.state.storage.get<RoomSnapshot>(STATE_KEY)) ?? null;
    } catch {
      snap = null;
    }
    if (!snap || snap.version !== 1) {
      this.scheduleAlarm();
      return;
    }

    this.created = snap.created;
    this.phase = snap.phase;
    this.ruleset = mergeRuleset(snap.ruleset);
    this.phaseEndsAt = snap.phaseEndsAt;
    this.gameStartedAt = snap.gameStartedAt;
    this.nextRevealAt = snap.nextRevealAt;
    this.lastRevealIndex = snap.lastRevealIndex;
    this.lastRevealAt = snap.lastRevealAt;
    this.playAreaCenter = snap.playAreaCenter;
    this.xCurrentlyOutOfBounds = snap.xCurrentlyOutOfBounds;
    this.objective = snap.objective ?? null;
    this.winner = snap.winner;
    this.endReason = snap.endReason;
    this.transitStops = snap.transitStops ?? { bus: 0, train: 0 };
    this.catchPending = snap.catchPending ?? false;
    this.nextPlayerId = Math.max(1, snap.nextPlayerId);
    this.lastActiveAt = snap.updatedAt;

    const now = Date.now();
    for (const p of snap.players) {
      this.players.set(p.id, {
        ...p,
        ws: null,
        connected: false,
        // Nach einem Neustart beginnt die Reconnect-Frist neu.
        disconnectedAt: now,
        position: null,
        lastPositionAt: 0,
      });
    }

    // Verpasste Übergänge nachholen und Timer neu aufziehen.
    this.advanceIfDue();
    if (this.phase === "RUNNING") this.ensureTick();
    this.scheduleAlarm();
  }

  // --- Zeitsteuerung ------------------------------------------------------

  private scheduleAlarm() {
    const now = Date.now();
    let next: number | null = null;
    const consider = (t: number | null | undefined) => {
      if (!t) return;
      // Bereits fällige Termine nicht überspringen, sonst bliebe der Raum nach
      // einem Neustart in einer Phase hängen: in Kürze erneut wecken.
      const at = Math.max(t, now + 200);
      if (next === null || at < next) next = at;
    };

    if (this.phase === "COUNTDOWN" || this.phase === "HEADSTART") {
      consider(this.phaseEndsAt);
    }
    if (this.phase === "RUNNING") {
      consider(this.phaseEndsAt);
      consider(this.nextRevealAt);
    }

    for (const p of this.players.values()) {
      if (!p.connected && p.disconnectedAt !== null) {
        consider(p.disconnectedAt + this.graceFor(p));
      }
    }

    // Nichts geplant? Dann wenigstens irgendwann aufräumen — aber nur, wenn es
    // überhaupt etwas zu vergessen gibt (sonst würde der Alarm endlos laufen).
    if (next === null && this.players.size === 0 && this.created) {
      const ttl = this.phase === "ENDED" ? ENDED_TTL_MS : EMPTY_LOBBY_TTL_MS;
      next = Math.max(now + 1000, (this.lastActiveAt || now) + ttl);
    }

    if (next === null) {
      void this.state.storage.deleteAlarm().catch(() => {});
    } else {
      void this.state.storage.setAlarm(next).catch(() => {});
    }
  }

  async alarm() {
    this.advanceIfDue();
    this.pruneDisconnected();
    this.expireIfIdle();
    this.scheduleAlarm();
  }

  /** Phasenwechsel und Reveals nachholen, wenn ihr Zeitpunkt erreicht ist. */
  private advanceIfDue() {
    // Nach einer Downtime können mehrere Übergänge gleichzeitig fällig sein.
    for (let i = 0; i < 4; i++) {
      if (!this.advanceOnce()) break;
    }
  }

  private advanceOnce(): boolean {
    const now = Date.now();

    if (this.phase === "COUNTDOWN" && this.phaseEndsAt !== null && now >= this.phaseEndsAt) {
      this.enterHeadstart();
      return true;
    }
    if (this.phase === "HEADSTART" && this.phaseEndsAt !== null && now >= this.phaseEndsAt) {
      this.enterRunning();
      return true;
    }
    if (this.phase === "RUNNING") {
      if (this.nextRevealAt !== null && now >= this.nextRevealAt) {
        this.performReveal();
        return true;
      }
      if (this.phaseEndsAt !== null && now >= this.phaseEndsAt) {
        this.endGame("X", "Die Spieldauer ist abgelaufen.");
        return true;
      }
    }
    return false;
  }

  private graceFor(p: Player): number {
    switch (this.phase) {
      case "LOBBY":
        return GRACE_LOBBY_MS;
      case "COUNTDOWN":
      case "HEADSTART":
        return GRACE_COUNTDOWN_MS;
      case "RUNNING":
        return p.role === "X" ? GRACE_RUNNING_X_MS : GRACE_RUNNING_DETECTIVE_MS;
      case "ENDED":
      default:
        return GRACE_ENDED_MS;
    }
  }

  /** Getrennte Spieler nach Ablauf der Frist entfernen. */
  private pruneDisconnected() {
    const now = Date.now();
    let changed = false;
    for (const p of [...this.players.values()]) {
      if (p.connected || p.disconnectedAt === null) continue;
      if (now - p.disconnectedAt >= this.graceFor(p)) {
        this.removePlayer(p.id, "timeout");
        changed = true;
      }
    }
    if (changed) this.broadcastPlayers();
  }

  /** Alte, leere Räume vergessen. */
  private expireIfIdle() {
    const now = Date.now();
    const ttl = this.phase === "ENDED" ? ENDED_TTL_MS : EMPTY_LOBBY_TTL_MS;
    if (this.players.size > 0 || now - this.lastActiveAt < ttl) return;

    this.created = false;
    this.phase = "LOBBY";
    this.ruleset = DEFAULT_RULESET;
    this.playAreaCenter = null;
    this.objective = null;
    this.winner = null;
    this.endReason = null;
    this.xPositions.length = 0;
    this.chatMessages.length = 0;
    void this.state.storage.deleteAll().catch(() => {});
  }

  // --- Sitzungen ----------------------------------------------------------

  private async handleSession(ws: WebSocket) {
    ws.accept();

    const sessionPlayerId = `p${this.nextPlayerId++}`;
    let player: Player | null = null;
    let closed = false;

    ws.addEventListener("message", (event) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        this.sendTo(ws, { t: "error", message: "Ungültiges JSON" });
        return;
      }

      switch (msg.t) {
        case "join": {
          if (player) {
            // Zweiter Join auf derselben Verbindung — ignorieren.
            return;
          }

          // Nur Räume, die über das Matchmaking entstanden sind, nehmen Spieler
          // auf. Sonst würde jeder Tippfehler still einen neuen Raum anlegen.
          if (!this.created) {
            this.sendTo(ws, {
              t: "error",
              message: "Dieses Spiel gibt es nicht (mehr).",
              code: "NO_GAME",
            });
            closed = true;
            try {
              ws.close(4004, "Kein Spiel");
            } catch {
              // Ignorieren
            }
            return;
          }

          // Reconnect: bekannte Spieler-ID übernimmt den alten Platz.
          const known = msg.playerId ? this.players.get(msg.playerId) : undefined;
          if (known) {
            if (known.ws && known.ws !== ws) {
              try {
                known.ws.close(4001, "An anderer Stelle weiterverbunden");
              } catch {
                // Alte Verbindung war schon tot.
              }
            }
            known.ws = ws;
            known.connected = true;
            known.disconnectedAt = null;
            player = known;
          } else {
            // Ein beendetes Spiel ohne Anwesende beginnt von vorn.
            if (this.phase === "ENDED" && this.connectedCount() === 0) {
              this.players.clear();
              this.resetToLobby();
            }
            if (this.players.size >= MAX_PLAYERS) {
              this.sendTo(ws, {
                t: "error",
                message: `Dieser Raum ist voll (max. ${MAX_PLAYERS} Spieler).`,
                code: "ROOM_FULL",
              });
              closed = true;
              try {
                ws.close(4004, "Raum voll");
              } catch {
                // Ignorieren
              }
              return;
            }
            player = this.addPlayer(sessionPlayerId, msg.name, msg.wantsX, ws);
          }

          this.lastActiveAt = Date.now();
          this.sendTo(ws, {
            t: "joined",
            playerId: player.id,
            phase: this.phase,
            players: this.getPlayerInfos(),
            ruleset: this.ruleset,
            transitStops: this.transitStops,
            chat: this.chatMessages,
            catchPending: this.catchPending,
            youAreHost: player.isHost,
          });
          // Phase/Zeit/Reveals nachliefern — nach einem Reload fehlt dem
          // Client sonst der komplette Spielzustand.
          this.sendTo(ws, this.phaseMessage());
          this.sendTo(ws, this.revealTimerMessage());
          this.sendObjective(player);
          if (this.ruleset.movement.detectivesShareLiveLocation && this.phase === "RUNNING") {
            for (const other of this.players.values()) {
              if (other.role === "DETECTIVE" && other.position) {
                this.sendTo(ws, {
                  t: "playerPosition",
                  playerId: other.id,
                  pos: other.position,
                });
              }
            }
          }
          this.broadcastPlayers();
          // Beendetes Spiel? Ergebnis direkt nachliefern, damit ein Reload im
          // Endzustand nicht die Karte statt des Ergebnisses zeigt.
          if (this.phase === "ENDED" && this.winner && this.endReason) {
            this.sendTo(ws, {
              t: "end",
              winner: this.winner,
              reason: this.endReason,
              players: this.getPlayerInfos(),
            });
          }
          this.persist();
          this.scheduleAlarm();
          break;
        }
        case "configure": {
          if (!player || !player.isHost) {
            this.sendTo(ws, { t: "error", message: "Nur der Host kann konfigurieren." });
            return;
          }
          if (this.phase !== "LOBBY") {
            this.sendTo(ws, { t: "error", message: "Konfiguration nur in der Lobby." });
            return;
          }
          this.ruleset = mergeRuleset(msg.ruleset);
          if (
            this.ruleset.map.startLocation !== null &&
            !isValidPosition(this.ruleset.map.startLocation)
          ) {
            this.sendTo(ws, { t: "error", message: "Der Startpunkt ist ungültig." });
            return;
          }
          this.lastActiveAt = Date.now();
          this.broadcast({ t: "config", ruleset: this.ruleset });
          this.persist();
          break;
        }
        case "setRole": {
          if (!player || this.phase !== "LOBBY") return;
          // Spieler darf nur eigene Rolle ändern; Host darf alle umstellen
          const target = this.players.get(msg.playerId);
          if (!target) return;
          if (player.id !== msg.playerId && !player.isHost) return;
          target.wantsX = msg.wantsX;
          this.broadcastPlayers();
          this.persist();
          break;
        }
        case "setObjective": {
          this.setObjective(player, msg.target);
          break;
        }
        case "useTransitStop": {
          if (msg.mode === "bus" || msg.mode === "train") {
            this.useTransitStop(player, msg.mode, msg.count);
          }
          break;
        }
        case "chat": {
          this.postChatMessage(player, msg.text);
          break;
        }
        case "reportCatch": {
          this.reportCatch(player);
          break;
        }
        case "resolveCatch": {
          if (typeof msg.caught === "boolean") {
            this.resolveCatch(player, msg.caught);
          }
          break;
        }
        case "start": {
          if (!player || !player.isHost) return;
          if (this.phase !== "LOBBY") return;
          if (![...this.players.values()].some((p) => p.wantsX)) {
            this.sendTo(ws, { t: "error", message: "Für den Start braucht es mindestens ein X." });
            return;
          }
          this.startGame();
          break;
        }
        case "position": {
          if (!player) return;
          // Standorte nur im laufenden Spiel annehmen (Datenminimierung!)
          if (this.phase !== "HEADSTART" && this.phase !== "RUNNING") return;
          if (
            this.phase === "HEADSTART" &&
            this.ruleset.game.detectivesWaitDuringHeadStart &&
            player.role !== "X"
          ) {
            return;
          }
          if (!isValidPosition(msg.pos)) return;
          player.position = msg.pos;
          player.lastPositionAt = Date.now();
          this.lastActiveAt = player.lastPositionAt;
          // Spielgebiet einmalig auf die Startposition von X festlegen, damit der
          // Kreis nicht mit X mitwandert.
          if (player.role === "X" && !this.playAreaCenter) {
            this.playAreaCenter = msg.pos;
            this.broadcastPhase();
            this.persist();
          }
          if (player.role === "X") {
            this.checkXOutOfBounds(player);
            this.checkObjective(player);
          } else {
            if (this.ruleset.movement.detectivesShareLiveLocation && this.phase === "RUNNING") {
              this.broadcast({ t: "playerPosition", playerId: player.id, pos: msg.pos });
            }
            this.checkCatch();
          }
          break;
        }
        case "leave": {
          if (player) {
            this.removePlayer(player.id, "leave");
            player = null;
            this.persist();
            this.scheduleAlarm();
          }
          break;
        }
      }
    });

    ws.addEventListener("close", () => {
      if (closed) return;
      if (!player) return;
      this.markDisconnected(player);
      player = null;
    });
  }

  private addPlayer(id: string, name: string, wantsX: boolean, ws: WebSocket): Player {
    const usedColors = new Set([...this.players.values()].map((p) => p.color));
    const color =
      PLAYER_COLORS.find((c) => !usedColors.has(c)) ??
      PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];

    // Wer allein (bzw. als Einziger verbunden) ist, wird Host. So übernimmt
    // nach einem Verbindungsabbruch jemand anderes die Leitung.
    const isHost = this.connectedCount() === 0;
    const role: Role = isHost ? "HOST" : wantsX ? "X" : "DETECTIVE";

    const player: Player = {
      id,
      name: (name ?? "").trim().slice(0, 20) || "Spieler",
      role,
      isHost,
      wantsX,
      color,
      ws,
      connected: true,
      disconnectedAt: null,
      position: null,
      lastPositionAt: 0,
    };
    this.players.set(id, player);
    return player;
  }

  /** Verbindung weg — Platz bleibt für ein Reconnect frei. */
  private markDisconnected(p: Player) {
    p.ws = null;
    p.connected = false;
    p.disconnectedAt = Date.now();
    if (
      p.role === "DETECTIVE" &&
      p.position &&
      (this.ruleset.movement.detectivesShareLiveLocation ||
        (this.ruleset.game.detectivesWaitDuringHeadStart && this.phase === "HEADSTART"))
    ) {
      p.position = null;
      if (this.ruleset.movement.detectivesShareLiveLocation) {
        this.broadcast({ t: "playerPosition", playerId: p.id, pos: null });
      }
    }
    this.broadcastPlayers();
    this.persist();
    this.scheduleAlarm();
  }

  private removePlayer(id: string, reason: "leave" | "timeout") {
    const p = this.players.get(id);
    if (!p) return;

    if (reason === "leave") {
      this.players.delete(id);
      try {
        p.ws?.close();
      } catch {
        // Ignorieren
      }
    } else {
      this.players.delete(id);
    }

    // Neuen Host bestimmen, wenn der Host weg ist
    if (p.isHost && this.players.size > 0) {
      const next =
        [...this.players.values()].find((pl) => pl.connected) ?? [...this.players.values()][0];
      next.isHost = true;
      if (next.role === "HOST") next.role = next.wantsX ? "X" : "DETECTIVE";
    }

    // Läuft das Spiel noch und X ist endgültig weg? → Detektive gewinnen
    if ((this.phase === "RUNNING" || this.phase === "HEADSTART") && p.role === "X") {
      const anyXLeft = [...this.players.values()].some((pl) => pl.role === "X");
      if (!anyXLeft) {
        this.endGame("DETECTIVES", "X hat das Spiel verlassen.");
        return;
      }
    }

    if (this.players.size === 0) {
      this.resetToLobby();
      this.persist();
      this.scheduleAlarm();
      return;
    }

    this.broadcastPlayers();
    this.persist();
    this.scheduleAlarm();
  }

  private connectedCount(): number {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  private getPlayerInfos(): PlayerInfo[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      wantsX: p.wantsX,
      isHost: p.isHost,
      color: p.color,
      isReady: p.connected,
      connected: p.connected,
    }));
  }

  // --- Spielablauf --------------------------------------------------------

  private startGame() {
    // Endgültige Rollenvergabe: willst-du-X-Flag bestimmt X vs. Detektiv.
    // Die Host-Eigenschaft (isHost) bleibt erhalten, damit die Berechtigungen
    // (configure/start) nicht verloren gehen.
    for (const p of this.players.values()) {
      p.role = p.wantsX ? "X" : "DETECTIVE";
    }

    // Neues Spielgebiet: wird mit der ersten X-Position festgelegt.
    this.playAreaCenter = this.ruleset.map.startLocation;
    this.xCurrentlyOutOfBounds = false;
    this.objective = this.ruleset.objective.enabled
      ? { status: "PENDING", target: null, radiusMeters: OBJECTIVE_RADIUS_METERS }
      : null;
    this.winner = null;
    this.endReason = null;
    this.lastRevealIndex = 0;
    this.lastRevealAt = 0;
    this.nextRevealAt = null;
    this.xPositions.length = 0;
    this.transitStops = { bus: 0, train: 0 };
    this.catchPending = false;
    this.broadcast({ t: "transitStops", ...this.transitStops });
    this.broadcast({ t: "catchPending", pending: false });

    this.phase = "COUNTDOWN";
    this.phaseEndsAt = Date.now() + this.ruleset.game.countdownSeconds * 1000;
    this.lastActiveAt = Date.now();
    this.broadcastPhase();
    this.broadcastObjectiveToX();
    this.broadcastPlayers();
    this.persist();
    this.scheduleAlarm();
  }

  private enterHeadstart() {
    if (this.phase !== "COUNTDOWN") return;
    // Geplanter Beginn = Ende des Countdowns (auch wenn er nachgeholt wird).
    const startedAt = this.phaseEndsAt ?? Date.now();
    this.phase = "HEADSTART";
    this.phaseEndsAt = startedAt + this.ruleset.game.headStartMinutes * 60000;
    this.broadcastPhase();
    this.broadcastPlayers();
    this.persist();
    this.scheduleAlarm();
  }

  private enterRunning() {
    if (this.phase !== "HEADSTART" && this.phase !== "COUNTDOWN") return;
    // Geplanter Start = Ende des Vorsprungs. So stimmt die Restzeit auch dann,
    // wenn der Übergang nach einer Downtime nachgeholt wird.
    const startedAt = this.phaseEndsAt ?? Date.now();
    this.phase = "RUNNING";
    this.gameStartedAt = startedAt;
    const durationMs = this.ruleset.game.durationMinutes * 60000;
    this.phaseEndsAt = startedAt + durationMs;

    // Erster Reveal nach firstRevealAfterMinutes, dann im Intervall
    this.nextRevealAt = startedAt + this.ruleset.reveal.firstRevealAfterMinutes * 60000;

    this.broadcastPhase();
    this.broadcastRevealTimer();
    this.broadcastPlayers();
    this.ensureTick();
    this.persist();
    this.scheduleAlarm();
    if (this.ruleset.reveal.firstRevealAfterMinutes <= 0) {
      this.performReveal();
    }
  }

  private ensureTick() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  private computeNextRevealDelay(): number {
    const r = this.ruleset.reveal;
    const n = this.lastRevealIndex + 1;
    switch (r.schedule) {
      case "DECREASING": {
        const delay = Math.max(
          r.decreaseFloorMinutes,
          r.intervalMinutes - n * r.decreaseStepMinutes,
        );
        return delay * 60000;
      }
      case "RANDOM": {
        const min = r.randomMinMinutes;
        const max = r.randomMaxMinutes;
        return (min + Math.random() * (max - min)) * 60000;
      }
      case "FIXED":
      default:
        return r.intervalMinutes * 60000;
    }
  }

  private performReveal() {
    if (this.phase !== "RUNNING") return;

    const now = Date.now();
    const xPlayers = [...this.players.values()].filter((p) => p.role === "X" && p.position);
    if (xPlayers.length === 0) {
      const x = [...this.players.values()].find((p) => p.role === "X");
      if (x) {
        this.sendTo(x.ws, {
          t: "error",
          message: "Standort-Ping verschoben: X-GPS ist gerade nicht verfügbar.",
        });
      }
      this.nextRevealAt = now + 5_000;
      this.broadcastRevealTimer();
      this.persist();
      this.scheduleAlarm();
      return;
    }

    for (const x of xPlayers) {
      if (!x.position) continue;

      // Sichtradius ggf. über die Zeit verkleinern
      let radius = this.ruleset.reveal.revealRadiusMeters;
      if (this.ruleset.reveal.radiusShrinkEnabled) {
        const shrunk =
          this.ruleset.reveal.revealRadiusMeters -
          this.lastRevealIndex * this.ruleset.reveal.radiusShrinkStepMeters;
        radius = Math.max(this.ruleset.reveal.radiusFloorMeters, shrunk);
      }

      // Jitter: gemeldete Position versetzt, um Detektive zu täuschen
      const reportedPos =
        this.ruleset.reveal.jitterMeters > 0
          ? jitterPoint(x.position, this.ruleset.reveal.jitterMeters)
          : { ...x.position };

      this.lastRevealIndex++;
      this.lastRevealAt = now;
      this.xPositions.push({ pos: reportedPos, at: now, radius });
      if (this.xPositions.length > 50) this.xPositions.shift();

      const reveal: RevealEvent = {
        pos: reportedPos,
        radiusMeters: radius,
        at: now,
        index: this.lastRevealIndex,
        isLive: false,
      };

      this.broadcastToDetectives({ t: "reveal", reveal });
      if (!this.xCurrentlyOutOfBounds) {
        this.sendTo(x.ws, {
          t: "positionShared",
          at: now,
          index: this.lastRevealIndex,
          live: false,
        });
      }
    }

    this.nextRevealAt = now + this.computeNextRevealDelay();
    this.broadcastRevealTimer();
    this.persist();
    this.scheduleAlarm();
  }

  private checkXOutOfBounds(x: Player) {
    if (!x.position || !this.ruleset.map.outOfBoundsEnabled) return;
    if (this.phase !== "RUNNING") return;

    const center = this.getGameCenter();
    if (!center) return;
    const dist = distanceMeters(x.position, center);
    const outside = dist > this.ruleset.map.playAreaRadiusMeters;

    if (outside && !this.xCurrentlyOutOfBounds) {
      // Grenze verlassen → LIVE_SHARE aktivieren
      this.xCurrentlyOutOfBounds = true;
      this.sendTo(x.ws, { t: "yourPositionIsShared", shared: true });

      const liveReveal: RevealEvent = {
        pos: x.position,
        radiusMeters: 0,
        at: Date.now(),
        index: this.lastRevealIndex,
        isLive: true,
      };
      this.broadcast({ t: "reveal", reveal: liveReveal });
      this.sendTo(x.ws, {
        t: "positionShared",
        at: liveReveal.at,
        index: liveReveal.index,
        live: true,
      });
      this.persist();
    } else if (!outside && this.xCurrentlyOutOfBounds) {
      // Zurück im Gebiet → Live-Tracking stoppen
      this.xCurrentlyOutOfBounds = false;
      this.sendTo(x.ws, { t: "yourPositionIsShared", shared: false });
      this.persist();
    }
  }

  private setObjective(player: Player | null, target: LatLng) {
    if (!player || player.role !== "X") {
      if (player)
        this.sendTo(player.ws, { t: "error", message: "Nur X kann ein Missionsziel setzen." });
      return;
    }
    if (this.phase !== "RUNNING" || !this.ruleset.objective.enabled) {
      this.sendTo(player.ws, {
        t: "error",
        message: "Das Missionsziel ist gerade nicht verfügbar.",
      });
      return;
    }
    if (!this.objective || this.objective.status !== "PENDING") {
      this.sendTo(player.ws, { t: "error", message: "Das Missionsziel wurde bereits festgelegt." });
      return;
    }
    if (!isValidPosition(target) || !this.playAreaCenter) {
      this.sendTo(player.ws, { t: "error", message: "Ungültiger Zielpunkt." });
      return;
    }

    const now = Date.now();
    const positionFreshFor = this.ruleset.movement.minUpdateSeconds * 3 * 1000;
    if (!player.position || now - player.lastPositionAt > positionFreshFor) {
      this.sendTo(player.ws, { t: "error", message: "Dein Standort ist gerade nicht aktuell." });
      return;
    }

    const areaRadius = this.ruleset.map.playAreaRadiusMeters;
    if (distanceMeters(this.playAreaCenter, target) > areaRadius) {
      this.sendTo(player.ws, {
        t: "error",
        message: "Das Ziel muss innerhalb des Spielgebiets liegen.",
      });
      return;
    }
    const minimumDistance = Math.min(OBJECTIVE_MIN_DISTANCE_METERS, areaRadius * 0.25);
    if (distanceMeters(player.position, target) < minimumDistance) {
      this.sendTo(player.ws, {
        t: "error",
        message: `Das Ziel muss mindestens ${Math.round(minimumDistance)} m entfernt sein.`,
      });
      return;
    }

    this.objective = { ...this.objective, status: "ACTIVE", target: { ...target } };
    this.broadcastObjectiveToX();
    this.persist();
  }

  private checkObjective(x: Player) {
    const objective = this.objective;
    if (
      x.role !== "X" ||
      this.phase !== "RUNNING" ||
      !x.position ||
      !objective ||
      objective.status !== "ACTIVE" ||
      !objective.target
    ) {
      return;
    }

    if (distanceMeters(x.position, objective.target) > objective.radiusMeters) return;

    objective.status = "COMPLETED";
    const now = Date.now();
    this.nextRevealAt = Math.max(this.nextRevealAt ?? now, now) + OBJECTIVE_REVEAL_DELAY_MS;
    this.broadcastObjectiveToX(this.nextRevealAt);
    this.broadcastRevealTimer();
    this.persist();
    this.scheduleAlarm();
  }

  private checkCatch() {
    if (this.phase !== "RUNNING" || this.ruleset.catch.method !== "RADIUS") return;
    const catchRadius = this.ruleset.catch.radiusMeters;
    const xPlayers = [...this.players.values()].filter((p) => p.role === "X" && p.position);
    const detectives = [...this.players.values()].filter((p) => p.role !== "X" && p.position);

    for (const x of xPlayers) {
      if (!x.position) continue;
      const xPos = x.position;
      const catching = detectives.filter(
        (d) => d.position && distanceMeters(d.position, xPos) <= catchRadius,
      );

      const required = Math.max(1, this.ruleset.catch.teamCatchRequired);
      if (catching.length >= required) {
        this.endGame(
          "DETECTIVES",
          `X wurde nach ${this.ruleset.catch.confirmSeconds}s im Fangradius gestellt.`,
        );
        return;
      }
    }
  }

  private tick() {
    if (this.phase !== "RUNNING") return;
    const now = Date.now();

    // Laufzeit abgelaufen → X gewinnt (Alarm ist die Referenz, das hier ist Netz und Doppel)
    if (this.phaseEndsAt && now >= this.phaseEndsAt) {
      this.endGame("X", "Die Spieldauer ist abgelaufen.");
      return;
    }

    // LIVE_SHARE: kontinuierlich X-Position an alle senden, wenn außerhalb
    if (this.xCurrentlyOutOfBounds && this.ruleset.map.outOfBoundsPenalty === "LIVE_SHARE") {
      const x = [...this.players.values()].find((p) => p.role === "X" && p.position);
      if (x && x.position) {
        const liveReveal: RevealEvent = {
          pos: x.position,
          radiusMeters: 0,
          at: now,
          index: this.lastRevealIndex,
          isLive: true,
        };
        this.broadcast({ t: "reveal", reveal: liveReveal });
      }
    }

    // Stale-Positions-Aufräumen (Datenminimierung: alte Standorte verwerfen)
    const cutoff = this.ruleset.movement.minUpdateSeconds * 3 * 1000;
    for (const p of this.players.values()) {
      if (p.position && now - p.lastPositionAt > cutoff) {
        p.position = null;
        if (this.ruleset.movement.detectivesShareLiveLocation && p.role === "DETECTIVE") {
          this.broadcast({ t: "playerPosition", playerId: p.id, pos: null });
        }
      }
    }
  }

  private getGameCenter(): LatLng | null {
    // Zentrum = Standort von X beim Spielstart. Einmal festgelegt und dann fix,
    // damit das Spielgebiet nicht mit X mitwandert.
    return this.playAreaCenter;
  }

  private endGame(winner: "X" | "DETECTIVES", reason: string) {
    this.phase = "ENDED";
    this.objective = null;
    this.winner = winner;
    this.endReason = reason;
    this.catchPending = false;
    this.chatMessages.length = 0;
    this.phaseEndsAt = null;
    this.nextRevealAt = null;
    this.stopTick();

    // Rollen final enthüllen
    this.broadcast({
      t: "end",
      winner,
      reason,
      players: this.getPlayerInfos(),
    });
    this.playAreaCenter = null;
    this.ruleset = {
      ...this.ruleset,
      map: { ...this.ruleset.map, startLocation: null },
    };
    for (const player of this.players.values()) {
      player.position = null;
    }
    this.xPositions.length = 0;
    this.broadcastPhase();
    this.lastActiveAt = Date.now();
    this.persist();
    this.scheduleAlarm();
  }

  private useTransitStop(player: Player | null, mode: "bus" | "train", count = 1) {
    if (
      !player ||
      player.role !== "X" ||
      !this.ruleset.movement.xTransitBudget.enabled ||
      (this.phase !== "HEADSTART" && this.phase !== "RUNNING")
    ) {
      return;
    }

    const label = mode === "bus" ? "Bus" : "Zug";
    const limit =
      mode === "bus"
        ? this.ruleset.movement.xTransitBudget.busStops
        : this.ruleset.movement.xTransitBudget.trainStops;
    const remaining = limit - this.transitStops[mode];
    if (remaining <= 0) {
      this.sendTo(player.ws, {
        t: "error",
        message: `Das ÖV-Budget für ${label} ist aufgebraucht.`,
      });
      return;
    }

    const stations = Math.floor(count);
    if (!Number.isFinite(stations) || stations < 1) {
      this.sendTo(player.ws, {
        t: "error",
        message: "Bitte gib mindestens eine Haltestelle an.",
      });
      return;
    }
    if (stations > remaining) {
      this.sendTo(player.ws, {
        t: "error",
        message: `Für ${label} sind nur noch ${remaining} Haltestelle${remaining === 1 ? "" : "n"} übrig.`,
      });
      return;
    }

    this.transitStops[mode] += stations;
    this.broadcast({ t: "transitStops", ...this.transitStops });
    this.broadcastToDetectives({
      t: "transitNotice",
      mode,
      count: stations,
      bus: this.transitStops.bus,
      train: this.transitStops.train,
      at: Date.now(),
    });
    this.persist();
  }

  private postChatMessage(player: Player | null, text: unknown) {
    if (!player || this.phase === "LOBBY" || this.phase === "ENDED" || typeof text !== "string") {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    const message: ChatMessage = {
      id: this.nextChatMessageId++,
      playerId: player.id,
      name: player.name,
      color: player.color,
      text: trimmed.slice(0, MAX_CHAT_TEXT_LENGTH),
      at: Date.now(),
    };
    this.chatMessages.push(message);
    if (this.chatMessages.length > MAX_CHAT_MESSAGES) {
      this.chatMessages.splice(0, this.chatMessages.length - MAX_CHAT_MESSAGES);
    }
    this.broadcast({ t: "chat", message });
  }

  private reportCatch(player: Player | null) {
    if (
      !player ||
      player.role !== "DETECTIVE" ||
      this.phase !== "RUNNING" ||
      this.ruleset.catch.method !== "PHOTO_CONFIRMATION" ||
      this.catchPending
    ) {
      return;
    }
    this.catchPending = true;
    this.broadcast({ t: "catchPending", pending: true });
    this.persist();
  }

  private resolveCatch(player: Player | null, caught: boolean) {
    if (
      !player ||
      player.role !== "X" ||
      this.phase !== "RUNNING" ||
      this.ruleset.catch.method !== "PHOTO_CONFIRMATION" ||
      !this.catchPending
    ) {
      return;
    }
    if (caught) {
      this.endGame("DETECTIVES", "X hat den Fang mit Foto bestätigt.");
      return;
    }
    this.catchPending = false;
    this.broadcast({ t: "catchPending", pending: false });
    this.persist();
  }

  /** Zurück in die Lobby — z. B. wenn der Raum leer wird oder ein neues Spiel beginnt. */
  private resetToLobby() {
    this.phase = "LOBBY";
    this.phaseEndsAt = null;
    this.gameStartedAt = null;
    this.nextRevealAt = null;
    this.playAreaCenter = null;
    this.xCurrentlyOutOfBounds = false;
    this.objective = null;
    this.winner = null;
    this.endReason = null;
    this.ruleset = {
      ...this.ruleset,
      map: { ...this.ruleset.map, startLocation: null },
    };
    this.transitStops = { bus: 0, train: 0 };
    this.chatMessages.length = 0;
    this.catchPending = false;
    this.lastRevealIndex = 0;
    this.lastRevealAt = 0;
    this.xPositions.length = 0;
    this.stopTick();
  }

  private stopTick() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private phaseMessage(): ServerMessage {
    return {
      t: "phase",
      phase: this.phase,
      serverTime: Date.now(),
      phaseEndsAt: this.phaseEndsAt,
      playAreaCenter: this.getGameCenter(),
      // Wer gerade erst (wieder) dazukommt, soll den Verlauf sehen können.
      reveals: this.recentReveals(),
    };
  }

  /** Zeit bis zur nächsten Sichtung; bei RANDOM bleibt der genaue Zeitpunkt geheim. */
  private revealTimerMessage(): ServerMessage {
    const running = this.phase === "RUNNING";
    const indeterminate = running && this.ruleset.reveal.schedule === "RANDOM";
    return {
      t: "revealTimer",
      serverTime: Date.now(),
      nextRevealAt: running && !indeterminate ? this.nextRevealAt : null,
      intervalStartedAt: this.lastRevealAt || this.gameStartedAt || Date.now(),
      indeterminate,
    };
  }

  private broadcastRevealTimer() {
    this.broadcast(this.revealTimerMessage());
  }

  private recentReveals(): RevealEvent[] {
    if (this.ruleset.reveal.showTrail === "NONE") return [];
    const trail =
      this.ruleset.reveal.showTrail === "FULL" ? this.xPositions : this.xPositions.slice(-3);
    return trail.map((entry, i) => ({
      pos: entry.pos,
      radiusMeters: entry.radius,
      at: entry.at,
      index: this.lastRevealIndex - trail.length + i + 1,
      isLive: false,
    }));
  }

  private broadcastPhase() {
    this.broadcast(this.phaseMessage());
  }

  private broadcastPlayers() {
    this.broadcast({ t: "players", players: this.getPlayerInfos() });
  }

  private broadcastToDetectives(msg: ServerMessage) {
    for (const p of this.players.values()) {
      if (p.role !== "X") this.sendTo(p.ws, msg);
    }
  }

  private sendObjective(player: Player) {
    if (player.role === "X") {
      this.sendTo(player.ws, { t: "objective", objective: this.objective });
    }
  }

  private broadcastObjectiveToX(revealDelayedUntil?: number) {
    for (const player of this.players.values()) {
      if (player.role === "X") {
        this.sendTo(player.ws, {
          t: "objective",
          objective: this.objective,
          ...(revealDelayedUntil === undefined ? {} : { revealDelayedUntil }),
        });
      }
    }
  }

  private broadcast(msg: ServerMessage) {
    for (const p of this.players.values()) {
      this.sendTo(p.ws, msg);
    }
  }

  private sendTo(ws: WebSocket | null, msg: ServerMessage) {
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Verbindung tot — Ignore
    }
  }
}

/** Grobe Plausibilitätsprüfung, damit keine kaputten Koordinaten im Spiel landen. */
function isValidPosition(pos: LatLng | undefined | null): pos is LatLng {
  return (
    !!pos &&
    typeof pos.lat === "number" &&
    typeof pos.lng === "number" &&
    Number.isFinite(pos.lat) &&
    Number.isFinite(pos.lng) &&
    Math.abs(pos.lat) <= 90 &&
    Math.abs(pos.lng) <= 180
  );
}
