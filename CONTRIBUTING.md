# Mitwirken an Fang X

Danke für dein Interesse! Fang X ist ein GPS-Spiel für Gruppen im Freien. Beiträge sollten Spielspass, Datenschutz, Zugänglichkeit und Sicherheit gemeinsam berücksichtigen.

## Lokal entwickeln

Voraussetzungen: Node.js 22 und npm.

```bash
npm ci
npm run check
npm run typecheck
npm run build
```

Code-Formatierung und Linting werden mit [Biome](https://biomejs.dev/) geprüft (`npm run check` bzw. `npm run format`).

Für den Integrationstest den Worker in einem Terminal starten:

```bash
cd server
npx wrangler dev --port 8787
```

Dann in einem zweiten Terminal im Projektstamm ausführen:

```bash
npm run test:integration
```

## Pull Requests

- Erkläre den Anwendungsfall und die Auswirkungen auf Spieler.
- Halte Änderungen fokussiert und ergänze Tests für geändertes Verhalten.
- Verwende für den PR-Titel Conventional Commits, z. B. `feat: Bonusmission ergänzen`, `fix: Fangradius korrigieren` oder `docs: Spielregeln erklären`. Daraus werden Release-Art und Changelog abgeleitet. Ein eigener Workflow prüft den Titel und schlägt bei ungültigem Format fehl.
- Teile keine echten GPS-Koordinaten, privaten Spielcodes, Zugangsdaten oder persönlichen Daten.
- Vor einem Pull Request müssen Biome-Check (`npm run check`), Typecheck und Build erfolgreich sein; bei Änderungen an Spielablauf, Server oder Protokoll soll auch der Integrationstest erfolgreich sein.

## Sicherheit und Standortdaten

Melde vermutete Sicherheitsprobleme privat gemäß [SECURITY.md](SECURITY.md), nicht als öffentliches Issue. Vermeide Änderungen, die Standortdaten länger speichern oder an mehr Empfänger weitergeben, ohne dies ausdrücklich zu dokumentieren und zu begründen.

## Lizenz

Beiträge werden unter der Projektlizenz AGPL-3.0-only veröffentlicht.
