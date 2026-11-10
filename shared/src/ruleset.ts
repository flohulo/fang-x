// Regelwerk-Schema — kanonisch nach docs/spielregeln.md (v1.1)
// Regeln sind Daten, kein Code. Jeder Parameter: Typ, Bereich, Default.
//
// Vom Server noch nicht ausgewertet (reserviert fürs Schema): overtime*, pauseAllowed,
// speedCheckGraceSeconds, jumpDetectionMeters, maxSpeedKmh, detectiveOutOfBoundsPenalty,
// anyDetectiveWins, win.*, roles.* außer xCount-Zuordnung über wantsX, privacy.*.
// TELEPORT_BACK wirkt wie WARNING: der Server kann niemanden versetzen.

import type { LatLng } from "./geo";
import {
  distanceMeters,
  distanceToPolygonEdgeMeters,
  pointInPolygon,
  polygonEquivalentRadiusMeters,
} from "./geo";

export type TransportMode = "WALK" | "BIKE" | "CAR" | "TRANSIT";
export type RevealSchedule = "FIXED" | "DECREASING" | "RANDOM";
export type ShowTrail = "NONE" | "LAST3" | "FULL";
export type XSeesDetectives = "ALWAYS" | "ON_REVEAL" | "NEVER";
export type OutOfBoundsPenalty = "LIVE_SHARE" | "WARNING" | "TELEPORT_BACK" | "INSTANT_LOSS";
export type DetectiveOutOfBoundsPenalty = "NONE" | "WARNING" | "TELEPORT_BACK";
export type CatchMethod = "RADIUS" | "PHOTO_CONFIRMATION";

export interface Ruleset {
  schemaVersion: number;
  name: string;
  game: {
    durationMinutes: number;
    headStartMinutes: number;
    overtimeEnabled: boolean;
    overtimeMaxMinutes: number;
    countdownSeconds: number;
    pauseAllowed: boolean;
    detectivesWaitDuringHeadStart: boolean;
  };
  reveal: {
    firstRevealAfterMinutes: number;
    intervalMinutes: number;
    schedule: RevealSchedule;
    decreaseStepMinutes: number;
    decreaseFloorMinutes: number;
    randomMinMinutes: number;
    randomMaxMinutes: number;
    revealRadiusMeters: number;
    radiusShrinkEnabled: boolean;
    radiusShrinkStepMeters: number;
    radiusFloorMeters: number;
    showExactPoint: boolean;
    jitterMeters: number;
    showTrail: ShowTrail;
    xSeesDetectives: XSeesDetectives;
    detectivesSeesXHistory: boolean;
  };
  catch: {
    method: CatchMethod;
    radiusMeters: number;
    confirmSeconds: number;
    teamCatchRequired: number;
    anyDetectiveWins: boolean;
    xCanSurrender: boolean;
  };
  movement: {
    transportModes: TransportMode[];
    xTransportModes: TransportMode[];
    maxSpeedKmh: Record<TransportMode, number>;
    speedCheckGraceSeconds: number;
    jumpDetectionMeters: number;
    minUpdateSeconds: number;
    xTransitBudget: {
      enabled: boolean;
      busStops: number;
      trainStops: number;
    };
    detectivesShareLiveLocation: boolean;
  };
  roles: {
    xCount: number;
    xCountAuto: boolean;
    detectiveTeamCount: number;
    rolesHiddenUntilCatch: boolean;
  };
  win: {
    xWinsBySurvival: boolean;
    drawEnabled: boolean;
    suddenDeathEnabled: boolean;
  };
  map: {
    playAreaRadiusMeters: number;
    /** Frei gezeichnetes Spielfeld (Eckpunkte). Ist es gesetzt, ersetzt es den Kreis. */
    playAreaPolygon: LatLng[] | null;
    startLocation: LatLng | null;
    outOfBoundsEnabled: boolean;
    outOfBoundsGraceSeconds: number;
    outOfBoundsPenalty: OutOfBoundsPenalty;
    detectiveOutOfBoundsPenalty: DetectiveOutOfBoundsPenalty;
  };
  objective: {
    enabled: boolean;
  };
  privacy: {
    locationRetention: "DELETE_AFTER_GAME" | "KEEP_24H" | "KEEP_7D";
    replayEnabled: boolean;
    collectPlayerName: boolean;
  };
}

