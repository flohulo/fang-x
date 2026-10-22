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

const SECTION_CLASSES: Record<string, string> = {
  Neu: "cat-feature",
  Fehlerbehebungen: "cat-fix",
  Leistung: "cat-perf",
  Darstellung: "cat-style",
  Dokumentation: "cat-docs",
  Build: "cat-build",
  CI: "cat-build",
  Tests: "cat-build",
  Sonstiges: "cat-misc",
};

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

export function ChangelogScreen() {
  return (
    <div className="screen legal-screen">
      <article className="card legal changelog">
        <div className="changelog-topbar">
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
          <span className="changelog-topbar-label">Fang X · Versionsverlauf</span>
        </div>

        <header className="changelog-header">
          <span className="legal-badge">Das ist neu</span>
          <h1>Fang X entwickelt sich weiter.</h1>
          <p className="legal-subtitle">
            Hier findest du neue Funktionen, Verbesserungen und Fehlerbehebungen aus den letzten
            Versionen.
          </p>
        </header>

        {RELEASES.length === 0 && <p className="changelog-empty">Noch keine Einträge vorhanden.</p>}

        <div className="changelog-releases">
          {RELEASES.map((release, releaseIndex) => (
            <section
              key={release.version}
              className={`changelog-release-card${releaseIndex === 0 ? " is-latest" : ""}`}
            >
              <div className="changelog-release-head">
                <div className="changelog-release-title">
                  <h2 className="changelog-version-tag">Version {release.version}</h2>
                  {releaseIndex === 0 && (
                    <span className="changelog-latest-pill">Neueste Version</span>
                  )}
                </div>
                <div className="changelog-meta">
                  {release.date && (
                    <time className="changelog-date" dateTime={release.date}>
                      {formatDate(release.date)}
                    </time>
                  )}
                  {release.url && (
                    <a
                      className="changelog-github-link"
                      href={release.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Änderungen
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="changelog-sections">
                {release.sections.map((section) => (
                  <div key={section.title} className="changelog-section-group">
                    <h3
                      className={`changelog-cat-badge ${SECTION_CLASSES[section.title] ?? "cat-misc"}`}
                    >
                      {section.title}
                    </h3>
                    <ul className="changelog-list">
                      {section.items.map((item) => (
                        <li key={item} className="changelog-item">
                          <span className="changelog-bullet-dot" aria-hidden="true">
                            •
                          </span>
                          <span className="changelog-item-content">{renderInline(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
