// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServices } from '../supabase/functions/_shared/access-services';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), getUser: vi.fn(), sendOtp: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
const email = 'person@example.test';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('Deno', { env: { get: (name: string) => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only', SUPABASE_ANON_KEY: 'public' })[name] } });
  mocks.createClient.mockImplementation((_url, key) => key === 'server-only'
    ? { auth: { getUser: mocks.getUser, admin: { listUsers: mocks.listUsers, createUser: mocks.createUser, updateUserById: mocks.updateUser } }, from: mocks.from, rpc: mocks.rpc }
    : { auth: { signInWithOtp: mocks.sendOtp } });
  mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'new-user', app_metadata: { cloudops_managed: true } } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.sendOtp.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllGlobals());
describe('Supabase Auth adapter', () => {
  it('creates a managed user server-side to satisfy the existing FaceIA trigger', async () => {
    expect(await createServices().ensureManagedUser(email)).toBe('new-user');
    expect(mocks.createUser).toHaveBeenCalledWith({ email, email_confirm: true, app_metadata: { cloudops_managed: true } });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('preserves FaceIA app metadata when granting an existing account access', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'face-user', email, app_metadata: { face_managed: true, face_role: 'teacher', provider: 'email' } }] }, error: null });
    expect(await createServices().ensureManagedUser(email)).toBe('face-user');
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalledWith('face-user', { app_metadata: { face_managed: true, face_role: 'teacher', provider: 'email', cloudops_managed: true } });
  });
  it('recovers an account concurrently created by another app', async () => {
    mocks.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists', message: 'User exists' } });
    mocks.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: null }).mockResolvedValueOnce({ data: { users: [{ id: 'existing', email, app_metadata: { face_managed: true } }] }, error: null });
    expect(await createServices().ensureManagedUser(email)).toBe('existing');
    expect(mocks.updateUser).toHaveBeenCalledWith('existing', { app_metadata: { face_managed: true, cloudops_managed: true } });
  });
  it('searches later user pages before creating an account', async () => {
    mocks.listUsers.mockResolvedValueOnce({ data: { users: Array.from({ length: 1000 }, (_, i) => ({ email: `user${i}@example.test` })) }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ id: 'existing', email, app_metadata: { cloudops_managed: true } }] }, error: null });
    expect(await createServices().ensureManagedUser(email)).toBe('existing');
    expect(mocks.listUsers).toHaveBeenLastCalledWith({ page: 2, perPage: 1000 });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it('never enables public signup when sending the email code', async () => {
    await createServices().sendOtp(email);
    expect(mocks.sendOtp).toHaveBeenCalledWith({ email, options: { shouldCreateUser: false } });
  });
  it.each(['pending', 'rejected'])('blocks OTP for a %s request even if account preparation already occurred', async status => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'existing', email, app_metadata: { cloudops_managed: true } }] }, error: null });
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: { status }, error: null }) };
    mocks.from.mockReturnValue(query);
    expect(await createServices().canRequestOtp(email)).toBe(false);
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });
  it('preserves login for existing CloudOps managed accounts with no request', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'existing', email, app_metadata: { cloudops_managed: true } }] }, error: null });
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    mocks.from.mockReturnValue(query);
    expect(await createServices().canRequestOtp(email)).toBe(true);
  });
  it('does not treat FaceIA management alone as CloudOps authorization', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'face-user', email, app_metadata: { face_managed: true } }] }, error: null });
    expect(await createServices().canRequestOtp(email)).toBe(false);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
