/**
 * Standardwerte und Platzhalter-Inhalte für das Partnerprogramm.
 * Preise/Provisionen sind editierbar – nichts als verbindlich markieren.
 */
import type {
  DownloadMaterial,
  LearningLevel,
  LearningModule,
  PartnerProgramConfig,
} from './types';

export const CONSENT_TEXT_VERSION = 'partner-v1-2026-11';

export const DEFAULT_PROGRAM_CONFIG: PartnerProgramConfig = {
  exampleCommissionPerPieceCents: 30,
  confirmedCommissionPerPieceCents: null,
  confirmedCommissionLabel: 'Noch nicht verbindlich festgelegt',
  priceTiersText:
    'Preisstaffeln werden vom Betreiber gepflegt. Öffentliche Beispielwerte sind unverbindlich.',
  shippingNote: 'Versandkosten legt der Betreiber fest (noch zu konfigurieren).',
  brandingCostNote: 'Branding-/Einrichtungskosten legt der Betreiber fest (noch zu konfigurieren).',
  termsMarkdown: `## Partnerbedingungen (Entwurf)

Diese Bedingungen sind noch nicht endgültig. Der Betreiber pflegt den verbindlichen Text im Adminbereich.

### Was ein Partner macht
Partner vermitteln Geschäftskunden. Es gibt keine Vorfinanzierung und kein eigenes Lager.

### Provision
Eine Provision wird nur für korrekt zugeordnete, bezahlte und nicht stornierte Bestellungen fällig. Der genaue Satz und die Auszahlung werden vom Betreiber festgelegt.

### Pilot
Das Programm startet als Pilot mit einer kleinen Zahl von Partnern und wird anhand echter Resultate angepasst.`,
  payoutRulesMarkdown: `## Zuordnung, Provision und Auszahlung

1. **Zuordnung:** Ein Lead gilt als vermittelt, wenn er mit gültigem Partnercode bzw. durch den Partner selbst eingetragen und vom Betreiber bestätigt wurde. Mehrfachzuordnungen werden manuell geprüft.
2. **Verdient:** Provision entsteht erst bei bezahlter, nicht stornierter Bestellung.
3. **Bestätigt:** Der Betreiber bestätigt Provisionen nach Prüfung (Zahlungseingang, Stornofrist – Details vom Betreiber festzulegen).
4. **Storno/Rückerstattung:** Bei Storno oder Rückerstattung entfällt bzw. wird die Provision rückgängig gemacht.
5. **Auszahlung:** Zeitpunkt, Mindestbetrag und Rechnungsstellung legt der Betreiber fest.
6. **Dokumentation:** Je nach Status (z. B. Selbständigkeit) kann eine Rechnung nötig sein – vom Betreiber zu klären.`,
  attributionRulesMarkdown:
    'Ein Kontakt gilt als vermittelt, wenn der Partner den Lead mit Einwillungsgrundlage einträgt oder der Kunde den Partnercode angibt. Doppelte und unklare Fälle entscheidet der Betreiber.',
  emailConfigured: false,
  pilotNote:
    'Pilotphase: kleine Partnerzahl, Abläufe und Sätze können sich anhand echter Ergebnisse ändern.',
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_LEARNING_MODULES: LearningModule[] = [
  {
    id: 'mod-product',
    title: 'Produktschulung',
    description: 'Wie der NFC-Anhänger funktioniert und was Unternehmen damit machen können.',
    points: 20,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'mod-demo',
    title: 'Demo ansehen',
    description: 'Die Beispiel-Demo (z. B. Pizzeria) einmal durchspielen.',
    points: 10,
    sortOrder: 2,
    active: true,
  },
  {
    id: 'mod-safety',
    title: 'Sicher und fair verkaufen',
    description: 'Regeln für respektvolle, sichere Ansprache.',
    points: 20,
    sortOrder: 3,
    active: true,
  },
  {
    id: 'mod-scripts',
    title: 'Gesprächsleitfaden',
    description: 'Einen Leitfaden wählen und die Einstiege lesen.',
    points: 15,
    sortOrder: 4,
    active: true,
  },
  {
    id: 'mod-materials',
    title: 'Materialien herunterladen',
    description: 'Verfügbare Unterlagen im Materialbereich ansehen.',
    points: 10,
    sortOrder: 5,
    active: true,
  },
  {
    id: 'mod-setup-call',
    title: 'Setup-Call angefragt',
    description: 'Einen Terminwunsch für das Beratungsgespräch stellen.',
    points: 15,
    sortOrder: 6,
    active: true,
  },
  {
    id: 'mod-first-lead',
    title: 'Erster qualifizierter Lead',
    description: 'Einen korrekt und zulässig eingereichten Lead eintragen.',
    points: 25,
    sortOrder: 7,
    active: true,
  },
  {
    id: 'mod-feedback',
    title: 'Rückmeldung zu Materialien',
    description: 'Kurzes Feedback, was an den Unterlagen hilft oder fehlt.',
    points: 10,
    sortOrder: 8,
    active: true,
  },
];

export const DEFAULT_LEARNING_LEVELS: LearningLevel[] = [
  {
    id: 'starter',
    title: 'Starter',
    minPoints: 0,
    benefits: 'Zugang zu Demo, Leitfäden und Lead-Erfassung.',
    higherCommissionEnabled: false,
    higherCommissionNote: '',
  },
  {
    id: 'advanced',
    title: 'Fortgeschritten',
    minPoints: 50,
    benefits: 'Mehr Lernmodule freigeschaltet; Vorteile nur laut Admin-Konfiguration.',
    higherCommissionEnabled: false,
    higherCommissionNote: 'Kein automatischer Provisionsvorteil, solange nicht freigegeben.',
  },
  {
    id: 'partner',
    title: 'Partner',
    minPoints: 100,
    benefits: 'Volle Materialbibliothek und Pilot-Feedbackkanal.',
    higherCommissionEnabled: false,
    higherCommissionNote: 'Höhere Provision nur, wenn der Betreiber sie eingerichtet hat.',
  },
];

export const DEFAULT_MATERIALS: DownloadMaterial[] = [
  {
    id: 'mat-product-sheet',
    title: 'Produktblatt (PDF)',
    description: 'Kurze Produktübersicht für Unternehmen.',
    category: 'Produkt',
    url: null,
    available: false,
    sortOrder: 1,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-pitch-deck',
    title: 'Kurze Firmenpräsentation',
    description: 'Folien für ein kurzes Vorstellungsgespräch.',
    category: 'Produkt',
    url: null,
    available: false,
    sortOrder: 2,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-demo-video',
    title: 'Demovideo',
    description: 'Kurzes Video: Antippen → Seite öffnet sich.',
    category: 'Demo',
    url: null,
    available: false,
    sortOrder: 3,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-script-pizza',
    title: 'Gesprächsleitfaden Pizzerien',
    description: 'Höfliche Einstiege und Reaktion auf „Kein Interesse“.',
    category: 'Leitfaden',
    url: null,
    available: false,
    sortOrder: 4,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-script-auto',
    title: 'Gesprächsleitfaden Autohäuser',
    description: 'Gesprächseinstiege für Autohäuser.',
    category: 'Leitfaden',
    url: null,
    available: false,
    sortOrder: 5,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-script-messe',
    title: 'Gesprächsleitfaden Messeaussteller',
    description: 'Gesprächseinstiege für Messe und Events.',
    category: 'Leitfaden',
    url: null,
    available: false,
    sortOrder: 6,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-email-template',
    title: 'Vorlage personalisierte E-Mail',
    description: 'Digitale Erstansprache mit Terminbitte.',
    category: 'Vorlagen',
    url: null,
    available: false,
    sortOrder: 7,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-faq-business',
    title: 'FAQ für Unternehmen',
    description: 'Häufige Fragen von Geschäftskunden.',
    category: 'Vorlagen',
    url: null,
    available: false,
    sortOrder: 8,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-pricing',
    title: 'Preis- und Mengenstaffeln',
    description: 'Vom Betreiber freigegebene Staffeln (wenn hinterlegt).',
    category: 'Preise',
    url: null,
    available: false,
    sortOrder: 9,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-order-template',
    title: 'Musterbestellung / Angebotsanfrage',
    description: 'Vorlage zur Weitergabe an interessierte Betriebe.',
    category: 'Vorlagen',
    url: null,
    available: false,
    sortOrder: 10,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'mat-photos',
    title: 'Bildmaterial und Produktfotos',
    description: 'Offizielle Produktfotos aus dem Studio.',
    category: 'Bilder',
    url: '/keychain-base.png',
    available: true,
    sortOrder: 11,
    updatedAt: new Date(0).toISOString(),
  },
];

export const SCRIPT_EXAMPLES = {
  pizza: {
    opener:
      'Hallo, ich stelle einen NFC-Anhänger für Unternehmen vor. Damit können Gäste zum Beispiel direkt eure Speisekarte oder ein Angebot auf dem Smartphone öffnen. Darf ich euch ein kurzes Demo zeigen oder eine passende Ansprechperson erfragen?',
    noInterest:
      'Alles klar, danke für eure Zeit. Ich melde mich nicht erneut, außer ihr wünscht das später. Schönen Tag noch.',
  },
  auto: {
    opener:
      'Hallo, ich stelle NFC-Schlüsselanhänger für Unternehmen vor. Damit können Interessierte z. B. Fahrzeugdetails oder eine Probefahrt-Anfrage auf dem Handy öffnen. Darf ich kurz zeigen, wie das aussieht, oder wen ich dazu ansprechen darf?',
    noInterest:
      'Verstanden, danke. Ich werde euch nicht weiter kontaktieren, sofern ihr das nicht ausdrücklich wünscht. Alles Gute.',
  },
  messe: {
    opener:
      'Hallo, ich vermittle NFC-Anhänger für Aussteller. Besucher können damit Produktinfos oder eine Kontaktseite öffnen. Darf ich eine kurze Demo zeigen oder eine Ansprechperson nennen?',
    noInterest:
      'In Ordnung, danke für die Rückmeldung. Kein weiterer Kontakt von mir ohne eure Zustimmung.',
  },
} as const;

export function resolveLevel(
  points: number,
  levels: LearningLevel[] = DEFAULT_LEARNING_LEVELS
): LearningLevel {
  const sorted = [...levels].sort((a, b) => a.minPoints - b.minPoints);
  let current = sorted[0]!;
  for (const lvl of sorted) {
    if (points >= lvl.minPoints) current = lvl;
  }
  return current;
}
