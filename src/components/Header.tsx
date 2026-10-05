import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/supabase';
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
    setActiveTab,
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

  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const logout = async () => { setSigningOut(true); try { await signOut(); } catch (error) { addNotification('error', 'No se pudo cerrar sesión', errorMessage(error)); } finally { setSigningOut(false); } };
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    admin: { title: 'Solicitudes de acceso', subtitle: 'Administración de CloudOps' },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Resumen de arquitectura, costos y seguridad',
    },
    planning: {
      title: 'Planificación Cloud',
      subtitle: 'Propuestas y requisitos de arquitectura',
    },
    costs: {
      title: 'Costos',
      subtitle: 'Presupuesto mensual y proyección anual',
    },
    infrastructure: {
      title: 'Infraestructura global',
      subtitle: 'Regiones, zonas de disponibilidad y latencia',
    },
    security: {
      title: 'Seguridad e IAM',
      subtitle: 'Gestión de accesos, controles y cumplimiento',
    },
    network: {
      title: 'Arquitectura de red',
      subtitle: 'Conexiones y subredes de la arquitectura',
    },
    services: {
      title: 'Servicios AWS',
      subtitle: 'Servicios disponibles para la arquitectura',
    },
  };

  const currentInfo = pageTitles[activeTab] || pageTitles.dashboard;

  const handleAwsStatusClick = () => {
    addNotification('info', 'Estado Global AWS', 'Todos los servicios en las 33 regiones están 100% operativos.');
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="px-4 lg:px-8 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Abrir menú"
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
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Buscar servicio AWS"
              onKeyDown={e => { if (e.key === 'Enter') setActiveTab('services'); }}
              type="text"
              placeholder="Buscar servicio AWS..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <select
              aria-label="Región activa"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                addNotification('info', 'Región actualizada', `Región activa: ${e.target.value}`);
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
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(prev => !prev)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer relative"
              title="Ver notificaciones"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotificationsMenu && (
              <div className="fixed right-4 top-28 mt-2 w-[min(320px,calc(100vw-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" /> Notificaciones
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
        </div>
      </div>
      <div className="px-4 lg:px-8 pb-3 flex flex-wrap justify-end items-center gap-3 text-xs"><span className="text-slate-500 break-all">{user?.email}</span><span className="text-green-600 font-semibold">Sesión activa</span><button disabled={signingOut} onClick={logout} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button></div>
    </header>
  );
};
