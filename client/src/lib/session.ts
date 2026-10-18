// Lokale Sitzung: erlaubt Reconnect und Wiederaufnahme nach einem Reload.

const SESSION_KEY = "fangx:session";
const PLAYER_KEY_PREFIX = "fangx:player:";

export interface StoredSession {
  code: string;
  name: string;
  wantsX: boolean;
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

export function loadSession(): StoredSession | null {
  const raw = safeRead(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed?.code !== "string" || parsed.code.length !== 6) return null;
    return {
      code: parsed.code,
      name: typeof parsed.name === "string" ? parsed.name : "",
      wantsX: parsed.wantsX === true,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession) {
  safeWrite(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  safeRemove(SESSION_KEY);
}

export function loadPlayerId(code: string): string | null {
  return safeRead(PLAYER_KEY_PREFIX + code);
}

export function savePlayerId(code: string, playerId: string) {
  safeWrite(PLAYER_KEY_PREFIX + code, playerId);
}

export function clearPlayerId(code: string) {
  safeRemove(PLAYER_KEY_PREFIX + code);
}
