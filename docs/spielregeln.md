# Spielregeln-Spezifikation — "Fang X" (Open Source)

> Status: Entwurf v1.1 (2026-10-16, Kernentscheidungen getroffen) · Diese Datei ist die **kanonische Regelquelle** für das Projekt.
> Grundprinzip: **Regeln sind Daten, kein Code.** Jedes Spiel läuft mit einem
> austauschbaren Regelwerk (`ruleset`), das als JSON versioniert, geteilt,
> importiert und in der App editiert werden kann.

---

## 1. Design-Philosophie

Das Original "Fang den X" bietet eine Handvoll fester Einstellungen. Unser Ziel ist das
Gegenteil: **maximale Konfigurierbarkeit ohne Komplexitäts-Overhead**.

1. **Jede Regel ist ein Parameter** mit Typ, Bereich, Default und Klartext-Beschreibung.
   Die UI generiert sich automatisch aus dem Schema (Formular → kein Extra-Aufwand).
2. **Presets statt leerer Seiten.** Wer nicht basteln will, wählt einen fertigen Modus.
3. **Regelwerk = teilbarer Code.** Ein Regelwerk lässt sich als Code/Link teilen
   (wie der Spiel-Code) — Freunde spielen exakt dieselben Regeln.
4. **Sicherheitsgrenzen.** Extremwerte sind erlaubt, aber physikalisch unmögliche Konfigurationen
   (z. B. Fangradius > Sichtradius + Intervall × Max-Geschwindigkeit) werden gewarnt.
5. **Datenminimierung zuerst.** Wir erfassen so wenig wie möglich: kein Login, keine
   E-Mail, keine Konten. Standortverläufe werden nicht gespeichert. Der Spielmittelpunkt
   wird nur bis zum Spielende oder Entfernen des leeren Raums gespeichert; danach wird
   er verworfen. Der Server ist selbst-hostbar.

---

## 2. Grundkonzept

| Konzept | Beschreibung |
|---|---|
| **X** (Flüchtling) | 1..n Spieler. Ziel: die Spieldauer überleben, ohne gefangen zu werden. |
| **Detektive** | 1..n Spieler. Ziel: X innerhalb des Fangradius stellen. |
| **Aufdeckung** | X's Position wird in Intervallen an alle Detektive gemeldet — als Punkt und/oder als unscharfer Kreis (Sichtradius). |
| **Live-Karte** | Alle Spieler sehen dieselbe Karte; Detektive sehen X's letzte Sichtung, X sieht ggf. die Detektive (konfigurierbar). |
| **Spiel-Code** | 6-buchstabiger Code für Matchmaking (z. B. `HWAFRA`), tippfehler­ tolerant. |
| **Runden-Phasen** | `lobby → vorsprung → laufzeit → ende` (+ optional `pause`) |

---

## 3. Parameterkatalog (das Herzstück)

Jeder Parameter: `key` · Typ · Bereich · **Default** · Bedeutung.
JSON-Keys sind englisch (Konvention für Contributors), die UI-Sprache ist ausschließlich Deutsch.

### 3.0 Individuelle Regeln

Alle Regeln sind unabhängig voneinander einstellbar. Es gibt kein festes Profil, das andere
Einstellungen überschreibt.

### 3.1 Spieldauer & Phasen

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `game.durationMinutes` | int | 5–480 | **30** | Gesamtdauer der Laufzeit. |
| `game.headStartMinutes` | int | 0–30 | **2** | Vorsprung: X bewegt sich los, Detektive warten. |
| `game.overtimeEnabled` | bool | — | false | Nach Ablauf läuft die Uhr weiter, bis X gefangen ist. |
| `game.overtimeMaxMinutes` | int | 1–120 | 10 | Obergrenze fürs Nachspiel. |
| `game.countdownSeconds` | int | 0–60 | 10 | Countdown vor Spielstart (Handy hochhalten). |
| `game.pauseAllowed` | bool | — | false | Host kann pausieren (z. B. Regenpause). |
| `game.detectivesWaitDuringHeadStart` | bool | — | false | Detektive senden während des Vorsprungs keinen Standort. |

