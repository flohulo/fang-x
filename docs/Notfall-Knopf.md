# Notfall-Knopf

| **Einstellung** | Notfall-Knopf für X: Spiel aufgeben und Standort teilen |
|---|---|
| **Regelparameter** | `catch.xCanSurrender` |
| **Standardwert** | An |

Der Notfall-Knopf ist für X während des Vorsprungs und der laufenden Runde unten in der
Kartensteuerung sichtbar. Er beendet die Runde sofort und teilt X' exakten Standort mit den
Detektiven.

## Ablauf

1. X tippt auf **Notfall**.
2. Die App fragt nach: **„Notfall: Spiel aufgeben?“**
3. Mit **Aufgeben** endet die Runde. **Weiterspielen** oder Escape bricht ab.

Nach der Bestätigung gewinnen die Detektive. X' Standort zum Zeitpunkt des Aufgebens wird
einmalig an die Detektive übertragen. Es entsteht kein Standortverlauf.

## Was die Detektive sehen

- Eine Meldung **„X hat aufgegeben“** auf der Ergebnisansicht.
- Die Karte mit dem exakten Standort von X.
- Einen Link, um den Punkt in OpenStreetMap zu öffnen.
- Bei aktiviertem Alarm zusätzlich eine Systembenachrichtigung.

War kein aktueller Standort verfügbar, endet die Runde trotzdem. Der Hinweis nennt dann, dass kein
Standort geteilt werden konnte.

## Wann ist der Knopf sinnvoll?

- Jemand muss die Runde aus gesundheitlichen oder Sicherheitsgründen abbrechen.
- Die Gruppe möchte die Jagd fair beenden, statt X weiterlaufen zu lassen.
- X möchte den Detektiven den eigenen Standort zeigen, damit die Gruppe wieder zusammenfindet.

## Abschalten

Der Host kann den Notfall-Knopf in den [Spieleinstellungen](Spieleinstellungen.md) ausschalten.
Dann wird ein Aufgeben vom Server abgelehnt und die Runde läuft weiter. Für Runden mit Kindern
oder unübersichtlichem Gelände ist der Knopf als Sicherheitsnetz empfehlenswert.
