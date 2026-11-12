# Detektiv-Funk

| **Funktion** | Sprechfunk per Knopfdruck, nur zwischen Detektiven |
|---|---|
| **Verfügbar** | Während Vorsprung und laufender Runde |
| **Einstellung** | Keine, jede Person schaltet den Funk selbst ein |

Mit dem Funk sprechen die Detektive miteinander, ohne dass X etwas hört. Der Chat bleibt davon
unberührt: Er ist weiterhin für alle sichtbar.

## So funktioniert es

1. Tippe auf der Karte auf das **Mikrofon-Symbol** neben dem Chat.
2. Tippe auf **Funk einschalten** und erlaube den Zugriff auf das Mikrofon.
3. Halte den großen Knopf gedrückt, solange du sprechen willst. Beim Loslassen hörst du wieder zu.
4. Wer gerade spricht, wird den anderen angezeigt.

Der Funk ist nur für Detektive sichtbar. X sieht weder das Symbol noch hört X etwas. Bei
Spielende wird der Funk automatisch beendet.

## Datenschutz

- Der Ton läuft direkt zwischen den Geräten der Detektive (WebRTC) und wird nicht aufgezeichnet
  und nicht über den Spielserver geleitet. Der Server vermittelt nur den Verbindungsaufbau.
- Beim Verbindungsaufbau sehen sich die beteiligten Geräte gegenseitig ihre IP-Adressen. Außerdem
  fragen die Geräte einen STUN-Server nach ihrer öffentlichen Adresse. Standardmäßig ist das
  `stun.cloudflare.com`.
- Das Mikrofon ist nur offen, solange du den Knopf hältst.

## Für Betreiber

Ohne weitere Einstellung nutzt der Funk den öffentlichen STUN-Server von Cloudflare. In manchen
Mobilfunknetzen reicht das nicht für eine direkte Verbindung. Dann hilft ein TURN-Server. Lege
dafür dem Worker die Variable `ICE_SERVERS` als JSON-Liste an, zum Beispiel:

```json
[
  { "urls": "stun:stun.cloudflare.com:3478" },
  { "urls": "turn:turn.example.org:3478", "username": "name", "credential": "geheim" }
]
```

Weil darin Zugangsdaten stehen können, setze die Variable als Secret
(`wrangler secret put ICE_SERVERS`). Die Liste geht an alle Spielenden eines Raums.
