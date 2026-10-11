import { useMemo, useState, type ReactNode } from 'react';
import { AppContext, useApp } from './AppContext';
import { useProjectWorkspace } from './ProjectWorkspaceContext';
import { useAuth } from './AuthContext';
import { projectModuleData } from '../lib/projectModuleData';
import { requireSupabase } from '../lib/supabase';
import type { AWSService, CloudProposal, CostEstimate } from '../types/cloud';
import type { SecuritySettings } from '../lib/architecture';

/** Adapts saved analysis to the original modules, without replacing their views. */
export function AnalyzedAppProvider({ children }: { children: ReactNode }) {
  const workspace = useProjectWorkspace();
  return <ProjectScenario key={`${workspace.project?.id ?? 'none'}:${workspace.run?.id ?? 'none'}`}>{children}</ProjectScenario>;
}
function ProjectScenario({ children }: { children: ReactNode }) {
  const base = useApp(); const { user } = useAuth();
  const { project, run, detail } = useProjectWorkspace();
  const model = useMemo(() => project && run && detail ? projectModuleData(project, run, detail) : null, [project, run, detail]);
  const [overrides, setOverrides] = useState<CostEstimate[] | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [manualProposal, setManualProposal] = useState<CloudProposal | null>(null);
  const [dashboardCleared, setDashboardCleared] = useState(false);
  const [selectedServiceModal,setSelectedServiceModal] = useState<AWSService | null>(null);
  const [security,setSecurity] = useState<SecuritySettings>({ encryption:false, privateDatabase:false, compliance:false, rotatedKeys:[] });
  const costs = overrides ?? model?.costs ?? [];
  const proposals = model ? [model.proposal, ...base.proposals.filter(p => p.id !== model.proposal.id)] : base.proposals;
  function reset() { setDashboardCleared(false); setOverrides(null); setRegion(null); setManualProposal(null); }
  async function save() {
    if (!project || !run) throw new Error('Selecciona un proyecto analizado antes de guardar el escenario.');
    const total = costs.reduce((n,c) => n + c.monthlyCost,0);
    const { error } = await requireSupabase().from('cloudops_cost_snapshots').insert({ user_id: user!.id, monthly_cost: total, annual_cost: total * 12,
      detail: { version: 2, projectId: project.id, analysisId: run.id, region: region ?? model?.proposal.selectedRegion, services: costs, basis: 'Escenario de planificación; no facturación AWS' } });
    if (error) throw error;
  }
  return <AppContext.Provider value={{ ...base, dashboardCleared, selectedServiceModal, setSelectedServiceModal, serviceCatalog: model?.services ?? [], analyzedProject: Boolean(model), analysisScore: run?.security_score ?? null,
    activeProposal: dashboardCleared ? null : manualProposal ?? model?.proposal ?? null, proposals, selectedRegion: region ?? model?.proposal.selectedRegion ?? base.selectedRegion,
    setSelectedRegion: value => setRegion(previous => typeof value === 'function' ? value(previous ?? model?.proposal.selectedRegion ?? base.selectedRegion) : value), architectureServices: model?.services.map(s => s.id) ?? [], costEstimates: costs,
    securityChecks: model?.checks ?? [], iamUsers: [], security, setSecurity,
    activateProposal: id => { const p = proposals.find(p => p.id === id); if (p) { setManualProposal(p); setRegion(p.selectedRegion); } },
    addProposal: async input => { await base.addProposal(input); },
    resetDefaultData: reset, clearAllDashboardData: () => { setDashboardCleared(true); setOverrides([]); setManualProposal(null); }, clearAllCosts: () => setOverrides([]), saveCostScenario: save,
    removeCostEstimate: id => setOverrides(costs.filter(c => c.id !== id)),
    addCostEstimate: id => { const c = model?.costs.find(c => c.serviceId === id); if (c && !costs.some(item => item.serviceId === id)) setOverrides([...costs,c]); else if (!c) base.addNotification('info','Costo pendiente','La estimación de este servicio aún no está disponible.'); },
    updateCostQuantity: (id, quantity, hours) => {
      if (!Number.isFinite(quantity) || !Number.isFinite(hours)) return;
      const q = Math.max(0, Math.min(1000000, Math.floor(quantity))); const h = Math.max(0,Math.min(744,hours));
      setOverrides(costs.map(c => { if (c.id !== id) return c; const monthlyCost = Math.round(q * h * c.hourlyCost * 100) / 100; return { ...c, quantity:q, hoursPerMonth:h, monthlyCost, annualCost: monthlyCost * 12 }; }));
    },
  }}>{children}</AppContext.Provider>;
}
