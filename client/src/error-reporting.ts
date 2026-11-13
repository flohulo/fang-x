import * as Sentry from "@sentry/browser";
import { scrubErrorEvent } from "@fang-x/shared";

// GlitchTip spricht das Sentry-Protokoll. Ohne VITE_GLITCHTIP_DSN bleibt die
// Fehlerberichterstattung ausgeschaltet (lokale Entwicklung, Forks).
export function initErrorReporting(): void {
  const dsn = import.meta.env.VITE_GLITCHTIP_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: __APP_VERSION__,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    // Breadcrumbs können Navigation und Eingaben enthalten und werden nicht gesendet.
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubErrorEvent(event),
  });
}
