// Übersetzt Fehler- und Endmeldungen des Servers anhand ihres Codes.
// Der deutsche Klartext vom Server dient nur als Rückfall für unbekannte Codes.

import type { MessageParams } from "@fang-x/shared";
import type { TFunction } from "i18next";

export interface ServerError {
  message: string;
  code?: string;
  params?: MessageParams;
}

export interface EndReason {
  reason: string;
  code?: string;
  params?: MessageParams;
}

function translate(
  t: TFunction,
  prefix: "errors" | "endReasons",
  code: string | undefined,
  params: MessageParams | undefined,
  fallback: string,
): string {
  if (!code) return fallback;
  // Manche Meldungen hängen vom Verkehrsmittel ab (z. B. TRANSIT_EXHAUSTED_bus).
  const keys = [params?.mode ? `${prefix}.${code}_${params.mode}` : null, `${prefix}.${code}`];
  return t(keys.filter((key): key is string => key !== null), {
    ...params,
    defaultValue: fallback,
  });
}

export function formatServerError(t: TFunction, error: ServerError): string {
  return translate(t, "errors", error.code, error.params, error.message);
}

export function formatEndReason(t: TFunction, end: EndReason): string {
  return translate(t, "endReasons", end.code, end.params, end.reason);
}
