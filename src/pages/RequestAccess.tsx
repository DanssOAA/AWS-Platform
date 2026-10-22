import { userMessage } from '../lib/uiMessages';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, ShieldCheck } from 'lucide-react';
import { invokeAccessFunction } from '../lib/accessRequests';
import { configurationError, errorMessage } from '../lib/supabase';

export function RequestAccess() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError('');
    try {
      await invokeAccessFunction('cloudops-request-access', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { inFlight.current = false; setPending(false); }
  }

  return <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-800">
    <img src="https://images.unsplash.com/photo-1677078610072-7f11ebc4d4d7?auto=format&fit=crop&q=85&w=2200" alt="Equipo profesional reunido en una oficina moderna" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-slate-950/70" />
    <section className="relative z-10 flex min-h-screen items-center justify-center p-5 sm:p-8"><div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/95 p-7 shadow-2xl backdrop-blur sm:p-9">
      <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3 text-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white"><Building2 size={21} /></span><span className="text-lg font-bold tracking-tight">CloudOps</span></div><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ERP empresarial</span></div>
      <div className="border-l-4 border-blue-700 pl-4"><p className="text-xs font-semibold tracking-widest text-blue-700">SOLICITUD DE ACCESO</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Solicitar acceso</h1>
      <p className="text-sm text-slate-600 mt-3 mb-7">Registra tu correo corporativo. Un administrador revisará tu solicitud.</p></div>
      {sent ? <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">Solicitud enviada correctamente. Un administrador debe aprobar tu acceso.</p>
        : <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="access-email" className="field-label">Correo electrónico</label>
            <input id="access-email" type="email" autoComplete="email" maxLength={254} required disabled={pending} value={email} onChange={event => setEmail(event.target.value)} className="field" placeholder="nombre@organizacion.com" /></div>
          {(error || configurationError) && <p role="alert" className="error-box">{userMessage(error || configurationError || '', 'requestAccess')}</p>}
          <button disabled={pending || !!configurationError} className="primary-button w-full justify-center">{pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}{pending ? 'Enviando solicitud…' : 'Enviar solicitud'}</button>
        </form>}
      <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft size={16} /> Volver a iniciar sesión</Link>
      <p className="mt-7 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500"><ShieldCheck size={15} className="text-blue-700" /> Las solicitudes son revisadas por tu organización.</p>
    </div></section>
  </main>;
}
