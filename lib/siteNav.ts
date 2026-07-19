/**
 * Anker-Navigation + Mini-Seite „Kontakt“ für die Microsite.
 */
import type { ModelConfig, NFCBlock } from '../types';
import { splitBlocksForLanding } from './siteLayouts';

export type SitePageSlug = 'home' | 'kontakt';

export interface SiteNavItem {
  id: string;
  label: string;
  /** Hash-Ziel, z. B. #top oder #section-actions */
  href: string;
  /** true = andere Mini-Seite statt Anker auf Home */
  isPage?: boolean;
}

const CONTACT_BUTTONS = new Set([
  'phone',
  'email',
  'whatsapp',
  'booking',
  'google_profile',
]);

/** Explizit oder typisch „Kontakt“-Inhalt. */
export function isKontaktBlock(block: NFCBlock): boolean {
  if (block.settings?.page === 'kontakt') return true;
  if (block.settings?.page === 'home') return false;
  if (block.type === 'map' || block.type === 'hours') return true;
  if (block.type === 'magic_button' && block.buttonType && CONTACT_BUTTONS.has(block.buttonType)) {
    return true;
  }
  return false;
}

export function resolveActivePage(search: string, hash: string): SitePageSlug {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fromQuery = (params.get('p') || params.get('page') || '').toLowerCase();
  if (fromQuery === 'kontakt' || fromQuery === 'contact') return 'kontakt';
  const h = (hash || '').replace(/^#/, '').toLowerCase();
  if (h === 'kontakt' || h === 'contact') return 'kontakt';
  return 'home';
}

export function filterBlocksForPage(blocks: NFCBlock[], page: SitePageSlug): NFCBlock[] {
  const list = blocks || [];
  if (page === 'kontakt') {
    return list.filter(isKontaktBlock);
  }
  // Home: alles außer explizit nur-Kontakt (page=kontakt)
  return list.filter((b) => b.settings?.page !== 'kontakt');
}

export function buildSiteNavItems(
  config: Pick<ModelConfig, 'nfcBlocks' | 'navEnabled' | 'layoutMode'>,
  opts?: { includeKontakt?: boolean }
): SiteNavItem[] {
  if (!config.navEnabled) return [];
  if ((config.layoutMode || 'landing') === 'stack') {
    const items: SiteNavItem[] = [{ id: 'top', label: 'Start', href: '#top' }];
    if (opts?.includeKontakt !== false) {
      const hasKontakt = (config.nfcBlocks || []).some(isKontaktBlock);
      if (hasKontakt) {
        items.push({ id: 'kontakt', label: 'Kontakt', href: '#kontakt', isPage: true });
      }
    }
    return items;
  }

  const { stories, actions, extras } = splitBlocksForLanding(
    filterBlocksForPage(config.nfcBlocks || [], 'home')
  );
  const items: SiteNavItem[] = [{ id: 'top', label: 'Start', href: '#top' }];
  if (stories.length > 0) {
    items.push({ id: 'stories', label: 'Über uns', href: '#section-stories' });
  }
  if (actions.length > 0) {
    items.push({ id: 'actions', label: 'Links', href: '#section-actions' });
  }
  if (extras.length > 0) {
    items.push({ id: 'extras', label: 'Infos', href: '#section-extras' });
  }
  const hasKontakt = (config.nfcBlocks || []).some(isKontaktBlock);
  if (hasKontakt && opts?.includeKontakt !== false) {
    items.push({ id: 'kontakt', label: 'Kontakt', href: '#kontakt', isPage: true });
  }
  return items;
}

export function navHrefForPage(page: SitePageSlug, currentSearch: string): string {
  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch
  );
  // id / token etc. behalten
  if (page === 'home') {
    params.delete('p');
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}#top` : '#top';
  }
  params.set('p', 'kontakt');
  return `?${params.toString()}#kontakt`;
}
