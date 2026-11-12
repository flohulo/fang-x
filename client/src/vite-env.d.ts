/// <reference types="vite/client" />

interface ImportMetaEnv {
  // DSN des GlitchTip-Projekts für den Client; ohne Wert ist die Fehlerberichterstattung aus.
  readonly VITE_GLITCHTIP_DSN?: string;
}
