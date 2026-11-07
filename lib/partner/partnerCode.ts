/**
 * Eindeutige Partnercodes (ohne leicht verwechselbare Zeichen).
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePartnerCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = 'NP-';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(bytes[i]! % ALPHABET.length);
  }
  return result;
}

export function isValidPartnerCode(code: string): boolean {
  return /^NP-[A-Z0-9]{6,12}$/.test(code.trim().toUpperCase());
}

export function buildPartnerReferralPath(code: string): string {
  return `/partner?ref=${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function buildPartnerReferralUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${buildPartnerReferralPath(code)}`;
}
