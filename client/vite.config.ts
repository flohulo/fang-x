import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const { version: appVersion } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

// Externe Hosts, die die Karte lädt (Stil, Glyphs, Sprites, Vektor- und Luftbild-Kacheln).
const MAP_HOSTS = [
  "https://tiles.openfreemap.org",
  "https://tiles.maps.eox.at",
  "https://wmts.geo.admin.ch",
];

// Herkunft des GlitchTip-Projekts aus der DSN (https://key@host/1 -> https://host).
function dsnOrigin(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

// Erzeugt dist/_headers mit Sicherheitsheadern für Workers Assets. Der GlitchTip-Host
// kommt aus der Build-Variable, damit Fehlerberichte nicht an der CSP scheitern.
function securityHeaders(glitchtipOrigin: string | null): Plugin {
  const connect = ["'self'", ...MAP_HOSTS, ...(glitchtipOrigin ? [glitchtipOrigin] : [])];
  const csp = [
    "default-src 'self'",
    `connect-src ${connect.join(" ")}`,
    `img-src 'self' data: blob: ${MAP_HOSTS.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = [
    "/*",
    "  Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
    "  X-Frame-Options: DENY",
    `  Content-Security-Policy: ${csp}`,
    "",
  ].join("\n");
  return {
    name: "fang-x-security-headers",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: headers });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    securityHeaders(dsnOrigin(loadEnv(mode, process.cwd(), "VITE_").VITE_GLITCHTIP_DSN)),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Fang X",
        short_name: "FangX",
        description: "Open-Source GPS-Fangspiel",
        lang: "de",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        id: "/",
        scope: "/",
        start_url: "/",
        // Links in den Scope (z. B. aus dem QR-Code) bevorzugt in der installierten App öffnen.
        handle_links: "preferred",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
}));
