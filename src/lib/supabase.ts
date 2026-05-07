import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Supabase URL o Anon Key no configuradas en variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
