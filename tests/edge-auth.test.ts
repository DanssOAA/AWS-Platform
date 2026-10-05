// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthHandler } from '../supabase/functions/cloudops-auth/handler';

const rpc = vi.fn();
const createUser = vi.fn();
const generateLink = vi.fn();
const verifyOtp = vi.fn();
const createClient = vi.fn(() => ({ rpc, auth: { admin: { createUser, generateLink }, verifyOtp } }));
const environment: Record<string, string> = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SUPABASE_ANON_KEY: 'test-anon-key', CLOUDOPS_ACCESS_CODE: '654321', CLOUDOPS_DEMO_EMAILS: 'demo@example.test' };
const handler = createAuthHandler({ env: name => environment[name], createClient: createClient as never });
function request(code: unknown, email = 'demo@example.test', origin = 'http://localhost:5173') {
  return new Request('https://test.supabase.co/functions/v1/cloudops-auth', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
}
beforeEach(() => {
  rpc.mockResolvedValue({ data: true, error: null });
  createUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'private-one-time-hash' }, user: { id: 'user-1' } }, error: null });
  verifyOtp.mockResolvedValue({ data: { user: { id: 'user-1' }, session: { access_token: 'real-access', refresh_token: 'real-refresh' } }, error: null });
});
describe('cloudops-auth', () => {
  it.each(['123', 'abcdef', 654321, null])('rechaza formato inválido %s sin usar admin', async code => {
    const response = await handler(request(code));
    expect(response.status).toBe(400); expect(createUser).not.toHaveBeenCalled();
  });
  it('rechaza un código incorrecto sin crear usuario ni sesión', async () => {
    const response = await handler(request('000000'));
    expect(response.status).toBe(401); expect(createUser).not.toHaveBeenCalled(); expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('restringe el acceso a correos dedicados a demostración', async () => {
    const response = await handler(request('654321', 'unlisted@example.test'));
    expect(response.status).toBe(401); expect(createUser).not.toHaveBeenCalled();
  });
  it('no autentica si el límite está agotado o no disponible', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await handler(request('654321'))).status).toBe(429);
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
    expect((await handler(request('654321'))).status).toBe(503);
    expect(createUser).not.toHaveBeenCalled();
  });
  it.each([null, { code: 'email_exists', status: 422, message: 'Already exists' }])('crea o recupera usuario y devuelve solamente tokens', async error => {
    createUser.mockResolvedValueOnce({ error });
    const response = await handler(request('654321'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, session: { access_token: 'real-access', refresh_token: 'real-refresh' } });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'private-one-time-hash', type: 'magiclink' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('no expone un token cuando Supabase rechaza crear la sesión', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Token expired' } });
    const response = await handler(request('654321'));
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ success: false, error: 'Token expired' });
  });
  it('rechaza orígenes desconocidos', async () => {
    expect((await handler(request('654321', 'demo@example.test', 'https://unknown.example'))).status).toBe(403);
  });
});
