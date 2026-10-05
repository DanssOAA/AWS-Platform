import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { configurationError, errorMessage, requireSupabase, supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configurationError);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (alive) { setSession(next); setLoading(false); setError(null); }
    });
    supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!alive) return;
      if (!authEventReceived) setSession(data.session);
      if (failure) setError(failure.message);
      setLoading(false);
    }).catch(failure => { if (alive) { setError(errorMessage(failure)); setLoading(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function requestOtp(email: string) {
    const { data, error } = await requireSupabase().functions.invoke('cloudops-request-otp', {
      body: { email: email.trim().toLowerCase() }, timeout: 30000,
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || error.message);
      }
      throw error;
    }
    if (data?.success !== true) throw new Error(data?.error || data?.message || 'No se pudo solicitar el código de acceso.');
  }
  async function verifyOtp(email: string, code: string) {
    if (!/^[0-9]{6}$/.test(code)) throw new Error('El código de acceso debe contener exactamente 6 dígitos.');
    const { data, error } = await requireSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(), token: code, type: 'email',
    });
    if (error) throw error;
    if (!data.session) throw new Error('Supabase no devolvió una sesión válida. Solicita un nuevo código e inténtalo de nuevo.');
    setSession(data.session);
  }
  async function signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
    setSession(null);
  }
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, error, requestOtp, verifyOtp, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requiere AuthProvider');
  return context;
}
