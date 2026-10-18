// Betreiberangaben für Impressum und Datenschutzerklärung.
//
// Diese Datei ist die einzige Stelle, an der die Angaben gepflegt werden.
// Bewusst ohne Umgebungsvariablen: Die Angaben stehen direkt im Dokument,
// sind im Repository nachvollziehbar und müssen nicht zusätzlich in einer
// Build-Umgebung gesetzt werden.
//
// Alle Werte in eckigen Klammern sind Platzhalter und werden auf den
// Rechtsseiten gelb markiert. Vor dem Betrieb ersetzen:
//   Pflicht:  name, street, postalCode, city, email
//   Optional: phone, authority, updated  (leer lassen = Angabe entfällt)

export interface LegalInfo {
  /** Vor- und Nachname oder Firma inklusive Rechtsform */
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  /** optional, z. B. "+49 123 456789" */
  phone: string;
  /** optional: zuständige Datenschutz-Aufsichtsbehörde */
  authority: string;
  /** optional: Stand der Datenschutzerklärung, z. B. "18. Oktober 2026" */
  updated: string;
}

export const LEGAL: LegalInfo = {
  name: "[Vor- und Nachname eintragen]",
  street: "[Straße und Hausnummer eintragen]",
  postalCode: "[Postleitzahl eintragen]",
  city: "[Ort eintragen]",
  country: "Deutschland",
  email: "[E-Mail-Adresse eintragen]",
  phone: "",
  authority: "[Zuständige Aufsichtsbehörde eintragen]",
  updated: "18. Oktober 2026",
};

const PLACEHOLDER_MARKER = /\[[^\]]*\]/;

/** true, wenn der Wert noch ein Platzhalter aus dieser Datei ist. */
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKER.test(value);
}

/** true, sobald alle Pflichtangaben ohne Platzhalter gesetzt sind. */
export const LEGAL_COMPLETE =
  LEGAL.name.trim() !== "" &&
  !isPlaceholder(LEGAL.name) &&
  LEGAL.street.trim() !== "" &&
  !isPlaceholder(LEGAL.street) &&
  LEGAL.postalCode.trim() !== "" &&
  !isPlaceholder(LEGAL.postalCode) &&
  LEGAL.city.trim() !== "" &&
  !isPlaceholder(LEGAL.city) &&
  LEGAL.country.trim() !== "" &&
  !isPlaceholder(LEGAL.country) &&
  LEGAL.email.trim() !== "" &&
  !isPlaceholder(LEGAL.email);
