// Menschen-Prüfung im Browser: löst die Rechenaufgabe des Servers (Proof-of-Work)
// und hält das Ticket vor. Läuft beim Öffnen der Seite unsichtbar im Hintergrund.

import { HUMAN_CHECK_ERROR_CODE, HUMAN_TICKET_HEADER, leadingZeroBits } from "@fang-x/shared";

const STORAGE_KEY = "fangx:human-ticket";
/** Ticket vorsorglich erneuern, wenn es in weniger als 10 Minuten abläuft. */
const REFRESH_MARGIN_MS = 10 * 60_000;

interface StoredTicket {
  ticket: string;
  expiresAt: number;
}

let memory: StoredTicket | null = null;
let pending: Promise<string | null> | null = null;

function load(): StoredTicket | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTicket>;
    if (typeof parsed.ticket !== "string" || typeof parsed.expiresAt !== "number") return null;
    memory = { ticket: parsed.ticket, expiresAt: parsed.expiresAt };
    return memory;
  } catch {
    return null;
  }
}

function store(value: StoredTicket | null) {
  memory = value;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ohne Speicher muss die Aufgabe nach einem Reload neu gelöst werden.
  }
}

async function solve(challenge: string, difficulty: number): Promise<string> {
  const encoder = new TextEncoder();
  for (let counter = 0; ; counter++) {
    const solution = counter.toString(36);
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(`${challenge}:${solution}`)),
    );
    if (leadingZeroBits(digest) >= difficulty) return solution;
  }
}

async function requestTicket(): Promise<string | null> {
  const challengeRes = await fetch("/api/challenge");
  if (!challengeRes.ok) throw new Error(`challenge ${challengeRes.status}`);
  const info = (await challengeRes.json()) as {
    enabled: boolean;
    challenge?: string;
    difficulty?: number;
  };
  // Der Server hat die Prüfung abgeschaltet (z. B. lokale Entwicklung).
  if (!info.enabled || !info.challenge || !info.difficulty) return null;

  const solution = await solve(info.challenge, info.difficulty);
  const verifyRes = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: info.challenge, solution }),
  });
  if (!verifyRes.ok) throw new Error(`verify ${verifyRes.status}`);
  const result = (await verifyRes.json()) as { ticket?: string; expiresInMs?: number };
  if (!result.ticket) return null;
  store({ ticket: result.ticket, expiresAt: Date.now() + (result.expiresInMs ?? 0) });
  return result.ticket;
}

/** Das bereits vorhandene Ticket, ohne Netzwerk (null, wenn keines nötig oder abgelaufen ist). */
export function cachedHumanTicket(): string | null {
  const current = load();
  return current && current.expiresAt > Date.now() ? current.ticket : null;
}

/** Liefert ein gültiges Ticket (oder null, wenn der Server keines verlangt). */
export function ensureHumanTicket(force = false): Promise<string | null> {
  const current = load();
  if (!force && current && current.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return Promise.resolve(current.ticket);
  }
  if (!pending) {
    pending = requestTicket()
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * fetch mit Ticket. Lehnt der Server wegen eines abgelaufenen Tickets ab,
 * wird einmal ein neues geholt und die Anfrage wiederholt.
 */
export async function fetchWithTicket(input: string, init: RequestInit = {}): Promise<Response> {
  const attempt = async (force: boolean) => {
    const ticket = await ensureHumanTicket(force);
    const headers = new Headers(init.headers);
    if (ticket) headers.set(HUMAN_TICKET_HEADER, ticket);
    return fetch(input, { ...init, headers });
  };

  const res = await attempt(false);
  if (res.status !== 403) return res;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as { code?: string } | null;
  if (body?.code !== HUMAN_CHECK_ERROR_CODE) return res;
  store(null);
  return attempt(true);
}