### 3.2 Sichtbarkeit von X (Kernmechanik)

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `reveal.firstRevealAfterMinutes` | int | 0–60 | **3** | Erste Standortmeldung nach Spielbeginn. |
| `reveal.intervalMinutes` | number | 0.5–30 | **3** | Intervall zwischen Aufdeckungen (fixed-Modus). |
| `reveal.schedule` | enum | `FIXED` / `DECREASING` / `RANDOM` | FIXED | Wie sich das Intervall verhält. |
| `reveal.decreaseStepMinutes` | number | — | 0.5 | Nacheinander-Modus: um wie viel jedes Intervall kürzer wird. |
| `reveal.decreaseFloorMinutes` | number | — | 1 | Untergrenze des Intervalls. |
| `reveal.randomMinMinutes` / `randomMaxMinutes` | number | — | 2 / 5 | Zufalls-Modus: Intervall wird pro Runde gezogen (planen erschweren). |
| `reveal.revealRadiusMeters` | int | 0–5000 | **5** | Radius des aufgedeckten Kreises um X. Default 5 m ≈ exakter Punkt; jederzeit anpassbar (0 = nur Punkt ohne Kreis). |
| `reveal.radiusShrinkEnabled` | bool | — | false | Sichtradius wird über die Zeit kleiner (Spannung steigt). |
| `reveal.radiusShrinkStepMeters` | int | — | 100 | Verkleinerung pro Aufdeckung. |
| `reveal.radiusFloorMeters` | int | 0–500 | 5 | Kleinster Sichtradius beim Schrumpfen — nie größer als `revealRadiusMeters`. |
| `reveal.showExactPoint` | bool | — | true | Zusätzlich zum Kreis den exakten letzten Punkt zeigen. |
| `reveal.jitterMeters` | int | 0–500 | 0 | X's gemeldeter Punkt wird um bis zu ±N m verstellt (täuscht Detektive). |
| `reveal.showTrail` | enum | `NONE` / `LAST3` / `FULL` | LAST3 | Frühere Sichtungen bleiben als Spur sichtbar. |
| `reveal.xSeesDetectives` | enum | `ALWAYS` / `ON_REVEAL` / `NEVER` | ON_REVEAL | Was X über Detektive weiß. |
| `reveal.detectivesSeesXHistory` | bool | — | true | Verlauf aller bisherigen Sichtungen sichtbar. |

> **Hinweis zum Screenshot:** Die 700 Meter aus dem Original sind der **Spielradius**
> (die Fläche, auf der gespielt wird) — siehe `map.playAreaRadiusMeters` in 3.8.
> Der Sichtradius der Aufdeckung ist ein separater Parameter; der exakte Wert im
> Original ist nicht öffentlich dokumentiert; Default ist **5 m** (quasi exakter Punkt)
> und jederzeit im Regelwerk anpassbar.

Während der Laufzeit zeigt die App einen Fortschrittsbalken bis zur nächsten Sichtung. Im
`RANDOM`-Modus bleibt er unbestimmt, damit der gezogene Zeitpunkt nicht vorzeitig verraten wird.

### 3.3 Fanglogik

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `catch.method` | enum | `RADIUS` / `PHOTO_CONFIRMATION` | `RADIUS` | Automatischer Fang im Radius oder Fangmeldung per Foto mit Bestätigung durch X. Fotos werden nicht in die App hochgeladen. |
| `catch.radiusMeters` | int | 5–1000 | **30** | Abstand, bei dem X als gefangen gilt. |
| `catch.confirmSeconds` | int | 0–300 | **0** | X muss so lange im Radius *bleiben* (verhindert zufälliges Vorbeilaufen). |
| `catch.teamCatchRequired` | int | 1–10 | 1 | Wie viele Detektive gleichzeitig im Radius sein müssen. |
| `catch.anyDetectiveWins` | bool | — | true | Erster Fang gewinnt für alle Detektive (sonst: nur fürs Team). |
| `catch.xCanSurrender` | bool | — | false | X kann aufgeben. |

### 3.4 Bonusmission

| Key | Typ | Default | Bedeutung |
|---|---|---|---|
| `objective.enabled` | bool | false | X kann während der Runde ein geheimes Bonusziel setzen. Erreicht ein X-Spieler den gewählten Punkt innerhalb von 50 m, wird die nächste Sichtung einmalig um 2 Minuten verschoben. |

