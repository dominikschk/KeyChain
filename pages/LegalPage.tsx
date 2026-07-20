/**
 * Rechtstexte (Impressum, Datenschutz, AGB, Widerruf).
 * Vorlagen mit Platzhaltern – kein Ersatz für anwaltliche Prüfung.
 */
import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { getLegalCompany, LEGAL_PATHS, type LegalPath } from '../lib/legalCompany'
import { LegalFooter } from '../components/LegalFooter'

type Props = { path: LegalPath }

function goHome() {
  window.history.pushState({}, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function go(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-base font-extrabold text-navy">{title}</h2>
    <div className="text-sm text-zinc-700 leading-relaxed space-y-2">{children}</div>
  </section>
)

function IncompleteBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-snug">
      Firmendaten sind noch Platzhalter. Bitte in Vercel die Variablen <code className="font-mono">VITE_LEGAL_*</code>{' '}
      setzen (siehe <strong>GO_LIVE_RECHT.md</strong>) und von einer Rechtsberatung prüfen lassen.
    </div>
  )
}

function TemplateDisclaimer() {
  return (
    <p className="text-[11px] text-zinc-500 leading-snug border-t border-zinc-100 pt-3">
      Diese Texte sind eine technische Vorlage für den Go-Live und ersetzen keine individuelle Rechtsberatung.
      Für den Online-Handel in Deutschland sollten Impressum, Datenschutz, AGB und Widerrufsbelehrung von einer
      Fachperson finalisiert werden. Shopify-Policies im Shop-Admin zusätzlich pflegen.
    </p>
  )
}

function ImpressumBody() {
  const c = getLegalCompany()
  return (
    <>
      <IncompleteBanner show={c.incomplete} />
      <Section title="Angaben gemäß § 5 DDG / TMG">
        <p className="whitespace-pre-line">
          {c.name}
          {'\n'}
          {c.street}
          {'\n'}
          {c.zipCity}
          {'\n'}
          {c.country}
        </p>
      </Section>
      <Section title="Vertreten durch">
        <p>{c.representative}</p>
      </Section>
      <Section title="Kontakt">
        <p>
          E-Mail:{' '}
          <a className="text-petrol underline" href={`mailto:${c.email}`}>
            {c.email}
          </a>
        </p>
        {!c.phone.startsWith('[') && <p>Telefon: {c.phone}</p>}
      </Section>
      <Section title="Registereintrag">
        <p>{c.register}</p>
      </Section>
      <Section title="Umsatzsteuer">
        <p>Umsatzsteuer-Identifikationsnummer: {c.vatId}</p>
      </Section>
      <Section title="Verantwortlich für den Inhalt">
        <p>
          {c.representative}, erreichbar unter den oben genannten Kontaktdaten.
        </p>
      </Section>
      <Section title="Online-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            className="text-petrol underline break-all"
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen. [Anpassen, falls du teilnimmst.]
        </p>
      </Section>
    </>
  )
}

