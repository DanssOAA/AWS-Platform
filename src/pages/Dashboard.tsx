import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/StatCard';
import { ServiceCard } from '../components/ServiceCard';
import { SECURITY_CHECKS, INITIAL_AWS_SERVICES, GLOBAL_REGIONS } from '../data/awsServices';
import { AWSService } from '../types/cloud';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Server,
  DollarSign,
  ShieldCheck,
  Globe,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle,
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    proposals,
    costEstimates,
    selectedRegion,
    setActiveTab,
    addCostEstimate,
    removeCostEstimate,
    clearAllDashboardData,
    resetDefaultData
  } = useApp();

  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);

  const activeProposal = proposals.length > 0 ? proposals[0] : null;

  // Live calculated totals across all interconnected modules
  const totalMonthlyCost = costEstimates.reduce((acc, curr) => acc + curr.monthlyCost, 0);
  const totalAnnualCost = totalMonthlyCost * 12;
  const activeServicesCount = costEstimates.length;

  const currentRegionObj = GLOBAL_REGIONS.find(r => r.code === selectedRegion) || GLOBAL_REGIONS[0];

  // Live Chart data: Costs grouped by Category
  const categoryMap: Record<string, number> = {};
  costEstimates.forEach(c => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + c.monthlyCost;
  });

  const chartData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    value: parseFloat(categoryMap[cat].toFixed(2)),
  }));

  const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  // Security score calculation
  const greenCount = SECURITY_CHECKS.filter(s => s.status === 'green').length;
  const totalChecks = SECURITY_CHECKS.length;
  const securityScorePercentage = Math.round((greenCount / totalChecks) * 100);

  const handleToggleService = (service: AWSService) => {
    const existing = costEstimates.find(c => c.serviceId === service.id);
    if (existing) {
      removeCostEstimate(existing.id);
    } else {
      addCostEstimate(service.id);
    }
  };

  const handleConfirmClear = () => {
    clearAllDashboardData();
    setShowConfirmClearModal(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Action Bar with "Vaciar Dashboard" & "Restaurar" */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Solución Cloud Vinculada: <strong>{currentRegionObj.name} ({selectedRegion})</strong></span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* BOTÓN VACIAR DASHBOARD */}
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Vaciar todas las estimaciones y propuestas del Dashboard"
          >
            <Trash2 className="w-4 h-4" /> Vaciar Dashboard
          </button>

          {/* BOTÓN RESTAURAR DATOS */}
          <button
            onClick={resetDefaultData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Restaurar datos por defecto"
          >
            <RotateCcw className="w-4 h-4 text-blue-500" /> Restaurar Datos
          </button>
        </div>
      </div>

      {/* Active Proposal Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Solución Cloud Activa
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {activeProposal?.id || 'Sin propuesta viva'}
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              {activeProposal?.solutionName || 'Sin propuesta registrada'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activeProposal?.description || 'Haz clic en "Registrar Planificación" para añadir una propuesta de arquitectura Cloud.'}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400" /> Región: <strong>{currentRegionObj.name}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" /> Disponibilidad SLA: <strong>{activeProposal?.availabilityLevel || '99.99%'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-amber-400" /> Usuarios: <strong>{(activeProposal?.estimatedUsers || 0).toLocaleString()} est.</strong>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
            <button
              onClick={() => setActiveTab('planning')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {activeProposal ? 'Editar Planificación' : 'Registrar Planificación'} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Ver Arquitectura Red
            </button>
          </div>
        </div>
      </div>

      {/* Indicator StatCards Grid (Módulo 1) - Synchronized with all modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Servicios Utilizados"
          value={activeServicesCount}
          subtitle="Componentes activos en la nube"
          icon="Server"
          color="text-blue-600"
          badgeText={activeServicesCount > 0 ? `${activeServicesCount} activos` : 'Vaciado'}
          badgeType={activeServicesCount > 0 ? 'info' : 'warning'}
        />
        <StatCard
          title="Región Seleccionada"
          value={selectedRegion}
          subtitle={`${currentRegionObj.location}`}
          icon="Globe"
          color="text-indigo-600"
          badgeText="Operativa"
          badgeType="success"
        />
        <StatCard
          title="Costo Mensual Estimado"
          value={`$${totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`Costo anual: $${totalAnnualCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon="DollarSign"
          color="text-amber-500"
          badgeText={totalMonthlyCost > 0 ? 'Optimizado' : '$0.00 USD'}
          badgeType={totalMonthlyCost > 0 ? 'warning' : 'info'}
        />
        <StatCard
          title="Estado de Seguridad"
          value={`${securityScorePercentage}%`}
          subtitle={`${greenCount} de ${totalChecks} controles aprobados`}
          icon="ShieldCheck"
          color="text-emerald-600"
          badgeText={securityScorePercentage >= 80 ? 'Excelente' : 'Revisión'}
          badgeType={securityScorePercentage >= 80 ? 'success' : 'warning'}
        />
      </div>

      {/* Main Charts & Security Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cost Distribution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Distribución de Costos por Categoría
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inversión estimada mensual distribuida en los servicios AWS seleccionados
              </p>
            </div>
            <button
              onClick={() => setActiveTab('costs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
            >
              Ver Detalle Costos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)} USD`, 'Costo Mensual']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center p-6 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Dashboard Vaciado - Sin Datos de Costos
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Agrega servicios al presupuesto o restablece los datos iniciales para ver el gráfico de distribución.
              </p>
              <button
                onClick={resetDefaultData}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restaurar Datos por Defecto
              </button>
            </div>
          )}
        </div>

        {/* Security Overview Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Resumen de Seguridad
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                AWS Security Standard
              </span>
            </div>

            <div className="space-y-4">
              {SECURITY_CHECKS.slice(0, 3).map((check) => (
                <div key={check.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <span>{check.title}</span>
                    <span className={check.status === 'green' ? 'text-emerald-600' : 'text-amber-500'}>
                      {check.status === 'green' ? 'Cumple' : 'Revisar'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {check.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('security')}
            className="w-full mt-6 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Auditar Seguridad Completa <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Featured AWS Services Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Servicios Destacados en la Arquitectura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Componentes principales configurados para la solución
            </p>
          </div>
          <button
            onClick={() => setActiveTab('services')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
          >
            Ver Todo el Catálogo ({INITIAL_AWS_SERVICES.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {INITIAL_AWS_SERVICES.slice(0, 4).map((service) => {
            const isAdded = costEstimates.some(c => c.serviceId === service.id);
            return (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={isAdded}
                onSelect={() => handleToggleService(service)}
                onRemove={() => handleToggleService(service)}
              />
            );
          })}
        </div>
      </div>

      {/* CONFIRM VACIAR MODAL */}
      {showConfirmClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-800 dark:text-white">
                  ¿Vaciar Datos del Dashboard?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción eliminará todas las estimaciones de costos y propuestas del Dashboard.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              Se restablecerá la métrica a $0.00 USD y 0 servicios activos. Podrás restaurar los datos por defecto en cualquier momento.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmClearModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Sí, Vaciar Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
