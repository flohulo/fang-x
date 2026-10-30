// Öffentliches Handbuch (MkDocs, GitHub Pages).
// Die Seiten liegen unter docs/ und werden aus dem Repository veröffentlicht.
// Deutsch liegt im Stammverzeichnis, übersetzte Fassungen unter /<sprache>/.

import i18n, { FALLBACK_LANGUAGE, SOURCE_LANGUAGE } from "../i18n";

export const DOCS_BASE_URL = "https://flohulo.github.io/fang-x";

/**
 * Sprachen, in denen das Handbuch gebaut wird (siehe `languages` in mkdocs.yml).
 * Seiten ohne eigene Übersetzung zeigen dort den deutschen Text.
 */
export const DOCS_LANGUAGES: readonly string[] = [SOURCE_LANGUAGE, "en"];

/** Link auf eine Handbuchseite in der aktuellen Sprache, z. B. docsUrl("Fangradius"). */
export function docsUrl(page = "Spieleinstellungen"): string {
  const language = i18n.resolvedLanguage ?? FALLBACK_LANGUAGE;
  const docsLanguage = DOCS_LANGUAGES.includes(language) ? language : FALLBACK_LANGUAGE;
  const prefix = docsLanguage === SOURCE_LANGUAGE ? "" : `/${docsLanguage}`;
  return `${DOCS_BASE_URL}${prefix}/${page}/`;
}
