import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Play, Network, Globe, Layers, Server, Database, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Node = { id: string; name: string; category: string; purpose: string; subnet: string; public: boolean; description: string; service?: string };
const nodes: Node[] = [
  { id: 'internet', name: 'INTERNET', category: 'Origen', purpose: 'Entrada de usuarios', subnet: 'Red pública externa', public: true, description: 'Los clientes consultan DNS y establecen una conexión HTTPS con el punto de entrada.' },
  { id: 'route53', name: 'Route 53', category: 'DNS', purpose: 'Resolver el nombre de dominio', subnet: 'Servicio global, fuera de VPC', public: true, description: 'Devuelve el destino del dominio. DNS resuelve nombres; no transporta la petición HTTP.', service: 'route53' },
  { id: 'cloudfront', name: 'CloudFront', category: 'CDN', purpose: 'Distribuir contenido y terminar TLS', subnet: 'Ubicaciones de borde', public: true, description: 'Entrega contenido desde caché y reenvía solicitudes al origen cuando es necesario.', service: 'cloudfront' },
  { id: 'vpc', name: 'Amazon VPC', category: 'Red virtual', purpose: 'Aislar recursos y rutas', subnet: '10.0.0.0/16', public: false, description: 'Contiene las subredes pública, privada de aplicación y privada de base de datos.', service: 'vpc' },
  { id: 'public', name: 'Public Subnet', category: 'Subred pública', purpose: 'Alojar el punto de entrada', subnet: '10.0.1.0/24', public: true, description: 'Aloja el balanceador y tiene una ruta al Internet Gateway.' },
  { id: 'alb', name: 'Application Load Balancer', category: 'Balanceo', purpose: 'Distribuir solicitudes HTTPS', subnet: 'Public Subnet · 10.0.1.0/24', public: true, description: 'Distribuye tráfico hacia EC2. Requiere subredes en al menos dos zonas de disponibilidad.' },
  { id: 'app', name: 'Private App Subnet', category: 'Subred de aplicación', purpose: 'Aislar la capa de cómputo', subnet: '10.0.2.0/24', public: false, description: 'Recibe tráfico únicamente desde el balanceador según los grupos de seguridad.' },
  { id: 'ec2', name: 'Amazon EC2', category: 'Computación', purpose: 'Ejecutar la aplicación', subnet: 'Private App Subnet · 10.0.2.0/24', public: false, description: 'Procesa solicitudes de aplicación y consulta RDS mediante conexiones autorizadas.', service: 'ec2' },
  { id: 'db', name: 'Private DB Subnet', category: 'Subred de datos', purpose: 'Separar la persistencia', subnet: '10.0.3.0/24', public: false, description: 'Aísla las bases de datos. RDS requiere un grupo de subredes en varias zonas.' },
  { id: 'rds', name: 'Amazon RDS', category: 'Base de datos', purpose: 'Persistir datos relacionales', subnet: 'Private DB Subnet · 10.0.3.0/24', public: false, description: 'Conexiones PostgreSQL por el puerto 5432 desde la aplicación.', service: 'rds' },
];
const icons = { internet: Globe, route53: Network, cloudfront: Zap, vpc: Layers, ec2: Server, rds: Database };
export function NetworkPage() {
  const { selectedRegion, architectureServices, security, addNotification } = useApp();
  const [selected, setSelected] = useState('vpc');
  const [simulating, setSimulating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const active = nodes.find(node => node.id === selected)!;
  const missing = ['route53', 'cloudfront', 'vpc', 'ec2', 'rds'].filter(id => !architectureServices.includes(id));
  const nodeButton = (id: string) => {
    const node = nodes.find(n => n.id === id)!;
    const Icon = icons[id as keyof typeof icons] ?? Layers;
    const included = !node.service || architectureServices.includes(node.service);
    return <button type="button" aria-pressed={selected === id} onClick={() => setSelected(id)} className={`w-full text-left rounded-xl p-4 border transition-colors ${selected === id ? 'border-blue-400 bg-blue-950 ring-2 ring-blue-500' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}><div className="flex items-center gap-3"><Icon size={20} className="shrink-0 text-blue-300" /><span className="font-semibold text-sm">{node.name}</span></div><p className="text-xs text-slate-400 mt-2">{node.purpose}</p>{node.service && <span className={`block mt-2 text-xs ${included ? 'text-green-400' : 'text-amber-300'}`}>{included ? 'Incluido' : 'No incluido'}</span>}</button>;
  };
  function simulate() {
    if (missing.length) { addNotification('warning', 'Flujo incompleto', `Servicios pendientes: ${missing.join(', ')}.`); return; }
    setSimulating(true);
    timer.current = setTimeout(() => { setSimulating(false); addNotification('info', 'Recorrido completado', 'DNS → CloudFront → ALB → EC2 → RDS.'); }, 2500);
  }
  return <div className="space-y-6">
    <section className="panel flex flex-wrap justify-between items-center gap-4"><div><h2 className="text-xl font-bold">Diagrama de red</h2><p className="text-sm text-slate-500 mt-2">Componentes y conexiones. Región: {selectedRegion}.</p></div><button className="primary-button" onClick={simulate} disabled={simulating}><Play size={16} />{simulating ? 'Mostrando recorrido…' : 'Ver recorrido'}</button></section>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <section className={`bg-slate-950 rounded-2xl p-4 sm:p-6 text-white space-y-3 min-w-0 ${simulating ? 'animate-pulse' : ''}`} aria-label="Diagrama de arquitectura">
        <p className="text-xs text-slate-400 mb-4">Arquitectura de tres capas</p>
        <div className="max-w-sm mx-auto space-y-2">{nodeButton('internet')}<ArrowDown className="mx-auto text-slate-500" />{nodeButton('route53')}<p className="text-center text-xs text-slate-400">Resolución DNS</p><ArrowDown className="mx-auto text-slate-500" />{nodeButton('cloudfront')}</div><ArrowDown className="mx-auto text-blue-400" />
        <div className="border-2 border-blue-800 rounded-xl p-3 sm:p-4 space-y-4">{nodeButton('vpc')}
          <div className="border border-green-800 bg-green-950/20 p-3 rounded-xl space-y-3">{nodeButton('public')}{nodeButton('alb')}</div><ArrowDown className="mx-auto text-slate-500" />
          <div className="border border-blue-800 bg-blue-950/20 p-3 rounded-xl space-y-3">{nodeButton('app')}{nodeButton('ec2')}</div><ArrowDown className="mx-auto text-slate-500" />
          <div className="border border-amber-800 bg-amber-950/20 p-3 rounded-xl space-y-3">{nodeButton('db')}{nodeButton('rds')}</div>
        </div>
      </section>
      <aside className="panel xl:sticky xl:top-48 space-y-4" aria-live="polite"><h3 className="text-lg font-bold">Detalle del componente</h3><dl className="space-y-4 text-sm">{[['Nombre', active.name], ['Categoría', active.category], ['Función', active.purpose], ['Red / Subred', active.subnet], ['Acceso público', active.id === 'rds' && !security.privateDatabase ? 'Sí · revisar' : active.public ? 'Sí, sujeto a reglas de acceso' : 'No directo desde Internet']].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 mb-1">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl><div><h4 className="text-xs text-slate-500 mb-1">Descripción</h4><p className="text-sm leading-relaxed">{active.description}</p></div>{!security.privateDatabase && <p className="error-box">La base de datos permite acceso público. Activa el control de base privada en Seguridad.</p>}</aside>
    </div>
  </div>;
}
