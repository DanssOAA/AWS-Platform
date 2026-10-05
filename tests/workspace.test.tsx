import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../src/context/AppContext';
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), eq: vi.fn(), order: vi.fn(), abortSignal: vi.fn(), single: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
vi.mock('../src/lib/supabase', () => ({ requireSupabase: () => ({ from: mocks.from }), errorMessage: (error: Error) => error.message }));
const proposal = { id: 'proposal-1', user_id: 'owner-1', solution_name: 'Mi propuesta', application_type: 'Web', description: 'Demo', region: 'sa-east-1', estimated_users: 100, availability: '99.99% Multi-AZ', services: ['iam', 'vpc'], migration_objective: 'Aprender', created_at: '2026-10-05T00:00:00Z' };
function Workspace() {
  const state = useApp();
  return <><span>{state.proposalsLoading ? 'Cargando' : 'Listo'}</span><span>{state.activeProposal?.solutionName}</span><span>{state.selectedRegion}</span><span data-testid="monthly">{state.costEstimates.reduce((sum, c) => sum + c.monthlyCost, 0)}</span>
    <button onClick={() => state.activateProposal('proposal-1')}>Activar</button><button onClick={() => void state.saveCostScenario()}>Guardar</button><button onClick={state.clearAllDashboardData}>Vaciar</button><span data-testid="history">{state.proposals.length}</span></>;
}
beforeEach(() => {
  localStorage.clear();
  const query = { select: vi.fn(), eq: mocks.eq, order: mocks.order, abortSignal: mocks.abortSignal, insert: mocks.insert, single: mocks.single };
  query.select.mockReturnValue(query); mocks.from.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.order.mockReturnValue(query);
  mocks.abortSignal.mockResolvedValue({ data: [proposal], error: null }); mocks.insert.mockResolvedValue({ data: null, error: null });
});
afterEach(cleanup);
describe('Propuestas y escenarios', () => {
  it('carga únicamente propuestas del usuario y conserva tarifa cero de IAM/VPC', async () => {
    render(<MemoryRouter><AppProvider><Workspace /></AppProvider></MemoryRouter>);
    await screen.findByText('Listo');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    fireEvent.click(screen.getByText('Activar'));
    expect(screen.getByText('Mi propuesta')).toBeTruthy();
    expect(screen.getByTestId('monthly').textContent).toBe('0');
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner-1', monthly_cost: 0, annual_cost: 0, detail: expect.objectContaining({ region: 'sa-east-1', proposalId: 'proposal-1' }) })));
  });
  it('vaciar desactiva el escenario y conserva el historial remoto', async () => {
    render(<MemoryRouter><AppProvider><Workspace /></AppProvider></MemoryRouter>);
    await screen.findByText('Listo');
    fireEvent.click(screen.getByText('Vaciar'));
    expect(screen.queryByText('Mi propuesta')).toBeNull();
    expect(screen.getByTestId('history').textContent).toBe('1');
    expect(screen.getByTestId('monthly').textContent).toBe('0');
  });
});
