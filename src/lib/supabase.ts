import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const configurationError = !url || !key
  ? 'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY. Configura las variables y reinicia Vite.'
  : !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) || !key.startsWith('sb_publishable_')
    ? 'Configura una URL de Supabase válida y una clave pública sb_publishable_.'
    : null;

export const supabase = configurationError ? null : createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function requireSupabase() {
  if (!supabase) throw new Error(configurationError!);
  return supabase;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.';
}
