import { createClient } from '@supabase/supabase-js';

/**
 * SCHRITT-FÜR-SCHRITT ANLEITUNG:
 * 
 * 1. Gehe zu https://supabase.com und erstelle ein Projekt.
 * 2. Kopiere die "Project URL" und den "Anon Key" aus den Einstellungen (Settings > API).
 * 3. Ersetze die untenstehenden Platzhalter durch deine echten Daten.
 * 
 * Konfiguration für das Projekt: ncxeyarhrftcfwkcoqpa
 */

// Cast import.meta to any to access environment variables without needing vite/client types.
const supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (window as any).process?.env?.SUPABASE_URL || 
  'https://ncxeyarhrftcfwkcoqpa.supabase.co';

const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (window as any).process?.env?.SUPABASE_ANON_KEY || 
  'sb_publishable_2Beqh4O_zBNPXsyom73SVg_xIjyTZkM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);