import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { AWSService } from '../types/cloud';
import { StatusBadge } from './StatusBadge';
import { useApp } from '../context/AppContext';

interface ServiceCardProps {
  service: AWSService;
  onSelect?: (service: AWSService) => void;
  onRemove?: (service: AWSService) => void;
  isSelected?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onSelect, onRemove, isSelected }) => {
  const { setSelectedServiceModal } = useApp();
  const [isHoveredSelected, setIsHoveredSelected] = useState(false);

  const IconComponent = (Icons[service.iconName as keyof typeof Icons] as React.ElementType) || Icons.Cloud;

  const handleToggleClick = () => {
    if (isSelected) {
      if (onRemove) {
        onRemove(service);
      } else if (onSelect) {
        onSelect(service);
      }
    } else {
      if (onSelect) {
        onSelect(service);
      }
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base leading-snug">
                {service.name}
              </h3>
              <span className="inline-block text-xs text-slate-400 font-medium">
                {service.category}
              </span>
            </div>
          </div>
          <StatusBadge status={service.status} />
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-3 line-clamp-2">
          {service.description}
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Función Principal:</span>
          {service.mainFunction}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setSelectedServiceModal(service)}
          className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Icons.Info className="w-3.5 h-3.5 text-slate-400" />
          Ver Detalle
        </button>

        {(onSelect || onRemove) && (
          <button
            onClick={handleToggleClick}
            onMouseEnter={() => setIsHoveredSelected(true)}
            onMouseLeave={() => setIsHoveredSelected(false)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isSelected
                ? isHoveredSelected
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isSelected ? 'Haz clic para quitar de la solución' : 'Haz clic para agregar a la solución'}
          >
            {isSelected ? (
              isHoveredSelected ? (
                <>
                  <Icons.X className="w-3.5 h-3.5" /> Quitar
                </>
              ) : (
                <>
                  <Icons.Check className="w-3.5 h-3.5" /> Seleccionado
                </>
              )
            ) : (
              <>
                <Icons.Plus className="w-3.5 h-3.5" /> Agregar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
