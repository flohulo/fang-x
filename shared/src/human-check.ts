// Menschen-Prüfung (Proof-of-Work): Regeln, die Client und Server teilen.
// Der Browser löst eine kleine Rechenaufgabe, der Server prüft sie und stellt
// ein signiertes Ticket aus. Ohne gültiges Ticket gibt es keinen Raum und keinen Beitritt.

/** Anzahl führender Null-Bits, die der SHA-256-Hash von "<challenge>:<lösung>" haben muss. */
export const HUMAN_CHECK_DIFFICULTY_BITS = 16;

/** Header, in dem das Ticket bei HTTP-Anfragen mitgeschickt wird. */
export const HUMAN_TICKET_HEADER = "X-Human-Ticket";

/**
 * Query-Parameter für das Ticket beim WebSocket-Aufbau. Veraltet: Die URL landet in Logs,
 * darum sendet der Client das Ticket als Subprotokoll. Der Server nimmt den Parameter
 * vorerst weiter an, damit bereits geöffnete ältere Clients nicht abbrechen.
 */
export const HUMAN_TICKET_PARAM = "ticket";

/**
 * Präfix des Subprotokolls (Sec-WebSocket-Protocol), in dem das Ticket beim WebSocket-Aufbau
 * mitgeschickt wird. Browser können bei WebSockets keine eigenen Header setzen.
 */
export const HUMAN_TICKET_PROTOCOL_PREFIX = "fangx-ticket.";

/** Sucht in einem Sec-WebSocket-Protocol-Header das Ticket-Subprotokoll (Angebot des Clients). */
export function findTicketProtocol(header: string | null): string | null {
  if (!header) return null;
  for (const entry of header.split(",")) {
    const protocol = entry.trim();
    if (protocol.startsWith(HUMAN_TICKET_PROTOCOL_PREFIX)) return protocol;
  }
  return null;
}

/** Fehlercode, wenn das Ticket fehlt oder abgelaufen ist. */
export const HUMAN_CHECK_ERROR_CODE = "HUMAN_CHECK_REQUIRED";

/** Schließcode, wenn der Server eine Verbindung wegen Missbrauchs trennt. */
export const WS_CLOSE_ABUSE = 4008;

/** Zählt die führenden Null-Bits eines Hashes. */
export function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}
