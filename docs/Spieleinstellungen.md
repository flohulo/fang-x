# Spieleinstellungen

Der Host legt die Regeln in der Spielvorbereitung fest. Änderungen gelten für die kommende Runde
und werden sofort an alle Spielenden übertragen. Während der Runde lassen sich die Regeln nicht
mehr ändern.

Unter **Name der Einstellungen** vergibt der Host einen Namen für die Runde, zum Beispiel
„Samstagsrunde“. Der Name erscheint im Dateinamen, wenn die Einstellungen nach dem Spiel als
JSON-Datei exportiert werden.

## Übersicht

| Einstellung | Standard | Details |
|---|---|---|
| Spieldauer | 30 Minuten | [Spieldauer](Spieldauer.md) |
| Vorsprung für X | 2 Minuten | [Vorsprung für X](Vorsprung-fuer-X.md) |
| Countdown vor dem Start | 10 Sekunden | Zeit zum Bereitmachen nach dem Start |
| Erste Standortmeldung | 3 Minuten | [Reveal-Intervall](Reveal-Intervall.md#erste-standortmeldung) |
| Reveal-Intervall | 3 Minuten | [Reveal-Intervall](Reveal-Intervall.md) |
| Sichtradius | 5 Meter | [Sichtradius](Sichtradius.md) |
| Fangradius | 30 Meter | [Fangradius](Fangradius.md) |
| Spielgebiet | 700 Meter | [Spielgebiet](Spielgebiet.md) |
| Bonusmission für X | aus | [Bonusmission für X](Bonusmission-fuer-X.md) |
| Notfall-Knopf für X | an | [Notfall-Knopf](Notfall-Knopf.md) |

## Weitere Einstellungen

### X sieht Detektive

Legt fest, ob X die Standorte der Detektive sieht: **Immer** (Live-Standort), **nur bei jeder
Sichtung** oder **nie**. Die Detektive sehen X davon unabhängig nur zu den eingestellten
Sichtungen.

### Fangregel

- **Automatischer Fang im Fangradius:** Sobald ein Detektiv nah genug an X ist, endet die Runde.
- **Foto-Fang:** Ein Detektiv meldet den Fang, X bestätigt ihn in der App. Fotos werden nicht
  hochgeladen.

### ÖV-Budget

X kann Bus- und Zug-Haltestellen melden, wenn das Budget aktiviert ist. Jede Meldung informiert
die Detektive und verbraucht einen Halt. Bus- und Zug-Budget lassen sich getrennt festlegen.

### Verkehrsmittel

**Öffentlichen Verkehr für X** und **für Detektive** erlaubt die Nutzung von Bus und Bahn. Ohne
diese Option gilt nur das Gehen als Fortbewegung.

### Live-Standorte der Detektive

Ist **Detektive teilen während des Spiels gegenseitig ihren Live-Standort** aktiv, sehen sich die
Detektive auf der Karte. Das erleichtert die Abstimmung, verrät aber auch X mehr, wenn die Regel
„X sieht Detektive“ aktiv ist.

### Spielfeldrand

Der Spielfeldrand begrenzt das Gebiet um den Startpunkt. Verlässt X das Gebiet, wird der exakte
Standort live geteilt, bis X zurückkehrt. Die Einstellung lässt sich abschalten, wenn ohne feste
Grenze gespielt werden soll.

### Startpunkt

Der Host kann den aktuellen Standort als Startpunkt festlegen. Der Punkt ist der Mittelpunkt des
Spielgebiets und bleibt während der Runde auf der Karte sichtbar. Wird kein Startpunkt gesetzt,
gilt die erste Position von X als Mittelpunkt.

## Empfohlene Presets

| Modus | Spieldauer | Vorsprung | Intervall | Sichtradius | Fangradius | Gebiet |
|---|---|---|---|---|---|---|
| **Klassisch (Default)** | 30 Min. | 2 Min. | 3 Min. | 5 m | 30 m | 700 m |
| **Park-Sprint (schnell)** | 15 Min. | 1 Min. | 2 Min. | 5 m | 25 m | 350 m |
| **City-Stealth (groß)** | 45 Min. | 3 Min. | 4 Min. | 50 m | 35 m | 1200 m |

!!! tip "Erst probieren, dann schärfen"
    Beginnt mit **Klassisch** und passt nur ein oder zwei Werte an. Ein größeres Spielgebiet oder
    ein längerer Vorsprung verändert die Runde stärker als ein paar Minuten mehr Spieldauer.
