import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext';
import { ProjectWorkspaceProvider } from '../src/context/ProjectWorkspaceContext';
import { AnalyzedAppProvider } from '../src/context/AnalyzedAppProvider';
import { ProjectSwitcher } from '../src/components/ProjectSwitcher';
import { Costs } from '../src/pages/Costs';
import { project, run, detail } from './fixtures/analyzed-project';
import type { AnalysisDetail, AnalyzedProject } from '../src/lib/projectAnalysis';

const api = vi.hoisted(() => ({ listProjects: vi.fn(), loadAnalyzedProject: vi.fn(), loadAnalysisDetail: vi.fn(), projectAction: vi.fn() }));
vi.mock('../src/lib/projectAnalysis', () => api);
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'cost-owner' } }) }));
vi.mock('../src/lib/supabase', () => ({ errorMessage: (e: Error) => e.message, requireSupabase: () => ({ from: () => {
  const q: any = { select: () => q, eq: () => q, order: () => q, abortSignal: () => Promise.resolve({ data: [], error: null }) }; return q;
} }) }));
vi.mock('recharts', () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  const Plot = ({ data }: any) => <div data-testid="cost-bars">{JSON.stringify(data)}</div>;
  return { ResponsiveContainer: Box, BarChart: Plot, Bar: Box, Cell: Box, Tooltip: Box, Legend: Box, XAxis: Box, YAxis: Box, CartesianGrid: Box };
});
function analysis(id: string, priced: boolean): AnalyzedProject {
  const data = structuredClone(detail);
  const r = data.recommendations[0]; r.id = 'service-' + id; r.service_name = 'Servicio de ' + id;
  if (!priced) delete r.suggested_configuration.cost_estimate;
  else { r.suggested_configuration.cost_estimate!.monthly_min_usd = id === 'ERP' ? 10 : 100; r.suggested_configuration.cost_estimate!.monthly_max_usd = id === 'ERP' ? 30 : 300; }
  const result = { ...run, id: 'analysis-' + id };
  return { run: result, latestRun: result, detail: data };
}
function deferred() {
  let resolve: (value: { success: true }) => void = () => {};
  const promise = new Promise<{ success: true }>(r => { resolve = r; });
  return { promise, resolve: () => resolve({ success: true }) };
}
function mount() {
  return render(<MemoryRouter><AppProvider projectMode><ProjectWorkspaceProvider><ProjectSwitcher /><AnalyzedAppProvider><Costs /></AnalyzedAppProvider></ProjectWorkspaceProvider></AppProvider></MemoryRouter>);
}
function select(id: string) { fireEvent.change(screen.getByLabelText('Proyecto activo'), { target: { value: id } }); }
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  api.listProjects.mockResolvedValue([{ ...project, id: 'ERP', name: 'ERP SAP' }, { ...project, id: 'BIG', name: 'Big Data' }]);
  api.loadAnalyzedProject.mockImplementation((id: string) => Promise.resolve(analysis(id, id === 'BIG')));
  api.loadAnalysisDetail.mockImplementation((id: string) => Promise.resolve(analysis(id, true).detail));
});
afterEach(cleanup);

describe('cotización automática al cambiar de proyecto', () => {
  it('termina ERP en segundo plano y muestra sus costos al volver, sin duplicar llamadas ni usar los de Big Data', async () => {
    const pending = deferred(); api.projectAction.mockReturnValue(pending.promise);
    mount(); await screen.findByText('Preparando la gráfica de costos');
    expect(screen.queryByText('Sin servicios en el presupuesto')).toBeNull();
    expect(api.projectAction).toHaveBeenCalledWith({ action: 'estimate', projectId: 'ERP', analysisId: 'analysis-ERP' });
    select('BIG'); await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":200'));
    await act(async () => { pending.resolve(); });
    expect(screen.getByTestId('cost-bars').textContent).not.toContain('Servicio de ERP');
    select('ERP'); await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":20'));
    expect(screen.getByTestId('cost-bars').textContent).not.toContain('Servicio de BIG');
    expect(api.projectAction).toHaveBeenCalledTimes(1);
  });
  it('conserva progreso durante refresh/focus y no pierde el resultado si llega una lectura anterior sin costos', async () => {
    const pending = deferred(); api.projectAction.mockReturnValue(pending.promise);
    mount(); await screen.findByText('Preparando la gráfica de costos');
    let completeRead: (data: AnalyzedProject) => void = () => {};
    api.loadAnalyzedProject.mockImplementation(() => new Promise(resolve => { completeRead = resolve; }));
    fireEvent.focus(window); await waitFor(() => expect(api.loadAnalyzedProject).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Preparando la gráfica de costos')).toBeTruthy();
    await act(async () => { pending.resolve(); });
    await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":20'));
    await act(async () => { completeRead(analysis('ERP', false)); });
    expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":20');
    expect(api.projectAction).toHaveBeenCalledTimes(1);
  });
  it('muestra fallos y vuelve a intentar automáticamente al regresar al proyecto', async () => {
    api.projectAction.mockRejectedValueOnce(new Error('Proveedor temporalmente no disponible'));
    mount(); expect((await screen.findByRole('alert')).textContent).toContain('Proveedor temporalmente');
    expect(screen.getByRole('button', { name: 'Completar estimación de este proyecto' })).toBeTruthy();
    select('BIG'); await screen.findByTestId('cost-bars');
    api.projectAction.mockResolvedValueOnce({ success: true });
    select('ERP'); await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":20'));
    expect(api.projectAction).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('recupera precios ya guardados sin consultar Gemini ni arrastrar cantidades del otro proyecto', async () => {
    api.loadAnalyzedProject.mockImplementation((id: string) => Promise.resolve(analysis(id, true)));
    mount(); await screen.findByTestId('cost-bars');
    fireEvent.change(screen.getByLabelText('Cantidad de Servicio de ERP'), { target: { value: '3' } });
    expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":60');
    select('BIG'); await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":200'));
    select('ERP'); await waitFor(() => expect(screen.getByTestId('cost-bars').textContent).toContain('"CostoMensual":20'));
    expect(api.projectAction).not.toHaveBeenCalled();
  });
  it('un éxito sin precios no se presenta como presupuesto completo ni dispara un bucle de llamadas', async () => {
    api.projectAction.mockResolvedValue({ success: true });
    api.loadAnalysisDetail.mockResolvedValue(analysis('ERP', false).detail as AnalysisDetail);
    mount(); expect((await screen.findByRole('alert')).textContent).toContain('Aún faltan estimaciones');
    expect(screen.queryByTestId('cost-bars')).toBeNull(); expect(api.projectAction).toHaveBeenCalledTimes(1);
    api.loadAnalysisDetail.mockResolvedValueOnce(analysis('ERP', true).detail);
    fireEvent.click(screen.getByRole('button', { name: 'Completar estimación de este proyecto' }));
    await screen.findByTestId('cost-bars'); expect(api.projectAction).toHaveBeenCalledTimes(2);
  });
});
