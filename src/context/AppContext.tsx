import React, { createContext, useContext, useState, useEffect } from 'react';
import { CloudProposal, CostEstimate, AWSService, NotificationToast } from '../types/cloud';
import { DEFAULT_PROPOSAL, INITIAL_COST_ESTIMATES, INITIAL_AWS_SERVICES } from '../data/awsServices';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  proposals: CloudProposal[];
  addProposal: (proposal: Omit<CloudProposal, 'id' | 'createdAt'>) => void;
  clearProposals: () => void;
  costEstimates: CostEstimate[];
  updateCostQuantity: (costId: string, quantity: number, hours: number) => void;
  addCostEstimate: (serviceId: string) => void;
  removeCostEstimate: (costId: string) => void;
  clearAllCosts: () => void;
  clearAllDashboardData: () => void;
  resetDefaultData: () => void;
  selectedServiceModal: AWSService | null;
  setSelectedServiceModal: (service: AWSService | null) => void;
  notifications: NotificationToast[];
  addNotification: (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => void;
  removeNotification: (id: string) => void;
  globalSearch: string;
  setGlobalSearch: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cloudops_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east-1');
  
  const [proposals, setProposals] = useState<CloudProposal[]>(() => {
    const saved = localStorage.getItem('cloudops_proposals');
    return saved ? JSON.parse(saved) : [DEFAULT_PROPOSAL];
  });

  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>(() => {
    const saved = localStorage.getItem('cloudops_costs');
    return saved ? JSON.parse(saved) : INITIAL_COST_ESTIMATES;
  });

  const [selectedServiceModal, setSelectedServiceModal] = useState<AWSService | null>(null);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('cloudops_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('cloudops_proposals', JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem('cloudops_costs', JSON.stringify(costEstimates));
  }, [costEstimates]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    addNotification('info', 'Preferencia de Tema', `Modo ${!isDarkMode ? 'Oscuro' : 'Claro'} activado`);
  };

  const addProposal = (newPropData: Omit<CloudProposal, 'id' | 'createdAt'>) => {
    const newProposal: CloudProposal = {
      ...newPropData,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProposals(prev => [newProposal, ...prev]);
    setSelectedRegion(newProposal.selectedRegion);
    addNotification('success', 'Propuesta Registrada', `Se guardó correctamente "${newProposal.solutionName}"`);
  };

  const clearProposals = () => {
    setProposals([]);
    localStorage.removeItem('cloudops_proposals');
  };

  const updateCostQuantity = (costId: string, quantity: number, hours: number) => {
    setCostEstimates(prev => prev.map(item => {
      if (item.id === costId) {
        const monthlyCost = parseFloat((quantity * hours * item.hourlyCost).toFixed(2));
        const annualCost = parseFloat((monthlyCost * 12).toFixed(2));
        return {
          ...item,
          quantity,
          hoursPerMonth: hours,
          monthlyCost,
          annualCost
        };
      }
      return item;
    }));
  };

  const addCostEstimate = (serviceId: string) => {
    const service = INITIAL_AWS_SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    if (costEstimates.some(c => c.serviceId === serviceId)) {
      addNotification('warning', 'Servicio ya agregado', `${service.name} ya está en la lista de costos.`);
      return;
    }

    const newItem: CostEstimate = {
      id: `cost-${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      category: service.category,
      quantity: 1,
      hoursPerMonth: 720,
      hourlyCost: service.hourlyCost || 0.05,
      monthlyCost: parseFloat((720 * (service.hourlyCost || 0.05)).toFixed(2)),
      annualCost: parseFloat((720 * (service.hourlyCost || 0.05) * 12).toFixed(2)),
    };

    setCostEstimates(prev => [...prev, newItem]);
    addNotification('success', 'Servicio Estimado', `Se agregó ${service.name} a la arquitectura.`);
  };

  const removeCostEstimate = (costId: string) => {
    setCostEstimates(prev => prev.filter(c => c.id !== costId));
    addNotification('info', 'Elemento Eliminado', 'Se removió el servicio de la estimación');
  };

  const clearAllCosts = () => {
    setCostEstimates([]);
    localStorage.removeItem('cloudops_costs');
  };

  // VACIAR DATOS DEL DASHBOARD
  const clearAllDashboardData = () => {
    setCostEstimates([]);
    setProposals([]);
    localStorage.removeItem('cloudops_costs');
    localStorage.removeItem('cloudops_proposals');
    addNotification('warning', 'Dashboard Vaciado', 'Se han borrado todas las estimaciones y propuestas activas.');
  };

  // RESTABLECER DATOS INICIALES
  const resetDefaultData = () => {
    setProposals([DEFAULT_PROPOSAL]);
    setCostEstimates(INITIAL_COST_ESTIMATES);
    setSelectedRegion('us-east-1');
    addNotification('success', 'Datos Restablecidos', 'Se han restaurado los datos iniciales de demostración.');
  };

  const addNotification = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeNotification(id);
    }, 4500);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      isDarkMode,
      toggleDarkMode,
      selectedRegion,
      setSelectedRegion,
      proposals,
      addProposal,
      clearProposals,
      costEstimates,
      updateCostQuantity,
      addCostEstimate,
      removeCostEstimate,
      clearAllCosts,
      clearAllDashboardData,
      resetDefaultData,
      selectedServiceModal,
      setSelectedServiceModal,
      notifications,
      addNotification,
      removeNotification,
      globalSearch,
      setGlobalSearch,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
