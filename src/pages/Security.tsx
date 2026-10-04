import React from 'react';
import { SECURITY_CHECKS, IAM_USERS } from '../data/awsServices';
import { SecurityCard } from '../components/SecurityCard';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  UserCheck,
  Key,
  Lock,
  FileCheck,
  AlertTriangle,
  Server,
  User,
  RotateCw
} from 'lucide-react';

export const Security: React.FC = () => {
  const { addNotification } = useApp();

  const handleRotateKey = (username: string) => {
    addNotification('success', 'Llave Rotada', `Se ha generado y rotado una nueva Access Key para el usuario IAM: ${username}`);
  };

  const handleToggleMfa = (username: string, currentMfa: boolean) => {
    addNotification('info', 'Autenticación MFA', `MFA fue verificado/actualizado correctamente para ${username}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Seguridad, Identidad y Cumplimiento
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Modelo de Responsabilidad Compartida & IAM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Auditoría integral de controles de seguridad, cifrado de datos en reposo y tránsito, y administración de acceso con principio de menor privilegio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">95%</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">MFA Activo</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">2</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Revisiones Pendientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Responsibility Model Diagram */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" /> Modelo de Responsabilidad Compartida de AWS
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          AWS es responsable de la seguridad <strong>DE LA nube</strong> (hardware, infraestructura física, red), mientras que el Cliente es responsable de la seguridad <strong>EN LA nube</strong> (datos, configuraciones, usuarios IAM, grupos de seguridad).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Responsabilidad del Cliente */}
          <div className="border-2 border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" /> Responsabilidad del Cliente
              </h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Seguridad EN la Nube
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Datos del Cliente (Cifrado KMS)" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Gestión IAM y Permisos MFA" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="yellow" text="Security Groups y Firewall VPC" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Configuración del Sistema Operativo EC2" />
              </li>
            </ul>
          </div>

          {/* Responsabilidad de AWS */}
          <div className="border-2 border-orange-500/40 bg-orange-50/40 dark:bg-orange-950/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-orange-900 dark:text-orange-300 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-600" /> Responsabilidad de AWS
              </h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Seguridad DE la Nube
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Infraestructura Física Centros de Datos" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Hardware y Servidores Físicos" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Capa de Virtualización (AWS Nitro)" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Red Global y Enlaces Submarinos" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* IAM User Management Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" /> Administración de Identidades y Accesos (IAM)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usuarios con acceso a la consola y APIs, estado de MFA y acciones de seguridad
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Usuario IAM</th>
                <th className="px-4 py-3">Rol Principal</th>
                <th className="px-4 py-3">Estado MFA</th>
                <th className="px-4 py-3">Access Keys</th>
                <th className="px-4 py-3">Políticas Adjuntas</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {IAM_USERS.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" /> {usr.username}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[11px]">
                      {usr.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleMfa(usr.username, usr.mfaEnabled)}
                      className="cursor-pointer"
                    >
                      {usr.mfaEnabled ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Activo (OK)
                        </span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Desactivado
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {usr.accessKeyActive ? 'Llave Activa' : 'Inactiva'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {usr.policiesAttached.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRotateKey(usr.username)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" /> Rotar Key
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Checks Audit Cards Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-emerald-600" /> Auditoría Completa de Seguridad y Cumplimiento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SECURITY_CHECKS.map((check) => (
            <SecurityCard key={check.id} check={check} />
          ))}
        </div>
      </div>
    </div>
  );
};
