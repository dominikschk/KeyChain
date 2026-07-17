/**
 * Admin-Zugang über Supabase Auth (E-Mail/Passwort).
 * Berechtigung wird serverseitig per RLS (`admin_users` + is_admin()) geprüft.
 */
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AdminSession = Session | null;

/** Prüft, ob die aktuelle Session in admin_users steht (RPC is_admin). */
export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

export async function getAdminSession(): Promise<AdminSession> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signInAdmin(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase ist nicht konfiguriert.' };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { error: error.message || 'Anmeldung fehlgeschlagen.' };
  }
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: 'Kein Admin-Zugang für dieses Konto.' };
  }
  return { error: null };
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAdminAuthStateChange(
  callback: (session: AdminSession, user: User | null) => void
): () => void {
  if (!supabase) {
    callback(null, null);
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
