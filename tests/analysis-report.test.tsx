import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AnalysisResults } from '../src/components/analysis/AnalysisReport';
import { reportMarkdown } from '../src/lib/analysisPresentation';
import type { AnalysisDetail, AnalysisRun } from '../src/lib/projectAnalysis';

const run: AnalysisRun = {
  id: 'analysis-one', status: 'completed', summary: 'Informe del sistema académico', security_score: 0,
  risk_level: 'critical', limitations: ['Solo se revisaron dos archivos'], error_message: null,
  model: 'gemini-2.5-flash', created_at: '2026-10-11T10:00:00Z', finished_at: '2026-10-11T10:01:00Z',
};
const data: AnalysisDetail = {
  requirements: [
    { id: 'r1', title: 'Guardar matrículas', description: 'Persistir matrículas en PostgreSQL', priority: 'must', origin: 'explicit', confidence: 1, evidence_excerpt: 'Base PostgreSQL', evidence_location: 'README.md', source_version_id: 'v1' },
    { id: 'r2', title: 'Copias diarias', description: 'Confirmar la frecuencia de respaldos', priority: 'should', origin: 'inferred', confidence: 0.6, evidence_excerpt: 'Disponibilidad', evidence_location: 'README.md' },
  ],
  findings: [
    { id: 'f1', title: 'Logs incompletos', description: 'Falta registro de accesos', severity: 'low', remediation: 'Registrar eventos', evidence_excerpt: 'Logs pendientes', evidence_location: 'README.md', verification_status: 'unverified' },
    { id: 'f2', title: 'Acceso público', description: 'Base de datos accesible', severity: 'critical', remediation: 'Restringir el acceso de red', evidence_excerpt: 'Acceso público habilitado', evidence_location: 'main.tf', verification_status: 'unverified', source_version_id: 'v1' },
  ],
  recommendations: [{
    id: 'aws1', service_name: 'Amazon RDS', purpose: 'Almacenar matrículas', rationale: 'Atiende la necesidad de PostgreSQL', priority: 'required',
    suggested_configuration: { description: 'PostgreSQL en subred privada' }, alternatives: ['Aurora'], assumptions: ['Confirmar volumen de datos'],
    deployment_order: 1, estimated_monthly_min_usd: null, estimated_monthly_max_usd: null,
    cloudops_recommendation_requirements: [{ requirement_id: 'r1' }],
  }],
  sources: [{ source_version_id: 'v1', cloudops_source_versions: {
    id: 'v1', version: 2, imported_at: run.created_at, coverage: { files: ['README.md', 'main.tf'] }, resolved_revision: 'abc123',
    cloudops_project_sources: { label: 'Repositorio académico', kind: 'github', url: 'https://github.com/example/demo' },
  } }],
};
const mount = (analysis = run) => render(<AnalysisResults key={analysis.id} projectName="Académico" run={analysis} data={data} />);
afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('informe y acciones del proyecto', () => {
  it('prioriza hallazgos críticos y permite navegar y filtrar con evidencia', () => {
    mount();
    expect(screen.getByText('Restringir el acceso de red')).toBeTruthy();
    expect(screen.queryByText('Sin evaluar')).toBeNull();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumen' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Seguridad' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Crítico 1' }));
    expect(screen.queryByRole('heading', { name: 'Logs incompletos' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Acceso público' })).toBeTruthy();
    expect(screen.getByText('Acceso público habilitado')).toBeTruthy();
    expect(screen.getByText('Repositorio académico · main.tf')).toBeTruthy();
  });

  it('muestra la relación entre servicio y requisito, y permite buscar requisitos', () => {
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Servicios AWS' }));
    expect(screen.getByText('Atiende la necesidad de PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Guardar matrículas')).toBeTruthy();
    expect(screen.getByText('PostgreSQL en subred privada')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Requisitos' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar requisitos' }), { target: { value: 'copias' } });
    expect(screen.getByRole('heading', { name: 'Copias diarias' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Guardar matrículas' })).toBeNull();
    expect(screen.getByText('Inferido · confirmar')).toBeTruthy();
  });

  it('conserva el avance por análisis sin modificar hallazgos ni compartirlo con otro informe', () => {
    const first = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Plan de acción' }));
    const task = screen.getByRole('checkbox', { name: /Acceso público/ });
    fireEvent.click(task);
    expect(JSON.parse(localStorage.getItem('cloudops-analysis-plan-analysis-one')!)).toEqual(['finding-f2']);
    expect(data.findings[1].verification_status).toBe('unverified');
    first.unmount();
    const restored = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Plan de acción' }));
    expect((screen.getByRole('checkbox', { name: /Acceso público/ }) as HTMLInputElement).checked).toBe(true);
    restored.unmount();
    mount({ ...run, id: 'analysis-two' });
    fireEvent.click(screen.getByRole('tab', { name: 'Plan de acción' }));
    expect((screen.getByRole('checkbox', { name: /Acceso público/ }) as HTMLInputElement).checked).toBe(false);
  });

  it('descarta tareas obsoletas guardadas y tolera almacenamiento malformado', () => {
    localStorage.setItem('cloudops-analysis-plan-analysis-one', '["missing", "finding-f2"]');
    const first = mount();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumen' }), { key: 'End' });
    expect(within(screen.getByRole('tabpanel')).getByText('1 de 7')).toBeTruthy();
    first.unmount();
    localStorage.setItem('cloudops-analysis-plan-analysis-one', 'invalid');
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Plan de acción' }));
    expect(within(screen.getByRole('tabpanel')).getByText('0 de 7')).toBeTruthy();
  });

  it('exporta evidencia, requisitos asociados, avance y limitaciones sin convertir cero en desconocido', () => {
    const markdown = reportMarkdown('Académico', run, data, new Set(['finding-f2']));
    expect(markdown).toContain('Seguridad estimada: 0/100');
    expect(markdown).toContain('> Acceso público habilitado');
    expect(markdown).toContain('Requisitos: Guardar matrículas');
    expect(markdown).toContain('- [x] Acceso público: Restringir el acceso de red');
    expect(markdown).toContain('Solo se revisaron dos archivos');
    expect(markdown).toContain('Repositorio académico · versión 2 · revisión abc123');
    expect(markdown).toContain('Marcar tareas no modifica ni verifica la evaluación de seguridad.');
  });
});
