import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../src/components/Header';
import { NetworkPage } from '../src/pages/Network';
import { Services } from '../src/pages/Services';
import { userMessage } from '../src/lib/uiMessages';

const state = vi.hoisted(() => ({
  activeTab: 'dashboard', selectedRegion: 'ap-southeast-1', isDarkMode: false,
  toggleDarkMode: vi.fn(), setSelectedRegion: vi.fn(), addNotification: vi.fn(), removeNotification: vi.fn(),
  notifications: [] as { id: string; type: string; title: string; message: string }[],
  architectureServices: ['route53', 'cloudfront', 'ec2', 'rds'], security: { privateDatabase: true },
  globalSearch: '', setGlobalSearch: vi.fn(), costEstimates: [], addCostEstimate: vi.fn(), removeCostEstimate: vi.fn(), setSelectedServiceModal: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../src/context/AppContext', () => ({ useApp: () => state }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'admin@example.test' }, signOut: state.signOut }) }));
beforeEach(() => { vi.clearAllMocks(); state.activeTab = 'dashboard'; state.notifications = []; state.globalSearch = ''; });
afterEach(cleanup);

describe('Error presentation', () => {
  it.each([
    'column cloudops_requests.user_id does not exist',
    'relation public.cloudops_proposals does not exist',
    'Edge Function returned a non-2xx status code: HTTP 500',
    'Supabase error PGRST204: column email missing in schema cache',
    'Unexpected internal error in private.require_managed_signup',
  ])('never exposes provider details: %s', message => {
    const copy = userMessage(message, 'requestAccess');
    expect(copy).not.toMatch(/Supabase|cloudops_|Edge Function|HTTP|PGRST|column|schema|private\./i);
    expect(copy).toMatch(/Inténtalo|administrador/);
  });
  it('retains the distinction between failed delivery after approval and failed approval', () => {
    const partial = userMessage('Usuario aprobado, pero no se pudo confirmar el envío del código: SMTP 500', 'manageAccess');
    expect(partial).toContain('El acceso fue aprobado');
    expect(partial).toContain('Reintenta el envío desde Aprobadas');
    expect(partial).not.toContain('SMTP');
    expect(userMessage('Database unavailable', 'manageAccess')).toContain('No se pudo actualizar');
  });
  it('keeps useful validation messages and gives a specific connection recovery message', () => {
    expect(userMessage('Completa el nombre y la descripción.', 'planning')).toBe('Completa el nombre y la descripción.');
    expect(userMessage('Failed to fetch', 'costs')).toBe('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  });
});

describe('Header and useful controls', () => {
  it.each(['dashboard', 'planning', 'costs', 'security', 'network', 'admin', 'infrastructure', 'services'])('does not duplicate the service search in the %s header', page => {
    state.activeTab = page;
    render(<Header />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('option', { name: 'Singapur · ap-southeast-1' })).toHaveProperty('selected', true);
    expect(screen.getByRole('option', { name: 'Virginia del Norte · us-east-1' })).toBeTruthy();
  });
  it('keeps region selection, theme and logout connected to their original handlers', () => {
    render(<Header />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Región activa' }), { target: { value: 'sa-east-1' } });
    expect(state.setSelectedRegion).toHaveBeenCalledWith('sa-east-1');
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(state.toggleDarkMode).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(state.signOut).toHaveBeenCalledOnce();
  });
  it('does not repeat the administration heading in the header', () => {
    state.activeTab = 'admin'; render(<Header />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText('Administración de CloudOps')).toBeNull();
  });
  it('keeps notifications actionable and translates their internal errors', () => {
    state.notifications = [{ id: '1', type: 'error', title: 'No se pudo completar la acción', message: 'permission denied for table cloudops_access_requests' }];
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver notificaciones' }));
    expect(screen.getByText('No tienes permiso para realizar esta acción. Contacta al administrador.')).toBeTruthy();
    expect(screen.queryByText(/cloudops_access_requests/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar notificación' }));
    expect(state.removeNotification).toHaveBeenCalledWith('1');
  });
  it('keeps the functional search in Services', () => {
    const view = render(<Services />);
    const search = screen.getByRole('textbox', { name: 'Filtrar servicios AWS' });
    fireEvent.change(search, { target: { value: 'EC2' } });
    expect(state.setGlobalSearch).toHaveBeenCalledWith('EC2');
    state.globalSearch = 'EC2'; view.rerender(<Services />);
    expect(screen.getByRole('heading', { name: 'Amazon EC2' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Amazon RDS' })).toBeNull();
  });
  it('retains architecture validation with readable service names and an actionable link', () => {
    render(<MemoryRouter><NetworkPage /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /recorrido|tour/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar arquitectura' }));
    expect(state.addNotification).toHaveBeenCalledWith('warning', 'Configuración pendiente', 'Falta configurar una VPC para completar la arquitectura.');
    expect(screen.getByRole('link', { name: 'Completar configuración' }).getAttribute('href')).toBe('/planning');
  });
});
