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
import type { LatLng, ObjectiveState, RevealEvent, TeamMarker } from "@fang-x/shared";
import { circlePolygon } from "@fang-x/shared";
import type { Feature, Polygon } from "geojson";
import i18n from "../i18n";

setWorkerUrl(mapLibreWorkerUrl);

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
// OpenFreeMap liefert Details bis Zoom 14; MapLibre vergrössert diese Kacheln
// darüber hinaus ohne zusätzliche, nicht vorhandene Kacheln anzufordern.
const MAP_MAX_ZOOM = 18;
const MAP_INITIAL_ZOOM = 15;

// Sentinel-2 cloudless 2025 von EOX::Maps (CC BY-NC-SA 4.0).
const SATELLITE_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";
const SATELLITE_MAX_ZOOM = 16;
const SATELLITE_ATTRIBUTION = "Sentinel-2 cloudless 2025 © EOX IT Services GmbH (CC BY-NC-SA 4.0)";
const SATELLITE_LAYER_ID = "satellite";

// Amtliches Orthofoto der Schweiz (SWISSIMAGE 10 cm) von swisstopo.
// Liegt über Sentinel-2 und liefert bei Nahaufnahmen echte Details.
// Freie Geodaten des Bundes (OGD), Quellenangabe erforderlich.
const SWISS_ORTHO_TILES =
  "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg";
const SWISS_ORTHO_LAYER_ID = "swiss-ortho";
const SWISS_ORTHO_MIN_ZOOM = 13;
const SWISS_ORTHO_MAX_ZOOM = 19;
// Schweiz inklusive Randstreifen; ausserhalb bleibt Sentinel-2 sichtbar.
const SWISS_ORTHO_BOUNDS: [number, number, number, number] = [5.8, 45.7, 10.6, 47.9];
const SWISS_ORTHO_ATTRIBUTION = "© swisstopo (SWISSIMAGE)";

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
  private active = false;

  constructor(private readonly onToggle: () => void) {}

  onAdd() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-satellite-btn";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", this.onToggle);

    container.appendChild(button);
    this.container = container;
    this.button = button;
    this.render();
    i18n.on("languageChanged", this.render);
    return container;
  }

  onRemove() {
    i18n.off("languageChanged", this.render);
    this.button?.removeEventListener("click", this.onToggle);
    this.container?.remove();
    this.container = null;
    this.button = null;
  }

  setActive(active: boolean) {
    this.active = active;
    this.render();
  }

  private readonly render = () => {
    if (!this.button) return;
    const active = this.active;
    this.button.textContent = active ? i18n.t("map.streetMap") : i18n.t("map.satellite");
    this.button.classList.toggle("is-active", active);
    this.button.setAttribute("aria-pressed", String(active));
    const label = active ? i18n.t("map.showStreetMap") : i18n.t("map.showSatellite");
    this.button.title = label;
    this.button.setAttribute("aria-label", label);
  };
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

  // Referenz-Layer für die Einordnung: unter den Beschriftungen, über dem Hintergrund.
  const referenceLayer = (map.getStyle().layers ?? []).find(
    (layer) =>
      layer.type !== "background" &&
      layer.id !== SATELLITE_LAYER_ID &&
      layer.id !== SWISS_ORTHO_LAYER_ID,
  )?.id;

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    map.addLayer(
      {
        id: SATELLITE_LAYER_ID,
        type: "raster",
        source: SATELLITE_LAYER_ID,
        layout: { visibility: "none" },
      },
      referenceLayer,
    );
  }

  // Hochauflösendes Schweizer Luftbild über Sentinel-2 einblenden.
  if (!map.getSource(SWISS_ORTHO_LAYER_ID)) {
    map.addSource(SWISS_ORTHO_LAYER_ID, {
      type: "raster",
      tiles: [SWISS_ORTHO_TILES],
      tileSize: 256,
      minzoom: SWISS_ORTHO_MIN_ZOOM,
      maxzoom: SWISS_ORTHO_MAX_ZOOM,
      bounds: SWISS_ORTHO_BOUNDS,
      attribution: SWISS_ORTHO_ATTRIBUTION,
    });
  }
  if (!map.getLayer(SWISS_ORTHO_LAYER_ID)) {
    map.addLayer(
      {
        id: SWISS_ORTHO_LAYER_ID,
        type: "raster",
        source: SWISS_ORTHO_LAYER_ID,
        layout: { visibility: "none" },
      },
      referenceLayer,
    );
  }
  // Sicherstellen, dass das Schweizer Luftbild über Sentinel-2 liegt.
  map.moveLayer(SWISS_ORTHO_LAYER_ID, referenceLayer);

  const layers = map.getStyle().layers ?? [];
  if (baseVisibility.size === 0) {
    for (const layer of layers) {
      if (
        layer.id === SATELLITE_LAYER_ID ||
        layer.id === SWISS_ORTHO_LAYER_ID ||
        GAME_LAYER_IDS.has(layer.id)
      )
        continue;
      const original: "visible" | "none" = layer.layout?.visibility === "none" ? "none" : "visible";
      baseVisibility.set(layer.id, original);
    }
  }

  for (const layer of layers) {
    if (
      layer.id === SATELLITE_LAYER_ID ||
      layer.id === SWISS_ORTHO_LAYER_ID ||
      GAME_LAYER_IDS.has(layer.id)
    )
      continue;
    const original = baseVisibility.get(layer.id) ?? "visible";
    const hide = enabled && SATELLITE_HIDDEN_LAYER_TYPES.has(layer.type);
    map.setLayoutProperty(layer.id, "visibility", hide ? "none" : original);
  }

  map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", enabled ? "visible" : "none");
  map.setLayoutProperty(SWISS_ORTHO_LAYER_ID, "visibility", enabled ? "visible" : "none");
}

