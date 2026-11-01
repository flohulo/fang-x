// Mehrsprachigkeit (i18next). Übersetzungen liegen als JSON unter src/locales/<sprache>.json
// und werden über Weblate gepflegt. Eine neue Sprache ist einfach eine neue Datei – sie wird
// automatisch erkannt, bei Bedarf nachgeladen und im Sprachwähler angeboten.

import i18n, { type BackendModule } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

/** Quellsprache der Texte; hier werden neue Schlüssel zuerst ergänzt. */
export const SOURCE_LANGUAGE = "de";
/** Rückfall für Schlüssel, die in einer Sprache noch fehlen. */
export const FALLBACK_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "fangx:lang";

type Resource = Record<string, unknown>;

const loaders = import.meta.glob<Resource>("./locales/*.json", {
  import: "default",
});

/** Alle verfügbaren Sprachcodes, z. B. ["de", "en"]. */
export const SUPPORTED_LANGUAGES: string[] = Object.keys(loaders)
  .map((path) => /\/([^/]+)\.json$/.exec(path)?.[1] ?? "")
  .filter(Boolean)
  .sort((a, b) => {
    if (a === SOURCE_LANGUAGE) return -1;
    if (b === SOURCE_LANGUAGE) return 1;
    return a.localeCompare(b);
  });

/** Name der Sprache in dieser Sprache selbst (z. B. "Deutsch", "English", "Français"). */
export function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    if (name) return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    // Unbekannter Code – dann eben der Code selbst.
  }
  return code;
}

// Lädt nur die Sprachdatei, die gerade gebraucht wird.
const lazyBackend: BackendModule = {
  type: "backend",
  init() {},
  read(language, _namespace, callback) {
    const loader = loaders[`./locales/${language}.json`];
    if (!loader) {
      callback(null, {});
      return;
    }
    loader().then(
      (resource) => callback(null, resource),
      (error: unknown) => callback(error as Error, null),
    );
  },
};

function applyDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}

export const i18nReady = i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    // "all": Regionssprachen wie de-CH werden selbst geladen und fallen auf de zurück
    // (bei "languageOnly" würde de-CH zu de gekürzt und wäre nicht auswählbar).
    load: "all",
    fallbackLng: [FALLBACK_LANGUAGE, SOURCE_LANGUAGE],
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  })
  .then(() => {
    applyDocumentLanguage(i18n.resolvedLanguage ?? FALLBACK_LANGUAGE);
    i18n.on("languageChanged", (language) => {
      applyDocumentLanguage(i18n.resolvedLanguage ?? language);
    });
  });

export default i18n;
