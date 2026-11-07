/**
 * Öffentliche Partnerseiten-Inhalte.
 */
import React from 'react';
import { Check, Shield } from 'lucide-react';
import { NfcDemo } from '../../components/partner/NfcDemo';
import { CommissionCalculator } from '../../components/partner/CommissionCalculator';
import {
  AgeNotice,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
} from '../../components/partner/shared';
import { SCRIPT_EXAMPLES } from '../../lib/partner/defaults';
import { navigatePartner } from '../../lib/partner/routing';
import type { PartnerProgramConfig } from '../../lib/partner/types';
import { centsToEuro, formatEuro } from '../../lib/partner/calculator';

export function PartnerHome({ config }: { config: PartnerProgramConfig }) {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-navy/10 bg-gradient-to-br from-cream via-white to-petrol/10 p-6 sm:p-10">
        <div className="technical-grid-fine absolute inset-0 opacity-60 pointer-events-none" />
        <div className="relative max-w-2xl space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">
            Vertriebsprogramm · Pilot
          </p>
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-navy leading-[1.05]">
            Zeig Unternehmen, was ein NFC-Anhänger im Alltag möglich macht.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl">
            Gebrandete NFC-Schlüsselanhänger öffnen auf dem Smartphone eine digitale Zielseite –
            zum Beispiel Speisekarte, Angebot oder Kontakt. Als Partner vermittelst du passende
            Betriebe, ohne Ware vorzufinanzieren oder Lager zu führen.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <PrimaryButton onClick={() => navigatePartner('registrierung')}>
              Als Partner starten
            </PrimaryButton>
            <SecondaryButton onClick={() => navigatePartner('produkt')}>
              Produkt ansehen
            </SecondaryButton>
          </div>
          <p className="text-xs text-zinc-500">
            Kein garantierter Verdienst. Provision nur bei korrekt zugeordneten, bezahlten und nicht
            stornierten Bestellungen.
          </p>
        </div>
      </section>

      <AgeNotice />

      <NfcDemo />

      <SectionCard eyebrow="In Kürze" title="Was macht ein Partner?">
        <ol className="space-y-3">
          {[
            'Produkt kennenlernen',
            'Demo und Materialien ansehen',
            'Passendes Unternehmen respektvoll ansprechen',
            'Kontakt mit Zustimmung im Partnerbereich eintragen',
            'Bestellung und Provision transparent verfolgen',
          ].map((step, i) => (
            <li key={step} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-navy text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-navy font-medium pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard eyebrow="Provision" title="Wie funktioniert die Vergütung?">
        <p className="text-sm text-zinc-600 leading-snug">
          Du vermittelst Geschäftskunden. Eine Provision wird fällig, wenn die Bestellung dir
          korrekt zugeordnet, bezahlt und nicht storniert wurde. Der verbindliche Satz steht noch
          nicht fest – öffentlich zeigen wir nur einen{' '}
          <strong>Beispielwert</strong> (
          {formatEuro(centsToEuro(config.exampleCommissionPerPieceCents))} je Anhänger).
        </p>
        {config.confirmedCommissionPerPieceCents == null && (
          <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Noch kein bestätigter Provisionssatz hinterlegt – keine feste Einkommenssumme als
            Versprechen.
          </p>
        )}
        <SecondaryButton onClick={() => navigatePartner('provision')}>
          Provisionserklärung & Rechner
        </SecondaryButton>
      </SectionCard>

      <div className="rounded-2xl bg-navy text-cream p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="font-headline font-extrabold text-lg uppercase tracking-tight">
            Bereit für den Einstieg?
          </h2>
          <p className="text-sm text-cream/80 mt-1">
            Kurz registrieren, Onboarding durchlaufen, ersten Lead eintragen.
          </p>
        </div>
        <PrimaryButton
          className="bg-action hover:bg-action/90 text-navy"
          onClick={() => navigatePartner('registrierung')}
        >
          Als Partner starten
        </PrimaryButton>
      </div>
    </div>
  );
}

export function PartnerProduct() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Produkt</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          NFC-Anhänger & Einsatzmöglichkeiten
        </h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Wird der Anhänger mit einem geeigneten Smartphone berührt, öffnet sich eine digitale
          Zielseite. Die Software ist derzeit kostenlos nutzbar. Die folgenden Fälle sind{' '}
          <strong>Beispiele</strong>, keine Garantien für Umsätze oder Ergebnisse. Manche Inhalte
          sind konfigurationsabhängig.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <img
          src="/keychain-base.png"
          alt="NFC-Schlüsselanhänger Produktfoto"
          className="rounded-2xl border border-zinc-200 bg-white object-contain h-56 w-full"
        />
        <img
          src="/keychain-navy.png"
          alt="NFC-Schlüsselanhänger in Navy"
          className="rounded-2xl border border-zinc-200 bg-white object-contain h-56 w-full"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Bildschirmvorschau und Fotos sind unverbindlich. Farbtöne und Oberflächen können durch den
        3D-Druck teilweise anders aussehen.
      </p>

      <NfcDemo />

      {(
        [
          {
            title: 'Pizzeria',
            items: [
              'Digitale Speisekarte',
              'Tagesangebot',
              'Bewertungsseite',
              'Treueprogramm (konfigurationsabhängig)',
              'Kontakt oder Reservierung',
            ],
          },
          {
            title: 'Autohaus',
            items: [
              'Fahrzeugdetails',
              'Anfrage zu einer Probefahrt',
              'Kontakt zur Ansprechperson',
              'Aktionsseite für ein Modell',
            ],
          },
          {
            title: 'Messe und Event',
            items: [
              'Produktinformationen',
              'Kontaktseite',
              'Terminvereinbarung',
              'Veranstaltungs- oder Aktionsseite',
            ],
          },
          {
            title: 'Sonstige Firmen',
            items: [
              'Individuelle Marken- und Kampagnenseite',
              'Kontakt oder Social Media',
              'Produkt- oder Serviceübersicht',
            ],
          },
        ] as const
      ).map((block) => (
        <SectionCard key={block.title} title={block.title}>
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-700">
                <Check size={16} className="text-petrol shrink-0 mt-0.5" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}

export function PartnerProcess() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Ablauf</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          So funktioniert das Partnerprogramm
        </h1>
      </header>
      <AgeNotice />
      <ol className="space-y-4">
        {[
          {
            t: 'Kennenlernen',
            d: 'Produkt-Demo ansehen und verstehen, was der Anhänger für Betriebe leistet.',
          },
          {
            t: 'Materialien',
            d: 'Gesprächsleitfäden und verfügbare Unterlagen nutzen – nichts erfinden.',
          },
          {
            t: 'Ansprechen',
            d: 'Nur passende Unternehmen, möglichst digital oder telefonisch zuerst, Termin vereinbaren. Bei Minderjährigen: Zustimmung und ggf. Begleitung der Erziehungsberechtigten.',
          },
          {
            t: 'Lead eintragen',
            d: 'Kontakt nur mit legitimer Grundlage im Partnerbereich erfassen.',
          },
          {
            t: 'Nachverfolgen',
            d: 'Status, Bestellungen und Provisionen einsehen – ohne Vorfinanzierung oder Lager.',
          },
        ].map((s, i) => (
          <li key={s.t} className="rounded-2xl border border-zinc-200 bg-white p-5 flex gap-4">
            <span className="w-10 h-10 rounded-xl bg-petrol/10 text-petrol font-headline font-extrabold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight">
                {s.t}
              </h2>
              <p className="text-sm text-zinc-600 mt-1 leading-snug">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-zinc-600">{/* pilot */}
        Das Modell wird zuerst als Pilot mit wenigen Partnern getestet und anhand echter Resultate
        verbessert.
      </p>
    </div>
  );
}

export function PartnerProvision({ config }: { config: PartnerProgramConfig }) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Provision</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Verständliche Provisionserklärung
        </h1>
        <p className="text-sm text-zinc-600">
          Unterscheide klar: Beispielrechnung ≠ tatsächliche Provision ≠ möglicher Verdienst ≠
          garantierter Verdienst. Es gibt keinen garantierten Verdienst.
        </p>
      </header>

      <SectionCard title="Wann gilt was?">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-navy">Zuordnung eines Leads</dt>
            <dd className="text-zinc-600">{config.attributionRulesMarkdown}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Wann ist eine Provision verdient?</dt>
            <dd className="text-zinc-600">
              Erst bei bezahlter, nicht stornierter Bestellung mit korrekter Zuordnung.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Bestätigung & Auszahlung</dt>
            <dd className="text-zinc-600 whitespace-pre-wrap">{config.payoutRulesMarkdown}</dd>
          </div>
        </dl>
      </SectionCard>

      <CommissionCalculator config={config} />

      <SectionCard title="Öffentlicher Beispielwert">
        <p className="text-sm text-zinc-600">
          Admin-Beispielwert je Anhänger:{' '}
          <strong>{formatEuro(centsToEuro(config.exampleCommissionPerPieceCents))}</strong>{' '}
          (Beispielwert).
        </p>
        <p className="text-sm text-zinc-600">
          Bestätigter Satz:{' '}
          {config.confirmedCommissionPerPieceCents == null
            ? config.confirmedCommissionLabel
            : formatEuro(centsToEuro(config.confirmedCommissionPerPieceCents))}
        </p>
      </SectionCard>
    </div>
  );
}

export function PartnerFaq() {
  const items = [
    {
      q: 'Muss ich Ware kaufen oder lagern?',
      a: 'Nein. Partner vermitteln – ohne Vorfinanzierung und ohne eigenes Lager.',
    },
    {
      q: 'Gibt es einen garantierten Verdienst?',
      a: 'Nein. Provision entsteht nur bei korrekt zugeordneten, bezahlten und nicht stornierten Bestellungen.',
    },
    {
      q: 'Darf ich als Minderjährige:r mitmachen?',
      a: 'Nur nach Prüfung der gesetzlichen Anforderungen und mit erforderlicher Zustimmung der Erziehungsberechtigten.',
    },
    {
      q: 'Wie spreche ich Unternehmen an?',
      a: 'Respektvoll, ehrlich, ohne erfundene Preise oder Ergebnisse. Bevorzugt Termin vereinbaren; keine unangekündigten Alleinbesuche.',
    },
    {
      q: 'Was kostet die Software für Kunden?',
      a: 'Die Software ist derzeit kostenlos nutzbar. Verkaufspreise und Staffeln legt der Betreiber fest.',
    },
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">FAQ</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Häufige Fragen
        </h1>
      </header>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 group"
          >
            <summary className="font-semibold text-sm cursor-pointer list-none flex justify-between gap-2">
              {item.q}
              <span className="text-petrol group-open:rotate-45 transition">+</span>
            </summary>
            <p className="text-sm text-zinc-600 mt-2 leading-snug">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function PartnerSafety() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol flex items-center gap-2">
          <Shield size={14} aria-hidden /> Sicherheit
        </p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Sicher und fair verkaufen
        </h1>
      </header>
      <AgeNotice />
      <SectionCard title="Regeln">
        <ol className="space-y-3 text-sm text-zinc-700 list-decimal pl-4">
          <li>Nur passende Unternehmen kontaktieren.</li>
          <li>Sich als Vermittler des Produkts vorstellen.</li>
          <li>Keine Funktionen, Ergebnisse oder Preise erfinden.</li>
          <li>Kein Unternehmen wiederholt kontaktieren, wenn es kein Interesse hat.</li>
          <li>
            Keine persönlichen Daten ohne legitimen Grund und erforderliche Zustimmung erfassen.
          </li>
          <li>Unternehmensdaten nur für die Vermittlung verwenden.</li>
          <li>
            Bei einem persönlichen Termin die eigene Sicherheit beachten und bei Minderjährigen die
            Zustimmung beziehungsweise Begleitung der Erziehungsberechtigten klären.
          </li>
        </ol>
      </SectionCard>

      <SectionCard title="Gesprächseinstiege (Beispiele)">
        {(
          [
            ['Pizzeria', SCRIPT_EXAMPLES.pizza],
            ['Autohaus', SCRIPT_EXAMPLES.auto],
            ['Messe', SCRIPT_EXAMPLES.messe],
          ] as const
        ).map(([label, script]) => (
          <div key={label} className="space-y-2 border-t border-zinc-100 pt-3 first:border-0 first:pt-0">
            <h3 className="font-semibold text-sm">{label}</h3>
            <blockquote className="text-sm text-zinc-700 leading-snug border-l-2 border-petrol/40 pl-3">
              „{script.opener}“
            </blockquote>
            <p className="text-xs text-zinc-500">
              Bei „Kein Interesse“: „{script.noInterest}“
            </p>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

export function PartnerTerms({ config }: { config: PartnerProgramConfig }) {
  return (
    <div className="space-y-4">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Partnerbedingungen
      </h1>
      <p className="text-xs text-zinc-500">
        Editierbar durch den Admin. Unbekannte Details sind als noch festzulegen markiert.
      </p>
      <pre className="whitespace-pre-wrap text-sm text-zinc-700 bg-white border border-zinc-200 rounded-2xl p-5 font-sans leading-relaxed">
        {config.termsMarkdown}
      </pre>
    </div>
  );
}
