import { FunctionsHttpError } from '@supabase/supabase-js';
import { requireSupabase } from './supabase';

export type Project = {
  id: string; name: string; description: string; preferred_region: string | null;
  monthly_budget_usd: number | null; expected_users: number | null; availability_target: number | null;
  status: 'active' | 'archived'; created_at: string;
};
export type Version = { id: string; version: number; imported_at: string; coverage: Record<string, unknown>; resolved_revision: string | null };
export type ProjectSource = {
  id: string; label: string; kind: string; url: string | null; repository_ref: string | null;
  cloudops_source_versions: Version[];
};
export type AnalysisRun = {
  architecture_flow?: import('../../supabase/functions/cloudops-analyze-project/flowTypes').ProjectFlow | null;
  input_context?: Partial<Project>;
  id: string; status: 'queued' | 'running' | 'completed' | 'failed'; summary: string | null;
  security_score: number | null; risk_level: string | null; limitations: string[]; error_message: string | null;
  model: string; created_at: string; finished_at: string | null;
};
export type Requirement = { id: string; category?: string; source_version_id?: string; title: string; description: string; priority: string; origin: string; confidence: number; evidence_excerpt: string; evidence_location: string };
export type Finding = { id: string; category?: string; source_version_id?: string; title: string; severity: string; description: string; remediation: string; evidence_excerpt: string; evidence_location: string; verification_status: string };
export type Recommendation = {
  id: string; service_code?: string; service_name: string; purpose: string; rationale: string; priority: string;
  suggested_configuration: { description?: string; cost_estimate?: import('./projectEstimates').PlanningEstimate }; alternatives: string[]; assumptions: string[];
  deployment_order: number; estimated_monthly_min_usd: number | null; estimated_monthly_max_usd: number | null;
  region?: string | null; pricing_reference_url?: string | null; pricing_checked_at?: string | null;
  cloudops_recommendation_requirements: { requirement_id: string }[];
};
export type AnalysisSource = { source_version_id: string; cloudops_source_versions: Version & { cloudops_project_sources: { label: string; kind: string; url: string | null } } };
export type AnalysisDetail = { requirements: Requirement[]; findings: Finding[]; recommendations: Recommendation[]; sources?: AnalysisSource[] };
export async function listProjects() {
  const { data, error } = await requireSupabase().from('cloudops_projects').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
  if (error) throw error; return data as Project[];
}
export async function createProject(input: Pick<Project, 'name' | 'description' | 'preferred_region' | 'monthly_budget_usd' | 'expected_users' | 'availability_target'>) {
  const { data, error } = await requireSupabase().from('cloudops_projects').insert(input).select('*').single();
  if (error) throw error; return data as Project;
}
export async function loadProjectWorkspace(projectId: string) {
  const [sources, runs] = await Promise.all([
    requireSupabase().from('cloudops_project_sources')
      .select('id,label,kind,url,repository_ref,cloudops_source_versions(id,version,imported_at,coverage,resolved_revision)')
      .eq('project_id', projectId).order('created_at', { ascending: false })
      .order('version', { referencedTable: 'cloudops_source_versions', ascending: false })
      .limit(1, { referencedTable: 'cloudops_source_versions' }).limit(100),
    requireSupabase().from('cloudops_project_analyses').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (sources.error) throw sources.error; if (runs.error) throw runs.error;
  return { sources: sources.data as unknown as ProjectSource[], runs: runs.data as AnalysisRun[] };
}
export async function addSource(projectId: string, input: { kind: string; label: string; url: string | null; repository_ref: string | null }) {
  const { data, error } = await requireSupabase().from('cloudops_project_sources').insert({ project_id: projectId, ...input }).select('id').single();
  if (error) throw error; return data.id as string;
}
export async function projectAction(body: { action: 'import' | 'analyze' | 'assist' | 'estimate' | 'architecture'; projectId: string; sourceId?: string; text?: string; versionIds?: string[]; analysisId?: string; question?: string }) {
  const { data, error } = await requireSupabase().functions.invoke('cloudops-analyze-project', { body, timeout: 150000 });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo procesar el proyecto.');
    }
    throw error;
  }
  if (data?.success !== true) throw new Error(data?.error || 'El servidor no confirmó la operación.');
  return data as { success: true; analysisId?: string; versionId?: string; conversation?: ProjectConversation; flow?: import('../../supabase/functions/cloudops-analyze-project/flowTypes').ProjectFlow };
}
export async function loadAnalysisDetail(projectId: string, analysisId: string): Promise<AnalysisDetail> {
  const query = (table: string, columns = '*') => requireSupabase().from(table).select(columns).eq('project_id', projectId).eq('analysis_id', analysisId);
  const [requirements, findings, recommendations, sources] = await Promise.all([
    query('cloudops_project_requirements'), query('cloudops_security_findings'),
    query('cloudops_aws_recommendations', '*,cloudops_recommendation_requirements(requirement_id)').order('deployment_order'),
    query('cloudops_analysis_sources', 'source_version_id,cloudops_source_versions(id,version,imported_at,coverage,resolved_revision,cloudops_project_sources(label,kind,url))'),
  ]);
  if (requirements.error) throw requirements.error; if (findings.error) throw findings.error; if (recommendations.error) throw recommendations.error;
  if (sources.error) throw sources.error;
  return { requirements: requirements.data as unknown as Requirement[], findings: findings.data as unknown as Finding[], recommendations: recommendations.data as unknown as Recommendation[], sources: sources.data as unknown as AnalysisSource[] };
}

export type AnalyzedProject = { run: AnalysisRun | null; latestRun: AnalysisRun | null; detail: AnalysisDetail | null };
export async function loadAnalyzedProject(projectId: string): Promise<AnalyzedProject> {
  const query = () => requireSupabase().from('cloudops_project_analyses').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const [completed, latest] = await Promise.all([
    requireSupabase().from('cloudops_project_analyses').select('*').eq('project_id', projectId).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    query(),
  ]);
  if (completed.error) throw completed.error; if (latest.error) throw latest.error;
  const run = completed.data as AnalysisRun | null;
  return { run, latestRun: latest.data as AnalysisRun | null, detail: run ? await loadAnalysisDetail(projectId, run.id) : null };
}
export async function loadAnalysisTasks(projectId: string, analysisId: string) {
  const { data, error } = await requireSupabase().from('cloudops_analysis_tasks').select('task_id,completed').eq('project_id', projectId).eq('analysis_id', analysisId);
  if (error) throw error;
  return (data as { task_id: string; completed: boolean }[]).filter(t => t.completed).map(t => t.task_id);
}
export async function saveAnalysisTask(projectId: string, analysisId: string, taskId: string, completed: boolean) {
  const { error } = await requireSupabase().from('cloudops_analysis_tasks').upsert({ project_id: projectId, analysis_id: analysisId, task_id: taskId, completed }, { onConflict: 'user_id,project_id,analysis_id,task_id' });
  if (error) throw error;
}
export type ProjectConversation = { id: string; question: string; answer: { summary: string; explanation: string; recommendations: string[] }; created_at: string };
export async function loadProjectConversations(projectId: string, analysisId: string) {
  const { data, error } = await requireSupabase().from('cloudops_project_conversations').select('id,question,answer,created_at').eq('project_id', projectId).eq('analysis_id', analysisId).order('created_at', { ascending: false }).limit(10);
  if (error) throw error; return data as ProjectConversation[];
}
