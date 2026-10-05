import { errorMessage } from '../lib/supabase';
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
  const { proposals, addProposal, setSelectedServiceModal, activeProposal, activateProposal, proposalsLoading } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionName.trim() || !description.trim()) {
      setError('Completa el nombre y la descripción.');
      return;
    }

    if (!selectedServices.length || estimatedUsers < 1) { setError('Selecciona un servicio e indica al menos un usuario.'); return; }
    setSaving(true); setError('');
    try {
    await addProposal({
      solutionName,
      appType,
      description,
      selectedRegion,
      estimatedUsers: Number(estimatedUsers),
      availabilityLevel,
      selectedServices,
      migrationGoal,
    });

    setSolutionName('');
    setDescription('');
    } catch (failure) { setError(errorMessage(failure)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Nueva propuesta
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define requisitos, región y servicios.
              </p>
            </div>
          </div>

          {error && <p role="alert" className="error-box mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="planning-solutionName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la solución *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej.: Tienda online"
                  id="planning-solutionName"
                  value={solutionName}
                  onChange={(e) => setSolutionName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="planning-appType" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de aplicación
                </label>
                <select
                  id="planning-appType"
                  value={appType}
                  onChange={(e) => setAppType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aplicación Web SPA + API REST">Aplicación web y API REST</option>
                  <option value="Plataforma E-Commerce Enterprise">Comercio electrónico</option>
                  <option value="Arquitectura de Microservicios Serverless">Microservicios serverless</option>
                  <option value="Sistema de Procesamiento Data Lake / Big Data">Data Lake / Big Data</option>
                  <option value="Portal Institucional & CMS">Portal y CMS</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="planning-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Descripción *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe el alcance de la aplicación"
                id="planning-description"
                  value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="planning-selectedRegion" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Región AWS
                </label>
                <select
                  id="planning-selectedRegion"
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
                <label htmlFor="planning-estimatedUsers" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Usuarios estimados
                </label>
                <input
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                  id="planning-estimatedUsers"
                  value={estimatedUsers}
                  onChange={(e) => setEstimatedUsers(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="planning-availabilityLevel" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Disponibilidad objetivo
                </label>
                <select
                  id="planning-availabilityLevel"
                  value={availabilityLevel}
                  onChange={(e) => setAvailabilityLevel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="99.9% (Estándar Single-AZ)">99.9% · Single-AZ</option>
                  <option value="99.99% (Alta Disponibilidad Multi-AZ)">99.99% · Alta disponibilidad Multi-AZ</option>
                  <option value="99.999% (Misión Crítica Multi-Region)">99.999% · Multi-Region</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Servicios AWS (mínimo uno)
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
            <div>
              <label htmlFor="planning-migrationGoal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Objetivo de la migración
              </label>
              <input
                type="text"
                id="planning-migrationGoal"
                  value={migrationGoal}
                onChange={(e) => setMigrationGoal(e.target.value)}
                placeholder="Ej.: Alta disponibilidad y menor latencia"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || proposalsLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" /> {saving ? 'Guardando…' : 'Guardar propuesta'}
            </button>
          </form>
        </div>
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-800">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Criterios de diseño
            </div>
            <h4 className="text-lg font-bold mb-2">AWS Well-Architected</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Operación, seguridad, fiabilidad, rendimiento, costos y sostenibilidad.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Planificar Multi-AZ según disponibilidad
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Auto Scaling según demanda
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Evaluar cifrado de datos con KMS
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Propuestas guardadas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Activa una propuesta para cargar su región y servicios.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {proposals.length} propuestas
          </span>
        </div>

        {!proposalsLoading && !proposals.length && <p className="text-sm text-slate-500 py-6">Aún no hay propuestas guardadas.</p>}
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

<button type="button" onClick={() => activateProposal(prop.id)} disabled={activeProposal?.id === prop.id} className="primary-button">{activeProposal?.id === prop.id ? 'Propuesta activa' : 'Activar propuesta'}</button>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {prop.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Región AWS:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{prop.selectedRegion}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Usuarios estimados:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{prop.estimatedUsers.toLocaleString()}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Objetivo:</span>
                  <span className="text-slate-700 dark:text-slate-300">{prop.migrationGoal}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Servicios incluidos:
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
