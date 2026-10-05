import React from 'react';
import { CostEstimate } from '../types/cloud';
import { useApp } from '../context/AppContext';
import { Trash2, Clock, Hash, DollarSign } from 'lucide-react';

interface CostCardProps {
  item: CostEstimate;
}

export const CostCard: React.FC<CostCardProps> = ({ item }) => {
  const { updateCostQuantity, removeCostEstimate } = useApp();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            {item.category}
          </span>
          <h4 className="font-bold text-slate-800 dark:text-white text-base mt-1">
            {item.serviceName}
          </h4>
        </div>
        <button
          onClick={() => removeCostEstimate(item.id)}
          className="self-start sm:self-auto text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Eliminar de la estimación"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
            <Hash className="w-3.5 h-3.5 text-blue-500" /> Cantidad
          </label>
          <input
            type="number"
            min="1"
            max="1000000"
            aria-label={`Cantidad de ${item.serviceName}`}
            value={item.quantity}
            onChange={(e) => updateCostQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1), item.hoursPerMonth)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Horas al mes
          </label>
          <input
            type="number"
            min="1"
            max="744"
            aria-label={`Horas mensuales de ${item.serviceName}`}
            value={item.hoursPerMonth}
            onChange={(e) => updateCostQuantity(item.id, item.quantity, Math.max(1, Math.min(744, parseInt(e.target.value) || 1)))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Tarifa por hora
          </label>
          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
            ${item.hourlyCost.toFixed(4)} / hora
          </div>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Costo mensual:</span>
          <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
            ${item.monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">USD/mes</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Costo anual:</span>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            ${item.annualCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">USD/año</span>
          </p>
        </div>
      </div>
    </div>
  );
};
