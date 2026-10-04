import React from 'react';
import { GlobalRegion } from '../types/cloud';
import { StatusBadge } from './StatusBadge';
import { MapPin, Server, Activity, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface RegionCardProps {
  region: GlobalRegion;
}

export const RegionCard: React.FC<RegionCardProps> = ({ region }) => {
  const { selectedRegion, setSelectedRegion } = useApp();
  const isCurrent = selectedRegion === region.code;

  return (
    <div className={`bg-white dark:bg-slate-900 border ${isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{region.flag}</span>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-base">
                {region.name}
              </h4>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {region.code}
              </span>
            </div>
          </div>
          <StatusBadge status={region.status} />
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 my-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Ubicación: <strong className="text-slate-800 dark:text-slate-200">{region.location}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Latencia Promedio: <strong className="text-slate-800 dark:text-slate-200">{region.latencyMs} ms</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <span>Zonas de Disponibilidad (AZs): <strong className="text-slate-800 dark:text-slate-200">{region.availabilityZones} AZs</strong></span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Servicios Desplegados en la Región:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {region.deployedServices.map((srv, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900"
              >
                {srv}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setSelectedRegion(region.code)}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            isCurrent
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isCurrent ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Región Activa Seleccionada
            </>
          ) : (
            'Seleccionar Región Principal'
          )}
        </button>
      </div>
    </div>
  );
};
