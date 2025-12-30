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

// Falls die UUID am Anfang deiner Nachricht die Projekt-ID ist, nutzen wir diese hier.
// Ansonsten bleibt die ncx... URL bestehen.
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://ncxeyarhrftcfwkcoqpa.supabase.co';

// Dein bereitgestellter Key
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'sb_publishable_2Beqh4O_zBNPXsyom73SVg_xIjyTZkM';

export const getKeyType = (key: string): 'READY' | 'EMPTY' | 'UNKNOWN' => {
  if (!key || key.trim() === '') return 'EMPTY';
  // Wir akzeptieren den Key jetzt ohne Format-Diskussion
  return 'READY';
};

export const SUPABASE_READY = getKeyType(SUPABASE_ANON_KEY) === 'READY';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const getErrorMessage = (error: any): string => {
  const msg = error?.message || String(error);
  
  if (msg.includes('403') || msg.includes('is not authorized')) {
    return 'Berechtigung verweigert (403): Bitte prüfe im Supabase Dashboard unter "Storage", ob der Bucket "previews" öffentlich ist und die RLS-Policies (Policies) das Hochladen erlauben.';
  }
  if (msg.includes('404') || msg.includes('Bucket not found')) {
    return 'Bucket nicht gefunden: Bitte erstelle in Supabase einen Storage-Bucket mit dem exakten Namen "previews".';
  }
  
  return msg;
};
