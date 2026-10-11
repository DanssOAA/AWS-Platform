import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { listProjects, loadAnalyzedProject, projectAction, loadAnalysisDetail, type AnalysisDetail, type AnalyzedProject, type Project } from '../lib/projectAnalysis';
import { errorMessage } from '../lib/supabase';
import { serviceEstimate } from '../lib/projectEstimates';

type EstimateJob = { phase: 'running' | 'ready' | 'failed'; detail?: AnalysisDetail; error?: string };
// Only fill missing estimates. A refreshed finding/configuration remains authoritative.
function withEstimates(detail: AnalysisDetail | null, cached?: AnalysisDetail): AnalysisDetail | null {
  if (!detail || !cached) return detail;
  return { ...detail, recommendations: detail.recommendations.map(r => {
    const estimated = cached.recommendations.find(e => e.id === r.id);
    return !serviceEstimate(r) && estimated && serviceEstimate(estimated)
      ? { ...r, suggested_configuration: { ...r.suggested_configuration, cost_estimate: estimated.suggested_configuration.cost_estimate },
        estimated_monthly_min_usd: estimated.estimated_monthly_min_usd, estimated_monthly_max_usd: estimated.estimated_monthly_max_usd }
      : r;
  }) };
}

function useWorkspaceState() {
  const { user } = useAuth();
  const key = 'cloudops_active_project_' + user!.id;
  const [params, setParams] = useSearchParams();
  const requested = params.get('project');
  const [activeId, setActiveId] = useState<string>(() => { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } });
  const [projects, setProjects] = useState<Project[]>([]);
  const [listing, setListing] = useState(true);
  const [listError, setListError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [listRevision, setListRevision] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<string, AnalyzedProject>>({});
  const serial = useRef(0);
  const estimateRequests = useRef(new Set<string>());
  const [estimateJobs, setEstimateJobs] = useState<Record<string, EstimateJob>>({});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let alive = true; setListing(true); setListError('');
    listProjects().then(rows => {
      if (!alive) return;
      setProjects(rows); setActiveId(id => rows.some(p => p.id === id) ? id : (rows[0]?.id ?? ''));
    }).catch(e => { if (alive) { setProjects([]); setListError(errorMessage(e)); } }).finally(() => { if (alive) setListing(false); });
    return () => { alive = false; };
  }, [listRevision]);
  useEffect(() => {
    if (requested && projects.some(p => p.id === requested)) setActiveId(requested);
  }, [requested, projects]);
  const projectId = requested ?? activeId;
  const project = projects.find(p => p.id === projectId) ?? null;
  useEffect(() => { if (project) { try { localStorage.setItem(key, project.id); } catch { /* Selection is only a preference. */ } } }, [key, project]);
  useEffect(() => {
    const request = ++serial.current;
    setError('');
    if (!project) { setLoading(false); return; }
    setLoading(true);
    loadAnalyzedProject(project.id).then(data => {
      if (serial.current === request) setSnapshots(previous => ({ ...previous, [project.id]: data }));
    }).catch(e => { if (serial.current === request) setError(errorMessage(e)); })
      .finally(() => { if (serial.current === request) setLoading(false); });
    return () => { serial.current++; };
  }, [project, revision]);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    const focus = () => refresh(); window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);
  const current = project ? snapshots[project.id] ?? null : null;
  const estimateKey = project && current?.run ? `${project.id}:${current.run.id}` : '';
  const estimateJob = estimateJobs[estimateKey];
  const detail = useMemo(() => withEstimates(current?.detail ?? null, estimateJob?.detail), [current?.detail, estimateJob?.detail]);
  const estimatesPending = detail?.recommendations.filter(r => !serviceEstimate(r)).length ?? 0;
  const estimating = estimateJob?.phase === 'running';
  const estimateError = estimatesPending ? estimateJob?.error ?? '' : '';
  useEffect(() => {
    if (!current?.latestRun || !['running', 'queued'].includes(current.latestRun.status)) return;
    const timer = setTimeout(refresh, 10000); return () => clearTimeout(timer);
  }, [current, refresh]);
  async function estimateCosts() {
    if (!project || !current?.run || !estimatesPending || estimateRequests.current.has(estimateKey)) return;
    const id = current.run.id; const ownerProject = project.id; const jobKey = estimateKey;
    estimateRequests.current.add(jobKey);
    setEstimateJobs(previous => ({ ...previous, [jobKey]: { ...previous[jobKey], phase: 'running', error: '' } }));
    try {
      await projectAction({ action: 'estimate', projectId: ownerProject, analysisId: id });
      const saved = await loadAnalysisDetail(ownerProject,id);
      if (!mounted.current) return;
      const incomplete = saved.recommendations.some(r => !serviceEstimate(r));
      setEstimateJobs(previous => ({ ...previous, [jobKey]: { detail: saved, phase: incomplete ? 'failed' : 'ready',
        error: incomplete ? 'Aún faltan estimaciones de algunos servicios. Puedes reintentar para completar los pendientes.' : '' } }));
    } catch (e) {
      if (mounted.current) setEstimateJobs(previous => ({ ...previous, [jobKey]: { ...previous[jobKey], phase: 'failed', error: errorMessage(e) } }));
    } finally { estimateRequests.current.delete(jobKey); }
  }
  useEffect(() => {
    // One automatic attempt per visit/refresh, deduplicated while in flight.
    // Changing selection must never cancel another project's result or hide its error.
    if (estimatesPending) void estimateCosts();
  }, [project?.id, current?.run?.id, revision]);
  function selectProject(id: string) {
    setActiveId(id); setParams(previous => { const next = new URLSearchParams(previous); next.set('project', id); return next; });
  }
  function refreshProjects(id?: string) { if (id) selectProject(id); setListRevision(v => v + 1); }
  return { projects, project, loading: listing || loading || Boolean(project && !current && !error), error: listError || error,
    run: current?.run ?? null, latestRun: current?.latestRun ?? null, detail,
    selectProject, refresh, refreshProjects, estimating, estimateError, estimateCosts, estimatesPending };
}
const Context = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
export function ProjectWorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceState(); return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useOptionalProjectWorkspace = () => useContext(Context);
export function useProjectWorkspace() {
  const value = useContext(Context); if (!value) throw new Error('Falta ProjectWorkspaceProvider'); return value;
}
