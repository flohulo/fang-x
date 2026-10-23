// Integrationstest: prüft den kompletten Spielablauf über WebSocket.
// Startet gegen den lokal laufenden wrangler dev Server (Port 8787).
//
// Ablauf:
// 1. Spiel erstellen → Code erhalten
// 2. Host beitritt
// 3. Detektiv beitritt
// 4. Konfiguration ändern
// 5. Spiel starten → Phase COUNTDOWN → HEADSTART → RUNNING
// 6. X positioniert sich
// 7. Detektiv positioniert sich weit entfernt
// 8. Reveal empfangen (X-Position)
// 9. Detektiv bewegt sich zu X → Fang
// 10. Spielende: Detektive gewinnen

import WebSocket from "ws";

const SERVER = "ws://localhost:8787";
const HTTP = "http://localhost:8787";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

async function createGame() {
  const res = await fetch(`${HTTP}/api/games`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { code } = await res.json();
  return code;
}

function connect(code) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${SERVER}/room/${code}`);
    const messages = [];
    const waiters = [];

    ws.on("open", () => resolve({ ws, messages, waiters, waitFor: ws.waitFor }));

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);
      // Alle Waiting-for-Resolver prüfen
      for (let i = waiters.length - 1; i >= 0; i--) {
        const { check, resolve: res, timer } = waiters[i];
        if (check(msg)) {
          clearTimeout(timer);
          waiters.splice(i, 1);
          res(msg);
        }
      }
    });

    ws.on("error", reject);

    // Helper: warte auf eine Nachricht, die dem Prädikat entspricht
    ws.waitFor = (check, timeout = 10000) =>
      new Promise((res, rej) => {
        // Zuerst bereits erhaltene Nachrichten prüfen
        for (const msg of messages) {
          if (check(msg)) return res(msg);
        }
        const timer = setTimeout(() => rej(new Error("Timeout waiting for message")), timeout);
        waiters.push({ check, resolve: res, timer });
      });
  });
}

async function run() {
  console.log("=== Integrationstest: Kompletter Spielablauf ===\n");

  // 1. Spiel erstellen
  const code = await createGame();
  assert(code && code.length === 6, `Spiel-Code erstellt: ${code}`);

  // 2. Host beitritt
  const host = await connect(code);
  host.ws.send(JSON.stringify({ t: "join", code, name: "Host", wantsX: false }));
  const hostJoined = await host.waitFor((m) => m.t === "joined");
  assert(hostJoined.youAreHost === true, "Host beigetreten und als Host markiert");
  assert(hostJoined.phase === "LOBBY", "Phase ist LOBBY");

  // 3. Detektiv beitritt
  const det = await connect(code);
  det.ws.send(JSON.stringify({ t: "join", code, name: "Detektiv", wantsX: false }));
  const detJoined = await det.waitFor((m) => m.t === "joined");
  assert(detJoined.youAreHost === false, "Detektiv beigetreten (nicht Host)");
  assert(detJoined.players.length === 2, "Zwei Spieler im Raum");

  // Host wird zu X
  host.ws.send(JSON.stringify({ t: "setRole", playerId: hostJoined.playerId, wantsX: true }));
  await host.waitFor(
    (m) => m.t === "players" && m.players.some((p) => p.id === hostJoined.playerId && p.wantsX),
  );
  const playersAfterRole = host.messages.findLast((m) => m.t === "players");
  assert(
    playersAfterRole?.players?.some((p) => p.id === hostJoined.playerId && p.wantsX),
    "Host-Rolle zu X gewechselt",
  );

  // 4. Konfiguration: kurze Zeiten für Test
  host.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 0.5, headStartMinutes: 0.1, countdownSeconds: 0.2 },
        reveal: { intervalMinutes: 0.1, firstRevealAfterMinutes: 0.05 },
        catch: { radiusMeters: 50 },
        map: { playAreaRadiusMeters: 100 },
        objective: { enabled: true },
      },
    }),
  );
  await host.waitFor((m) => m.t === "config");
  assert(true, "Konfiguration gesendet und bestätigt");

  // 4b. Chat ist in der Lobby deaktiviert
  host.ws.send(JSON.stringify({ t: "chat", text: "Vor dem Start" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !det.messages.some((message) => message.t === "chat"),
    "Chat ist in der Lobby deaktiviert",
  );

  // 5. Spiel starten
  host.ws.send(JSON.stringify({ t: "start" }));
  await host.waitFor((m) => m.t === "phase" && m.phase === "COUNTDOWN");
  assert(true, "Phase COUNTDOWN erreicht");

  await host.waitFor((m) => m.t === "phase" && m.phase === "HEADSTART", 5000);
  assert(true, "Phase HEADSTART erreicht");

  await host.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  assert(true, "Phase RUNNING erreicht");

  // 5a. Countdown bis zur nächsten Sichtung
  const initialRevealTimer = await host.waitFor(
    (m) => m.t === "revealTimer" && m.nextRevealAt !== null,
    5000,
  );
  assert(
    !initialRevealTimer.indeterminate && initialRevealTimer.nextRevealAt > Date.now(),
    "Client erhält den Zeitpunkt der nächsten Sichtung",
  );

  // 5b. Chat im laufenden Spiel: alle Spielenden sehen die Nachrichten
  host.ws.send(JSON.stringify({ t: "chat", text: "Treffpunkt Bahnhof" }));
  const chatToDetective = await det.waitFor(
    (m) => m.t === "chat" && m.message.text === "Treffpunkt Bahnhof",
  );
  assert(chatToDetective.message.name === "Host", "Chat wird an alle Spielenden verteilt");
  det.ws.send(JSON.stringify({ t: "chat", text: "Verstanden" }));
  const chatToHost = await host.waitFor((m) => m.t === "chat" && m.message.text === "Verstanden");
  assert(
    chatToHost.message.playerId === detJoined.playerId,
    "Chat-Nachrichten tragen den richtigen Absender",
  );

  // 6. X positioniert sich (im Spielgebiet)
  const xPos = { lat: 47.3769, lng: 8.5417 };
  host.ws.send(JSON.stringify({ t: "position", pos: xPos }));
  const pendingObjective = await host.waitFor(
    (m) => m.t === "objective" && m.objective?.status === "PENDING",
  );
  assert(pendingObjective.objective.target === null, "Bonusmission wartet auf X-Zielpunkt");

  // 7. Detektiv positioniert sich weit entfernt
  const detPos = { lat: 47.39, lng: 8.56 };
  det.ws.send(JSON.stringify({ t: "position", pos: detPos }));

  // 8. Reveal empfangen (X-Position an Detektiv)
  console.log("\nWarte auf Reveal...");
  const reveal = await det.waitFor((m) => m.t === "reveal", 15000);
  assert(reveal.reveal.pos.lat === xPos.lat, `Reveal empfangen: X bei ${reveal.reveal.pos.lat}`);
  assert(reveal.reveal.radiusMeters > 0, `Sichtradius: ${reveal.reveal.radiusMeters}m`);
  const nextRevealTimer = await host.waitFor(
    (m) =>
      m.t === "revealTimer" &&
      m.nextRevealAt !== null &&
      m.nextRevealAt > initialRevealTimer.nextRevealAt,
    15000,
  );
  assert(
    nextRevealTimer.intervalStartedAt >= initialRevealTimer.intervalStartedAt,
    "Nach einer Sichtung startet der nächste Countdown",
  );
  const revealNotice = await host.waitFor((m) => m.t === "positionShared" && !m.live);
  assert(
    revealNotice.index === reveal.reveal.index,
    "X wird informiert, wenn die Sichtung an Detektive übermittelt wird",
  );

  const objectiveTarget = { lat: xPos.lat, lng: xPos.lng + 0.0008 };
  det.ws.send(JSON.stringify({ t: "setObjective", target: objectiveTarget }));
  const unauthorizedObjective = await det.waitFor(
    (m) => m.t === "error" && m.message.includes("Nur X"),
  );
  assert(unauthorizedObjective.message.includes("Nur X"), "Nur X darf ein Missionsziel setzen");
  host.ws.send(
    JSON.stringify({
      t: "setObjective",
      target: { lat: xPos.lat + 0.01, lng: xPos.lng },
    }),
  );
  const outsideObjective = await host.waitFor(
    (m) => m.t === "error" && m.message.includes("innerhalb"),
  );
  assert(outsideObjective.message.includes("innerhalb"), "Missionsziel außerhalb wird abgelehnt");

  host.ws.send(JSON.stringify({ t: "setObjective", target: objectiveTarget }));
  await host.waitFor((m) => m.t === "objective" && m.objective?.status === "ACTIVE");
  assert(
    !det.messages.some((m) => m.t === "objective"),
    "Bonusmissions-Ziel bleibt vor Detektiven geheim",
  );
  host.ws.send(JSON.stringify({ t: "position", pos: objectiveTarget }));
  const completedObjective = await host.waitFor(
    (m) => m.t === "objective" && m.objective?.status === "COMPLETED",
  );
  assert(
    completedObjective.revealDelayedUntil > Date.now() + 120_000,
    "Bonusmission verschiebt die nächste Sichtung um zwei Minuten",
  );

  host.ws.send(JSON.stringify({ t: "position", pos: { lat: xPos.lat + 0.002, lng: xPos.lng } }));
  const liveShareNotice = await host.waitFor((m) => m.t === "positionShared" && m.live);
  assert(liveShareNotice.live, "X wird beim Start der Live-Übertragung alarmiert");
  host.ws.send(JSON.stringify({ t: "position", pos: objectiveTarget }));
  await host.waitFor((m) => m.t === "yourPositionIsShared" && !m.shared);

  // 9. Detektiv bewegt sich zu X → Fang
  console.log("\nDetektiv bewegt sich zu X...");
  det.ws.send(JSON.stringify({ t: "position", pos: objectiveTarget }));

  // 10. Spielende: Detektive gewinnen
  console.log("\nWarte auf Spielende...");
  const end = await det.waitFor((m) => m.t === "end", 10000);
  assert(end.winner === "DETECTIVES", `Spielende: ${end.winner} gewinnt (${end.reason})`);

  // Chat ist nach dem Spielende gesperrt
  host.ws.send(JSON.stringify({ t: "chat", text: "Nach dem Spiel" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !det.messages.some(
      (message) => message.t === "chat" && message.message.text === "Nach dem Spiel",
    ),
    "Chat ist nach Spielende deaktiviert",
  );

  host.ws.close();
  det.ws.close();

  // Der Verlauf wird beim Zurücksetzen des Raums nicht mitgegeben
  const afterChat = await connect(code);
  afterChat.ws.send(JSON.stringify({ t: "join", code, name: "Nachzügler", wantsX: false }));
  const afterChatJoined = await afterChat.waitFor((m) => m.t === "joined");
  assert(afterChatJoined.chat?.length === 0, "Chatverlauf wird nach Spielende gelöscht");
  afterChat.ws.close();

  // 11. Reconnect: getrennte Verbindung übernimmt den alten Platz
  console.log("\n=== Reconnect ===");
  const code2 = await createGame();
  const a = await connect(code2);
  a.ws.send(JSON.stringify({ t: "join", code: code2, name: "A", wantsX: false }));
  const aJoined = await a.waitFor((m) => m.t === "joined");
  assert(aJoined.players.length === 1, "Zweiter Raum: erster Spieler ist allein");

  const b = await connect(code2);
  b.ws.send(JSON.stringify({ t: "join", code: code2, name: "B", wantsX: false }));
  const bJoined = await b.waitFor((m) => m.t === "joined");

  // Harter Verbindungsabbruch (kein "leave") → Platz bleibt reserviert
  b.ws.terminate();
  await a.waitFor(
    (m) =>
      m.t === "players" &&
      m.players.some((p) => p.id === bJoined.playerId && p.connected === false),
    5000,
  );
  assert(true, "Getrennter Spieler bleibt im Raum (connected=false)");

  // Zurück mit derselben Spieler-ID
  const b2 = await connect(code2);
  b2.ws.send(
    JSON.stringify({
      t: "join",
      code: code2,
      name: "B",
      wantsX: false,
      playerId: bJoined.playerId,
    }),
  );
  const b2Joined = await b2.waitFor((m) => m.t === "joined");
  assert(
    b2Joined.playerId === bJoined.playerId,
    `Reconnect übernimmt Spieler-ID ${bJoined.playerId}`,
  );
  await a.waitFor(
    (m) => m.t === "players" && m.players.filter((p) => p.connected).length === 2,
    5000,
  );
  assert(true, "Beide Spieler wieder verbunden");

  // 12. Unbekannter Spiel-Code wird abgelehnt (kein stiller neuer Raum)
  console.log("\n=== Unbekannter Code ===");
  const ghost = await connect("ZZZZZZ");
  ghost.ws.send(JSON.stringify({ t: "join", code: "ZZZZZZ", name: "Ghost", wantsX: false }));
  const ghostErr = await ghost.waitFor((m) => m.t === "error", 5000);
  assert(ghostErr.code === "NO_GAME", "Unbekannter Code liefert NO_GAME");

  a.ws.close();
  b2.ws.close();
  ghost.ws.close();

  // 13. Unabhängige Spielregeln: Standortfreigabe, ÖV-Budget und Foto-Fang
  console.log("\n=== Konfigurierbare Spielregeln ===");
  const code3 = await createGame();
  const mrX = await connect(code3);
  mrX.ws.send(JSON.stringify({ t: "join", code: code3, name: "X", wantsX: true }));
  const mrXJoined = await mrX.waitFor((m) => m.t === "joined");

  const detective1 = await connect(code3);
  detective1.ws.send(JSON.stringify({ t: "join", code: code3, name: "Detektiv 1", wantsX: false }));
  const detective1Joined = await detective1.waitFor((m) => m.t === "joined");

  const detective2 = await connect(code3);
  detective2.ws.send(JSON.stringify({ t: "join", code: code3, name: "Detektiv 2", wantsX: false }));
  await detective2.waitFor((m) => m.t === "joined");

  mrX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: {
          durationMinutes: 0.3,
          headStartMinutes: 0.02,
          countdownSeconds: 0,
          detectivesWaitDuringHeadStart: true,
        },
        reveal: { firstRevealAfterMinutes: 0, intervalMinutes: 0.1 },
        catch: { method: "PHOTO_CONFIRMATION" },
        movement: {
          minUpdateSeconds: 5,
          transportModes: ["WALK", "TRANSIT"],
          xTransportModes: ["WALK", "TRANSIT"],
          xTransitBudget: { enabled: true, busStops: 3, trainStops: 1 },
          detectivesShareLiveLocation: true,
        },
        map: {
          startLocation: { lat: 47.3769, lng: 8.5417 },
          outOfBoundsEnabled: false,
        },
      },
    }),
  );
  const configuredRules = await mrX.waitFor((m) => m.t === "config");
  assert(
    configuredRules.ruleset.movement.xTransportModes.includes("TRANSIT") &&
      configuredRules.ruleset.movement.transportModes.includes("TRANSIT") &&
      !configuredRules.ruleset.map.outOfBoundsEnabled,
    "Verkehrsmittel und Spielfeldrand lassen sich unabhängig festlegen",
  );

  mrX.ws.send(JSON.stringify({ t: "start" }));
  const mrXHeadstart = await mrX.waitFor((m) => m.t === "phase" && m.phase === "HEADSTART");
  assert(mrXHeadstart.phase === "HEADSTART", "Vorsprung startet");
  assert(
    mrXHeadstart.playAreaCenter?.lat === 47.3769,
    "Vom Host gesetzter Treffpunkt wird als Spielmittelpunkt verwendet",
  );

  const mrXPos = { lat: 47.3769, lng: 8.5417 };
  mrX.ws.send(JSON.stringify({ t: "position", pos: mrXPos }));
  detective1.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.38, lng: 8.55 } }));
  await mrX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  assert(
    !detective1.messages.some(
      (m) => m.t === "playerPosition" && m.playerId === detective1Joined.playerId,
    ),
    "Detektiv-Standorte bleiben während des Vorsprungs verborgen",
  );
  const mrXReveal = await detective1.waitFor((m) => m.t === "reveal", 5000);
  await detective2.waitFor((m) => m.t === "reveal", 5000);
  assert(
    mrXReveal.reveal.pos.lat === mrXPos.lat,
    "Erster Standort-Ping erfolgt direkt nach dem Vorsprung",
  );
  assert(
    !detective1.messages.some((m) => m.t === "playerPosition" && m.playerId === mrXJoined.playerId),
    "X-Standort wird zwischen den Pings nicht live geteilt",
  );

  const detectivePos = { lat: 47.39, lng: 8.56 };
  detective1.ws.send(JSON.stringify({ t: "position", pos: detectivePos }));
  await detective2.waitFor(
    (m) => m.t === "playerPosition" && m.playerId === detective1Joined.playerId,
  );
  assert(true, "Detektive teilen ihre Live-Standorte in der App");
  assert(
    !mrX.messages.some((m) => m.t === "playerPosition" && m.playerId === detective1Joined.playerId),
    "Ohne Freigabe sieht X die Detektive nicht live",
  );
  detective1.ws.close();
  await detective2.waitFor(
    (m) => m.t === "playerPosition" && m.playerId === detective1Joined.playerId && m.pos === null,
  );
  assert(true, "Getrennte Detektive werden von der Live-Karte entfernt");

  mrX.ws.send(JSON.stringify({ t: "useTransitStop", mode: "bus", count: 2 }));
  await mrX.waitFor((m) => m.t === "transitStops" && m.bus === 2);
  const transitNotice = await detective2.waitFor((m) => m.t === "transitNotice", 5000);
  assert(
    transitNotice.mode === "bus" && transitNotice.count === 2,
    "Detektive bekommen eine Nachricht über die gemeldeten ÖV-Haltestellen",
  );
  assert(
    !mrX.messages.some((m) => m.t === "transitNotice"),
    "Die ÖV-Meldung geht nicht an X zurück",
  );
  mrX.ws.send(JSON.stringify({ t: "useTransitStop", mode: "bus", count: 2 }));
  const overBudget = await mrX.waitFor(
    (m) => m.t === "error" && m.message.includes("nur noch 1 Haltestelle"),
  );
  assert(overBudget.t === "error", "Mehr Haltestellen als das Restbudget werden abgelehnt");
  mrX.ws.send(JSON.stringify({ t: "useTransitStop", mode: "bus", count: 1 }));
  await mrX.waitFor((m) => m.t === "transitStops" && m.bus === 3);
  mrX.ws.send(JSON.stringify({ t: "useTransitStop", mode: "bus", count: 1 }));
  const exhaustedBudget = await mrX.waitFor(
    (m) => m.t === "error" && m.message.includes("Budget für Bus"),
  );
  assert(exhaustedBudget.t === "error", "Bus-Budget wird pro Haltestelle gezählt und begrenzt");

  detective2.ws.send(JSON.stringify({ t: "reportCatch" }));
  await mrX.waitFor((m) => m.t === "catchPending" && m.pending);
  mrX.ws.send(JSON.stringify({ t: "resolveCatch", caught: true }));
  const photoCatchEnd = await detective2.waitFor((m) => m.t === "end", 5000);
  assert(photoCatchEnd.winner === "DETECTIVES", "Detektive gewinnen nach bestätigtem Foto-Fang");

  mrX.ws.close();
  detective2.ws.close();

  // 14. Zufallsintervall: Der genaue Zeitpunkt bleibt verborgen
  console.log("\n=== Zufälliger Sichtungsabstand ===");
  const code4 = await createGame();
  const randomX = await connect(code4);
  randomX.ws.send(JSON.stringify({ t: "join", code: code4, name: "Zufalls-X", wantsX: true }));
  await randomX.waitFor((m) => m.t === "joined");
  const randomDetective = await connect(code4);
  randomDetective.ws.send(
    JSON.stringify({ t: "join", code: code4, name: "Zufalls-Detektiv", wantsX: false }),
  );
  await randomDetective.waitFor((m) => m.t === "joined");

  randomX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        reveal: {
          schedule: "RANDOM",
          firstRevealAfterMinutes: 0.05,
          intervalMinutes: 0.1,
          randomMinMinutes: 0.05,
          randomMaxMinutes: 0.1,
        },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await randomX.waitFor((m) => m.t === "config");
  randomX.ws.send(JSON.stringify({ t: "start" }));
  await randomDetective.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  const randomTimer = await randomDetective.waitFor(
    (m) => m.t === "revealTimer" && m.indeterminate,
    5000,
  );
  assert(
    randomTimer.nextRevealAt === null,
    "Zufallsintervall verbirgt den genauen Sichtungszeitpunkt",
  );

  randomX.ws.close();
  randomDetective.ws.close();

  // 15. X sieht Detektive immer (Regel ALWAYS)
  console.log("\n=== X sieht Detektive (immer) ===");
  const code5 = await createGame();
  const seerX = await connect(code5);
  seerX.ws.send(JSON.stringify({ t: "join", code: code5, name: "Seher-X", wantsX: true }));
  await seerX.waitFor((m) => m.t === "joined");
  const seenDetective = await connect(code5);
  seenDetective.ws.send(
    JSON.stringify({ t: "join", code: code5, name: "Sichtbarer Detektiv", wantsX: false }),
  );
  const seenDetectiveJoined = await seenDetective.waitFor((m) => m.t === "joined");

  seerX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        reveal: { firstRevealAfterMinutes: 5, intervalMinutes: 5, xSeesDetectives: "ALWAYS" },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await seerX.waitFor((m) => m.t === "config");
  seerX.ws.send(JSON.stringify({ t: "start" }));
  await seerX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);

  seerX.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.3769, lng: 8.5417 } }));
  seenDetective.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.38, lng: 8.55 } }));
  const seenFirst = await seerX.waitFor(
    (m) => m.t === "playerPosition" && m.playerId === seenDetectiveJoined.playerId,
  );
  assert(seenFirst.pos.lat === 47.38, "X sieht den Live-Standort der Detektive (Regel ALWAYS)");

  seenDetective.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.381, lng: 8.551 } }));
  const seenUpdate = await seerX.waitFor(
    (m) =>
      m.t === "playerPosition" &&
      m.playerId === seenDetectiveJoined.playerId &&
      m.pos?.lat === 47.381,
  );
  assert(!!seenUpdate, "X bekommt die Standort-Updates der Detektive");

  seenDetective.ws.close();
  await seerX.waitFor(
    (m) => m.t === "playerPosition" && m.playerId === seenDetectiveJoined.playerId && m.pos === null,
  );
  assert(true, "Getrennte Detektive verschwinden auch aus der X-Karte");

  seerX.ws.close();

  // 16. X sieht Detektive nur bei der Sichtung (Regel ON_REVEAL)
  console.log("\n=== X sieht Detektive bei der Sichtung ===");
  const code6 = await createGame();
  const revealX = await connect(code6);
  revealX.ws.send(JSON.stringify({ t: "join", code: code6, name: "Reveal-X", wantsX: true }));
  await revealX.waitFor((m) => m.t === "joined");
  const revealedDetective = await connect(code6);
  revealedDetective.ws.send(
    JSON.stringify({ t: "join", code: code6, name: "Versteckter Detektiv", wantsX: false }),
  );
  const revealedDetectiveJoined = await revealedDetective.waitFor((m) => m.t === "joined");

  revealX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        reveal: {
          firstRevealAfterMinutes: 0.1,
          intervalMinutes: 5,
          xSeesDetectives: "ON_REVEAL",
        },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await revealX.waitFor((m) => m.t === "config");
  revealX.ws.send(JSON.stringify({ t: "start" }));
  await revealX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  revealX.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.3769, lng: 8.5417 } }));
  revealedDetective.ws.send(JSON.stringify({ t: "position", pos: { lat: 47.38, lng: 8.55 } }));
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert(
    !revealX.messages.some(
      (m) => m.t === "playerPosition" && m.playerId === revealedDetectiveJoined.playerId,
    ),
    "Ohne Sichtung bleibt der Detektiv-Standort bei ON_REVEAL verborgen",
  );
  const snapshot = await revealX.waitFor(
    (m) => m.t === "playerPosition" && m.playerId === revealedDetectiveJoined.playerId,
    15000,
  );
  assert(snapshot.pos.lat === 47.38, "Bei der Sichtung erfährt X, wo der Detektiv steht");

  revealX.ws.close();
  revealedDetective.ws.close();

  // 17. Notfall-Knopf: X gibt auf und teilt den exakten Standort
  console.log("\n=== Notfall-Knopf: X gibt auf ===");
  const code7 = await createGame();
  const emergencyX = await connect(code7);
  emergencyX.ws.send(JSON.stringify({ t: "join", code: code7, name: "Notfall-X", wantsX: true }));
  await emergencyX.waitFor((m) => m.t === "joined");
  const emergencyDetective = await connect(code7);
  emergencyDetective.ws.send(
    JSON.stringify({ t: "join", code: code7, name: "Notfall-Detektiv", wantsX: false }),
  );
  await emergencyDetective.waitFor((m) => m.t === "joined");

  emergencyX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        catch: { xCanSurrender: true },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await emergencyX.waitFor((m) => m.t === "config");
  emergencyX.ws.send(JSON.stringify({ t: "start" }));
  await emergencyX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);

  emergencyDetective.ws.send(JSON.stringify({ t: "surrender" }));
  const notXError = await emergencyDetective.waitFor(
    (m) => m.t === "error" && m.message.includes("Nur X"),
  );
  assert(notXError.t === "error", "Nur X kann das Spiel aufgeben");

  const surrenderPos = { lat: 47.3769, lng: 8.5417 };
  emergencyX.ws.send(JSON.stringify({ t: "position", pos: surrenderPos }));
  emergencyX.ws.send(JSON.stringify({ t: "surrender" }));
  const surrenderEnd = await emergencyDetective.waitFor((m) => m.t === "end", 5000);
  assert(surrenderEnd.winner === "DETECTIVES", "Aufgeben beendet die Runde – Detektive gewinnen");
  assert(
    surrenderEnd.reason.includes("aufgegeben"),
    `Spielende nennt das Aufgeben: ${surrenderEnd.reason}`,
  );
  assert(
    surrenderEnd.surrender?.pos?.lat === surrenderPos.lat &&
      surrenderEnd.surrender?.pos?.lng === surrenderPos.lng &&
      surrenderEnd.surrender?.name === "Notfall-X",
    "Detektive erhalten den exakten Standort und den Namen von X",
  );

  const surrenderReconnect = await connect(code7);
  surrenderReconnect.ws.send(
    JSON.stringify({ t: "join", code: code7, name: "Nachzügler", wantsX: false }),
  );
  const reconnectedEnd = await surrenderReconnect.waitFor((m) => m.t === "end", 5000);
  assert(
    reconnectedEnd.surrender?.pos?.lat === surrenderPos.lat,
    "Standort beim Aufgeben bleibt für Wiedereinsteiger sichtbar",
  );

  surrenderReconnect.ws.close();
  emergencyX.ws.close();
  emergencyDetective.ws.close();

  // 18. Ohne Regel ist der Notfall-Knopf wirkungslos
  console.log("\n=== Aufgeben nur mit Regel ===");
  const code8 = await createGame();
  const noSurrenderX = await connect(code8);
  noSurrenderX.ws.send(JSON.stringify({ t: "join", code: code8, name: "Ohne-X", wantsX: true }));
  await noSurrenderX.waitFor((m) => m.t === "joined");
  const noSurrenderDetective = await connect(code8);
  noSurrenderDetective.ws.send(
    JSON.stringify({ t: "join", code: code8, name: "Beobachter", wantsX: false }),
  );
  await noSurrenderDetective.waitFor((m) => m.t === "joined");

  noSurrenderX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        catch: { xCanSurrender: false },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await noSurrenderX.waitFor((m) => m.t === "config");
  noSurrenderX.ws.send(JSON.stringify({ t: "start" }));
  await noSurrenderX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  noSurrenderX.ws.send(JSON.stringify({ t: "position", pos: surrenderPos }));
  noSurrenderX.ws.send(JSON.stringify({ t: "surrender" }));
  const disabledError = await noSurrenderX.waitFor(
    (m) => m.t === "error" && m.message.includes("nicht vorgesehen"),
  );
  assert(disabledError.t === "error", "Bei deaktivierter Regel wird das Aufgeben abgelehnt");
  assert(
    !noSurrenderDetective.messages.some((m) => m.t === "end"),
    "Die Runde läuft nach einem abgelehnten Aufgeben weiter",
  );
  noSurrenderX.ws.close();
  noSurrenderDetective.ws.close();

  console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test-Fehler:", err.message);
  process.exit(1);
});
