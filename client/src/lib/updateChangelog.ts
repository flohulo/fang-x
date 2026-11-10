// Merkt sich, dass der Mensch ein App-Update bestätigt hat, damit nach dem Neuladen
// der Versionsverlauf geöffnet wird.
const KEY = "fangx:open-changelog-after-update";
const MAX_AGE_MS = 2 * 60 * 1000;

export function markChangelogAfterUpdate(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Speicher nicht verfügbar: Update läuft trotzdem, nur ohne Changelog.
  }
}

/** Gibt true zurück, wenn direkt nach einem bestätigten Update zum Changelog gewechselt werden soll. */
export function consumeChangelogAfterUpdate(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return false;
    localStorage.removeItem(KEY);
    const age = Date.now() - Number(raw);
    return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
