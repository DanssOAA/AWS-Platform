import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { AccessError, type AccessRow, type AccessServices } from './access-handler.ts';

export function createServices(): AccessServices {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) throw new AccessError('Supabase no está configurado correctamente.', 500);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, options);
  const auth = createClient(url, anonKey, options);

  async function findUser(email: string) {
    // Use the admin API without exposing auth.users via public SQL functions.
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const user = data.users.find(item => item.email?.toLowerCase() === email);
      if (user) return user;
      if (data.users.length < 1000) return null;
    }
  }
  async function updateClaim(row: AccessRow, values: Record<string, unknown>) {
    const { data, error } = await admin.from('cloudops_access_requests').update(values)
      .eq('id', row.id).eq('processing_token', row.processing_token).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new AccessError('Otra operación modificó la solicitud. Actualiza el listado.', 409);
  }

  return {
    async authenticate(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user;
    },
    async rateLimit(email, purpose) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${purpose}:${email}`));
      const bucket = 'access:' + [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const { data: globalAllowed, error: globalError } = await admin.rpc('cloudops_consume_auth_attempt', { bucket: 'global', max_attempts: 100 });
      if (globalError) throw globalError;
      if (!globalAllowed) return false;
      const { data, error } = await admin.rpc('cloudops_consume_auth_attempt', { bucket, max_attempts: 5 });
      if (error) throw error;
      return data === true;
    },
    async submit(email) {
      // Duplicates never reset decisions or disclose request state publicly.
      const { error } = await admin.from('cloudops_access_requests').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
      if (error) throw error;
    },
    async canRequestOtp(email) {
      const user = await findUser(email);
      if (user?.app_metadata.cloudops_managed !== true) return false;
      const { data, error } = await admin.from('cloudops_access_requests').select('status').eq('email', email).maybeSingle();
      if (error) throw error;
      return !data || data.status === 'approved';
    },
    async claim(requestId) {
      const now = new Date();
      const { data, error } = await admin.from('cloudops_access_requests')
        .update({ processing_token: crypto.randomUUID(), processing_until: new Date(now.getTime() + 600000).toISOString() })
        .eq('id', requestId).or(`processing_until.is.null,processing_until.lt.${now.toISOString()}`)
        .select('id,email,status,otp_sent_at,processing_token').maybeSingle();
      if (error) throw error;
      return data as AccessRow | null;
    },
    async ensureManagedUser(email) {
      let user = await findUser(email);
      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { cloudops_managed: true } });
        if (error) {
          if (error.code !== 'email_exists' && error.code !== 'user_already_exists') throw error;
          user = await findUser(email);
          if (!user) throw error;
        } else user = data.user;
      }
      if (!user) throw new AccessError('No se pudo preparar el usuario.', 500);
      if (user.app_metadata.cloudops_managed !== true) {
        const { error } = await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { ...user.app_metadata, cloudops_managed: true },
        });
        if (error) throw error;
      }
      return user.id;
    },
    async decide(row, status, reviewer, userId) {
      await updateClaim(row, { status, reviewed_at: new Date().toISOString(), reviewed_by: reviewer, ...(userId ? { user_id: userId } : {}) });
    },
    async sendOtp(email) {
      const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
    },
    async markSent(row) { await updateClaim(row, { otp_sent_at: new Date().toISOString() }); },
    async release(row) { await updateClaim(row, { processing_token: null, processing_until: null }); },
  };
}

export function allowedOrigins() {
  return (Deno.env.get('CLOUDOPS_ALLOWED_ORIGINS') || 'http://localhost:5173,http://127.0.0.1:5173,https://cloudops-dashboard-blue.vercel.app')
    .split(',').map(value => value.trim()).filter(Boolean);
}
