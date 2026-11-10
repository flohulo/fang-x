import type { PlayerInfo } from "./protocol";
import { playAreaRadiusEstimate, type Ruleset } from "./ruleset";

export type PreGameCheckId =
  "noX" | "noDetective" | "disconnected" | "areaSmall" | "areaLarge" | "noHeadStart";

export interface PreGameCheck {
  id: PreGameCheckId;
  /** "blocker" verhindert den Start, "warning" lässt ihn nach Bestätigung zu. */
  severity: "blocker" | "warning";
  /** Werte für die Übersetzung. */
  params: Record<string, string | number>;
}

export const AREA_SMALL_METERS = 200;
export const AREA_LARGE_METERS = 5000;

/** Prüft Spieleinstellungen und Gruppe vor dem Start; rein, damit Client und Tests es teilen. */
export function evaluatePreGameChecks(
  ruleset: Ruleset,
  players: Pick<PlayerInfo, "name" | "wantsX" | "connected">[],
): PreGameCheck[] {
  const checks: PreGameCheck[] = [];
  if (!players.some((p) => p.wantsX)) {
    checks.push({ id: "noX", severity: "blocker", params: {} });
  }
  if (players.length > 0 && players.every((p) => p.wantsX)) {
    checks.push({ id: "noDetective", severity: "warning", params: {} });
  }
  const offline = players.filter((p) => !p.connected);
  if (offline.length > 0) {
    checks.push({
      id: "disconnected",
      severity: "warning",
      params: { count: offline.length, names: offline.map((p) => p.name).join(", ") },
    });
  }
  const radius = Math.round(playAreaRadiusEstimate(ruleset.map));
  if (radius < AREA_SMALL_METERS) {
    checks.push({ id: "areaSmall", severity: "warning", params: { meters: radius } });
  } else if (radius > AREA_LARGE_METERS) {
    checks.push({ id: "areaLarge", severity: "warning", params: { meters: radius } });
  }
  if (ruleset.game.headStartMinutes <= 0) {
    checks.push({ id: "noHeadStart", severity: "warning", params: {} });
  }
  return checks;
}
