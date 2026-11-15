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

// Bereiche, die der Server für jedes Regelwerk erzwingt. Die Obergrenzen folgen
// docs/spielregeln.md. Die Untergrenzen sind technische Mindestwerte (kein NaN,
// keine Reveal-Schleife im Millisekundentakt); die UI empfiehlt engere Bereiche.
export const RULESET_LIMITS = {
  durationMinutes: [0.25, 480],
  headStartMinutes: [0, 30],
  overtimeMaxMinutes: [1, 120],
  countdownSeconds: [0, 60],
  firstRevealAfterMinutes: [0, 60],
  intervalMinutes: [0.05, 30],
  decreaseStepMinutes: [0, 30],
  revealRadiusMeters: [0, 5000],
  radiusShrinkStepMeters: [0, 5000],
  radiusFloorMeters: [0, 500],
  jitterMeters: [0, 500],
  catchRadiusMeters: [5, 1000],
  confirmSeconds: [0, 300],
  teamCatchRequired: [1, 10],
  maxSpeedKmh: [1, 500],
  speedCheckGraceSeconds: [0, 120],
  jumpDetectionMeters: [0, 5000],
  minUpdateSeconds: [5, 300],
  transitStops: [0, 999],
  xCount: [1, 5],
  detectiveTeamCount: [1, 5],
  playAreaRadiusMeters: [100, 20000],
  outOfBoundsGraceSeconds: [0, 120],
} as const satisfies Record<string, readonly [number, number]>;

export const RULESET_NAME_MAX_LENGTH = 60;

type LimitKey = keyof typeof RULESET_LIMITS;

