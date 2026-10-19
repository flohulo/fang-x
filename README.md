# Fang X

Open-Source-GPS-Fangspiel für draussen: Eine Person ist **X** und läuft weg, alle anderen sind
**Detektive** und bekommen in festen Abständen eine ungefähre Sichtung. Wer X im Fangradius
erreicht, gewinnt.

Kein Konto, keine Datenbank mit Standortverläufen: Positionen werden nur während eines
laufenden Spiels übertragen und danach verworfen.

## Stack

| Paket | Inhalt |
|---|---|
| `shared/` | Regelwerk, Protokolltypen, Geo-Mathematik (Haversine, Kreis-Polygon, Jitter) |
| `server/` | Cloudflare Worker + Durable Objects `GameRoom` (Spiel-Engine) und `RateLimiter` |
| `client/` | Vite + React + MapLibre GL, installierbar als PWA |

Das Spiel läuft komplett in der Durable Object: Phasen, Reveals, Fang-Erkennung und die
Live-Share-Strafe, wenn X das Spielgebiet verlässt.

## Lokal starten

```bash
npm ci                        # Lockfile-basiert; verlinkt shared/ in die Workspaces
npm run build                 # baut client/dist inkl. Service Worker und Manifest
cd server && npx wrangler dev --ip 0.0.0.0 --port 3000
```

`wrangler dev` liefert API, WebSocket-Route und die gebauten Assets von **einer** Origin
(`http://localhost:3000`) — kein Vite-Proxy, kein CORS. Aus `server/` starten, damit
`wrangler.toml` (Assets-Pfad `../client/dist`) gefunden wird. `--ip 0.0.0.0` ist nötig,
sobald der Server von außerhalb des eigenen Rechners erreichbar sein soll (Container, VM,
Handy im WLAN); ohne die Angabe lauscht er nur auf `127.0.0.1`.

Die installierbare PWA zeigt ihre Release-Version auf der Startseite. Ein geöffneter Client
prüft alle fünf Minuten auf einen neuen Service Worker; bei einer neuen Version übernimmt
`autoUpdate` das Update automatisch und Workbox entfernt nicht mehr benötigte Precaches.
Das Spiel selbst benötigt weiterhin eine Internetverbindung.

**Im Hintergrund starten** (überlebt das Schließen des Terminals):

```bash
cd server
setsid nohup npx wrangler dev --ip 0.0.0.0 --port 3000 > ../preview.log 2>&1 < /dev/null &
echo $! > ../preview.pid                                 # PID merken
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/   # wartet auf 200
kill "$(cat ../preview.pid)"                             # beenden
```

Aufräumen und Prüfen:

- Der lokale Zustand der Durable Objects (Spielräume, Ratenbegrenzung) liegt unter
  `server/.wrangler/state` — löschen, um mit leerer Datenbank zu beginnen.
- Beendet `kill` den Server nicht, zusätzlich die Prozessgruppe beenden: `kill -TERM -<PID>`.
- Assets werden aus `client/dist` gelesen; nach Client-Änderungen neu bauen, sonst läuft
  die alte Version.

Weitere Skripte:

```bash
npm run typecheck        # alle Workspaces
npm run dev:client       # Vite-Dev-Server mit HMR (API dann separat auf 8787)
npm run test:integration # kompletter Spielablauf + Reconnect über WebSockets
```

Der Integrationstest erwartet den Server auf Port 8787:

```bash
cd server && npx wrangler dev --port 8787 &
cd .. && npm run test:integration    # 18/18
```

## Spielablauf

1. Host legt ein Spiel an und erhält einen 6-stelligen Code (Einladungslink `/?code=ABC234`).
2. Mitspieler treten bei und wählen ihre Rolle (X oder Detektiv).
3. Der Host stellt Dauer, Vorsprung, Reveal-Intervall, Sicht-, Fang- und Gebietsradius ein.
4. Phasen: `LOBBY → COUNTDOWN → HEADSTART → RUNNING → ENDED`.
5. Detektive erhalten periodische Sichtungen (FIXED/DECREASING/RANDOM, optional mit Jitter).
6. X gewinnt bei Zeitablauf, Detektive gewinnen im Fangradius.

Optional kann der Host eine Bonusmission aktivieren: X wählt einen sicheren, öffentlichen
Zielpunkt im Spielgebiet. Erreicht X den Punkt innerhalb von 50 m, wird die nächste Sichtung
einmalig um zwei Minuten verschoben. Der Zielpunkt bleibt geheim und wird nicht dauerhaft
gespeichert; nach einem Serverneustart kann X ein aktives Ziel neu setzen.

## Verbindungsabbrüche und Neustarts

- **Reconnect:** Ein Reload oder Funkloch beendet das Spiel nicht. Die Spieler-ID liegt im
  Browser, der Client verbindet sich mit wachsendem Abstand neu (bis 10 s) und übernimmt
  automatisch denselben Platz im Raum.
- **Wiederaufnahme:** Nach einem Reload steigt die App über den gespeicherten Spiel-Code
  wieder ein — inklusive Phase, Restzeit und bereits erfolgter Sichtungen.
- **Kulanzfristen:** In der Lobby 30 s, im Countdown 90 s, im Spiel 120 s (X) bzw. 300 s
  (Detektive). Erst danach wird der Platz freigegeben; X verliert das Spiel, wenn die Frist
  während einer Runde abläuft.
