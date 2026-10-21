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

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Das Angebot wird bei Cloudflare gehostet (Cloudflare, Inc., 101 Townsend St.,
        San Francisco, CA 94107, USA; für den europäischen Raum Cloudflare Germany GmbH,
        München). Cloudflare verarbeitet als Hosting-Anbieter technisch notwendige
        Verbindungsdaten: IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Adresse,
        übertragene Datenmenge, Browser- und Betriebssystemangaben sowie Fehlermeldungen.
        Diese Verarbeitung ist für die sichere und stabile Auslieferung des Angebots
        erforderlich (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      <p>
        Cloudflare stellt einen Vertrag über die Auftragsverarbeitung nach Art. 28 DSGVO
        bereit. Soweit personenbezogene Daten in die USA übermittelt werden, stützt sich
        die Übermittlung auf das EU-US Data Privacy Framework (Cloudflare ist dort
        zertifiziert) und ergänzend auf die Standardvertragsklauseln der EU-Kommission.
        Weitere Informationen findest du in den{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare-Datenschutzhinweisen
        </a>
        .
      </p>

      <h2>4. Daten, die im Spiel verarbeitet werden</h2>
      <ul>
        <li>
          <strong>Anzeigename</strong> (freiwillig, kein Klarname erforderlich, maximal 24
          Zeichen): wird im Spielraum gespeichert, damit Mitspieler wissen, wer wer ist.
        </li>
        <li>
          <strong>Spiel-Code, Rolle und Spieler-ID</strong>: technisch erforderlich, um
          dich dem richtigen Raum und Platz zuzuordnen.
        </li>
        <li>
          <strong>Standort (Breiten- und Längengrad)</strong>: wird nur während der Phasen
          Vorsprung und Spiel angenommen. Detektive erhalten Sichtungen von X –
          zeitversetzt und je nach Regelwerk mit Ungenauigkeit. X erhält keine Standorte
          der Detektive. Verlässt X das Spielgebiet, wird der Standort live an die
          Detektive geteilt. Standorte werden nur im Arbeitsspeicher gehalten und nicht in
          der Datenbank gespeichert.
        </li>
        <li>
          <strong>Mittelpunkt des Spielgebiets</strong>: einmalig aus der Startposition von
          X berechnet, damit der Kreis auf allen Geräten gleich liegt. Er wird bis zum
          Aufräumen des Raums gespeichert (spätestens 6 Stunden nach dem letzten
          Beitritt).
        </li>
        <li>
          <strong>Lokaler Speicher im Browser</strong>: Anzeigename, Spiel-Code und die
          vom Server vergebene Spieler-ID, damit ein Reload dich zurück in den Raum
          bringt. Dazu der Offline-Cache der installierbaren App. Diese Speicherung ist
          für die gewünschte Funktion erforderlich (§ 25 Abs. 2 TDDDG).
        </li>
        <li>
          <strong>Ratenbegrenzung</strong>: Zur Abwehr von Missbrauch zählt der Server
          Anfragen pro IP-Adresse in einem kurzlebigen Zähler im Arbeitsspeicher. Der
          Zähler wird nach Ablauf des Zeitfensters (höchstens 10 Minuten) verworfen.
        </li>
      </ul>

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
