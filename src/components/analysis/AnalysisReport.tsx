import { serviceEstimate } from '../../lib/projectEstimates';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import '../../styles/analysis.css';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardList, Cloud, Database, Download, FileText, Info, Layers, ListChecks, Loader2, Search, Server, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { errorMessage } from '../../lib/supabase';
import { loadAnalysisDetail, type AnalysisDetail, type AnalysisRun, type Finding, type Recommendation } from '../../lib/projectAnalysis';
import { analysisLabels as labels, buildActionPlan, reportMarkdown, severityOrder } from '../../lib/analysisPresentation';
import { ConnectedAnalysisResults } from './ConnectedAnalysisResults';
import { PdfDownloadButton } from './PdfDownloadButton';

export type ReportTab = 'overview' | 'security' | 'aws' | 'requirements' | 'plan';
type Tab = ReportTab;
const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'overview', label: 'Resumen', icon: Layers }, { id: 'security', label: 'Seguridad', icon: ShieldCheck },
  { id: 'aws', label: 'Servicios AWS', icon: Cloud }, { id: 'requirements', label: 'Requisitos', icon: ClipboardList },
  { id: 'plan', label: 'Plan de acción', icon: ListChecks },
];
export function AnalysisReport({ projectId, projectName, run }: { projectId: string; projectName: string; run: AnalysisRun }) {
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true; setData(null); setError('');
    loadAnalysisDetail(projectId, run.id).then(result => { if (alive) setData(result); }).catch(e => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; };
  }, [projectId, run.id, reload]);
  if (error) return <div className="error-box" role="alert">{error} <button className="underline" onClick={() => setReload(v => v + 1)}>Reintentar carga del informe</button></div>;
  if (!data) return <div role="status" className="analysis-loading"><Loader2 className="animate-spin" size={24} /><div><p className="font-semibold">Preparando tu informe</p><p className="text-sm text-slate-500">Recuperando evidencias y recomendaciones guardadas…</p></div></div>;
  return <ConnectedAnalysisResults key={run.id} projectId={projectId} projectName={projectName} run={run} data={data} />;
}

