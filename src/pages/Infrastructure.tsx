import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GLOBAL_REGIONS, INITIAL_AWS_SERVICES } from '../data/awsServices';
import { RegionExplorer } from '../components/RegionExplorer';

export function Infrastructure() {
  const { selectedRegion, setSelectedRegion, architectureServices, addNotification, clearAllDashboardData, resetDefaultData } = useApp();
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
  const currentRegion = GLOBAL_REGIONS.find(region => region.code === selectedRegion) ?? GLOBAL_REGIONS[0];
  const services = architectureServices.map(id => INITIAL_AWS_SERVICES.find(service => service.id === id)?.name ?? id);

  function selectRegion(code: string) {
    setSelectedRegion(code);
    addNotification('info', 'Región actualizada', `Región principal: ${code}`);
  }
  function handleConfirmClear() {
    clearAllDashboardData();
    setShowConfirmClearModal(false);
  }

  return <div className="space-y-6">
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Infraestructura planificada</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{architectureServices.length ? 'Planificado' : 'Sin servicios'}</span></div>
      <dl className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">{[['Región principal', selectedRegion], ['Ubicación', currentRegion.location], ['Servicios planificados', String(architectureServices.length)], ['Zonas de disponibilidad', `${currentRegion.availabilityZones} AZs`]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl>
    </section>
    <RegionExplorer selectedRegion={selectedRegion} onSelectRegion={selectRegion} onClear={() => setShowConfirmClearModal(true)} onReset={resetDefaultData} plannedServices={services} />
      {showConfirmClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-800 dark:text-white">
                  ¿Vaciar la planificación activa?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Se vaciará el presupuesto y se desactivará la propuesta actual.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              Las propuestas guardadas se conservarán.
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
                <Trash2 className="w-4 h-4" /> Vaciar planificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
}
