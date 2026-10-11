// @vitest-environment node
import { describe,it,expect,vi } from 'vitest';
import { fetchGemini } from '../supabase/functions/cloudops-analyze-project/provider';
import { validateEstimate } from '../supabase/functions/cloudops-analyze-project/costs';
import { detail } from './fixtures/analyzed-project';
describe('resiliencia de Gemini y estimaciones',()=>{
  it('recupera 503 con backoff, conserva la solicitud y usa un único plazo',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response('',{status:502})).mockResolvedValueOnce(new Response('{}'));
    const pause=vi.fn().mockResolvedValue(undefined);const result=await fetchGemini('https://test',{method:'POST',body:'original'},fetcher,pause);
    expect(result.ok).toBe(true);expect(pause.mock.calls).toEqual([[750],[1500]]);expect(fetcher.mock.calls[0][1].signal).toBe(fetcher.mock.calls[2][1].signal);expect(fetcher.mock.calls[2][1].body).toBe('original');
  });
  it('limita intentos y no reintenta claves inválidas ni cuotas',async()=>{
    for(const status of [400,401,403,429]){const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response('',{status})));await fetchGemini('url',{},fetcher,async()=>{});expect(fetcher).toHaveBeenCalledTimes(1);}
    const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response('',{status:503})));expect((await fetchGemini('url',{},fetcher,async()=>{})).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('valida costos, región y supuestos sin etiquetar tarifas como verificadas',()=>{
    const input=detail.recommendations[0].suggested_configuration.cost_estimate!;expect(validateEstimate(input)).toMatchObject({kind:'ai_estimate',monthly_min_usd:2,monthly_max_usd:8});
    for(const patch of [{monthly_min_usd:-1},{monthly_max_usd:1},{region:''},{assumptions:[]},{monthly_max_usd:Infinity}]) expect(()=>validateEstimate({...input,...patch})).toThrow();
  });
});
