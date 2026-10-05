import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  DollarSign,
  Globe,
  ShieldCheck,
  Network,
  Server,
  Cloud,
  X,
  Layers
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeTab } = useApp();
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planning', label: 'Planificación', icon: FileSpreadsheet },
    { id: 'costs', label: 'Costos', icon: DollarSign },
    { id: 'infrastructure', label: 'Infraestructura global', icon: Globe },
    { id: 'security', label: 'Seguridad e IAM', icon: ShieldCheck },
    { id: 'network', label: 'Arquitectura de red', icon: Network },
    { id: 'services', label: 'Servicios AWS', icon: Server },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 shrink-0 bg-[#0F172A] text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:h-screen overflow-y-auto border-r border-slate-800`}
      >
        <div>
          <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg tracking-tight leading-none">
                  CloudOps
                </h2>
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest block mt-0.5">
                  Dashboard
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Espacio de trabajo
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <NavLink
                  key={item.id}
                  to={`/${item.id}`}
                  onClick={onClose}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            {user?.app_metadata?.cloudops_role === 'admin' && <div className="pt-5">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Administración</p>
              <NavLink to="/admin/access-requests" onClick={onClose} className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ShieldCheck size={16} /> Solicitudes de acceso</NavLink>
            </div>}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-blue-400" />
            <div>
              <span className="block font-semibold text-slate-300">CloudOps</span>
              <span className="text-[10px] text-slate-500">Arquitectura AWS</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
