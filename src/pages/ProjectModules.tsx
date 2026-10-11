import { Link } from 'react-router-dom';
import { Cloud, Database, FileText, Globe, Network } from 'lucide-react';
import { useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { ConnectedAnalysisResults } from '../components/analysis/ConnectedAnalysisResults';
import { analysisLabels } from '../lib/analysisPresentation';
import type { Recommendation } from '../lib/projectAnalysis';

export type ProjectModule = 'dashboard' | 'planning' | 'security' | 'services' | 'costs' | 'infrastructure' | 'network';
export function ProjectModulePage({ module }: { module: ProjectModule }) {
  const { project, run, detail, loading, error, refresh } = useProjectWorkspace();
  if (loading) return <p role="status" className="panel">Cargando el proyecto y su análisis guardado…</p>;
  if (error) return <div role="alert" className="error-box">No se pudieron cargar los datos: {error} <button className="underline" onClick={refresh}>Reintentar</button></div>;
  if (!project || !run || !detail) return <section className="panel py-12 text-center"><FileText className="mx-auto text-blue-500 mb-4" size={32} />
    <h2 className="text-xl font-bold">{project ? 'Este proyecto aún no tiene un análisis completado' : 'Selecciona o crea tu proyecto'}</h2>
    <p className="text-sm text-slate-500 mt-3">Los módulos se completarán con los datos de tus fuentes cuando el análisis termine correctamente.</p>
    <Link to="/projects" className="primary-button mt-5 inline-flex">Ir a fuentes y análisis</Link>
  </section>;
  const tabs = { dashboard: 'overview', planning: 'plan', security: 'security', services: 'aws' } as const;
  if (module in tabs) return <ConnectedAnalysisResults key={run.id + module} projectId={project.id} projectName={project.name} run={run} data={detail} initialTab={tabs[module as keyof typeof tabs]} />;
  const context = run.input_context ?? project;
  if (module === 'costs') {
    const priced = detail.recommendations.filter(hasQuote);
    const complete = detail.recommendations.length > 0 && priced.length === detail.recommendations.length;
    const minimum = priced.reduce((sum, r) => sum + Number(r.estimated_monthly_min_usd), 0);
    const maximum = priced.reduce((sum, r) => sum + Number(r.estimated_monthly_max_usd), 0);
    return <div className="space-y-5"><Heading title="Costos del proyecto" description={`Servicios y presupuesto del análisis de ${project.name}.`} />
      <div className="grid sm:grid-cols-3 gap-4">
        <Value label="Presupuesto definido" value={context.monthly_budget_usd == null ? 'Por definir' : money(context.monthly_budget_usd) + '/mes'} />
        <Value label="Estimación mensual completa" value={complete ? `${money(minimum)} – ${money(maximum)}` : 'Pendiente de cotizar'} />
        <Value label="Servicios con cotización registrada" value={`${priced.length} de ${detail.recommendations.length}`} />
      </div>
      <div className="panel overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left font-semibold mb-4">Servicios recomendados para este proyecto</caption><thead><tr className="text-xs text-slate-500"><th className="p-3">Servicio</th><th className="p-3">Costo mensual estimado</th><th className="p-3">Referencia</th></tr></thead><tbody>{detail.recommendations.map(r => <tr key={r.id} className="border-t dark:border-slate-700"><td className="p-3 font-medium">{r.service_name}</td><td className="p-3">{hasQuote(r) ? `${money(r.estimated_monthly_min_usd!)} – ${money(r.estimated_monthly_max_usd!)}` : 'Pendiente de cotizar'}</td><td className="p-3">{hasQuote(r) ? <a className="text-blue-600 underline" href={r.pricing_reference_url!} target="_blank" rel="noreferrer">{r.region} · {new Date(r.pricing_checked_at!).toLocaleDateString('es-PE')}</a> : 'Sin precio verificado'}</td></tr>)}</tbody></table>
        {!detail.recommendations.length && <p className="text-sm text-slate-500">El análisis no propuso servicios.</p>}
      </div>
      <section className="panel"><h3 className="font-bold">Datos para cotizar</h3><p className="mt-2 text-sm">Región: {context.preferred_region ?? 'Por definir'} · Usuarios previstos: {context.expected_users ?? 'Por definir'} · Disponibilidad objetivo: {context.availability_target == null ? 'Por definir' : context.availability_target + '%'}</p><p className="mt-3 text-sm text-slate-500">Completa uso, almacenamiento y transferencia de cada servicio. No hay conexión a facturación AWS ni costos medidos.</p><a className="primary-button mt-4 inline-flex" href="https://calculator.aws/" target="_blank" rel="noreferrer">Abrir AWS Pricing Calculator</a></section>
    </div>;
  }
  const network = module === 'network';
  const networkRequirementIds = new Set(detail.requirements.filter(r => r.category === 'network').map(r => r.id));
  // Classify only services actually recommended by this analysis; never add catalog defaults.
  const networkServices = detail.recommendations.filter(r => /vpc|cloudfront|route\s*53|api\s*gateway|apigateway|load\s*balanc|\b(?:alb|nlb|elb)\b|direct\s*connect|transit\s*gateway|global\s*accelerator/i.test((r.service_code ?? '') + ' ' + r.service_name)
    || r.cloudops_recommendation_requirements.some(link => networkRequirementIds.has(link.requirement_id)));
  networkServices.forEach(r => r.cloudops_recommendation_requirements.forEach(link => networkRequirementIds.add(link.requirement_id)));
  const requirements = detail.requirements.filter(r => network ? networkRequirementIds.has(r.id) : ['compute','storage','database','availability','performance'].includes(r.category ?? ''));
  const services = network ? networkServices : detail.recommendations;
  return <div className="space-y-5"><Heading title={network ? 'Arquitectura de red del proyecto' : 'Infraestructura propuesta'} description={`Propuesta derivada del análisis guardado de ${project.name}.`} />
    <div className="grid sm:grid-cols-3 gap-4"><Value label="Región preferida" value={context.preferred_region ?? 'Por definir'} /><Value label="Disponibilidad objetivo" value={context.availability_target == null ? 'Por definir' : context.availability_target + '%'} /><Value label="Inventario AWS desplegado" value="Sin conexión AWS" /></div>
    <section className="panel"><h3 className="font-bold flex gap-2 items-center">{network ? <Network size={19} /> : <Globe size={19} />} {network ? 'Requisitos de red identificados' : 'Requisitos de infraestructura'}</h3>
      {requirements.length ? <div className="grid md:grid-cols-2 gap-4 mt-4">{requirements.map(r => <article key={r.id} className="rounded-xl border dark:border-slate-700 p-4"><span className="text-xs text-blue-600">{analysisLabels[r.priority]} · {r.origin === 'inferred' ? 'Inferido: confirmar' : 'Explícito'}</span><h4 className="font-semibold mt-2">{r.title}</h4><p className="text-sm text-slate-500 mt-2">{r.description}</p><details className="mt-3 text-xs"><summary className="cursor-pointer">Evidencia</summary><blockquote className="mt-2 whitespace-pre-wrap">{r.evidence_excerpt}</blockquote><p className="mt-2 text-slate-500">{r.evidence_location}</p></details></article>)}</div> : <p className="mt-3 text-sm text-slate-500">El análisis no identificó requisitos específicos de {network ? 'red' : 'infraestructura'}. Agrega esa información a las fuentes y vuelve a analizar.</p>}
    </section>
    <section className="panel"><h3 className="font-bold flex items-center gap-2"><Cloud size={19} /> {network ? 'Servicios vinculados a los requisitos de red' : 'Orden de preparación recomendado'}</h3>
      <div className="mt-4 space-y-3">{[...services].sort((a, b) => a.deployment_order - b.deployment_order).map(r => <article key={r.id} className="rounded-xl border dark:border-slate-700 p-4"><div className="flex gap-3"><Database size={20} className="text-blue-500 shrink-0" /><div><h4 className="font-bold">{r.service_name}</h4><p className="mt-1 text-sm text-slate-500">{r.suggested_configuration.description ?? r.purpose}</p><p className="mt-2 text-xs">{r.rationale}</p><ul className="list-disc pl-4 mt-2 text-xs text-slate-500">{r.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></div></div></article>)}</div>
      {!services.length && <p className="mt-3 text-sm text-slate-500">No hay servicios asociados en este análisis.</p>}
    </section>
    <p className="text-xs text-slate-500">{network ? 'El análisis no define todavía subredes, CIDR ni conexiones verificadas. La topología queda pendiente de diseño.' : 'Las regiones y servicios corresponden a una propuesta. No se han medido latencias ni comprobado despliegues.'}</p>
  </div>;
}
function hasQuote(r: Recommendation) { return r.estimated_monthly_min_usd !== null && r.estimated_monthly_max_usd !== null && Boolean(r.region && r.pricing_checked_at && r.pricing_reference_url?.startsWith('https://')); }
const money = (value: number) => Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'USD' });
function Heading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></div>; }
function Value({ label, value }: { label: string; value: string | number }) { return <div className="panel"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{value}</p></div>; }
