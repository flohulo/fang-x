import { useTranslation } from "react-i18next";
import contributorsData from "./contributors.json";

interface Contributor {
  login: string;
  url: string;
  contributions: number;
}

// Wird mit `npm run update:contributors` von GitHub aktualisiert (siehe scripts/).
const CONTRIBUTORS: Contributor[] = contributorsData;

export function ContributorsScreen() {
  const { t } = useTranslation();
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
            {t("legal.back")}
          </a>
          <span className="changelog-topbar-label">Fang X</span>
        </div>

        <header className="changelog-header">
          <h1>{t("contributors.title")}</h1>
          <p className="legal-subtitle">{t("contributors.intro")}</p>
        </header>

        {CONTRIBUTORS.length === 0 && <p className="changelog-empty">{t("contributors.empty")}</p>}

        <ul className="contributors-list">
          {CONTRIBUTORS.map((person) => (
            <li key={person.login} className="changelog-release-card">
              <a
                href={person.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${person.login} – ${t("contributors.github")}`}
              >
                <strong>{person.login}</strong>
                <span aria-hidden="true"> ↗</span>
              </a>
              <div className="changelog-date">
                {t("contributors.count", { count: person.contributions })}
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
