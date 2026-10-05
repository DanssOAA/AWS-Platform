import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { Login } from '../src/pages/Login';
import { ProtectedRoute } from '../src/routes/ProtectedRoute';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), verifyOtp: vi.fn(), signInWithOtp: vi.fn(), setSession: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event: string, session: unknown) => void) }));
vi.mock('../src/lib/supabase', () => {
  const client = { functions: { invoke: mocks.invoke }, auth: { verifyOtp: mocks.verifyOtp, signInWithOtp: mocks.signInWithOtp, setSession: mocks.setSession, signOut: mocks.signOut, getSession: mocks.getSession, onAuthStateChange: mocks.subscribe } };
  return { configurationError: null, supabase: client, requireSupabase: () => client, errorMessage: (error: Error) => error.message };
});
function Dashboard() { const { signOut } = useAuth(); return <><h1>Dashboard protegido</h1><button onClick={() => void signOut()}>Salir</button></>; }
function setup(path = '/login') {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<Dashboard />} /></Route></Routes></AuthProvider></MemoryRouter>);
}
async function startRequest(email = 'demo@example.test') {
  fireEvent.change(await screen.findByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
}
async function enterCode() {
  const input = await screen.findByLabelText('Código de acceso de 6 dígitos');
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar a CloudOps' }));
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.subscribe.mockImplementation(callback => { mocks.listener = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; });
  mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error('Código incorrecto o expirado') });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Solicitud y verificación OTP compatibles con FaceIA', () => {
  it('protege rutas sin sesión y comienza con el paso de correo', async () => {
    setup('/dashboard');
    expect(await screen.findByRole('button', { name: 'Enviar código' })).toBeTruthy();
    expect(screen.queryByLabelText('Código de acceso de 6 dígitos')).toBeNull();
    expect(screen.queryByText('Dashboard protegido')).toBeNull();
  });
  it('solicita solo mediante la Edge Function y no crea una sesión al enviar', async () => {
    setup(); await startRequest('Demo@Example.test');
    expect(await screen.findByLabelText('Código de acceso de 6 dígitos')).toBeTruthy();
    expect(mocks.invoke).toHaveBeenCalledWith('cloudops-request-otp', { body: { email: 'demo@example.test' }, timeout: 30000 });
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Correo electrónico')).toHaveProperty('readOnly', true);
  });
  it.each([
    { data: { success: false, error: 'Alta pública bloqueada' }, error: null },
    { data: null, error: new Error('Failed to fetch') },
    { data: { success: false }, error: null },
  ])('no muestra paso de código si falla la solicitud', async response => {
    mocks.invoke.mockResolvedValue(response);
    setup(); await startRequest();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByLabelText('Código de acceso de 6 dígitos')).toBeNull();
    expect(screen.getByLabelText('Correo electrónico')).toHaveProperty('value', 'demo@example.test');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
  it('explica el límite de envío sin mostrar detalles internos', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response(JSON.stringify({ error: 'Límite de envío alcanzado' }), { status: 429 })) });
    setup(); await startRequest();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Se alcanzó el límite de intentos. Espera unos minutos y vuelve a intentarlo.');
  });
  it('verifica directamente con type email y conserva el formulario al fallar', async () => {
    setup(); await startRequest(); await enterCode();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'El código es incorrecto o venció. Revisa el código o solicita uno nuevo.');
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ email: 'demo@example.test', token: '123456', type: 'email' });
    expect(screen.getByLabelText('Código de acceso de 6 dígitos')).toHaveProperty('value', '123456');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dashboard protegido')).toBeNull();
  });
  it('navega solamente con data.session y mantiene signOut', async () => {
    const session = { access_token: 'test-access-token', user: { id: 'user-1', email: 'demo@example.test' } };
    mocks.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    mocks.signOut.mockImplementation(async () => { mocks.listener?.('SIGNED_OUT', null); return { error: null }; });
    setup(); await startRequest(); await enterCode();
    expect(await screen.findByText('Dashboard protegido')).toBeTruthy();
    expect(mocks.setSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Salir'));
    expect(await screen.findByRole('button', { name: 'Enviar código' })).toBeTruthy();
    expect(mocks.signOut).toHaveBeenCalledWith();
  });
  it('no redirige si verifyOtp responde sin sesión aunque no haya error', async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    setup(); await startRequest(); await enterCode();
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo confirmar el acceso');
    expect(screen.queryByText('Dashboard protegido')).toBeNull();
  });
  it('mantiene el bloqueo 60 s, reenvía por la misma función y reinicia el contador', async () => {
    setup();
    const email = await screen.findByLabelText('Correo electrónico');
    vi.useFakeTimers();
    fireEvent.change(email, { target: { value: 'demo@example.test' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enviar código' })); });
    expect(screen.getByText('Podrás solicitar otro código en 60 s.')).toBeTruthy();
    const resend = screen.getByRole('button', { name: 'Reenviar código' });
    expect(resend).toHaveProperty('disabled', true);
    act(() => vi.advanceTimersByTime(59000));
    expect(resend).toHaveProperty('disabled', true);
    expect(screen.getByText('Podrás solicitar otro código en 1 s.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(resend).toHaveProperty('disabled', false);
    fireEvent.change(screen.getByLabelText('Código de acceso de 6 dígitos'), { target: { value: '123456' } });
    await act(async () => { fireEvent.click(resend); });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Podrás solicitar otro código en 60 s.')).toBeTruthy();
    expect(screen.getByLabelText('Código de acceso de 6 dígitos')).toHaveProperty('value', '');
  });
  it('permite cambiar correo sin reutilizar el código ni el destinatario anterior', async () => {
    setup(); await startRequest();
    fireEvent.change(await screen.findByLabelText('Código de acceso de 6 dígitos'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
    expect(screen.queryByLabelText('Código de acceso de 6 dígitos')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toHaveProperty('disabled', true);
    await startRequest('otra@example.test');
    expect(await screen.findByLabelText('Código de acceso de 6 dígitos')).toHaveProperty('value', '');
    expect(mocks.invoke).toHaveBeenLastCalledWith('cloudops-request-otp', { body: { email: 'otra@example.test' }, timeout: 30000 });
    await enterCode();
    await screen.findByRole('alert');
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ email: 'otra@example.test', token: '123456', type: 'email' });
  });
  it('evita solicitudes duplicadas mientras la función responde', async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    setup(); await startRequest();
    expect(screen.getByRole('button', { name: 'Solicitando código…' })).toHaveProperty('disabled', true);
    fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    await act(async () => resolveRequest({ data: { success: true }, error: null }));
    expect(screen.getByLabelText('Código de acceso de 6 dígitos')).toBeTruthy();
  });
  it('restaura sesión al recargar una ruta y limpia la suscripción al desmontar', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    const view = setup('/dashboard');
    expect(await screen.findByText('Dashboard protegido')).toBeTruthy();
    view.unmount(); expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it('conserva el paso de código y el error si falla el reenvío', async () => {
    setup(); const email = await screen.findByLabelText('Correo electrónico');
    vi.useFakeTimers();
    fireEvent.change(email, { target: { value: 'demo@example.test' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enviar código' })); });
    act(() => vi.advanceTimersByTime(60000));
    mocks.invoke.mockResolvedValue({ data: { success: false, error: 'Envío temporalmente bloqueado' }, error: null });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' })); });
    expect(screen.getByRole('alert').textContent).toBe('Se alcanzó el límite de intentos. Espera unos minutos y vuelve a intentarlo.');
    expect(screen.getByLabelText('Código de acceso de 6 dígitos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toHaveProperty('disabled', true);
  });
});
