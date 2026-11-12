// Gemeinsame Bereinigung für Fehlerberichte (GlitchTip) in Client und Server.
// Fehlerberichte dürfen keine Standortdaten, Nutzerdaten oder Spiel-Codes enthalten.

const REMOVED = "[entfernt]";

// Schlüssel, deren Werte Standorte enthalten können.
const LOCATION_KEY =
  /^(lat|lng|lon|long|latitude|longitude|coords?|position|positions|location|center|origin|start|startpoint|bonus|target|geo.*)$/i;

// Spiel-Codes stehen in Pfaden (/room/ABC123, /api/games/ABC123) und gelten als geheim.
const GAME_CODE_PATH = /\/(room|games)\/[A-Z0-9]{6}\b/g;

function scrubString(value: string): string {
  return value.replace(GAME_CODE_PATH, "/$1/:code");
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 8) return REMOVED;

  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    result[key] = LOCATION_KEY.test(key) ? REMOVED : scrubValue(inner, depth + 1);
  }
  return result;
}

/**
 * Bereinigt ein Fehlerereignis vor dem Senden: entfernt Nutzer-, Header- und Cookie-Daten sowie
 * alle Breadcrumbs, schwärzt Standort-Schlüssel und ersetzt Spiel-Codes in Pfaden.
 */
export function scrubErrorEvent<T extends object>(event: T): T {
  const copy = { ...event } as Record<string, unknown>;

  delete copy.user;
  delete copy.breadcrumbs;
  delete copy.server_name;

  const request = copy.request;
  if (request && typeof request === "object") {
    const { headers, cookies, data, query_string, env, ...rest } = request as Record<
      string,
      unknown
    >;
    void headers;
    void cookies;
    void data;
    void query_string;
    void env;
    copy.request = rest;
  }

  return scrubValue(copy, 0) as T;
}
