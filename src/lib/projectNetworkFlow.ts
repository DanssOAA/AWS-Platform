import type { ProjectFlow } from '../../supabase/functions/cloudops-analyze-project/flowTypes';
import { createNode, parseDesign, type NetworkDesign } from './networkDesign';

/** Layout and labels come from this analysis; only the entry is a synthetic actor. */
export function designFromFlow(seed: NetworkDesign, flow: ProjectFlow): NetworkDesign {
  const stages = ['entry','delivery','identity','processing','data','operations'];
  const source = new Map(seed.nodes.map(n => [n.id,n]));
  const nodes = [...flow.nodes].sort((a,b) => stages.indexOf(a.stage) - stages.indexOf(b.stage)).map((n,i) => {
    const original = n.id === 'entry' ? { ...createNode('internet',0,0), id:'entry', name:'Usuarios / sistema de origen' } : source.get(n.id);
    if (!original) throw new Error('El flujo contiene un servicio que no pertenece a este análisis.');
    return { ...original, x:60 + i % 4 * 400, y:60 + Math.floor(i/4) * 240, width:240, height:96, detail:n.description };
  });
  if (source.size + 1 !== nodes.length || !nodes.some(n=>n.id==='entry') || [...source.keys()].some(id=>!nodes.some(n=>n.id===id))) throw new Error('El flujo no incluye todos los servicios de este análisis.');
  return parseDesign(JSON.stringify({ version:1, nodes, edges:flow.edges.map((e,i)=>({id:`flow-${i}`,source:e.source,target:e.target,label:e.label,kind:e.kind,explanation:e.explanation,assumed:e.assumed})), flow:{summary:flow.summary,assumptions:flow.assumptions} }));
}
