import { LEGAL, LEGAL_COMPLETE, isPlaceholder } from "../legal";

export function LegalScreen({ page }: { page: "impressum" | "datenschutz" }) {
  return (
    <div className="screen legal-screen">
      <article className="card legal">
        <a className="legal-back" href="/">
          ← Zurück zum Spiel
        </a>

        {!LEGAL_COMPLETE && (
          <p className="legal-warning">
            <strong>Hinweis für den Betreiber:</strong> In{" "}
            <code>client/src/legal.ts</code> stehen noch Platzhalter. Sie sind auf dieser
            Seite gelb markiert. Solange Name, Anschrift und E-Mail-Adresse fehlen, ist
            diese Seite kein gültiges Impressum und keine vollständige
            Datenschutzerklärung.
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
      <Field value={LEGAL.name} label="Vor- und Nachname" />
      <br />
      <Field value={LEGAL.street} label="Straße und Hausnummer" />
      <br />
      <Field value={LEGAL.postalCode} label="Postleitzahl" />{" "}
      <Field value={LEGAL.city} label="Ort" />
      <br />
      <Field value={LEGAL.country} label="Land" />
    </p>
  );
}

function Contact() {
  return (
    <p>
      E-Mail: <Field value={LEGAL.email} label="E-Mail-Adresse" />
      {LEGAL.phone.trim() !== "" && (
        <>
          <br />
          Telefon: <Field value={LEGAL.phone} label="Telefonnummer" />
        </>
      )}
    </p>
  );
}

/**
 * Zeigt einen Wert an. Platzhalter aus `legal.ts` werden hervorgehoben; ein
 * leerer Pflichtwert wird ebenfalls als Platzhalter ausgegeben, damit die
 * Lücke auf der Seite nicht übersehen wird.
 */
function Field({ value, label }: { value: string; label: string }) {
  const text = value.trim() === "" ? `[${label} eintragen]` : value;
  if (isPlaceholder(text)) {
    return <span className="legal-placeholder">{text}</span>;
  }
  return <span>{text}</span>;
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
        Fang X ist ein kostenloses, werbefreies Browser-Spiel für Gruppen, die sich
        draußen verabreden. Es gibt keine Benutzerkonten, keine In-App-Käufe und keine
        Werbung. Es werden keine Waren oder Dienstleistungen verkauft und keine Spenden
        entgegengenommen.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Es besteht keine Verpflichtung und keine Bereitschaft, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen
        (§ 36 VSBG).
      </p>

      <h2>Haftung für eigene Inhalte</h2>
      <p>
        Die Inhalte dieses Angebots wurden mit Sorgfalt erstellt. Für Richtigkeit,
        Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen
        werden. Als Betreiber bin ich für eigene Inhalte nach den allgemeinen Gesetzen
        verantwortlich. Eine Verpflichtung, übermittelte oder gespeicherte fremde
        Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen, besteht nach §§ 8 bis 10 DDG nicht.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Dieses Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich
        keinen Einfluss habe. Deshalb kann für diese fremden Inhalte auch keine Gewähr
        übernommen werden. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
        Anbieter oder Betreiber verantwortlich. Zum Zeitpunkt der Verlinkung waren keine
        rechtswidrigen Inhalte erkennbar. Bei Bekanntwerden von Rechtsverstößen entferne
        ich derartige Links unverzüglich.
      </p>

      <h2>Quellcode und Lizenz</h2>
      <p>
        Der Quellcode von Fang X steht unter der GNU Affero General Public License v3
        (AGPL-3.0). Er darf unter den Bedingungen dieser Lizenz verwendet, verändert und
        weitergegeben werden. Wer eine eigene Instanz betreibt, ist für deren Inhalte und
        rechtlichen Angaben selbst verantwortlich.
      </p>

      <h2>Kartendaten</h2>
      <p>
        Kartendarstellung mit Daten von{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap-Mitwirkenden
        </a>{" "}
        (ODbL), bereitgestellt über{" "}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
          OpenFreeMap
        </a>{" "}
        und OpenMapTiles (CC-BY 4.0). Die Urheberangaben stehen zusätzlich direkt in der
        Kartenansicht des Spiels.
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
        <li>Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt.</li>
        <li>
          Dein Standort wird ausschließlich während eines laufenden Spiels übertragen und
          nur im Arbeitsspeicher des Servers gehalten. Standortverläufe werden nicht
          dauerhaft gespeichert.
        </li>
        <li>
          Mitspieler sehen deinen selbst gewählten Namen und – je nach Rolle und
          Spielphase – eine zeitversetzte, optional ungenaue Sichtung deiner Position.
        </li>
        <li>Nach dem Spielende und beim Aufräumen des Raums werden die Daten verworfen.</li>
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

      <h2>5. Rechtsgrundlagen</h2>
      <p>
        Spielbetrieb, Anzeigename und Spieler-ID: Art. 6 Abs. 1 lit. b DSGVO
        (Bereitstellung des gewünschten Spiels). Standortzugriff: deine Einwilligung über
        die Browser-Abfrage (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie
        jederzeit in den Browser-Einstellungen widerrufen – dann ist das Spielen
        allerdings nicht möglich. Sicherheit, Spam- und Missbrauchsschutz
        (Ratenbegrenzung, Server-Logfiles): Art. 6 Abs. 1 lit. f DSGVO. Das Speichern von
        Anzeigename, Spiel-Code und Spieler-ID im Browser ist für die gewünschte Funktion
        erforderlich und deshalb ohne Einwilligung zulässig (§ 25 Abs. 2 TDDDG).
      </p>

      <h2>6. Karten und externe Inhalte</h2>
      <p>
        Die Karte lädt Vektor-Kacheln, Stildefinitionen und Schriftarten von OpenFreeMap
        und basiert auf Daten von OpenStreetMap. Beim Laden werden deine IP-Adresse und
        der sichtbare Kartenausschnitt an den Anbieter übertragen. Rechtsgrundlage ist die
        Bereitstellung der Kartenfunktion (Art. 6 Abs. 1 lit. b DSGVO). Es werden keine
        Analyse-, Werbe- oder Social-Media-Dienste eingesetzt.
      </p>

      <h2>7. Empfänger und Drittlandübermittlung</h2>
      <p>
        Empfänger der Daten sind der Hosting-Anbieter Cloudflare und der Kartenanbieter
        OpenFreeMap, jeweils im Rahmen der oben beschriebenen Zwecke. Eine Weitergabe an
        sonstige Dritte, ein Verkauf von Daten oder eine Nutzung zu Werbezwecken findet
        nicht statt. Weitere Drittlandübermittlungen als die beim Hosting und bei den
        Karten beschriebenen sind nicht vorgesehen.
      </p>

      <h2>8. Speicherdauer</h2>
      <p>
        Standorte und Sichtungen werden nur im Arbeitsspeicher gehalten und verfallen,
        sobald sie nicht mehr aktualisiert werden, spätestens mit dem Spielende. Name,
        Rolle und Spieler-ID bleiben zusammen mit dem Raum gespeichert, bis dieser leer
        ist und aufgeräumt wird (spätestens 6 Stunden nach dem letzten Beitritt; beendete
        Spiele nach 30 Minuten). Danach werden die Daten gelöscht. Eine Sicherung,
        Auswertung oder Profilbildung findet nicht statt. Angaben im lokalen Speicher
        deines Browsers kannst du jederzeit selbst löschen.
      </p>

      <h2>9. Deine Rechte</h2>
      <p>
        Du hast nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
        Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage
        berechtigter Interessen (Art. 21). Eine erteilte Einwilligung kannst du jederzeit
        widerrufen. Wende dich dazu an die oben genannte E-Mail-Adresse. Außerdem steht
        dir ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere
        bei der Behörde deines Wohnsitzes oder unseres Sitzes.
      </p>
      {LEGAL.authority.trim() !== "" && (
        <p>
          Zuständige Aufsichtsbehörde:{" "}
          <strong>
            <Field value={LEGAL.authority} label="Aufsichtsbehörde" />
          </strong>
        </p>
      )}

      <h2>10. Keine automatisierte Entscheidungsfindung</h2>
      <p>
        Es findet kein Profiling und keine automatisierte Entscheidungsfindung im Sinne
        des Art. 22 DSGVO statt.
      </p>

      <h2>11. Änderungen dieser Erklärung</h2>
      <p>
        Diese Erklärung wird angepasst, wenn sich die Verarbeitung oder das Angebot
        ändert. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung.
        {LEGAL.updated.trim() !== "" && (
          <>
            {" "}
            Stand: <Field value={LEGAL.updated} label="Stand" />.
          </>
        )}
      </p>

      <p className="legal-footnote">
        Hinweis: Der Quellcode ist frei verfügbar (AGPL-3.0). Wer eine eigene Instanz
        betreibt, ist für Impressum und Datenschutzerklärung selbst verantwortlich und
        muss die Betreiberangaben ersetzen. Diese Texte sind eine sorgfältige Vorlage,
        keine Rechtsberatung.
      </p>
    </>
  );
}
