# Spielende-Auswertung

Am Ende jeder Runde zeigt die App neben dem Ergebnis eine kurze Auswertung. Sie ist für alle
Spielenden gleich und braucht keine Einstellung.

## Was angezeigt wird

| Kennzahl | Bedeutung |
|---|---|
| Spielzeit | Dauer der laufenden Phase, ohne Countdown und Vorsprung |
| Sichtungen | Wie oft die Position von X gemeldet wurde |
| Knappster Abstand | Der geringste Abstand zwischen X und einem Detektiv während der Runde |
| Am weitesten gelaufen | Wer die längste Strecke zurückgelegt hat |
| Strecke pro Person | Die gelaufene Distanz jeder Person, X ist markiert |

## Datenschutz

Die Auswertung besteht nur aus Summen und einem Extremwert. Der Server addiert beim Eintreffen einer
Position die Strecke zum bisherigen Wert und merkt sich den kleinsten Abstand. Es entsteht
**kein Routenverlauf**, und es werden keine Standorte für die Auswertung gespeichert.

Kleine GPS-Schwankungen unter 5 Metern und Sprünge über 400 Meter zählen nicht mit. Die Strecke ist
deshalb ein Richtwert und keine exakte Messung.

Ist das Spiel beendet, bleibt die Auswertung wie das Ergebnis erhalten, bis der Raum geschlossen
wird. Wer die Seite neu lädt, sieht sie weiterhin.
