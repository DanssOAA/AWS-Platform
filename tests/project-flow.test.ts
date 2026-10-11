// @vitest-environment node
import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { generateSavedFlow, validateFlow } from '../supabase/functions/cloudops-analyze-project/flow';
import { designFromFlow } from '../src/lib/projectNetworkFlow';
import { createNode, parseDesign } from '../src/lib/networkDesign';
const id='33333333-3333-4333-8333-333333333333';
const serviceIds = ['cdn','frontend','auth','api','compute','database','storage','iam','logs'];
function flow() { return {summary:'Flujo de aplicación con servicios de apoyo',assumptions:['Conexiones propuestas para los requisitos guardados'],nodes:[{id:'entry',stage:'entry',description:'Usuario del proyecto'},...serviceIds.map(id=>({id,stage:'processing',description:'Función específica de '+id}))],edges:serviceIds.map((target,i)=>({source:i===0?'entry':serviceIds[i-1],target,label:'Relación '+i,kind:'request',explanation:'Implementa el requisito funcional',requirement_ids:['r1'],assumed:true}))}; }
function providerFlow() {
  const raw=flow(); const ref=(id:string)=>id==='entry'?id:`S${serviceIds.indexOf(id)+1}`;
  return {...raw,nodes:raw.nodes.map(n=>({...n,id:ref(n.id)})),edges:raw.edges.map(e=>({...e,source:ref(e.source),target:ref(e.target),requirement_ids:['R1']}))};
}
const providerResponse=(raw:unknown)=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(raw)}]}}]}));
beforeEach(()=>vi.spyOn(console,'warn').mockImplementation(()=>{}));afterEach(()=>vi.restoreAllMocks());
function setup() {
  let saved:any=null; const writes:any[]=[];const filters:any[]=[];
  const db:any={from:(table:string)=>{let patch:any;const q:any={select:()=>q,eq:(k:string,v:unknown)=>{filters.push([table,k,v]);return q;},update:(v:any)=>{patch=v;return q;},single:async()=>{
    if(patch){writes.push(patch);if(db.fail)return {data:null,error:{message:'failure'}};saved=patch.architecture_flow;return {data:{id},error:null};}
    return db.foreign?{data:null,error:{}}:{data:{id,architecture_flow:saved,input_context:{name:'ERP'}},error:null};
  },then:(ok:any,no:any)=>Promise.resolve({data:table==='cloudops_aws_recommendations'?serviceIds.map(id=>({id,service_name:id,suggested_configuration:{description:'Config'}})):table==='cloudops_recommendation_requirements'?serviceIds.map(id=>({recommendation_id:id,requirement_id:'r1'})):[{id:'r1',title:'Requisito'}],error:null}).then(ok,no)};return q;}};
  const fetcher=vi.fn().mockImplementation(async()=>providerResponse(providerFlow()));
  return {db,fetcher,writes,filters,run:()=>generateSavedFlow(db,'owner','project',id,'key','gemini-2.5-flash',fetcher)};
}
describe('flujo del proyecto',()=>{
  it('incluye todos los servicios y entrada, permite exportar/importar y coloca cada nodo dentro del lienzo',()=>{
    const result=validateFlow(flow(),serviceIds,['r1']);
    const seed={version:1 as const,nodes:serviceIds.map(id=>({...createNode('service',0,0),id,name:id})),edges:[]};
    const design=designFromFlow(seed,result);expect(design.nodes).toHaveLength(10);expect(design.edges).toHaveLength(9);expect(parseDesign(JSON.stringify(design))).toEqual(design);
  });
  it('rechaza servicios inventados, omitidos y aislados y requisitos que no pertenecen al análisis',()=>{
    const variants=[flow(),flow(),flow(),flow()];
    variants[0].nodes[1].id='otro-proyecto';variants[1].nodes.pop();variants[2].edges.pop();variants[3].edges[0].requirement_ids=['inventado'];
    for(const raw of variants)expect(()=>validateFlow(raw,serviceIds,['r1'])).toThrow();
  });
  it('admite relaciones de apoyo con dirección distinta al recorrido del tráfico',()=>{
    const raw=flow();raw.edges[7]={...raw.edges[7],source:'iam',target:'compute',kind:'permission'};
    raw.edges[8]={...raw.edges[8],source:'compute',target:'logs',kind:'observability'};
    expect(validateFlow(raw,serviceIds,['r1']).edges[7].kind).toBe('permission');
  });
  it('guarda y reutiliza el flujo por propietario/proyecto/análisis sin volver a consultar Gemini',async()=>{
    const s=setup();const result=await s.run();expect(s.writes[0].architecture_flow).toEqual(result);expect(await s.run()).toEqual(result);expect(s.fetcher).toHaveBeenCalledTimes(1);
    for(const key of ['user_id','project_id','id','status'])expect(s.filters.some((f:any)=>f[0]==='cloudops_project_analyses'&&f[1]===key)).toBe(true);
  });
  it('rechaza análisis ajenos y no llama al proveedor',async()=>{
    const s=setup();s.db.foreign=true;await expect(s.run()).rejects.toThrow('no disponible');expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('no presenta éxito si Supabase no guardó el flujo',async()=>{
    const s=setup();s.db.fail=true;await expect(s.run()).rejects.toThrow('No se pudo guardar');expect(s.fetcher).toHaveBeenCalledTimes(1);
  });
  it('corrige una salida incompleta solo una vez, con el mismo plazo',async()=>{
    const s=setup();s.fetcher.mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]})));
    await s.run();expect(s.fetcher).toHaveBeenCalledTimes(2);expect(s.fetcher.mock.calls[0][1].signal).toBe(s.fetcher.mock.calls[1][1].signal);
  });
  it('restringe el esquema a referencias cortas, incluye vínculos reales y persiste únicamente IDs originales',async()=>{
    const s=setup(); const saved=await s.run();
    const body=JSON.parse(s.fetcher.mock.calls[0][1].body);const input=JSON.parse(body.contents[0].parts[0].text);
    expect(input.services[0]).toMatchObject({id:'S1',requirement_ids:['R1']});
    const properties=body.generationConfig.responseSchema.properties;
    expect(properties.edges.items.properties.source.enum).toEqual(['entry',...serviceIds.map((_,i)=>`S${i+1}`)]);
    expect(properties.edges.items.properties.requirement_ids.items.enum).toEqual(['R1']);
    expect(saved.nodes.map(n=>n.id)).toEqual(['entry',...serviceIds]);expect(saved.edges[0].requirement_ids).toEqual(['r1']);
  });
  it('permite operaciones distintas entre los mismos servicios y conserva ambas en el lienzo exportado',()=>{
    const raw=flow();raw.edges.push({...raw.edges[0],kind:'authentication',label:'Autenticación'});
    const validated=validateFlow(raw,serviceIds,['r1']);
    const seed={version:1 as const,nodes:serviceIds.map(id=>({...createNode('service',0,0),id,name:id})),edges:[]};
    const design=designFromFlow(seed,validated);expect(parseDesign(JSON.stringify(design)).edges).toHaveLength(10);
    raw.edges.push({...raw.edges[0]});expect(()=>validateFlow(raw,serviceIds,['r1'])).toThrow('relación duplicada');
  });
  it('corrige requisitos vacíos con el índice exacto y la respuesta anterior, sin asignar requisitos arbitrarios',async()=>{
    const s=setup();const raw=providerFlow();raw.edges[2].requirement_ids=[];
    s.fetcher.mockResolvedValueOnce(providerResponse(raw));await s.run();
    const retry=JSON.parse(JSON.parse(s.fetcher.mock.calls[1][1].body).contents[0].parts[0].text);
    expect(retry.correction).toContain('edges[2]');expect(retry.correction).toContain('requirement_ids');expect(retry.previous_response.edges[2].requirement_ids).toEqual([]);
    expect(s.writes).toHaveLength(1);
  });
  it('distingue los requisitos inventados de servicios desconocidos y no los persiste tras dos intentos inválidos',async()=>{
    const s=setup();const raw=providerFlow();raw.edges[0].requirement_ids=['R999'];s.fetcher.mockImplementation(async()=>providerResponse(raw));
    await expect(s.run()).rejects.toThrow('no pertenece al catálogo de requisitos');expect(s.fetcher).toHaveBeenCalledTimes(2);expect(s.writes).toHaveLength(0);
    const invalid=flow();invalid.edges[0].target='foreign';expect(()=>validateFlow(invalid,serviceIds,['r1'])).toThrow('target debe ser');
  });
});
