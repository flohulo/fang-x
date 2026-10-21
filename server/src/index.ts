// Worker-Einstiegspunkt.
// Statische Assets (Client-PWA) + HTTP-Routen fürs Spielraum-Matchmaking.
// Die eigentliche Spiellogik lebt in der GameRoom-Durable-Object.

import { RateLimiter } from "./rate-limit";
import { GameRoom } from "./room";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  RATE_LIMIT: DurableObjectNamespace;
  ASSETS: Fetcher;
}

// 6-Buchstaben-Code ohne mehrdeutige Zeichen (kein I, O, 0, 1)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Grenzen pro IP-Adresse
const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60_000;
const LOOKUP_LIMIT = 60;
const LOOKUP_WINDOW_MS = 60_000;

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Neues Spiel anlegen → liefert Spiel-Code
    if (url.pathname === "/api/games" && request.method === "POST") {
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
      const code = roomMatch[1];
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // Alle anderen Wege: statische Assets (die PWA), Fallback auf index.html
    return env.ASSETS.fetch(request);
  },
};

export { GameRoom, RateLimiter };
