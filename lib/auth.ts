/**
 * Auth: ausschließlich Google (Google Identity Services).
 * Kein Supabase – Session wird nur lokal (localStorage) gespeichert.
 */

const STORAGE_KEY = 'nudaim_google_session';
const GUEST_KEY = 'nudaim_guest';

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  return window.localStorage;
}

/** Nutzer-Objekt, kompatibel mit der bisherigen Session-Nutzung in der App. */
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { avatar_url?: string; full_name?: string };
}

/** Session = aktuell angemeldeter Nutzer (lokal). */
interface SessionData {
  user: AuthUser;
}

/** Session oder null – wie bisher in der App verwendet. */
export type AuthSession = SessionData | null;

function getEnv(name: string): string | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[name];
  } catch {
    return undefined;
  }
}

/** Google Client ID (Web) aus Google Cloud Console – für „Mit Google anmelden“. */
export const GOOGLE_CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID') || getEnv('GOOGLE_CLIENT_ID') || '';

/** Payload eines Google ID Tokens (JWT). */
interface GoogleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
}

function decodeGoogleIdToken(token: string): GoogleIdTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}

const GUEST_SESSION: SessionData = {
  user: { id: 'guest', email: undefined, user_metadata: {} },
};

function readStoredSession(): AuthSession {
  const storage = getStorage();
  if (!storage) return null;
  if (storage.getItem(GUEST_KEY)) return GUEST_SESSION;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { user: AuthUser; exp?: number };
    if (!data?.user?.id) return null;
    if (data.exp != null && data.exp * 1000 < Date.now()) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return { user: data.user };
  } catch {
    return null;
  }
}

const authListeners: Set<(session: AuthSession) => void> = new Set();

function notifyListeners(session: AuthSession): void {
  authListeners.forEach((cb) => cb(session));
}

export async function getSession(): Promise<AuthSession> {
  return readStoredSession();
}

/**
 * Anmeldung mit Google-ID-Token (von Google Identity Services).
 * Token wird dekodiert, Nutzerdaten lokal gespeichert – kein Supabase.
 */
export async function signInWithGoogleIdToken(idToken: string): Promise<{ error: Error | null }> {
  const payload = decodeGoogleIdToken(idToken);
  if (!payload?.sub) {
    return { error: new Error('Ungültiges Google-Token') };
  }
  const session: SessionData = {
    user: {
      id: payload.sub,
      email: payload.email ?? undefined,
      user_metadata: {
        avatar_url: payload.picture ?? undefined,
        full_name: payload.name ?? undefined,
      },
    },
  };
  const storage = getStorage();
  if (!storage) return { error: new Error('localStorage nicht verfügbar') };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      user: session.user,
      exp: payload.exp,
    }));
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Speichern fehlgeschlagen') };
  }
  notifyListeners(session);
  return { error: null };
}

export async function signOut(): Promise<void> {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(GUEST_KEY);
  }
  notifyListeners(null);
}

/** Ohne Anmeldung fortfahren – Gast-Session setzen. */
export function signInAsGuest(): void {
  const storage = getStorage();
  if (storage) storage.setItem(GUEST_KEY, '1');
  notifyListeners(GUEST_SESSION);
}

export function onAuthStateChange(callback: (session: AuthSession) => void): () => void {
  callback(readStoredSession());
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}