interface PlayerMarker {
  id: string;
  name: string;
  color: string;
  role: string;
  pos: LatLng | null;
  /** Zeitpunkt (ms) der letzten Standort-Synchronisierung. */
  syncedAt?: number | null;
  /** Der eigene Standort wird immer gezeigt und besonders gekennzeichnet. */
  isSelf?: boolean;
}

function formatTime(ms: number, seconds = false) {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgIcon(paths: string[], size: number) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

// Person (eigener Standort) und Fadenkreuz (Pin von X).
const PERSON_ICON = ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"];
// Fadenkreuz mit grossem Ring, damit die Nummer in der Mitte Platz hat.
const CROSSHAIR_ICON = [
  "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  "M12 0.5v3",
  "M12 20.5v3",
  "M0.5 12h3",
  "M20.5 12h3",
];

function pinElement(background: string, label: string, index?: number) {
  const el = document.createElement("div");
  el.className = "x-pin";
  el.style.setProperty("--pin-color", background);
  el.setAttribute("aria-label", label);
  const icon = document.createElement("span");
  icon.appendChild(svgIcon(CROSSHAIR_ICON, 26));
  if (index && index > 0) {
    const number = document.createElement("b");
    number.textContent = String(index);
    icon.appendChild(number);
  }
  el.appendChild(icon);
  return el;
}

interface MapViewProps {
  center: LatLng;
  playAreaRadiusMeters: number;
  /** Frei gezeichnetes Spielfeld; ersetzt den Kreis, wenn gesetzt. */
  playAreaPolygon?: LatLng[] | null;
  players: PlayerMarker[];
  lastReveal: RevealEvent | null;
  /** Bisherige Pings von X (nur für X selbst) — nummerierte Marker mit Radius. */
  pingHistory?: RevealEvent[];
  /** true: Pings von X selbst ("Ping 3"); false: frühere Sichtungen von X für Detektive. */
  pingHistoryIsOwn?: boolean;
  objective: ObjectiveState | null;
  /** Markierungen der Detektive; X bekommt keine. */
  teamMarkers?: TeamMarker[];
  onRemoveTeamMarker?: (id: number) => void;
  /** Treffpunkt/Startpunkt des Spiels — bleibt dauerhaft sichtbar. */
  startPoint: LatLng | null;
  onMapClick?: (pos: LatLng) => void;
  onSatelliteChange?: (enabled: boolean) => void;
}

export function MapView({
  center,
  playAreaRadiusMeters,
  playAreaPolygon = null,
  players,
  lastReveal,
  pingHistory = [],
  pingHistoryIsOwn = true,
  objective,
  teamMarkers = [],
  onRemoveTeamMarker,
  startPoint,
  onMapClick,
  onSatelliteChange,
}: MapViewProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const objectiveMarkerRef = useRef<Marker | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);
  const pingMarkersRef = useRef<Marker[]>([]);
  const teamMarkersRef = useRef<Marker[]>([]);
  const onRemoveTeamMarkerRef = useRef(onRemoveTeamMarker);
  onRemoveTeamMarkerRef.current = onRemoveTeamMarker;
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
  }, [center.lat, center.lng]);

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
      const ring: [number, number][] = playAreaPolygon
        ? [...playAreaPolygon, playAreaPolygon[0]].map((p): [number, number] => [p.lng, p.lat])
        : circlePolygon(center, playAreaRadiusMeters).map((p): [number, number] => [p.lng, p.lat]);
      const data: Feature<Polygon> = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      };
      const source = map.getSource("play-area") as GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
        return;
      }
      map.addSource("play-area", { type: "geojson", data });
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
    };

    if (map.isStyleLoaded()) addPlayArea();
    else map.on("load", addPlayArea);
  }, [center, playAreaRadiusMeters, playAreaPolygon]);

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

  // Eigener Ping-Verlauf von X
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const marker of pingMarkersRef.current) marker.remove();
    pingMarkersRef.current = pingHistory.map((ping) => {
      const label = i18n.t(pingHistoryIsOwn ? "map.pingLabel" : "map.xPinLabel", {
        index: ping.index,
      });
      const el = pinElement("#ef4444", label, ping.index);
      const time = formatTime(ping.at);
      const popup = pingHistoryIsOwn
        ? i18n.t("map.pingPopup", { index: ping.index, time })
        : i18n.t("map.xPinPopup", { time });
      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat([ping.pos.lng, ping.pos.lat])
        .setPopup(new Popup({ closeButton: false }).setText(popup))
        .addTo(map);
    });
  }, [pingHistory, pingHistoryIsOwn]);

  // Markierungen der Detektive
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const marker of teamMarkersRef.current) marker.remove();
    teamMarkersRef.current = teamMarkers.map((entry) => {
      const suspect = entry.kind === "SUSPECT";
      const label = i18n.t(suspect ? "map.markerSuspect" : "map.markerClear");
      const el = document.createElement("div");
      el.textContent = suspect ? "?" : "×";
      el.setAttribute("aria-label", label);
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.display = "grid";
      el.style.placeItems = "center";
      el.style.borderRadius = "6px";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
      el.style.background = suspect ? "#f59e0b" : "#64748b";
      el.style.color = "white";
      el.style.fontSize = "16px";
      el.style.fontWeight = "700";
      const time = new Date(entry.at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const content = document.createElement("div");
      content.className = "marker-popup";
      const text = document.createElement("p");
      text.textContent = i18n.t("map.markerPopup", { label, name: entry.by, time });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = i18n.t("map.markerRemove");
      remove.addEventListener("click", () => onRemoveTeamMarkerRef.current?.(entry.id));
      content.append(text, remove);
      return new Marker({ element: el })
        .setLngLat([entry.pos.lng, entry.pos.lat])
        .setPopup(new Popup({ closeButton: false }).setDOMContent(content))
        .addTo(map);
    });
  }, [teamMarkers]);

  // Spieler-Marker aktualisieren
  const playerInfoRef = useRef<Map<string, PlayerMarker>>(new Map());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const activeIds = new Set<string>();

    for (const player of players) {
      if (!player.pos) continue;
      activeIds.add(player.id);
      playerInfoRef.current.set(player.id, player);

      let marker = markers.get(player.id);
      if (!marker) {
        const el = document.createElement("div");
        if (player.isSelf) {
          // Eigener Standort: Person im Kreis, mit Puls, immer im Vordergrund.
          el.className = "self-marker";
          el.setAttribute("aria-label", i18n.t("map.you"));
          el.appendChild(svgIcon(PERSON_ICON, 16));
        } else {
          el.style.width = "24px";
          el.style.height = "24px";
          el.style.borderRadius = "50%";
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
          el.style.background = player.color;
        }

        const popup = new Popup({ closeButton: false, offset: player.isSelf ? 20 : 14 });
        const id = player.id;
        // Text beim Öffnen frisch bauen, damit die Zeitangabe stimmt.
        popup.on("open", () => {
          const info = playerInfoRef.current.get(id);
          if (!info) return;
          const name = info.isSelf ? i18n.t("map.you") : info.name;
          popup.setText(
            info.syncedAt
              ? i18n.t("map.playerPopup", {
                  name,
                  time: formatTime(info.syncedAt, true),
                  seconds: Math.max(0, Math.round((Date.now() - info.syncedAt) / 1000)),
                })
              : i18n.t("map.playerPopupUnknown", { name }),
          );
        });

        marker = new Marker({ element: el })
          .setLngLat([player.pos.lng, player.pos.lat])
          .setPopup(popup)
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
        playerInfoRef.current.delete(id);
      }
    }
  }, [players]);

  // Letzter Standort von X als Pin (für Detektive; X sieht seine Pings oben).
  const revealMarkerRef = useRef<Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    revealMarkerRef.current?.remove();
    revealMarkerRef.current = null;
    if (!map || !lastReveal) return;
    // Steht die Sichtung schon als Pin im Verlauf, nicht doppelt zeichnen.
    if (pingHistory.some((ping) => ping.index === lastReveal.index) && !lastReveal.isLive) return;
    if (pingHistoryIsOwn && pingHistory.length > 0) return;
    const el = pinElement("#ef4444", i18n.t("map.xPinLabel"), lastReveal.index);
    const time = formatTime(lastReveal.at);
    revealMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
      .setLngLat([lastReveal.pos.lng, lastReveal.pos.lat])
      .setPopup(
        new Popup({ closeButton: false }).setText(
          i18n.t(lastReveal.isLive ? "map.xPinPopupLive" : "map.xPinPopup", { time }),
        ),
      )
      .addTo(map);
  }, [lastReveal, pingHistory]);

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
            ? i18n.t("map.objectiveReached")
            : i18n.t("map.objectiveRadius", { meters: objective.radiusMeters }),
        );
      return;
    }

    const el = document.createElement("div");
    el.textContent = "Z";
    el.setAttribute("aria-label", i18n.t("map.objective"));
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
        new Popup({ closeButton: false }).setText(
          objective.status === "COMPLETED"
            ? i18n.t("map.objectiveReached")
            : i18n.t("map.objectiveRadius", { meters: objective.radiusMeters }),
        ),
      )
      .addTo(map);
  }, [objective]);

  // Startpunkt dauerhaft markieren
  const startLat = startPoint?.lat ?? null;
  const startLng = startPoint?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (startLat === null || startLng === null) {
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      return;
    }

    const marker = startMarkerRef.current;
    if (marker) {
      marker.setLngLat([startLng, startLat]);
      return;
    }

    const el = document.createElement("div");
    el.className = "start-marker";
    el.textContent = i18n.t("map.start");
    el.setAttribute("aria-label", i18n.t("map.startPoint"));

    // Über dem eigentlichen Punkt, damit die Markierung nicht auf dem
    // Spieler-Marker liegt, wenn X noch am Startpunkt steht.
    startMarkerRef.current = new Marker({ element: el, anchor: "bottom", offset: [0, -16] })
      .setLngLat([startLng, startLat])
      .setPopup(new Popup({ closeButton: false }).setText(i18n.t("map.startPopup")))
      .addTo(map);
  }, [startLat, startLng]);

  // Karte zentrieren wenn sich Zentrum ändert
  useEffect(() => {
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: MAP_INITIAL_ZOOM });
  }, [center.lat, center.lng]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
