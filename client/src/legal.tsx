import { useState } from "react";

export interface LegalInfo {
  email: string;
  updated: string;
}

export const LEGAL: LegalInfo = {
  email: "fang-x@meine-dateien.info",
  updated: "21.10.2026",
};

const PLACEHOLDER_MARKER = /\[[^\]]*\]/;
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKER.test(value);
}

export const LEGAL_COMPLETE = LEGAL.email.trim() !== "" && LEGAL.updated.trim() !== "";

export function LegalScreen({ page: initialPage }: { page: "impressum" | "datenschutz" }) {
  const [currentPage, setCurrentPage] = useState<"impressum" | "datenschutz">(initialPage);
  const [copied, setCopied] = useState(false);

  const handleTabChange = (page: "impressum" | "datenschutz") => {
    setCurrentPage(page);
    window.history.pushState({}, "", `/${page}`);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(LEGAL.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar
    }
  };

  return (
    <div className="screen legal-screen">
      <article className="card legal">
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
            <button
              type="button"
              className={`legal-tab-btn ${currentPage === "impressum" ? "is-active" : ""}`}
              onClick={() => handleTabChange("impressum")}
            >
              Impressum
            </button>
            <button
              type="button"
              className={`legal-tab-btn ${currentPage === "datenschutz" ? "is-active" : ""}`}
              onClick={() => handleTabChange("datenschutz")}
            >
              Datenschutz
            </button>
            <a href="/changelog" className="legal-tab-btn">
              Changelog
            </a>
          </div>
        </div>

        {currentPage === "impressum" ? (
          <Impressum copied={copied} onCopyEmail={copyEmail} />
        ) : (
          <Datenschutz copied={copied} onCopyEmail={copyEmail} />
        )}

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <a
              href="/impressum"
              onClick={(e) => {
                e.preventDefault();
                handleTabChange("impressum");
              }}
            >
              Impressum
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/datenschutz"
              onClick={(e) => {
                e.preventDefault();
                handleTabChange("datenschutz");
              }}
            >
              Datenschutz
            </a>
            <span aria-hidden="true">·</span>
            <a href="/changelog">Changelog</a>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/flohulo/fang-x" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
          <span className="legal-stand">Stand: {LEGAL.updated || "20.10.2026"}</span>
        </footer>
      </article>
    </div>
  );
}

export default LegalScreen;

function ContactCard({ copied, onCopyEmail }: { copied: boolean; onCopyEmail: () => void }) {
  return (
    <div className="legal-contact-card">
      <div className="legal-contact-details">
        <span className="legal-contact-label">Kontakt & Betreiber</span>
        <a href={`mailto:${LEGAL.email}`} className="legal-contact-email">
          {LEGAL.email}
        </a>
      </div>
      <button type="button" className="legal-copy-btn" onClick={onCopyEmail}>
        {copied ? "Kopiert ✓" : "E-Mail kopieren"}
      </button>
    </div>
  );
}

