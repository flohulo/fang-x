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
  // Zufälliger Winkel, durchschnittlicher Versatz ~meters/2 (gut genug)
  const angle = Math.random() * 2 * Math.PI;
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
