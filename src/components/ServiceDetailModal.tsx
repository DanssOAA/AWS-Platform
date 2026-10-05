import React from 'react';
import { useApp } from '../context/AppContext';
import { Icons } from './icons';
import { StatusBadge } from './StatusBadge';

export const ServiceDetailModal: React.FC = () => {
  const { selectedServiceModal, setSelectedServiceModal, addCostEstimate, costEstimates } = useApp();

  if (!selectedServiceModal) return null;

  const IconComponent = (Icons[selectedServiceModal.iconName as keyof typeof Icons] as React.ElementType) || Icons.Cloud;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <IconComponent className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{selectedServiceModal.name}</h3>
                <StatusBadge status="info" text={costEstimates.some(c => c.serviceId === selectedServiceModal.id) ? 'En presupuesto' : 'Disponible'} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Categoría: {selectedServiceModal.category}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedServiceModal(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Descripción
            </h4>
            <p className="text-sm leading-relaxed">
              {selectedServiceModal.description}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Función en la arquitectura
            </h4>
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-3 text-sm text-blue-900 dark:text-blue-300">
              {selectedServiceModal.mainFunction}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Capa</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedServiceModal.details.tier}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Disponibilidad SLA</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedServiceModal.details.sla}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Modelo de precios</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedServiceModal.details.pricingModel}</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Características
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {selectedServiceModal.details.keyFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  <Icons.CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Casos de uso
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedServiceModal.details.useCases.map((uc, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                  {uc}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Costo estimado: <strong className="text-slate-800 dark:text-white">${selectedServiceModal.hourlyCost.toFixed(4)} / hr</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                addCostEstimate(selectedServiceModal.id);
                setSelectedServiceModal(null);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Icons.Plus className="w-4 h-4" /> Agregar al presupuesto
            </button>
            <button
              onClick={() => setSelectedServiceModal(null)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
