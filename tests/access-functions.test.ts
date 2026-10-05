// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccessHandler, type AccessServices, type AccessRow } from '../supabase/functions/_shared/access-handler';

const requestId = 'b8348111-989d-4127-ae3d-742942d45d27';
const row: AccessRow = { id: requestId, email: 'test@example.test', status: 'pending', otp_sent_at: null, processing_token: 'claim-token' };
function services() {
  return {
    authenticate: vi.fn().mockResolvedValue({ id: 'admin-id', app_metadata: { cloudops_role: 'admin' } }),
    rateLimit: vi.fn().mockResolvedValue(true), submit: vi.fn().mockResolvedValue(undefined),
    canRequestOtp: vi.fn().mockResolvedValue(true), claim: vi.fn().mockResolvedValue({ ...row }),
    ensureManagedUser: vi.fn().mockResolvedValue('managed-user'), decide: vi.fn().mockResolvedValue(undefined),
    sendOtp: vi.fn().mockResolvedValue(undefined), markSent: vi.fn().mockResolvedValue(undefined), release: vi.fn().mockResolvedValue(undefined),
  } satisfies AccessServices;
}
let dependencies: ReturnType<typeof services>;
beforeEach(() => { dependencies = services(); });
function call(mode: 'request' | 'manage' | 'otp', body: unknown, token: string | null = 'valid-jwt') {
  return createAccessHandler(mode, () => dependencies, ['http://localhost:5173'])(new Request('https://project.supabase.co/functions/v1/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  }));
}
describe('Public access requests', () => {
  it('normalizes email and persists without creating users or sending codes', async () => {
    const response = await call('request', { email: ' Test@Example.test ' }, null);
    expect(response.status).toBe(200);
    expect(dependencies.submit).toHaveBeenCalledWith('test@example.test');
    expect(dependencies.ensureManagedUser).not.toHaveBeenCalled();
    expect(dependencies.sendOtp).not.toHaveBeenCalled();
  });
  it('rejects malformed email before writing', async () => {
    expect((await call('request', { email: 'invalid' })).status).toBe(400);
    expect(dependencies.submit).not.toHaveBeenCalled();
  });
  it('preserves PostgREST error messages returned as plain objects', async () => {
    dependencies.submit.mockRejectedValue({ message: 'permission denied for table cloudops_access_requests', code: '42501' });
    const response = await call('request', { email: row.email });
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('permission denied for table cloudops_access_requests');
  });
  it('applies server rate limits and fails closed if the database is unavailable', async () => {
    dependencies.rateLimit.mockResolvedValue(false);
    expect((await call('request', { email: row.email })).status).toBe(429);
    expect(dependencies.submit).not.toHaveBeenCalled();
    dependencies.rateLimit.mockRejectedValue(new Error('Database unavailable'));
    const response = await call('request', { email: row.email });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ success: false, error: 'Database unavailable' });
  });
});
describe('Admin access enforcement and approval', () => {
  it('requires a JWT before looking up a request', async () => {
    expect((await call('manage', { requestId, action: 'approve' }, null)).status).toBe(401);
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.claim).not.toHaveBeenCalled();
  });
  it('rejects an invalid JWT even if the request contains a claimed admin role', async () => {
    dependencies.authenticate.mockResolvedValue(null);
    expect((await call('manage', { requestId, action: 'approve', cloudops_role: 'admin' })).status).toBe(401);
    expect(dependencies.authenticate).toHaveBeenCalledWith('valid-jwt');
    expect(dependencies.claim).not.toHaveBeenCalled();
  });
  it('does not trust client-controlled user metadata', async () => {
    dependencies.authenticate.mockResolvedValue({ id: 'ordinary-user', app_metadata: {}, user_metadata: { cloudops_role: 'admin' } });
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(403);
    expect(dependencies.claim).not.toHaveBeenCalled();
  });
  it('prepares the user, persists approval, sends OTP, and records successful delivery', async () => {
    const response = await call('manage', { requestId, action: 'approve' });
    expect(await response.json()).toEqual({ success: true });
    expect(dependencies.ensureManagedUser).toHaveBeenCalledWith(row.email);
    expect(dependencies.decide).toHaveBeenCalledWith(row, 'approved', 'admin-id', 'managed-user');
    expect(dependencies.decide.mock.invocationCallOrder[0]).toBeLessThan(dependencies.sendOtp.mock.invocationCallOrder[0]);
    expect(dependencies.sendOtp).toHaveBeenCalledWith(row.email);
    expect(dependencies.markSent).toHaveBeenCalledWith(row);
    expect(dependencies.release).toHaveBeenCalledWith(row);
  });
  it('rejects without creating users or sending OTP', async () => {
    expect((await call('manage', { requestId, action: 'reject' })).status).toBe(200);
    expect(dependencies.decide).toHaveBeenCalledWith(row, 'rejected', 'admin-id');
    expect(dependencies.ensureManagedUser).not.toHaveBeenCalled();
    expect(dependencies.sendOtp).not.toHaveBeenCalled();
  });
  it('reports the real mail error, preserves approval and allows retrying delivery', async () => {
    dependencies.sendOtp.mockRejectedValueOnce(new Error('Email rate limit exceeded'));
    const response = await call('manage', { requestId, action: 'approve' });
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('Email rate limit exceeded');
    expect(dependencies.markSent).not.toHaveBeenCalled();
    expect(dependencies.release).toHaveBeenCalled();
    dependencies.claim.mockResolvedValue({ ...row, status: 'approved' });
    dependencies.ensureManagedUser.mockClear();
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(200);
    expect(dependencies.ensureManagedUser).not.toHaveBeenCalled();
    expect(dependencies.sendOtp).toHaveBeenCalledTimes(2);
  });
  it('does not send email if account provisioning or approval persistence fails', async () => {
    dependencies.ensureManagedUser.mockRejectedValueOnce(new Error('Public signup is disabled'));
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(500);
    expect(dependencies.decide).not.toHaveBeenCalled();
    dependencies.decide.mockRejectedValueOnce(new Error('Database unavailable'));
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(500);
    expect(dependencies.sendOtp).not.toHaveBeenCalled();
  });
  it('blocks conflicting actions and avoids duplicate mail after a completed approval', async () => {
    dependencies.claim.mockResolvedValueOnce(null);
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(409);
    dependencies.claim.mockResolvedValue({ ...row, status: 'approved', otp_sent_at: '2026-10-05T12:00:00Z' });
    expect((await call('manage', { requestId, action: 'reject' })).status).toBe(409);
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(200);
    expect(dependencies.sendOtp).not.toHaveBeenCalled();
  });
  it('does not approve a rejected request', async () => {
    dependencies.claim.mockResolvedValue({ ...row, status: 'rejected' });
    expect((await call('manage', { requestId, action: 'approve' })).status).toBe(409);
    expect(dependencies.ensureManagedUser).not.toHaveBeenCalled();
  });
});
describe('Existing OTP endpoint', () => {
  it('requires approved access without silently creating users', async () => {
    dependencies.canRequestOtp.mockResolvedValue(false);
    expect((await call('otp', { email: row.email }, null)).status).toBe(403);
    expect(dependencies.ensureManagedUser).not.toHaveBeenCalled();
    expect(dependencies.sendOtp).not.toHaveBeenCalled();
  });
  it('sends OTP for managed accounts', async () => {
    expect((await call('otp', { email: row.email }, null)).status).toBe(200);
    expect(dependencies.sendOtp).toHaveBeenCalledWith(row.email);
  });
});
