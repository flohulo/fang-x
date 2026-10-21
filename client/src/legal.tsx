export interface LegalInfo {
  email: string;
  updated: string;
}

export const LEGAL: LegalInfo = {
  email: "fang-x@meine-dateien.info",
  updated: "20.10.2026",
};

const PLACEHOLDER_MARKER = /\[[^\]]*\]/;
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKER.test(value);
}

export const LEGAL_COMPLETE = LEGAL.email.trim() !== "" && LEGAL.updated.trim() !== "";

export function LegalScreen({ page }: { page: "impressum" | "datenschutz" }) {
  return <div>{page === "impressum" ? <Impressum /> : <Datenschutz />}</div>;
}

export default LegalScreen;

function Impressum() {
  return (
    <>
      <h1>Impressum</h1>
      <p>Betreiber:</p>
      <p>E-Mail: {LEGAL.email}</p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>{LEGAL.email}</p>

      <h2>Art und Umfang des Angebots</h2>
      <p>Fang X ist ein kostenloses, werbefreies Open-Source-Browser-Spiel.</p>

      <h2>Haftungsausschluss</h2>
      <p>
        Alle Inhalte werden mit Sorgfalt bereitgestellt, jedoch ohne Gewähr. Für Richtigkeit,
        Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Für Inhalte externer Webseiten sind deren Betreiber verantwortlich. Es kann für diese
        fremden Inhalte auch keine Gewähr übernommen werden. Für die Inhalte der verlinkten Seiten
        ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Zum Zeitpunkt der Verlinkung
        waren keine rechtswidrigen Inhalte erkennbar. Bei Bekanntwerden von Rechtsverstössen werden
        derartige Links unverzüglich entfernt.
      </p>

      <h2>Quellcode und Lizenz</h2>
      <p>Dieses Projekt steht unter der AGPL-3.0.</p>

      <h2>Kartendaten</h2>
      <p>OpenStreetMap, OpenFreeMap, MapLibre und OpenMapTiles.</p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>{LEGAL.email}</p>

      <h2>2. Kurzfassung</h2>
      <ul>
        <li>Keine Werbung.</li>
        <li>Kein Tracking.</li>
        <li>Keine Benutzerkonten.</li>
        <li>
          Dein Standort wird ausschliesslich während eines laufenden Spiels übertragen. Standortverläufe
          werden nicht gespeichert.
        </li>
        <li>
          Mitspieler sehen deinen selbst gewählten Namen und – je nach Rolle und Spielphase – deinen Standort.
        </li>
      </ul>

      <h2>3. Hosting und Logdaten</h2>
      <p>Für den Betrieb werden technisch notwendige Verbindungsdaten verarbeitet.
        Das Angebot wird bei Cloudflare gehostet (Cloudflare, Inc., 101 Townsend St.,
        San Francisco, CA 94107, USA; für den europäischen Raum Cloudflare Germany GmbH,
        München). Cloudflare verarbeitet als Hosting-Anbieter technisch notwendige
        Verbindungsdaten: IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Adresse,
        übertragene Datenmenge, Browser- und Betriebssystemangaben sowie Fehlermeldungen.
        Diese Verarbeitung ist für die sichere und stabile Auslieferung des Angebots
        erforderlich. Weitere Informationen findest du in den
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare-Datenschutzhinweisen
        </a>
      </p>

      <h2>4. Im Spiel verarbeitete Daten</h2>
      <p>
        Anzeigename, Spiel-ID, technische Sitzungsdaten und Standortdaten während eines laufenden
        Spiels.
      </p>

      <h2>5. Zweck der Datenbearbeitung</h2>
      <p>Bereitstellung des Spiels und Sicherstellung eines stabilen Betriebs.</p>

      <h2>6. Karten und externe Dienste</h2>
      <p>Zur Kartenanzeige werden externe Kartendienste verwendet.</p>

      <h2>7. Empfänger von Daten</h2>
      <p>Hosting- und Kartendienstanbieter im technisch erforderlichen Umfang. Empfänger der Daten sind der Hosting-Anbieter Cloudflare und der Kartenanbieter
        OpenFreeMap, jeweils im Rahmen der oben beschriebenen Zwecke. Eine Weitergabe an
        sonstige Dritte, ein Verkauf von Daten oder eine Nutzung zu Werbezwecken findet
        nicht statt. Weitere Drittlandübermittlungen als die beim Hosting und bei den
        Karten beschriebenen sind nicht vorgesehen.</p>

      <h2>8. Speicherdauer</h2>
      <p>Spieldaten werden nach Ende des Spiels gelöscht.</p>

      <h2>9. Änderungen</h2>
      <p>Stand: {LEGAL.updated || "aktuelle Version"}</p>
    </>
  );
}