// Default-Ruleset "Klassisch" — Original-treu
export const DEFAULT_RULESET: Ruleset = {
  schemaVersion: 1,
  name: "Klassisch",
  game: {
    durationMinutes: 30,
    headStartMinutes: 2,
    overtimeEnabled: false,
    overtimeMaxMinutes: 10,
    countdownSeconds: 10,
    pauseAllowed: false,
    detectivesWaitDuringHeadStart: false,
  },
  reveal: {
    firstRevealAfterMinutes: 3,
    intervalMinutes: 3,
    schedule: "FIXED",
    decreaseStepMinutes: 0.5,
    decreaseFloorMinutes: 1,
    randomMinMinutes: 2,
    randomMaxMinutes: 5,
    revealRadiusMeters: 5,
    radiusShrinkEnabled: false,
    radiusShrinkStepMeters: 100,
    radiusFloorMeters: 5,
    showExactPoint: true,
    jitterMeters: 0,
    showTrail: "LAST3",
    xSeesDetectives: "ON_REVEAL",
    detectivesSeesXHistory: true,
  },
  catch: {
    method: "RADIUS",
    radiusMeters: 30,
    confirmSeconds: 0,
    teamCatchRequired: 1,
    anyDetectiveWins: true,
    xCanSurrender: true,
  },
  movement: {
    transportModes: ["WALK"],
    xTransportModes: ["WALK"],
    maxSpeedKmh: { WALK: 6, BIKE: 25, CAR: 130, TRANSIT: 100 },
    speedCheckGraceSeconds: 30,
    jumpDetectionMeters: 300,
    minUpdateSeconds: 15,
    xTransitBudget: {
      enabled: false,
      busStops: 10,
      trainStops: 2,
    },
    detectivesShareLiveLocation: false,
  },
  roles: {
    xCount: 1,
    xCountAuto: true,
    detectiveTeamCount: 1,
    rolesHiddenUntilCatch: false,
  },
  win: {
    xWinsBySurvival: true,
    drawEnabled: false,
    suddenDeathEnabled: false,
  },
  map: {
    playAreaRadiusMeters: 700,
    playAreaPolygon: null,
    startLocation: null,
    outOfBoundsEnabled: true,
    outOfBoundsGraceSeconds: 15,
    outOfBoundsPenalty: "LIVE_SHARE",
    detectiveOutOfBoundsPenalty: "NONE",
  },
  objective: {
    enabled: false,
  },
  privacy: {
    locationRetention: "DELETE_AFTER_GAME",
    replayEnabled: false,
    collectPlayerName: false,
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

// Kombiniert ein partielles Ruleset rekursiv mit den Defaults.
// Unbekannte Schlüssel werden ignoriert, fehlende mit Default gefüllt.
export function mergeRuleset(
  partial?: (DeepPartial<Ruleset> & { profile?: string }) | null,
): Ruleset {
  const p = partial ?? {};
  const legacyProfile = p.profile === "MR_X";
  return {
    schemaVersion: 1,
    name: legacyProfile
      ? DEFAULT_RULESET.name
      : typeof p.name === "string"
        ? p.name
        : DEFAULT_RULESET.name,
    game: {
      ...DEFAULT_RULESET.game,
      ...(p.game ?? {}),
      detectivesWaitDuringHeadStart: p.game?.detectivesWaitDuringHeadStart ?? legacyProfile,
    },
    reveal: { ...DEFAULT_RULESET.reveal, ...(p.reveal ?? {}) },
    catch: {
      ...DEFAULT_RULESET.catch,
      ...(p.catch ?? {}),
      method:
        p.catch?.method === "PHOTO_CONFIRMATION" || (legacyProfile && !p.catch?.method)
          ? "PHOTO_CONFIRMATION"
          : "RADIUS",
    },
    movement: {
      ...DEFAULT_RULESET.movement,
      ...(p.movement ?? {}),
      transportModes:
        (p.movement?.transportModes as TransportMode[] | undefined) ??
        DEFAULT_RULESET.movement.transportModes,
      xTransportModes:
        (p.movement?.xTransportModes as TransportMode[] | undefined) ??
        DEFAULT_RULESET.movement.xTransportModes,
      maxSpeedKmh: {
        ...DEFAULT_RULESET.movement.maxSpeedKmh,
        ...(p.movement?.maxSpeedKmh ?? {}),
      },
      xTransitBudget: {
        ...DEFAULT_RULESET.movement.xTransitBudget,
        ...(p.movement?.xTransitBudget ?? {}),
        enabled: p.movement?.xTransitBudget?.enabled ?? legacyProfile,
        busStops: nonNegativeInteger(
          p.movement?.xTransitBudget?.busStops,
          DEFAULT_RULESET.movement.xTransitBudget.busStops,
        ),
        trainStops: nonNegativeInteger(
          p.movement?.xTransitBudget?.trainStops,
          DEFAULT_RULESET.movement.xTransitBudget.trainStops,
        ),
      },
      detectivesShareLiveLocation: p.movement?.detectivesShareLiveLocation ?? legacyProfile,
    },
    roles: {
      ...DEFAULT_RULESET.roles,
      ...(p.roles ?? {}),
    },
    win: { ...DEFAULT_RULESET.win, ...(p.win ?? {}) },
    map: {
      ...DEFAULT_RULESET.map,
      ...(p.map ?? {}),
      startLocation: p.map?.startLocation ?? DEFAULT_RULESET.map.startLocation,
      playAreaPolygon: sanitizePlayAreaPolygon(p.map?.playAreaPolygon),
    },
    objective: { ...DEFAULT_RULESET.objective, ...(p.objective ?? {}) },
    privacy: { ...DEFAULT_RULESET.privacy, ...(p.privacy ?? {}) },
  };
}

export const PLAY_AREA_POLYGON_MIN_POINTS = 3;
export const PLAY_AREA_POLYGON_MAX_POINTS = 50;
/** Maximale Ausdehnung eines gezeichneten Spielfelds (Abstand zum ersten Eckpunkt). */
export const PLAY_AREA_POLYGON_MAX_EXTENT_METERS = 40000;

// Übernimmt nur ein plausibles Polygon, sonst null (= Kreis wie bisher).
export function sanitizePlayAreaPolygon(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length < PLAY_AREA_POLYGON_MIN_POINTS || raw.length > PLAY_AREA_POLYGON_MAX_POINTS) {
    return null;
  }
  const points: LatLng[] = [];
  for (const item of raw) {
    const lat = (item as LatLng | null)?.lat;
    const lng = (item as LatLng | null)?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return null;
    }
    points.push({ lat, lng });
  }
  const tooWide = points.some(
    (p) => distanceMeters(points[0], p) > PLAY_AREA_POLYGON_MAX_EXTENT_METERS,
  );
  return tooWide ? null : points;
}

