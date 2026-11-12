# Alle sicher und Funkstille

Zwei Hilfen sorgen dafür, dass niemand unterwegs verloren geht. Beide sind immer aktiv und
brauchen keine Einstellung.

## Funkstille-Warnung

Kommt von einer verbundenen Person eine Weile keine Position mehr an, erscheint bei **allen** ein
Hinweis mit dem Namen. Die betroffene Person sieht einen Hinweis, GPS und Verbindung zu prüfen.

Die Schwelle richtet sich nach dem [Reveal-Intervall](Reveal-Intervall.md):

| Reveal-Zeitplan | Warnung nach |
|---|---|
| Festes Intervall | zwei Intervallen, mindestens 5 und höchstens 30 Minuten |
| Abnehmend | zwei Intervallen des kleinsten Werts, mindestens 5 und höchstens 30 Minuten |
| Zufällig | 10 Minuten |

Die Warnung kommt pro Funkstille nur einmal. Sobald wieder eine Position ankommt, ist die Person
wieder im Spiel und kann bei einer neuen Funkstille erneut gemeldet werden. Gezählt wird nur, ob
Positionen ankommen, die Orte selbst werden dafür nicht gespeichert. Getrennte Verbindungen werden
nicht gemeldet, sie stehen bereits als getrennt in der Spielerliste.

## Alle sicher?

Nach dem Spielende fragt die App auf dem Ergebnis: **Alle sicher?** Jede Person tippt auf
**Ich bin sicher**. Alle sehen live, wer bestätigt hat und wer noch offen ist. So merkt die Gruppe
sofort, wenn sich jemand nicht meldet, und kann nachfragen, bevor alle nach Hause gehen.

Die Bestätigungen gelten nur für die beendete Runde und werden beim nächsten Start gelöscht.
