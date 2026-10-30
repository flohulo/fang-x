# Regeln für Claude in Fang X

## Sprache und Texte
- UI-Texte, Fehlermeldungen, Commit-Messages und PR-Texte sind auf Deutsch.
- In der UI wird geduzt. Keine Emojis.

## Commits und Pull Requests
- Commits und PR-Titel folgen Conventional Commits (`feat:`, `fix:`, `chore:` …). Daraus erzeugt release-please den Changelog.
- Der PR-Titel muss `.github/workflows/pr-title.yml` erfüllen: erlaubte Typen `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`; die Beschreibung nach dem Doppelpunkt beginnt mit einem Kleinbuchstaben (z. B. `feat: bonusmission ergänzen`).
- Nie direkt auf `main` pushen, immer Branch und PR.
- Ein PR enthält nur eine Sache, keine Nebenbei-Refactorings.
- Jeden PR, den Claude erstellt oder betreut, sofort mit `subscribe_pr_activity` beobachten und rote CI sowie Review-Kommentare selbst beheben.

## Qualität vor dem Push
- Typecheck und Client-Build ausführen (`npm run typecheck`, `npm run build`).
- Bei Änderungen an Server, Spielablauf oder Protokoll auch `npm run test:integration` ausführen.
- Keine neuen Dependencies ohne Rückfrage.

## Projektspezifisch
- Regeln und Typen, die Client und Server teilen, gehören nach `shared/`, nicht doppelt in beide.
- Keine Standortdaten ins Log schreiben.
- Bei Änderungen an Spiel- oder Menüfunktionen die Doku in `docs/` mitpflegen.

## Verhalten
- Bei mehreren Lösungswegen kurz nachfragen statt selbst entscheiden.
- Nach Änderungen kurz sagen, was geprüft wurde und was nicht.
