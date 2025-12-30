
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Konfiguration
 * Hinweis: Der Key sollte idealerweise mit 'eyJ' beginnen (Supabase Anon Key).
 */

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

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://ncxeyarhrftcfwkcoqpa.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'sb_publishable_2Beqh4O_zBNPXsyom73SVg_xIjyTZkM';

const isValidKey = (key: string | undefined): boolean => {
  // Wir akzeptieren den Key vorerst, prüfen aber die Länge (Supabase Keys sind sehr lang)
  return !!key && key.length > 20;
};

export const SUPABASE_READY = isValidKey(supabaseAnonKey);

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { storage: { from: () => ({ upload: async () => ({ error: new Error('Konfiguration fehlt') }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } } as any;
