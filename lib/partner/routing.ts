/**
 * Pfad-Routing für /partner und Unterseiten.
 */
import type { PartnerAppSection } from './types';

export const PARTNER_BASE = '/partner';

const SECTION_PATHS: Record<PartnerAppSection, string> = {
  home: '/partner',
  produkt: '/partner/produkt',
  ablauf: '/partner/ablauf',
  provision: '/partner/provision',
  faq: '/partner/faq',
  sicher: '/partner/sicher',
  registrierung: '/partner/registrierung',
  anmelden: '/partner/anmelden',
  onboarding: '/partner/onboarding',
  dashboard: '/partner/dashboard',
  leads: '/partner/leads',
  bestellungen: '/partner/bestellungen',
  punkte: '/partner/punkte',
  material: '/partner/material',
  'setup-call': '/partner/setup-call',
  einstellungen: '/partner/einstellungen',
  datenschutz: '/partner/datenschutz',
  bedingungen: '/partner/bedingungen',
  bestaetigung: '/partner/bestaetigung',
};

export function isPartnerPath(path: string): boolean {
  return path === '/partner' || path.startsWith('/partner/');
}

export function partnerSectionFromPath(path: string): PartnerAppSection {
  const normalized = path.replace(/\/$/, '') || '/';
  const entry = (Object.entries(SECTION_PATHS) as [PartnerAppSection, string][]).find(
    ([, p]) => p === normalized
  );
  return entry?.[0] ?? 'home';
}

export function partnerPath(section: PartnerAppSection): string {
  return SECTION_PATHS[section];
}

export function navigatePartner(section: PartnerAppSection, replace = false): void {
  const url = partnerPath(section);
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateApp(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Alle Partner-Pfade für Vercel-Rewrites. */
export function allPartnerPaths(): string[] {
  return [...new Set(Object.values(SECTION_PATHS))];
}
