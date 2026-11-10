import { type GeoJSONSource, Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng } from "@fang-x/shared";
import {
  PLAY_AREA_POLYGON_MAX_POINTS,
  PLAY_AREA_POLYGON_MIN_POINTS,
  polygonCenter,
} from "@fang-x/shared";
import type { Feature, FeatureCollection } from "geojson";
import { useTranslation } from "react-i18next";
import { MAP_STYLE_URL } from "./MapView";

const FALLBACK_CENTER: LatLng = { lat: 47.3769, lng: 8.5417 };
const DRAFT_SOURCE = "draft-area";

interface PlayAreaEditorProps {
  initial: LatLng[] | null;
  /** Kartenmitte, falls noch kein Spielfeld gezeichnet wurde (z. B. der Startpunkt). */
  hintCenter: LatLng | null;
  onSave: (polygon: LatLng[]) => void;
  onCancel: () => void;
}

function draftData(points: LatLng[]): FeatureCollection {
  const coords = points.map((p): [number, number] => [p.lng, p.lat]);
  const features: Feature[] = points.map((_, i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: coords[i] },
    properties: { first: i === 0 },
  }));
  if (coords.length >= 2) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [...coords, ...(coords.length >= 3 ? [coords[0]] : [])],
      },
      properties: {},
    });
  }
  if (coords.length >= 3) {
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
      properties: {},
    });
  }
  return { type: "FeatureCollection", features };
}

export function PlayAreaEditor({ initial, hintCenter, onSave, onCancel }: PlayAreaEditorProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [points, setPoints] = useState<LatLng[]>(initial ?? []);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const initialCenterRef = useRef<LatLng>(
    initial && initial.length > 0 ? polygonCenter(initial) : (hintCenter ?? FALLBACK_CENTER),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const center = initialCenterRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: 15,
      maxZoom: 18,
      attributionControl: false,
    });
    map.addControl(new NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource(DRAFT_SOURCE, { type: "geojson", data: draftData(pointsRef.current) });
      map.addLayer({
        id: "draft-area-fill",
        type: "fill",
        source: DRAFT_SOURCE,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#38bdf8", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "draft-area-line",
        type: "line",
        source: DRAFT_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#38bdf8", "line-width": 3 },
      });
      map.addLayer({
        id: "draft-area-points",
        type: "circle",
        source: DRAFT_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": ["case", ["get", "first"], 8, 6],
          "circle-color": ["case", ["get", "first"], "#22c55e", "#ffffff"],
          "circle-stroke-color": "#0369a1",
          "circle-stroke-width": 2,
        },
      });
      setReady(true);
    });
    map.on("click", (e) => {
      if (pointsRef.current.length >= PLAY_AREA_POLYGON_MAX_POINTS) return;
      setPoints([...pointsRef.current, { lat: e.lngLat.lat, lng: e.lngLat.lng }]);
    });
    mapRef.current = map;

    // Ohne Vorgabe zur eigenen Position springen, sofern sie freigegeben ist.
    if (!initial?.length && !hintCenter && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => map.jumpTo({ center: [coords.longitude, coords.latitude] }),
        () => {},
        { maximumAge: 60_000, timeout: 10_000 },
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Die Karte wird nur einmal aufgebaut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource(DRAFT_SOURCE) as GeoJSONSource | undefined)?.setData(
      draftData(points),
    );
  }, [points, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const enough = points.length >= PLAY_AREA_POLYGON_MIN_POINTS;

  return (
    <div className="area-editor" role="dialog" aria-modal="true" aria-label={t("areaEditor.title")}>
      <div className="area-editor-map" ref={containerRef} />
      <div className="area-editor-panel">
        <strong>{t("areaEditor.title")}</strong>
        <p className="config-hint">
          {enough
            ? t("areaEditor.hintReady", { count: points.length })
            : t("areaEditor.hint", { min: PLAY_AREA_POLYGON_MIN_POINTS })}
        </p>
        <div className="area-editor-actions">
          <button
            className="secondary"
            type="button"
            disabled={points.length === 0}
            onClick={() => setPoints((prev) => prev.slice(0, -1))}
          >
            {t("areaEditor.undo")}
          </button>
          <button
            className="secondary"
            type="button"
            disabled={points.length === 0}
            onClick={() => setPoints([])}
          >
            {t("areaEditor.clear")}
          </button>
          <button className="secondary" type="button" onClick={onCancel}>
            {t("areaEditor.cancel")}
          </button>
          <button type="button" disabled={!enough} onClick={() => onSave(points)}>
            {t("areaEditor.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