function DatenschutzBody() {
  const c = getLegalCompany()
  return (
    <>
      <IncompleteBanner show={c.incomplete} />
      <Section title="1. Verantwortlicher">
        <p className="whitespace-pre-line">
          {c.name}
          {'\n'}
          {c.street}, {c.zipCity}
          {'\n'}
          E-Mail: {c.email}
        </p>
      </Section>
      <Section title="2. Welche Daten wir verarbeiten">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Konfiguration & Bestellung:</strong> Design-Daten (Logo, Farben, Text), Vorschau-Bilder,
            Stückzahl, optionale Handy-Seiten-Inhalte, Config-ID.
          </li>
          <li>
            <strong>Anmeldung:</strong> optional Google-Konto (Name/E-Mail laut Google) oder Gastmodus ohne Konto.
          </li>
          <li>
            <strong>Bestellung & Zahlung:</strong> über Shopify (Adresse, Zahlungsdaten – Verarbeitung durch Shopify).
          </li>
          <li>
            <strong>NFC-Scans:</strong> Zeitpunkt und zugehörige Config-ID (Statistik für dich als Anhänger-Inhaber).
          </li>
          <li>
            <strong>Technik:</strong> Server-Logs beim Hosting; optional Fehleranalyse (Sentry) nur nach Einwilligung.
          </li>
          <li>
            <strong>Optional KI-Assistent:</strong> Chat-Texte können an OpenAI übermittelt werden, wenn der Assistent
            aktiviert ist.
          </li>
        </ul>
      </Section>
      <Section title="3. Zwecke & Rechtsgrundlagen">
        <p>
          Vertragserfüllung und vorvertragliche Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO): Konfigurator, Speichern des
          Designs, Bestellabwicklung. Berechtigtes Interesse (Art. 6 Abs. 1 lit. f): sicherer Betrieb, Missbrauchsschutz.
          Einwilligung (Art. 6 Abs. 1 lit. a / TTDSG): optionale Analyse-Tools.
        </p>
      </Section>
      <Section title="4. Empfänger / Auftragsverarbeiter">
        <p>{c.hosting}</p>
        <p className="mt-2">
          Shop & Kasse: Shopify International Ltd. / Shopify Inc. (siehe Shopify-Datenschutz). Weitere möglich:
          Google (Login/Fonts), OpenAI (nur wenn Assistent genutzt), Sentry (nur nach Opt-in).
        </p>
      </Section>
      <Section title="5. Speicherdauer">
        <p>
          Design-/Config-Daten und Bestellbezüge speichern wir, solange sie für Produktion, Support und gesetzliche
          Aufbewahrung nötig sind. Gast-Entwürfe liegen lokal in deinem Browser (localStorage), bis du sie löschst.
          Scan-Ereignisse: [Aufbewahrungsdauer festlegen, z. B. 24 Monate].
        </p>
      </Section>
      <Section title="6. Cookies & lokale Speicherung">
        <p>
          Notwendig: Session/Gast-Flag, Entwurfsdaten, Stückzahl/Warenkorb-Hilfe, Sprache, Einwilligungsstatus.
          Optional: Sentry nur nach „Alle akzeptieren“. Details steuerst du im Cookie-Hinweis.
        </p>
      </Section>
      <Section title="7. Deine Rechte">
        <p>
          Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Beschwerde bei einer
          Aufsichtsbehörde. Kontakt: {c.email}.
        </p>
      </Section>
      <Section title="8. Pflicht zur Angabe">
        <p>
          Ohne die für die Bestellung nötigen Daten (Design, Lieferadresse in Shopify) können wir den Anhänger nicht
          herstellen bzw. liefern.
        </p>
      </Section>
    </>
  )
}

function AgbBody() {
  const c = getLegalCompany()
  return (
    <>
      <IncompleteBanner show={c.incomplete} />
      <Section title="1. Geltungsbereich">
        <p>
          Diese AGB gelten für Bestellungen personalisierter NFC-Schlüsselanhänger über den NUDAIM-Konfigurator und den
          Shop {c.shopUrl} zwischen {c.name} und Verbraucher:innen bzw. Unternehmer:innen.
        </p>
      </Section>
      <Section title="2. Vertragsschluss">
        <p>
          Die Darstellung im Konfigurator ist unverbindlich. Mit Abschluss der Bestellung in der Shopify-Kasse gibst du
          ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn wir die Bestellung annehmen (z. B. per
          Bestellbestätigung).
        </p>
      </Section>
      <Section title="3. Preise & Zahlung">
        <p>
          Angezeigte Preise verstehen sich in Euro und – sofern nicht anders angegeben – <strong>inkl. MwSt.</strong>{' '}
          Versandkosten und Lieferzeit werden in Shopify bzw. vor dem Zahlungsabschluss ausgewiesen. Zahlung über die
          von Shopify angebotenen Methoden.
        </p>
      </Section>
      <Section title="4. Personalisierung & Vorschau">
        <p>
          Der Anhänger wird nach deinen Angaben gefertigt (Logo, Farben, Text). Die Bildschirmvorschau ist
          unverbindlich; Farbtöne und Oberflächen können durch den 3D-Druck abweichen. Logos können für die Produktion
          auf höchstens drei Farben vereinfacht werden.
        </p>
      </Section>
      <Section title="5. Lieferung">
        <p>
          Liefergebiet und Lieferzeiten: [z. B. Deutschland, ca. X–Y Werktage nach Zahlungseingang – bitte eintragen].
          Teillieferungen sind zulässig, soweit zumutbar.
        </p>
      </Section>
      <Section title="6. Widerruf">
        <p>
          Für Verbraucher:innen gilt das gesetzliche Widerrufsrecht, soweit nicht ausgeschlossen. Bei eindeutig
          personalisierter Ware kann das Widerrufsrecht entfallen (siehe Widerrufsbelehrung). Details:{' '}
          <button type="button" className="text-petrol underline" onClick={() => go(LEGAL_PATHS.widerruf)}>
            Widerruf
          </button>
          .
        </p>
      </Section>
      <Section title="7. Gewährleistung">
        <p>Es gelten die gesetzlichen Mängelrechte. Abweichungen durch das Druckverfahren allein sind kein Mangel.</p>
      </Section>
      <Section title="8. Haftung">
        <p>
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper,
          Gesundheit. Im Übrigen nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren
          Schaden. [Von Rechtsberatung prüfen lassen.]
        </p>
      </Section>
      <Section title="9. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand für
          Kaufleute: [Sitz des Anbieters]. Sollten einzelne Klauseln unwirksam sein, bleibt der Rest wirksam.
        </p>
      </Section>
    </>
  )
}

