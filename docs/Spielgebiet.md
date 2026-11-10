# Spielgebiet

| **Einstellung** | Spielgebiet (Radius, Meter) |
|---|---|
| **Regelparameter** | `map.playAreaRadiusMeters` |
| **Standardwert** | 700 Meter |

Das Spielgebiet ist standardmäßig ein Kreis um den gemeinsamen Startpunkt. Sein Radius bestimmt,
wie weit sich X von diesem Punkt entfernen darf.

## Spielfeld auf der Karte einzeichnen

Statt des Kreises kann der Host in der Lobby über „Spielfeld auf der Karte einzeichnen“ eine
eigene Form festlegen: Auf die Karte tippen setzt die Eckpunkte (3 bis 50), „Letzter Punkt zurück“
und „Alle löschen“ korrigieren, „Übernehmen“ speichert das Feld. Ein gezeichnetes Spielfeld ersetzt
den Kreis; der Radius wird dann nicht mehr verwendet. Mit „Wieder Kreis verwenden“ geht es zurück
zum Radius. Das Spielfeld lässt sich nur in der Lobby ändern.

## Wenn X das Gebiet verlässt

Ist die entsprechende Regel aktiv, wird der exakte Live-Standort von X an die Detektive
übertragen, solange X außerhalb des Gebiets bleibt. Beim Zurückkehren endet diese Live-Freigabe.
X sieht in der App einen Hinweis, solange der Standort geteilt wird.

## Welchen Wert sollte ich wählen?

Wählt einen Radius, der zum Gelände und zur Gruppe passt. Das Gebiet sollte öffentliche,
sichere Wege umfassen und keine gefährlichen oder nicht zugänglichen Bereiche voraussetzen.
Legt den [Startpunkt](Spieleinstellungen.md#startpunkt) gemeinsam fest und besprecht die Grenzen
vor dem Start.

Der Spielfeldrand lässt sich in den Einstellungen auch ganz abschalten, wenn ohne feste Grenze
gespielt werden soll.
