# Mitwirken an Fang X

Danke für dein Interesse! Fang X ist ein GPS-Spiel für Gruppen im Freien. Beiträge sollten Spielspass, Datenschutz, Zugänglichkeit und Sicherheit gemeinsam berücksichtigen.

## Lokal entwickeln

Voraussetzungen: Node.js 22 und npm.

```bash
npm ci
npm run format:check
npm run typecheck
npm run build
npm run check:locales
```

Der Code wird mit [Prettier](https://prettier.io/) formatiert. `npm run format` formatiert alle Dateien, `npm run format:check` prüft nur (läuft auch in der CI). Die Regeln stehen in `.prettierrc.json`, ausgenommen sind die Dateien in `.prettierignore`.

Für den Integrationstest den Worker in einem Terminal starten:

```bash
cd server
npx wrangler dev --port 8787
```

Dann in einem zweiten Terminal im Projektstamm ausführen:

```bash
npm run test:integration
```

## Dokumentation

Das Handbuch liegt unter `docs/` und wird mit [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) gebaut. Änderungen an Seiten oder an `mkdocs.yml` vor dem Pull Request lokal prüfen:

```bash
pip install -r requirements-docs.txt
mkdocs build --strict
mkdocs serve
```

Die Navigation steht in `mkdocs.yml`. Neue Seiten dort eintragen und aus den bestehenden Seiten verlinken, damit sie nicht verwaist sind.

## Übersetzen

Deutsch ist die Quellsprache, Englisch der Rückfall. Übersetzen geht ohne Programmieren auf
[Codeberg Translate](https://translate.codeberg.org/engage/fang-x/).

Wer im Code arbeitet:

- App-Texte stehen in `client/src/locales/<sprache>.json` und werden mit `t("bereich.schluessel")`
  verwendet. Neue Texte zuerst in `de.json` und `en.json` ergänzen, nie fest im Code schreiben.
- Servermeldungen tragen einen Code; die Texte dazu stehen unter `errors.*` und `endReasons.*`.
- `npm run check:locales` prüft Schlüssel und Platzhalter (läuft auch in der CI).
- Impressum, Datenschutz und Changelog bleiben auf Deutsch.
- Handbuch: Übersetzungen heissen `docs/<Seite>.<sprache>.md`, z. B. `Spieldauer.en.md`.

## Pull Requests

- Erkläre den Anwendungsfall und die Auswirkungen auf Spieler.
- Halte Änderungen fokussiert und ergänze Tests für geändertes Verhalten.
- Verwende für den PR-Titel Conventional Commits, z. B. `feat: bonusmission ergänzen`, `fix: fangradius korrigieren` oder `docs: spielregeln erklären`. Für Sprach- und Übersetzungsupdates gibt es den Typ `i18n` (z. B. `i18n: übersetzungen aktualisieren`), der im Release unter „Sprachen“ erscheint. Daraus werden Release-Art und Changelog abgeleitet. Die Beschreibung nach dem Doppelpunkt beginnt mit einem Kleinbuchstaben. Ein eigener Workflow prüft den Titel und schlägt bei ungültigem Format fehl.
- Teile keine echten GPS-Koordinaten, privaten Spielcodes, Zugangsdaten oder persönlichen Daten.
- Vor einem Pull Request müssen Formatprüfung, Typecheck und Build erfolgreich sein; bei Änderungen an Spielablauf, Server oder Protokoll soll auch der Integrationstest erfolgreich sein.

## Sicherheit und Standortdaten

Melde vermutete Sicherheitsprobleme privat gemäss [SECURITY.md](SECURITY.md), nicht als öffentliches Issue. Vermeide Änderungen, die Standortdaten länger speichern oder an mehr Empfänger weitergeben, ohne dies ausdrücklich zu dokumentieren und zu begründen.

## Lizenz

Beiträge werden unter der Projektlizenz AGPL-3.0-only veröffentlicht.
