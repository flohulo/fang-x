import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, ObjectiveState, RevealEvent } from "@fang-x/shared";
import { circlePolygon } from "@fang-x/shared";
import type { Feature, Polygon } from "geojson";

const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

interface PlayerMarker {
  id: string;
  name: string;
  color: string;
  role: string;
  pos: LatLng | null;
}

interface MapViewProps {
  center: LatLng;
  playAreaRadiusMeters: number;
  players: PlayerMarker[];
  lastReveal: RevealEvent | null;
  objective: ObjectiveState | null;
  onMapClick?: (pos: LatLng) => void;
}

export function MapView({
  center,
  playAreaRadiusMeters,
  players,
  lastReveal,
  objective,
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const objectiveMarkerRef = useRef<Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Karte initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new NavigationControl(), "top-right");

    map.on("click", (e) => {
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Spielgebiet-Kreis zeichnen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addPlayArea = () => {
      if (map.getSource("play-area")) {
        (map.getSource("play-area") as GeoJSONSource).setData({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              circlePolygon(center, playAreaRadiusMeters).map(
                (p): [number, number] => [p.lng, p.lat]
              ),
            ],
          },
          properties: {},
        });
      } else {
        map.addSource("play-area", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                circlePolygon(center, playAreaRadiusMeters).map(
                  (p): [number, number] => [p.lng, p.lat]
                ),
              ],
            },
            properties: {},
          },
        });
        map.addLayer({
          id: "play-area-fill",
          type: "fill",
          source: "play-area",
          paint: { "fill-color": "#38bdf8", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "play-area-line",
          type: "line",
          source: "play-area",
          paint: { "line-color": "#38bdf8", "line-width": 2, "line-opacity": 0.6 },
        });
      }
    };

    if (map.isStyleLoaded()) addPlayArea();
    else map.on("load", addPlayArea);
  }, [center.lat, center.lng, playAreaRadiusMeters]);

  // X-Reveal-Kreis zeichnen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateReveal = () => {
      if (!lastReveal || lastReveal.radiusMeters <= 0) {
        if (map.getSource("x-reveal")) {
          (map.getSource("x-reveal") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
          });
        }
        return;
      }

      const data: Feature<Polygon> = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            circlePolygon(lastReveal.pos, lastReveal.radiusMeters).map(
              (p): [number, number] => [p.lng, p.lat]
            ),
          ],
        },
        properties: {},
      };

      if (map.getSource("x-reveal")) {
        (map.getSource("x-reveal") as GeoJSONSource).setData(data);
      } else {
        map.addSource("x-reveal", { type: "geojson", data });
        map.addLayer({
          id: "x-reveal-fill",
          type: "fill",
          source: "x-reveal",
          paint: { "fill-color": "#ef4444", "fill-opacity": 0.2 },
        });
        map.addLayer({
          id: "x-reveal-line",
          type: "line",
          source: "x-reveal",
          paint: { "line-color": "#ef4444", "line-width": 2 },
        });
      }
    };

    if (map.isStyleLoaded()) updateReveal();
    else map.on("load", updateReveal);
  }, [lastReveal]);

  // Spieler-Marker aktualisieren
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const activeIds = new Set<string>();

    for (const player of players) {
      if (!player.pos) continue;
      activeIds.add(player.id);

      let marker = markers.get(player.id);
      if (!marker) {
        const el = document.createElement("div");
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.borderRadius = "50%";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        el.style.background = player.color;

        marker = new Marker({ element: el })
          .setLngLat([player.pos.lng, player.pos.lat])
          .setPopup(new Popup().setText(player.name))
          .addTo(map);
        markers.set(player.id, marker);
      } else {
        marker.setLngLat([player.pos.lng, player.pos.lat]);
      }
    }

    // Entfernte Spieler-Marker entfernen
    for (const [id, marker] of markers) {
      if (!activeIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [players]);

  useEffect(() => {
    const map = mapRef.current;
    const target = objective?.target;
    if (!map || !target || objective.status === "PENDING") {
      objectiveMarkerRef.current?.remove();
      objectiveMarkerRef.current = null;
      return;
    }

    const marker = objectiveMarkerRef.current;
    if (marker) {
      marker.setLngLat([target.lng, target.lat]);
      marker.getElement().style.background =
        objective.status === "COMPLETED" ? "#22c55e" : "#f59e0b";
      marker.getPopup()?.setText(
        objective.status === "COMPLETED"
          ? "Missionsziel erreicht"
          : `Missionsziel · ${objective.radiusMeters} m`
      );
      return;
    }

    const el = document.createElement("div");
    el.textContent = "Z";
    el.setAttribute("aria-label", "Missionsziel");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.display = "grid";
    el.style.placeItems = "center";
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
    el.style.background = objective.status === "COMPLETED" ? "#22c55e" : "#f59e0b";
    el.style.color = "#0f172a";
    el.style.fontWeight = "800";

    objectiveMarkerRef.current = new Marker({ element: el })
      .setLngLat([target.lng, target.lat])
      .setPopup(
        new Popup().setText(
          objective.status === "COMPLETED"
            ? "Missionsziel erreicht"
            : `Missionsziel · ${objective.radiusMeters} m`
        )
      )
      .addTo(map);
  }, [objective]);

  // Karte zentrieren wenn sich Zentrum ändert
  useEffect(() => {
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 14 });
  }, [center.lat, center.lng]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
