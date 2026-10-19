import { userMessage } from '../lib/uiMessages';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';
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
  return <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-800">
    <img src="https://images.unsplash.com/photo-1677078610072-7f11ebc4d4d7?auto=format&fit=crop&q=85&w=2200" alt="Equipo profesional reunido en una oficina moderna" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-slate-950/70" />
    <section className="relative z-10 flex min-h-screen items-center justify-center p-5 sm:p-8"><div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/95 p-7 shadow-2xl backdrop-blur sm:p-9">
      <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3 text-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white"><Building2 size={21} /></span><span className="text-lg font-bold tracking-tight">CloudOps</span></div><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ERP empresarial</span></div>
      <div className="border-l-4 border-blue-700 pl-4"><p className="text-xs font-semibold tracking-widest text-blue-700">ACCESO SEGURO</p><h2 className="mt-1 text-3xl font-bold text-slate-900">Iniciar sesión</h2>
      <p className="text-sm text-slate-600 mt-3 mb-7">{step === 'email' ? 'Ingresa tu correo corporativo para continuar.' : 'Ingresa el código enviado a tu correo.'}</p></div>
      <p className="text-xs font-semibold text-blue-700 mb-4">Paso {step === 'email' ? '1 de 2 · Correo' : '2 de 2 · Verificación'}</p>
      <form onSubmit={submit} className="space-y-5">
        <div><label htmlFor="email" className="field-label">Correo electrónico</label><input id="email" type="email" autoComplete="username" required readOnly={step === 'code'} disabled={busy} value={step === 'code' ? requestedEmail : email} onChange={e => setEmail(e.target.value)} className="field" placeholder="nombre@organizacion.com" /></div>
        {step === 'code' && <div><label htmlFor="code" className="field-label">Código de acceso de 6 dígitos</label><input id="code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} className="field" placeholder="Ingresa los 6 dígitos" autoFocus /></div>}
        {(error || configurationError || sessionError) && <p role="alert" className="error-box">{userMessage(error || configurationError || sessionError || '', 'login')}</p>}
        {message && <p role="status" className="text-sm text-blue-700 bg-blue-50 rounded-xl p-3">{message}</p>}
        <button disabled={busy || !!configurationError || (step === 'email' && remainingSeconds > 0)} className="primary-button w-full justify-center">{busy && <Loader2 size={18} className="animate-spin" />} {pending === 'verify' ? 'Verificando…' : pending === 'request' ? 'Solicitando código…' : step === 'email' ? 'Enviar código' : 'Ingresar a CloudOps'}</button>
        {step === 'code' && <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="button" onClick={() => void sendCode()} disabled={busy || remainingSeconds > 0 || !!configurationError} className="text-blue-600 font-semibold py-2">Reenviar código</button><button type="button" onClick={changeEmail} disabled={busy} className="text-slate-600 font-semibold py-2">Cambiar correo</button></div>}
        {remainingSeconds > 0 && <p className="text-xs text-slate-500">Podrás solicitar otro código en {remainingSeconds} s.</p>}
      </form><p className="text-sm text-slate-500 mt-6">¿No tienes acceso? <Link to="/request-access" className="text-blue-700 font-semibold hover:underline">Solicitar acceso</Link></p>
      <p className="mt-7 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500"><ShieldCheck size={15} className="text-blue-700" /> Acceso protegido para organizaciones autorizadas.</p>
    </div></section>
  </main>;
}
