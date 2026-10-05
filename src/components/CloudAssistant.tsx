import { useState } from 'react';
import { MessageSquare, X, Loader2, Send } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useApp } from '../context/AppContext';
import { errorMessage, requireSupabase } from '../lib/supabase';
type Analysis = { summary: string; recommendations: string[]; score: number; riskLevel: string; explanation: string };
const actions = [
  { focus: 'architecture', label: 'Analizar arquitectura', question: 'Analiza la arquitectura actual y recomienda mejoras.' },
  { focus: 'security', label: 'Revisar seguridad', question: 'Revisa los controles de seguridad configurados.' },
  { focus: 'costs', label: 'Explicar costos', question: 'Explica la distribución de costos de la arquitectura.' },
  { focus: 'services', label: 'Consultar servicios', question: 'Explica la función de los servicios AWS incluidos.' },
];
export function CloudAssistant() {
  const { selectedRegion, activeProposal, architectureServices, costEstimates, security, securityChecks } = useApp();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [focus, setFocus] = useState('architecture');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  async function ask(text: string, selectedFocus = focus) {
    if (!text.trim() || busy) return;
    setBusy(true); setError(''); setResult(null); setQuestion(text); setFocus(selectedFocus);
    try {
      const context = {
        region: selectedRegion,
        proposal: activeProposal ? { solutionName: activeProposal.solutionName, applicationType: activeProposal.appType, description: activeProposal.description, estimatedUsers: activeProposal.estimatedUsers, availability: activeProposal.availabilityLevel, migrationObjective: activeProposal.migrationGoal } : null,
        services: architectureServices,
        costs: { monthly: costEstimates.reduce((total, c) => total + c.monthlyCost, 0), detail: costEstimates },
        security: securityChecks.map(c => ({ title: c.title, status: c.status, description: c.description })),
        network: { vpc: architectureServices.includes('vpc'), privateDatabase: security.privateDatabase, subnets: ['Public Subnet', 'Private App Subnet', 'Private DB Subnet'] },
      };
      const { data, error } = await requireSupabase().functions.invoke('cloud-assistant', { body: { question: text.trim(), focus: selectedFocus, context }, timeout: 60000 });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const payload = await error.context.json().catch(() => null);
          throw new Error(payload?.error || payload?.message || error.message);
        }
        throw error;
      }
      if (data?.success === false) throw new Error(data.error || 'El asistente no pudo procesar la consulta.');
      const next = data?.result;
      if (!next || typeof next.summary !== 'string' || typeof next.explanation !== 'string' || !Array.isArray(next.recommendations) || !next.recommendations.every((r: unknown) => typeof r === 'string') || !Number.isFinite(next.score) || next.score < 0 || next.score > 100 || !['bajo', 'medio', 'alto'].includes(next.riskLevel)) throw new Error('No se pudo leer el análisis. Vuelve a intentarlo.');
      setResult(next);
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <div className="fixed bottom-5 right-4 sm:right-6 z-40">
    {open && <section aria-label="Asistente CloudOps" className="mb-3 w-[min(440px,calc(100vw-2rem))] max-h-[75dvh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
      <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-800 flex justify-between items-center"><div><h2 className="font-bold">Asistente CloudOps</h2><p className="text-xs text-slate-500">Consultas sobre tu arquitectura</p></div><button aria-label="Cerrar asistente" onClick={() => setOpen(false)} className="p-2"><X size={18} /></button></div>
      <div className="p-4 space-y-4"><div className="grid grid-cols-2 gap-2">{actions.map(action => <button key={action.focus} disabled={busy} onClick={() => void ask(action.question, action.focus)} className="p-2 text-xs text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800">{action.label}</button>)}</div>
        <form onSubmit={e => { e.preventDefault(); void ask(question); }} className="space-y-2"><label htmlFor="assistant-question" className="text-sm font-medium">Tu consulta</label><textarea id="assistant-question" className="field" rows={3} maxLength={2000} required value={question} onChange={e => setQuestion(e.target.value)} placeholder="¿Qué función cumple Route 53?" /><button className="primary-button w-full justify-center" disabled={busy || !question.trim()}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}{busy ? 'Analizando…' : 'Consultar'}</button></form>
        {error && <p role="alert" className="error-box">{error}</p>}
        {result && <div aria-live="polite" className="space-y-4 text-sm"><div><h3 className="font-bold mb-1">Análisis</h3><p className="whitespace-pre-wrap">{result.summary}</p></div><div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"><span>Puntuación: <strong>{result.score}/100</strong></span><span>Riesgo: <strong>{result.riskLevel}</strong></span></div><div><h3 className="font-bold mb-1">Recomendaciones</h3><ul className="list-disc pl-5 space-y-1">{result.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ul></div><div><h3 className="font-bold mb-1">Explicación técnica</h3><p className="whitespace-pre-wrap">{result.explanation}</p></div></div>}
      </div></section>}
    <button aria-expanded={open} onClick={() => setOpen(prev => !prev)} className="primary-button shadow-lg"><MessageSquare size={18} /><span>Asistente CloudOps</span></button>
  </div>;
}
