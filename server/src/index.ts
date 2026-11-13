// Worker-Einstiegspunkt.
// Statische Assets (Client-PWA) + HTTP-Routen fürs Spielraum-Matchmaking.
// Die eigentliche Spiellogik lebt in der GameRoom-Durable-Object.

import {
  createChallenge,
  humanCheckEnabled,
  redeemChallenge,
  requireTicket,
  TICKET_TTL_MS,
} from "./human-check";
import type { DurableObject } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import { scrubErrorEvent } from "@fang-x/shared";
import { RateLimiter } from "./rate-limit";
import { GameRoom } from "./room";
import { HUMAN_CHECK_DIFFICULTY_BITS } from "@fang-x/shared";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  RATE_LIMIT: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** Signaturschlüssel der Menschen-Prüfung (wrangler secret). Ohne ihn ist sie aus. */
  HUMAN_CHECK_SECRET?: string;
  // Optional: DSN des GlitchTip-Projekts. Ohne DSN ist die Fehlerberichterstattung aus.
  GLITCHTIP_DSN?: string;
}

// GlitchTip spricht das Sentry-Protokoll. Berichte werden vor dem Senden bereinigt,
// damit weder Standorte noch Nutzerdaten oder Spiel-Codes das System verlassen.
function sentryOptions(env: Env): Sentry.CloudflareOptions {
  return {
    dsn: env.GLITCHTIP_DSN,
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubErrorEvent(event),
  };
}

// 6-Buchstaben-Code ohne mehrdeutige Zeichen (kein I, O, 0, 1)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Grenzen pro IP-Adresse
const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60_000;
const LOOKUP_LIMIT = 60;
const LOOKUP_WINDOW_MS = 60_000;
const VERIFY_LIMIT = 30;
const VERIFY_WINDOW_MS = 10 * 60_000;
const JOIN_LIMIT = 100;
const JOIN_WINDOW_MS = 10 * 60_000;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function clientKey(request: Request): string {
  // Cloudflare setzt CF-Connecting-IP an der Edge. Lokal (wrangler dev) fehlt
  // der Header — dann greift ein gemeinsamer Schlüssel.
  return request.headers.get("CF-Connecting-IP") ?? "lokal";
}

async function checkRateLimit(
  env: Env,
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<Response | null> {
  const stub = env.RATE_LIMIT.get(env.RATE_LIMIT.idFromName("global"));
  const result = await stub
    .fetch(
      new Request("http://internal/check", {
        method: "POST",
        body: JSON.stringify({ key: `${scope}:${clientKey(request)}`, limit, windowMs }),
      }),
    )
    .then((r) => r.json() as Promise<{ allowed: boolean; retryAfterSeconds: number }>);

  if (result.allowed) return null;

  return Response.json(
    { error: "Zu viele Anfragen. Bitte kurz warten." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Menschen-Prüfung: Aufgabe holen und Lösung gegen ein Ticket tauschen.
    if (url.pathname === "/api/challenge" && request.method === "GET") {
      if (!humanCheckEnabled(env)) {
        return Response.json({ enabled: false }, { headers: NO_STORE });
      }
      const limited = await checkRateLimit(env, request, "verify", VERIFY_LIMIT, VERIFY_WINDOW_MS);
      if (limited) return limited;
      return Response.json(
        {
          enabled: true,
          challenge: await createChallenge(env),
          difficulty: HUMAN_CHECK_DIFFICULTY_BITS,
        },
        { headers: NO_STORE },
      );
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      if (!humanCheckEnabled(env)) {
        return Response.json({ enabled: false }, { headers: NO_STORE });
      }
      const limited = await checkRateLimit(env, request, "verify", VERIFY_LIMIT, VERIFY_WINDOW_MS);
      if (limited) return limited;
      const body = (await request.json().catch(() => null)) as {
        challenge?: unknown;
        solution?: unknown;
      } | null;
      const ticket = await redeemChallenge(env, body?.challenge, body?.solution);
      if (!ticket) {
        return Response.json(
          { error: "Die Prüfung ist fehlgeschlagen. Bitte versuche es erneut." },
          { status: 400, headers: NO_STORE },
        );
      }
      return Response.json(
        { enabled: true, ticket, expiresInMs: TICKET_TTL_MS },
        { headers: NO_STORE },
      );
    }

    // Neues Spiel anlegen → liefert Spiel-Code
    if (url.pathname === "/api/games" && request.method === "POST") {
      const unverified = await requireTicket(env, request);
      if (unverified) return unverified;
      const limited = await checkRateLimit(env, request, "create", CREATE_LIMIT, CREATE_WINDOW_MS);
      if (limited) return limited;

      // Code suchen, der noch frei ist
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = generateCode();
        const id = env.GAME_ROOM.idFromName(code);
        const stub = env.GAME_ROOM.get(id);
        const exists = await stub
          .fetch(new Request("http://internal/exists", { method: "GET" }))
          .then((r) => r.json() as Promise<{ exists: boolean }>);

        if (!exists.exists) {
          // Code reservieren, damit er nicht von einem Beitritt "erfunden" wird
          await stub.fetch(new Request("http://internal/create", { method: "POST" }));
          return Response.json({ code }, { headers: NO_STORE });
        }
      }
      return Response.json(
        { error: "Konnte keinen freien Code finden" },
        { status: 503, headers: NO_STORE },
      );
    }

    // Existiert dieser Spiel-Code? Der Client fragt das vor dem Beitreten ab,
    // damit ein Tippfehler eine klare Meldung gibt statt einen leeren Raum.
    const codeCheck = url.pathname.match(/^\/api\/games\/([A-Z0-9]{6})$/);
    if (codeCheck && request.method === "GET") {
      const unverified = await requireTicket(env, request);
      if (unverified) return unverified;
      const limited = await checkRateLimit(env, request, "lookup", LOOKUP_LIMIT, LOOKUP_WINDOW_MS);
      if (limited) return limited;

      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(codeCheck[1]));
      const { exists } = await stub
        .fetch(new Request("http://internal/exists", { method: "GET" }))
        .then((r) => r.json() as Promise<{ exists: boolean }>);
      return Response.json({ code: codeCheck[1], exists }, { headers: NO_STORE });
    }

    // Unbekannte API-Pfade bekommen JSON statt der SPA-HTML-Seite
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Unbekannter Endpunkt" }, { status: 404 });
    }

    // Bestehende Routen an den Client (SPA) oder Worker übergeben
    const roomMatch = url.pathname.match(/^\/room\/([A-Z0-9]{6})$/);
    if (roomMatch && request.headers.get("Upgrade") === "websocket") {
      // WebSocket-Upgrade für den Spiel-Raum
      const unverified = await requireTicket(env, request);
      if (unverified) return unverified;
      const limited = await checkRateLimit(env, request, "join", JOIN_LIMIT, JOIN_WINDOW_MS);
      if (limited) return limited;
      const code = roomMatch[1];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // Alle anderen Wege: statische Assets (die PWA), Fallback auf index.html
    return env.ASSETS.fetch(request);
  },
};

export default Sentry.withSentry<Env>(sentryOptions, handler);

// Die Raum-Klassen erben nicht von DurableObject; für die Sentry-Typen reicht diese Form.
type DurableObjectClass = new (state: DurableObjectState, env: Env) => DurableObject<Env>;

const GameRoomInstrumented = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions,
  GameRoom as unknown as DurableObjectClass,
);
const RateLimiterInstrumented = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions,
  RateLimiter as unknown as DurableObjectClass,
);

export { GameRoomInstrumented as GameRoom, RateLimiterInstrumented as RateLimiter };
