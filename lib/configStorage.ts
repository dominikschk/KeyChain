/**
 * Konfigurations-Export/Import, Entwurf (localStorage), Zurücksetzen.
 */

import type { ModelConfig, NFCBlock } from '../types';
import { DEFAULT_CONFIG } from '../constants';

const STORAGE_KEY_DRAFT = 'nudaim_studio_draft';
/** SessionStorage-Key für Vorschau in neuem Tab. */
export const PREVIEW_STORAGE_KEY = 'nudaim_preview_config';

/** Speichert die aktuelle Konfiguration als Entwurf im localStorage. */
export function saveDraft(config: ModelConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(config));
  } catch (e) {
    console.warn('saveDraft failed:', e);
  }
}

/** Lädt den gespeicherten Entwurf oder null. */
export function loadDraft(): ModelConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    const result = importConfigFromJson(raw);
    return result.success ? result.config : null;
  } catch {
    return null;
  }
}

/** Löscht den gespeicherten Entwurf. */
export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch {
    // ignore
  }
}

/** Speichert die Konfiguration für die Vorschau in neuem Tab (sessionStorage). */
export function setPreviewConfig(config: ModelConfig): void {
  try {
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('setPreviewConfig failed:', e);
  }
}

/** Lädt die Konfiguration für die Vorschau (sessionStorage). */
export function getPreviewConfig(): ModelConfig | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const result = importConfigFromJson(raw);
    return result.success ? result.config : null;
  } catch {
    return null;
  }
}

/** Gibt eine tiefe Kopie der Standard-Konfiguration zurück (für Zurücksetzen). */
export function getDefaultConfig(): ModelConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/** Serialisiert die Konfiguration als JSON (für Export). */
export function exportConfigToJson(config: ModelConfig): string {
  return JSON.stringify(config, null, 2);
}

/** Erstellt einen Download-Link für eine JSON-Datei. */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { success: true; config: ModelConfig }
  | { success: false; error: string };

/**
 * Parst und validiert eine JSON-Konfiguration.
 * Gibt eine gültige ModelConfig zurück oder eine Fehlermeldung.
 */
export function importConfigFromJson(json: string): ImportResult {
  try {
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Ungültiges JSON.' };
    }

    const obj = data as Record<string, unknown>;

    // Minimale Prüfung: profileTitle und nfcBlocks vorhanden
    if (typeof obj.profileTitle !== 'string') {
      return { success: false, error: 'Konfiguration muss "profileTitle" enthalten.' };
    }
    if (!Array.isArray(obj.nfcBlocks)) {
      return { success: false, error: 'Konfiguration muss "nfcBlocks" (Array) enthalten.' };
    }

    // Standard-Werte ergänzen, wo nötig
    const base = getDefaultConfig();
    const merged: ModelConfig = {
      ...base,
      ...obj,
      profileTitle: String(obj.profileTitle ?? base.profileTitle),
      accentColor: String(obj.accentColor ?? base.accentColor),
      nfcBlocks: (obj.nfcBlocks as unknown[]).map((b, i) => normalizeBlock(b, i)),
    };

    return { success: true, config: merged };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler';
    return { success: false, error: `JSON fehlerhaft: ${message}` };
  }
}

function normalizeBlock(raw: unknown, index: number): NFCBlock {
  const base: NFCBlock = {
    id: `imported_${Date.now()}_${index}`,
    type: 'text',
    content: '',
  };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    ...base,
    id: typeof o.id === 'string' ? o.id : base.id,
    type: (['text', 'image', 'magic_button', 'spacer', 'headline', 'map'] as const).includes(o.type as never) ? (o.type as NFCBlock['type']) : base.type,
    content: typeof o.content === 'string' ? o.content : base.content,
    title: typeof o.title === 'string' ? o.title : undefined,
    buttonType: o.buttonType as NFCBlock['buttonType'] | undefined,
    imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined,
    settings: o.settings && typeof o.settings === 'object' ? (o.settings as NFCBlock['settings']) : undefined,
  };
}
