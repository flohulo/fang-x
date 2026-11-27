# Rückmeldung zur Runde

Nach jeder Runde kannst du der App sagen, wie sie dir gefallen hat. Die Rückmeldung ist freiwillig
und braucht keine Einstellung.

## Ablauf

1. Auf dem Ergebnis-Bildschirm vergibst du 1 bis 5 Sterne.
2. Bei 1 bis 3 Sternen fragt die App, was dir nicht gefallen hat und was besser werden soll. Bei 4
   oder 5 Sternen fragt sie, was dir besonders gut gefallen hat.
3. Du schreibst ein, zwei Sätze (bis 500 Zeichen) und sendest die Rückmeldung ab. Der Text ist
   optional, die Sterne reichen auch. Mit „Überspringen“ blendest du den Bereich aus.

## Datenschutz

Gespeichert werden nur die Sterne, dein Text, deine Rolle in der Runde (X oder Detektiv) und der
Zeitpunkt. **Nicht** gespeichert werden Name, Spiel-Code, IP-Adresse und Standorte. Schreib deshalb
bitte keine persönlichen Daten in den Text.

## Für Betreiber

Jede Rückmeldung geht als Ereignis an GlitchTip, dasselbe Projekt wie die Fehlerberichte (Secret
`GLITCHTIP_DSN`). Sie sind am Tag `kind = round-feedback` zu erkennen und tragen die Tags `rating`
(1 bis 5) und `role`; der Text steht unter „Additional Data“ als `reason`. Rückmeldungen mit gleicher
Sternezahl landen in einem gemeinsamen Eintrag, GlitchTip zählt sie dort mit. Ohne `GLITCHTIP_DSN`
zeigt die App das Rückmeldungsfenster gar nicht erst an. Das Senden ist pro IP-Adresse begrenzt (10 pro Minute).
