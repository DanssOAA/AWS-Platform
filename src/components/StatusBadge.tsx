import React from 'react';
import { SecurityStatusLevel, ServiceStatus } from '../types/cloud';

export type BadgeStatus = SecurityStatusLevel | ServiceStatus | 'info' | 'neutral' | 'Operativo' | 'En Espera' | 'Degradado' | 'Mantenimiento' | 'Protegido';

interface StatusBadgeProps {
  status: BadgeStatus;
  text?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  let dotColor = 'bg-emerald-500';
  let defaultText = 'Correcto';

  if (status === 'info' || status === 'neutral') {
    badgeColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    dotColor = status === 'info' ? 'bg-blue-500' : 'bg-slate-400';
    defaultText = 'Referencia';
  } else if (status === 'green' || status === 'Operativo' || status === 'In Use' || status === 'Protegido') {
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    dotColor = 'bg-emerald-500';
    defaultText = status === 'green' ? 'Correcto' : status === 'In Use' ? 'En uso' : status === 'Protegido' ? 'Protegido' : 'Operativo';
  } else if (status === 'yellow' || status === 'En Espera' || status === 'Available' || status === 'Configured' || status === 'Pending') {
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    dotColor = 'bg-amber-500';
    defaultText = status === 'yellow' ? 'Revisar' : status === 'Available' ? 'Disponible' : status === 'Pending' ? 'Pendiente' : 'Configurado';
  } else if (status === 'red' || status === 'Degradado' || status === 'Mantenimiento') {
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    dotColor = 'bg-rose-500';
    defaultText = status === 'red' ? 'Crítico' : status;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      {text || defaultText}
    </span>
  );
};
