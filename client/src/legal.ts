// Betreiberangaben für Impressum und Datenschutzerklärung.
//
// Diese Werte gehören NICHT in den Quellcode eines öffentlichen Repositories,
// wenn du sie nicht veröffentlichen willst. Setze sie stattdessen beim Build
// über Umgebungsvariablen (siehe `.env.example`):
//
//   VITE_LEGAL_NAME, VITE_LEGAL_STREET, VITE_LEGAL_POSTAL_CODE, VITE_LEGAL_CITY,
//   VITE_LEGAL_COUNTRY, VITE_LEGAL_EMAIL, VITE_LEGAL_PHONE,
//   VITE_LEGAL_AUTHORITY, VITE_LEGAL_UPDATED
//
// Leere Felder werden auf den Rechtsseiten sichtbar als Platzhalter markiert.

const env = import.meta.env;

export interface LegalInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  /** Zuständige Datenschutz-Aufsichtsbehörde (Land/Region) */
  authority: string;
  /** Stand der Datenschutzerklärung, z. B. "17. Oktober 2026" */
  updated: string;
}

export const LEGAL: LegalInfo = {
  name: env.VITE_LEGAL_NAME ?? "",
  street: env.VITE_LEGAL_STREET ?? "",
  postalCode: env.VITE_LEGAL_POSTAL_CODE ?? "",
  city: env.VITE_LEGAL_CITY ?? "",
  country: env.VITE_LEGAL_COUNTRY ?? "Deutschland",
  email: env.VITE_LEGAL_EMAIL ?? "",
  phone: env.VITE_LEGAL_PHONE ?? "",
  authority: env.VITE_LEGAL_AUTHORITY ?? "",
  updated: env.VITE_LEGAL_UPDATED ?? "",
};

/** true, sobald die Pflichtangaben gesetzt sind. */
export const LEGAL_COMPLETE =
  LEGAL.name.trim() !== "" &&
  LEGAL.street.trim() !== "" &&
  LEGAL.postalCode.trim() !== "" &&
  LEGAL.city.trim() !== "" &&
  LEGAL.email.trim() !== "";
