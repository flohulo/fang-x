import { LEGAL, LEGAL_COMPLETE } from "../legal";

export function LegalScreen({ page }: { page: "impressum" | "datenschutz" }) {
  return (
    <div className="screen legal-screen">
      <article className="card legal">
        <a className="legal-back" href="/">
          ← Zurück zum Spiel
        </a>

        {!LEGAL_COMPLETE && (
          <p className="legal-warning">
            <strong>Hinweis für den Betreiber:</strong> Name, Anschrift und E-Mail sind noch
            nicht eingetragen. Solange sie fehlen, ist diese Seite kein gültiges Impressum.
            Werte über die <code>VITE_LEGAL_*</code>-Variablen setzen (siehe README).
          </p>
        )}

        {page === "impressum" ? <Impressum /> : <Datenschutz />}
      </article>
    </div>
  );
}

function Operator() {
  return (
    <p className="legal-address">
      <OperatorName />
      <br />
      <Field value={LEGAL.street} label="Straße und Hausnummer" />
      <br />
      <Field value={LEGAL.postalCode} label="Postleitzahl" />{" "}
      <Field value={LEGAL.city} label="Ort" />
      <br />
      {LEGAL.country}
    </p>
  );
}

function OperatorName() {
  return <Field value={LEGAL.name} label="Vor- und Nachname" />;
}

function Contact() {
  return (
    <p>
      E-Mail: <Field value={LEGAL.email} label="E-Mail-Adresse" />
      {LEGAL.phone.trim() !== "" && (
        <>
          <br />
          Telefon: {LEGAL.phone}
        </>
      )}
    </p>
  );
}

function Field({ value, label }: { value: string; label: string }) {
  if (value.trim() !== "") return <span>{value}</span>;
  return <span className="legal-placeholder">[{label} ergänzen]</span>;
}

