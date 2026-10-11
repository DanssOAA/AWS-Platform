import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Projects } from '../src/pages/Projects';
const api = vi.hoisted(() => ({
  listProjects: vi.fn(), createProject: vi.fn(), loadProjectWorkspace: vi.fn(),
  addSource: vi.fn(), projectAction: vi.fn(), loadAnalysisDetail: vi.fn(), loadAnalysisTasks: vi.fn(), saveAnalysisTask: vi.fn(),
}));
vi.mock('../src/lib/projectAnalysis', () => api);
const project = { id: 'p1', name: 'Sistema académico', description: 'Requisitos propios', preferred_region: null, monthly_budget_usd: 0, expected_users: 100, availability_target: null, status: 'active', created_at: '2026-10-11T10:00:00Z' };
const source = { id: 's1', label: 'Requisitos', kind: 'text', url: null, repository_ref: null, cloudops_source_versions: [{ id: 'v1', version: 1, imported_at: project.created_at, coverage: {}, resolved_revision: null }] };
const run = { id: 'a1', status: 'completed', summary: 'Análisis de este proyecto', security_score: null, risk_level: 'unknown', limitations: ['Solo documentación'], model: 'gemini-2.5-flash', created_at: project.created_at, finished_at: project.created_at, error_message: null };
const mount = () => render(<MemoryRouter initialEntries={['/projects']}><Projects /></MemoryRouter>);
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.listProjects.mockResolvedValue([project]);
  api.loadProjectWorkspace.mockResolvedValue({ sources: [source], runs: [] });
  api.loadAnalysisDetail.mockResolvedValue({ requirements: [], findings: [], recommendations: [] });
  api.loadAnalysisTasks.mockResolvedValue([]);
});
describe('módulo de proyectos', () => {
  it('envía únicamente versiones seleccionadas del proyecto activo', async () => {
    api.projectAction.mockResolvedValue({ success: true, analysisId: 'a1' });
    mount(); await screen.findByRole('checkbox', { name: 'Analizar Requisitos' });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar con Gemini' }));
    await waitFor(() => expect(api.projectAction).toHaveBeenCalledWith({ action: 'analyze', projectId: 'p1', versionIds: ['v1'] }));
    await screen.findByText('Análisis completado y guardado.');
  });
  it('mantiene el error del servidor y no inventa un informe', async () => {
    api.projectAction.mockRejectedValue(new Error('Gemini alcanzó su cuota.'));
    mount(); await screen.findByRole('checkbox', { name: 'Analizar Requisitos' });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar con Gemini' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Gemini alcanzó su cuota.');
    expect(screen.queryByText('Análisis completado y guardado.')).toBeNull();
  });
  it('permite reintentar una ejecución fallida sin volver a importar sus fuentes', async () => {
    api.loadProjectWorkspace.mockResolvedValue({ sources: [source], runs: [{ ...run, status: 'failed', error_message: 'Gemini no pudo procesar la solicitud (HTTP 400).' }] });
    api.projectAction.mockResolvedValue({ success: true, analysisId: 'a2' });
    mount();
    await screen.findByText('Gemini rechazó la solicitud');
    expect(screen.getByText('No necesitas volver a importar tus fuentes.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar análisis' }));
    await waitFor(() => expect(api.projectAction).toHaveBeenCalledWith({ action: 'analyze', projectId: 'p1', versionIds: ['v1'] }));
    expect(api.addSource).not.toHaveBeenCalled();
  });
  it('explica el rechazo de evidencias sin presentarlo como éxito ni pedir reimportar', async () => {
    api.loadProjectWorkspace.mockResolvedValue({ sources: [source], runs: [{ ...run, status: 'failed', error_message: 'Gemini citó evidencia que no aparece en las fuentes. Vuelve a analizar.' }] });
    mount();
    await screen.findByRole('heading', { name: 'No pudimos verificar las evidencias del informe' });
    expect(screen.getByText(/Gemini respondió, pero algunas referencias/)).toBeTruthy();
    expect(screen.getByText('Usará la fuente seleccionada arriba y creará una nueva ejecución.')).toBeTruthy();
    expect(screen.queryByText('Análisis guardado')).toBeNull();
  });
  it('registra fuente y luego importa texto al proyecto correcto', async () => {
    api.addSource.mockResolvedValue('s2'); api.projectAction.mockResolvedValue({ success: true, versionId: 'v2' });
    mount(); await screen.findByLabelText('Origen');
    fireEvent.change(screen.getByLabelText('Origen'), { target: { value: 'text' } });
    fireEvent.change(screen.getByLabelText('Nombre de la fuente'), { target: { value: 'Necesidades' } });
    fireEvent.change(screen.getByLabelText('Contenido'), { target: { value: 'Necesito PostgreSQL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importar contenido' }));
    await waitFor(() => expect(api.addSource).toHaveBeenCalledWith('p1', { kind: 'text', label: 'Necesidades', url: null, repository_ref: null }));
    expect(api.projectAction).toHaveBeenCalledWith({ action: 'import', projectId: 'p1', sourceId: 's2', text: 'Necesito PostgreSQL' });
  });
  it('distingue sin evaluar de cero y muestra límites de la revisión', async () => {
    api.loadProjectWorkspace.mockResolvedValue({ sources: [source], runs: [run] });
    mount();
    await screen.findByText('Análisis de este proyecto');
    expect(screen.getByText('Sin evaluar')).toBeTruthy();
    expect(screen.getByText('Riesgo: Sin evaluar')).toBeTruthy();
    expect(screen.queryByText('0/100')).toBeNull();
    await screen.findByText(/No se reportaron hallazgos/);
    expect(screen.getByText('Solo documentación')).toBeTruthy();
  });
  it('evita mostrar detalle atrasado de otro proyecto', async () => {
    api.listProjects.mockResolvedValue([project, { ...project, id: 'p2', name: 'Otro proyecto' }]);
    let resolveFirst: (v: unknown) => void = () => {};
    api.loadProjectWorkspace.mockImplementation((id: string) => id === 'p1'
      ? new Promise(resolve => { resolveFirst = resolve; })
      : Promise.resolve({ sources: [], runs: [] }));
    mount(); await screen.findByRole('button', { name: /Otro proyecto/ });
    fireEvent.click(screen.getByRole('button', { name: /Otro proyecto/ }));
    await screen.findByRole('heading', { name: 'Otro proyecto' });
    resolveFirst({ sources: [source], runs: [run] });
    await waitFor(() => expect(screen.queryByText('Análisis de este proyecto')).toBeNull());
  });
});
