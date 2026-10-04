import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INITIAL_AWS_SERVICES, GLOBAL_REGIONS } from '../data/awsServices';
import {
  FileSpreadsheet,
  PlusCircle,
  Globe,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Server
} from 'lucide-react';

export const Planning: React.FC = () => {
  const { proposals, addProposal, setSelectedServiceModal } = useApp();

  const [solutionName, setSolutionName] = useState('');
  const [appType, setAppType] = useState('Aplicación Web SPA + API REST');
  const [description, setDescription] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [estimatedUsers, setEstimatedUsers] = useState(100000);
  const [availabilityLevel, setAvailabilityLevel] = useState('99.99% (Alta Disponibilidad Multi-AZ)');
  const [selectedServices, setSelectedServices] = useState<string[]>(['ec2', 's3', 'rds', 'vpc']);
  const [migrationGoal, setMigrationGoal] = useState('Escalabilidad global, seguridad y reducción de costos de infraestructura física.');

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionName.trim() || !description.trim()) {
      alert('Por favor completa los campos obligatorios Nombre y Descripción.');
      return;
    }

    addProposal({
      solutionName,
      appType,
      description,
      selectedRegion,
      estimatedUsers: Number(estimatedUsers),
      availabilityLevel,
      selectedServices,
      migrationGoal,
    });

    // Reset form
    setSolutionName('');
    setDescription('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container (Left Side 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Registrar Nueva Propuesta Cloud
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Planifica la arquitectura especificando requerimientos clave y servicios requeridos
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre & Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la Solución *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: E-Commerce Cloud Standard v2"
                  value={solutionName}
                  onChange={(e) => setSolutionName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Aplicación
                </label>
                <select
                  value={appType}
                  onChange={(e) => setAppType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aplicación Web SPA + API REST">Aplicación Web SPA + API REST</option>
                  <option value="Plataforma E-Commerce Enterprise">Plataforma E-Commerce Enterprise</option>
                  <option value="Arquitectura de Microservicios Serverless">Arquitectura de Microservicios Serverless</option>
                  <option value="Sistema de Procesamiento Data Lake / Big Data">Sistema de Procesamiento Data Lake / Big Data</option>
                  <option value="Portal Institucional & CMS">Portal Institucional & CMS</option>
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Descripción Detallada *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explica brevemente el alcance de la aplicación empresarial..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Región & Usuarios & Disponibilidad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Región Seleccionada
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {GLOBAL_REGIONS.map((reg) => (
                    <option key={reg.id} value={reg.code}>
                      {reg.flag} {reg.name} ({reg.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Usuarios Estimados
                </label>
                <input
                  type="number"
                  step="5000"
                  value={estimatedUsers}
                  onChange={(e) => setEstimatedUsers(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nivel Disponibilidad SLA
                </label>
                <select
                  value={availabilityLevel}
                  onChange={(e) => setAvailabilityLevel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="99.9% (Estándar Single-AZ)">99.9% (Estándar Single-AZ)</option>
                  <option value="99.99% (Alta Disponibilidad Multi-AZ)">99.99% (Alta Disponibilidad Multi-AZ)</option>
                  <option value="99.999% (Misión Crítica Multi-Region)">99.999% (Misión Crítica Multi-Region)</option>
                </select>
              </div>
            </div>

            {/* Selección de Servicios Cloud */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Servicios Cloud Seleccionados (Selecciona al menos uno)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {INITIAL_AWS_SERVICES.map((srv) => {
                  const isChecked = selectedServices.includes(srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleServiceSelection(srv.id)}
                      className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                        isChecked
                          ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block">{srv.name}</span>
                        <span className="text-[10px] opacity-75">{srv.category}</span>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Objetivo de Migración */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Objetivo de la Migración
              </label>
              <input
                type="text"
                value={migrationGoal}
                onChange={(e) => setMigrationGoal(e.target.value)}
                placeholder="Ej: Alta disponibilidad, reducción de latencia en Latinoamérica y cumplimiento..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" /> Registrar Propuesta Cloud
            </button>
          </form>
        </div>

        {/* Sidebar Info & Best Practices */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-800">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Buenas Prácticas AWS
            </div>
            <h4 className="text-lg font-bold mb-2">Framework AWS Well-Architected</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Asegúrate de equilibrar los 6 pilares: Excelencia Operativa, Seguridad, Fiabilidad, Eficiencia en Rendimiento, Optimización de Costos y Sostenibilidad.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-AZ activado por defecto
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Auto Scaling según demanda
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cifrado de datos KMS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visualización de Propuestas Guardadas (Tabla / Cards) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Historial de Propuestas Registradas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listado de arquitecturas planificadas y persistidas en almacenamiento local
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {proposals.length} Propuesta(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proposals.map((prop) => (
            <div
              key={prop.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    {prop.appType}
                  </span>
                  <h4 className="text-base font-bold text-slate-800 dark:text-white mt-1">
                    {prop.solutionName}
                  </h4>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {prop.createdAt}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {prop.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Región AWS:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{prop.selectedRegion}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Usuarios Est.:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{prop.estimatedUsers.toLocaleString()}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Objetivo:</span>
                  <span className="text-slate-700 dark:text-slate-300">{prop.migrationGoal}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Servicios de la Arquitectura:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {prop.selectedServices.map((srvId) => {
                    const srv = INITIAL_AWS_SERVICES.find(s => s.id === srvId);
                    return (
                      <button
                        key={srvId}
                        onClick={() => srv && setSelectedServiceModal(srv)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors flex items-center gap-1"
                      >
                        <Server className="w-3 h-3 text-blue-500" />
                        {srv?.name || srvId}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
