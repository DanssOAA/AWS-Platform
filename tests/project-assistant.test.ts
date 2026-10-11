// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { answerProjectQuestion } from '../supabase/functions/cloudops-analyze-project/assistant';
const analysisId = '11111111-1111-4111-8111-111111111111';
function setup({ missing = false, count = 0, saveError = false } = {}) {
  const filters: unknown[][] = []; const insert = vi.fn();
  const db: any = { from: (table: string) => {
    let inserting = false;
    const result = () => table === 'cloudops_project_analyses' ? { data: missing ? null : { id: analysisId, summary: 'Proyecto real', input_context: { expected_users: 42 }, security_score: null } }
      : table === 'cloudops_project_conversations' ? inserting ? { data: saveError ? null : { id: 'saved', ...insert.mock.calls[0][0] }, error: saveError ? {} : null } : { count }
        : { data: table === 'cloudops_aws_recommendations' ? [{ service_name: 'Servicio de este proyecto', estimated_monthly_min_usd: null }] : [] };
    const query: any = { select: () => query, eq: (key: string, value: unknown) => { filters.push([table, key, value]); return query; }, gte: () => query, limit: () => query,
      insert: (value: unknown) => { insert(value); inserting = true; return query; }, single: () => Promise.resolve(result()), then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject) };
    return query;
  } };
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ summary: 'Respuesta específica', recommendations: ['Confirmar datos'], explanation: 'Basado en el informe guardado' }) }] } }] }))));
  return { db, filters, insert, fetcher, ask: () => answerProjectQuestion(db, 'owner', 'project', analysisId, '¿Qué necesito?', 'test', 'gemini-2.5-flash', fetcher) };
}
describe('asistente con contexto persistido', () => {
  it('consulta la BD con propietario, proyecto y análisis y guarda el resultado en ese contexto', async () => {
    const s = setup(); const answer = await s.ask();
    const body = JSON.parse(s.fetcher.mock.calls[0][1].body); const input = JSON.parse(body.contents[0].parts[0].text);
    expect(input.context.analysis.input_context.expected_users).toBe(42);
    expect(input.context.services[0].service_name).toBe('Servicio de este proyecto');
    expect(input.context.services[0].estimated_monthly_min_usd).toBeNull();
    for (const table of ['cloudops_project_requirements', 'cloudops_security_findings', 'cloudops_aws_recommendations']) {
      expect(s.filters).toContainEqual([table, 'user_id', 'owner']);
      expect(s.filters).toContainEqual([table, 'project_id', 'project']);
      expect(s.filters).toContainEqual([table, 'analysis_id', analysisId]);
    }
    expect(s.filters).toContainEqual(['cloudops_project_analyses', 'status', 'completed']);
    expect(s.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', project_id: 'project', analysis_id: analysisId }));
    expect(answer.id).toBe('saved');
  });
  it('no consulta al modelo para un análisis ajeno, inexistente o sin completar', async () => {
    const s = setup({ missing: true }); await expect(s.ask()).rejects.toThrow(/no está disponible/);
    expect(s.fetcher).not.toHaveBeenCalled(); expect(s.insert).not.toHaveBeenCalled();
  });
  it('respeta cuota y no presenta un fallo de persistencia como éxito', async () => {
    const quota = setup({ count: 20 }); await expect(quota.ask()).rejects.toThrow(/Límite/); expect(quota.fetcher).not.toHaveBeenCalled();
    const failure = setup({ saveError: true }); await expect(failure.ask()).rejects.toThrow(/No se pudo guardar/);
  });
  it('rechaza respuestas incompletas antes de guardar', async () => {
    const s = setup(); s.fetcher.mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] })));
    await expect(s.ask()).rejects.toThrow(/no completó/); expect(s.insert).not.toHaveBeenCalled();
  });
});
