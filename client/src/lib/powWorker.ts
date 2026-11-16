// Web Worker für die Menschen-Prüfung: sucht die Lösung der Rechenaufgabe,
// ohne den Hauptthread (Karte, Eingaben) zu blockieren.

import { solveProofOfWork } from "./proofOfWork";

self.onmessage = async (event: MessageEvent<{ challenge: string; difficulty: number }>) => {
  const { challenge, difficulty } = event.data;
  try {
    const solution = await solveProofOfWork(challenge, difficulty);
    self.postMessage({ solution });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
