
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

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const getDetailedError = (error: any) => {
  const msgText = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error || "Unbekannter Fehler"));
  const status = error?.status || error?.statusCode || error?.code;

  console.error("Supabase Error Details:", { msgText, status, error });

  if (msgText.includes('nfc_configs') && (msgText.includes('not found') || msgText.includes('cache'))) {
    return {
      title: "Tabelle fehlt",
      msg: "Die Tabelle 'nfc_configs' wurde in Supabase nicht gefunden.",
      code: "TABLE_MISSING"
    };
  }

  if (msgText.includes('row level security') || status === '42501' || msgText.includes('Permission denied')) {
    return {
      title: "RLS Sperre",
      msg: "Supabase verhindert das Speichern. RLS Policies prüfen.",
      code: "POLICY_ERROR"
    };
  }

  return {
    title: "System Fehler",
    msg: msgText,
    code: String(status || "ERR")
  };
};
