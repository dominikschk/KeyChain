/**
 * Shared utilities: ID generation, file handling, user feedback.
 */

/** Generates a short uppercase alphanumeric ID for configs (e.g. cart properties). */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/** Generates a secure key for stamp-card validation (ND- prefix, 40 chars). */
export function generateSecureKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ND-';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
