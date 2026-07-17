/**
 * Shared utilities: ID generation, file handling, user feedback.
 */

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomFromAlphabet(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ID_ALPHABET.charAt(bytes[i]! % ID_ALPHABET.length);
  }
  return result;
}

/** Generates a cryptographically strong short ID for configs (16 chars). */
export function generateShortId(): string {
  return randomFromAlphabet(16);
}

/** One-time write token for STL URL updates (hex, 64 chars). Not exposed via public RPCs. */
export function generateWriteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Generates a secure key for stamp-card validation (ND- prefix, 40 chars). */
export function generateSecureKey(): string {
  return `ND-${randomFromAlphabet(40)}`;
}

/** Clears a file input so the same file can be selected again. */
export function resetFileInput(input: HTMLInputElement | null): void {
  if (input) input.value = '';
}

/** Human-readable file size (e.g. "5 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Centralised user error feedback (single place to swap for toasts later). */
export function showError(message: string, title?: string): void {
  const text = title ? `${title}\n\n${message}` : message;
  alert(text);
}

/** Trims and returns non-empty string or undefined. */
export function trimOptional(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}
