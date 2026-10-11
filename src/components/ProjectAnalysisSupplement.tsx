import { useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { loadAnalysisTasks } from '../lib/projectAnalysis';
import { ConnectedAnalysisResults } from './analysis/ConnectedAnalysisResults';
import { PdfDownloadButton } from './analysis/PdfDownloadButton';
import { useApp } from '../context/AppContext';
export function ProjectAnalysisSupplement() {
  const w = useProjectWorkspace(); const { activeTab } = useApp();
  if (activeTab === 'projects') return null;
  if (w.loading) return <p role="status" className="panel mb-5">Cargando datos del proyecto…</p>;
  if (w.error) return <p role="alert" className="error-box mb-5">{w.error}</p>;
  if (!w.project || !w.run || !w.detail) return <p className="panel mb-5 text-sm">Importa y analiza un proyecto para completar estos módulos automáticamente. Las herramientas de planificación siguen disponibles.</p>;
  return <section className="panel mb-6 space-y-3 border-blue-200">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">{w.project.name}</h2><p className="text-xs text-slate-500 mt-1">Vistas originales conectadas al análisis guardado. Los cambios manuales son escenarios de planificación.</p></div>
      <PdfDownloadButton className="primary-button" disabled={w.estimating} input={{ projectName:w.project.name, run:w.run, data:w.detail, checked:new Set() }}
        loadInput={async () => ({ projectName:w.project!.name, run:w.run!, data:w.detail!, checked:new Set(await loadAnalysisTasks(w.project!.id,w.run!.id)) })} />
    </div>
    {w.estimating && <p role="status" className="text-sm text-blue-600">Gemini está completando y guardando las estimaciones de costos de este análisis…</p>}
    {w.estimateError && <p role="alert" className="text-sm text-amber-700">{w.estimateError} <button className="underline" onClick={() => void w.estimateCosts()}>Reintentar estimación</button></p>}
    <p className="text-xs text-slate-500">Costos: rangos orientativos con supuestos. Los gráficos usan el punto medio de los servicios estimados, incluidos los opcionales; puedes retirarlos del escenario. Los pendientes no se consideran gratuitos. Sin telemetría ni facturación AWS conectada.</p>
    <details><summary className="cursor-pointer text-sm font-semibold text-blue-600">Ver informe, evidencias y plan de acción</summary><div className="mt-4"><ConnectedAnalysisResults key={w.run.id + activeTab} projectId={w.project.id} projectName={w.project.name} run={w.run} data={w.detail} initialTab={activeTab === 'planning' ? 'plan' : activeTab === 'security' ? 'security' : activeTab === 'services' ? 'aws' : 'overview'} /></div></details>
  </section>;
}
