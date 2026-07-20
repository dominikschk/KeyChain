/**
 * Einfache i18n DE/EN für Kern-UI (ohne Framework).
 */
export type Locale = 'de' | 'en';

const STORAGE_KEY = 'nudaim_locale';

const messages = {
  de: {
    'brand.name': 'NUDAIM',
    'nav.configurator': 'Konfigurator',
    'nav.admin': 'Admin',
    'cta.save': 'Speichern & bestellen',
    'cta.continue': 'Weiter',
    'legal.preview':
      'Die Bildschirmvorschau ist unverbindlich. Farbtöne können beim Druck abweichen; Logos werden auf höchstens 3 Farben vereinfacht.',
    'legal.preview.short':
      'Vorschau unverbindlich – Farben können beim Druck etwas anders wirken.',
    'cta.order': 'In den Warenkorb',
    'cta.order.direct': 'Bestellen',
    'cta.chip.optional': 'Optional: Chip-Ziel festlegen',
    'cta.chip.short': 'Chip-Ziel (optional)',
    'save.step.preview': 'Bild vom Anhänger wird gemacht…',
    'save.step.upload': 'Dein Design wird hochgeladen…',
    'save.step.db': 'Bestellung wird vorbereitet…',
    'save.step.done': 'Weiter zum Warenkorb…',
    'handoff.title': 'Bereit für die Bestellung',
    'handoff.sub': 'Als Nächstes öffnet der Warenkorb. Deine Links findest du auch in der Bestellmail.',
    'admin.title': 'Produktion & Bestellungen',
    'admin.qc.approve': 'Druck freigeben',
    'admin.qc.reject': 'Zurückweisen',
    'admin.export': 'CSV für Druckerei',
    'admin.filter.all': 'Alle',
    'admin.filter.paid': 'Bezahlt',
    'admin.filter.qc': 'QC offen',
    'admin.filter.production': 'In Produktion',
    'admin.sla.ok': 'SLA ok',
    'admin.sla.overdue': 'SLA überschritten',
    'block.faq': 'FAQ',
    'block.hours': 'Öffnungszeiten',
    'block.gallery': 'Galerie',
    'lang.switch': 'English',
  },
  en: {
    'brand.name': 'NUDAIM',
    'nav.configurator': 'Configurator',
    'nav.admin': 'Admin',
    'cta.save': 'Save & order',
    'cta.continue': 'Continue',
    'legal.preview':
      'On-screen preview is non-binding. Colors may differ in print; logos are simplified to at most 3 colors.',
    'legal.preview.short':
      'Preview is non-binding – print colors may look slightly different.',
    'cta.order': 'Add to cart',
    'cta.order.direct': 'Order',
    'cta.chip.optional': 'Optional: set chip destination',
    'cta.chip.short': 'Chip link (optional)',
    'save.step.preview': 'Creating your keychain preview…',
    'save.step.upload': 'Uploading your design…',
    'save.step.db': 'Preparing your order…',
    'save.step.done': 'Opening the cart…',
    'handoff.title': 'Ready to order',
    'handoff.sub': 'Next up: the cart. Your links are also in the order email.',
    'admin.title': 'Production & orders',
    'admin.qc.approve': 'Approve print',
    'admin.qc.reject': 'Reject',
    'admin.export': 'CSV for print shop',
    'admin.filter.all': 'All',
    'admin.filter.paid': 'Paid',
    'admin.filter.qc': 'QC open',
    'admin.filter.production': 'In production',
    'admin.sla.ok': 'SLA ok',
    'admin.sla.overdue': 'SLA overdue',
    'block.faq': 'FAQ',
    'block.hours': 'Opening hours',
    'block.gallery': 'Gallery',
    'lang.switch': 'Deutsch',
  },
} as const;

export type MessageKey = keyof typeof messages.de;

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'de') return v;
  } catch {
    /* ignore */
  }
  return 'de';
}

export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function t(key: MessageKey, locale?: Locale): string {
  const loc = locale ?? (typeof window !== 'undefined' ? getStoredLocale() : 'de');
  return messages[loc][key] ?? messages.de[key] ?? key;
}

export function toggleLocale(current: Locale): Locale {
  return current === 'de' ? 'en' : 'de';
}
