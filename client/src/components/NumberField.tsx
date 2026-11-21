import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface NumberFieldProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

// Eingabewert lesen. Komma ist erlaubt, ein leeres oder ungültiges Feld ergibt NaN.
function parse(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Rundet auf zwei Nachkommastellen, damit 0,5 + 0,5 nicht zu 0,99999 wird.
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Zahlenfeld, das sich frei leeren und neu tippen lässt. Gültige Werte werden sofort
// übernommen, beim Verlassen des Feldes wird ein zu großer oder zu kleiner Wert in den
// erlaubten Bereich gesetzt. Mit den Tasten daneben lässt sich der Wert schrittweise ändern.
export function NumberField({ id, value, min, max, step, onChange }: NumberFieldProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(String(value));

  // Wert von außen (z. B. durch die Tasten) in das Feld übernehmen, solange der Text
  // nicht ohnehin denselben Wert darstellt.
  useEffect(() => {
    setDraft((previous) => (parse(previous) === value ? previous : String(value)));
  }, [value]);

  const decimal = !Number.isInteger(step) || !Number.isInteger(min);

  const handleChange = (text: string) => {
    setDraft(text);
    const parsed = parse(text);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = parse(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const fixed = clamp(decimal ? parsed : Math.round(parsed), min, max);
    setDraft(String(fixed));
    if (fixed !== value) onChange(fixed);
  };

  const nudge = (direction: 1 | -1) => {
    const base = Number.isFinite(parse(draft)) ? parse(draft) : value;
    const next = clamp(round(base + direction * step), min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="number-field">
      <button
        type="button"
        className="secondary number-field-step"
        aria-label={t("lobby.decrease")}
        disabled={value <= min}
        onClick={() => nudge(-1)}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        onFocus={(event) => event.target.select()}
      />
      <button
        type="button"
        className="secondary number-field-step"
        aria-label={t("lobby.increase")}
        disabled={value >= max}
        onClick={() => nudge(1)}
      >
        +
      </button>
    </div>
  );
}
