# Ping-Trick

| **Einstellung** | Ping-Trick für X: einmal pro Runde eine Sichtung fälschen oder überspringen |
|---|---|
| **Regelparameter** | `reveal.xCanTrick` |
| **Standardwert** | An |

Mit dem Ping-Trick kann X einmal pro Runde die Detektive in die Irre führen. Es gibt **ein
gemeinsames Kontingent**: Entweder ein falscher Ping oder ein übersprungener Ping, nicht beides.

## So funktioniert es

1. X tippt unten in der Kartensteuerung auf **Ping-Trick**.
2. X wählt **Falscher Ping** oder **Ping überspringen**.
3. Der Trick gilt für die **nächste** Sichtung. Bis dahin lässt er sich mit **Zurücknehmen** wieder
   abbrechen, dann ist er nicht verbraucht.

| Trick | Was die Detektive sehen |
|---|---|
| Falscher Ping | Eine normale Sichtung, aber an einem falschen Ort. Er liegt 150 bis 300 Meter von X entfernt, mindestens zwei Sichtradien, und innerhalb des Spielgebiets. In kleinen Spielgebieten ist der Abstand kürzer. |
| Ping überspringen | Keine Sichtung. Der Countdown läuft weiter, die nächste Sichtung kommt im normalen Takt. |

Die Detektive erfahren nicht, ob eine Sichtung falsch war oder ausgefallen ist. Bei einem
übersprungenen Ping zählt die nächste Sichtung als die nächste Nummer, es entsteht keine Lücke.

Findet die App keinen passenden Ort für den falschen Ping, meldet sie die Position echt und sagt X
Bescheid. Der Trick ist dann nicht verbraucht.

## Für wen ist das gedacht?

Der Trick ist ein Spannungselement für Gruppen, die X etwas mehr Möglichkeiten geben wollen. Wer ein
reines Verstecken ohne Täuschung möchte, schaltet ihn in den [Spieleinstellungen](Spieleinstellungen.md)
aus. Dann lehnt der Server den Trick ab.

!!! tip ":material-scale-balance: Gleichgewicht"
    Zusammen mit einem hohen Jitter (siehe [Sichtradius](Sichtradius.md)) wird es für Detektive sehr
    schwer. Nutze nur eins von beidem, wenn die Gruppe klein ist.
