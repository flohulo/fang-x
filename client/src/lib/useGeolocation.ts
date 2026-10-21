import type { LatLng } from "@fang-x/shared";
import { useEffect, useRef, useState } from "react";

export function useGeolocation(enabled: boolean, onPosition: (pos: LatLng) => void) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const onPosRef = useRef(onPosition);
  onPosRef.current = onPosition;

  useEffect(() => {
    if (!enabled || simulated) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation wird nicht unterstützt.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        setError(null);
        onPosRef.current(p);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, simulated]);

  const setSimulatedPosition = (pos: LatLng) => {
    setSimulated(true);
    setPosition(pos);
    onPosRef.current(pos);
  };

  const enableRealGps = () => {
    setSimulated(false);
    setPosition(null);
  };

  return { position, error, simulated, setSimulatedPosition, enableRealGps };
}
