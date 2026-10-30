# Mitwirken an Fang X

Danke für dein Interesse! Fang X ist ein GPS-Spiel für Gruppen im Freien. Beiträge sollten Spielspass, Datenschutz, Zugänglichkeit und Sicherheit gemeinsam berücksichtigen.

## Lokal entwickeln

Voraussetzungen: Node.js 22 und npm.

```bash
npm ci
npm run typecheck
npm run build
npm run check:locales
```

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

Texte der App und das Handbuch sind mehrsprachig. **Deutsch ist die Quellsprache**, Englisch ist
der Rückfall für Texte, die in einer Sprache noch fehlen.

### Mitübersetzen (ohne Programmieren)

Übersetzungen der App werden auf [Weblate](https://hosted.weblate.org/engage/fang-x/) gepflegt:
Anmelden, Sprache wählen (oder eine neue anfordern) und Texte im Browser übersetzen. Weblate
schickt die Änderungen als Pull Request ins Repository, die CI prüft sie automatisch. Platzhalter
wie `{{name}}` oder `<1>…</1>` bleiben unverändert; nur der Text drumherum wird übersetzt.

### Texte im Code ändern

- Alle Texte der App stehen in `client/src/locales/<sprache>.json` und werden mit
  [i18next](https://www.i18next.com/) verwendet (`t("bereich.schluessel")`). Neue Texte zuerst in
  `de.json` und `en.json` ergänzen, nie fest im Code schreiben.
- Mehrzahlformen heissen `schluessel_one` / `schluessel_other` (weitere Formen je nach Sprache).
- Servermeldungen (Fehler, Spielende) tragen einen Code (`code` bzw. `reasonCode`); die Texte dazu
  stehen unter `errors.*` und `endReasons.*`. Der deutsche Klartext vom Server ist nur ein Rückfall.
- `npm run check:locales` prüft Schlüssel und Platzhalter; die CI führt das ebenfalls aus.
- Impressum, Datenschutzerklärung und Changelog bleiben bewusst auf Deutsch (rechtlich
  verbindliche Fassung).

### Eine neue Sprache hinzufügen

1. **App:** In Weblate die Sprache hinzufügen. Weblate legt `client/src/locales/<code>.json` an;
   Sprachwähler, Laden und `lang`-Attribut ergänzen sich automatisch. Von Hand: `de.json` kopieren,
   übersetzen und als `<code>.json` ablegen.
2. **Handbuch:** Pro Seite `docs/<Seite>.<code>.md` anlegen (z. B. `Spieldauer.fr.md`) und die
   Sprache in `mkdocs.yml` unter `plugins → i18n → languages` eintragen (mit
   `nav_translations`). Nicht übersetzte Seiten zeigen den deutschen Text. Danach `<code>` in
   `DOCS_LANGUAGES` in `client/src/lib/docs.ts` ergänzen, damit die App auf die richtige
   Handbuch-Fassung verlinkt.

### Weblate einrichten (für Maintainer)

Projekt auf <https://hosted.weblate.org/> anlegen (Libre-Hosting für Open Source) und eine
Komponente für die App erstellen:

| Feld | Wert |
|---|---|
| Repository | `https://github.com/flohulo/fang-x` (Branch `main`) |
| Dateimaske | `client/src/locales/*.json` |
| Basisdatei für einsprachige Dateien | `client/src/locales/de.json` |
| Dateiformat | i18next JSON file (v4) |
| Neue Übersetzungen | „Neue Sprachdatei anlegen“ |
| Zusammenführung | Pull Request (GitHub), Commit-Nachrichten im Stil `chore(i18n): …` |

Das Handbuch-Markdown wird per Pull Request übersetzt (siehe oben).

## Pull Requests

- Erkläre den Anwendungsfall und die Auswirkungen auf Spieler.
- Halte Änderungen fokussiert und ergänze Tests für geändertes Verhalten.
- Verwende für den PR-Titel Conventional Commits, z. B. `feat: Bonusmission ergänzen`, `fix: Fangradius korrigieren` oder `docs: Spielregeln erklären`. Daraus werden Release-Art und Changelog abgeleitet. Ein eigener Workflow prüft den Titel und schlägt bei ungültigem Format fehl.
- Teile keine echten GPS-Koordinaten, privaten Spielcodes, Zugangsdaten oder persönlichen Daten.
- Vor einem Pull Request müssen Typecheck und Build erfolgreich sein; bei Änderungen an Spielablauf, Server oder Protokoll soll auch der Integrationstest erfolgreich sein.

## Sicherheit und Standortdaten

Melde vermutete Sicherheitsprobleme privat gemäss [SECURITY.md](SECURITY.md), nicht als öffentliches Issue. Vermeide Änderungen, die Standortdaten länger speichern oder an mehr Empfänger weitergeben, ohne dies ausdrücklich zu dokumentieren und zu begründen.

## Lizenz

Beiträge werden unter der Projektlizenz AGPL-3.0-only veröffentlicht.
