// Lösung der Rechenaufgabe (Proof-of-Work), im Worker oder als Rückfall im Hauptthread.

import { leadingZeroBits } from "@fang-x/shared";

/** Kandidaten pro Durchgang: parallel gehasht, das spart Wartezeit pro await. */
const BATCH_SIZE = 256;

export async function solveProofOfWork(challenge: string, difficulty: number): Promise<string> {
  const encoder = new TextEncoder();
  for (let start = 0; ; start += BATCH_SIZE) {
    const candidates = Array.from({ length: BATCH_SIZE }, (_, i) => (start + i).toString(36));
    const digests = await Promise.all(
      candidates.map((solution) =>
        crypto.subtle.digest("SHA-256", encoder.encode(`${challenge}:${solution}`)),
      ),
    );
    for (let i = 0; i < digests.length; i++) {
      if (leadingZeroBits(new Uint8Array(digests[i])) >= difficulty) return candidates[i];
    }
  }
}