type PlayAreaSettings = Pick<Ruleset["map"], "playAreaRadiusMeters" | "playAreaPolygon">;

// Liegt die Position im Spielfeld? Ohne Polygon zählt der Kreis um `center`.
export function isInsidePlayArea(
  map: PlayAreaSettings,
  center: LatLng | null,
  pos: LatLng,
): boolean {
  const meters = metersToPlayAreaEdge(map, center, pos);
  return meters === null || meters >= 0;
}

// Abstand zum Spielfeldrand in Metern: positiv innen, negativ außen.
// null, wenn weder Polygon noch Mittelpunkt bekannt sind.
export function metersToPlayAreaEdge(
  map: PlayAreaSettings,
  center: LatLng | null,
  pos: LatLng,
): number | null {
  if (map.playAreaPolygon) {
    const edge = distanceToPolygonEdgeMeters(pos, map.playAreaPolygon);
    return pointInPolygon(pos, map.playAreaPolygon) ? edge : -edge;
  }
  if (!center) return null;
  return map.playAreaRadiusMeters - distanceMeters(pos, center);
}

// Radius des Spielfelds bzw. eines flächengleichen Kreises.
export function playAreaRadiusEstimate(map: PlayAreaSettings): number {
  return map.playAreaPolygon
    ? polygonEquivalentRadiusMeters(map.playAreaPolygon)
    : map.playAreaRadiusMeters;
}
