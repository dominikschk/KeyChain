/**
 * Einfache CCP-Versionshistorie (lokal + optional plate_data).
 * Max. 5 Snapshots – Rollback der Handy-Seite ohne DB-Migration nötig (localStorage).
 */
import type { FontStyle, ModelConfig, NFCBlock, ProfileTheme } from '../types';

export const CCP_HISTORY_MAX = 5;

export interface CcpSnapshot {
  id: string;
  savedAt: string;
  label: string;
  profileTitle: string;
  headerImageUrl?: string | null;
  profileLogoUrl?: string | null;
  accentColor: string;
  theme: ProfileTheme;
  fontStyle: FontStyle;
  nfcBlocks: NFCBlock[];
}

function storageKey(configId: string): string {
  return `nudaim_ccp_history_${configId}`;
}

export function createCcpSnapshot(config: ModelConfig, label?: string): CcpSnapshot {
  const title = (config.profileTitle || 'Seite').trim().slice(0, 40);
  const when = new Date();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `snap_${when.getTime()}`,
    savedAt: when.toISOString(),
    label: label || `${title} · ${when.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`,
    profileTitle: config.profileTitle,
    headerImageUrl: config.headerImageUrl ?? null,
    profileLogoUrl: config.profileLogoUrl ?? null,
    accentColor: config.accentColor,
    theme: config.theme,
    fontStyle: config.fontStyle,
    nfcBlocks: JSON.parse(JSON.stringify(config.nfcBlocks || [])) as NFCBlock[],
  };
}

export function loadLocalCcpHistory(configId: string): CcpSnapshot[] {
  if (typeof localStorage === 'undefined' || !configId) return [];
  try {
    const raw = localStorage.getItem(storageKey(configId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CcpSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, CCP_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

export function saveLocalCcpHistory(configId: string, history: CcpSnapshot[]): void {
  if (typeof localStorage === 'undefined' || !configId) return;
  try {
    localStorage.setItem(storageKey(configId), JSON.stringify(history.slice(0, CCP_HISTORY_MAX)));
  } catch {
    /* Quota / private mode */
  }
}

/** Vor dem Speichern: aktuellen Stand als Version ablegen. */
export function pushCcpSnapshot(configId: string, config: ModelConfig): CcpSnapshot[] {
  const snap = createCcpSnapshot(config);
  const prev = loadLocalCcpHistory(configId).filter((s) => s.id !== snap.id);
  const next = [snap, ...prev].slice(0, CCP_HISTORY_MAX);
  saveLocalCcpHistory(configId, next);
  return next;
}

export function applyCcpSnapshot(config: ModelConfig, snap: CcpSnapshot): ModelConfig {
  return {
    ...config,
    profileTitle: snap.profileTitle,
    headerImageUrl: snap.headerImageUrl ?? undefined,
    profileLogoUrl: snap.profileLogoUrl ?? undefined,
    accentColor: snap.accentColor,
    theme: snap.theme,
    fontStyle: snap.fontStyle,
    nfcBlocks: JSON.parse(JSON.stringify(snap.nfcBlocks)) as NFCBlock[],
  };
}

/** plate_data.ccpHistory + local zusammenführen (neueste zuerst). */
export function mergeCcpHistories(
  fromPlate: unknown,
  fromLocal: CcpSnapshot[]
): CcpSnapshot[] {
  const plateList = Array.isArray(fromPlate) ? (fromPlate as CcpSnapshot[]) : [];
  const map = new Map<string, CcpSnapshot>();
  for (const s of [...fromLocal, ...plateList]) {
    if (s && typeof s.id === 'string' && Array.isArray(s.nfcBlocks)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
    .slice(0, CCP_HISTORY_MAX);
}
