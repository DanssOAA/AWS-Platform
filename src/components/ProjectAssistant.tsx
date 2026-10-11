import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { loadProjectConversations, projectAction, type ProjectConversation } from '../lib/projectAnalysis';
import { errorMessage } from '../lib/supabase';

export function ProjectAssistant() {
  const { project, run, loading, error } = useProjectWorkspace();
  const [open, setOpen] = useState(false);
  return <div className="fixed bottom-5 right-4 sm:right-6 z-40">
    {open && <section aria-label="Asistente del proyecto" className="mb-3 w-[min(440px,calc(100vw-2rem))] max-h-[75dvh] overflow-y-auto rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
      <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center"><div><h2 className="font-bold">Asistente del proyecto</h2><p className="text-xs text-slate-500">{project?.name ?? 'Selecciona un proyecto'}</p></div><button aria-label="Cerrar asistente" onClick={() => setOpen(false)} className="p-2"><X size={18} /></button></div>
      {loading ? <p className="p-4 text-sm" role="status">Cargando contexto…</p> : error ? <p className="p-4 text-sm">No se pudo cargar el proyecto.</p> : project && run ? <ProjectChat key={project.id + run.id} projectId={project.id} analysisId={run.id} /> : <p className="p-4 text-sm">Completa el análisis de este proyecto para consultar sobre sus datos guardados.</p>}
    </section>}
    <button aria-expanded={open} className="primary-button shadow-lg" onClick={() => setOpen(v => !v)}><MessageSquare size={18} /> Asistente</button>
  </div>;
}
function ProjectChat({ projectId, analysisId }: { projectId: string; analysisId: string }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ProjectConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const alive = useRef(true); const lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    loadProjectConversations(projectId, analysisId).then(rows => { if (active) setMessages(rows); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, analysisId, revision]);
  async function ask(text: string) {
    if (lock.current || loading || !text.trim()) return; lock.current = true; setBusy(true); setError('');
    try {
      const result = await projectAction({ action: 'assist', projectId, analysisId, question: text.trim() });
      if (!result.conversation) throw new Error('No se confirmó el guardado de la respuesta.');
      if (alive.current) { setMessages(rows => [result.conversation!, ...rows].slice(0, 10)); setQuestion(''); }
    } catch (e) { if (alive.current) setError(errorMessage(e)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="p-4 space-y-4">
    <p className="text-xs text-slate-500">Consulta el análisis seleccionado. Las respuestas se guardan en Supabase y no cambian los hallazgos.</p>
    <div className="grid grid-cols-2 gap-2">{['¿Qué debo corregir primero?', '¿Por qué necesito estos servicios AWS?', '¿Qué falta para cotizar?', '¿Qué requisitos debo confirmar?'].map(text => <button key={text} disabled={busy || loading} onClick={() => void ask(text)} className="rounded-lg border dark:border-slate-700 p-2 text-xs text-left">{text}</button>)}</div>
    <form onSubmit={e => { e.preventDefault(); void ask(question); }} className="space-y-2"><label className="text-sm">Tu consulta<textarea className="field mt-1" rows={3} maxLength={2000} required value={question} onChange={e => setQuestion(e.target.value)} /></label><button className="primary-button" disabled={busy || loading || !question.trim()}><Send size={15} />{busy ? 'Consultando y guardando…' : 'Consultar'}</button></form>
    {loading && <p role="status" className="text-sm">Cargando consultas guardadas…</p>}
    {error && <p role="alert" className="error-box">{error} <button disabled={busy} className="underline" onClick={() => setRevision(v => v + 1)}>Actualizar historial</button></p>}
    {messages.map(m => <article key={m.id} className="rounded-xl border dark:border-slate-700 p-3 text-sm space-y-3"><h3 className="font-bold">{m.question}</h3><p className="whitespace-pre-wrap">{m.answer.summary}</p><ul className="list-disc pl-4 space-y-1">{m.answer.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul><p className="text-xs text-slate-500 whitespace-pre-wrap">{m.answer.explanation}</p><p className="text-[10px] text-slate-400">Guardado · {new Date(m.created_at).toLocaleString('es-PE')}</p></article>)}
  </div>;
}
