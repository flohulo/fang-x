// Spielernamen: gemeinsame Regeln für Client und Server.

export const PLAYER_NAME_MAX_LENGTH = 20;
export const DEFAULT_PLAYER_NAME = "Spieler";

/**
 * Bereinigt einen Spielernamen: Unicode-Normalform NFC, keine Steuer- und Formatzeichen
 * (Zero-Width, RTL-Marker), Leerraum zusammengefasst, höchstens 20 Zeichen.
 * Liefert "Spieler", wenn nichts übrig bleibt.
 */
export function normalizePlayerName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_PLAYER_NAME;
  const cleaned = raw
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim();
  const limited = Array.from(cleaned).slice(0, PLAYER_NAME_MAX_LENGTH).join("").trim();
  return limited || DEFAULT_PLAYER_NAME;
}