type TaskStore = { checked: Set<string>; loading: boolean; saving: boolean; error: string; toggle: (id: string) => void; reload: () => void };
export function AnalysisResults({ projectName, run, data, initialTab = 'overview', taskStore }: { projectName: string; run: AnalysisRun; data: AnalysisDetail; initialTab?: Tab; taskStore?: TaskStore }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [severity, setSeverity] = useState('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const tasks = buildActionPlan(data);
  const storageKey = 'cloudops-analysis-plan-' + run.id;
  const [localChecked, setChecked] = useState<Set<string>>(() => {
    if (taskStore) return new Set();
    try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); return new Set(Array.isArray(saved) ? saved.filter(id => tasks.some(t => t.id === id)) : []); }
    catch { return new Set(); }
  });
  const checked = taskStore?.checked ?? localChecked;
  const prefix = useId();
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const activeFindings = data.findings.filter(f => !['resolved','false_positive'].includes(f.verification_status))
    .sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
  const urgent = activeFindings.filter(f => ['critical','high'].includes(f.severity));
  const sortedFindings = [...data.findings].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
  const inferred = data.requirements.filter(r => r.origin === 'inferred');
  const services = [...data.recommendations].sort((a, b) => a.deployment_order - b.deployment_order);
  const assumptions = [...new Set(services.flatMap(s => s.assumptions))];
  const limits = run.limitations.filter(l => !l.startsWith('Cobertura de fuente '));
  const progress = tasks.length ? Math.round(checked.size / tasks.length * 100) : 0;
  function go(next: Tab) {
    setTab(next);
    tabButtons.current[tabs.findIndex(t => t.id === next)]?.focus();
  }
  function navigateTabs(event: KeyboardEvent, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); go(tabs[next].id); }
  }
  function toggleTask(id: string) {
    if (taskStore) { taskStore.toggle(id); return; }
    const next = new Set(checked); if (next.has(id)) next.delete(id); else next.add(id);
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); }
    catch { setFeedback('Tu avance se conserva durante esta visita; no se pudo guardar en el dispositivo.'); }
  }
  function download() {
    const blob = new Blob([reportMarkdown(projectName, run, data, checked)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'informe-' + projectName.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0,60) + '.md';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('Informe preparado para descargar con evidencias y plan de acción.');
  }
  const sourceName = (id?: string) => data.sources?.find(s => s.source_version_id === id)?.cloudops_source_versions.cloudops_project_sources.label;
  return <div className="analysis-report">
    <header className="analysis-hero">
      <div className="analysis-hero-orb" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="analysis-eyebrow"><Sparkles size={14} /> INFORME DEL PROYECTO</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200"><CheckCircle2 size={14} /> Análisis guardado</span>
      </div>
      <div className="relative mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{projectName}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{run.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2"><span className="analysis-dark-chip">Riesgo: {labels[run.risk_level ?? 'unknown']}</span>
            <span className="analysis-dark-chip">{data.requirements.length} requisitos</span><span className="analysis-dark-chip">{services.length} servicios AWS</span></div>
        </div>
        <ScoreRing score={run.security_score} />
      </div>
      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-300">Evaluación orientativa del contenido. Requiere verificación en el entorno real.</p>
        <div className="flex flex-wrap gap-2">
          <PdfDownloadButton input={{ projectName, run, data, checked }} disabled={taskStore?.loading || taskStore?.saving || Boolean(taskStore?.error)} />
          <button className="analysis-download" disabled={taskStore?.loading || taskStore?.saving || Boolean(taskStore?.error)} onClick={download}><Download size={15} /> Exportar Markdown</button>
        </div>
      </div>
    </header>

    <div className="analysis-metrics">
      <Metric icon={AlertTriangle} value={urgent.length} label="Prioridad alta" detail="Hallazgos altos o críticos por revisar" tone={urgent.length ? 'danger' : 'neutral'} />
      <Metric icon={ClipboardList} value={data.requirements.filter(r => r.priority === 'must').length} label="Requisitos esenciales" detail="Necesidades obligatorias del proyecto" />
      <Metric icon={Cloud} value={services.length} label="Servicios sugeridos" detail="Relacionados con tus requisitos" />
      <Metric icon={Target} value={checked.size + '/' + tasks.length} label="Tu plan de trabajo" detail="Tareas marcadas por ti" />
    </div>

    <div className="analysis-tabs" role="tablist" aria-label="Secciones del informe">
      {tabs.map((item, index) => { const Icon = item.icon; return <button key={item.id} id={prefix + '-tab-' + item.id} role="tab"
        aria-selected={tab === item.id} aria-controls={prefix + '-panel-' + item.id} tabIndex={tab === item.id ? 0 : -1}
        ref={node => { tabButtons.current[index] = node; }} onKeyDown={e => navigateTabs(e, index)} onClick={() => setTab(item.id)}
        className={'analysis-tab ' + (tab === item.id ? 'is-active' : '')}><Icon size={16} />{item.label}</button>; })}
    </div>
    {feedback && <p role="status" className="text-xs text-blue-600 dark:text-blue-300 px-1">{feedback}</p>}
    {taskStore?.loading && <p role="status" className="text-sm">Cargando avance guardado en Supabase…</p>}
    {taskStore?.saving && <p role="status" className="text-sm">Guardando avance…</p>}
    {taskStore?.error && <p role="alert" className="error-box">No se pudo sincronizar el plan: {taskStore.error} <button className="underline" onClick={taskStore.reload}>Reintentar sincronización</button></p>}
    <div id={prefix + '-panel-' + tab} role="tabpanel" aria-labelledby={prefix + '-tab-' + tab} tabIndex={0} className="analysis-tabpanel">
      {tab === 'overview' && <div className="space-y-5">
        <div className="analysis-next">
          <div className="analysis-section-icon"><Target size={22} /></div>
          <div className="min-w-0 flex-1"><p className="analysis-kicker">TU SIGUIENTE PASO</p><h3 className="mt-1 text-lg font-bold">
            {urgent.length ? 'Empieza por los riesgos prioritarios' : inferred.length ? 'Confirma lo que la IA tuvo que deducir' : services.length ? 'Revisa la propuesta antes de desplegar' : 'Completa los requisitos del proyecto'}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{urgent.length ? urgent[0].remediation : inferred.length ? inferred[0].description : 'Valida el alcance, los supuestos y las configuraciones. El plan reúne las acciones necesarias para avanzar.'}</p>
            <button className="analysis-text-link mt-3" onClick={() => go(urgent.length ? 'security' : inferred.length ? 'requirements' : 'plan')}>Ver qué hacer <ArrowRight size={15} /></button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="analysis-card"><div className="analysis-card-heading"><ShieldCheck size={18} /><h3>Estado de la revisión</h3></div>
            <div className="mt-4 flex items-end gap-2"><span className="text-3xl font-bold">{data.findings.length}</span><span className="text-sm text-slate-500 pb-1">hallazgos reportados</span></div>
            <div className="mt-4 flex h-2 gap-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              {['critical','high','medium','low','info'].map(s => { const count = data.findings.filter(f => f.severity === s).length; return count ? <span key={s} className={'analysis-severity-bar severity-' + s} style={{ flex: count }} /> : null; })}
            </div>
            {!data.findings.length ? <p className="mt-3 text-xs text-slate-500">No se reportaron hallazgos en el contenido revisado. Esto no demuestra que el proyecto sea seguro.</p>
              : <div className="mt-3 flex flex-wrap gap-2">{['critical','high','medium','low','info'].map(s => { const count = data.findings.filter(f => f.severity === s).length; return count ? <span key={s} className={'analysis-badge tone-' + s}>{count} {labels[s]}</span> : null; })}</div>}
            <button className="analysis-text-link mt-4" onClick={() => go('security')}>Revisar evidencias <ArrowRight size={14} /></button>
          </section>
          <section className="analysis-card"><div className="analysis-card-heading"><ListChecks size={18} /><h3>De la recomendación a la acción</h3></div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Un recorrido para confirmar requisitos, corregir hallazgos y preparar tu infraestructura.</p>
            <div className="mt-4 flex items-center justify-between text-xs"><span>{checked.size} de {tasks.length} tareas marcadas</span><strong>{progress}%</strong></div>
            <div className="analysis-progress mt-2"><span style={{ width: progress + '%' }} /></div>
            <button className="analysis-text-link mt-4" onClick={() => go('plan')}>Abrir mi plan <ArrowRight size={14} /></button>
          </section>
        </div>
        <section className="analysis-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="analysis-kicker">PROPUESTA AWS</p><h3 className="mt-1 font-bold">Orden sugerido de preparación</h3></div><button className="analysis-text-link" onClick={() => go('aws')}>Ver justificación <ArrowRight size={14} /></button></div>
          {services.length ? <div className="analysis-service-path">{services.map((s, i) => <div className="analysis-path-step" key={s.id}><span className="analysis-path-number">{i + 1}</span><Cloud size={21} className="text-blue-500" /><strong className="text-sm">{s.service_name}</strong><span className="text-xs text-slate-500">{labels[s.priority]}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No hay información suficiente para proponer servicios. Agrega requisitos y vuelve a analizar.</p>}
          <p className="mt-3 text-xs text-slate-500">Es una propuesta de preparación, no un diagrama de conexiones ni infraestructura desplegada.</p>
        </section>
        {!!assumptions.length && <section className="analysis-card"><div className="analysis-card-heading"><Info size={18} /><h3>Antes de decidir, confirma estos supuestos</h3></div><ul className="mt-3 space-y-2">{assumptions.slice(0,6).map(a => <li key={a} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{a}</li>)}</ul></section>}
      </div>}

      {tab === 'security' && <div className="space-y-4">
        <SectionHeading title="Hallazgos y correcciones" description="Primero los de mayor severidad. Cada hallazgo conserva su evidencia y una acción sugerida." />
        <div className="flex flex-wrap gap-2" aria-label="Filtrar severidad">{['all','critical','high','medium','low','info'].map(s => <button key={s} className={'analysis-filter ' + (severity === s ? 'is-active' : '')} aria-pressed={severity === s} onClick={() => setSeverity(s)}>{s === 'all' ? 'Todos' : labels[s]} <span>{s === 'all' ? data.findings.length : data.findings.filter(f => f.severity === s).length}</span></button>)}</div>
        {!sortedFindings.filter(f => severity === 'all' || severity === f.severity).length && <EmptyState text="No hay hallazgos para este filtro. Una lista vacía no sustituye una revisión de seguridad completa." />}
        {sortedFindings.filter(f => severity === 'all' || severity === f.severity).map(f => <FindingCard key={f.id} finding={f} source={sourceName(f.source_version_id)} />)}
      </div>}

      {tab === 'aws' && <div className="space-y-4">
        <SectionHeading title="Tu propuesta de servicios AWS" description="Qué aporta cada servicio, por qué se sugiere y qué necesita confirmarse antes de contratarlo." />
        {!services.length && <EmptyState text="No se recomendaron servicios. Agrega información sobre la aplicación, sus datos y su carga esperada." />}
        {services.map((r, i) => <ServiceCard key={r.id} service={r} index={i} data={data} />)}
        {!!services.length && <div className="analysis-note"><Info size={18} /><p>Los costos estimados por IA son orientativos. Revisa sus supuestos de región, tráfico, almacenamiento y disponibilidad en AWS Pricing Calculator antes de contratar.</p></div>}
      </div>}

      {tab === 'requirements' && <div className="space-y-4">
        <SectionHeading title="Lo que necesita tu proyecto" description="Separa lo escrito en las fuentes de lo que la IA dedujo. Confirma los requisitos inferidos antes de tomar decisiones." />
        <label className="analysis-search"><Search size={18} /><span className="sr-only">Buscar requisitos</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un requisito…" /></label>
        {!data.requirements.filter(r => (r.title + r.description).toLowerCase().includes(search.toLowerCase())).length && <EmptyState text="No hay requisitos que coincidan con la búsqueda." />}
        {data.requirements.filter(r => (r.title + r.description).toLowerCase().includes(search.toLowerCase())).map(r => <article key={r.id} className="analysis-card">
          <div className="flex flex-wrap gap-2 mb-3"><span className="analysis-badge tone-neutral">{labels[r.priority]}</span><span className={'analysis-badge ' + (r.origin === 'inferred' ? 'tone-medium' : 'tone-low')}>{r.origin === 'inferred' ? 'Inferido · confirmar' : 'Explícito en la fuente'}</span></div>
          <h4 className="font-bold">{r.title}</h4><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.description}</p>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-500"><span>Confianza de la IA</span><div className="analysis-progress w-24"><span style={{ width: Math.round(r.confidence * 100) + '%' }} /></div><span>{Math.round(r.confidence * 100)}%</span></div>
          <Evidence excerpt={r.evidence_excerpt} location={r.evidence_location} source={sourceName(r.source_version_id)} />
        </article>)}
      </div>}

      {tab === 'plan' && <div className="space-y-5">
        <SectionHeading title="Tu plan para avanzar" description={taskStore ? 'Organiza el trabajo a partir del informe. El avance se guarda en Supabase para tu cuenta, proyecto y análisis.' : 'Organiza el trabajo a partir del informe. El avance se guarda en este dispositivo y puedes incluirlo en la descarga.'} />
        <div className="analysis-plan-progress"><div><strong className="text-lg">{checked.size} de {tasks.length}</strong><p className="text-xs text-slate-500 mt-1">tareas marcadas por ti</p></div><div className="flex-1"><div className="analysis-progress"><span style={{ width: progress + '%' }} /></div></div><strong className="text-blue-600">{progress}%</strong></div>
        {([{ id: 'scope', title: 'Confirma el alcance', subtitle: 'Requisitos que la IA dedujo.' }, { id: 'security', title: 'Revisa y corrige los hallazgos', subtitle: 'Prioriza los riesgos más altos y comprueba cada corrección.' }, { id: 'aws', title: 'Prepara los servicios', subtitle: 'Usa la configuración como punto de partida y valida los supuestos.' }, { id: 'validate', title: 'Valida antes de publicar', subtitle: 'Cierra la revisión con pruebas reales.' }] as const).map((group, index) => {
          const items = tasks.filter(t => t.group === group.id); if (!items.length) return null;
          return <section key={group.id} className="analysis-card"><div className="flex items-start gap-3"><span className="analysis-step-number">{index + 1}</span><div><h4 className="font-bold">{group.title}</h4><p className="text-xs text-slate-500 mt-1">{group.subtitle}</p></div></div>
            <div className="mt-4 space-y-2">{items.map(task => <label key={task.id} className={'analysis-task ' + (checked.has(task.id) ? 'is-done' : '')}>
              <input type="checkbox" checked={checked.has(task.id)} disabled={taskStore?.loading || taskStore?.saving || Boolean(taskStore?.error)} onChange={() => toggleTask(task.id)} /><div><span className="font-medium text-sm">{task.title}</span><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{task.detail}</p></div>
            </label>)}</div>
          </section>;
        })}
        <div className="analysis-note"><Info size={18} /><p>Esta es tu lista personal. Marcar una tarea no modifica los hallazgos ni confirma que la aplicación sea segura.</p></div>
      </div>}
    </div>

    <details className="analysis-scope"><summary><FileText size={16} /> Fuentes, alcance y limitaciones <span className="ml-auto text-xs font-normal text-slate-500">{new Date(run.created_at).toLocaleDateString('es-PE')}</span></summary>
      {!!data.sources?.length && <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.sources.map(s => { const v = s.cloudops_source_versions; const files = Array.isArray(v.coverage.files) ? v.coverage.files : []; return <div key={s.source_version_id} className="rounded-xl border dark:border-slate-700 p-3 text-xs">
        <strong className="block">{v.cloudops_project_sources.label}</strong><p className="mt-1 text-slate-500">Versión {v.version} · {files.length ? files.length + ' archivos leídos' : 'Texto importado'}{v.coverage.truncated ? ' · cobertura parcial' : ''}</p>
        {v.resolved_revision && <p className="mt-1 text-slate-500">Commit: {v.resolved_revision.slice(0,12)}</p>}
      </div>; })}</div>}
      <ul className="mt-4 list-disc pl-5 space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{limits.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <p className="mt-4 text-xs text-slate-500">Modelo: {run.model} · {new Date(run.created_at).toLocaleString('es-PE')}</p>
    </details>
  </div>;
}

