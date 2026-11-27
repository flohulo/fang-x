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

import { createHash } from "node:crypto";
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

// Menschen-Prüfung: Ist sie aktiv (HUMAN_CHECK_SECRET gesetzt), lösen wir die Aufgabe
// wie der Browser. Sonst läuft alles ohne Ticket.
function leadingZeroBits(buf) {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

let humanTicket = null;
let humanCheckActive = false;

function solveChallenge(challenge, difficulty) {
  for (let counter = 0; ; counter++) {
    const solution = counter.toString(36);
    const digest = createHash("sha256").update(`${challenge}:${solution}`).digest();
    if (leadingZeroBits(digest) >= difficulty) return solution;
  }
}

// ip: simuliert eine Client-Adresse über CF-Connecting-IP (lokal reicht wrangler ihn durch).
async function fetchTicket(ip) {
  const ipHeader = ip ? { "CF-Connecting-IP": ip } : {};
  const info = await (await fetch(`${HTTP}/api/challenge`, { headers: ipHeader })).json();
  if (!info.enabled) return null;
  humanCheckActive = true;
  const solution = solveChallenge(info.challenge, info.difficulty);
  const res = await fetch(`${HTTP}/api/verify`, {
    method: "POST",
    headers: { ...ipHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: info.challenge, solution }),
  });
  if (!res.ok) throw new Error(`Verify HTTP ${res.status}`);
  return (await res.json()).ticket;
}

