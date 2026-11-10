// Menschen-Prüfung per Proof-of-Work.
//
// Ablauf: Der Client holt eine signierte Aufgabe (/api/challenge), löst sie im
// Browser und tauscht die Lösung gegen ein signiertes Ticket (/api/verify).
// Das Ticket ist für Raum erstellen, Raum abfragen und Beitreten nötig.
// Es gibt keine Cookies, keine Konten und keinen externen Dienst.

import {
  HUMAN_CHECK_DIFFICULTY_BITS,
  HUMAN_CHECK_ERROR_CODE,
  HUMAN_TICKET_HEADER,
  HUMAN_TICKET_PARAM,
  leadingZeroBits,
} from "@fang-x/shared";

const CHALLENGE_TTL_MS = 2 * 60_000;
export const TICKET_TTL_MS = 6 * 60 * 60_000;

const encoder = new TextEncoder();

export interface HumanCheckEnv {
  /** Geheimer Signaturschlüssel. Ohne ihn ist die Prüfung abgeschaltet (lokale Entwicklung). */
  HUMAN_CHECK_SECRET?: string;
}

export function humanCheckEnabled(env: HumanCheckEnv): boolean {
  return typeof env.HUMAN_CHECK_SECRET === "string" && env.HUMAN_CHECK_SECRET.length > 0;
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return toHex(mac);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Vergleich ohne frühen Abbruch, damit sich die Signatur nicht erraten lässt. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Neue Aufgabe: "<zeit>.<zufall>.<signatur>". */
export async function createChallenge(env: HumanCheckEnv): Promise<string> {
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(12)));
  const body = `c.${Date.now()}.${nonce}`;
  return `${body}.${await sign(env.HUMAN_CHECK_SECRET!, body)}`;
}

/** Prüft Aufgabe und Lösung und stellt bei Erfolg ein Ticket aus. */
export async function redeemChallenge(
  env: HumanCheckEnv,
  challenge: unknown,
  solution: unknown,
): Promise<string | null> {
  if (typeof challenge !== "string" || typeof solution !== "string") return null;
  if (challenge.length > 200 || solution.length > 40) return null;

  const parts = challenge.split(".");
  if (parts.length !== 4 || parts[0] !== "c") return null;
  const issuedAt = Number(parts[1]);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < 0 || age > CHALLENGE_TTL_MS) return null;

  const expected = await sign(env.HUMAN_CHECK_SECRET!, parts.slice(0, 3).join("."));
  if (!safeEqual(expected, parts[3])) return null;

  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(`${challenge}:${solution}`)),
  );
  if (leadingZeroBits(digest) < HUMAN_CHECK_DIFFICULTY_BITS) return null;

  const body = `t.${Date.now() + TICKET_TTL_MS}`;
  return `${body}.${await sign(env.HUMAN_CHECK_SECRET!, body)}`;
}

export async function isValidTicket(env: HumanCheckEnv, ticket: string | null): Promise<boolean> {
  if (!humanCheckEnabled(env)) return true;
  if (!ticket || ticket.length > 200) return false;
  const parts = ticket.split(".");
  if (parts.length !== 3 || parts[0] !== "t") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = await sign(env.HUMAN_CHECK_SECRET!, `t.${parts[1]}`);
  return safeEqual(expected, parts[2]);
}

/** Liefert eine 403-Antwort, wenn das Ticket fehlt oder ungültig ist, sonst null. */
export async function requireTicket(
  env: HumanCheckEnv,
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const ticket =
    request.headers.get(HUMAN_TICKET_HEADER) ?? url.searchParams.get(HUMAN_TICKET_PARAM);
  if (await isValidTicket(env, ticket)) return null;
  return Response.json(
    { error: "Bitte bestätige zuerst, dass du ein Mensch bist.", code: HUMAN_CHECK_ERROR_CODE },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
