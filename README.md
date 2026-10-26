# Fang X

**Ein GPS-Fangspiel für draussen – kostenlos, werbefrei und Open Source.**

Eine Person ist **X** und versucht zu entkommen. Die anderen spielen als **Detektive** und
bekommen regelmässig ungefähre Hinweise auf X' Standort. Wer X im Fangradius erreicht, gewinnt.

[![CI](https://github.com/flohulo/fang-x/actions/workflows/ci.yml/badge.svg)](https://github.com/flohulo/fang-x/actions/workflows/ci.yml)
[![Lizenz: AGPL-3.0-only](https://img.shields.io/badge/Lizenz-AGPL--3.0--only-blue.svg)](LICENSE)

## So funktioniert's

1. Eine Person erstellt ein Spiel und teilt den Spielcode mit der Gruppe.
2. Alle treten bei und wählen ihre Rolle: X oder Detektiv.
3. Der Host legt die Regeln fest und startet das Spiel.
4. X läuft voraus; die Detektive suchen X mithilfe der Karte und der Standort-Hinweise.

Das Spiel kann optional eine Bonusmission enthalten. X versucht dabei, einen geheimen Zielpunkt
zu erreichen, bevor die nächste Sichtung kommt.

Der Host stellt die Regeln einzeln ein: zum Beispiel Dauer, Vorsprung, Zeitpunkt und Intervall der
Standortmeldungen, Rollenanzahl, Live-Standorte der Detektive, ÖV-Budget, Startpunkt und Fangart.
So kann jede Gruppe ihre eigene Runde zusammenstellen. Eine mögliche Kombination sind drei
Spielende, zehn Minuten Vorsprung, 90 Minuten Spielzeit, Standortmeldungen alle fünf Minuten,
Live-Standorte für die Detektive und ein begrenztes ÖV-Budget. Beim Foto-Fang bestätigen die
Spielenden den Fang direkt in der App. Während der Runde können alle Spielenden im integrierten
Chat schreiben; der Verlauf wird nach Spielende gelöscht.

Muss X die Runde abbrechen, gibt es dafür den Notfall-Knopf: Nach einer Bestätigung endet das
Spiel, die Detektive gewinnen und erhalten den exakten Standort von X samt Benachrichtigung.

## Datenschutz und sicher spielen

- Es gibt keine Benutzerkonten.
- Live-Standorte werden nur während des Spiels übertragen; Routenverläufe werden nicht gespeichert.
  Der einmalige Spielmittelpunkt wird für die laufende Runde gespeichert und danach gelöscht. Im
  Wenn der Host einen Startpunkt festlegt, wird dieser für die laufende Runde gespeichert.
- Fotos werden nicht in die App hochgeladen. Beim Foto-Fang bestätigen die Spieler den Fang
  gemeinsam in der App.
- Chat-Nachrichten bestehen nur im Arbeitsspeicher der laufenden Runde und werden nach Spielende
  verworfen.
- Die Standortfreigabe wird vom Browser angefragt. Du kannst sie jederzeit in den
  Geräteeinstellungen widerrufen.
- Spielt rücksichtsvoll: Bleibt an sicheren, öffentlichen Orten, achtet auf den Verkehr und
  respektiert die Privatsphäre anderer.

Für Karten nutzt Fang X [OpenFreeMap](https://openfreemap.org/) auf Basis von
[OpenStreetMap](https://www.openstreetmap.org/). Die Kartendaten sind © OpenStreetMap-Mitwirkende.
Über den Karten-Button lässt sich optional eine Satellitenkarte einblenden: Sentinel-2 cloudless
2025 von [EOX](https://cloudless.eox.at/) (© EOX IT Services GmbH, CC BY-NC-SA 4.0). In der
Schweiz wird bei Nahaufnahmen zusätzlich das amtliche Luftbild SWISSIMAGE von
[swisstopo](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) eingeblendet
(© swisstopo, freie Geodaten des Bundes).

## Lokal ausprobieren

Zum Entwickeln brauchst du [Node.js 22](https://nodejs.org/) und npm.

```bash
npm ci
npm run build
cd server
npx wrangler dev --ip 127.0.0.1 --port 8787
```

Öffne anschliessend <http://localhost:8787>. Der lokale Server liefert Spiel und API gemeinsam
aus. Das Spiel benötigt eine Internetverbindung.

### Prüfen

Für den Integrationstest muss der lokale Server in einem Terminal laufen. Starte dann in einem
zweiten Terminal im Projektordner:

```bash
npm run typecheck
npm run build
npx @biomejs/biome ci .
npm run test:integration
```

Weitere Hinweise zum Entwickeln und Mitwirken stehen in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Handbuch

Das Handbuch mit Spielablauf, allen Einstellungen und Tipps steht unter
<https://flohulo.github.io/fang-x/>. Es wird mit [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
aus den Seiten in [`docs/`](docs/) gebaut:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Die Seite wird bei Änderungen an `docs/` oder `mkdocs.yml` automatisch über den Workflow
`.github/workflows/deploy-docs.yml` auf GitHub Pages veröffentlicht.

## Mitmachen

Fehlerberichte und Verbesserungsvorschläge sind willkommen. Nutze dafür die
[Issue-Vorlagen](https://github.com/flohulo/fang-x/issues/new/choose) oder eröffne einen
[Pull Request](https://github.com/flohulo/fang-x/pulls). Bitte teile dabei keine echten
Standortdaten oder privaten Spielcodes. Sicherheitsprobleme sollten privat gemäss
[SECURITY.md](SECURITY.md) gemeldet werden.

## Lizenz

Der Quellcode steht unter der [AGPL-3.0-only](LICENSE).