function Impressum() {
  return (
    <>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <Operator />
      <Contact />

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <Operator />

      <h2>Art und Umfang des Angebots</h2>
      <p>
        Fang X ist ein kostenloses, werbefreies Browser-Spiel ohne Benutzerkonten. Es werden
        keine Waren oder Dienstleistungen verkauft und keine Spenden entgegengenommen.
      </p>

      <h2>Streitbeilegung</h2>
      <p>
        Ich bin nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
      </p>

      <h2>Haftung für Inhalte und Links</h2>
      <p>
        Die Inhalte dieser Seiten wurden mit Sorgfalt erstellt. Für die Richtigkeit,
        Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
        Für die Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber
        verantwortlich.
      </p>

      <h2>Kartendaten und Quellcode</h2>
      <p>
        Kartendarstellung mit Daten von{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap-Mitwirkenden
        </a>{" "}          (ODbL), bereitgestellt über{" "}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
          OpenFreeMap
        </a>{" "}
        und OpenMapTiles (CC-BY 4.0). Der Quellcode des Spiels steht unter der GNU
        Affero General Public License v3 (AGPL-3.0).
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <Operator />
      <Contact />

      <h2>2. Das Wichtigste in Kurzform</h2>
      <ul>
        <li>Es gibt keine Konten, keine Anmeldung, keine Werbung und kein Tracking.</li>
        <li>
          Dein Standort wird ausschließlich während eines laufenden Spiels übertragen und
          nur im Arbeitsspeicher des Servers gehalten — Standortverläufe werden nicht
          gespeichert.
        </li>
        <li>
          Mitspieler sehen deinen selbst gewählten Namen und, je nach Spielregeln, deine
          Position (bei X zeitversetzt und ungenau, bei Festnahme sofort).
        </li>
        <li>Nach dem Spiel und beim Leeren des Raums werden die Daten verworfen.</li>
      </ul>

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Die Anwendung läuft bei <strong>Cloudflare</strong> (Cloudflare, Inc., San Francisco,
        USA, mit einer Niederlassung in Deutschland; siehe{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare-Datenschutzhinweise
        </a>
        ). Cloudflare verarbeitet technisch
        notwendige Verbindungsdaten: IP-Adresse, Zeitpunkt, aufgerufene Adresse,
        Browser-Angaben und Fehlermeldungen. Diese Daten dienen dem sicheren und stabilen
        Betrieb (Art. 6 Abs. 1 lit. f DSGVO) und werden von Cloudflare nach dessen eigener
        Löschfrist gelöscht. Mit Cloudflare besteht ein Vertrag über die Auftragsverarbeitung
        (Art. 28 DSGVO); eine Übermittlung in die USA stützt sich auf den
        EU-US Data Privacy Framework bzw. die Standardvertragsklauseln.
      </p>

      <h2>4. Welche Daten wir im Spiel verarbeiten</h2>
      <ul>
        <li>
          <strong>Anzeigename</strong> (freiwillig, kein Klarname nötig): wird im Raum
          gespeichert, damit Mitspieler wissen, wer wer ist.
        </li>
        <li>
          <strong>Spiel-Code und Rolle</strong>: technisch nötig, um dich dem richtigen Raum
          zuzuordnen.
        </li>
        <li>
          <strong>Standort (Breiten- und Längengrad)</strong>: wird nur während der Phasen
          Vorsprung und Spiel angenommen. Detektive erhalten Sichtungen von X (zeitversetzt
          und optional mit Ungenauigkeit); X erhält keine Standorte der Detektive, außer das
          Regelwerk sieht es vor. Verlässt X das Spielgebiet, wird der Standort live geteilt.
        </li>
        <li>
          <strong>Mittelpunkt des Spielgebiets</strong>: einmalig aus der Startposition von X
          berechnet, damit der Kreis auf allen Geräten gleich liegt. Er wird bis zum
          Aufräumen des Raums gespeichert (spätestens 6 Stunden nach dem letzten Beitritt).
        </li>
        <li>
          <strong>Lokaler Speicher im Browser</strong>: Anzeigename, Spiel-Code und eine
          zufällige Spieler-ID, damit ein Reload dich zurück in den Raum bringt. Dazu der
          Offline-Cache der installierbaren App.
        </li>
      </ul>

      <h2>5. Rechtsgrundlagen</h2>
      <p>
        Spielbetrieb und Anzeigename: Art. 6 Abs. 1 lit. b DSGVO (Nutzung des Spiels).
        Standortzugriff: deine Einwilligung über die Browser-Abfrage (Art. 6 Abs. 1 lit. a
        DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit in den Browser-Einstellungen
        widerrufen — dann ist das Spielen allerdings nicht möglich. Sicherheit, Spam- und
        Missbrauchsschutz (Ratenbegrenzung, Logfiles): Art. 6 Abs. 1 lit. f DSGVO. Das
        Speichern von Name und Spieler-ID im Browser ist für die gewünschte Funktion
        erforderlich und deshalb ohne Einwilligung zulässig (§ 25 Abs. 2 TDDDG).
      </p>

      <h2>6. Karten</h2>
      <p>
        Die Karte lädt Vektor-Kacheln von OpenFreeMap und basiert auf Daten von
        OpenStreetMap. Beim Laden werden deine IP-Adresse und der
        sichtbare Kartenausschnitt an den Anbieter übertragen. Rechtsgrundlage ist die
        Bereitstellung der Kartenfunktion (Art. 6 Abs. 1 lit. b DSGVO). Weitere
        Empfänger: keine. Es werden keine Analyse- oder Werbedienste eingesetzt.
      </p>

      <h2>7. Speicherdauer</h2>
      <p>
        Standorte werden nur im Arbeitsspeicher gehalten und verfallen, sobald sie nicht mehr
        aktualisiert werden, spätestens mit dem Spielende. Name und Spieler-ID bleiben
        zusammen mit dem Raum gespeichert, bis dieser leer ist und aufgeräumt wird
        (spätestens 6 Stunden nach dem letzten Beitritt; beendete Spiele nach 30 Minuten).
        Danach werden die Daten gelöscht. Eine Sicherung oder Auswertung findet nicht statt.
      </p>

      <h2>8. Deine Rechte</h2>
      <p>
        Du hast nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
        Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
        (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter
        Interessen (Art. 21). Eine erteilte Einwilligung kannst du jederzeit widerrufen.
        Wende dich dazu an die oben genannte E-Mail-Adresse. Außerdem steht dir ein
        Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere bei der
        Behörde deines Wohnsitzes oder unseres Sitzes.
      </p>
      {LEGAL.authority.trim() !== "" && (
        <p>
          Zuständige Aufsichtsbehörde: <strong>{LEGAL.authority}</strong>
        </p>
      )}

      <h2>9. Keine automatisierte Entscheidungsfindung</h2>
      <p>
        Es findet kein Profiling und keine automatisierte Entscheidungsfindung im Sinne des
        Art. 22 DSGVO statt.
      </p>

      <h2>10. Änderungen</h2>
      <p>
        Diese Erklärung wird angepasst, wenn sich die Verarbeitung ändert.
        {LEGAL.updated.trim() !== "" ? ` Stand: ${LEGAL.updated}.` : ""}
      </p>

      <p className="legal-footnote">
        Hinweis: Der Quellcode ist frei verfügbar (AGPL-3.0). Wer eine eigene Instanz
        betreibt, ist für das Impressum und diese Erklärung selbst verantwortlich und muss
        die Angaben ersetzen.
      </p>
    </>
  );
}
