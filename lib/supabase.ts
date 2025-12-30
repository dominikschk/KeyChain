import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string): string | undefined => {
  try {
    return (
      (import.meta as any).env?.[name] || 
      (window as any).process?.env?.[name] || 
      (window as any)[name] ||
      (window as any)._env_?.[name]
    );
  } catch (e) {
    return undefined;
  }
};

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://ncxeyarhrftcfwkcoqpa.supabase.co';
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'sb_publishable_2Beqh4O_zBNPXsyom73SVg_xIjyTZkM';

export type KeyStatus = 'READY' | 'EMPTY' | 'INVALID';

export const getKeyStatus = (key: string): KeyStatus => {
  if (!key || key.trim() === '') return 'EMPTY';
  if (key.startsWith('sb_publishable_') || key.startsWith('eyJ')) return 'READY';
  return 'INVALID';
};

export const SUPABASE_READY = getKeyStatus(SUPABASE_ANON_KEY) === 'READY';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_READY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const getDetailedError = (error: any) => {
  const msg = error?.message || String(error);
  const status = error?.status || error?.statusCode || error?.code;

  // Spezifische Prüfung für fehlende Tabelle im Schema Cache
  if (msg.includes('public.previews') && (msg.includes('schema cache') || msg.includes('not found'))) {
    return {
      title: "Tabelle fehlt",
      message: "Die Datenbank-Tabelle 'previews' existiert noch nicht in deinem Projekt.",
      code: "TABLE_404"
    };
  }

  // Storage Fehler
  if (msg.includes('bucket_not_found') || msg.includes('does not exist') || status === '404') {
    return {
      title: "Bucket fehlt",
      message: "Der Storage-Ordner 'previews' existiert nicht.",
      code: "STORAGE_404"
    };
  }
  
  if (msg.includes('row level security') || status === 403 || status === '42501' || msg.includes('Permission denied')) {
    return {
      title: "RLS Sperre",
      message: "Die Sicherheitsregeln verhindern das Speichern. Du musst RLS für 'anon' erlauben.",
      code: "POLICY_403"
    };
  }

  return {
    title: "Hinweis",
    message: msg,
    code: status || "UNKNOWN"
  };
};
