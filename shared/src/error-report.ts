// Gemeinsame Bereinigung für Fehlerberichte (GlitchTip) in Client und Server.
// Fehlerberichte dürfen keine Standortdaten, Nutzerdaten oder Spiel-Codes enthalten.

const REMOVED = "[entfernt]";

// Schlüssel, deren Werte Standorte enthalten können.
const LOCATION_KEY =
  /^(lat|lng|lon|long|latitude|longitude|coords?|pos|positions?|statpos|location|startlocation|center|mapcenter|playarea.*|polygon|points|origin|start|startpoint|bonus|target|geo.*)$/i;

// Schlüssel mit Geheimnissen (Reconnect-Token, Ticket der Menschen-Prüfung).
const SECRET_KEY = /^(token|ticket)$/i;
// Ein Wert unter "code" ist ein Spiel-Code, wenn er genau so aussieht; Fehlercodes bleiben.
const GAME_CODE_VALUE = /^[A-Z0-9]{6}$/;

// Spiel-Codes stehen in Pfaden (/room/ABC123, /api/games/ABC123) und gelten als geheim.
const GAME_CODE_PATH = /\/(room|games)\/[A-Z0-9]{6}\b/g;

// Spiel-Codes, Tickets und Tokens in Query-Strings (?code=ABC234 aus Einladungslinks).
const SECRET_QUERY = /([?&])(code|ticket|token)=[^&#\s]*/gi;

function scrubString(value: string): string {
  return value.replace(GAME_CODE_PATH, "/$1/:code").replace(SECRET_QUERY, "$1$2=:entfernt");
}

// Reduziert eine URL auf Herkunft und Pfad; Query und Fragment fallen weg.
function stripUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 8) return REMOVED;

  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    result[key] =
      LOCATION_KEY.test(key) ||
      (SECRET_KEY.test(key) && typeof inner === "string") ||
      (key === "code" && typeof inner === "string" && GAME_CODE_VALUE.test(inner))
        ? REMOVED
        : scrubValue(inner, depth + 1);
  }
  return result;
}

/**
 * Bereinigt ein Fehlerereignis vor dem Senden: entfernt Nutzer-, Header- und Cookie-Daten sowie
 * alle Breadcrumbs, kürzt die Request-URL auf den Pfad, schwärzt Standort- und Geheimnis-Schlüssel
 * und ersetzt Spiel-Codes, Tickets und Tokens in Pfaden und Query-Strings.
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
    copy.request = "url" in rest ? { ...rest, url: stripUrl(rest.url) } : rest;
  }

  return scrubValue(copy, 0) as T;
}
