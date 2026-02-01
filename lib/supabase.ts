
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

export interface DetailedError {
  title: string;
  msg: string;
  code: string;
}

export function getDetailedError(error: unknown): DetailedError {
  const err = error as { message?: string; status?: string; statusCode?: string; code?: string };
  const msgText =
    err?.message ||
    (error && typeof error === 'object' ? JSON.stringify(error) : String(error ?? 'Unknown Error'));
  const status = err?.status ?? err?.statusCode ?? err?.code;

  console.group("NFeC Sync Diagnostic");
  console.error("Error Message:", msgText);
  console.error("Status/Code:", status);
  console.groupEnd();

  if (msgText === 'TIMEOUT') {
    return {
      title: "Zeitüberschreitung",
      msg: "Die Cloud-Antwort dauert zu lange. Wir versuchen die Konfiguration trotzdem zu sichern.",
      code: "SYNC_TIMEOUT"
    };
  }

  // Spezifischer RLS Fehler (403) - Hier geben wir jetzt die SQL Lösung direkt an
  if (msgText.includes('new row violates row-level security policy') || status === '403') {
    return {
      title: "Storage Policy Fehler (403)",
      msg: "Der Bucket existiert, aber du musst in Supabase noch eine 'INSERT' Policy für anonyme Nutzer erstellen. Nutze den SQL Editor für: CREATE POLICY \"Allow Upload\" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'nudaim');",
      code: "STORAGE_RLS_MISSING"
    };
  }

  if (msgText.includes('Failed to fetch')) {
    return {
      title: "Netzwerkfehler",
      msg: "Verbindung zur Cloud unterbrochen. Bitte prüfe deine Internetverbindung.",
      code: "NETWORK_DISCONNECT"
    };
  }

  return {
    title: "Sync-Problem",
    msg: msgText,
    code: String(status || "INTERNAL_ERR")
  };
};
