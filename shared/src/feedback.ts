// Rückmeldung zur Runde (Sterne und freier Text), geteilt von Client und Server.
// Sie ist anonym: kein Spiel-Code, kein Name, keine Standorte.

export const FEEDBACK_MIN_RATING = 1;
export const FEEDBACK_MAX_RATING = 5;
export const FEEDBACK_MAX_REASON_LENGTH = 500;
/** Bis zu dieser Sternezahl fragt die App nach Verbesserungen, darüber nach dem Gelungenen. */
export const FEEDBACK_NEGATIVE_MAX_RATING = 3;

export type FeedbackRole = "X" | "DETECTIVE";

export interface FeedbackInput {
  rating: number;
  reason: string;
  role: FeedbackRole | null;
}

export function isNegativeFeedback(rating: number): boolean {
  return rating <= FEEDBACK_NEGATIVE_MAX_RATING;
}

/** Prüft und bereinigt eine Rückmeldung; liefert null bei ungültigen Angaben. */
export function parseFeedback(value: unknown): FeedbackInput | null {
  if (value === null || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const rating = raw.rating;
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < FEEDBACK_MIN_RATING ||
    rating > FEEDBACK_MAX_RATING
  ) {
    return null;
  }

  if (raw.reason !== undefined && typeof raw.reason !== "string") return null;
  const reason = (raw.reason ?? "").toString().trim();
  if (reason.length > FEEDBACK_MAX_REASON_LENGTH) return null;

  const role = raw.role === "X" || raw.role === "DETECTIVE" ? raw.role : null;
  return { rating, reason, role };
}
