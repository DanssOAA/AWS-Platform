import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GLOBAL_REGIONS } from '../data/awsServices';
import {
  Sun,
  Moon,
  Globe,
  Search,
  Bell,
  Cloud,
  CheckCircle2,
  Menu,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    activeTab,
    isDarkMode,
    toggleDarkMode,
    selectedRegion,
    setSelectedRegion,
    globalSearch,
    setGlobalSearch,
    notifications,
    removeNotification,
    addNotification
  } = useApp();

  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard General',
      subtitle: 'Resumen ejecutivo de la solución Cloud, arquitectura, costos y seguridad',
    },
    planning: {
      title: 'Planificación Cloud',
      subtitle: 'Formulario de registro y propuesta de solución de infraestructura en AWS',
    },
    costs: {
      title: 'Costos y Economía Cloud',
      subtitle: 'Calculadora dinámica de estimación mensual, anual y exportación de reportes',
    },
    infrastructure: {
      title: 'Infraestructura Global AWS',
      subtitle: 'Visualización de regiones en el Mapa Mundial, zonas de disponibilidad y estado de red',
    },
    security: {
      title: 'Seguridad e Identidades (IAM)',
      subtitle: 'Modelo de responsabilidad compartida, auditoría y administración IAM',
    },
    network: {
      title: 'Arquitectura de Red Cloud',
      subtitle: 'Diagrama interactivo de tráfico desde Internet, Route 53, CloudFront y VPC',
    },
    services: {
      title: 'Catálogo de Servicios AWS',
      subtitle: 'Explorador de componentes, filtrado por categorías y detalles técnicos',
    },
  };

  const currentInfo = pageTitles[activeTab] || pageTitles.dashboard;

  const handleAwsStatusClick = () => {
    addNotification('info', 'Estado Global AWS', 'Todos los servicios en las 33 regiones están 100% operativos.');
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="px-4 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Title & Mobile Menu button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Abrir Menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {currentInfo.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar servicio AWS..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Region Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                addNotification('info', 'Cambio de Región', `Región activa cambiada a ${e.target.value}`);
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {GLOBAL_REGIONS.map((reg) => (
                <option key={reg.id} value={reg.code} className="bg-white dark:bg-slate-900">
                  {reg.flag} {reg.code}
                </option>
              ))}
            </select>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(prev => !prev)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer relative"
              title="Ver Notificaciones del Sistema"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Menu Popup */}
            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" /> Notificaciones Recientes
                  </h4>
                  <button
                    onClick={() => setShowNotificationsMenu(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{n.title}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">{n.message}</span>
                        </div>
                        <button
                          onClick={() => removeNotification(n.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No hay notificaciones pendientes.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Global AWS Health Badge (Interactive) */}
          <button
            onClick={handleAwsStatusClick}
            className="hidden xl:flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Cloud className="w-4 h-4 text-emerald-500" />
            <span>AWS Status: Normal</span>
          </button>
        </div>
      </div>
    </header>
  );
};
