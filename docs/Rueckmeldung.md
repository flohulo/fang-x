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

Die Rückmeldungen liegen in einem eigenen Durable Object mit SQLite (`FeedbackStore`). Zum Auslesen
legst du ein Geheimnis an:

```bash
npx wrangler secret put FEEDBACK_ADMIN_TOKEN
```

Danach liefert `GET /api/feedback` mit dem Header `Authorization: Bearer <Token>` die Anzahl je
Sternezahl, den Durchschnitt und die letzten 100 Rückmeldungen als JSON. Ohne gesetztes Token ist
das Auslesen abgeschaltet. Das Senden ist pro IP-Adresse begrenzt (10 pro Minute).