X setzt das Ziel auf der Karte. Es muss innerhalb des Spielgebiets und mindestens 25–100 m vom aktuellen X-Standort entfernt liegen (abhängig von der Gebietsgröße). X sollte nur einen sicheren, öffentlichen und erreichbaren Ort wählen. Zielkoordinaten werden nicht in der Durable-Object-Persistenz gespeichert; nach einem Serverneustart wird ein noch offenes Ziel erneut wählbar.

### 3.5 Bewegung & Verkehrsmittel

Das Original erlaubt Wahl zwischen „zu Fuß" und „Bus & Bahn" — wir parametrisieren es:

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `movement.transportModes` | list | `WALK` / `BIKE` / `CAR` / `TRANSIT` | `["WALK"]` | Erlaubte Fortbewegungsarten für Detektive. |
| `movement.xTransportModes` | list | dasselbe | `["WALK"]` | Erlaubte Fortbewegungsarten für X (oftrestriktiver!). |
| `movement.maxSpeedKmh.<MODE>` | number | je Modus | WALK 6, BIKE 25, CAR 130, TRANSIT 100 | Anti-Cheat: maximale plausible Geschwindigkeit. |
| `movement.speedCheckGraceSeconds` | int | 0–120 | 30 | Toleranz bei Messfehlern/GPS-Sprüngen. |
| `movement.jumpDetectionMeters` | int | 0–5000 | 300 | Einzelsprung über N m = GPS-Fehler oder Schummeln → Warnung. |
| `movement.minUpdateSeconds` | int | 5–300 | 15 | Wie oft Client Position nachsendet (nur während des Spiels). |
| `movement.detectivesShareLiveLocation` | bool | — | false | Detektive sehen während des Spiels gegenseitig ihren Live-Standort. |
| `movement.xTransitBudget.enabled` | bool | — | false | Aktiviert ein manuelles ÖV-Budget für X, gezählt pro Haltestelle. X meldet Haltestellen im Spiel über ein Dialogfenster (Bus/Zug und Anzahl); die Detektive werden über jede Meldung informiert. |
| `movement.xTransitBudget.busStops` / `trainStops` | int | 0+ | 10 / 2 | Anzahl erlaubter Bus- und Zughalte, wenn das Budget aktiviert ist. |

### 3.6 Rollen, Teams & Spielervariationen

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `roles.xCount` | int | 1–5 | **1** | Anzahl X-Spieler (Original erlaubt mehrere X). |
| `roles.xCountAuto` | bool | — | true | X-Anzahl aus Mitspielerzahl ableiten (1 X je 4 Detektive). |
| `roles.detectiveTeamCount` | int | 1–5 | 1 | Detektive in mehreren Teams, die gegeneinander antreten (zählt, wer X zuerst stellt). |
| `roles.rolesHiddenUntilCatch` | bool | — | false | Rollen sind geheim (jeder könnte X sein — Bluff-Variante). |
| `roles.spectatorMode` | bool | — | true | Mitspieler ohne Rolle können zuschauen. |

### 3.7 Sonderoptionen (Scotland-Yard-inspiriert, optional)

Alle Specials sind standardmäßig **aus** (`0`/`false`) und lassen sich im Regelwerk einzeln aktivieren — reines Add-on für Experimentierfreude:

