import { useCallback, useEffect, useState } from "react";

export type LocationState = "unknown" | "granted" | "denied" | "unsupported";

/** Beobachtet die Standortberechtigung und kann sie anfragen. */
export function useLocationPermission() {
  const [state, setState] = useState<LocationState>(
    "geolocation" in navigator ? "unknown" : "unsupported",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!navigator.permissions) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const apply = (s: PermissionState) => {
      if (s === "granted") setState("granted");
      else if (s === "denied") setState("denied");
      else setState((prev) => (prev === "unsupported" ? prev : "unknown"));
    };
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (cancelled) return;
        status = permission;
        apply(permission.state);
        // Wer die Freigabe in den Einstellungen ändert, soll das ohne Neuladen merken.
        permission.onchange = () => apply(permission.state);
      })
      .catch((error: unknown) => {
        console.warn("Standortberechtigung konnte nicht geprüft werden:", error);
      });
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setState("granted");
        setBusy(false);
      },
      (error) => {
        setBusy(false);
        // Ohne Signal ist die Berechtigung trotzdem erteilt.
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "granted");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  }, []);

  return { state, busy, request };
}