function Impressum({ copied, onCopyEmail }: { copied: boolean; onCopyEmail: () => void }) {
  return (
    <>
      <header className="legal-header">
        <span className="legal-badge">Rechtliche Hinweise</span>
        <h1>Impressum</h1>
        <p className="legal-subtitle">Angaben und Informationen zum Open-Source-Projekt Fang X.</p>
      </header>

      <ContactCard copied={copied} onCopyEmail={onCopyEmail} />

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">01</span>
          <h2>Art und Umfang des Angebots</h2>
        </div>
        <p>
          Fang X ist ein kostenloses, werbefreies und nicht-kommerzielles Open-Source-Browser-Spiel
          für Gruppen im Freien.
        </p>
        <div className="legal-chips">
          <span className="legal-chip">100% Kostenlos</span>
          <span className="legal-chip">Werbefrei</span>
          <span className="legal-chip">Kein Tracking</span>
          <span className="legal-chip">Keine Benutzerkonten</span>
        </div>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">02</span>
          <h2>Verantwortlich für den Inhalt</h2>
        </div>
        <p>Verantwortlich für redaktionelle Inhalte gemäß Telemediengesetz / Datenschutzrecht:</p>
        <p>
          <strong>{LEGAL.email}</strong>
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">03</span>
          <h2>Haftungsausschluss</h2>
        </div>
        <p>
          Alle Inhalte und Funktionen dieses Online-Spiels werden mit größter Sorgfalt
          bereitgestellt, jedoch ohne Gewähr. Für Richtigkeit, Vollständigkeit und Aktualität der
          bereitgestellten Inhalte sowie für die permanente Verfügbarkeit des Servers kann keine
          Gewähr übernommen werden.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">04</span>
          <h2>Haftung für externe Links</h2>
        </div>
        <p>
          Für Inhalte externer Webseiten sind stets deren Betreiber verantwortlich. Zum Zeitpunkt
          der Verlinkung waren keine rechtswidrigen Inhalte erkennbar. Bei Bekanntwerden von
          Rechtsverstößen werden derartige Links unverzüglich entfernt.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">05</span>
          <h2>Quellcode & Lizenz</h2>
        </div>
        <p>
          Dieses Projekt ist freie Software unter der Lizenz{" "}
          <span className="legal-license-badge">AGPL-3.0</span>. Der Quellcode ist öffentlich
          einsehbar und kann unter den Bedingungen der GNU Affero General Public License genutzt,
          überprüft und erweitert werden.
        </p>
        <div className="legal-chips">
          <a
            href="https://github.com/flohulo/fang-x"
            target="_blank"
            rel="noopener noreferrer"
            className="legal-chip"
          >
            Quellcode auf GitHub ansehen ↗
          </a>
        </div>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">06</span>
          <h2>Kartendaten & Komponenten</h2>
        </div>
        <p>Die interaktive Karte wird mit Technologien und freien Daten Dritter realisiert:</p>
        <div className="legal-chips">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="legal-chip"
          >
            OpenStreetMap (Kartendaten) ↗
          </a>
          <a
            href="https://openfreemap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="legal-chip"
          >
            OpenFreeMap (Tile Hosting) ↗
          </a>
          <a
            href="https://maplibre.org"
            target="_blank"
            rel="noopener noreferrer"
            className="legal-chip"
          >
            MapLibre GL ↗
          </a>
          <a
            href="https://openmaptiles.org"
            target="_blank"
            rel="noopener noreferrer"
            className="legal-chip"
          >
            OpenMapTiles ↗
          </a>
        </div>
      </section>
    </>
  );
}

