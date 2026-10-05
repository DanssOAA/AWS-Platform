import React from 'react';
import { Icons } from './icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Icons;
  color?: string; // hex or tailwind class
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'text-blue-600',
  badgeText,
  badgeType = 'info',
}) => {
  const IconComponent = (Icons[icon] as React.ElementType) || Icons.Activity;

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 ${color}`}>
          <IconComponent className="w-6 h-6" />
        </div>
      </div>
      {(subtitle || badgeText) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{subtitle}</span>
          {badgeText && (
            <span className={`px-2 py-0.5 rounded-full font-medium ${badgeStyles[badgeType]}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
