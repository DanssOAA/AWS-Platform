import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useProjectWorkspace } from '../context/ProjectWorkspaceContext';

export function ProjectSwitcher() {
  const workspace = useProjectWorkspace();
  return <section className="panel mb-6 !p-4" aria-label="Proyecto activo en toda la aplicación">
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold flex-1 min-w-[200px]">Proyecto activo
        <select className="field mt-1" value={workspace.project?.id ?? ''} onChange={e => workspace.selectProject(e.target.value)}>
          <option value="" disabled>{workspace.projects.length ? 'Selecciona un proyecto' : 'Sin proyectos guardados'}</option>
          {workspace.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <button className="editor-control" onClick={() => { workspace.refreshProjects(); workspace.refresh(); }} disabled={workspace.loading}><RefreshCw size={15} /> Actualizar proyecto</button>
      <Link className="primary-button" to="/projects">Fuentes y análisis</Link>
    </div>
    {workspace.run && <p className="mt-3 text-xs text-slate-500">Datos del análisis completado el {new Date(workspace.run.created_at).toLocaleString('es-PE')}. Se usan en todos los módulos.</p>}
    {workspace.latestRun && workspace.latestRun.id !== workspace.run?.id && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
      {workspace.latestRun.status === 'failed' ? 'El intento más reciente falló.' : 'Hay un análisis nuevo en curso.'} {workspace.run ? 'Se conserva el último análisis completado.' : 'Todavía no hay un informe completado disponible.'}
    </p>}
  </section>;
}

