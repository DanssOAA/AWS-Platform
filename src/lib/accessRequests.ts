import { FunctionsHttpError } from '@supabase/supabase-js';
import { requireSupabase } from './supabase';

export type AccessStatus = 'pending' | 'approved' | 'rejected';
export interface AccessRequest {
  id: string;
  email: string;
  created_at: string;
  status: AccessStatus;
  otp_sent_at: string | null;
}

export async function invokeAccessFunction(name: string, body: Record<string, string>) {
  const { data, error } = await requireSupabase().functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (typeof payload?.error === 'string') throw new Error(payload.error);
    }
    throw error;
  }
  if (data?.success !== true) throw new Error(data?.error || 'La operación no se completó.');
  return data;
}

export async function listAccessRequests(status: AccessStatus, page: number) {
  const { data, error, count } = await requireSupabase()
    .from('cloudops_access_requests')
    .select('id,email,created_at,status,otp_sent_at', { count: 'exact' })
    .eq('status', status).order('created_at', { ascending: false }).order('id')
    .range(page * 25, page * 25 + 24);
  if (error) throw error;
  return { requests: (data ?? []) as AccessRequest[], count: count ?? 0 };
}