// Endliche Zahl in den Bereich klemmen, sonst Default.
function num(value: unknown, key: LimitKey, fallback: number): number {
  const [min, max] = RULESET_LIMITS[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

// Wie num, aber auf ganze Zahlen gerundet.
function int(value: unknown, key: LimitKey, fallback: number): number {
  return Math.round(num(value, key, fallback));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const TRANSPORT_MODES: readonly TransportMode[] = ["WALK", "BIKE", "CAR", "TRANSIT"];

function transportModes(value: unknown, fallback: TransportMode[]): TransportMode[] {
  if (!Array.isArray(value)) return [...fallback];
  const modes = TRANSPORT_MODES.filter((mode) => value.includes(mode));
  return modes.length > 0 ? modes : [...fallback];
}

// Übernimmt nur lat/lng ohne Fremdschlüssel. Die Plausibilität prüft der Raum beim
// Konfigurieren, damit der Host eine verständliche Fehlermeldung bekommt.
function startLocation(value: unknown): LatLng | null {
  if (!value || typeof value !== "object") return null;
  const { lat, lng } = value as LatLng;
  return { lat, lng };
}

// Baut aus beliebigen Eingaben (Host-Nachricht, Snapshot, Import) ein gültiges
// Regelwerk. Jedes Feld wird einzeln geprüft und geklemmt, Fremdschlüssel fallen weg,
// fehlende oder ungültige Werte bekommen den Default.
export function mergeRuleset(partial?: unknown): Ruleset {
  const p = (partial && typeof partial === "object" ? partial : {}) as DeepPartial<Ruleset> & {
    profile?: string;
  };
  const legacyProfile = p.profile === "MR_X";
  const d = DEFAULT_RULESET;
  const game = p.game ?? {};
  const reveal = p.reveal ?? {};
  const c = p.catch ?? {};
  const movement = p.movement ?? {};
  const speed = movement.maxSpeedKmh ?? {};
  const budget = movement.xTransitBudget ?? {};
  const roles = p.roles ?? {};
  const win = p.win ?? {};
  const map = p.map ?? {};

  const randomMinMinutes = num(
    reveal.randomMinMinutes,
    "intervalMinutes",
    d.reveal.randomMinMinutes,
  );
  const revealRadiusMeters = int(
    reveal.revealRadiusMeters,
    "revealRadiusMeters",
    d.reveal.revealRadiusMeters,
  );

  return {
    schemaVersion: 1,
    name:
      !legacyProfile && typeof p.name === "string"
        ? p.name.slice(0, RULESET_NAME_MAX_LENGTH)
        : d.name,
    game: {
      durationMinutes: num(game.durationMinutes, "durationMinutes", d.game.durationMinutes),
      headStartMinutes: num(game.headStartMinutes, "headStartMinutes", d.game.headStartMinutes),
      overtimeEnabled: bool(game.overtimeEnabled, d.game.overtimeEnabled),
      overtimeMaxMinutes: num(
        game.overtimeMaxMinutes,
        "overtimeMaxMinutes",
        d.game.overtimeMaxMinutes,
      ),
      countdownSeconds: num(game.countdownSeconds, "countdownSeconds", d.game.countdownSeconds),
      pauseAllowed: bool(game.pauseAllowed, d.game.pauseAllowed),
      detectivesWaitDuringHeadStart: bool(game.detectivesWaitDuringHeadStart, legacyProfile),
    },
    reveal: {
      firstRevealAfterMinutes: num(
        reveal.firstRevealAfterMinutes,
        "firstRevealAfterMinutes",
        d.reveal.firstRevealAfterMinutes,
      ),
      intervalMinutes: num(reveal.intervalMinutes, "intervalMinutes", d.reveal.intervalMinutes),
      schedule: oneOf(reveal.schedule, ["FIXED", "DECREASING", "RANDOM"], d.reveal.schedule),
      decreaseStepMinutes: num(
        reveal.decreaseStepMinutes,
        "decreaseStepMinutes",
        d.reveal.decreaseStepMinutes,
      ),
      decreaseFloorMinutes: num(
        reveal.decreaseFloorMinutes,
        "intervalMinutes",
        d.reveal.decreaseFloorMinutes,
      ),
      randomMinMinutes,
      randomMaxMinutes: Math.max(
        randomMinMinutes,
        num(reveal.randomMaxMinutes, "intervalMinutes", d.reveal.randomMaxMinutes),
      ),
      revealRadiusMeters,
      radiusShrinkEnabled: bool(reveal.radiusShrinkEnabled, d.reveal.radiusShrinkEnabled),
      radiusShrinkStepMeters: int(
        reveal.radiusShrinkStepMeters,
        "radiusShrinkStepMeters",
        d.reveal.radiusShrinkStepMeters,
      ),
      radiusFloorMeters: Math.min(
        revealRadiusMeters,
        int(reveal.radiusFloorMeters, "radiusFloorMeters", d.reveal.radiusFloorMeters),
      ),
      showExactPoint: bool(reveal.showExactPoint, d.reveal.showExactPoint),
      jitterMeters: int(reveal.jitterMeters, "jitterMeters", d.reveal.jitterMeters),
      showTrail: oneOf(reveal.showTrail, ["NONE", "LAST3", "FULL"], d.reveal.showTrail),
      xSeesDetectives: oneOf(
        reveal.xSeesDetectives,
        ["ALWAYS", "ON_REVEAL", "NEVER"],
        d.reveal.xSeesDetectives,
      ),
      detectivesSeesXHistory: bool(reveal.detectivesSeesXHistory, d.reveal.detectivesSeesXHistory),
    },
    catch: {
      method:
        c.method === "PHOTO_CONFIRMATION" || (legacyProfile && !c.method)
          ? "PHOTO_CONFIRMATION"
          : "RADIUS",
      radiusMeters: int(c.radiusMeters, "catchRadiusMeters", d.catch.radiusMeters),
      confirmSeconds: int(c.confirmSeconds, "confirmSeconds", d.catch.confirmSeconds),
      teamCatchRequired: int(c.teamCatchRequired, "teamCatchRequired", d.catch.teamCatchRequired),
      anyDetectiveWins: bool(c.anyDetectiveWins, d.catch.anyDetectiveWins),
      xCanSurrender: bool(c.xCanSurrender, d.catch.xCanSurrender),
    },
    movement: {
      transportModes: transportModes(movement.transportModes, d.movement.transportModes),
      xTransportModes: transportModes(movement.xTransportModes, d.movement.xTransportModes),
      maxSpeedKmh: {
        WALK: num(speed.WALK, "maxSpeedKmh", d.movement.maxSpeedKmh.WALK),
        BIKE: num(speed.BIKE, "maxSpeedKmh", d.movement.maxSpeedKmh.BIKE),
        CAR: num(speed.CAR, "maxSpeedKmh", d.movement.maxSpeedKmh.CAR),
        TRANSIT: num(speed.TRANSIT, "maxSpeedKmh", d.movement.maxSpeedKmh.TRANSIT),
      },
      speedCheckGraceSeconds: int(
        movement.speedCheckGraceSeconds,
        "speedCheckGraceSeconds",
        d.movement.speedCheckGraceSeconds,
      ),
      jumpDetectionMeters: int(
        movement.jumpDetectionMeters,
        "jumpDetectionMeters",
        d.movement.jumpDetectionMeters,
      ),
      minUpdateSeconds: num(
        movement.minUpdateSeconds,
        "minUpdateSeconds",
        d.movement.minUpdateSeconds,
      ),
      xTransitBudget: {
        enabled: bool(budget.enabled, legacyProfile),
        busStops: Math.floor(
          num(budget.busStops, "transitStops", d.movement.xTransitBudget.busStops),
        ),
        trainStops: Math.floor(
          num(budget.trainStops, "transitStops", d.movement.xTransitBudget.trainStops),
        ),
      },
      detectivesShareLiveLocation: bool(movement.detectivesShareLiveLocation, legacyProfile),
    },
    roles: {
      xCount: int(roles.xCount, "xCount", d.roles.xCount),
      xCountAuto: bool(roles.xCountAuto, d.roles.xCountAuto),
      detectiveTeamCount: int(
        roles.detectiveTeamCount,
        "detectiveTeamCount",
        d.roles.detectiveTeamCount,
      ),
      rolesHiddenUntilCatch: bool(roles.rolesHiddenUntilCatch, d.roles.rolesHiddenUntilCatch),
    },
    win: {
      xWinsBySurvival: bool(win.xWinsBySurvival, d.win.xWinsBySurvival),
      drawEnabled: bool(win.drawEnabled, d.win.drawEnabled),
      suddenDeathEnabled: bool(win.suddenDeathEnabled, d.win.suddenDeathEnabled),
    },
    map: {
      playAreaRadiusMeters: int(
        map.playAreaRadiusMeters,
        "playAreaRadiusMeters",
        d.map.playAreaRadiusMeters,
      ),
      playAreaPolygon: sanitizePlayAreaPolygon(map.playAreaPolygon),
      startLocation: startLocation(map.startLocation),
      outOfBoundsEnabled: bool(map.outOfBoundsEnabled, d.map.outOfBoundsEnabled),
      outOfBoundsGraceSeconds: num(
        map.outOfBoundsGraceSeconds,
        "outOfBoundsGraceSeconds",
        d.map.outOfBoundsGraceSeconds,
      ),
      outOfBoundsPenalty: oneOf(
        map.outOfBoundsPenalty,
        ["LIVE_SHARE", "WARNING", "TELEPORT_BACK", "INSTANT_LOSS"],
        d.map.outOfBoundsPenalty,
      ),
      detectiveOutOfBoundsPenalty: oneOf(
        map.detectiveOutOfBoundsPenalty,
        ["NONE", "WARNING", "TELEPORT_BACK"],
        d.map.detectiveOutOfBoundsPenalty,
      ),
    },
    objective: {
      enabled: bool(p.objective?.enabled, d.objective.enabled),
    },
    privacy: {
      locationRetention: oneOf(
        p.privacy?.locationRetention,
        ["DELETE_AFTER_GAME", "KEEP_24H", "KEEP_7D"],
        d.privacy.locationRetention,
      ),
      replayEnabled: bool(p.privacy?.replayEnabled, d.privacy.replayEnabled),
      collectPlayerName: bool(p.privacy?.collectPlayerName, d.privacy.collectPlayerName),
    },
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
