# Sprechfunk

| **Funktion** | Sprechfunk per Knopfdruck, nur zwischen Detektiven |
|---|---|
| **Regelparameter** | `radio.enabled` |
| **Standardwert** | Aus |
| **Verfügbar** | Während Vorsprung und laufender Runde |

Mit dem Sprechfunk sprechen die Detektive miteinander, ohne dass X etwas hört. Der Chat bleibt
davon unberührt: Er ist weiterhin für alle sichtbar.

Wie ihr euch am Funk verhaltet, steht unter [Funkdisziplin und Funksprache](Funkdisziplin.md).

## Aktivieren

Der Host schaltet den Sprechfunk in der Spielvorbereitung ein: **Sprechfunk für Detektive
aktivieren**. Standardmäßig ist er aus. Die Einstellung gilt für die ganze Runde und lässt sich
während des Spiels nicht ändern.

## Berechtigungen

Der Sprechfunk braucht den Zugriff auf das **Mikrofon**. Ist der Sprechfunk aktiviert, erscheint
bei allen Detektiven in der Lobby eine Karte **Mikrofon für den Sprechfunk** und ein Eintrag in der
Checkliste. Mit **Mikrofon erlauben** fragt der Browser sofort danach, damit niemand mitten im
Spiel unterbrochen wird.

- Wurde das Mikrofon blockiert, zeigt die App eine Anleitung, wie du es in den
  Website-Einstellungen wieder freigibst.
- Auf Geräten ohne Mikrofon oder ohne WebRTC-Unterstützung steht, dass der Sprechfunk nicht
  verfügbar ist. Du kannst trotzdem mitspielen und im Chat schreiben.
- X braucht das Mikrofon nicht und sieht den Sprechfunk nicht.

## So funktioniert es im Spiel

1. Tippe auf der Karte auf das **Mikrofon-Symbol** neben dem Chat.
2. Tippe auf **Sprechfunk einschalten**.
3. Halte den großen Knopf gedrückt, solange du sprechen willst. Beim Loslassen hörst du wieder zu.
4. Wer gerade spricht, wird den anderen angezeigt.

Bei Spielende wird der Sprechfunk automatisch beendet.

## Über welchen Lautsprecher kommt der Ton?

Die App wählt den Ausgang nicht selbst. Der Ton kommt über den Ausgang, den dein Gerät und dein
Browser gerade verwenden: normalerweise der Lautsprecher, bei angeschlossenen Kopfhörern oder
Bluetooth-Geräten dort. Auf manchen Handys wechselt der Ton, sobald das Mikrofon aktiv ist, auf
die Hörmuschel und klingt dann leiser. Stelle in dem Fall in den Systemeinstellungen den
Lautsprecher ein oder verwende Kopfhörer. Für Runden im Freien sind Kopfhörer meist die bessere
Wahl.

## Datenschutz

- Der Ton läuft direkt zwischen den Geräten der Detektive (WebRTC) und wird nicht aufgezeichnet
  und nicht über den Spielserver geleitet. Der Server vermittelt nur den Verbindungsaufbau.
- Beim Verbindungsaufbau sehen sich die beteiligten Geräte gegenseitig ihre IP-Adressen. Außerdem
  fragen die Geräte einen STUN-Server nach ihrer öffentlichen Adresse. Standardmäßig ist das
  `stun.cloudflare.com`.
- Das Mikrofon ist nur offen, solange du den Knopf hältst.

## Für Betreiber

Ohne weitere Einstellung nutzt der Sprechfunk den öffentlichen STUN-Server von Cloudflare. In
manchen Mobilfunknetzen reicht das nicht für eine direkte Verbindung. Dann hilft ein TURN-Server.
Lege dafür dem Worker die Variable `ICE_SERVERS` als JSON-Liste an, zum Beispiel:

```json
[
  { "urls": "stun:stun.cloudflare.com:3478" },
  { "urls": "turn:turn.example.org:3478", "username": "name", "credential": "geheim" }
]
```

Weil darin Zugangsdaten stehen können, setze die Variable als Secret
(`wrangler secret put ICE_SERVERS`). Die Liste geht an alle Spielenden eines Raums.
