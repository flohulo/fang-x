import { useCallback, useEffect, useState } from "react";

export type MicrophoneState = "unknown" | "granted" | "denied" | "unsupported";

/** Kann der Browser überhaupt Mikrofon und Peer-to-Peer-Audio (WebRTC)? */
export function microphoneSupported(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== "undefined";
}

/** Beobachtet die Mikrofonberechtigung und kann sie anfragen. */
export function useMicrophonePermission() {
  const [state, setState] = useState<MicrophoneState>(
    microphoneSupported() ? "unknown" : "unsupported",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Safari und Firefox kennen die Abfrage für das Mikrofon teils nicht; dann bleibt es
    // bei "unknown", bis die Berechtigung angefragt wurde.
    if (!navigator.permissions) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const apply = (s: PermissionState) => {
      if (s === "granted") setState("granted");
      else if (s === "denied") setState("denied");
      else setState((prev) => (prev === "unsupported" ? prev : "unknown"));
    };
    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((permission) => {
        if (cancelled) return;
        status = permission;
        apply(permission.state);
        // Wer die Freigabe in den Einstellungen ändert, soll das ohne Neuladen merken.
        permission.onchange = () => apply(permission.state);
      })
      .catch(() => {
        // Nicht unterstützt: kein Fehler, der Status bleibt "unknown".
      });
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  /** Fragt die Berechtigung an und gibt das Mikrofon sofort wieder frei. */
  const request = useCallback(async () => {
    if (!microphoneSupported()) {
      setState("unsupported");
      return;
    }
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      setState("granted");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      // Kein Mikrofon vorhanden gilt wie "nicht unterstützt", alles andere als abgelehnt.
      setState(name === "NotFoundError" ? "unsupported" : "denied");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, request };
}
