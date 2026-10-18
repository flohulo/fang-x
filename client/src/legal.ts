// Betreiberangaben für Impressum und Datenschutzerklärung

const env = import.meta.env;

export interface LegalInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  authority: string;
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
