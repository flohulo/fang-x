import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FEEDBACK_MAX_RATING,
  FEEDBACK_MAX_REASON_LENGTH,
  FEEDBACK_MIN_RATING,
  isNegativeFeedback,
  type FeedbackRole,
} from "@fang-x/shared";
import { fetchWithTicket } from "../lib/humanCheck";

const RATINGS = Array.from(
  { length: FEEDBACK_MAX_RATING - FEEDBACK_MIN_RATING + 1 },
  (_, i) => i + FEEDBACK_MIN_RATING,
);

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Rückmeldung nach der Runde: erst Sterne, dann je nach Bewertung die Frage,
 * was gut oder was nicht gut lief. Anonym, ohne Spiel-Code und ohne Standort.
 */
export function FeedbackPanel({ role }: { role: FeedbackRole | null }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (status === "sent") {
    return (
      <section className="feedback" aria-label={t("game.feedback.title")}>
        <h3>{t("game.feedback.title")}</h3>
        <p role="status">{t("game.feedback.thanks")}</p>
      </section>
    );
  }

  const negative = rating !== null && isNegativeFeedback(rating);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating === null || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetchWithTicket("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reason: reason.trim(), role }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="feedback" aria-label={t("game.feedback.title")}>
      <h3>{t("game.feedback.title")}</h3>
      <p>{t("game.feedback.question")}</p>
      <div className="feedback-stars" role="radiogroup" aria-label={t("game.feedback.question")}>
        {RATINGS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t("game.feedback.starLabel", { count: value, max: FEEDBACK_MAX_RATING })}
            className={`feedback-star${rating !== null && value <= rating ? " feedback-star-on" : ""}`}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>

      {rating !== null && (
        <form onSubmit={submit}>
          <label className="feedback-label" htmlFor="feedback-reason">
            {negative ? t("game.feedback.whyBad") : t("game.feedback.whyGood")}
          </label>
          <textarea
            id="feedback-reason"
            value={reason}
            maxLength={FEEDBACK_MAX_REASON_LENGTH}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="config-hint">{t("game.feedback.privacy")}</p>
          {status === "error" && (
            <p role="alert" className="feedback-error">
              {t("game.feedback.error")}
            </p>
          )}
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? t("game.feedback.sending") : t("game.feedback.send")}
          </button>
        </form>
      )}

      <button
        type="button"
        className="secondary"
        style={{ marginTop: 8 }}
        onClick={() => setDismissed(true)}
      >
        {t("game.feedback.skip")}
      </button>
    </section>
  );
}
