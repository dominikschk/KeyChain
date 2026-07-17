/**
 * Validation helpers for files and form fields.
 */

import { formatFileSize } from './utils';

/** Bytes per MB. */
const MB = 1024 * 1024;

export const FILE_LIMITS = {
  /** Max size for SVG upload (bytes). */
  SVG_MAX_BYTES: 5 * MB,
  /** Max size for image uploads – banner, logo, block images (bytes). */
  IMAGE_MAX_BYTES: 10 * MB,
} as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validates an SVG file (extension and size). */
export function validateSvgFile(file: File): ValidationResult {
  if (!file.name.toLowerCase().endsWith('.svg')) {
    return { valid: false, error: 'Bitte lade nur SVG-Dateien hoch.' };
  }
  if (file.size > FILE_LIMITS.SVG_MAX_BYTES) {
    return {
      valid: false,
      error: `Die Datei ist zu groß. Bitte verwende eine Datei unter ${formatFileSize(FILE_LIMITS.SVG_MAX_BYTES)}.`,
    };
  }
  return { valid: true };
}

/** Validates an image file (size only; accept attribute handles type in UI). */
export function validateImageFile(
  file: File,
  maxBytes: number = FILE_LIMITS.IMAGE_MAX_BYTES
): ValidationResult {
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Die Datei ist zu groß. Bitte verwende eine Datei unter ${formatFileSize(maxBytes)}.`,
    };
  }
  return { valid: true };
}

/** Validates profile title (required, 1–200 chars after trim). */
export function validateProfileTitle(title: string | undefined | null): ValidationResult {
  const t = title?.trim();
  if (!t || t.length === 0) {
    return { valid: false, error: 'Bitte gib einen Profil-Namen ein.' };
  }
  if (t.length > 200) {
    return { valid: false, error: 'Profil-Name darf höchstens 200 Zeichen lang sein.' };
  }
  return { valid: true };
}

/** Simple email check (contains @ and has content either side). */
export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  const at = t.indexOf('@');
  return at > 0 && at < t.length - 1;
}

/** Normalises phone input to digits and leading +. */
export function normalizePhoneInput(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

/** Returns true if the string looks like a valid URL (http/https or will be prefixed). */
export function isValidUrl(value: string): boolean {
  return isSafeHttpUrl(value);
}

/**
 * Nur http:/https:-URLs (kein javascript:, data:, …).
 * Relative Hosts ohne Schema werden als https://… interpretiert.
 */
export function isSafeHttpUrl(value: string): boolean {
  const t = value.trim();
  if (!t || t.length > 2048) return false;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
    const url = new URL(withScheme);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Normalisiert eine Nutzereingabe zu einer sicheren http(s)-URL oder null. */
export function toSafeHttpUrl(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
