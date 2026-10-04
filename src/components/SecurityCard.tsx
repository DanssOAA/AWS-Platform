import React from 'react';
import { SecurityCheck } from '../types/cloud';
import { StatusBadge } from './StatusBadge';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SecurityCardProps {
  check: SecurityCheck;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ check }) => {
  const { addNotification } = useApp();

  const partyBadgeStyle = {
    AWS: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200',
    Cliente: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200',
    Compartido: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200',
  };

  const handleFixCheck = () => {
    addNotification('success', 'Control Auditado', `Se ha ejecutado la revisión de seguridad para "${check.title}".`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-base">
                {check.title}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Categoría: {check.category}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${partyBadgeStyle[check.responsibleParty]}`}>
              {check.responsibleParty === 'AWS' ? 'Responsabilidad AWS' : check.responsibleParty === 'Cliente' ? 'Responsabilidad Cliente' : 'Compartido'}
            </span>
            <StatusBadge status={check.status} />
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-3">
          {check.description}
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs border border-slate-100 dark:border-slate-800 flex items-start gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 block">Recomendación / Estado:</span>
            <span className="text-slate-600 dark:text-slate-400">{check.recommendation}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleFixCheck}
          className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Auditar / Ejecutar Verificación
        </button>
      </div>
    </div>
  );
};
