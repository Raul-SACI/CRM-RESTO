import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Supabase URL o Anon Key no configuradas en variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente secundario con sesión aislada: sirve para crear usuarios (signUp)
// SIN cambiar ni cerrar la sesión del admin que está usando la app.
export const createIsolatedClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-isolated-' + Date.now() }
  });
