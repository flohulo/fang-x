# Reveal-Intervall

| **Einstellung** | Reveal-Intervall (Minuten) |
|---|---|
| **Regelparameter** | `reveal.intervalMinutes` |
| **Standardwert** | 3 Minuten |

Das Reveal-Intervall bestimmt, wie oft der Aufenthaltsort von X automatisch an die Detektive
gemeldet wird. Eine solche Standortmeldung zeigt den Detektiven die letzte Sichtung auf der Karte.

## Welchen Wert sollte ich wählen?

- **1–2 Minuten** machen die Jagd direkter und helfen den Detektiven, X schneller aufzuspüren.
- **3 Minuten** sind ein ausgewogener Startwert.
- **4–5 Minuten** geben X mehr Gelegenheit zu Richtungswechseln und falschen Fährten.

Unabhängig vom Intervall kann das Verlassen des Spielgebiets eine separate Live-Standortfreigabe
auslösen.

## Erste Standortmeldung

| **Einstellung** | Erste Standortmeldung (Minuten) |
|---|---|
| **Regelparameter** | `reveal.firstRevealAfterMinutes` |
| **Standardwert** | 3 Minuten |

Die erste Standortmeldung folgt nach dem Ende des Vorsprungs. Mit einem Wert von **0** wird X
sofort nach dem Vorsprung zum ersten Mal gemeldet; danach gilt das eingestellte Intervall.

Ein späterer erster Ping gibt X Zeit, sich zu lösen, ohne dass die Detektive sofort einen
Anhaltspunkt haben. Ein früher erster Ping bringt die Jagd schneller in Gang.
