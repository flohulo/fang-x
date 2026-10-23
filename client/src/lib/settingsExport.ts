// Export der Spieleinstellungen einer Runde als JSON-Datei.
// Der Startpunkt ist eine Ortskoordinate und gehört nicht in eine teilbare Datei.

import type { Ruleset } from "@fang-x/shared";

export interface SettingsExport {
  app: "Fang X";
  kind: "game-settings";
  exportedAt: string;
  gameCode: string;
  ruleset: Ruleset;
}

/** Baut den Inhalt der Exportdatei; der Startpunkt wird bewusst entfernt. */
export function buildSettingsExport(
  ruleset: Ruleset,
  gameCode: string,
  exportedAt = new Date(),
): SettingsExport {
  return {
    app: "Fang X",
    kind: "game-settings",
    exportedAt: exportedAt.toISOString(),
    gameCode,
    ruleset: {
      ...ruleset,
      map: { ...ruleset.map, startLocation: null },
    },
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "einstellungen";
}

/** Dateiname wie fang-x-klassisch-abc234-2026-10-23.json */
export function settingsExportFileName(
  ruleset: Ruleset,
  gameCode: string,
  exportedAt = new Date(),
): string {
  const day = [
    exportedAt.getFullYear(),
    String(exportedAt.getMonth() + 1).padStart(2, "0"),
    String(exportedAt.getDate()).padStart(2, "0"),
  ].join("-");
  const code = gameCode.trim().toLowerCase();
  const codePart = code ? `-${slugify(code)}` : "";
  return `fang-x-${slugify(ruleset.name)}${codePart}-${day}.json`;
}

/** Lädt die Einstellungen als JSON-Datei herunter. */
export function downloadSettingsExport(file: SettingsExport, fileName: string): void {
  const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
