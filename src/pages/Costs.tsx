import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CostCard } from '../components/CostCard';
import { INITIAL_AWS_SERVICES } from '../data/awsServices';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  DollarSign,
  Plus,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  Trash2,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  Package
} from 'lucide-react';


export const Costs: React.FC = () => {
  const { costEstimates, addCostEstimate, clearAllCosts, resetDefaultData, addNotification } = useApp();
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState(INITIAL_AWS_SERVICES[0].id);
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);

  const handleConfirmClear = () => {
    clearAllCosts();
    setShowConfirmClearModal(false);
    addNotification('warning', 'Costos Vaciados', 'Se han eliminado todas las estimaciones de costos.');
  };

  const totalMonthlyCost = costEstimates.reduce((acc, item) => acc + item.monthlyCost, 0);
  const totalAnnualCost = totalMonthlyCost * 12;
  // Simulated 30% savings with reserved instances
  const reservedInstanceSavings = totalAnnualCost * 0.3;

  // Chart data for Bar Chart
  const barChartData = costEstimates.map(item => ({
    name: item.serviceName.split(' ')[1] || item.serviceName,
    CostoMensual: item.monthlyCost,
  }));

  // Export Report to CSV Function (Reto Adicional)
  const exportCSVReport = () => {
    const headers = ['ID', 'Servicio', 'Categoria', 'Cantidad', 'Horas/Mes', 'Tarifa por Hora (USD)', 'Costo Mensual (USD)', 'Costo Anual (USD)'];
    const rows = costEstimates.map(item => [
      item.id,
      `"${item.serviceName}"`,
      `"${item.category}"`,
      item.quantity,
      item.hoursPerMonth,
      item.hourlyCost,
      item.monthlyCost,
      item.annualCost
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Costos_CloudOps_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification('success', 'Reporte Exportado', 'Se ha descargado el archivo CSV con la estimación de costos.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner KPI summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4" /> Economía de la Nube AWS
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Estimador de Costos Operativos (TCO)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Simula de forma dinámica la inversión requerida según cantidad de instancias y horas mensuales de uso.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 w-full sm:w-auto justify-around">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Inversión Mensual</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ${totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">USD / mes</span>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />

              <div>
                <span className="text-xs text-slate-400 block font-medium">Proyección Anual</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  ${totalAnnualCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">USD / año</span>
              </div>
            </div>

            {/* Vaciar / Restaurar Buttons */}
            <div className="flex sm:flex-col gap-2">
              <button
                onClick={() => setShowConfirmClearModal(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Vaciar todas las estimaciones de costos"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar Costos
              </button>
              <button
                onClick={resetDefaultData}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restaurar datos por defecto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-500" /> Restaurar
              </button>
            </div>
          </div>
        </div>

        {/* Reserved instance savings tip */}
        {totalAnnualCost > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5 text-xs">
            <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-emerald-800 dark:text-emerald-300">
              <strong>💡 Consejo de Optimización:</strong> Migrando a Instancias Reservadas (1 año) podrías ahorrar hasta{' '}
              <strong className="text-emerald-700 dark:text-emerald-300">${reservedInstanceSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/año</strong>{' '}
              (~30% de descuento vs On-Demand).
            </span>
          </div>
        )}
      </div>

      {/* Add Service Bar & Export Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedServiceToAdd}
            onChange={(e) => setSelectedServiceToAdd(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:w-64"
          >
            {INITIAL_AWS_SERVICES.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name} (${srv.hourlyCost.toFixed(4)}/hr)
              </option>
            ))}
          </select>
          <button
            onClick={() => addCostEstimate(selectedServiceToAdd)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Servicio
          </button>
        </div>

        {/* Reto adicional: Export Report */}
        <button
          onClick={exportCSVReport}
          disabled={costEstimates.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Exportar Reporte (CSV)
        </button>
      </div>

      {/* Interactive Chart Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> Comparativa de Costos por Servicio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gráfico interactivo de barras representando la distribución del gasto mensual por cada componente
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {costEstimates.length} servicio(s)
          </span>
        </div>

        {barChartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit=" $" />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)} USD`, 'Costo Mensual']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="CostoMensual" name="Costo Mensual (USD)" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center p-6 space-y-3">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Sin Servicios en el Presupuesto</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Agrega servicios usando el selector de arriba o restaura los datos de demostración.
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

      {/* List of CostCards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Desglose Detallado de Servicios
        </h3>

        {costEstimates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {costEstimates.map((item) => (
              <CostCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay servicios estimados. Agrega uno arriba para empezar.</p>
          </div>
        )}
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
                  ¿Vaciar Todas las Estimaciones?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción eliminará todos los servicios del presupuesto de costos.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              Podrás restaurar los datos por defecto en cualquier momento usando el botón "Restaurar".
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
                <Trash2 className="w-4 h-4" /> Sí, Vaciar Costos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

