// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createAnalysisHandler } from '../supabase/functions/cloudops-analyze-project/handler';
const projectId = '11111111-1111-4111-8111-111111111111';
const sourceId = '22222222-2222-4222-8222-222222222222';
function setup(overrides: Record<string, unknown> = {}) {
  const filters: [string, string, unknown][] = [];
  const db: any = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner', app_metadata: { cloudops_managed: true } } }, error: null }) },
    from: vi.fn((table: string) => {
      const values: Record<string, unknown> = {
        cloudops_projects: { data: { id: projectId, status: 'active' }, error: null },
        cloudops_project_sources: { data: { id: sourceId, kind: 'text', url: null, repository_ref: null }, error: null },
        cloudops_source_versions: { data: [], count: 0, error: null }, ...overrides,
      };
      let updating = false;
      const chain: any = {
        select: () => chain, eq: (key: string, value: unknown) => { filters.push([table,key,value]); return chain; },
        gte: () => chain, in: () => chain, update: () => { updating = true; return chain; },
        single: () => Promise.resolve(updating && table === 'cloudops_aws_recommendations' ? {data:{id:sourceId},error:null} : values[table]), then: (resolve: any, reject: any) => Promise.resolve(values[table]).then(resolve, reject),
      };
      return chain;
    }),
    rpc: vi.fn().mockResolvedValue({ data: sourceId, error: null }),
  };
  const fetcher = vi.fn();
  const handler = createAnalysisHandler({ db, model: 'gemini-2.5-flash', apiKey: 'test', origins: ['http://localhost:5173'], fetcher });
  const request = (body: unknown, headers: Record<string,string> = { authorization: 'Bearer test' }) =>
    handler(new Request('https://example.test', { method: 'POST', headers, body: JSON.stringify(body) }));
  return { db, fetcher, request, filters };
}
describe('API de proyectos', () => {
  it('estima solo servicios del análisis completado del propietario y reutiliza estimaciones guardadas', async () => {
    const analysisId='33333333-3333-4333-8333-333333333333';
    const row={id:sourceId,service_name:'Amazon S3',purpose:'Documentos',suggested_configuration:{description:'Privado'},assumptions:[]};
    const s=setup({cloudops_project_analyses:{data:{id:analysisId,input_context:{expected_users:10},summary:'Documentos'},error:null},cloudops_aws_recommendations:{data:[row],error:null}});
    s.fetcher.mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({estimates:[{id:sourceId,estimate:{monthly_min_usd:1,monthly_max_usd:3,region:'us-east-1',basis:'10 GB con uso pequeño',assumptions:['10 GB']}}]})}]}}]})));
    expect((await s.request({action:'estimate',projectId,analysisId})).status).toBe(200);
    expect(s.filters).toContainEqual(['cloudops_project_analyses','status','completed']);expect(s.filters).toContainEqual(['cloudops_aws_recommendations','user_id','owner']);expect(s.filters).toContainEqual(['cloudops_aws_recommendations','project_id',projectId]);
    const cached=setup({cloudops_project_analyses:{data:{id:analysisId},error:null},cloudops_aws_recommendations:{data:[{...row,suggested_configuration:{cost_estimate:{kind:'ai_estimate',monthly_min_usd:1,monthly_max_usd:3,region:'us-east-1',basis:'10 GB',assumptions:['10 GB']}}}],error:null}});
    expect((await cached.request({action:'estimate',projectId,analysisId})).status).toBe(200);expect(cached.fetcher).not.toHaveBeenCalled();
  });
  it('rechaza una estimación con IDs inventados y un análisis ajeno antes de guardar',async()=>{
    const analysisId='33333333-3333-4333-8333-333333333333';
    const foreign=setup({cloudops_project_analyses:{data:null,error:{message:'missing'}}});
    expect((await foreign.request({action:'estimate',projectId,analysisId})).status).toBe(404);expect(foreign.fetcher).not.toHaveBeenCalled();
    const s=setup({cloudops_project_analyses:{data:{id:analysisId},error:null},cloudops_aws_recommendations:{data:[{id:sourceId,suggested_configuration:{}}],error:null}});
    s.fetcher.mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({estimates:[{id:'inventado',estimate:{}}]})}]}}]})));
    expect((await s.request({action:'estimate',projectId,analysisId})).status).toBe(502);
  });
  it('rechaza invocación anónima antes de consultar datos', async () => {
    const s = setup(); const response = await s.request({}, {});
    expect(response.status).toBe(401); expect(s.db.from).not.toHaveBeenCalled();
  });
  it('valida sesión y acceso CloudOps en metadatos administrados', async () => {
    const s = setup(); s.db.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner', app_metadata: {}, user_metadata: { cloudops_managed: true } } } });
    expect((await s.request({})).status).toBe(403); expect(s.db.from).not.toHaveBeenCalled();
  });
  it('rechaza origen no permitido', async () => {
    const s = setup(); expect((await s.request({}, { origin: 'https://evil.example', authorization: 'Bearer test' })).status).toBe(403);
    expect(s.db.auth.getUser).not.toHaveBeenCalled();
  });
  it('no importa ni llama Gemini para proyectos ajenos', async () => {
    const s = setup({ cloudops_projects: { data: null, error: { message: 'not found' } } });
    const response = await s.request({ action: 'import', projectId, sourceId, text: 'Necesito PostgreSQL' });
    expect(response.status).toBe(404); expect(s.fetcher).not.toHaveBeenCalled(); expect(s.db.rpc).not.toHaveBeenCalled();
    expect(s.filters).toContainEqual(['cloudops_projects','user_id','owner']);
  });
  it('importa texto limpio y guarda SHA-256 con el propietario autenticado', async () => {
    const s = setup();
    const response = await s.request({ action: 'import', projectId, sourceId, text: 'Necesito PostgreSQL\napi_key=private-token', userId: 'attacker' });
    expect(response.status).toBe(200);
    const args = s.db.rpc.mock.calls[0][1];
    expect(args.p_user).toBe('owner'); expect(args.p_text).not.toContain('private-token'); expect(args.p_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('no marca éxito cuando falla el guardado', async () => {
    const s = setup(); s.db.rpc.mockResolvedValue({ error: { message: 'database failure with secret' } });
    const response = await s.request({ action: 'import', projectId, sourceId, text: 'Necesito PostgreSQL' });
    expect(response.status).toBe(500); const body = await response.json();
    expect(body.success).toBe(false); expect(body.error).not.toContain('secret');
  });
  it('rechaza versiones ajenas antes de consumir cuota Gemini', async () => {
    const s = setup();
    expect((await s.request({ action: 'analyze', projectId, versionIds: [sourceId] })).status).toBe(400);
    expect(s.db.rpc).not.toHaveBeenCalled(); expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('guarda un análisis con evidencia original y no finaliza una referencia inválida', async () => {
    const sourceText = 'La aplicación requiere PostgreSQL privado.';
    const overrides = {
      cloudops_source_versions: { data: [{ id: sourceId, extracted_text: sourceText, coverage: {}, resolved_revision: null }], error: null },
      cloudops_project_analyses: { data: { input_context: { expected_users: 50 } }, error: null },
    };
    const raw = {
      summary: 'Requiere PostgreSQL', security_score: null, risk_level: 'unknown', limitations: [],
      requirements: [{ key: 'R1', title: 'Datos', description: 'Persistir datos', category: 'database', priority: 'must', origin: 'explicit', confidence: 1, evidence_id: 'E1' }],
      findings: [], recommendations: [],
    };
    const response = () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(raw) }] } }] }));
    const success = setup(overrides); success.fetcher.mockImplementation(response);
    expect((await success.request({ action: 'analyze', projectId, versionIds: [sourceId] })).status).toBe(200);
    const finish = success.db.rpc.mock.calls.find((c: any[]) => c[0] === 'cloudops_finish_project_analysis');
    expect(finish[1].p_result.requirements[0]).toMatchObject({ source_version_id: sourceId, evidence_excerpt: sourceText });
    expect(finish[1].p_user).toBe('owner');
    raw.requirements[0].evidence_id = 'E999';
    const invalid = setup(overrides); invalid.fetcher.mockImplementation(response);
    const rejected = await invalid.request({ action: 'analyze', projectId, versionIds: [sourceId] });
    expect(rejected.status).toBe(502);
    expect((await rejected.json()).success).toBe(false);
    expect(invalid.db.rpc.mock.calls.some((c: any[]) => c[0] === 'cloudops_finish_project_analysis')).toBe(false);
  });
});
