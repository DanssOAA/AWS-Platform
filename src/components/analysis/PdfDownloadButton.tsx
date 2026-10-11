import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { TechnicalReportInput } from '../../lib/projectPdf';
import { errorMessage } from '../../lib/supabase';

export function PdfDownloadButton({ input, loadInput, disabled, className = 'analysis-download' }: { input: TechnicalReportInput; loadInput?: () => Promise<TechnicalReportInput>; disabled?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const mounted = useRef(true); const currentRun = useRef(input.run.id); currentRun.current = input.run.id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function download() {
    if (lock.current || disabled) return; lock.current = true; setBusy(true); setError('');
    const id = input.run.id;
    try { const data = loadInput ? await loadInput() : input; const { downloadTechnicalPdf } = await import('../../lib/projectPdf'); await downloadTechnicalPdf(data, () => mounted.current && currentRun.current === id); }
    catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <div><button className={className} disabled={disabled || busy || input.run.status !== 'completed'} onClick={() => void download()}>
    {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{busy ? 'Preparando PDF…' : 'Descargar informe técnico PDF'}
  </button>{error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}</div>;
}
