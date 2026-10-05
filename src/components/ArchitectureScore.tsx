import { useApp } from '../context/AppContext';
import { evaluateArchitecture } from '../lib/architecture';
export function ArchitectureScore() {
  const { activeProposal, architectureServices, costEstimates, iamUsers, security } = useApp();
  const result = evaluateArchitecture(activeProposal, architectureServices, costEstimates, iamUsers, security);
  return <section className="panel space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Evaluación de arquitectura</h2><p className="text-xs text-slate-500 mt-1">Diez criterios de arquitectura, seguridad y costos.</p></div><strong className="text-3xl text-blue-600 shrink-0">{result.score}<span className="text-sm text-slate-500">/100</span></strong></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">{result.groups.map(group => <div key={group.name}><div className="text-sm flex justify-between mb-2"><span>{group.name}</span><strong>{group.score}%</strong></div><div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${group.score}%` }} /></div></div>)}</div>
    <div className="grid md:grid-cols-2 gap-5 text-sm"><div><h3 className="font-semibold text-green-600 mb-2">Fortalezas</h3><ul className="space-y-1 list-disc pl-4">{result.strengths.map(text => <li key={text}>{text}</li>)}</ul>{!result.strengths.length && <p>Configura servicios y controles para comenzar.</p>}</div><div><h3 className="font-semibold text-amber-600 mb-2">Aspectos por revisar</h3><ul className="space-y-1 list-disc pl-4">{result.reviews.map(text => <li key={text}>{text}</li>)}</ul>{!result.reviews.length && <p>Sin aspectos pendientes.</p>}</div></div>
    <p className="text-xs text-slate-500">Cada criterio aporta 10 puntos.</p>
  </section>;
}
