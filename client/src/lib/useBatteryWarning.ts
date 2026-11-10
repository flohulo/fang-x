import { useEffect } from "react";

// Die Battery Status API gibt es nur in Chromium-basierten Browsern, nicht in Safari und Firefox.
// Wo sie fehlt, passiert nichts.
interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}

type BatteryNavigator = Navigator & { getBattery?: () => Promise<BatteryManager> };

/** Ab diesem Stand (Anteil von 1) wird gewarnt, erneut erst wieder ab dem Reset-Stand. */
const WARN_LEVEL = 0.15;
const RESET_LEVEL = 0.25;

/**
 * Meldet einmal je Entladung, wenn der eigene Akku niedrig ist und nicht geladen wird.
 * Es wird nur der Prozentwert übertragen, nie ein Standort.
 */
export function useBatteryWarning(active: boolean, onLow: (percent: number) => void) {
  useEffect(() => {
    const nav = navigator as BatteryNavigator;
    if (!active || typeof nav.getBattery !== "function") return;
    let cancelled = false;
    let warned = false;
    let battery: BatteryManager | null = null;

    const check = () => {
      if (!battery) return;
      if (battery.charging || battery.level >= RESET_LEVEL) {
        warned = false;
        return;
      }
      if (!warned && battery.level <= WARN_LEVEL) {
        warned = true;
        onLow(Math.round(battery.level * 100));
      }
    };

    nav
      .getBattery()
      .then((manager) => {
        if (cancelled) return;
        battery = manager;
        manager.addEventListener("levelchange", check);
        manager.addEventListener("chargingchange", check);
        check();
      })
      .catch(() => {
        // Nicht verfügbar oder blockiert: keine Warnung.
      });

    return () => {
      cancelled = true;
      battery?.removeEventListener("levelchange", check);
      battery?.removeEventListener("chargingchange", check);
    };
    // onLow bewusst nicht als Abhängigkeit, damit nicht bei jedem Rendern neu abonniert wird.
  }, [active]);
}