- **Persistenz:** Regeln, Spieler, Phase und Zeitpunkte liegen im Storage der Durable Object,
  alle zeitgesteuerten Schritte laufen über Durable-Object-Alarms. Ein Neustart oder eine
  Eviction der Instanz setzt das Spiel korrekt fort.
- **Bewusst nicht persistiert:** Standorte. Nach einem Neustart schickt jedes Gerät beim
  nächsten GPS-Update wieder eine Position (Client-Intervall: 15 s). Auch ein aktiver
  Bonusmissions-Zielpunkt wird nicht persistiert.

## Karte

Kartenkacheln kommen von [OpenFreeMap](https://openfreemap.org/) (freie Vektor-Kacheln auf
OpenStreetMap-Basis, ohne API-Key, kommerzielle Nutzung erlaubt). Der Stil liefert keine
Attribution mit, deshalb steht die Nennung (OpenFreeMap, OpenMapTiles, OpenStreetMap) fest
im Spielbildschirm.

## Rechtliches

Der Client enthält zwei statische Seiten:

| Pfad | Inhalt |
|---|---|
| `/impressum` | Angaben gemäß § 5 DDG, Verantwortlichkeit nach § 18 Abs. 2 MStV, Haftung, Lizenzhinweise |
| `/datenschutz` | Verantwortlicher, Hosting (Cloudflare), verarbeitete Daten, Rechtsgrundlagen, Speicherdauer, Betroffenenrechte |

Impressum, Datenschutzerklärung und Betreiberangaben stehen gemeinsam in
[`client/src/legal.tsx`](client/src/legal.tsx). Ersetze dort die Angaben in `LEGAL` und passe
bei Bedarf direkt in derselben Datei die beiden Texte an. Dafür gibt es keine `.env`-Datei
und keine Build- oder GitHub-Variablen. Da das Repository öffentlich ist, sind auch die
Betreiberangaben im Quellcode öffentlich. Solange Pflichtangaben Platzhalter sind, zeigen die
Rechtsseiten einen deutlichen Hinweis.

Die Texte sind eine sorgfältige Vorlage, keine Rechtsberatung: Wer die Instanz betreibt, ist
für die Angaben verantwortlich und sollte sie prüfen (lassen).

## Deployment

```bash
npm ci && npm run build     # Client-Assets müssen aktuell sein
cd server
npx wrangler login          # einmalig lokal anmelden
npx wrangler deploy
```

- `wrangler.toml` enthält die Bindings `GAME_ROOM`, `RATE_LIMIT` und `ASSETS` sowie die
  Migrationen `v1`/`v2` (`new_sqlite_classes`). Migrationen laufen beim Deploy automatisch.
- `[observability] enabled = true` schaltet Logs und Metriken im Dashboard frei.
- Eigene Domain: Route bzw. Custom Domain in `wrangler.toml` eintragen (Vorlage kommentiert).
- Ratenbegrenzung pro IP: 10 neue Spiele pro 10 Minuten, 60 Code-Prüfungen pro Minute; dazu
  maximal 24 Spieler pro Raum. Zähler liegen im `RateLimiter`-Objekt und setzen sich bei
  einem Neustart zurück.

### Workflows:

- **PR-Titelprüfung** validiert PR-Titel als Conventional Commits, damit Release Please die
  Änderung korrekt einordnen kann.
- **CI** führt bei jedem PR und jeder Aktualisierung Typecheck, Build und Integrationstest aus.
- **PR Preview** deployed PRs aus diesem Repository als eigenen öffentlichen Worker unter
  `https://fang-x-pr-<nummer>.<subdomain>.workers.dev`, postet den Link in den PR und löscht
  den Worker beim Schließen oder Mergen. Fork-PRs erhalten wegen fehlender Cloudflare-
  Zugangsdaten nur CI, keine Live-Vorschau.
- **Release Please** erstellt bzw. aktualisiert nach Conventional Commits auf `main` einen PR
  für Version und Changelog. Beispiele: `feat: neue Bonusmission` (Minor), `fix: Fangradius`
  (Patch), `feat!: neues Spielprotokoll` (Major). Erst wenn der Release-PR gemergt wird,
  erscheint das GitHub-Release; danach testet und deployed der Workflow den `main`-Stand.
  PRs sollten per Squash Merge mit dem Conventional-Commit-Titel als Merge-Commit landen.

## Bekannte Grenzen

- Das Spiel hat keine Moderation, keine Meldestelle und keine Altersverifikation.
- Es gibt genau eine X-Rolle pro Raum, auch wenn mehrere Spieler „X“ wählen: Die
  Live-Share-Strafe kennt nur ein gemeinsames Flag.
- Standortbetrug auf Geräteebene (Fake-GPS) wird nicht erkannt.
- Ratenbegrenzung und Kulanzfristen sind In-Memory-Zustand des jeweiligen Objekts; sie
  überleben eine Eviction nicht vollständig.
- Kein Replay, keine Statistiken, keine Historie.

## Lizenz

AGPL-3.0-only, siehe [LICENSE](LICENSE). Karten-Daten: © OpenStreetMap-Mitwirkende.
