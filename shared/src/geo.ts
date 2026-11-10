// Geo-Berechnungen für das Fangspiel (Haversine etc.)

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Distanz in Metern zwischen zwei Punkten
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

// Punkt um `meters` in zufälliger Richtung verschieben (für Reveal-Jitter)
export function jitterPoint(p: LatLng, meters: number): LatLng {
  // Zufälliger Winkel in Grad (destinationPoint erwartet Grad, nicht Bogenmaß)
  const angle = Math.random() * 360;
  const dist = Math.random() * meters;
  return destinationPoint(p, angle, dist);
}

// Punkt von `from` aus in Richtung `bearingDeg` um `meters` verschieben
export function destinationPoint(from: LatLng, bearingDeg: number, meters: number): LatLng {
  const d = meters / EARTH_RADIUS_M;
  const brg = toRad(bearingDeg);
  const lat1 = toRad(from.lat);
  const lng1 = toRad(from.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// Kreis als Polygon für die Kartendarstellung (MapLibre Fill/Line)
export function circlePolygon(center: LatLng, radiusMeters: number, points = 64): LatLng[] {
  const coords: LatLng[] = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 360;
    coords.push(destinationPoint(center, bearing, radiusMeters));
  }
  return coords;
}

// Lokale Näherung (Meter) um einen Bezugspunkt; für Spielfelder von wenigen Kilometern genau genug.
function toLocalMeters(origin: LatLng, p: LatLng): { x: number; y: number } {
  return {
    x: toRad(p.lng - origin.lng) * Math.cos(toRad(origin.lat)) * EARTH_RADIUS_M,
    y: toRad(p.lat - origin.lat) * EARTH_RADIUS_M,
  };
}

// Liegt der Punkt innerhalb des Polygons? (Even-Odd-Regel, Polygon ohne Wiederholung des ersten Punkts)
export function pointInPolygon(p: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.lat > p.lat !== b.lat > p.lat) {
      const lngAtLat = ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng;
      if (p.lng < lngAtLat) inside = !inside;
    }
  }
  return inside;
}

// Kürzester Abstand des Punkts zum Polygonrand in Metern.
export function distanceToPolygonEdgeMeters(p: LatLng, polygon: LatLng[]): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = toLocalMeters(p, polygon[i]);
    const b = toLocalMeters(p, polygon[(i + 1) % polygon.length]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lenSq));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  }
  return best;
}

// Schwerpunkt der Eckpunkte (für Kartenausschnitt und grobe Abschätzungen).
export function polygonCenter(polygon: LatLng[]): LatLng {
  const sum = polygon.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / polygon.length, lng: sum.lng / polygon.length };
}

// Radius eines flächengleichen Kreises in Metern (Näherung für Mindestabstände u. Ä.).
export function polygonEquivalentRadiusMeters(polygon: LatLng[]): number {
  const origin = polygonCenter(polygon);
  const pts = polygon.map((p) => toLocalMeters(origin, p));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.sqrt(Math.abs(area) / 2 / Math.PI);
}
