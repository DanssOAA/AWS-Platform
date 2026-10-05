import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloudProposal, CostEstimate, AWSService, NotificationToast, IAMUser } from '../types/cloud';
import { DEFAULT_PROPOSAL, INITIAL_COST_ESTIMATES, INITIAL_AWS_SERVICES, IAM_USERS } from '../data/awsServices';
import { useAuth } from './AuthContext';
import { errorMessage, requireSupabase } from '../lib/supabase';
import { DEFAULT_SECURITY, getSecurityChecks, type SecuritySettings } from '../lib/architecture';

type ProposalRow = { id: string; solution_name: string; application_type: string; description: string | null; region: string; estimated_users: number; availability: string; services: string[]; migration_objective: string | null; created_at: string };
const mapProposal = (row: ProposalRow): CloudProposal => ({ id: row.id, solutionName: row.solution_name, appType: row.application_type, description: row.description ?? '', selectedRegion: row.region, estimatedUsers: row.estimated_users, availabilityLevel: row.availability, selectedServices: row.services, migrationGoal: row.migration_objective ?? '', createdAt: row.created_at.slice(0, 10) });
function readCache<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function costsForServices(ids: string[]): CostEstimate[] {
  return INITIAL_AWS_SERVICES.filter(s => ids.includes(s.id)).map(service => {
    const initial = INITIAL_COST_ESTIMATES.find(c => c.serviceId === service.id);
    return initial ?? { id: `cost-${service.id}`, serviceId: service.id, serviceName: service.name, category: service.category, quantity: 1, hoursPerMonth: 720, hourlyCost: service.hourlyCost, monthlyCost: Math.round(service.hourlyCost * 720 * 100) / 100, annualCost: Math.round(service.hourlyCost * 720 * 100) / 100 * 12 };
  });
}
function useAppState() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cacheKey = `cloudops_workspace_v1_${user!.id}`;
  const [cached] = useState(() => readCache<Partial<{ selectedRegion: string; activeProposalId: string | null; costEstimates: CostEstimate[]; iamUsers: IAMUser[]; security: SecuritySettings }>>(cacheKey, {}));
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const setActiveTab = (tab: string) => navigate(`/${tab}`);
  const [isDarkMode, setIsDarkMode] = useState(() => readCache('cloudops_dark_mode', false));
  const [selectedRegion, setSelectedRegion] = useState(cached.selectedRegion ?? 'us-east-1');
  const [proposals, setProposals] = useState<CloudProposal[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(cached.activeProposalId ?? null);
  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>(cached.costEstimates ?? INITIAL_COST_ESTIMATES);
  const [iamUsers, setIamUsers] = useState<IAMUser[]>(cached.iamUsers ?? IAM_USERS);
  const [security, setSecurity] = useState<SecuritySettings>({ ...DEFAULT_SECURITY, ...cached.security });
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState('');
  const [selectedServiceModal, setSelectedServiceModal] = useState<AWSService | null>(null);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const activeProposal = proposals.find(p => p.id === activeProposalId) ?? null;
  const architectureServices = activeProposal?.selectedServices ?? costEstimates.map(c => c.serviceId);
  const securityChecks = getSecurityChecks(iamUsers, security, architectureServices);
  const removeNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);
  const addNotification = useCallback((type: NotificationToast['type'], title: string, message: string) => {
    setNotifications(prev => [...prev.slice(-4), { id: crypto.randomUUID(), type, title, message }]);
  }, []);
  const loadProposals = useCallback(async (signal?: AbortSignal) => {
    setProposalsLoading(true); setProposalsError('');
    try {
      const query = requireSupabase().from('cloudops_proposals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      const { data, error } = await (signal ? query.abortSignal(signal) : query);
      if (signal?.aborted) return;
      if (error) throw error;
      const loaded = (data as ProposalRow[]).map(mapProposal);
      if (cached.activeProposalId === DEFAULT_PROPOSAL.id) loaded.unshift(DEFAULT_PROPOSAL);
      setProposals(loaded);
      setActiveProposalId(current => loaded.some(p => p.id === current) ? current : (cached.activeProposalId === null ? null : loaded[0]?.id ?? null));
      if (!cached.selectedRegion && loaded[0]) setSelectedRegion(loaded[0].selectedRegion);
      if (!cached.costEstimates && loaded[0]) setCostEstimates(costsForServices(loaded[0].selectedServices));
    } catch (error) { if (!signal?.aborted) setProposalsError(errorMessage(error)); }
    finally { if (!signal?.aborted) setProposalsLoading(false); }
  }, [user!.id, cached.activeProposalId, cached.selectedRegion, cached.costEstimates]);
  useEffect(() => { const controller = new AbortController(); void loadProposals(controller.signal); return () => controller.abort(); }, [loadProposals]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try { localStorage.setItem('cloudops_dark_mode', JSON.stringify(isDarkMode)); } catch { /* Storage may be disabled. */ }
  }, [isDarkMode]);
  useEffect(() => {
    if (proposalsLoading) return;
    try { localStorage.setItem(cacheKey, JSON.stringify({ selectedRegion, activeProposalId, costEstimates, iamUsers, security })); } catch { /* Remote saves remain available without local storage. */ }
  }, [cacheKey, selectedRegion, activeProposalId, costEstimates, iamUsers, security, proposalsLoading]);
  function activateProposal(id: string) {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    setActiveProposalId(id); setSelectedRegion(proposal.selectedRegion); setCostEstimates(costsForServices(proposal.selectedServices));
    addNotification('info', 'Propuesta activa', 'Región y servicios cargados.');
  }
  async function addProposal(input: Omit<CloudProposal, 'id' | 'createdAt'>) {
    const { data, error } = await requireSupabase().from('cloudops_proposals').insert({ user_id: user!.id, solution_name: input.solutionName.trim(), application_type: input.appType, description: input.description.trim(), region: input.selectedRegion, estimated_users: input.estimatedUsers, availability: input.availabilityLevel, services: input.selectedServices, migration_objective: input.migrationGoal }).select().single();
    if (error) throw error;
    const proposal = mapProposal(data as ProposalRow);
    setProposals(prev => [proposal, ...prev]); setActiveProposalId(proposal.id); setSelectedRegion(proposal.selectedRegion); setCostEstimates(costsForServices(proposal.selectedServices));
    addNotification('success', 'Propuesta guardada', proposal.solutionName);
  }
  async function clearProposals() {
    const { error } = await requireSupabase().from('cloudops_proposals').delete().eq('user_id', user!.id);
    if (error) throw error;
    setProposals([]); setActiveProposalId(null);
  }
  function updateCostQuantity(costId: string, quantity: number, hours: number) {
    if (!Number.isFinite(quantity) || !Number.isFinite(hours)) return;
    quantity = Math.max(0, Math.min(1000000, Math.floor(quantity))); hours = Math.max(0, Math.min(744, hours));
    setCostEstimates(prev => prev.map(item => {
      if (item.id !== costId) return item;
      const monthlyCost = Math.round(quantity * hours * item.hourlyCost * 100) / 100;
      return { ...item, quantity, hoursPerMonth: hours, monthlyCost, annualCost: Math.round(monthlyCost * 12 * 100) / 100 };
    }));
  }
  function addCostEstimate(serviceId: string) {
    if (costEstimates.some(c => c.serviceId === serviceId)) { addNotification('warning', 'Servicio ya agregado', 'El servicio ya está incluido en el presupuesto.'); return; }
    setCostEstimates(prev => [...prev, ...costsForServices([serviceId])]);
  }
  function removeCostEstimate(id: string) { setCostEstimates(prev => prev.filter(c => c.id !== id)); }
  function clearAllCosts() { setCostEstimates([]); }
  function clearAllDashboardData() {
    setCostEstimates([]); setActiveProposalId(null);
    addNotification('info', 'Planificación vaciada', 'Las propuestas guardadas se conservan.');
  }
  function resetDefaultData() {
    setProposals(prev => [DEFAULT_PROPOSAL, ...prev.filter(p => p.id !== DEFAULT_PROPOSAL.id)]);
    setActiveProposalId(DEFAULT_PROPOSAL.id); setCostEstimates(costsForServices(DEFAULT_PROPOSAL.selectedServices)); setSelectedRegion(DEFAULT_PROPOSAL.selectedRegion);
    addNotification('info', 'Datos iniciales cargados', 'Las propuestas guardadas se conservan.');
  }
  async function saveCostScenario() {
    const monthly = Math.round(costEstimates.reduce((sum, item) => sum + item.monthlyCost, 0) * 100) / 100;
    const { error } = await requireSupabase().from('cloudops_cost_snapshots').insert({ user_id: user!.id, monthly_cost: monthly, annual_cost: Math.round(monthly * 12 * 100) / 100, detail: { version: 1, region: selectedRegion, proposalId: activeProposal?.id ?? null, services: costEstimates } });
    if (error) throw error;
    addNotification('success', 'Presupuesto guardado', 'Los costos se guardaron correctamente.');
  }
  function toggleMfa(username: string) { setIamUsers(prev => prev.map(u => u.username === username ? { ...u, mfaEnabled: !u.mfaEnabled } : u)); }
  function rotateKey(username: string) {
    const account = iamUsers.find(u => u.username === username);
    if (account) setSecurity(prev => ({ ...prev, rotatedKeys: [...new Set([...prev.rotatedKeys, account.id])] }));
    addNotification('info', 'Rotación registrada', 'Control de claves actualizado.');
  }
  return { activeTab, setActiveTab, isDarkMode, toggleDarkMode: () => setIsDarkMode(prev => !prev), selectedRegion, setSelectedRegion, proposals, activeProposal, activateProposal, proposalsLoading, proposalsError, loadProposals, addProposal, clearProposals, costEstimates, updateCostQuantity, addCostEstimate, removeCostEstimate, clearAllCosts, clearAllDashboardData, resetDefaultData, saveCostScenario, selectedServiceModal, setSelectedServiceModal, notifications, addNotification, removeNotification, globalSearch, setGlobalSearch, iamUsers, security, setSecurity, securityChecks, architectureServices, toggleMfa, rotateKey };
}
const AppContext = createContext<ReturnType<typeof useAppState> | undefined>(undefined);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe ser usado dentro de AppProvider');
  return context;
}
