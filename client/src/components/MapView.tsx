import {
  type GeoJSONSource,
  type IControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, ObjectiveState, RevealEvent } from "@fang-x/shared";
import { circlePolygon } from "@fang-x/shared";
import type { Feature, Polygon } from "geojson";

setWorkerUrl(mapLibreWorkerUrl);

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
// OpenFreeMap liefert Details bis Zoom 14; MapLibre vergrößert diese Kacheln
// darüber hinaus ohne zusätzliche, nicht vorhandene Kacheln anzufordern.
const MAP_MAX_ZOOM = 18;
const MAP_INITIAL_ZOOM = 15;

// Sentinel-2 cloudless 2025 von EOX::Maps (CC BY-NC-SA 4.0).
const SATELLITE_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";
const SATELLITE_MAX_ZOOM = 16;
const SATELLITE_ATTRIBUTION =
  "Sentinel-2 cloudless 2025 © EOX IT Services GmbH (CC BY-NC-SA 4.0)";
const SATELLITE_LAYER_ID = "satellite";
const SATELLITE_HIDDEN_LAYER_TYPES = new Set([
  "background",
  "fill",
  "fill-extrusion",
  "raster",
  "hillshade",
]);
// Diese Layer gehören zum Spiel und bleiben auch über der Satellitenkarte sichtbar.
const GAME_LAYER_IDS = new Set([
  "play-area-fill",
  "play-area-line",
  "x-reveal-fill",
  "x-reveal-line",
]);

class SatelliteControl implements IControl {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;

  constructor(private readonly onToggle: () => void) {}

  onAdd() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-satellite-btn";
    button.textContent = "Satellit";
    button.title = "Satellitenkarte anzeigen";
    button.setAttribute("aria-label", "Satellitenkarte anzeigen");
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", this.onToggle);

    container.appendChild(button);
    this.container = container;
    this.button = button;
    return container;
  }

  onRemove() {
    this.button?.removeEventListener("click", this.onToggle);
    this.container?.remove();
    this.container = null;
    this.button = null;
  }

  setActive(active: boolean) {
    if (!this.button) return;
    this.button.textContent = active ? "Karte" : "Satellit";
    this.button.classList.toggle("is-active", active);
    this.button.setAttribute("aria-pressed", String(active));
    const label = active ? "Straßenkarte anzeigen" : "Satellitenkarte anzeigen";
    this.button.title = label;
    this.button.setAttribute("aria-label", label);
  }
}

function applySatelliteMode(
  map: MapLibreMap,
  enabled: boolean,
  baseVisibility: Map<string, "visible" | "none">,
) {
  if (!map.getSource(SATELLITE_LAYER_ID)) {
    map.addSource(SATELLITE_LAYER_ID, {
      type: "raster",
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: SATELLITE_MAX_ZOOM,
      attribution: SATELLITE_ATTRIBUTION,
    });
  }

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    const layers = map.getStyle().layers ?? [];
    const firstContentLayer = layers.find((layer) => layer.type !== "background")?.id;
    map.addLayer(
      {
        id: SATELLITE_LAYER_ID,
        type: "raster",
        source: SATELLITE_LAYER_ID,
        layout: { visibility: "none" },
      },
      firstContentLayer,
    );
  }

  const layers = map.getStyle().layers ?? [];
  if (baseVisibility.size === 0) {
    for (const layer of layers) {
      if (layer.id === SATELLITE_LAYER_ID || GAME_LAYER_IDS.has(layer.id)) continue;
      const original: "visible" | "none" =
        layer.layout?.visibility === "none" ? "none" : "visible";
      baseVisibility.set(layer.id, original);
    }
  }

  for (const layer of layers) {
    if (layer.id === SATELLITE_LAYER_ID || GAME_LAYER_IDS.has(layer.id)) continue;
    const original = baseVisibility.get(layer.id) ?? "visible";
    const hide = enabled && SATELLITE_HIDDEN_LAYER_TYPES.has(layer.type);
    map.setLayoutProperty(layer.id, "visibility", hide ? "none" : original);
  }

  map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", enabled ? "visible" : "none");
}

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
  onSatelliteChange?: (enabled: boolean) => void;
}

export function MapView({
  center,
  playAreaRadiusMeters,
  players,
  lastReveal,
  objective,
  onMapClick,
  onSatelliteChange,
}: MapViewProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const objectiveMarkerRef = useRef<Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onSatelliteChangeRef = useRef(onSatelliteChange);
  onSatelliteChangeRef.current = onSatelliteChange;
  const baseVisibilityRef = useRef<Map<string, "visible" | "none">>(new Map());
  const satelliteControlRef = useRef<SatelliteControl | null>(null);
  const [satelliteOn, setSatelliteOn] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const toggleSatelliteRef = useRef<() => void>(() => {});
  toggleSatelliteRef.current = () => setSatelliteOn((on) => !on);

  // Karte initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: MAP_INITIAL_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    });

    map.addControl(new NavigationControl(), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "top-left");

    const satelliteControl = new SatelliteControl(() => toggleSatelliteRef.current());
    map.addControl(satelliteControl, "top-right");
    satelliteControlRef.current = satelliteControl;

    // OpenFreeMap enthält die OpenStreetMap-Wanderwege bereits. Im Liberty-Stil
    // werden sie jedoch sehr dezent dargestellt; für das Spiel heben wir sie hervor.
    map.on("load", () => {
      setMapReady(true);
      if (!map.getLayer("road_path_pedestrian")) return;
      map.setPaintProperty("road_path_pedestrian", "line-color", "#8a4b08");
      map.setPaintProperty("road_path_pedestrian", "line-width", 2.5);
      map.setPaintProperty("road_path_pedestrian", "line-dasharray", [1.5, 1.5]);
    });

    map.on("click", (e) => {
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      satelliteControlRef.current = null;
    };
  }, []);

  // Satellitenkarte ein-/ausschalten, sobald der Stil geladen ist.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applySatelliteMode(map, satelliteOn, baseVisibilityRef.current);
    satelliteControlRef.current?.setActive(satelliteOn);
    onSatelliteChangeRef.current?.(satelliteOn);
  }, [satelliteOn, mapReady]);

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
              circlePolygon(center, playAreaRadiusMeters).map((p): [number, number] => [
                p.lng,
                p.lat,
              ]),
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
                circlePolygon(center, playAreaRadiusMeters).map((p): [number, number] => [
                  p.lng,
                  p.lat,
                ]),
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
            circlePolygon(lastReveal.pos, lastReveal.radiusMeters).map((p): [number, number] => [
              p.lng,
              p.lat,
            ]),
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
      marker
        .getPopup()
        ?.setText(
          objective.status === "COMPLETED"
            ? "Missionsziel erreicht"
            : `Missionsziel · ${objective.radiusMeters} m`,
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
            : `Missionsziel · ${objective.radiusMeters} m`,
        ),
      )
      .addTo(map);
  }, [objective]);

  // Karte zentrieren wenn sich Zentrum ändert
  useEffect(() => {
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: MAP_INITIAL_ZOOM });
  }, [center.lat, center.lng]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
