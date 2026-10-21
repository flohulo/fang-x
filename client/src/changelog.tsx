import type { ReactNode } from "react";
import changelogRaw from "../../CHANGELOG.md?raw";

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  url?: string;
  date?: string;
  sections: ChangelogSection[];
}

const SECTION_TITLES: Record<string, string> = {
  Features: "Neu",
  "Bug Fixes": "Fehlerbehebungen",
  "Performance Improvements": "Leistung",
  Reverts: "Zurückgenommen",
  Documentation: "Dokumentation",
  Styles: "Darstellung",
  "Code Refactoring": "Code-Überarbeitung",
  Tests: "Tests",
  "Build System": "Build",
  "Continuous Integration": "CI",
  Miscellaneous: "Sonstiges",
  "Miscellaneous Chores": "Sonstiges",
};

const RELEASE_HEADING =
  /^##\s+\[?([^\]\s]+)\]?(?:\((https?:[^)]+)\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$/;

/** Liest das von release-please erzeugte CHANGELOG.md in Releases. */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | undefined;
  let section: ChangelogSection | undefined;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();

    const heading = RELEASE_HEADING.exec(line);
    if (heading) {
      release = {
        version: heading[1],
        url: heading[2],
        date: heading[3],
        sections: [],
      };
      releases.push(release);
      section = undefined;
      continue;
    }

    if (!release) continue;

    const sectionHeading = /^###\s+(.+)$/.exec(line);
    if (sectionHeading) {
      const title = sectionHeading[1].trim();
      section = { title: SECTION_TITLES[title] ?? title, items: [] };
      release.sections.push(section);
      continue;
    }

    const item = /^\s*[*-]\s+(.+)$/.exec(line);
    if (item) {
      if (!section) {
        section = { title: "Änderungen", items: [] };
        release.sections.push(section);
      }
      section.items.push(item[1].trim());
    }
  }

  return releases.filter((r) => r.sections.some((s) => s.items.length > 0));
}

const RELEASES = parseChangelog(changelogRaw);

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Entfernt Commit-Verweise am Zeilenende und wandelt **fett** und [Link](url) um. */
function renderInline(text: string): ReactNode[] {
  const clean = text.replace(/\s*\(\[[0-9a-f]{7,40}\]\([^)]*\)\)\s*$/i, "");
  const nodes: ReactNode[] = [];
  const token = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = token.exec(clean)) !== null) {
    if (match.index > last) nodes.push(clean.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={match.index}>{match[1]}</strong>);
    } else {
      nodes.push(
        <a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer">
          {match[2]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < clean.length) nodes.push(clean.slice(last));
  return nodes;
}

function getCategoryBadge(title: string) {
  let icon = "📦";
  let className = "cat-misc";

  switch (title) {
    case "Neu":
    case "Features":
      icon = "✨";
      className = "cat-feature";
      break;
    case "Fehlerbehebungen":
    case "Bug Fixes":
      icon = "🛠️";
      className = "cat-fix";
      break;
    case "Leistung":
    case "Performance Improvements":
      icon = "⚡";
      className = "cat-perf";
      break;
    case "Darstellung":
    case "Styles":
      icon = "🎨";
      className = "cat-style";
      break;
    case "Dokumentation":
    case "Documentation":
      icon = "📝";
      className = "cat-docs";
      break;
    case "CI":
    case "Continuous Integration":
    case "Build":
    case "Build System":
      icon = "⚙️";
      className = "cat-build";
      break;
  }

  return (
    <span className={`changelog-cat-badge ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {title}
    </span>
  );
}

export function ChangelogScreen() {
  return (
    <div className="screen legal-screen">
      <article className="card legal changelog">
        <div className="legal-top-bar">
          <a className="legal-back" href="/">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Zurück zum Spiel
          </a>

          <div className="legal-nav-tabs">
            <a href="/impressum" className="legal-tab-btn">
              Impressum
            </a>
            <a href="/datenschutz" className="legal-tab-btn">
              Datenschutz
            </a>
            <span className="legal-tab-btn is-active">Changelog</span>
          </div>
        </div>

        <header className="legal-header">
          <span className="legal-badge">Versionsgeschichte</span>
          <h1>Changelog</h1>
          <p className="legal-subtitle">
            Alle Neuerungen, Verbesserungen und Aktualisierungen von Fang X im Überblick.
          </p>
        </header>

        {RELEASES.length === 0 && <p className="card-text">Noch keine Einträge vorhanden.</p>}

        {RELEASES.map((release, releaseIdx) => (
          <section key={release.version} className="changelog-release-card">
            <div className="changelog-release-head">
              <div className="changelog-version-tag">
                <span>Version {release.version}</span>
                {releaseIdx === 0 && <span className="changelog-latest-pill">Aktuell</span>}
              </div>

              <div className="changelog-meta">
                {release.date && (
                  <span className="changelog-date">📅 {formatDate(release.date)}</span>
                )}
                {release.url && (
                  <a
                    href={release.url}
                    className="changelog-github-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Release ↗
                  </a>
                )}
              </div>
            </div>

            {release.sections.map((section) => (
              <div key={section.title} className="changelog-section-group">
                {getCategoryBadge(section.title)}
                <ul className="changelog-list">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="changelog-item">
                      <span className="changelog-bullet-dot" aria-hidden="true">
                        •
                      </span>
                      <span className="changelog-item-content">{renderInline(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <a href="/impressum">Impressum</a>
            <span aria-hidden="true">·</span>
            <a href="/datenschutz">Datenschutz</a>
            <span aria-hidden="true">·</span>
            <a href="/changelog">Changelog</a>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/flohulo/fang-x" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
          <span className="legal-stand">
            Aktuelle Version: {RELEASES[0]?.version ? `v${RELEASES[0].version}` : "v0.1.1"}
          </span>
        </footer>
      </article>
    </div>
  );
}
