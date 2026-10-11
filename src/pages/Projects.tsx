import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderPlus, FileSearch, Plus, RefreshCw, Loader2, ShieldCheck, FileText, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { errorMessage } from '../lib/supabase';
import { addSource, createProject, listProjects, loadProjectWorkspace, projectAction, type AnalysisRun, type Project, type ProjectSource } from '../lib/projectAnalysis';
import { AnalysisReport } from '../components/analysis/AnalysisReport';
import { analysisFailure } from '../lib/analysisPresentation';
import { useOptionalProjectWorkspace } from '../context/ProjectWorkspaceContext';

const label: Record<string, string> = {
  queued: 'En espera', running: 'Analizando', completed: 'Completado', failed: 'Falló',
  unknown: 'Sin evaluar', low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico', info: 'Informativo',
  must: 'Obligatorio', should: 'Recomendado', could: 'Opcional', explicit: 'Explícito', inferred: 'Inferido',
  required: 'Necesario', recommended: 'Recomendado', optional: 'Opcional',
};
const date = (value: string) => new Date(value).toLocaleString('es-PE');
export function Projects() {
  const workspace = useOptionalProjectWorkspace();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const submitLock = useRef(false);
  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    listProjects().then(rows => { if (alive) setProjects(rows); }).catch(e => { if (alive) setError(errorMessage(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);
  const selected = workspace ? workspace.project ?? undefined : projects.find(p => p.id === params.get('project')) ?? (params.get('project') ? undefined : projects[0]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitLock.current) return; submitLock.current = true;
    const form = new FormData(event.currentTarget);
    const number = (key: string) => String(form.get(key) ?? '').trim() ? Number(form.get(key)) : null;
    setSaving(true); setError('');
    try {
      const project = await createProject({
        name: String(form.get('name')).trim(), description: String(form.get('description')).trim(),
        preferred_region: String(form.get('region')).trim() || null, monthly_budget_usd: number('budget'),
        expected_users: number('users'), availability_target: number('availability'),
      });
      setProjects(current => [project, ...current]); setParams({ project: project.id }); setShowForm(false);
      workspace?.refreshProjects(project.id);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); submitLock.current = false; }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Análisis de proyectos</h1><p className="mt-1 text-sm text-slate-500">Del contenido de tu proyecto a sus requisitos, riesgos y arquitectura AWS.</p></div>
      <button className="primary-button" onClick={() => setShowForm(v => !v)}><FolderPlus size={18} /> Nuevo proyecto</button>
    </div>
    {error && <div className="error-box" role="alert">{error} <button className="underline" onClick={() => setReload(v => v + 1)}>Actualizar lista</button></div>}
    {showForm && <form className="panel space-y-4" onSubmit={submit} aria-label="Nuevo proyecto">
      <h2 className="font-semibold">Define el proyecto que vas a analizar</h2>
      <label className="block text-sm">Nombre<input name="name" className="field mt-1" required maxLength={160} /></label>
      <label className="block text-sm">Descripción y restricciones<textarea name="description" className="field mt-1" rows={3} maxLength={10000} placeholder="Qué hará, tecnologías, datos sensibles y necesidades especiales…" /></label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Región AWS preferida<input name="region" className="field mt-1" maxLength={50} placeholder="Opcional: us-east-1" /></label>
        <label className="text-sm">Presupuesto mensual (USD)<input name="budget" className="field mt-1" type="number" min="0" max="9999999999" step="0.01" placeholder="Por definir" /></label>
        <label className="text-sm">Usuarios estimados<input name="users" className="field mt-1" type="number" min="0" max="2147483647" placeholder="Por definir" /></label>
        <label className="text-sm">Disponibilidad objetivo (%)<input name="availability" className="field mt-1" type="number" min="0.001" max="100" step="0.001" placeholder="Opcional" /></label>
      </div>
      <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Crear proyecto'}</button>
    </form>}
    {loading ? <p role="status">Cargando proyectos…</p> : !projects.length ? <div className="panel py-12 text-center">
      <FileSearch className="mx-auto mb-4 text-blue-500" size={36} /><h2 className="font-semibold text-lg">Empieza con tu primer proyecto</h2>
      <p className="text-sm text-slate-500 mt-2">Crea un proyecto y agrega un enlace o sus requerimientos en texto.</p>
    </div> : <div className="space-y-6">
      <nav aria-label="Proyectos guardados" className="panel !p-2 flex gap-2 overflow-x-auto">
        {projects.map(p => <button key={p.id} onClick={() => workspace ? workspace.selectProject(p.id) : setParams({ project: p.id })} aria-current={selected?.id === p.id ? 'page' : undefined}
          className={'min-w-[180px] max-w-[280px] shrink-0 rounded-xl p-3 text-left text-sm ' + (selected?.id === p.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
          <span className="block font-semibold break-words">{p.name}</span><span className="text-xs opacity-75">{new Date(p.created_at).toLocaleDateString('es-PE')}</span>
        </button>)}
      </nav>
      {selected ? <ProjectWorkspace key={selected.id} project={selected} /> : <p className="panel">El proyecto seleccionado no está disponible. Elige uno de la lista.</p>}
    </div>}
  </div>;
}

function ProjectWorkspace({ project }: { project: Project }) {
  const workspace = useOptionalProjectWorkspace();
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [runId, setRunId] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [kind, setKind] = useState('github');
  const [sourceLabel, setSourceLabel] = useState('');
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [text, setText] = useState('');
  const initial = useRef(true);
  const operation = useRef(false);
  useEffect(() => {
    let alive = true; setLoading(true);
    loadProjectWorkspace(project.id).then(data => {
      if (!alive) return;
      setSources(data.sources); setRuns(data.runs);
      if (initial.current) { setSelected(data.sources.flatMap(s => s.cloudops_source_versions.slice(0, 1).map(v => v.id)).slice(0, 3)); initial.current = false; }
      setRunId(current => data.runs.some(r => r.id === current) ? current : data.runs[0]?.id ?? '');
    }).catch(e => { if (alive) setError(errorMessage(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [project.id, reload]);
  const pending = runs.some(r => r.status === 'running' || r.status === 'queued');
  useEffect(() => {
    if (!pending || busy) return;
    const timer = setInterval(() => setReload(v => v + 1), 10000);
    return () => clearInterval(timer);
  }, [pending, busy]);
  async function importContent(sourceId?: string) {
    if (operation.current) return; operation.current = true;
    setBusy('Importando contenido…'); setError(''); setNotice('');
    try {
      const id = sourceId ?? await addSource(project.id, {
        kind, label: sourceLabel.trim(), url: kind === 'text' || kind === 'upload' ? null : url.trim(),
        repository_ref: kind === 'github' ? branch.trim() || null : null,
      });
      const result = await projectAction({ action: 'import', projectId: project.id, sourceId: id, text });
      const previousVersions = sources.find(s => s.id === id)?.cloudops_source_versions.map(v => v.id) ?? [];
      if (result.versionId) setSelected(current => [result.versionId!, ...current.filter(v => v !== result.versionId && !previousVersions.includes(v))].slice(0, 3));
      setNotice('Contenido importado. Selecciona las fuentes y pulsa Analizar con Gemini.');
      setSourceLabel(''); setUrl(''); setText('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(''); operation.current = false; setReload(v => v + 1); workspace?.refresh(); }
  }
  async function analyze() {
    if (operation.current || !selected.length) return; operation.current = true;
    setBusy('Gemini está revisando las fuentes. Puede tardar hasta dos minutos…'); setError(''); setNotice('');
    try {
      const result = await projectAction({ action: 'analyze', projectId: project.id, versionIds: selected });
      if (result.analysisId) setRunId(result.analysisId);
      setNotice('Análisis completado y guardado.');
    } catch (e) { setError(errorMessage(e)); setRunId(''); }
    finally { setBusy(''); operation.current = false; setReload(v => v + 1); workspace?.refresh(); }
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 60000) throw new Error('El archivo debe pesar como máximo 60 KB.');
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(content)) throw new Error('Elige un archivo de texto UTF-8.');
      setText(content); setSourceLabel(file.name);
    } catch (e) { setError(errorMessage(e)); }
  }
  const run = runs.find(r => r.id === runId);
  const failure = analysisFailure(run?.error_message ?? null);
  return <div className="space-y-6 min-w-0">
    <section className="panel">
      <h2 className="text-xl font-bold">{project.name}</h2>
      {project.description && <p className="mt-2 text-sm whitespace-pre-wrap">{project.description}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Región: {project.preferred_region || 'Por definir'}</span><span>Presupuesto: {project.monthly_budget_usd === null ? 'Por definir' : '$' + project.monthly_budget_usd + '/mes'}</span>
        <span>Usuarios: {project.expected_users ?? 'Por definir'}</span>
      </div>
    </section>
    <section className="panel space-y-4" aria-label="Importar contenido">
      <h2 className="font-semibold flex items-center gap-2"><Plus size={18} /> Agregar fuente</h2>
      <form onSubmit={e => { e.preventDefault(); void importContent(); }} className="space-y-3">
        <fieldset disabled={Boolean(busy)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Origen<select className="field mt-1" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="github">Repositorio público de GitHub</option><option value="google_docs">Google Docs</option><option value="google_drive">Archivo de texto en Drive</option>
              <option value="text">Pegar texto</option><option value="upload">Subir archivo de texto</option>
            </select></label>
            <label className="text-sm">Nombre de la fuente<input className="field mt-1" value={sourceLabel} onChange={e => setSourceLabel(e.target.value)} required maxLength={240} placeholder="Requisitos, código o documentación" /></label>
          </div>
          {kind === 'text' || kind === 'upload' ? <>
            {kind === 'upload' && <label className="block text-sm">Archivo TXT, Markdown o código (máximo 60 KB)<input type="file" accept=".txt,.md,.json,.yaml,.yml,.ts,.tsx,.js,.py,.sql,.tf" className="field mt-1" onChange={e => void readFile(e.target.files?.[0])} /></label>}
            <label className="block text-sm">Contenido<textarea className="field mt-1 font-mono text-xs" rows={7} value={text} onChange={e => setText(e.target.value)} required maxLength={60000} /></label>
          </> : <label className="block text-sm">Enlace<input className="field mt-1" type="url" value={url} onChange={e => setUrl(e.target.value)} required maxLength={2048} placeholder={kind === 'github' ? 'https://github.com/organizacion/repositorio' : 'https://docs.google.com/document/d/…'} /></label>}
          {kind === 'github' && <label className="block text-sm">Rama, etiqueta o commit (opcional)<input className="field mt-1" value={branch} onChange={e => setBranch(e.target.value)} maxLength={240} placeholder="Por defecto, la rama principal" /></label>}
          <p className="text-xs text-slate-500">Usa fuentes a las que tengas acceso. Se guardará el texto y las fuentes que selecciones se enviarán a Gemini. Revisa que no contengan credenciales o información que no quieras compartir. Google requiere acceso por enlace; también puedes pegar el texto.</p>
          <button className="primary-button"><FileText size={16} /> Importar contenido</button>
        </fieldset>
      </form>
    </section>
    {error && error !== run?.error_message && <p className="error-box" role="alert">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">{notice}</p>}
    {busy && <p role="status" className="flex gap-2 items-center text-sm"><Loader2 className="animate-spin shrink-0" size={18} />{busy}</p>}
    <section className="panel space-y-4">
      <div className="flex justify-between items-center gap-3"><h2 className="font-semibold">Fuentes de este proyecto</h2>
        <button aria-label="Actualizar fuentes e historial" className="editor-control" disabled={Boolean(busy)} onClick={() => { setError(''); setReload(v => v + 1); }}><RefreshCw size={15} /> Actualizar</button></div>
      {loading && <p role="status" className="text-sm">Actualizando…</p>}
      {!sources.length && !loading && <p className="text-sm text-slate-500">Todavía no agregaste fuentes.</p>}
      <div className="space-y-3">{sources.map(source => {
        const version = source.cloudops_source_versions[0];
        return <div key={source.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex gap-3 items-start"><input type="checkbox" className="mt-1" aria-label={'Analizar ' + source.label} checked={Boolean(version && selected.includes(version.id))}
            disabled={Boolean(busy) || !version || (!selected.includes(version.id) && selected.length >= 3)}
            onChange={e => setSelected(current => e.target.checked ? [...current, version.id] : current.filter(id => id !== version.id))} />
            <div className="min-w-0 flex-1"><p className="font-medium text-sm">{source.label}</p>
              {source.url && <p className="text-xs text-slate-500 break-all">{source.url}</p>}
              <p className="mt-1 text-xs text-slate-500">{version ? 'Importado · versión ' + version.version + ' · ' + date(version.imported_at) : 'Pendiente de importar'}</p>
              {version?.resolved_revision && <p className="text-xs text-slate-500">Commit: {version.resolved_revision.slice(0, 12)}</p>}
              {version && <details className="mt-2 text-xs"><summary className="cursor-pointer">Ver cobertura</summary><pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(version.coverage, null, 2)}</pre></details>}
            </div>
            {!['text','upload'].includes(source.kind) && <button className="editor-control shrink-0" disabled={Boolean(busy)} onClick={() => void importContent(source.id)}>{version ? 'Reimportar' : 'Reintentar'}</button>}
          </div>
        </div>;
      })}</div>
      <div className="flex flex-wrap items-center gap-3"><button className="primary-button" disabled={Boolean(busy) || !selected.length} onClick={() => void analyze()}><ShieldCheck size={17} /> Analizar con Gemini</button><span className="text-xs text-slate-500">{selected.length}/3 fuentes seleccionadas</span></div>
      <p className="text-xs text-slate-500">Puedes guardar varias fuentes y seleccionar hasta 3 por ejecución (180 KB en total). Una fuente puede ser un repositorio GitHub, un documento o un archivo. GitHub importa una muestra de hasta 12 archivos y 60 KB por repositorio; no exige subir 3 archivos. Combina código y requisitos para dar contexto a la IA y revisa la cobertura del informe.</p>
    </section>
    <section className="panel space-y-4" aria-label="Historial de análisis">
      <h2 className="font-semibold">Historial de análisis</h2>
      {!runs.length ? <p className="text-sm text-slate-500">Los resultados aparecerán aquí y se conservarán por proyecto.</p> : <>
        <label className="block text-sm">Ejecución<select className="field mt-1" value={runId} onChange={e => setRunId(e.target.value)}>
          {runs.map(r => <option key={r.id} value={r.id}>{date(r.created_at)} · {label[r.status]}</option>)}
        </select></label>
        {run?.status === 'failed' && !busy.startsWith('Gemini') && <div className="analysis-failure" role="alert">
          <div className="flex items-start gap-4"><div className="analysis-failure-icon"><AlertTriangle size={22} /></div><div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg">{failure.title}</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{failure.description}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14} /> No necesitas volver a importar tus fuentes.</p>
            <button className="primary-button mt-4" disabled={Boolean(busy) || !selected.length} onClick={() => void analyze()}><RefreshCw size={15} />{failure.retry}</button>
            {!!selected.length && <p className="mt-2 text-xs text-slate-500">{selected.length === 1 ? 'Usará la fuente seleccionada' : `Usará las ${selected.length} fuentes seleccionadas`} arriba y creará una nueva ejecución.</p>}
            {!selected.length && <p className="mt-2 text-xs text-slate-500">Selecciona al menos una fuente importada para reintentar.</p>}
            <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer">Detalle del error</summary><p className="mt-2 break-words">{run.error_message}</p></details>
          </div></div>
        </div>}
        {(busy.startsWith('Gemini') || (run && ['running','queued'].includes(run.status))) && <div role="status" className="analysis-working">
          <div className="flex items-center gap-3"><Loader2 className="animate-spin text-blue-500" size={24} /><div><h3 className="font-bold">Preparando el análisis de tu proyecto</h3><p className="mt-1 text-sm text-slate-500">Estamos revisando las fuentes y generando recomendaciones. Puede tardar hasta dos minutos.</p></div></div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-blue-700 dark:text-blue-300"><span>Fuentes guardadas</span><ArrowRight size={14} /><span>Requisitos y seguridad</span><ArrowRight size={14} /><span>Propuesta AWS</span></div>
          <p className="mt-4 text-xs text-slate-500">El historial se actualiza automáticamente. Si la ejecución se interrumpe, puedes reintentar después de cinco minutos.</p>
        </div>}
        {run?.status === 'completed' && <AnalysisReport key={run.id} projectId={project.id} projectName={project.name} run={run} />}
      </>}
    </section>
  </div>;
}
