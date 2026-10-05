export type AccessAction = 'approve' | 'reject';
export interface AuthUser { id: string; app_metadata: Record<string, unknown> }
export interface AccessRow {
  id: string; email: string; status: 'pending' | 'approved' | 'rejected';
  otp_sent_at: string | null; processing_token: string;
}
export interface AccessServices {
  authenticate(token: string): Promise<AuthUser | null>;
  rateLimit(email: string, purpose: string): Promise<boolean>;
  submit(email: string): Promise<void>;
  canRequestOtp(email: string): Promise<boolean>;
  claim(requestId: string): Promise<AccessRow | null>;
  ensureManagedUser(email: string): Promise<string>;
  decide(row: AccessRow, status: 'approved' | 'rejected', reviewer: string, userId?: string): Promise<void>;
  sendOtp(email: string): Promise<void>;
  markSent(row: AccessRow): Promise<void>;
  release(row: AccessRow): Promise<void>;
}
export class AccessError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function failureMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'No se pudo completar la operación.';
}

export async function manageAccess(services: AccessServices, requestId: string, action: AccessAction, adminId: string) {
  const row = await services.claim(requestId);
  if (!row) throw new AccessError('La solicitud no existe o está siendo procesada. Actualiza e inténtalo de nuevo.', 409);
  try {
    if (action === 'reject') {
      if (row.status === 'rejected') return;
      if (row.status !== 'pending') throw new AccessError('Solo se pueden rechazar solicitudes pendientes.', 409);
      await services.decide(row, 'rejected', adminId);
      return;
    }
    if (row.status === 'rejected') throw new AccessError('La solicitud fue rechazada.', 409);
    if (row.status === 'approved' && row.otp_sent_at) return;
    if (row.status === 'pending') {
      const userId = await services.ensureManagedUser(row.email);
      await services.decide(row, 'approved', adminId, userId);
    }
    try {
      await services.sendOtp(row.email);
      await services.markSent(row);
    } catch (error) {
      throw new AccessError(`Usuario aprobado, pero no se pudo confirmar el envío del código: ${failureMessage(error)}. Puedes reintentar el envío desde Aprobadas.`, 502);
    }
  } finally {
    // A failed cleanup must not hide the actual approval/mail error. The lease expires.
    try { await services.release(row); }
    catch (error) { console.error('CloudOps: no se pudo liberar la solicitud.', failureMessage(error)); }
  }
}

export function createAccessHandler(mode: 'request' | 'manage' | 'otp', createServices: () => AccessServices, origins: string[]) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.includes(origin)) return json({ success: false, error: 'Origen no permitido.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return json({ success: false, error: 'Método no permitido.' }, 405);
    try {
      const raw = await req.text();
      if (raw.length > 2048) throw new AccessError('Solicitud demasiado grande.', 413);
      let body;
      try { body = JSON.parse(raw); } catch { throw new AccessError('JSON inválido.'); }
      const services = createServices();
      if (mode === 'manage') {
        const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
        if (!bearer) throw new AccessError('Debes iniciar sesión.', 401);
        // Verify with Auth; never trust decoded JWT payloads or user_metadata.
        const user = await services.authenticate(bearer);
        if (!user) throw new AccessError('Sesión inválida o expirada.', 401);
        if (user.app_metadata.cloudops_role !== 'admin') throw new AccessError('Se requiere un administrador de CloudOps.', 403);
        if (typeof body?.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)
          || !['approve', 'reject'].includes(body?.action)) throw new AccessError('Solicitud o acción inválida.');
        await manageAccess(services, body.requestId, body.action, user.id);
      } else {
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError('Correo electrónico inválido.');
        if (!await services.rateLimit(email, mode)) throw new AccessError('Demasiadas solicitudes. Inténtalo de nuevo en 10 minutos.', 429);
        if (mode === 'request') await services.submit(email);
        else {
          if (!await services.canRequestOtp(email)) throw new AccessError('No tienes acceso aprobado a CloudOps. Solicita acceso o espera la aprobación del administrador.', 403);
          await services.sendOtp(email);
        }
      }
      return json({ success: true });
    } catch (error) {
      return json({ success: false, error: failureMessage(error) }, error instanceof AccessError ? error.status : 500);
    }
  };
}
