import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INITIAL_AWS_SERVICES } from '../data/awsServices';
import { ServiceCard } from '../components/ServiceCard';
import { AWSService } from '../types/cloud';
import {
  Server,
  Search,
  Filter,
  Sparkles
} from 'lucide-react';

export const Services: React.FC = () => {
  const { globalSearch, setGlobalSearch, costEstimates, addCostEstimate, removeCostEstimate } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories: string[] = [
    'Todas',
    'Computación',
    'Almacenamiento',
    'Base de Datos',
    'Seguridad & IAM',
    'Redes & CDN',
  ];

  // Filter logic: category & search term
  const filteredServices = INITIAL_AWS_SERVICES.filter((srv) => {
    const matchesCategory = selectedCategory === 'Todas' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      srv.description.toLowerCase().includes(globalSearch.toLowerCase()) ||
      srv.category.toLowerCase().includes(globalSearch.toLowerCase()) ||
      srv.mainFunction.toLowerCase().includes(globalSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleToggleService = (service: AWSService) => {
    const existing = costEstimates.find(c => c.serviceId === service.id);
    if (existing) {
      removeCostEstimate(existing.id);
    } else {
      addCostEstimate(service.id);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Server className="w-4 h-4" /> Catálogo AWS
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Servicios para la arquitectura
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Consulta servicios AWS y agrégalos al presupuesto.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/60 px-4 py-2.5 rounded-xl border border-blue-100 dark:border-blue-900 text-xs font-semibold text-blue-900 dark:text-blue-300">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{INITIAL_AWS_SERVICES.length} Servicios disponibles</span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full min-w-0 pb-1 scrollbar-none">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Filtrar servicios AWS"
              type="text"
              placeholder="Buscar por nombre o función"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
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
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Server className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No se encontraron servicios
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Prueba otra búsqueda en lugar de "{globalSearch}" o selecciona otra categoría.
          </p>
          <button
            onClick={() => { setGlobalSearch(''); setSelectedCategory('Todas'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
};
