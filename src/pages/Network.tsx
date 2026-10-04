import React, { useState } from 'react';
import { NETWORK_ARCHITECTURE } from '../data/awsServices';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import {
  Network,
  Globe,
  Zap,
  ShieldCheck,
  Server,
  Database,
  ArrowRight,
  Lock,
  ArrowDown,
  Cpu,
  Layers,
  Activity,
  Play
} from 'lucide-react';

export const NetworkPage: React.FC = () => {
  const { addNotification } = useApp();
  const [selectedNode, setSelectedNode] = useState<string | null>('net-4');
  const [isSimulatingTraffic, setIsSimulatingTraffic] = useState(false);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'INTERNET': return Globe;
      case 'Route 53': return Network;
      case 'CloudFront': return Zap;
      case 'VPC': return Layers;
      case 'Subnet Pública': return ShieldCheck;
      case 'Subnet Privada': return Lock;
      case 'ALB': return Cpu;
      case 'EC2': return Server;
      case 'RDS': return Database;
      default: return Network;
    }
  };

  const activeNodeInfo = NETWORK_ARCHITECTURE.find(n => n.id === selectedNode) || NETWORK_ARCHITECTURE[0];

  const handleSimulateTraffic = () => {
    setIsSimulatingTraffic(true);
    addNotification('info', 'Simulador de Red', 'Enviando peticiones HTTPS desde INTERNET a través de Route 53, CloudFront, ALB y VPC...');
    setTimeout(() => {
      setIsSimulatingTraffic(false);
      addNotification('success', 'Tráfico Procesado', 'Respuesta HTTP 200 OK generada exitosamente desde EC2/RDS.');
    }, 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Network className="w-4 h-4" /> Arquitectura de Red Cloud & VPC
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Diagrama Interactivo de Flujo de Tráfico
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Representación dinámica e interactiva del tráfico seguro desde Internet hacia Zonas de Borde (Route 53, CloudFront CDN) y la red virtual aislada (Amazon VPC con subredes públicas y privadas).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateTraffic}
              disabled={isSimulatingTraffic}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isSimulatingTraffic ? 'animate-spin' : ''}`} />
              {isSimulatingTraffic ? 'Simulando Paquetes...' : 'Simular Tráfico de Datos'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Visual Web Diagram Container */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 lg:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
            Flujo de Datos Multicapa AWS
          </span>
          <h3 className="text-2xl font-black mt-2">Diagrama de Infraestructura de Red</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
            Haz clic en cualquier componente para inspeccionar sus reglas de ruteo y puertos
          </p>
        </div>

        {/* Dynamic Nodes Flow Layout */}
        <div className="space-y-8">
          {/* Level 1: Edge Network (Internet, Route 53, CloudFront) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {NETWORK_ARCHITECTURE.slice(0, 3).map((node) => {
              const Icon = getNodeIcon(node.type);
              const isSelected = selectedNode === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node.id);
                    addNotification('info', 'Nodo Seleccionado', `Inspeccionando componente de red: ${node.name}`);
                  }}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-900/60 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/30 scale-102'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                  } ${isSimulatingTraffic ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
                      <Icon className="w-6 h-6" />
                    </div>
                    <StatusBadge status="green" text={node.status} />
                  </div>

                  <div className="mt-4">
                    <h4 className="font-bold text-base text-white">{node.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>
                  </div>

                  {node.ipRange && (
                    <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-blue-300">
                      Rango: {node.ipRange}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Animated Connecting Flow Indicator */}
          <div className="flex items-center justify-center my-4">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-blue-400 ${isSimulatingTraffic ? 'animate-bounce border-blue-500 text-white bg-blue-600' : 'animate-pulse-flow'}`}>
              <span>Tráfico cifrado SSL/TLS (HTTPS Port 443)</span>
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>

          {/* Level 2: Amazon VPC Container (Nested Box) */}
          <div className={`rounded-3xl p-6 border-2 transition-all ${selectedNode === 'net-4' ? 'border-blue-500 bg-blue-950/20' : 'border-slate-800 bg-slate-900/40'}`}>
            <div
              onClick={() => {
                setSelectedNode('net-4');
                addNotification('info', 'Nodo Seleccionado', 'Inspeccionando Amazon VPC (10.0.0.0/16)');
              }}
              className="flex items-center justify-between cursor-pointer mb-6 pb-3 border-b border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-white">Amazon VPC (Virtual Private Cloud)</h4>
                  <span className="text-xs font-mono text-indigo-300">CIDR Block: 10.0.0.0/16 | Región: us-east-1</span>
                </div>
              </div>
              <StatusBadge status="green" text="VPC Aislada OK" />
            </div>

            {/* Subnets Layout Inside VPC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subnet Pública */}
              <div
                onClick={() => {
                  setSelectedNode('net-5');
                  addNotification('info', 'Nodo Seleccionado', 'Inspeccionando Subnet Pública (10.0.1.0/24)');
                }}
                className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                  selectedNode === 'net-5' || selectedNode === 'net-7'
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Subnet Pública (10.0.1.0/24)
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-300 mb-4">Conectada a Internet Gateway (IGW) para tráfico web entrante.</p>

                {/* Internal Resource inside Public Subnet */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode('net-7');
                    addNotification('info', 'Nodo Seleccionado', 'Inspeccionando Application Load Balancer');
                  }}
                  className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center gap-3 hover:border-emerald-400 transition-colors"
                >
                  <Cpu className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-white">Application Load Balancer (ALB)</h5>
                    <span className="text-[10px] text-slate-400">Listener: Port 80/443 → EC2 Target Group</span>
                  </div>
                </div>
              </div>

              {/* Subnet Privada */}
              <div
                onClick={() => {
                  setSelectedNode('net-6');
                  addNotification('info', 'Nodo Seleccionado', 'Inspeccionando Subnet Privada (10.0.2.0/24)');
                }}
                className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                  selectedNode === 'net-6' || selectedNode === 'net-8' || selectedNode === 'net-9'
                    ? 'border-amber-500 bg-amber-950/30'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Subnet Privada (10.0.2.0/24)
                  </span>
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs text-slate-300 mb-4">Sin acceso directo desde Internet. Ruteo a través de NAT Gateway.</p>

                {/* Internal Resources inside Private Subnet */}
                <div className="space-y-2">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode('net-8');
                      addNotification('info', 'Nodo Seleccionado', 'Inspeccionando EC2 Compute Cluster');
                    }}
                    className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <h5 className="font-bold text-xs text-white">EC2 Compute Cluster</h5>
                        <span className="text-[10px] text-slate-400">Auto Scaling Group (2-6 instancias)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-blue-300">10.0.2.45</span>
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode('net-9');
                      addNotification('info', 'Nodo Seleccionado', 'Inspeccionando Amazon RDS Database');
                    }}
                    className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <h5 className="font-bold text-xs text-white">Amazon RDS PostgreSQL (Multi-AZ)</h5>
                        <span className="text-[10px] text-slate-400">Base de datos aislada cifrada</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-emerald-300">Port 5432</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Component Technical Detail Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-base">
                {activeNodeInfo.name}
              </h4>
              <span className="text-xs text-slate-400 font-mono">Tipo: {activeNodeInfo.type}</span>
            </div>
          </div>
          <StatusBadge status="green" text={activeNodeInfo.status} />
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {activeNodeInfo.description}
        </p>

        {activeNodeInfo.connectedTo && activeNodeInfo.connectedTo.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Conectado a:</span>
            <div className="flex flex-wrap gap-1.5">
              {activeNodeInfo.connectedTo.map((targetId) => {
                const target = NETWORK_ARCHITECTURE.find(n => n.id === targetId);
                return (
                  <span
                    key={targetId}
                    onClick={() => {
                      setSelectedNode(targetId);
                      addNotification('info', 'Navegación de Red', `Saltando al componente: ${target?.name}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold cursor-pointer hover:bg-blue-100 flex items-center gap-1"
                  >
                    {target?.name} <ArrowRight className="w-3 h-3" />
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
