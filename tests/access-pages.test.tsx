import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { RequestAccess } from '../src/pages/RequestAccess';
import { AccessRequests } from '../src/pages/admin/AccessRequests';
import { AdminRoute } from '../src/routes/AdminRoute';
import { Sidebar } from '../src/components/Sidebar';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), range: vi.fn(), eq: vi.fn(), user: { app_metadata: {}, user_metadata: {} } as Record<string, unknown>, session: {} as object | null }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, session: mocks.session, loading: false }) }));
vi.mock('../src/context/AppContext', () => ({ useApp: () => ({ activeTab: 'admin' }) }));
vi.mock('../src/lib/supabase', () => {
  const query = { select: vi.fn(() => query), eq: mocks.eq.mockImplementation(() => query), order: vi.fn(() => query), range: mocks.range };
  return { configurationError: null, errorMessage: (error: Error) => error.message, requireSupabase: () => ({ functions: { invoke: mocks.invoke }, from: vi.fn(() => query) }) };
});
const pending = { id: 'request-1', email: 'test@example.test', created_at: '2026-10-05T12:00:00Z', status: 'pending', otp_sent_at: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { app_metadata: {}, user_metadata: {} }; mocks.session = {};
  mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  mocks.range.mockResolvedValue({ data: [pending], count: 1, error: null });
});
afterEach(cleanup);
describe('Request access page', () => {
  it('submits only the email to the function and shows the approval message', async () => {
    render(<MemoryRouter><RequestAccess /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'Test@Example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Solicitud enviada correctamente. Un administrador debe aprobar tu acceso.');
    expect(mocks.invoke).toHaveBeenCalledWith('cloudops-request-access', { body: { email: pending.email } });
    expect(screen.getByRole('link', { name: 'Volver al login' }).getAttribute('href')).toBe('/login');
  });
  it('keeps the form and reports the HTTP function error', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response(JSON.stringify({ error: 'Demasiadas solicitudes' }), { status: 429 })) });
    render(<MemoryRouter><RequestAccess /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: pending.email } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Se alcanzó el límite de intentos. Espera unos minutos y vuelve a intentarlo.');
    expect(screen.getByLabelText('Correo electrónico')).toHaveProperty('value', pending.email);
  });
});
function adminRoutes() {
  render(<MemoryRouter initialEntries={['/admin/access-requests']}><Routes><Route element={<AdminRoute />}><Route path="/admin/access-requests" element={<AccessRequests />} /></Route><Route path="/dashboard" element={<p>Dashboard</p>} /><Route path="/login" element={<p>Login</p>} /></Routes></MemoryRouter>);
}
describe('Admin route and sidebar', () => {
  it('rejects users who only claim admin in user_metadata', () => {
    mocks.user = { app_metadata: {}, user_metadata: { cloudops_role: 'admin' } };
    adminRoutes();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(mocks.range).not.toHaveBeenCalled();
  });
  it('redirects missing sessions to login', () => {
    mocks.session = null; adminRoutes(); expect(screen.getByText('Login')).toBeTruthy();
  });
  it('shows the admin menu only with trusted app metadata', () => {
    const view = render(<MemoryRouter><Sidebar isOpen onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Solicitudes de acceso' })).toBeNull();
    mocks.user = { app_metadata: { cloudops_role: 'admin' } };
    view.rerender(<MemoryRouter><Sidebar isOpen onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Solicitudes de acceso' }).getAttribute('href')).toBe('/admin/access-requests');
  });
});
describe('Admin request actions', () => {
  beforeEach(() => { mocks.user = { app_metadata: { cloudops_role: 'admin' } }; });
  it.each(['Aprobar', 'Rechazar'])('performs %s using the requested contract', async label => {
    adminRoutes();
    fireEvent.click(await screen.findByRole('button', { name: label }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', label === 'Aprobar' ? 'Usuario aprobado. Se envió un código de acceso.' : 'Solicitud rechazada.');
    expect(mocks.invoke).toHaveBeenCalledWith('cloudops-manage-access', { body: { requestId: pending.id, action: label === 'Aprobar' ? 'approve' : 'reject' } });
  });
  it('filters approved and rejected requests in the database', async () => {
    adminRoutes(); await screen.findByText(pending.email);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobadas' }));
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('status', 'approved'));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazadas' }));
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('status', 'rejected'));
  });
  it('shows server errors without claiming successful approval', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false, error: 'Usuario aprobado, pero falló el correo' }, error: null });
    adminRoutes(); fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'El acceso fue aprobado, pero no se pudo confirmar el envío del código. Reintenta el envío desde Aprobadas.');
    expect(screen.queryByText('Usuario aprobado. Se envió un código de acceso.')).toBeNull();
  });
  it('offers delivery retry for approved requests without a sent timestamp', async () => {
    mocks.range.mockResolvedValue({ data: [{ ...pending, status: 'approved' }], count: 1, error: null });
    adminRoutes(); fireEvent.click(await screen.findByRole('button', { name: 'Reintentar envío de código' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('cloudops-manage-access', { body: { requestId: pending.id, action: 'approve' } }));
  });
});
