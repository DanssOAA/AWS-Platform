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
  const { iamUsers, security, setSecurity, securityChecks, toggleMfa, rotateKey } = useApp();
  const handleRotateKey = rotateKey;
  const handleToggleMfa = (username: string, _currentMfa: boolean) => toggleMfa(username);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Seguridad y acceso
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Controles de seguridad e IAM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Revisa accesos, cifrado, MFA y controles aplicados a la arquitectura.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(iamUsers.filter(u => u.mfaEnabled).length / iamUsers.length * 100)}%</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Cobertura MFA</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{securityChecks.filter(c => c.status !== 'green').length}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Controles por revisar</span>
            </div>
          </div>
        </div>
      </div>

      <section className="panel space-y-4"><h3 className="font-bold">Controles de seguridad</h3><p className="text-sm text-slate-500">Activa o desactiva controles para evaluar el nivel de protección de la arquitectura.</p><div className="flex flex-wrap gap-6">{([{ key: 'encryption', label: 'Cifrado de datos' }, { key: 'privateDatabase', label: 'Base de datos privada' }, { key: 'compliance', label: 'Revisión de cumplimiento' }] as const).map(item => <label key={item.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={security[item.key]} onChange={e => setSecurity(prev => ({ ...prev, [item.key]: e.target.checked }))} />{item.label}</label>)}</div><p className="text-xs">Estado: <span className="text-green-600">Correcto</span> · <span className="text-amber-600">Revisar</span> · <span className="text-red-600">Crítico</span></p></section>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" /> Responsabilidad compartida
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          AWS protege la <strong>infraestructura</strong>. El cliente gestiona <strong>datos, accesos y configuración</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" /> Cliente
              </h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Seguridad en la nube
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <StatusBadge status={security.encryption ? "green" : "red"} text="Cifrado con KMS" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Permisos IAM y MFA" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="yellow" text="Security Groups y firewall" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Sistema operativo de EC2" />
              </li>
            </ul>
          </div>
          <div className="border-2 border-orange-500/40 bg-orange-50/40 dark:bg-orange-950/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-orange-900 dark:text-orange-300 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-600" /> AWS
              </h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Seguridad de la nube
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Centros de datos" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Hardware y servidores" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Virtualización con AWS Nitro" />
              </li>
              <li className="flex items-center gap-2">
                <StatusBadge status="green" text="Red global" />
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" /> Identidades y accesos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usuarios, roles, MFA y claves de acceso
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Usuario IAM</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado MFA</th>
                <th className="px-4 py-3">Access Keys</th>
                <th className="px-4 py-3">Políticas</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {iamUsers.map((usr) => (
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
                          <ShieldCheck className="w-3.5 h-3.5" /> Activo
                        </span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Desactivado
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {!usr.accessKeyActive ? 'Inactiva' : security.rotatedKeys.includes(usr.id) ? 'Rotación registrada' : 'Pendiente de revisión'}
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
                      <RotateCw className="w-3 h-3" /> Rotar clave
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-emerald-600" /> Revisión de controles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {securityChecks.map((check) => (
            <SecurityCard key={check.id} check={check} />
          ))}
        </div>
      </div>
    </div>
  );
};
