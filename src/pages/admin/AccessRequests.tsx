import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { invokeAccessFunction, listAccessRequests, type AccessRequest, type AccessStatus } from '../../lib/accessRequests';
import { errorMessage } from '../../lib/supabase';

const statuses: { value: AccessStatus; title: string; label: string; color: string }[] = [
  { value: 'pending', title: 'Solicitudes pendientes', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200' },
  { value: 'approved', title: 'Aprobadas', label: 'Aprobado', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' },
  { value: 'rejected', title: 'Rechazadas', label: 'Rechazado', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
];
const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

export function AccessRequests() {
  const [status, setStatus] = useState<AccessStatus>('pending');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setRequests([]);
    listAccessRequests(status, page).then(result => {
      if (!cancelled) { setRequests(result.requests); setCount(result.count); }
    }).catch(failure => { if (!cancelled) setError(errorMessage(failure)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page, revision]);

  async function manage(requestId: string, action: 'approve' | 'reject') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(requestId); setError(''); setMessage('');
    try {
      await invokeAccessFunction('cloudops-manage-access', { requestId, action });
      setMessage(action === 'approve' ? 'Usuario aprobado. Se envió un código de acceso.' : 'Solicitud rechazada.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { inFlight.current = false; setBusy(null); setRevision(value => value + 1); }
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm font-semibold text-blue-600">Administración</p><h1 className="text-2xl font-bold mt-1">Solicitudes de acceso</h1></div>
      <button className="secondary-button" disabled={loading || !!busy} onClick={() => { setError(''); setRevision(value => value + 1); }}><RefreshCw size={16} /> Actualizar</button>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar solicitudes">
      {statuses.map(item => <button key={item.value} aria-pressed={status === item.value} disabled={!!busy} onClick={() => { setStatus(item.value); setPage(0); setError(''); setMessage(''); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === item.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>{item.title}</button>)}
    </div>
    {error && <p role="alert" className="error-box">{error}</p>}
    {message && <p role="status" className="rounded-xl p-4 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {loading ? <p role="status" className="p-8 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Cargando solicitudes…</p>
        : <table className="w-full text-left text-sm"><caption className="sr-only">{statuses.find(item => item.value === status)?.title}</caption>
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300"><tr>{['Correo', 'Fecha de solicitud', 'Estado', 'Acciones'].map(label => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{requests.map(request => {
            const badge = statuses.find(item => item.value === request.status)!;
            return <tr key={request.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="p-4 break-all">{request.email}</td><td className="p-4 whitespace-nowrap">{dateFormat.format(new Date(request.created_at))}</td>
              <td className="p-4"><span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>{badge.label}</span></td>
              <td className="p-4"><div className="flex gap-3 items-center">
                {busy === request.id && <Loader2 aria-label="Procesando solicitud" className="animate-spin" size={16} />}
                {request.status === 'pending' && <><button className="font-semibold text-green-700 dark:text-green-300 disabled:opacity-50" disabled={!!busy} onClick={() => void manage(request.id, 'approve')}>Aprobar</button><button className="font-semibold text-red-700 dark:text-red-300 disabled:opacity-50" disabled={!!busy} onClick={() => void manage(request.id, 'reject')}>Rechazar</button></>}
                {request.status === 'approved' && !request.otp_sent_at && <button className="text-blue-600 font-semibold disabled:opacity-50" disabled={!!busy} onClick={() => void manage(request.id, 'approve')}>Reintentar envío de código</button>}
                {request.status !== 'pending' && (request.status !== 'approved' || request.otp_sent_at) && <span className="text-slate-400">—</span>}
              </div></td>
            </tr>;
          })}{!requests.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">Sin solicitudes en este estado.</td></tr>}</tbody>
        </table>}
    </div>
    <div className="flex justify-between items-center text-sm"><span>{count} solicitudes · Página {page + 1}</span><div className="flex gap-4"><button disabled={loading || !!busy || page === 0} onClick={() => { setError(''); setPage(value => value - 1); }} className="disabled:opacity-40">Anterior</button><button disabled={loading || !!busy || (page + 1) * 25 >= count} onClick={() => { setError(''); setPage(value => value + 1); }} className="disabled:opacity-40">Siguiente</button></div></div>
  </section>;
}
