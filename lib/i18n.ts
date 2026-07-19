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
