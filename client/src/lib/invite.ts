// Helfer rund um Einladungslinks.
// Ein Link sieht so aus: https://spiel.example/?code=ABC234

const CODE_LENGTH = 6;

/** Liest den Spiel-Code aus einem Query-String wie "?code=abc-234" und normalisiert ihn. */
export function parseInviteCode(search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const raw = new URLSearchParams(query).get("code") ?? "";
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

/** Vollständiger Einladungslink für einen Spiel-Code. */
export function inviteUrl(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/?code=${encodeURIComponent(code)}`;
}

/** Normalisiert eine Eingabe im Code-Feld (Grossbuchstaben, nur erlaubte Zeichen). */
export function normalizeCodeInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}