| Key | Typ | Default | Bedeutung |
|---|---|---|---|
| `specials.teleportCount` | int 0–5 | 0 | X kann sich pro Spiel N-mal an einen beliebigen Punkt teleportieren (mit Abklingzeit). |
| `specials.teleportCooldownMinutes` | number | 10 | Abklingzeit zwischen Teleports. |
| `specials.cloakCount` | int 0–5 | 0 | X überspringt N Aufdeckungen („Tarnung"). |
| `specials.decoyCount` | int 0–5 | 0 | X setzt N-mal eine falsche Position als Köder. |
| `specials.barrierRadiusMeters` | int 0–500 | 0 | Detektive kommen X's Position nie näher als dieser Radius (Schutzschild — X gewinnt durchs Überleben mit Abstand). |
| `specials.poiChainsEnabled` | bool | false | X muss Zwischenziele (Points of Interest) anstecken wie in Scotland Yard. |

### 3.8 Siegbedingungen

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `win.xWinsBySurvival` | bool | — | true | Klassisch: X gewinnt mit Zeitablauf. |
| `win.drawEnabled` | bool | — | false | Unentschieden möglich (z. B. wenn X in letzter Sekunde in Fangradius läuft). |
| `win.suddenDeathEnabled` | bool | — | false | Letzte Phase: Intervall halbiert sich, Fangradius wächst (finale Jagd). |

### 3.9 Karte, Raum & Datenschutz

| Key | Typ | Bereich | Default | Bedeutung |
|---|---|---|---|---|
| `map.centerLat` / `map.centerLng` | number | — | Host-Position | Zentrum des Spiels. |
| `map.playAreaRadiusMeters` | int | 100–20000 | **700** | Spielradius: Die Fläche, auf der gespielt wird (entspricht dem aufgedeckten Kreis im Screenshot). |
| `map.startLocation` | LatLng/null | — | null | Optionaler Startpunkt des Spiels; wird nur während der laufenden Runde gespeichert. |
| `map.outOfBoundsEnabled` | bool | — | **true** | Randzaun aktiv? X darf das Gebiet nicht verlassen. |
| `map.outOfBoundsGraceSeconds` | int | 0–120 | 15 | Toleranz am Rand (GPS-Genauigkeit) — erst danach greift die Regel. |
| `map.outOfBoundsPenalty` | enum | `LIVE_SHARE` / `WARNING` / `TELEPORT_BACK` / `INSTANT_LOSS` | **LIVE_SHARE** | Folge bei Verlassen: Bei `LIVE_SHARE` wird X's Live-Standort solange permanent an alle Detektive gestreamt, wie er außerhalb ist — Flucht aus dem Gebiet bestraft sich selbst. |
| `map.detectiveOutOfBoundsPenalty` | enum | `NONE` / `WARNING` / `TELEPORT_BACK` | NONE | Gelten Detektiven auch Grenzen? Default: Nein, die dürfen überallhin. |
| `map.tileStyle` | enum | `STREET` / `OUTDOOR` / `GRAY` | OUTDOOR | Kartenstil (OSM-basiert). |
| `privacy.locationRetention` | enum | `DELETE_AFTER_GAME` / `KEEP_24H` / `KEEP_7D` | **DELETE_AFTER_GAME** | Wie lange Standortpunkte auf dem Server bleiben. Default: sofort nach Spielende löschen. |
| `privacy.replayEnabled` | bool | — | **false** | Replay standardmäßig AUS, da es die Route cacht. Wird nur aktiv, wenn alle Spieler zustimmen. |
| `privacy.collectPlayerName` | bool | — | **false** | Namen sind Optional/Alias. Kein Account, keine E-Mail, keine Geräte-ID. |
| `privacy.minPlayersForGame` | int | 2–10 | 2 | Mindest-Spielerzahl. |

---

## 4. Beispiel-Ruleset (JSON)

```json
{
  "schemaVersion": 1,
  "name": "Klassisch (Original-treu)",
  "game": { "durationMinutes": 30, "headStartMinutes": 2, "overtimeEnabled": false },
  "reveal": {
    "firstRevealAfterMinutes": 3,
    "intervalMinutes": 3,
    "schedule": "FIXED",
    "revealRadiusMeters": 5,
    "showExactPoint": true,
    "showTrail": "LAST3",
    "xSeesDetectives": "ON_REVEAL"
  },
  "catch": { "radiusMeters": 30, "confirmSeconds": 0, "teamCatchRequired": 1 },
  "movement": { "transportModes": ["WALK"], "xTransportModes": ["WALK"] },
  "roles": { "xCount": 1, "xCountAuto": true },
  "win": { "xWinsBySurvival": true },
  "map": {
    "playAreaRadiusMeters": 700,
    "outOfBoundsEnabled": true,
    "outOfBoundsPenalty": "LIVE_SHARE",
    "tileStyle": "OUTDOOR"
  },
  "privacy": {
    "locationRetention": "DELETE_AFTER_GAME",
    "replayEnabled": false,
    "collectPlayerName": false
  }
}
```

---

## 5. Presets (Startpakete)

| Preset | Kurzbeschreibung | Schlüsselwerte |
|---|---|---|
| **Klassisch** | Original-treu, zu Fuß | 30 Min · alle 3 Min · Sicht 5 m · Spielgebiet ⌀ 700 m · mehrere X (auto) · Fang 30 m · Flucht = Live-Tracking |
| **Blitz** | Kurze Runde in der Mittagspause | 15 Min · alle 90 s · Sicht 400 m · Fang 25 m |
| **Großraum & Auto** | Spielfeld >10 km, X mit Auto | 60 Min · alle 5 Min · Sicht 2 km · CAR erlaubt · Fang 50 m · Speed-Cheats aktiv |
| **Stealth** | X ist Profi: planen schwer machen | RANDOM-Intervalle 2–5 Min · jitter 150 m · Trail NONE · Tarnung ×2 |
| **Großstadt/ÖPNV** | U-Bahn & Bus nutzen | TRANSIT erlaubt · Intervalle 4 Min · Sicht 1 km |
| **Kinder** | Einfach & großzügig | 20 Min · Sicht 300 m · Fang 100 m · Barrier 50 m (X bleibt sicherer) |
| **Scotland Yard Live** | Items-Modus | Teleport ×3 · Köder ×2 · Tarnung ×1 |
| **Turnier** | Wettbewerb über mehrere Runden | speedCheck strikt · Replay-Pflicht · Rangfolge über Win/Lose je Runde |

Presets sind selbst nur Rulesets — Nutzer können sie kopieren, verändern, als eigenen
Code teilen. Neue Presets landen per PR im Repo.

---

## 6. Regelwerk-Teilen (Konzept)

- Jedes Ruleset erhält beim Speichern einen **Regel-Code** (ähnlich Spiel-Code, z. B. `R-7K2M9`), verweisend auf eine versionierte Server-Instanz **oder** direkt als kompakter URL-Link (`/#r=<base64url>`).
- Import per QR-Code möglich (praktisch für Treffpunkt-Aushang).
- `schemaVersion` erlaubt Migrations: alte geteilte Regeln laufen auch mit neuer App-Version weiter.

---

## 7. Fairness-Regeln (hartkodiert, nicht konfigurierbar)

Damit kein Regelwerk missbraucht wird:

1. Der Server ist autoritative Instanz für Fang-Ereignisse (Client kann Fang nicht fälschen).
2. X's Standort wird **nur** im Aufdeck-Intervall an Clients gesendet — nie kontinuierlich.
3. Positions-Updates werden erst nach Spielstart angefragt und danach verworfen.
4. Speed-Cheat-Warnungen sind im Multiplayer-Standard sichtbar (aber abschaltbar für entspannte Runden).

**Datenminimierung ist hartkodiert (nicht konfigurierbar):**

5. **Kein Konto, keine E-Mail, keine Geräte-ID, keine Analytics.** Spieler treten mit
   einem frei gewählten Alias + Spiel-Code bei. Es wird nichts Drittes erhoben.
6. **Standort lebt nur im Spiel.** Positionen liegen während der Laufzeit im Arbeitsspeicher
   des Spiel-Knotens und werden beim Ende sofort verworfen. Dauerhaft gespeichert wird
   nur der Spielzustand (Konfiguration, Ergebnis), nie die Standort-Historie — es sei denn,
   der Host schaltet `replayEnabled` bewusst ein **und** alle Spieler stimmen zu.
7. **Karte ohne Tracking.** Es werden OpenStreetMap-Tiles genutzt (kein Google/Mapbox-Konto,
   keine API-Keys, keine Nutzer-Profiling-Weitergabe an Kartenanbieter).
8. **Selbst-hostbar.** Wer will, betreibt den Server selbst — dann verlassen Standortdaten
   nie das eigene Netz. Kein Vendor-Lock-in, keine teuren SDKs.

---

## 8. Getroffene Entscheidungen (Stand 2026-10-16)

Die offenen Fragen sind entschieden:

1. **Sichtradius**: Default **5 m** (quasi exakter Punkt), aber weiterhin frei im Regelwerk anpassbar (0–5000 m).
2. **Mehrere X**: ja — `roles.xCountAuto = true` bleibt Default (1 X je 4 Detektive), auch im Klassisch-Preset.
3. **Items (Specials)**: ja, alle aber standardmäßig deaktivierbar (Default 0/false).
4. **Punkte-Modus**: nein — Siegbedingung bleibt Win/Lose (+ optional Unentschieden und Sudden Death).
5. **Sprache**: ausschließlich Deutsch für die UI. JSON-Keys bleiben englisch für Contributors.