function Datenschutz({ copied, onCopyEmail }: { copied: boolean; onCopyEmail: () => void }) {
  return (
    <>
      <header className="legal-header">
        <span className="legal-badge">Privatsphäre & Sicherheit</span>
        <h1>Datenschutzerklärung</h1>
        <p className="legal-subtitle">
          Fang X folgt dem Prinzip der Datensparsamkeit. Wir verarbeiten nur das absolute Minimum,
          das für das Spielen notwendig ist.
        </p>
      </header>

      {/* Highlights Grid ("Auf einen Blick") */}
      <div className="legal-highlights">
        <div className="legal-highlight-card">
          <span className="legal-highlight-icon" aria-hidden="true">
            🚫
          </span>
          <div>
            <span className="legal-highlight-title">Keine Werbung</span>
            <p className="legal-highlight-desc">
              Keine Ad-Netzwerke, kein Profiling und kein Verkauf von Nutzerdaten.
            </p>
          </div>
        </div>

        <div className="legal-highlight-card">
          <span className="legal-highlight-icon" aria-hidden="true">
            🛡️
          </span>
          <div>
            <span className="legal-highlight-title">Kein Tracking</span>
            <p className="legal-highlight-desc">
              Keine Analyse-Cookies, keine Marketing-Pixel oder externe Tracker.
            </p>
          </div>
        </div>

        <div className="legal-highlight-card">
          <span className="legal-highlight-icon" aria-hidden="true">
            👤
          </span>
          <div>
            <span className="legal-highlight-title">Keine Benutzerkonten</span>
            <p className="legal-highlight-desc">
              Keine Registrierung, keine Passwörter und keine Klarnamenspflicht.
            </p>
          </div>
        </div>

        <div className="legal-highlight-card">
          <span className="legal-highlight-icon" aria-hidden="true">
            📍
          </span>
          <div>
            <span className="legal-highlight-title">Echtzeit-GPS ohne Speicher</span>
            <p className="legal-highlight-desc">
              Standorte werden nur live übertragen und nach Spielende sofort verworfen.
            </p>
          </div>
        </div>
      </div>

      <ContactCard copied={copied} onCopyEmail={onCopyEmail} />

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">01</span>
          <h2>Verantwortlicher</h2>
        </div>
        <p>Verantwortlich für die Datenverarbeitung:</p>
        <p>
          <strong>{LEGAL.email}</strong>
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">02</span>
          <h2>Kurzfassung der Grundsätze</h2>
        </div>
        <ul>
          <li>
            <strong>Keine Werbung und kein Tracking:</strong> Es werden keine Drittanbieter-Tracker
            oder Analyse-Dienste eingesetzt.
          </li>
          <li>
            <strong>Keine Benutzerkonten:</strong> Du benötigst weder Registrierung noch Passwort.
          </li>
          <li>
            <strong>Ausschließliche Live-Übertragung:</strong> Dein Standort wird ausschließlich
            während eines laufenden Spiels übertragen. Standortverläufe werden nicht dauerhaft
            gespeichert.
          </li>
          <li>
            <strong>Sichtbarkeit für Mitspieler:</strong> Mitspieler sehen deinen gewählten Namen
            und – je nach Rolle und Spielphase – deinen aktuellen Standort.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">03</span>
          <h2>Hosting und Logdaten</h2>
        </div>
        <p>
          Für den sicheren Betrieb werden technisch notwendige Verbindungsdaten verarbeitet. Das
          Angebot wird bei Cloudflare gehostet (Cloudflare, Inc., 101 Townsend St., San Francisco,
          CA 94107, USA; für den europäischen Raum Cloudflare Germany GmbH, München). Cloudflare
          verarbeitet als Hosting-Anbieter technisch notwendige Verbindungsdaten (IP-Adresse,
          Zugriffszeit, aufgerufene URL, Browserdaten, Fehlermeldungen) zur Gewährleistung der
          Sicherheit und Stabilität.
        </p>
        <p>
          Weitere Informationen findest du in den{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare-Datenschutzhinweisen ↗
          </a>
          .
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">04</span>
          <h2>Im Spiel verarbeitete Daten</h2>
        </div>
        <p>Während des Spielens werden ausschließlich folgende funktionale Daten verarbeitet:</p>
        <ul>
          <li>
            <strong>Anzeigename:</strong> Frei wählbar (Spitzname), keine Pflicht zur Angabe des
            Klarnamens.
          </li>
          <li>
            <strong>Spiel-Code & Sitzungs-ID:</strong> Technisch erforderlich zur Zuordnung zum
            gewünschten Spielraum.
          </li>
          <li>
            <strong>GPS-Standortdaten:</strong> Nur bei aktiver Freigabe im Browser und nur während
            laufender Spielphasen.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">05</span>
          <h2>Zweck der Datenbearbeitung</h2>
        </div>
        <p>
          Bereitstellung der Spielfunktionalität (Echtzeit-Matchmaking, Positionsabgleich zwischen
          Spielern) und Sicherstellung eines stabilen und missbrauchsfreien Betriebs.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">06</span>
          <h2>Karten und externe Dienste</h2>
        </div>
        <p>
          Zur Darstellung des Spielgebiets und der Kartenansicht werden Vektorkacheln von{" "}
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
            OpenFreeMap ↗
          </a>{" "}
          (basierend auf OpenStreetMap-Daten) geladen. Hierbei wird technisch bedingt die IP-Adresse
          beim Kachelabruf an die Server des Kartendienstes übermittelt.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">07</span>
          <h2>Empfänger von Daten</h2>
        </div>
        <p>
          Hosting- und Kartendienstanbieter im technisch erforderlichen Umfang. Empfänger der Daten
          sind der Hosting-Anbieter Cloudflare und der Kartenanbieter OpenFreeMap, jeweils im Rahmen
          der oben beschriebenen Zwecke. Eine Weitergabe an sonstige Dritte, ein Verkauf von Daten
          oder eine Nutzung zu Werbezwecken findet nicht statt.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">08</span>
          <h2>Speicherdauer</h2>
        </div>
        <p>
          Spieldaten, temporäre IDs und Standorte werden nach Beendigung des Spiels bzw. beim
          Schließen und Aufräumen des Raums vollständig aus dem Arbeitsspeicher gelöscht.
        </p>
      </section>

      <section className="legal-section">
        <div className="legal-section-head">
          <span className="legal-section-num">09</span>
          <h2>Deine Rechte & Änderungen</h2>
        </div>
        <p>
          Du hast das Recht auf Auskunft über deine verarbeiteten Daten sowie ggf. Berichtigung oder
          Löschung gemäß geltendem Datenschutzrecht (DSG / DSGVO). Da jedoch keine persistenten
          Konten oder Protokolle über dich geführt werden, liegen außerhalb eines laufenden Spiels
          in der Regel keine personenbezogenen Daten über dich vor.
        </p>
        <p>
          Diese Erklärung kann angepasst werden, wenn sich die Funktionalitäten des Spiels ändern.
        </p>
      </section>
    </>
  );
}
