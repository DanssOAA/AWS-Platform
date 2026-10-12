import { estimateSavedAnalysis } from './costs.ts';
import { generateSavedFlow } from './flow.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';
import { AnalysisError, PROMPT_VERSION, UUID, generateAnalysis, sanitizeText, type SourceVersion } from './core.ts';
import { boundedText, importSource } from './sources.ts';
import { answerProjectQuestion } from './assistant.ts';
import { scanSecurityReport } from './securityScan.ts';
import { scanNpmDependencies } from './dependencyScan.ts';

function dbError(error: { message?: string } | null) {
  if (!error) return;
  const message = error.message ?? '';
  if (/Límite de|Ya hay un análisis/.test(message)) throw new AnalysisError(message, 429);
  if (/no disponible|Versiones inválidas|Selecciona/.test(message)) throw new AnalysisError(message, 400);
  throw new AnalysisError('No se pudieron guardar o consultar los datos del proyecto.', 500);
}
export function createAnalysisHandler(options: {
  db: SupabaseClient; apiKey?: string; model: string; origins: string[]; fetcher?: typeof fetch;
}) {
  const { db, apiKey, model, origins, fetcher = fetch } = options;
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.includes(origin)) return json({ success: false, error: 'Origen no permitido.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return json({ success: false, error: 'Método no permitido.' }, 405);
    let analysisId: string | null = null;
    let userId: string | null = null;
    try {
      const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (!token) throw new AnalysisError('Debes iniciar sesión.', 401);
      const { data: auth, error: authError } = await db.auth.getUser(token);
      if (authError || !auth.user) throw new AnalysisError('Sesión inválida o expirada.', 401);
      if (auth.user.app_metadata?.cloudops_managed !== true) throw new AnalysisError('Se requiere una cuenta con acceso aprobado a CloudOps.', 403);
      userId = auth.user.id;
      let body;
      try { body = JSON.parse(await boundedText(req, 100000)); }
      catch (error) { if (error instanceof AnalysisError) throw error; throw new AnalysisError('Solicitud JSON inválida.'); }
      if (!body || !UUID.test(body.projectId ?? '') || !['import', 'analyze', 'assist', 'estimate', 'architecture'].includes(body.action))
        throw new AnalysisError('Proyecto o acción inválidos.');
      const { data: project, error: projectError } = await db.from('cloudops_projects').select('*').eq('id', body.projectId).eq('user_id', userId).single();
      if (projectError || !project || project.status !== 'active') throw new AnalysisError('Proyecto no disponible.', 404);
      if (body.action === 'architecture') {
        const flow = await generateSavedFlow(db,userId,project.id,body.analysisId,apiKey,model,fetcher);
        return json({success:true,analysisId:body.analysisId,flow});
      }
      if (body.action === 'estimate') {
        await estimateSavedAnalysis(db, userId, project.id, body.analysisId, apiKey, model, fetcher);
        return json({ success: true, analysisId: body.analysisId });
      }
      if (body.action === 'assist') {
        const conversation = await answerProjectQuestion(db, userId, project.id, body.analysisId, body.question, apiKey, model, fetcher);
        return json({ success: true, conversation });
      }
      if (body.action === 'import') {
        if (!UUID.test(body.sourceId ?? '')) throw new AnalysisError('Fuente inválida.');
        const { data: source, error } = await db.from('cloudops_project_sources').select('*').eq('id', body.sourceId).eq('project_id', project.id).eq('user_id', userId).single();
        if (error || !source) throw new AnalysisError('Fuente no disponible.', 404);
        const { count, error: quotaError } = await db.from('cloudops_source_versions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).gte('imported_at', new Date(Date.now() - 3600000).toISOString());
        dbError(quotaError);
        if ((count ?? 0) >= 30) throw new AnalysisError('Límite de 30 importaciones por hora alcanzado.', 429);
        const imported = await importSource(source, body.text, fetcher);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imported.text));
        const hash = Array.from(new Uint8Array(digest)).map(n => n.toString(16).padStart(2, '0')).join('');
        const { data: versionId, error: saveError } = await db.rpc('cloudops_save_source_version', {
          p_user: userId, p_source: source.id, p_text: imported.text, p_hash: hash, p_revision: imported.revision, p_coverage: imported.coverage,
        });
        dbError(saveError);
        return json({ success: true, sourceId: source.id, versionId, coverage: imported.coverage });
      }
      if (!apiKey) throw new AnalysisError('Falta configurar GEMINI_API_KEY en los secretos de Supabase.', 503);
      if (!Array.isArray(body.versionIds) || body.versionIds.length < 1 || body.versionIds.length > 3
        || body.versionIds.some((id: unknown) => typeof id !== 'string' || !UUID.test(id)) || new Set(body.versionIds).size !== body.versionIds.length)
        throw new AnalysisError('Selecciona de una a tres fuentes importadas.');
      const { data: versions, error: versionsError } = await db.from('cloudops_source_versions')
        .select('id, extracted_text, coverage, resolved_revision').eq('user_id', userId).eq('project_id', project.id).in('id', body.versionIds);
      dbError(versionsError);
      if (!versions || versions.length !== body.versionIds.length) throw new AnalysisError('Las fuentes no pertenecen a este proyecto.', 400);
      if (versions.reduce((size, v) => size + new TextEncoder().encode(v.extracted_text).byteLength, 0) > 180000)
        throw new AnalysisError('Las fuentes superan los 180 KB por análisis.', 413);
      const { data: runId, error: startError } = await db.rpc('cloudops_begin_project_analysis', {
        p_user: userId, p_project: project.id, p_versions: body.versionIds, p_model: model,
      });
      dbError(startError); analysisId = runId;
      const { data: run, error: runError } = await db.from('cloudops_project_analyses')
        .update({ prompt_version: PROMPT_VERSION }).eq('id', analysisId).eq('user_id', userId).eq('status', 'running').select('input_context').single();
      dbError(runError);
      if (!run) throw new AnalysisError('No se pudo recuperar el contexto del análisis.', 500);
      // Redact string values individually: treating serialized JSON as an env file
      // could discard unrelated context after a word such as "password".
      const cleanContext = JSON.parse(JSON.stringify(run.input_context, (_key, value) => typeof value === 'string' ? sanitizeText(value) : value));
      const staticScan = scanSecurityReport(versions as SourceVersion[]);
      const [dependencyScan, generated] = await Promise.all([
        scanNpmDependencies(versions as SourceVersion[], fetcher),
        generateAnalysis(apiKey, model, cleanContext, versions as SourceVersion[], fetcher),
      ]);
      // Deterministic signals take precedence and are capped with the existing
      // transactional limit; Gemini findings remain clearly attributable.
      const verified = [...staticScan.findings, ...dependencyScan.findings].slice(0, 12);
      const result = { ...generated, findings: [...verified, ...generated.findings.slice(0, 20 - verified.length)], limitations: [...generated.limitations, ...staticScan.coverage, ...dependencyScan.coverage] };
      const { error: finishError } = await db.rpc('cloudops_finish_project_analysis', { p_user: userId, p_analysis: analysisId, p_result: result });
      dbError(finishError);
      return json({ success: true, analysisId });
    } catch (error) {
      const status = error instanceof AnalysisError ? error.status : 500;
      const message = error instanceof AnalysisError ? error.message
        : error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
          ? 'La consulta agotó su tiempo. Revisa el historial antes de reintentar.'
          : 'No se pudo completar la operación. Inténtalo nuevamente.';
      if (analysisId && userId) {
        const { error: failureError } = await db.from('cloudops_project_analyses').update({
          status: 'failed', finished_at: new Date().toISOString(), error_message: message,
        }).eq('id', analysisId).eq('user_id', userId).eq('status', 'running');
        if (failureError) console.error('cloudops-analyze-project: could not mark failed', failureError.code);
      }
      return json({ success: false, error: message, analysisId }, status);
    }
  };
}
