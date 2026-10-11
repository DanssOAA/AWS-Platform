import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectWorkspaceProvider } from '../src/context/ProjectWorkspaceContext';
import { ProjectModulePage, type ProjectModule } from '../src/pages/ProjectModules';
import { ProjectSwitcher } from '../src/components/ProjectSwitcher';
import type { AnalyzedProject, Project } from '../src/lib/projectAnalysis';
import { ProjectAssistant } from '../src/components/ProjectAssistant';
const api = vi.hoisted(() => ({ listProjects: vi.fn(), loadAnalyzedProject: vi.fn(), loadAnalysisTasks: vi.fn(), saveAnalysisTask: vi.fn(), loadProjectConversations: vi.fn(), projectAction: vi.fn() }));
vi.mock('../src/lib/projectAnalysis', () => api);
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
const project: Project = { id: 'p1', name: 'Sistema real A', description: 'Proyecto A', status: 'active', preferred_region: 'sa-east-1', monthly_budget_usd: 0, expected_users: 25, availability_target: null, created_at: '2026-10-11T10:00:00Z' };
function snapshot(id = 'a1', summary = 'Informe real A'): AnalyzedProject {
  const run = { id, status: 'completed' as const, summary, security_score: null, risk_level: 'unknown', limitations: [], error_message: null, model: 'gemini', created_at: project.created_at, finished_at: project.created_at, input_context: project };
  return { run, latestRun: run, detail: { requirements: [{ id: 'r1', category: 'network', title: 'Acceso restringido', description: 'Solo red privada', origin: 'explicit', priority: 'must', confidence: 1, evidence_excerpt: 'Red privada', evidence_location: 'E1' }], findings: [], recommendations: [{ id: 'svc1', service_name: 'Servicio particular A', service_code: 'custom', purpose: 'Red privada', rationale: 'Requisito de este proyecto', priority: 'required', suggested_configuration: { description: 'Subred privada' }, alternatives: [], assumptions: [], deployment_order: 1, estimated_monthly_min_usd: null, estimated_monthly_max_usd: null, cloudops_recommendation_requirements: [{ requirement_id: 'r1' }] }] } };
}
const modules: ProjectModule[] = ['dashboard', 'planning', 'costs', 'infrastructure', 'security', 'network', 'services'];
function mount(path = '/dashboard') {
  return render(<MemoryRouter initialEntries={[path]}><ProjectWorkspaceProvider><ProjectSwitcher /><nav>{modules.map(m => <Link key={m} to={'/' + m}>{m}</Link>)}</nav><Routes>{modules.map(m => <Route key={m} path={'/' + m} element={<ProjectModulePage module={m} />} />)}</Routes><ProjectAssistant /></ProjectWorkspaceProvider></MemoryRouter>);
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  api.listProjects.mockResolvedValue([project, { ...project, id: 'p2', name: 'Sistema real B' }]);
  api.loadAnalyzedProject.mockImplementation((id: string) => Promise.resolve(id === 'p1' ? snapshot() : snapshot('a2', 'Informe real B')));
  api.loadAnalysisTasks.mockResolvedValue([]); api.saveAnalysisTask.mockResolvedValue(undefined);
  api.loadProjectConversations.mockResolvedValue([]);
});
afterEach(cleanup);
describe('un proyecto real para toda la aplicación', () => {
  it('conserva el último informe durante una actualización del mismo proyecto',async()=>{
    mount();await screen.findByText('Informe real A');
    let resolveRefresh:(data:AnalyzedProject)=>void=()=>{};
    api.loadAnalyzedProject.mockImplementation(()=>new Promise(resolve=>{resolveRefresh=resolve;}));
    fireEvent.focus(window);await waitFor(()=>expect(api.loadAnalyzedProject).toHaveBeenCalledTimes(2));
    // The context still supplies the same run while the refresh is pending,
    // so the original module provider can retain unsaved scenario state.
    expect(screen.getByText(/Datos del análisis completado/)).toBeTruthy();
    resolveRefresh(snapshot());await screen.findByText('Informe real A');
  });
  it('mantiene la selección entre los siete módulos y usa servicios guardados sin datos de ejemplo', async () => {
    mount(); await screen.findByText('Informe real A');
    fireEvent.change(screen.getByLabelText('Proyecto activo'), { target: { value: 'p2' } });
    await screen.findByText('Informe real B');
    for (const m of modules) {
      fireEvent.click(screen.getByRole('link', { name: m, exact: true }));
      expect((screen.getByLabelText('Proyecto activo') as HTMLSelectElement).value).toBe('p2');
      expect(screen.queryByText('Informe real A')).toBeNull();
      expect(screen.queryByText('Amazon EC2')).toBeNull();
    }
    expect(await screen.findByText('Servicio particular A')).toBeTruthy();
    expect(localStorage.getItem('cloudops_active_project_owner-1')).toBe('p2');
  });
  it('oculta inmediatamente resultados anteriores y descarta una respuesta tardía al cambiar de proyecto', async () => {
    let resolveA: (data: AnalyzedProject) => void = () => {};
    api.loadAnalyzedProject.mockImplementation((id: string) => id === 'p1' ? new Promise(resolve => { resolveA = resolve; }) : Promise.resolve(snapshot('a2', 'Informe real B')));
    mount(); await waitFor(() => expect(api.loadAnalyzedProject).toHaveBeenCalledWith('p1'));
    fireEvent.change(screen.getByLabelText('Proyecto activo'), { target: { value: 'p2' } });
    await screen.findByText('Informe real B'); resolveA(snapshot());
    await waitFor(() => expect(screen.queryByText('Informe real A')).toBeNull());
  });
  it('no sustituye un análisis ausente o un error por información simulada', async () => {
    api.loadAnalyzedProject.mockResolvedValue({ run: null, latestRun: null, detail: null });
    const first = mount('/costs'); await screen.findByText('Este proyecto aún no tiene un análisis completado');
    expect(screen.queryByText('Servicio particular A')).toBeNull(); first.unmount();
    api.loadAnalyzedProject.mockRejectedValue(new Error('Sin conexión'));
    mount('/dashboard'); expect((await screen.findByRole('alert')).textContent).toContain('Sin conexión');
    expect(screen.queryByText('Informe real A')).toBeNull();
  });
  it('conserva el último completado cuando el intento más reciente falla', async () => {
    const data = snapshot(); data.latestRun = { ...data.run!, id: 'failed-new', status: 'failed', error_message: 'Proveedor no disponible' };
    api.loadAnalyzedProject.mockResolvedValue(data); mount();
    await screen.findByText('Informe real A'); expect(screen.getByText(/El intento más reciente falló/)).toBeTruthy();
  });
  it('deja costos sin cotizar en estado pendiente y respeta presupuesto cero', async () => {
    mount('/costs'); await screen.findByText('Servicio particular A');
    expect(screen.getAllByText('Pendiente de cotizar').length).toBe(2);
    expect(screen.getByText(/0 de 1/)).toBeTruthy(); expect(screen.getByText(/0\.00\/mes/)).toBeTruthy();
    expect(screen.queryByText(/720/)).toBeNull();
  });
  it('llena red con servicios analizados aunque el requisito esté clasificado como funcional', async () => {
    const data = snapshot(); data.detail!.requirements[0].category = 'functional';
    data.detail!.recommendations[0].service_name = 'Amazon API Gateway'; data.detail!.recommendations[0].service_code = 'apigateway';
    api.loadAnalyzedProject.mockResolvedValue(data); mount('/network');
    await screen.findByText('Amazon API Gateway'); expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(screen.queryByText('Amazon VPC')).toBeNull();
  });
  it('confirma el progreso solo después del guardado remoto y conserva tareas sin marcar si falla', async () => {
    api.saveAnalysisTask.mockRejectedValueOnce(new Error('Guardado fallido'));
    mount('/planning'); await screen.findByText('Informe real A');
    await waitFor(() => expect((screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }));
    await screen.findByText(/Guardado fallido/);
    expect((screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }) as HTMLInputElement).checked).toBe(false);
    expect(api.saveAnalysisTask).toHaveBeenCalledWith('p1', 'a1', 'service-svc1', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar sincronización' }));
    await waitFor(() => expect((screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }));
    await waitFor(() => expect((screen.getByRole('checkbox', { name: /Preparar Servicio particular A/ }) as HTMLInputElement).checked).toBe(true));
    expect(localStorage.getItem('cloudops-analysis-plan-a1')).toBeNull();
  });
  it('el asistente envía IDs del proyecto y análisis y recupera su historial guardado', async () => {
    api.loadProjectConversations.mockResolvedValue([{ id: 'chat1', question: 'Consulta guardada A', answer: { summary: 'Respuesta guardada A', explanation: 'Datos A', recommendations: [] }, created_at: project.created_at }]);
    api.projectAction.mockResolvedValue({ success: true, conversation: { id: 'chat2', question: 'Mi pregunta', answer: { summary: 'Nueva respuesta guardada', explanation: 'Datos reales', recommendations: [] }, created_at: project.created_at } });
    mount(); await screen.findByText('Informe real A'); fireEvent.click(screen.getByRole('button', { name: 'Asistente' }));
    await screen.findByText('Respuesta guardada A');
    fireEvent.change(screen.getByLabelText('Tu consulta'), { target: { value: 'Mi pregunta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar', exact: true }));
    await screen.findByText('Nueva respuesta guardada');
    expect(api.projectAction).toHaveBeenCalledWith({ action: 'assist', projectId: 'p1', analysisId: 'a1', question: 'Mi pregunta' });
    api.loadProjectConversations.mockResolvedValue([]);
    fireEvent.change(screen.getByLabelText('Proyecto activo'), { target: { value: 'p2' } });
    await screen.findByText('Informe real B'); expect(screen.queryByText('Respuesta guardada A')).toBeNull();
  });
});
