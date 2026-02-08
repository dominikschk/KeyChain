/**
 * Admin-Zugang: Nur per direkter URL /admin, geschützt durch Passwort.
 * Passwort aus VITE_ADMIN_PASSWORD. Session mit Ablauf, Lockout bei Fehlversuchen.
 */

const ADMIN_SESSION_KEY = 'nudaim_admin_session';
const ADMIN_SESSION_EXPIRY_KEY = 'nudaim_admin_session_expiry';
const ADMIN_LOCKOUT_KEY = 'nudaim_admin_lockout';
const ADMIN_FAILED_ATTEMPTS_KEY = 'nudaim_admin_failed';

/** Session gültig für 8 Stunden (oder VITE_ADMIN_SESSION_HOURS). */
const DEFAULT_SESSION_HOURS = 8;
const LOCKOUT_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function getEnv(name: string): string | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[name];
  } catch {
    return undefined;
  }
}

function getSessionHours(): number {
  const v = getEnv('VITE_ADMIN_SESSION_HOURS');
  if (v === undefined || v === '') return DEFAULT_SESSION_HOURS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SESSION_HOURS;
}

export function getAdminPassword(): string | undefined {
  return getEnv('VITE_ADMIN_PASSWORD') || getEnv('ADMIN_PASSWORD');
}

/** Lockout bis wann (timestamp). 0 = nicht gesperrt. */
export function getLockoutUntil(): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(ADMIN_LOCKOUT_KEY);
  if (!raw) return 0;
  const t = parseInt(raw, 10);
  return Number.isFinite(t) ? t : 0;
}

export function isLockedOut(): boolean {
  const until = getLockoutUntil();
  if (until === 0) return false;
  if (Date.now() >= until) {
    sessionStorage.removeItem(ADMIN_LOCKOUT_KEY);
    sessionStorage.removeItem(ADMIN_FAILED_ATTEMPTS_KEY);
    return false;
  }
  return true;
}

export function getLockoutRemainingMinutes(): number {
  const until = getLockoutUntil();
  if (until === 0) return 0;
  const remaining = Math.max(0, until - Date.now());
  return Math.ceil(remaining / 60_000);
}

function setSessionExpiry(): void {
  const hours = getSessionHours();
  const expiry = Date.now() + hours * 60 * 60 * 1000;
  sessionStorage.setItem(ADMIN_SESSION_EXPIRY_KEY, String(expiry));
}

function isSessionExpired(): boolean {
  const raw = sessionStorage.getItem(ADMIN_SESSION_EXPIRY_KEY);
  if (!raw) return true;
  const expiry = parseInt(raw, 10);
  if (!Number.isFinite(expiry)) return true;
  if (Date.now() >= expiry) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
    return true;
  }
  return false;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const pw = getAdminPassword();
  if (!pw) return false;
  if (isLockedOut()) return false;
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== '1') return false;
  if (isSessionExpired()) return false;
  return true;
}

function getFailedAttempts(): number {
  const raw = sessionStorage.getItem(ADMIN_FAILED_ATTEMPTS_KEY);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export function checkAdminPassword(input: string): boolean {
  const pw = getAdminPassword();
  if (!pw) return false;
  if (isLockedOut()) return false;

  if (input === pw) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    setSessionExpiry();
    sessionStorage.removeItem(ADMIN_FAILED_ATTEMPTS_KEY);
    sessionStorage.removeItem(ADMIN_LOCKOUT_KEY);
    return true;
  }

  const attempts = getFailedAttempts() + 1;
  sessionStorage.setItem(ADMIN_FAILED_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
    sessionStorage.setItem(ADMIN_LOCKOUT_KEY, String(until));
  }
  return false;
}

export function adminLogout(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
}
