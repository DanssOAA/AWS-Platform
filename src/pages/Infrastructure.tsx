import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GLOBAL_REGIONS } from '../data/awsServices';
import { RegionCard } from '../components/RegionCard';
import {
  Globe,
  Server,
  Activity,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Radio,
  Users,
  ShoppingBag,
  TrendingUp,
  Package,
  Calendar,
  Check,
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export const Infrastructure: React.FC = () => {
  const {
    selectedRegion,
    setSelectedRegion,
    addNotification,
    costEstimates,
    clearAllDashboardData,
    resetDefaultData
  } = useApp();

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);

  const currentRegion = GLOBAL_REGIONS.find(r => r.code === selectedRegion) || GLOBAL_REGIONS[0];
  const activeHoverRegion = GLOBAL_REGIONS.find(r => r.code === hoveredRegion) || currentRegion;

  // Exact Nodes & Coordinates calibrated for viewBox="0 0 1000 500"
  const mapNodes = [
    {
      id: 'us-west-2',
      code: 'us-west-2',
      name: 'USA - West',
      fullName: 'US West (Oregon)',
      x: 180, // 18.0%
      y: 175, // 35.0%
      colors: ['bg-emerald-400 border-emerald-200'],
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    },
    {
      id: 'us-east-1',
      code: 'us-east-1',
      name: 'USA - East (Virginia)',
      fullName: 'US East (N. Virginia)',
      x: 270, // 27.0%
      y: 195, // 39.0%
      colors: ['bg-emerald-400 border-emerald-200', 'bg-purple-500 border-purple-300'],
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.8)]',
    },
    {
      id: 'sa-east-1',
      code: 'sa-east-1',
      name: 'South America (São Paulo)',
      fullName: 'South America (São Paulo)',
      x: 360, // 36.0%
      y: 365, // 73.0%
      colors: ['bg-emerald-400 border-emerald-200'],
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    },
    {
      id: 'eu-central-1',
      code: 'eu-central-1',
      name: 'EU (Frankfurt, Alemania)',
      fullName: 'EU (Frankfurt, Alemania)',
      x: 515, // 51.5%
      y: 145, // 29.0%
      colors: ['bg-purple-500 border-purple-300', 'bg-emerald-400 border-emerald-200'],
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    },
    {
      id: 'ap-northeast-1',
      code: 'ap-northeast-1',
      name: 'Asia (Hong Kong)',
      fullName: 'Asia (Hong Kong / Tokio)',
      x: 790, // 79.0%
      y: 215, // 43.0%
      colors: ['bg-emerald-400 border-emerald-200'],
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    },
    {
      id: 'ap-southeast-1',
      code: 'ap-southeast-1',
      name: 'Asia Pacific (Singapore)',
      fullName: 'Asia Pacific (Singapore)',
      x: 770, // 77.0%
      y: 310, // 62.0%
      colors: ['bg-emerald-400 border-emerald-200'],
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    }
  ];

  const handleTestLatency = () => {
    addNotification('success', 'Prueba de Latencia Global', `Conexión directa establecida con ${currentRegion.name}: ${currentRegion.latencyMs} ms.`);
  };

  const handleSelectRegionFromMap = (code: string, name: string) => {
    setSelectedRegion(code);
    addNotification('info', 'Región AWS Seleccionada', `Has fijado como principal: ${name} (${code})`);
  };

  const handleConfirmClear = () => {
    clearAllDashboardData();
    setShowConfirmClearModal(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* TOP METRICS ROW (Matching Screenshot Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Usuarios en línea
            </span>
            <div className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              {costEstimates.length > 0 ? '1,426' : '0'}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">+12% vs ayer</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Pedidos hoy
            </span>
            <div className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              {costEstimates.length > 0 ? '15' : '0'}
            </div>
            <span className="text-[10px] text-blue-600 font-bold">+8% vs ayer</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Ventas hoy
            </span>
            <div className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              {costEstimates.length > 0 ? '7 de 9' : '0 de 9'}
            </div>
            <span className="text-[10px] text-indigo-600 font-bold">
              {costEstimates.length > 0 ? '77.8% completado' : '0% completado'}
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Productos
            </span>
            <div className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              10 K+
            </div>
            <span className="text-[10px] text-slate-400">En catálogo</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Días desde lanzamiento
            </span>
            <div className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              10 días
            </div>
            <span className="text-[10px] text-slate-400">Desde 15 Sep 2024</span>
          </div>
        </div>
      </div>

      {/* MAP CONTAINER CARD */}
      <div className="bg-[#0b1329] text-white rounded-3xl p-6 shadow-2xl border border-slate-800">
        
        {/* Map Header & Right Legend & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Mapa Global de Actividad en Tiempo Real
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoreo de usuarios activos y pedidos en tiempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Right Legend Pills */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-slate-300 text-[11px]">Usuarios activos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <span className="text-slate-300 text-[11px]">Pedidos recientes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                <span className="text-slate-300 text-[11px]">Ventas completadas</span>
              </div>
            </div>

            {/* Action Buttons in Map Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestLatency}
                className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Probar latencia global"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Latencia
              </button>

              <button
                onClick={() => setShowConfirmClearModal(true)}
                className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Vaciar datos del Mapa e Infraestructura"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar
              </button>

              <button
                onClick={resetDefaultData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restaurar datos por defecto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> Restaurar
              </button>
            </div>
          </div>
        </div>

        {/* SATELLITE MAP CONTAINER WITH viewBox="0 0 1000 500" PERFECT ALIGNMENT */}
        <div className="relative w-full aspect-[2/1] rounded-2xl border border-slate-800 overflow-hidden bg-[#071327]">
          
          {/* Real Satellite World Map Background Image */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
            alt="Real Satellite Earth Map"
            className="absolute inset-0 w-full h-full object-cover opacity-85 filter contrast-125 brightness-90 saturate-110"
          />

          {/* Dark Overlay gradient for crisp contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none" />

          {/* SVG Canvas overlay using viewBox="0 0 1000 500" for exact pixel alignment */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 500">
            {/* Perfectly Calibrated White Curved Dashed Connecting Arcs */}
            <g className="stroke-white stroke-[2] stroke-dasharray-6 stroke-linecap-round drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
              {/* Arc 1: USA West (180, 175) -> USA East (270, 195) */}
              <path d="M 180 175 Q 225 155 270 195" fill="none" className="animate-pulse" />

              {/* Arc 2: USA East (270, 195) -> South America (360, 365) */}
              <path d="M 270 195 Q 300 280 360 365" fill="none" className="animate-pulse" />

              {/* Arc 3: USA East (270, 195) -> EU Frankfurt (515, 145) */}
              <path d="M 270 195 Q 380 90 515 145" fill="none" className="animate-pulse" />

              {/* Arc 4: EU Frankfurt (515, 145) -> Asia Hong Kong (790, 215) */}
              <path d="M 515 145 Q 650 110 790 215" fill="none" className="animate-pulse" />

              {/* Arc 5: Asia Hong Kong (790, 215) -> Asia Pacific Singapore (770, 310) */}
              <path d="M 790 215 Q 805 260 770 310" fill="none" />
            </g>
          </svg>

          {/* MAP REGION PINS & TEXT LABELS */}
          {mapNodes.map((node) => {
            const isSelected = selectedRegion === node.code;

            return (
              <div
                key={node.id}
                style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 500) * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                onClick={() => handleSelectRegionFromMap(node.code, node.name)}
                onMouseEnter={() => setHoveredRegion(node.code)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                {/* Pins and Text Label Container */}
                <div className="flex items-center gap-2">
                  {/* Glowing Dots Cluster */}
                  <div className="flex items-center -space-x-1.5">
                    {node.colors.map((color, idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border border-white/90 ${color} ${node.glow} ${
                          isSelected ? 'ring-4 ring-emerald-400/60 scale-125 animate-pulse' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* White Text Label */}
                  <span className={`text-xs font-bold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-all ${
                    isSelected ? 'text-emerald-300 underline font-extrabold scale-105' : 'group-hover:text-blue-300'
                  }`}>
                    {node.name}
                  </span>
                </div>
              </div>
            );
          })}

          {/* FLOATING BOTTOM-LEFT CARD */}
          <div className="absolute bottom-4 left-4 z-30 bg-[#0f172a]/95 border border-slate-700/90 backdrop-blur-md rounded-2xl p-4 text-xs text-white max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-300">US</span>
                <div>
                  <h4 className="font-bold text-xs text-white">{activeHoverRegion.name}</h4>
                  <span className="text-[10px] font-mono text-blue-400">{activeHoverRegion.code}</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {activeHoverRegion.status}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-300 text-[11px] mb-3">
              <div>Ubicación: <strong>{activeHoverRegion.location}</strong></div>
              <div>Latencia Estimada: <strong className="text-emerald-400">{activeHoverRegion.latencyMs} ms</strong></div>
              <div>Zonas (AZs): <strong>{activeHoverRegion.availabilityZones} Zonas</strong></div>
            </div>

            <button
              onClick={() => handleSelectRegionFromMap(activeHoverRegion.code, activeHoverRegion.name)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30"
            >
              <Check className="w-4 h-4" /> Fijar Región Principal
            </button>
          </div>
        </div>
      </div>

      {/* Grid of all AWS Global Region Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          Todas las Regiones Globales de AWS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GLOBAL_REGIONS.map((reg) => (
            <RegionCard key={reg.id} region={reg} />
          ))}
        </div>
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
                  ¿Vaciar Infraestructura y Datos?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción restablecerá las métricas de red y vaciará las estimaciones activas.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              Podrás restaurar los datos por defecto en cualquier momento utilizando el botón "Restaurar".
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
                <Trash2 className="w-4 h-4" /> Sí, Vaciar Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