async function createGame() {
  const res = await fetch(`${HTTP}/api/games`, {
    method: "POST",
    headers: humanTicket ? { "X-Human-Ticket": humanTicket } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { code } = await res.json();
  return code;
}

function connect(code, ticket = humanTicket) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${SERVER}/room/${code}`,
      ticket ? [`fangx-ticket.${ticket}`] : undefined,
    );
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

  humanTicket = await fetchTicket();
  if (humanCheckActive) {
    assert(humanTicket !== null, "Menschen-Prüfung: Ticket nach gelöster Aufgabe erhalten");
    const noTicket = await fetch(`${HTTP}/api/games`, { method: "POST" });
    assert(noTicket.status === 403, "Menschen-Prüfung: Raum erstellen ohne Ticket wird abgelehnt");
    const badTicket = await fetch(`${HTTP}/api/games`, {
      method: "POST",
      headers: { "X-Human-Ticket": "t.9999999999999.fehlerhaft" },
    });
    assert(badTicket.status === 403, "Menschen-Prüfung: gefälschtes Ticket wird abgelehnt");
    const badSolution = await fetch(`${HTTP}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge: "c.1.2.3", solution: "0" }),
    });
    assert(badSolution.status === 400, "Menschen-Prüfung: falsche Lösung wird abgelehnt");
    const ghost = new WebSocket(`${SERVER}/room/ABCDEF`);
    const ghostStatus = await new Promise((resolve) => {
      ghost.on("unexpected-response", (_req, res) => resolve(res.statusCode));
      ghost.on("open", () => resolve(101));
      ghost.on("error", () => {});
    });
    assert(ghostStatus === 403, "Menschen-Prüfung: WebSocket ohne Ticket wird abgelehnt");

    // Tickets und Aufgaben gelten nur für die Adresse, für die sie ausgestellt wurden.
    const lookupStatus = async (ip, ticket) =>
      (
        await fetch(`${HTTP}/api/games/ABCDEF`, {
          headers: { "CF-Connecting-IP": ip, "X-Human-Ticket": ticket },
        })
      ).status;
    const ipTicket = await fetchTicket("198.51.100.1");
    assert(
      (await lookupStatus("198.51.100.1", ipTicket)) === 200,
      "Menschen-Prüfung: Ticket gilt für die eigene Adresse",
    );
    assert(
      (await lookupStatus("198.51.100.2", ipTicket)) === 403,
      "Menschen-Prüfung: Ticket gilt nicht für eine andere Adresse",
    );
    const v6Ticket = await fetchTicket("2001:db8:1:2:aaaa::1");
    assert(
      (await lookupStatus("2001:db8:1:2:bbbb::7", v6Ticket)) === 200 &&
        (await lookupStatus("2001:db8:1:3::1", v6Ticket)) === 403,
      "Menschen-Prüfung: Bei IPv6 zählt das /64-Netz",
    );
    const foreignInfo = await (
      await fetch(`${HTTP}/api/challenge`, { headers: { "CF-Connecting-IP": "198.51.100.3" } })
    ).json();
    const foreignRedeem = await fetch(`${HTTP}/api/verify`, {
      method: "POST",
      headers: { "CF-Connecting-IP": "198.51.100.4", "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge: foreignInfo.challenge,
        solution: solveChallenge(foreignInfo.challenge, foreignInfo.difficulty),
      }),
    });
    assert(
      foreignRedeem.status === 400,
      "Menschen-Prüfung: Aufgabe lässt sich nicht von einer anderen Adresse einlösen",
    );
  }

  // 0b. Ratenbegrenzung pro Adresse (CF-Connecting-IP; lokal ohne Header ist sie aus)
  // Tickets sind an die Adresse gebunden: pro simulierter Adresse ein eigenes holen.
  const ipTickets = new Map();
  const createFrom = async (ip) => {
    if (!ipTickets.has(ip)) ipTickets.set(ip, await fetchTicket(ip));
    const ticket = ipTickets.get(ip);
    return (
      await fetch(`${HTTP}/api/games`, {
        method: "POST",
        headers: {
          "CF-Connecting-IP": ip,
          ...(ticket ? { "X-Human-Ticket": ticket } : {}),
        },
      })
    ).status;
  };
  const limitIp = `198.51.100.${10 + Math.floor(Math.random() * 200)}`;
  const createStatuses = [];
  for (let i = 0; i < 4; i++) createStatuses.push(await createFrom(limitIp));
  assert(
    createStatuses.slice(0, 3).every((status) => status === 200) && createStatuses[3] === 429,
    `Ratenbegrenzung: viertes Spiel pro Minute wird abgelehnt (${createStatuses.join(", ")})`,
  );
  assert(
    (await createFrom("203.0.113.77")) === 200,
    "Ratenbegrenzung: andere Adressen sind nicht betroffen",
  );

  // 1. Spiel erstellen
  const code = await createGame();
  assert(code && code.length === 6, `Spiel-Code erstellt: ${code}`);

  // Das Ticket im Subprotokoll wird angenommen und bestätigt, ein falsches abgelehnt.
  if (humanCheckActive) {
    const viaProtocol = (ticket) =>
      new Promise((resolve) => {
        const socket = new WebSocket(`${SERVER}/room/${code}`, [`fangx-ticket.${ticket}`]);
        socket.on("unexpected-response", (_req, res) => resolve(res.statusCode));
        socket.on("open", () => {
          const chosen = socket.protocol;
          socket.close();
          resolve(chosen);
        });
        socket.on("error", () => {});
      });
    assert(
      (await viaProtocol(humanTicket)) === `fangx-ticket.${humanTicket}`,
      "Menschen-Prüfung: Ticket im Subprotokoll wird angenommen und bestätigt",
    );
    assert(
      (await viaProtocol("t.1.abc.def")) === 403,
      "Menschen-Prüfung: falsches Ticket im Subprotokoll wird abgelehnt",
    );
  }

  // WebSocket-Verbindungen von fremden Seiten werden abgelehnt, die eigene Seite darf.
  // Das Ticket in der URL (veraltet) wird für ältere Clients noch angenommen.
  const wsStatus = (origin) => {
    const query = humanTicket ? `?ticket=${encodeURIComponent(humanTicket)}` : "";
    const socket = new WebSocket(`${SERVER}/room/${code}${query}`, { origin });
    return new Promise((resolve) => {
      socket.on("unexpected-response", (_req, res) => resolve(res.statusCode));
      socket.on("open", () => {
        socket.close();
        resolve(101);
      });
      socket.on("error", () => {});
    });
  };
  assert(
    (await wsStatus("https://boese.example")) === 403,
    "WebSocket von fremder Seite wird abgelehnt",
  );
  assert((await wsStatus(HTTP)) === 101, "WebSocket von der eigenen Seite wird angenommen");

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

  // 3b. Zweiter Detektiv (für den Sprechfunk)
  const det2 = await connect(code);
  det2.ws.send(JSON.stringify({ t: "join", code, name: "Detektivin", wantsX: false }));
  const det2Joined = await det2.waitFor((m) => m.t === "joined");
  assert(
    det2Joined.iceServers === undefined,
    "Der Beitritt liefert noch keine ICE-Server (Rollen stehen erst mit dem Start fest)",
  );

  // 4. Konfiguration: kurze Zeiten für Test
  host.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 0.5, headStartMinutes: 0.1, countdownSeconds: 0.2 },
        reveal: { intervalMinutes: 0.1, firstRevealAfterMinutes: 0.05 },
        catch: { radiusMeters: 50 },
        map: { playAreaRadiusMeters: 100, outOfBoundsGraceSeconds: 0 },
        objective: { enabled: true },
        radio: { enabled: true },
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

  // 4c. Sprechfunk ist in der Lobby deaktiviert
  det.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "hello", reply: true } }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !det2.messages.some((message) => message.t === "rtc"),
    "Sprechfunk ist in der Lobby deaktiviert",
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

  // 5c. Sprechfunk: Signale gehen nur zwischen Detektiven, X bekommt nichts
  const ice = await det2.waitFor((m) => m.t === "iceServers");
  assert(
    Array.isArray(ice.iceServers) && ice.iceServers.length > 0,
    "Detektive erhalten mit dem Start die ICE-Server für den Sprechfunk",
  );
  assert(
    host.messages.every((m) => m.t !== "iceServers"),
    "X erhält keine ICE-Server",
  );
  det.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "offer", sdp: "v=0\r\n" } }));
  det.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "hello", reply: true } }));
  const hello = await det2.waitFor((m) => m.t === "rtc" && m.signal.kind === "hello");
  assert(hello.from === detJoined.playerId, "Sprechfunk-Signal erreicht den anderen Detektiv");
  det.ws.send(
    JSON.stringify({
      t: "rtc",
      to: det2Joined.playerId,
      signal: { kind: "offer", sdp: "v=0\r\n" },
    }),
  );
  const offer = await det2.waitFor((m) => m.t === "rtc" && m.signal.kind === "offer");
  assert(offer.signal.sdp === "v=0\r\n", "Gezieltes Sprechfunk-Signal wird weitergeleitet");
  det.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "offer", sdp: 42 } }));
  det.ws.send(JSON.stringify({ t: "rtc", to: hostJoined.playerId, signal: { kind: "bye" } }));
  host.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "hello", reply: true } }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !host.messages.some((message) => message.t === "rtc"),
    "X erhält keine Sprechfunk-Signale",
  );
  assert(
    det.messages.every((message) => message.t !== "rtc") &&
      det2.messages.filter((message) => message.t === "rtc").length === 2,
    "X kann nicht funken, ungültige Signale und Angebote ohne Empfänger werden verworfen",
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

  // Ping-Trick: scharf schalten, zurücknehmen, dann falscher Ping bei der nächsten Sichtung
  host.ws.send(JSON.stringify({ t: "setPingTrick", mode: "SKIP" }));
  await host.waitFor((m) => m.t === "pingTrick" && m.armed === "SKIP", 5000);
  host.ws.send(JSON.stringify({ t: "setPingTrick", mode: "CANCEL" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  const trickStates = host.messages.filter((m) => m.t === "pingTrick");
  assert(
    trickStates[trickStates.length - 1].armed === null,
    "Ping-Trick lässt sich vor der Sichtung zurücknehmen",
  );
  det.ws.send(JSON.stringify({ t: "setPingTrick", mode: "FAKE" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(!det.messages.some((m) => m.t === "pingTrick"), "Nur X kann den Ping-Trick benutzen");
  host.ws.send(JSON.stringify({ t: "setPingTrick", mode: "FAKE" }));
  await host.waitFor((m) => m.t === "pingTrick" && m.armed === "FAKE", 5000);
  const fakeShared = await host.waitFor(
    (m) => m.t === "positionShared" && !m.live && m.index > reveal.reveal.index,
    15000,
  );
  const metersFromX = Math.hypot(
    (fakeShared.pos.lat - xPos.lat) * 111_000,
    (fakeShared.pos.lng - xPos.lng) * 111_000 * Math.cos((xPos.lat * Math.PI) / 180),
  );
  assert(metersFromX >= 30, `Falscher Ping liegt abseits von X (${Math.round(metersFromX)} m)`);
  const fakeReveal = await det.waitFor(
    (m) => m.t === "reveal" && m.reveal.index === fakeShared.index,
    5000,
  );
  assert(
    fakeReveal.reveal.pos.lat === fakeShared.pos.lat &&
      fakeReveal.reveal.pos.lng === fakeShared.pos.lng,
    "Detektive sehen den falschen Ping wie eine echte Sichtung",
  );
  host.ws.send(JSON.stringify({ t: "setPingTrick", mode: "SKIP" }));
  const trickUsed = await host.waitFor(
    (m) => m.t === "error" && m.code === "PING_TRICK_USED",
    5000,
  );
  assert(!!trickUsed, "Der Ping-Trick gilt nur einmal pro Runde");

  const objectiveTarget = { lat: xPos.lat, lng: xPos.lng + 0.0008 };
  det.ws.send(JSON.stringify({ t: "setObjective", target: objectiveTarget }));
  const unauthorizedObjective = await det.waitFor(
    (m) => m.t === "error" && m.message.includes("Nur X"),
  );
  assert(unauthorizedObjective.message.includes("Nur X"), "Nur X darf ein Missionsziel setzen");
  assert(
    unauthorizedObjective.code === "OBJECTIVE_X_ONLY",
    "Fehlermeldungen tragen einen übersetzbaren Code",
  );
  host.ws.send(
    JSON.stringify({
      t: "setObjective",
      target: { lat: xPos.lat + 0.01, lng: xPos.lng },
    }),
  );
  const outsideObjective = await host.waitFor(
    (m) => m.t === "error" && m.message.includes("innerhalb"),
  );
  assert(outsideObjective.message.includes("innerhalb"), "Missionsziel ausserhalb wird abgelehnt");

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

  // Team-Markierungen: nur Detektive sehen und setzen sie
  det.ws.send(JSON.stringify({ t: "addMarker", pos: xPos, kind: "SUSPECT" }));
  const markerList = await det.waitFor((m) => m.t === "markers" && m.markers.length === 1, 5000);
  assert(
    markerList.markers[0].kind === "SUSPECT" && markerList.markers[0].by === "Detektiv",
    "Detektiv setzt eine Team-Markierung",
  );
  host.ws.send(JSON.stringify({ t: "addMarker", pos: xPos, kind: "CLEAR" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !host.messages.some((m) => m.t === "markers"),
    "X sieht keine Team-Markierungen und kann keine setzen",
  );
  det.ws.send(JSON.stringify({ t: "removeMarker", id: markerList.markers[0].id }));
  const emptied = await det.waitFor((m) => m.t === "markers" && m.markers.length === 0, 5000);
  assert(emptied.markers.length === 0, "Team-Markierung lässt sich wieder entfernen");
  // Akku-Warnung geht an alle und wird gedrosselt
  host.ws.send(JSON.stringify({ t: "batteryLow", level: 12 }));
  host.ws.send(JSON.stringify({ t: "batteryLow", level: 11 }));
  const batteryNotice = await det.waitFor((m) => m.t === "batteryLow", 5000);
  assert(
    batteryNotice.level === 12 && batteryNotice.playerId === hostJoined.playerId,
    "Akku-Warnung erreicht die anderen Spielenden",
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    det.messages.filter((m) => m.t === "batteryLow").length === 1,
    "Akku-Warnung wird je Person gedrosselt",
  );
  det.ws.send(JSON.stringify({ t: "batteryLow", level: 90 }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    det.messages.filter((m) => m.t === "batteryLow").length === 1,
    "Unplausibler Akkustand löst keine Warnung aus",
  );

  // 9. Detektiv bewegt sich zu X → Fang
  console.log("\nDetektiv bewegt sich zu X...");
  det.ws.send(JSON.stringify({ t: "position", pos: objectiveTarget }));

  // 10. Spielende: Detektive gewinnen
  console.log("\nWarte auf Spielende...");
  const end = await det.waitFor((m) => m.t === "end", 10000);
  assert(end.winner === "DETECTIVES", `Spielende: ${end.winner} gewinnt (${end.reason})`);
  assert(
    typeof end.reasonCode === "string",
    `Spielende trägt einen Grund-Code (${end.reasonCode})`,
  );
  assert(
    end.stats && Array.isArray(end.stats.players) && end.stats.players.length >= 2,
    "Spielende enthält die Auswertung mit allen Spielenden",
  );
  assert(
    typeof end.stats.closestApproachMeters === "number" && end.stats.closestApproachMeters <= 5,
    `Auswertung nennt den knappsten Abstand (${end.stats.closestApproachMeters} m)`,
  );
  assert(
    end.stats.players.every((p) => p.distanceMeters >= 0 && !("pos" in p) && !("track" in p)),
    "Auswertung enthält nur Summen, keine Standorte",
  );

  // Alle sicher? Nach Spielende kann jede Person bestätigen.
  det.ws.send(JSON.stringify({ t: "confirmSafe" }));
  const safety = await host.waitFor(
    (m) => m.t === "safety" && m.safe.includes(detJoined.playerId),
    5000,
  );
  assert(
    !safety.safe.includes(hostJoined.playerId),
    "Sicherheitsabfrage zeigt nur die Personen, die bestätigt haben",
  );

  // Chat ist nach dem Spielende gesperrt
  host.ws.send(JSON.stringify({ t: "chat", text: "Nach dem Spiel" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !det.messages.some(
      (message) => message.t === "chat" && message.message.text === "Nach dem Spiel",
    ),
    "Chat ist nach Spielende deaktiviert",
  );

  // Erst wenn alle den Raum verlassen haben, beginnt er von vorn.
  for (const client of [host, det, det2]) client.ws.send(JSON.stringify({ t: "leave" }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  for (const client of [host, det, det2]) client.ws.close();

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
      token: bJoined.token,
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

  // Übernahme bei noch offenem alten Socket (halb offene Mobilfunk-Verbindung): der Server
  // schließt den alten Socket, der neue Platz darf dadurch nicht als offline gelten.
  const b2Closed = new Promise((resolve) => b2.ws.on("close", (code) => resolve(code)));
  const b3 = await connect(code2);
  b3.ws.send(
    JSON.stringify({
      t: "join",
      code: code2,
      name: "B",
      wantsX: false,
      playerId: bJoined.playerId,
      token: bJoined.token,
    }),
  );
  await b3.waitFor((m) => m.t === "joined");
  assert((await b2Closed) === 4001, "Übernommener alter Socket wird mit Code 4001 geschlossen");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const c = await connect(code2);
  c.ws.send(JSON.stringify({ t: "join", code: code2, name: "C", wantsX: false }));
  await c.waitFor((m) => m.t === "joined");
  const afterTakeover = await b3.waitFor(
    (m) => m.t === "players" && m.players.some((p) => p.name === "C"),
    5000,
  );
  assert(
    afterTakeover.players.find((p) => p.id === bJoined.playerId)?.connected === true,
    "Nach der Übernahme bleibt der Spieler verbunden und erhält weiter Nachrichten",
  );
  c.ws.close();
  b3.ws.close();

  // Fremde Spieler-ID ohne Token darf den Platz nicht übernehmen
  const thief = await connect(code2);
  thief.ws.send(
    JSON.stringify({
      t: "join",
      code: code2,
      name: "Dieb",
      wantsX: false,
      playerId: bJoined.playerId,
    }),
  );
  const thiefJoined = await thief.waitFor((m) => m.t === "joined");
  assert(thiefJoined.playerId !== bJoined.playerId, "Platz lässt sich ohne Token nicht übernehmen");
  thief.ws.close();

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
          playAreaPolygon: [
            { lat: 47.375, lng: 8.539 },
            { lat: 47.375, lng: 8.544 },
            { lat: 47.379, lng: 8.544 },
            { lat: 47.379, lng: 8.539 },
          ],
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
  assert(
    configuredRules.ruleset.map.playAreaPolygon?.length === 4,
    "Gezeichnetes Spielfeld wird übernommen",
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

  // Sprechfunk ist standardmäßig aus: Signale zwischen Detektiven werden nicht weitergeleitet
  detective1.ws.send(JSON.stringify({ t: "rtc", signal: { kind: "hello", reply: true } }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !detective2.messages.some((m) => m.t === "rtc"),
    "Sprechfunk ist ohne aktivierte Einstellung gesperrt",
  );
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
  assert(
    overBudget.code === "TRANSIT_REMAINING" &&
      overBudget.params?.mode === "bus" &&
      overBudget.params?.count === 1,
    "ÖV-Restbudget-Fehler trägt Code und Parameter",
  );
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
    (m) =>
      m.t === "playerPosition" && m.playerId === seenDetectiveJoined.playerId && m.pos === null,
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
  const emergencyDetectiveJoined = await emergencyDetective.waitFor((m) => m.t === "joined");

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

  emergencyDetective.ws.terminate();
  const surrenderReconnect = await connect(code7);
  surrenderReconnect.ws.send(
    JSON.stringify({
      t: "join",
      code: code7,
      name: "Notfall-Detektiv",
      wantsX: false,
      playerId: emergencyDetectiveJoined.playerId,
      token: emergencyDetectiveJoined.token,
    }),
  );
  const reconnectedEnd = await surrenderReconnect.waitFor((m) => m.t === "end", 5000);
  assert(
    reconnectedEnd.surrender?.pos?.lat === surrenderPos.lat,
    "Standort beim Aufgeben bleibt für Wiedereinsteiger sichtbar",
  );

  // Wer neu dazukommt, während andere noch zurückkehren dürfen, wird abgelehnt.
  const latecomer = await connect(code7);
  const latecomerClosed = new Promise((resolve) => latecomer.ws.on("close", resolve));
  latecomer.ws.send(JSON.stringify({ t: "join", code: code7, name: "Nachzügler", wantsX: false }));
  const latecomerError = await latecomer.waitFor((m) => m.t === "error", 5000);
  await latecomerClosed;
  assert(
    latecomerError.code === "GAME_ENDED",
    "Neue Spieler werden nach Spielende abgelehnt (GAME_ENDED)",
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(
    !surrenderReconnect.messages.some((m) => m.t === "phase" && m.phase === "LOBBY"),
    "Ein abgelehnter Nachzügler setzt die Auswertung nicht zurück",
  );

  surrenderReconnect.ws.close();
  emergencyX.ws.close();

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
        reveal: { xCanTrick: false },
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
  noSurrenderX.ws.send(JSON.stringify({ t: "setPingTrick", mode: "FAKE" }));
  const trickDisabled = await noSurrenderX.waitFor(
    (m) => m.t === "error" && m.code === "PING_TRICK_DISABLED",
    5000,
  );
  assert(!!trickDisabled, "Ohne Regel wird der Ping-Trick abgelehnt");
  noSurrenderX.ws.close();
  noSurrenderDetective.ws.close();

  // 18b. Kurz getrennter Host behält die Leitung, Neue werden nicht zusätzlich Host
  console.log("\n=== Host kurz getrennt ===");
  const codeHost = await createGame();
  const firstHost = await connect(codeHost);
  firstHost.ws.send(JSON.stringify({ t: "join", code: codeHost, name: "Host", wantsX: false }));
  const firstHostJoined = await firstHost.waitFor((m) => m.t === "joined");
  const hostGone = new Promise((resolve) => firstHost.ws.on("close", resolve));
  firstHost.ws.terminate();
  await hostGone;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newcomer = await connect(codeHost);
  newcomer.ws.send(JSON.stringify({ t: "join", code: codeHost, name: "Neu", wantsX: false }));
  const newcomerJoined = await newcomer.waitFor((m) => m.t === "joined");
  assert(
    newcomerJoined.youAreHost === false,
    "Wer während einer kurzen Trennung des Hosts beitritt, wird nicht Host",
  );
  const hostBack = await connect(codeHost);
  hostBack.ws.send(
    JSON.stringify({
      t: "join",
      code: codeHost,
      name: "Host",
      wantsX: false,
      playerId: firstHostJoined.playerId,
      token: firstHostJoined.token,
    }),
  );
  const hostBackJoined = await hostBack.waitFor((m) => m.t === "joined");
  assert(
    hostBackJoined.youAreHost === true &&
      hostBackJoined.players.filter((p) => p.isHost).length === 1,
    "Zurückgekehrter Host ist wieder Host, es gibt genau einen Host",
  );
  newcomer.ws.close();
  hostBack.ws.close();

  // 18c. Spielernamen werden bereinigt (Steuer- und Formatzeichen, Länge)
  console.log("\n=== Spielernamen ===");
  const codeName = await createGame();
  const named = await connect(codeName);
  named.ws.send(
    JSON.stringify({
      t: "join",
      code: codeName,
      name: "  Bo\u200Bb\u202E\nder Baumeister mit langem Namen ",
      wantsX: false,
    }),
  );
  const namedJoined = await named.waitFor((m) => m.t === "joined");
  const cleanName = namedJoined.players.find((p) => p.id === namedJoined.playerId)?.name;
  assert(
    cleanName === "Bob der Baumeister m",
    `Name ohne unsichtbare Zeichen und auf 20 Zeichen gekürzt: ${cleanName}`,
  );
  named.ws.close();

  // 19. Missbrauch: wer die Verbindung mit ungültigem JSON flutet, wird getrennt
  console.log("\n=== Spam-Schutz: Verbindung trennen ===");
  const code9 = await createGame();
  const spammer = await connect(code9);
  spammer.ws.send(JSON.stringify({ t: "join", code: code9, name: "Spammer", wantsX: false }));
  await spammer.waitFor((m) => m.t === "joined");
  const spammerClosed = new Promise((resolve) => spammer.ws.on("close", (c) => resolve(c)));
  for (let i = 0; i < 15; i++) spammer.ws.send("kein json");
  const closeCode = await Promise.race([
    spammerClosed,
    new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
  assert(closeCode === 4008, "Flut ungültiger Nachrichten trennt die Verbindung (Code 4008)");

  // 20. Ping-Trick: Sichtung überspringen
  console.log("\n=== Ping-Trick: Sichtung überspringen ===");
  const codeSkip = await createGame();
  const skipX = await connect(codeSkip);
  skipX.ws.send(JSON.stringify({ t: "join", code: codeSkip, name: "Skip-X", wantsX: true }));
  await skipX.waitFor((m) => m.t === "joined");
  const skipDetective = await connect(codeSkip);
  skipDetective.ws.send(
    JSON.stringify({ t: "join", code: codeSkip, name: "Skip-Detektiv", wantsX: false }),
  );
  await skipDetective.waitFor((m) => m.t === "joined");
  skipX.ws.send(
    JSON.stringify({
      t: "configure",
      ruleset: {
        game: { durationMinutes: 1, headStartMinutes: 0, countdownSeconds: 0 },
        reveal: { intervalMinutes: 0.1, firstRevealAfterMinutes: 0.05 },
        map: { outOfBoundsEnabled: false },
      },
    }),
  );
  await skipX.waitFor((m) => m.t === "config");
  skipX.ws.send(JSON.stringify({ t: "start" }));
  await skipX.waitFor((m) => m.t === "phase" && m.phase === "RUNNING", 10000);
  skipX.ws.send(JSON.stringify({ t: "position", pos: surrenderPos }));
  skipX.ws.send(JSON.stringify({ t: "setPingTrick", mode: "SKIP" }));
  await skipX.waitFor((m) => m.t === "pingTrick" && m.used === "SKIP", 10000);
  assert(
    !skipDetective.messages.some((m) => m.t === "reveal"),
    "Übersprungene Sichtung erreicht die Detektive nicht",
  );
  const afterSkip = await skipDetective.waitFor((m) => m.t === "reveal", 15000);
  assert(
    afterSkip.reveal.index === 1,
    "Die Sichtung nach dem Überspringen zählt unauffällig als erste",
  );
  skipX.ws.close();
  skipDetective.ws.close();

  // Rückmeldung zur Runde: gültige Angaben werden angenommen, ungültige abgelehnt.
  const postFeedback = (body) =>
    fetch(`${HTTP}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(humanTicket ? { "X-Human-Ticket": humanTicket } : {}),
      },
      body: JSON.stringify(body),
    });
  // Ohne GLITCHTIP_DSN (lokal) ist die Rückmeldung aus; mit DSN wird sie angenommen.
  const { enabled: feedbackEnabled } = await (await fetch(`${HTTP}/api/feedback`)).json();
  assert(typeof feedbackEnabled === "boolean", "Server meldet, ob Rückmeldungen möglich sind");
  const expectedStatus = feedbackEnabled ? 200 : 503;
  assert(
    (await postFeedback({ rating: 2, reason: "Zu wenig Sichtungen", role: "DETECTIVE" })).status ===
      expectedStatus,
    "Rückmeldung mit Sternen und Begründung wird je nach Einrichtung angenommen oder abgelehnt",
  );
  assert(
    (await postFeedback({ rating: 5, role: "X" })).status === expectedStatus,
    "Rückmeldung ohne Begründung verhält sich ebenso",
  );
  assert((await postFeedback({ rating: 6 })).status === 400, "Sternezahl über 5 wird abgelehnt");
  assert(
    (await postFeedback({ rating: 3, reason: "x".repeat(501) })).status === 400,
    "Zu langer Freitext wird abgelehnt",
  );

  console.log(`\n=== Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test-Fehler:", err.message);
  process.exit(1);
});
