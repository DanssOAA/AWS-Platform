import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Cloud, Loader2, ShieldCheck, Network, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { configurationError, errorMessage } from '../lib/supabase';

export function Login() {
  const { session, loading, error: sessionError, requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [requestedEmail, setRequestedEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<'request' | 'verify' | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  const normalizedEmail = email.trim().toLowerCase();
  const targetEmail = step === 'code' ? requestedEmail : normalizedEmail;
  const deadline = cooldowns[targetEmail] ?? 0;
  const remainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const busy = pending !== null;
  useEffect(() => {
    setNow(Date.now());
    if (deadline <= Date.now()) return;
    const timer = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= deadline) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (loading) return <div role="status" className="min-h-screen grid place-items-center">Restaurando sesión…</div>;
  if (session) return <Navigate to="/dashboard" replace />;

  async function sendCode() {
    if (inFlight.current || (cooldowns[targetEmail] ?? 0) > Date.now()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) { setError('Introduce un correo electrónico válido.'); return; }
    inFlight.current = true; setPending('request'); setError(''); setMessage('');
    try {
      await requestOtp(targetEmail);
      setRequestedEmail(targetEmail); setStep('code'); setCode('');
      setMessage('Código enviado. Revisa tu correo o spam.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally {
      const timestamp = Date.now();
      setCooldowns(previous => ({ ...previous, [targetEmail]: timestamp + 60000 }));
      setNow(timestamp); inFlight.current = false; setPending(null);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 'email') { await sendCode(); return; }
    if (inFlight.current) return;
    inFlight.current = true; setPending('verify'); setError(''); setMessage('');
    try { await verifyOtp(requestedEmail, code); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { inFlight.current = false; setPending(null); }
  }
  function changeEmail() {
    setStep('email'); setRequestedEmail(''); setCode(''); setError(''); setMessage('');
  }
  return <main className="min-h-screen bg-slate-50 grid lg:grid-cols-2 text-slate-800">
    <section className="bg-slate-900 text-white p-8 sm:p-12 lg:p-20 flex flex-col justify-between gap-12">
      <div className="flex items-center gap-3"><Cloud className="h-10 w-10 text-blue-400" /><span className="text-2xl font-bold">CloudOps</span></div>
      <div className="max-w-lg"><p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-5">Gestión de arquitectura AWS</p>
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Tu arquitectura, costos y seguridad.</h1>
        <p className="text-slate-400 mt-6 leading-relaxed">Organiza propuestas y revisa los servicios de tu arquitectura AWS.</p>
        <div className="flex flex-wrap gap-5 mt-8 text-sm text-slate-300"><span className="flex gap-2"><Network size={18} /> Arquitectura</span><span className="flex gap-2"><BarChart3 size={18} /> Costos</span><span className="flex gap-2"><ShieldCheck size={18} /> Seguridad</span></div>
      </div><p className="text-xs text-slate-500">CloudOps · Arquitectura AWS</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-12"><div className="w-full max-w-md">
      <p className="text-sm text-blue-600 font-semibold mb-2">ACCESO A CLOUDOPS</p><h2 className="text-3xl font-bold">Inicia sesión</h2>
      <p className="text-sm text-slate-500 mt-3 mb-8">{step === 'email' ? 'Recibe un código en tu correo.' : 'Ingresa el código que recibiste.'}</p>
      <p className="text-xs font-semibold text-blue-600 mb-4">Paso {step === 'email' ? '1 de 2 · Correo' : '2 de 2 · Verificación'}</p>
      <form onSubmit={submit} className="space-y-5">
        <div><label htmlFor="email" className="field-label">Correo electrónico</label><input id="email" type="email" autoComplete="username" required readOnly={step === 'code'} disabled={busy} value={step === 'code' ? requestedEmail : email} onChange={e => setEmail(e.target.value)} className="field" placeholder="nombre@organizacion.com" /></div>
        {step === 'code' && <div><label htmlFor="code" className="field-label">Código de acceso de 6 dígitos</label><input id="code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} className="field" placeholder="Ingresa los 6 dígitos" autoFocus /></div>}
        {(error || configurationError || sessionError) && <p role="alert" className="error-box">{error || configurationError || sessionError}</p>}
        {message && <p role="status" className="text-sm text-blue-700 bg-blue-50 rounded-xl p-3">{message}</p>}
        <button disabled={busy || !!configurationError || (step === 'email' && remainingSeconds > 0)} className="primary-button w-full justify-center">{busy && <Loader2 size={18} className="animate-spin" />} {pending === 'verify' ? 'Verificando…' : pending === 'request' ? 'Solicitando código…' : step === 'email' ? 'Enviar código' : 'Ingresar a CloudOps'}</button>
        {step === 'code' && <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="button" onClick={() => void sendCode()} disabled={busy || remainingSeconds > 0 || !!configurationError} className="text-blue-600 font-semibold py-2">Reenviar código</button><button type="button" onClick={changeEmail} disabled={busy} className="text-slate-600 font-semibold py-2">Cambiar correo</button></div>}
        {remainingSeconds > 0 && <p className="text-xs text-slate-500">Podrás solicitar otro código en {remainingSeconds} s.</p>}
      </form><p className="text-sm text-slate-500 mt-6">¿No tienes acceso? <Link to="/request-access" className="text-blue-600 font-semibold hover:underline">Solicitar acceso</Link></p>
      <p className="text-xs text-slate-500 mt-8 border-t pt-5">Si necesitas ayuda para ingresar, contacta al administrador.</p>
    </div></section>
  </main>;
}
