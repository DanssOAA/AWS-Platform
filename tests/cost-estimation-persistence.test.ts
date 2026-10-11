// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { estimateSavedAnalysis, validateEstimate } from '../supabase/functions/cloudops-analyze-project/costs';
const analysisId = '33333333-3333-4333-8333-333333333333';
const estimate = { monthly_min_usd: 2, monthly_max_usd: 8, region: 'us-east-1', basis: '100 GB y 10000 peticiones al mes', assumptions: ['100 GB', '10000 peticiones'] };
function setup(existing?: object) {
  const rows: any[] = [
    { id: 'regional', service_name: 'Amazon S3', suggested_configuration: { description: 'Privado', ...(existing ? { cost_estimate: existing } : {}) } },
    { id: 'global', service_name: 'AWS IAM', suggested_configuration: { description: 'Roles mínimos' } },
  ];
  const writes: any[] = [];
  const db: any = { from: (table: string) => {
    const filters: Record<string, unknown> = {}; let update: any;
    const result = () => {
      if (table === 'cloudops_project_analyses') return { data: { id: analysisId, input_context: { expected_users: 100 }, summary: 'ERP' }, error: null };
      if (update) {
        writes.push({ filters, update });
        const row = rows.find(r => r.id === filters.id);
        if (!row || db.failSave) return { data: null, error: null };
        Object.assign(row, update); return { data: { id: row.id }, error: null };
      }
      return { data: structuredClone(rows), error: null };
    };
    const q: any = { select: () => q, eq: (k: string, v: unknown) => { filters[k] = v; return q; }, update: (v: any) => { update = v; return q; }, single: async () => result(), then: (ok: any, no: any) => Promise.resolve(result()).then(ok, no) };
    return q;
  } };
  const fetcher = vi.fn();
  const run = () => estimateSavedAnalysis(db, 'owner', 'project', analysisId, 'test', 'gemini-2.5-flash', fetcher);
  return { db, rows, writes, fetcher, run };
}
const response = (estimates: any[]) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ estimates }) }] } }] }));
const regional = { id: 'regional', estimate };
const global = { id: 'global', estimate: { ...estimate, region: ' Global ', monthly_min_usd: 0, monthly_max_usd: 0, basis: 'IAM sin cargo directo; uso de otros servicios se calcula por separado' } };
describe('costos regionales y globales guardados por análisis', () => {
  it('guarda un lote mixto con IAM global y reutiliza los datos al volver a cargar sin llamar a Gemini', async () => {
    const s = setup(); s.fetcher.mockResolvedValueOnce(response([regional, global]));
    await s.run();
    expect(s.rows[1].suggested_configuration.cost_estimate).toMatchObject({ region: 'global', monthly_min_usd: 0, monthly_max_usd: 0 });
    expect(s.rows[0].suggested_configuration.description).toBe('Privado');
    for (const w of s.writes) expect(w.filters).toMatchObject({ user_id: 'owner', project_id: 'project', analysis_id: analysisId });
    await s.run(); expect(s.fetcher).toHaveBeenCalledTimes(1); expect(s.writes).toHaveLength(2);
  });
  it('corrige solo servicios inválidos con instrucciones específicas y el mismo plazo de ejecución', async () => {
    const s = setup();
    s.fetcher.mockResolvedValueOnce(response([regional, { ...global, estimate: { ...global.estimate, region: 'Worldwide', assumptions: [] } }]))
      .mockResolvedValueOnce(response([global]));
    await s.run(); expect(s.writes).toHaveLength(2);
    const second = JSON.parse(s.fetcher.mock.calls[1][1].body);
    const input = JSON.parse(second.contents[0].parts[0].text);
    expect(input.services.map((r: any) => r.id)).toEqual(['global']);
    expect(input.corrections[0].error).toContain('region'); expect(input.corrections[0].error).toContain('assumptions');
    expect(s.fetcher.mock.calls[0][1].signal).toBe(s.fetcher.mock.calls[1][1].signal);
  });
  it('limita la corrección a un intento y no guarda costos inválidos ni ceros inventados', async () => {
    const s = setup(); s.fetcher.mockImplementation(() => Promise.resolve(response([regional, { ...global, estimate: { ...estimate, monthly_max_usd: -1 } }])));
    s.fetcher.mockResolvedValueOnce(response([regional, { ...global, estimate: { ...estimate, monthly_max_usd: -1 } }]))
      .mockResolvedValueOnce(response([{ ...global, estimate: { ...estimate, monthly_max_usd: -1 } }]));
    await expect(s.run()).rejects.toThrow('monthly_max_usd'); expect(s.fetcher).toHaveBeenCalledTimes(2); expect(s.writes).toHaveLength(0);
  });
  it('repara una estimación antigua corrupta en lugar de omitirla por contener cost_estimate', async () => {
    const s = setup({ kind: 'ai_estimate' }); s.fetcher.mockResolvedValueOnce(response([regional, global]));
    await s.run(); expect(s.rows[0].suggested_configuration.cost_estimate.monthly_min_usd).toBe(2);
  });
  it('rechaza actualizaciones que no afectaron filas y no anuncia guardado exitoso', async () => {
    const s = setup(); s.db.failSave = true; s.fetcher.mockResolvedValueOnce(response([regional, global]));
    await expect(s.run()).rejects.toThrow('No se pudieron guardar');
  });
  it('conserva la validación de importes, supuestos y regiones aunque acepte global', () => {
    expect(validateEstimate({ ...estimate, region: ' US-EAST-1 ' }).region).toBe('us-east-1');
    for (const patch of [{ region: '' }, { region: 'Worldwide' }, { monthly_min_usd: null }, { monthly_max_usd: '8' }, { monthly_max_usd: 1 }, { assumptions: [] }, { basis: '' }])
      expect(() => validateEstimate({ ...estimate, ...patch })).toThrow();
  });
});