function ScoreRing({ score }: { score: number | null }) {
  const color = score === null ? '#94a3b8' : score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#fb7185';
  const circumference = 2 * Math.PI * 48;
  return <div className="analysis-score"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
    {score !== null && <circle cx="60" cy="60" r="48" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1-score/100)} transform="rotate(-90 60 60)" />}</svg>
    <div className="analysis-score-value">{score === null ? <><ShieldCheck size={28} className="text-slate-300" /><span className="text-xs mt-1">Sin evaluar</span></> : <><strong>{score}</strong><span className="text-xs text-slate-300">de 100</span></>}</div>
    <p className="text-xs text-center text-slate-300 mt-1">Seguridad estimada</p>
  </div>;
}
function Metric({ icon: Icon, value, label, detail, tone = 'neutral' }: { icon: typeof Cloud; value: string | number; label: string; detail: string; tone?: string }) {
  return <div className="analysis-metric"><div className={'analysis-metric-icon ' + (tone === 'danger' ? 'is-danger' : '')}><Icon size={18} /></div><strong className="text-2xl tracking-tight">{value}</strong><p className="text-xs font-semibold mt-1">{label}</p><p className="text-[11px] leading-relaxed text-slate-500 mt-1">{detail}</p></div>;
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h3 className="text-lg font-bold tracking-tight">{title}</h3><p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p></div>;
}
function EmptyState({ text }: { text: string }) { return <div className="analysis-empty"><Info size={22} /><p>{text}</p></div>; }
function Evidence({ excerpt, location, source }: { excerpt: string; location: string; source?: string }) {
  return <details className="analysis-evidence"><summary><Search size={13} /> Ver evidencia en la fuente</summary><blockquote>{excerpt}</blockquote><p>{source ? source + ' · ' : ''}{location}</p></details>;
}
function FindingCard({ finding: f, source }: { finding: Finding; source?: string }) {
  return <article className={'analysis-card analysis-finding severity-' + f.severity}><div className="flex flex-wrap gap-2 mb-3"><span className={'analysis-badge tone-' + f.severity}>{labels[f.severity]}</span><span className="analysis-badge tone-neutral">{labels[f.verification_status] ?? 'Por verificar'}</span></div>
    <h4 className="font-bold text-base">{f.title}</h4><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.description}</p>
    <div className="analysis-remediation"><CheckCircle2 size={18} /><div><p className="font-semibold text-xs">QUÉ PUEDES HACER</p><p className="mt-1 text-sm leading-relaxed">{f.remediation}</p></div></div>
    <Evidence excerpt={f.evidence_excerpt} location={f.evidence_location} source={source} />
  </article>;
}
function ServiceCard({ service: r, index, data }: { service: Recommendation; index: number; data: AnalysisDetail }) {
  const estimate = serviceEstimate(r);
  const Icon = /rds|dynamo|database|aurora/i.test(r.service_name) ? Database : /ec2|lambda|ecs|compute/i.test(r.service_name) ? Server : Cloud;
  return <article className="analysis-card analysis-service"><div className="flex items-start gap-3"><div className="analysis-service-icon"><Icon size={23} /></div><div className="min-w-0 flex-1"><p className="analysis-kicker">SERVICIO {String(index + 1).padStart(2,'0')}</p><h4 className="text-lg font-bold mt-1">{r.service_name}</h4></div><span className="analysis-badge tone-neutral">{labels[r.priority]}</span></div>
    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{r.purpose}</p>
    <div className="analysis-service-why"><p className="font-semibold text-xs text-blue-700 dark:text-blue-300">POR QUÉ EN ESTE PROYECTO</p><p className="mt-2 text-sm leading-relaxed">{r.rationale}</p>
      <div className="mt-3 flex flex-wrap gap-2">{r.cloudops_recommendation_requirements.map(link => <span key={link.requirement_id} className="analysis-requirement-chip"><Check size={12} />{data.requirements.find(q => q.id === link.requirement_id)?.title ?? 'Requisito asociado'}</span>)}</div>
    </div>
    <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Configuración de partida</p><p className="mt-2 text-sm leading-relaxed">{r.suggested_configuration.description ?? 'Por definir con los requisitos del proyecto.'}</p></div>
    {(r.assumptions.length > 0 || r.alternatives.length > 0) && <details className="analysis-evidence"><summary><Info size={13} /> Supuestos y alternativas</summary>
      {!!r.assumptions.length && <div className="mt-3"><strong className="text-xs">Confirma estos supuestos</strong><ul className="list-disc pl-4 mt-2 space-y-1">{r.assumptions.map((a,i) => <li key={i}>{a}</li>)}</ul></div>}
      {!!r.alternatives.length && <div className="mt-3"><strong className="text-xs">Alternativas</strong><ul className="list-disc pl-4 mt-2 space-y-1">{r.alternatives.map((a,i) => <li key={i}>{a}</li>)}</ul></div>}
    </details>}
    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{estimate ? `USD ${estimate.min}–${estimate.max}/mes · ${estimate.region} · estimación orientativa` : 'Costo pendiente de estimar'}</span><span>No desplegado</span></div>
  </article>;
}
