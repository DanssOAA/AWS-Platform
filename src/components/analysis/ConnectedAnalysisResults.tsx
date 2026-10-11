import { useEffect, useRef, useState } from 'react';
import { AnalysisResults, type ReportTab } from './AnalysisReport';
import { loadAnalysisTasks, saveAnalysisTask, type AnalysisDetail, type AnalysisRun } from '../../lib/projectAnalysis';
import { buildActionPlan } from '../../lib/analysisPresentation';
import { errorMessage } from '../../lib/supabase';

export function ConnectedAnalysisResults({ projectId, projectName, run, data, initialTab = 'overview' }: {
  projectId: string; projectName: string; run: AnalysisRun; data: AnalysisDetail; initialTab?: ReportTab;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current; setLoading(true); setError(''); setChecked(new Set());
    loadAnalysisTasks(projectId, run.id).then(ids => {
      if (generation.current !== token) return;
      const valid = new Set(buildActionPlan(data).map(t => t.id)); setChecked(new Set(ids.filter(id => valid.has(id))));
    }).catch(e => { if (generation.current === token) setError(errorMessage(e)); })
      .finally(() => { if (generation.current === token) setLoading(false); });
    return () => { generation.current++; };
  }, [projectId, run.id, data, revision]);
  async function toggle(id: string) {
    if (lock.current || loading || error) return;
    lock.current = true; setSaving(true); const token = generation.current;
    const completed = !checked.has(id);
    try {
      await saveAnalysisTask(projectId, run.id, id, completed);
      if (token === generation.current) setChecked(previous => { const next = new Set(previous); if (completed) next.add(id); else next.delete(id); return next; });
    } catch (e) { if (token === generation.current) setError(errorMessage(e)); }
    finally { lock.current = false; if (token === generation.current) setSaving(false); }
  }
  return <AnalysisResults projectName={projectName} run={run} data={data} initialTab={initialTab}
    taskStore={{ checked, loading, saving, error, toggle, reload: () => setRevision(v => v + 1) }} />;
}