function WiderrufBody() {
  const c = getLegalCompany()
  return (
    <>
      <IncompleteBanner show={c.incomplete} />
      <Section title="Widerrufsbelehrung">
        <p>
          Verbrauchern steht ein Widerrufsrecht nach folgender Maßgabe zu – sofern nicht einer der Ausnahmen greift.
        </p>
      </Section>
      <Section title="Widerrufsrecht">
        <p>
          Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die
          Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der
          Beförderer ist, die Waren in Besitz genommen hast bzw. hat.
        </p>
        <p>
          Um dein Widerrufsrecht auszuüben, musst du uns ({c.name}, {c.street}, {c.zipCity}, E-Mail: {c.email}) mittels
          einer eindeutigen Erklärung (z. B. Brief oder E-Mail) über deinen Entschluss informieren. Du kannst dafür das
          beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Frist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf
          der Widerrufsfrist absendest.
        </p>
      </Section>
      <Section title="Folgen des Widerrufs">
        <p>
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich
          der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der
          Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens
          binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen
          ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion
          eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart. Wir können die Rückzahlung
          verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die
          Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.
        </p>
        <p>
          Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns
          über den Widerruf unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die
          Waren vor Ablauf der Frist absendest. Du trägst die unmittelbaren Kosten der Rücksendung. [Anpassen, falls ihr
          die Kosten übernehmt.]
        </p>
      </Section>
      <Section title="Ausschluss / Erlöschen bei Personalisierung">
        <p>
          Das Widerrufsrecht besteht nicht bzw. erlischt bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt
          sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist
          oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind (vgl. § 312g Abs. 2
          Nr. 1 BGB). Unsere NFC-Schlüsselanhänger werden nach deinem Logo/Design gefertigt und können darunter fallen.
          <strong> Bitte diese Klausel mit einer Rechtsberatung für euer konkretes Produkt finalisieren.</strong>
        </p>
      </Section>
      <Section title="Muster-Widerrufsformular">
        <p className="whitespace-pre-line text-xs bg-zinc-50 border border-zinc-100 rounded-xl p-3">
          {`An ${c.name}, ${c.street}, ${c.zipCity}, ${c.email}:

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*):

Bestellt am (*)/erhalten am (*):
Name des/der Verbraucher(s):
Anschrift des/der Verbraucher(s):
Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):
Datum:

(*) Unzutreffendes streichen.`}
        </p>
      </Section>
    </>
  )
}

const TITLES: Record<LegalPath, string> = {
  [LEGAL_PATHS.impressum]: 'Impressum',
  [LEGAL_PATHS.datenschutz]: 'Datenschutz',
  [LEGAL_PATHS.agb]: 'Allgemeine Geschäftsbedingungen',
  [LEGAL_PATHS.widerruf]: 'Widerrufsbelehrung',
}

export const LegalPage: React.FC<Props> = ({ path }) => {
  return (
    <div className="min-h-screen bg-cream text-navy flex flex-col">
      <header className="shrink-0 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          type="button"
          onClick={goHome}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-50"
          aria-label="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">NUDAIM</p>
          <h1 className="text-sm font-extrabold truncate">{TITLES[path]}</h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6 pb-24">
        {path === LEGAL_PATHS.impressum && <ImpressumBody />}
        {path === LEGAL_PATHS.datenschutz && <DatenschutzBody />}
        {path === LEGAL_PATHS.agb && <AgbBody />}
        {path === LEGAL_PATHS.widerruf && <WiderrufBody />}
        <TemplateDisclaimer />
        <LegalFooter />
      </main>
    </div>
  )
}

export default LegalPage
