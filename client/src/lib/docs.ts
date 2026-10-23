// Öffentliches Handbuch (MkDocs, GitHub Pages).
// Die Seiten liegen unter docs/ und werden aus dem Repository veröffentlicht.

export const DOCS_BASE_URL = "https://flohulo.github.io/fang-x";

/** Link auf eine Handbuchseite, z. B. docsUrl("Fangradius"). */
export function docsUrl(page = "Spieleinstellungen"): string {
  return `${DOCS_BASE_URL}/${page}/`;
}
