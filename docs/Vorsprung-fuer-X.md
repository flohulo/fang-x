# Vorsprung für X

| **Einstellung** | Vorsprung (Minuten) |
|---|---|
| **Regelparameter** | `game.headStartMinutes` |
| **Standardwert** | 2 Minuten |

Der Vorsprung ist die Zeit, die X nach dem Start allein erhält. So kann X Abstand gewinnen und
sich eine Route überlegen. Die Detektive starten am vereinbarten Treffpunkt; standardmäßig dürfen
sie sich in dieser Zeit schon bewegen, nur X' Standort wird noch nicht gemeldet.

## Welchen Wert sollte ich wählen?

- **0 Minuten** passt, wenn die Spieler bereits getrennt starten oder direkt loslegen möchten.
- **2–5 Minuten** sind ein guter Ausgangspunkt, wenn alle am selben Treffpunkt starten.
- Bei einem großen Spielgebiet kann ein längerer Vorsprung sinnvoll sein. Achtet darauf, dass X
  dadurch nicht zu schwer zu finden wird.

## Detektive warten während des Vorsprungs

Mit dieser Option senden die Detektive während des Vorsprungs noch keinen Standort. Ohne die
Option können sie sich schon bewegen und ihre Position teilen, solange X noch Vorsprung hat.

!!! info ":material-timer-sand: Reihenfolge"
    Der Vorsprung zählt vor der [Spieldauer](Spieldauer.md). Erst wenn er endet, beginnt die Zeit
    bis zur ersten [Standortmeldung](Reveal-Intervall.md#erste-standortmeldung).
