import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Loader2 } from 'lucide-react';
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

  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <Cloud className="h-10 w-10 text-blue-600 mb-6" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Solicitar acceso a CloudOps</h1>
      <p className="text-sm text-slate-500 mt-3 mb-6">Un administrador revisará tu solicitud.</p>
      {sent ? <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">Solicitud enviada correctamente. Un administrador debe aprobar tu acceso.</p>
        : <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="access-email" className="field-label">Correo electrónico</label>
            <input id="access-email" type="email" autoComplete="email" maxLength={254} required disabled={pending} value={email} onChange={event => setEmail(event.target.value)} className="field" placeholder="nombre@organizacion.com" /></div>
          {(error || configurationError) && <p role="alert" className="error-box">{error || configurationError}</p>}
          <button disabled={pending || !!configurationError} className="primary-button w-full justify-center">{pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}{pending ? 'Enviando solicitud…' : 'Enviar solicitud'}</button>
        </form>}
      <Link to="/login" className="inline-block mt-6 text-sm font-semibold text-blue-600 hover:underline">Volver al login</Link>
    </section>
  </main>;
}
