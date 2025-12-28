
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.4';

// Diese Werte sollten idealerweise aus Umgebungsvariablen kommen.
// Da wir hier im Browser sind, nutzen wir Platzhalter, die du mit deinen 
// echten Supabase-Projekt-Daten füllen kannst.
const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || 'https://dein-projekt.supabase.co';
const supabaseAnonKey = (window as any).process?.env?.SUPABASE_ANON_KEY || 'dein-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
