import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

type Dependencies = {
  env: (name: string) => string | undefined;
  createClient: (url: string, key: string, options: { auth: { persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean } }) => SupabaseClient;
};
const defaultOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'https://cloudops-dashboard-blue.vercel.app',
  'https://cloudops-dashboard-danss-projects-056f3308.vercel.app',
  'https://cloudops-dashboard-git-main-danss-projects-056f3308.vercel.app',
];
async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
async function matchesSecret(actual: string, expected: string) {
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function bucketKey(value: string) {
  return Array.from(await digest(value), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createAuthHandler({ env, createClient }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? '';
    const allowedOrigins = new Set([...defaultOrigins, ...(env('CLOUDOPS_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)]);
    const headers = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    };
    const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowedOrigins.has(origin)) return respond(403, { success: false, error: 'Origen no permitido.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond(405, { success: false, error: 'Método no permitido.' });

    const codeSecret = env('CLOUDOPS_ACCESS_CODE') ?? '';
    const allowedEmails = (env('CLOUDOPS_DEMO_EMAILS') ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    const url = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = env('SUPABASE_ANON_KEY');
    if (!url || !serviceKey || !anonKey || !/^[0-9]{6}$/.test(codeSecret) || !allowedEmails.length) {
      return respond(503, { success: false, error: 'El acceso de demostración no está configurado en Supabase.' });
    }

    try {
      if (Number(request.headers.get('content-length') ?? 0) > 2048) return respond(413, { success: false, error: 'Solicitud demasiado grande.' });
      const raw = await request.text();
      if (raw.length > 2048) return respond(413, { success: false, error: 'Solicitud demasiado grande.' });
      let body: unknown;
      try { body = JSON.parse(raw); } catch { return respond(400, { success: false, error: 'JSON inválido.' }); }
      if (!body || typeof body !== 'object' || !('email' in body) || !('code' in body) || typeof body.email !== 'string' || typeof body.code !== 'string') {
        return respond(400, { success: false, error: 'Se requieren correo y código de 6 dígitos.' });
      }
      const email = body.email.trim().toLowerCase();
      const code = body.code;
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9]{6}$/.test(code)) {
        return respond(400, { success: false, error: 'Correo inválido o código distinto de 6 dígitos.' });
      }

      const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
      const admin = createClient(url, serviceKey, options);
      // El límite global también protege cuando no hay IP confiable en el gateway.
      const scopes = [
        { key: 'global', limit: 100 },
        { key: `email:${await bucketKey(email)}`, limit: 5 },
      ];
      for (const scope of scopes) {
        const { data, error } = await admin.rpc('cloudops_consume_auth_attempt', { bucket: scope.key, max_attempts: scope.limit });
        if (error) return respond(503, { success: false, error: 'No se pudo verificar el límite de intentos. Revisa la migración de autenticación.' });
        if (data !== true) return respond(429, { success: false, error: 'Demasiados intentos. Vuelve a intentarlo en 10 minutos.' });
      }
      const validCode = await matchesSecret(code, codeSecret);
      if (!validCode || !allowedEmails.includes(email)) return respond(401, { success: false, error: 'Correo o código de acceso incorrecto.' });

      const { error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (createError && !['email_exists', 'user_already_exists'].includes(createError.code ?? '')) {
        return respond(createError.status && createError.status < 500 ? 400 : 502, { success: false, error: createError.message });
      }
      // generateLink no envía correo. El token de un solo uso se consume aquí y nunca se devuelve al navegador.
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      if (linkError) return respond(502, { success: false, error: linkError.message });
      const tokenHash = link.properties?.hashed_token;
      if (!tokenHash) return respond(502, { success: false, error: 'Supabase no generó el token de sesión.' });
      const auth = createClient(url, anonKey, options);
      const { data, error: sessionError } = await auth.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
      if (sessionError || !data.session) return respond(401, { success: false, error: sessionError?.message ?? 'No se pudo crear la sesión.' });
      if (data.user?.id !== link.user.id) return respond(502, { success: false, error: 'La sesión no corresponde a la cuenta solicitada.' });

      return respond(200, { success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
    } catch {
      return respond(502, { success: false, error: 'No se pudo contactar a Supabase Auth. Inténtalo nuevamente.' });
    }
  };
}
